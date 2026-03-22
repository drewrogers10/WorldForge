import type { AppDatabase } from '@db/client';
import type { StorageCoordinator } from '@backend/storage/types';
import {
  createLocationRow,
  getLocationRecord,
  getLocationRowAsOf,
  listLocationRows,
  listLocationRowsAsOf,
  updateLocationRow,
} from '@db/queries/locations';
import { getTemporalDetailStatus } from '@db/queries/temporal';
import type {
  CreateLocationInput,
  DeleteLocationInput,
  GetLocationInput,
  Location,
  LocationDetail,
  UpdateLocationInput,
} from '@shared/location';

type OpenIntervalRow = {
  id: number;
  validFrom: number;
};

function toLocation(record: {
  id: number;
  name: string;
  summary: string;
  existsFromTick: number;
  existsToTick: number | null;
  createdAt: number;
  updatedAt: number;
}): Location {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    existsFromTick: record.existsFromTick,
    existsToTick: record.existsToTick,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function normalizeLocationFields(input: {
  name: string;
  summary: string;
}): Pick<Location, 'name' | 'summary'> {
  return {
    name: input.name.trim(),
    summary: input.summary.trim(),
  };
}

function getOpenLocationVersion(
  db: AppDatabase,
  locationId: number,
): OpenIntervalRow | undefined {
  return db.$client
    .prepare(
      `
        SELECT id, valid_from AS validFrom
        FROM location_versions
        WHERE location_id = ?
          AND valid_to IS NULL
      `,
    )
    .get(locationId) as OpenIntervalRow | undefined;
}

function assertLocationIsEditable(
  db: AppDatabase,
  locationId: number,
): NonNullable<ReturnType<typeof getLocationRecord>> {
  const location = getLocationRecord(db, locationId);

  if (!location) {
    throw new Error(`Location ${locationId} does not exist.`);
  }

  if (location.existsToTick !== null) {
    throw new Error(`Location ${locationId} has already ended at tick ${location.existsToTick}.`);
  }

  return location;
}

function assertForwardOnlyTick(
  tick: number,
  openVersion: OpenIntervalRow | undefined,
  locationId: number,
): OpenIntervalRow {
  if (!openVersion) {
    throw new Error(`Location ${locationId} has no open temporal state.`);
  }

  if (tick < openVersion.validFrom) {
    throw new Error(
      `Location ${locationId} cannot be changed at tick ${tick} before its latest state at tick ${openVersion.validFrom}.`,
    );
  }

  return openVersion;
}

function clearOpenLocationReferences(
  db: AppDatabase,
  locationId: number,
  tick: number,
  systemNow: number,
): void {
  db.$client
    .prepare(
      `
        UPDATE character_location_spans
        SET valid_to = ?
        WHERE location_id = ?
          AND valid_to IS NULL
      `,
    )
    .run(tick, locationId);

  db.$client
    .prepare(
      `
        UPDATE characters
        SET location_id = NULL,
            updated_at = ?
        WHERE location_id = ?
          AND exists_to_tick IS NULL
      `,
    )
    .run(systemNow, locationId);

  db.$client
    .prepare(
      `
        UPDATE item_assignment_spans
        SET valid_to = ?
        WHERE location_id = ?
          AND valid_to IS NULL
      `,
    )
    .run(tick, locationId);

  db.$client
    .prepare(
      `
        UPDATE items
        SET owner_character_id = NULL,
            location_id = NULL,
            updated_at = ?
        WHERE location_id = ?
          AND exists_to_tick IS NULL
      `,
    )
    .run(systemNow, locationId);
}

export function createLocationService(
  db: AppDatabase,
  storageCoordinator: StorageCoordinator,
) {
  return {
    listLocations(input?: { asOfTick?: number }): Location[] {
      const records =
        input?.asOfTick === undefined
          ? listLocationRows(db)
          : listLocationRowsAsOf(db, input.asOfTick);

      return records.map(toLocation);
    },
    getLocation(input: GetLocationInput): LocationDetail {
      const current = getLocationRecord(db, input.id);

      if (input.asOfTick === undefined) {
        if (!current) {
          return { status: 'missing', record: null };
        }

        if (current.existsToTick !== null) {
          return { status: 'ended', record: null };
        }

        return { status: 'active', record: toLocation(current) };
      }

      const status = getTemporalDetailStatus(current, input.asOfTick);

      if (status !== 'active') {
        return { status, record: null };
      }

      const record = getLocationRowAsOf(db, input.id, input.asOfTick);
      return {
        status: 'active',
        record: record ? toLocation(record) : null,
      };
    },
    createLocation(input: CreateLocationInput): Location {
      const fields = normalizeLocationFields(input);
      const systemNow = Date.now();

      return storageCoordinator.commitEntityMutation({
        entityType: 'location',
        tick: input.effectiveTick,
        mutate: () => {
          const created = createLocationRow(db, {
            ...fields,
            existsFromTick: input.effectiveTick,
            existsToTick: null,
            createdAt: systemNow,
            updatedAt: systemNow,
          });

          db.$client
            .prepare(
              `
                INSERT INTO location_versions (
                  location_id,
                  valid_from,
                  valid_to,
                  name,
                  summary,
                  is_inferred,
                  created_at
                ) VALUES (?, ?, NULL, ?, ?, 0, ?)
              `,
            )
            .run(created.id, input.effectiveTick, fields.name, fields.summary, systemNow);

          return {
            entityId: created.id,
            result: toLocation(created),
          };
        },
      });
    },
    updateLocation(input: UpdateLocationInput): Location {
      assertLocationIsEditable(db, input.id);
      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenLocationVersion(db, input.id),
        input.id,
      );
      const fields = normalizeLocationFields(input);
      const systemNow = Date.now();

      return storageCoordinator.commitEntityMutation({
        entityType: 'location',
        tick: input.effectiveTick,
        mutate: () => {
          if (input.effectiveTick === openVersion.validFrom) {
            db.$client
              .prepare(
                `
                  UPDATE location_versions
                  SET name = ?, summary = ?, is_inferred = 0, created_at = ?
                  WHERE id = ?
                `,
              )
              .run(fields.name, fields.summary, systemNow, openVersion.id);
          } else {
            db.$client
              .prepare(
                `
                  UPDATE location_versions
                  SET valid_to = ?
                  WHERE id = ?
                `,
              )
              .run(input.effectiveTick, openVersion.id);

            db.$client
              .prepare(
                `
                  INSERT INTO location_versions (
                    location_id,
                    valid_from,
                    valid_to,
                    name,
                    summary,
                    is_inferred,
                    created_at
                  ) VALUES (?, ?, NULL, ?, ?, 0, ?)
                `,
              )
              .run(input.id, input.effectiveTick, fields.name, fields.summary, systemNow);
          }

          const updated = updateLocationRow(db, input.id, {
            ...fields,
            updatedAt: systemNow,
          });

          return {
            entityId: input.id,
            result: toLocation(updated),
          };
        },
      });
    },
    deleteLocation(input: DeleteLocationInput): void {
      const location = assertLocationIsEditable(db, input.id);
      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenLocationVersion(db, input.id),
        input.id,
      );

      if (input.effectiveTick <= location.existsFromTick) {
        throw new Error(
          `Location ${input.id} cannot end at tick ${input.effectiveTick} before or at its start tick ${location.existsFromTick}.`,
        );
      }

      if (input.effectiveTick <= openVersion.validFrom) {
        throw new Error(
          `Location ${input.id} cannot end at tick ${input.effectiveTick} before or at its latest state tick ${openVersion.validFrom}.`,
        );
      }

      const systemNow = Date.now();

      storageCoordinator.commitEntityMutation({
        entityType: 'location',
        tick: input.effectiveTick,
        mutate: () => {
          db.$client
            .prepare(
              `
                UPDATE location_versions
                SET valid_to = ?
                WHERE id = ?
              `,
            )
            .run(input.effectiveTick, openVersion.id);

          clearOpenLocationReferences(db, input.id, input.effectiveTick, systemNow);

          updateLocationRow(db, input.id, {
            existsToTick: input.effectiveTick,
            updatedAt: systemNow,
          });

          return {
            entityId: input.id,
            result: undefined,
          };
        },
      });
    },
  };
}

export type LocationService = ReturnType<typeof createLocationService>;
