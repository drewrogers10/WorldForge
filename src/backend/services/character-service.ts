import type { AppDatabase } from '@db/client';
import {
  createCharacterRow,
  getCharacterRow,
  getCharacterRowAsOf,
  listCharacterRows,
  listCharacterRowsAsOf,
  updateCharacterRow,
  type CharacterRecord,
} from '@db/queries/characters';
import { getLocationRecord } from '@db/queries/locations';
import { getTemporalDetailStatus } from '@db/queries/temporal';
import type {
  Character,
  CharacterDetail,
  CreateCharacterInput,
  DeleteCharacterInput,
  GetCharacterInput,
  UpdateCharacterInput,
} from '@shared/character';

type OpenIntervalRow = {
  id: number;
  validFrom: number;
};

type OpenCharacterLocationRow = {
  id: number;
  validFrom: number;
  locationId: number;
};

function toCharacter(record: CharacterRecord): Character {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    locationId: record.locationId,
    location:
      record.locationId !== null && record.locationName
        ? {
            id: record.locationId,
            name: record.locationName,
          }
        : null,
    existsFromTick: record.existsFromTick,
    existsToTick: record.existsToTick,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function normalizeCharacterFields(input: {
  name: string;
  summary: string;
  locationId: number | null;
}): Pick<Character, 'name' | 'summary' | 'locationId'> {
  return {
    name: input.name.trim(),
    summary: input.summary.trim(),
    locationId: input.locationId,
  };
}

function getOpenCharacterVersion(
  db: AppDatabase,
  characterId: number,
): OpenIntervalRow | undefined {
  return db.$client
    .prepare(
      `
        SELECT id, valid_from AS validFrom
        FROM character_versions
        WHERE character_id = ?
          AND valid_to IS NULL
      `,
    )
    .get(characterId) as OpenIntervalRow | undefined;
}

function getOpenCharacterLocationSpan(
  db: AppDatabase,
  characterId: number,
): OpenCharacterLocationRow | undefined {
  return db.$client
    .prepare(
      `
        SELECT id, valid_from AS validFrom, location_id AS locationId
        FROM character_location_spans
        WHERE character_id = ?
          AND valid_to IS NULL
      `,
    )
    .get(characterId) as OpenCharacterLocationRow | undefined;
}

function assertCharacterIsEditable(record: CharacterRecord | undefined): CharacterRecord {
  if (!record) {
    throw new Error('Character does not exist.');
  }

  if (record.existsToTick !== null) {
    throw new Error(`Character ${record.id} has already ended at tick ${record.existsToTick}.`);
  }

  return record;
}

function assertLocationActiveAtTick(
  db: AppDatabase,
  locationId: number | null,
  tick: number,
): void {
  if (locationId === null) {
    return;
  }

  const location = getLocationRecord(db, locationId);

  if (!location) {
    throw new Error(`Location ${locationId} does not exist.`);
  }

  if (tick < location.existsFromTick) {
    throw new Error(`Location ${locationId} does not exist yet at tick ${tick}.`);
  }

  if (location.existsToTick !== null && tick >= location.existsToTick) {
    throw new Error(`Location ${locationId} is not active at tick ${tick}.`);
  }
}

function assertForwardOnlyTick(
  tick: number,
  openVersion: OpenIntervalRow | undefined,
  characterId: number,
): OpenIntervalRow {
  if (!openVersion) {
    throw new Error(`Character ${characterId} has no open temporal state.`);
  }

  if (tick < openVersion.validFrom) {
    throw new Error(
      `Character ${characterId} cannot be changed at tick ${tick} before its latest state at tick ${openVersion.validFrom}.`,
    );
  }

  return openVersion;
}

function syncCharacterLocationAtTick(
  db: AppDatabase,
  input: {
    characterId: number;
    locationId: number | null;
    tick: number;
    systemNow: number;
  },
): void {
  const openSpan = getOpenCharacterLocationSpan(db, input.characterId);

  if (openSpan && input.tick < openSpan.validFrom) {
    throw new Error(
      `Character ${input.characterId} cannot move at tick ${input.tick} before its latest location state at tick ${openSpan.validFrom}.`,
    );
  }

  if (openSpan && openSpan.locationId === input.locationId) {
    return;
  }

  if (openSpan && input.tick === openSpan.validFrom) {
    if (input.locationId === null) {
      db.$client
        .prepare('DELETE FROM character_location_spans WHERE id = ?')
        .run(openSpan.id);
      return;
    }

    db.$client
      .prepare(
        `
          UPDATE character_location_spans
          SET location_id = ?, created_at = ?, is_inferred = 0
          WHERE id = ?
        `,
      )
      .run(input.locationId, input.systemNow, openSpan.id);
    return;
  }

  if (openSpan) {
    db.$client
      .prepare(
        `
          UPDATE character_location_spans
          SET valid_to = ?
          WHERE id = ?
        `,
      )
      .run(input.tick, openSpan.id);
  }

  if (input.locationId !== null) {
    db.$client
      .prepare(
        `
          INSERT INTO character_location_spans (
            character_id,
            location_id,
            valid_from,
            valid_to,
            is_inferred,
            created_at
          ) VALUES (?, ?, ?, NULL, 0, ?)
        `,
      )
      .run(input.characterId, input.locationId, input.tick, input.systemNow);
  }
}

function retireOwnedItemsAtTick(
  db: AppDatabase,
  characterId: number,
  tick: number,
  systemNow: number,
): void {
  db.$client
    .prepare(
      `
        UPDATE item_assignment_spans
        SET valid_to = ?
        WHERE owner_character_id = ?
          AND valid_to IS NULL
      `,
    )
    .run(tick, characterId);

  db.$client
    .prepare(
      `
        UPDATE items
        SET owner_character_id = NULL,
            location_id = NULL,
            updated_at = ?
        WHERE owner_character_id = ?
          AND exists_to_tick IS NULL
      `,
    )
    .run(systemNow, characterId);
}

export function createCharacterService(db: AppDatabase) {
  return {
    listCharacters(input?: { asOfTick?: number }): Character[] {
      const records =
        input?.asOfTick === undefined
          ? listCharacterRows(db)
          : listCharacterRowsAsOf(db, input.asOfTick);

      return records.map(toCharacter);
    },
    getCharacter(input: GetCharacterInput): CharacterDetail {
      const current = getCharacterRow(db, input.id);

      if (input.asOfTick === undefined) {
        if (!current) {
          return { status: 'missing', record: null };
        }

        if (current.existsToTick !== null) {
          return { status: 'ended', record: null };
        }

        return { status: 'active', record: toCharacter(current) };
      }

      const status = getTemporalDetailStatus(current, input.asOfTick);

      if (status !== 'active') {
        return { status, record: null };
      }

      const record = getCharacterRowAsOf(db, input.id, input.asOfTick);
      return {
        status: 'active',
        record: record ? toCharacter(record) : null,
      };
    },
    createCharacter(input: CreateCharacterInput): Character {
      const systemNow = Date.now();
      assertLocationActiveAtTick(db, input.locationId, input.effectiveTick);
      const fields = normalizeCharacterFields(input);

      const transaction = db.$client.transaction(() => {
        const created = createCharacterRow(db, {
          ...fields,
          existsFromTick: input.effectiveTick,
          existsToTick: null,
          createdAt: systemNow,
          updatedAt: systemNow,
        });

        db.$client
          .prepare(
            `
              INSERT INTO character_versions (
                character_id,
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

        if (fields.locationId !== null) {
          db.$client
            .prepare(
              `
                INSERT INTO character_location_spans (
                  character_id,
                  location_id,
                  valid_from,
                  valid_to,
                  is_inferred,
                  created_at
                ) VALUES (?, ?, ?, NULL, 0, ?)
              `,
            )
            .run(created.id, fields.locationId, input.effectiveTick, systemNow);
        }

        return created;
      });

      return toCharacter(transaction());
    },
    updateCharacter(input: UpdateCharacterInput): Character {
      assertCharacterIsEditable(getCharacterRow(db, input.id));
      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenCharacterVersion(db, input.id),
        input.id,
      );
      assertLocationActiveAtTick(db, input.locationId, input.effectiveTick);
      const fields = normalizeCharacterFields(input);
      const systemNow = Date.now();

      const transaction = db.$client.transaction(() => {
        if (input.effectiveTick === openVersion.validFrom) {
          db.$client
            .prepare(
              `
                UPDATE character_versions
                SET name = ?, summary = ?, is_inferred = 0, created_at = ?
                WHERE id = ?
              `,
            )
            .run(fields.name, fields.summary, systemNow, openVersion.id);
        } else {
          db.$client
            .prepare(
              `
                UPDATE character_versions
                SET valid_to = ?
                WHERE id = ?
              `,
            )
            .run(input.effectiveTick, openVersion.id);

          db.$client
            .prepare(
              `
                INSERT INTO character_versions (
                  character_id,
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

        syncCharacterLocationAtTick(db, {
          characterId: input.id,
          locationId: fields.locationId,
          tick: input.effectiveTick,
          systemNow,
        });

        return updateCharacterRow(db, input.id, {
          ...fields,
          updatedAt: systemNow,
        });
      });

      return toCharacter(transaction());
    },
    deleteCharacter(input: DeleteCharacterInput): void {
      const existing = assertCharacterIsEditable(getCharacterRow(db, input.id));
      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenCharacterVersion(db, input.id),
        input.id,
      );

      if (input.effectiveTick <= existing.existsFromTick) {
        throw new Error(
          `Character ${input.id} cannot end at tick ${input.effectiveTick} before or at its start tick ${existing.existsFromTick}.`,
        );
      }

      if (input.effectiveTick <= openVersion.validFrom) {
        throw new Error(
          `Character ${input.id} cannot end at tick ${input.effectiveTick} before or at its latest state tick ${openVersion.validFrom}.`,
        );
      }

      const systemNow = Date.now();

      const transaction = db.$client.transaction(() => {
        db.$client
          .prepare(
            `
              UPDATE character_versions
              SET valid_to = ?
              WHERE id = ?
            `,
          )
          .run(input.effectiveTick, openVersion.id);

        const openSpan = getOpenCharacterLocationSpan(db, input.id);

        if (openSpan) {
          db.$client
            .prepare(
              `
                UPDATE character_location_spans
                SET valid_to = ?
                WHERE id = ?
              `,
            )
            .run(input.effectiveTick, openSpan.id);
        }

        retireOwnedItemsAtTick(db, input.id, input.effectiveTick, systemNow);

        updateCharacterRow(db, input.id, {
          locationId: null,
          existsToTick: input.effectiveTick,
          updatedAt: systemNow,
        });
      });

      transaction();
    },
  };
}

export type CharacterService = ReturnType<typeof createCharacterService>;
