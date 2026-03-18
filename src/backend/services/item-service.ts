import type { AppDatabase } from '@db/client';
import {
  createItemRow,
  getItemRow,
  getItemRowAsOf,
  listItemRows,
  listItemRowsAsOf,
  updateItemRow,
} from '@db/queries/items';
import { getCharacterRow } from '@db/queries/characters';
import { getLocationRecord } from '@db/queries/locations';
import { getTemporalDetailStatus } from '@db/queries/temporal';
import type {
  CreateItemInput,
  DeleteItemInput,
  GetItemInput,
  Item,
  ItemDetail,
  UpdateItemInput,
} from '@shared/item';

type OpenIntervalRow = {
  id: number;
  validFrom: number;
};

type OpenAssignmentRow = {
  id: number;
  validFrom: number;
  ownerCharacterId: number | null;
  locationId: number | null;
};

function toItem(record: {
  id: number;
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  ownerCharacterName: string | null;
  locationId: number | null;
  locationName: string | null;
  existsFromTick: number;
  existsToTick: number | null;
  createdAt: number;
  updatedAt: number;
}): Item {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    quantity: record.quantity,
    ownerCharacterId: record.ownerCharacterId,
    ownerCharacter:
      record.ownerCharacterId !== null && record.ownerCharacterName
        ? {
            id: record.ownerCharacterId,
            name: record.ownerCharacterName,
          }
        : null,
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

function normalizeItemFields(input: {
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  locationId: number | null;
}): Pick<Item, 'name' | 'summary' | 'quantity' | 'ownerCharacterId' | 'locationId'> {
  return {
    name: input.name.trim(),
    summary: input.summary.trim(),
    quantity: input.quantity,
    ownerCharacterId: input.ownerCharacterId,
    locationId: input.locationId,
  };
}

function assertSingleAssignment(input: {
  ownerCharacterId: number | null;
  locationId: number | null;
}): void {
  if (input.ownerCharacterId !== null && input.locationId !== null) {
    throw new Error('Item cannot be assigned to both a character and a location.');
  }
}

function assertReferencedEntitiesActiveAtTick(
  db: AppDatabase,
  input: {
    ownerCharacterId: number | null;
    locationId: number | null;
  },
  tick: number,
): void {
  if (input.ownerCharacterId !== null) {
    const character = getCharacterRow(db, input.ownerCharacterId);

    if (!character) {
      throw new Error(`Character ${input.ownerCharacterId} does not exist.`);
    }

    if (tick < character.existsFromTick) {
      throw new Error(`Character ${input.ownerCharacterId} does not exist yet at tick ${tick}.`);
    }

    if (character.existsToTick !== null && tick >= character.existsToTick) {
      throw new Error(`Character ${input.ownerCharacterId} is not active at tick ${tick}.`);
    }
  }

  if (input.locationId !== null) {
    const location = getLocationRecord(db, input.locationId);

    if (!location) {
      throw new Error(`Location ${input.locationId} does not exist.`);
    }

    if (tick < location.existsFromTick) {
      throw new Error(`Location ${input.locationId} does not exist yet at tick ${tick}.`);
    }

    if (location.existsToTick !== null && tick >= location.existsToTick) {
      throw new Error(`Location ${input.locationId} is not active at tick ${tick}.`);
    }
  }
}

function getOpenItemVersion(db: AppDatabase, itemId: number): OpenIntervalRow | undefined {
  return db.$client
    .prepare(
      `
        SELECT id, valid_from AS validFrom
        FROM item_versions
        WHERE item_id = ?
          AND valid_to IS NULL
      `,
    )
    .get(itemId) as OpenIntervalRow | undefined;
}

function getOpenItemAssignment(
  db: AppDatabase,
  itemId: number,
): OpenAssignmentRow | undefined {
  return db.$client
    .prepare(
      `
        SELECT
          id,
          valid_from AS validFrom,
          owner_character_id AS ownerCharacterId,
          location_id AS locationId
        FROM item_assignment_spans
        WHERE item_id = ?
          AND valid_to IS NULL
      `,
    )
    .get(itemId) as OpenAssignmentRow | undefined;
}

function assertItemIsEditable(record: ReturnType<typeof getItemRow>): NonNullable<ReturnType<typeof getItemRow>> {
  if (!record) {
    throw new Error('Item does not exist.');
  }

  if (record.existsToTick !== null) {
    throw new Error(`Item ${record.id} has already ended at tick ${record.existsToTick}.`);
  }

  return record;
}

function assertForwardOnlyTick(
  tick: number,
  openVersion: OpenIntervalRow | undefined,
  itemId: number,
): OpenIntervalRow {
  if (!openVersion) {
    throw new Error(`Item ${itemId} has no open temporal state.`);
  }

  if (tick < openVersion.validFrom) {
    throw new Error(
      `Item ${itemId} cannot be changed at tick ${tick} before its latest state at tick ${openVersion.validFrom}.`,
    );
  }

  return openVersion;
}

function syncItemAssignmentAtTick(
  db: AppDatabase,
  input: {
    itemId: number;
    ownerCharacterId: number | null;
    locationId: number | null;
    tick: number;
    systemNow: number;
  },
): void {
  const openAssignment = getOpenItemAssignment(db, input.itemId);

  if (openAssignment && input.tick < openAssignment.validFrom) {
    throw new Error(
      `Item ${input.itemId} cannot change assignment at tick ${input.tick} before its latest assignment state at tick ${openAssignment.validFrom}.`,
    );
  }

  if (
    openAssignment &&
    openAssignment.ownerCharacterId === input.ownerCharacterId &&
    openAssignment.locationId === input.locationId
  ) {
    return;
  }

  if (openAssignment && input.tick === openAssignment.validFrom) {
    if (input.ownerCharacterId === null && input.locationId === null) {
      db.$client
        .prepare('DELETE FROM item_assignment_spans WHERE id = ?')
        .run(openAssignment.id);
      return;
    }

    db.$client
      .prepare(
        `
          UPDATE item_assignment_spans
          SET owner_character_id = ?, location_id = ?, is_inferred = 0, created_at = ?
          WHERE id = ?
        `,
      )
      .run(
        input.ownerCharacterId,
        input.locationId,
        input.systemNow,
        openAssignment.id,
      );
    return;
  }

  if (openAssignment) {
    db.$client
      .prepare(
        `
          UPDATE item_assignment_spans
          SET valid_to = ?
          WHERE id = ?
        `,
      )
      .run(input.tick, openAssignment.id);
  }

  if (input.ownerCharacterId !== null || input.locationId !== null) {
    db.$client
      .prepare(
        `
          INSERT INTO item_assignment_spans (
            item_id,
            owner_character_id,
            location_id,
            valid_from,
            valid_to,
            is_inferred,
            created_at
          ) VALUES (?, ?, ?, ?, NULL, 0, ?)
        `,
      )
      .run(
        input.itemId,
        input.ownerCharacterId,
        input.locationId,
        input.tick,
        input.systemNow,
      );
  }
}

export function createItemService(db: AppDatabase) {
  return {
    listItems(input?: { asOfTick?: number }): Item[] {
      const records =
        input?.asOfTick === undefined
          ? listItemRows(db)
          : listItemRowsAsOf(db, input.asOfTick);

      return records.map(toItem);
    },
    getItem(input: GetItemInput): ItemDetail {
      const current = getItemRow(db, input.id);

      if (input.asOfTick === undefined) {
        if (!current) {
          return { status: 'missing', record: null };
        }

        if (current.existsToTick !== null) {
          return { status: 'ended', record: null };
        }

        return { status: 'active', record: toItem(current) };
      }

      const status = getTemporalDetailStatus(current, input.asOfTick);

      if (status !== 'active') {
        return { status, record: null };
      }

      const record = getItemRowAsOf(db, input.id, input.asOfTick);
      return {
        status: 'active',
        record: record ? toItem(record) : null,
      };
    },
    createItem(input: CreateItemInput): Item {
      const systemNow = Date.now();

      assertSingleAssignment(input);
      assertReferencedEntitiesActiveAtTick(db, input, input.effectiveTick);

      const fields = normalizeItemFields(input);

      const transaction = db.$client.transaction(() => {
        const created = createItemRow(db, {
          ...fields,
          existsFromTick: input.effectiveTick,
          existsToTick: null,
          createdAt: systemNow,
          updatedAt: systemNow,
        });

        db.$client
          .prepare(
            `
              INSERT INTO item_versions (
                item_id,
                valid_from,
                valid_to,
                name,
                summary,
                quantity,
                is_inferred,
                created_at
              ) VALUES (?, ?, NULL, ?, ?, ?, 0, ?)
            `,
          )
          .run(
            created.id,
            input.effectiveTick,
            fields.name,
            fields.summary,
            fields.quantity,
            systemNow,
          );

        if (fields.ownerCharacterId !== null || fields.locationId !== null) {
          db.$client
            .prepare(
              `
                INSERT INTO item_assignment_spans (
                  item_id,
                  owner_character_id,
                  location_id,
                  valid_from,
                  valid_to,
                  is_inferred,
                  created_at
                ) VALUES (?, ?, ?, ?, NULL, 0, ?)
              `,
            )
            .run(
              created.id,
              fields.ownerCharacterId,
              fields.locationId,
              input.effectiveTick,
              systemNow,
            );
        }

        return created;
      });

      return toItem(transaction());
    },
    updateItem(input: UpdateItemInput): Item {
      assertItemIsEditable(getItemRow(db, input.id));
      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenItemVersion(db, input.id),
        input.id,
      );
      const fields = normalizeItemFields(input);

      assertSingleAssignment(fields);
      assertReferencedEntitiesActiveAtTick(db, fields, input.effectiveTick);

      const systemNow = Date.now();

      const transaction = db.$client.transaction(() => {
        if (input.effectiveTick === openVersion.validFrom) {
          db.$client
            .prepare(
              `
                UPDATE item_versions
                SET name = ?, summary = ?, quantity = ?, is_inferred = 0, created_at = ?
                WHERE id = ?
              `,
            )
            .run(fields.name, fields.summary, fields.quantity, systemNow, openVersion.id);
        } else {
          db.$client
            .prepare(
              `
                UPDATE item_versions
                SET valid_to = ?
                WHERE id = ?
              `,
            )
            .run(input.effectiveTick, openVersion.id);

          db.$client
            .prepare(
              `
                INSERT INTO item_versions (
                  item_id,
                  valid_from,
                  valid_to,
                  name,
                  summary,
                  quantity,
                  is_inferred,
                  created_at
                ) VALUES (?, ?, NULL, ?, ?, ?, 0, ?)
              `,
            )
            .run(
              input.id,
              input.effectiveTick,
              fields.name,
              fields.summary,
              fields.quantity,
              systemNow,
            );
        }

        syncItemAssignmentAtTick(db, {
          itemId: input.id,
          ownerCharacterId: fields.ownerCharacterId,
          locationId: fields.locationId,
          tick: input.effectiveTick,
          systemNow,
        });

        return updateItemRow(db, input.id, {
          ...fields,
          updatedAt: systemNow,
        });
      });

      return toItem(transaction());
    },
    deleteItem(input: DeleteItemInput): void {
      const existing = assertItemIsEditable(getItemRow(db, input.id));
      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenItemVersion(db, input.id),
        input.id,
      );

      if (input.effectiveTick <= existing.existsFromTick) {
        throw new Error(
          `Item ${input.id} cannot end at tick ${input.effectiveTick} before or at its start tick ${existing.existsFromTick}.`,
        );
      }

      if (input.effectiveTick <= openVersion.validFrom) {
        throw new Error(
          `Item ${input.id} cannot end at tick ${input.effectiveTick} before or at its latest state tick ${openVersion.validFrom}.`,
        );
      }

      const systemNow = Date.now();

      const transaction = db.$client.transaction(() => {
        db.$client
          .prepare(
            `
              UPDATE item_versions
              SET valid_to = ?
              WHERE id = ?
            `,
          )
          .run(input.effectiveTick, openVersion.id);

        const openAssignment = getOpenItemAssignment(db, input.id);

        if (openAssignment) {
          db.$client
            .prepare(
              `
                UPDATE item_assignment_spans
                SET valid_to = ?
                WHERE id = ?
              `,
            )
            .run(input.effectiveTick, openAssignment.id);
        }

        updateItemRow(db, input.id, {
          ownerCharacterId: null,
          locationId: null,
          existsToTick: input.effectiveTick,
          updatedAt: systemNow,
        });
      });

      transaction();
    },
  };
}

export type ItemService = ReturnType<typeof createItemService>;
