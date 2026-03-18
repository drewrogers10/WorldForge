import { desc, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { characters, items, locations } from '../schema';

export type ItemRecord = {
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
};

type CreateItemRowInput = {
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  locationId: number | null;
  existsFromTick: number;
  existsToTick?: number | null;
  createdAt: number;
  updatedAt: number;
};

type UpdateItemRowInput = Partial<{
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  locationId: number | null;
  existsFromTick: number;
  existsToTick: number | null;
  updatedAt: number;
}>;

const itemSelection = {
  id: items.id,
  name: items.name,
  summary: items.summary,
  quantity: items.quantity,
  ownerCharacterId: items.ownerCharacterId,
  ownerCharacterName: characters.name,
  locationId: items.locationId,
  locationName: locations.name,
  existsFromTick: items.existsFromTick,
  existsToTick: items.existsToTick,
  createdAt: items.createdAt,
  updatedAt: items.updatedAt,
};

function createCurrentItemQuery(db: AppDatabase) {
  return db
    .select(itemSelection)
    .from(items)
    .leftJoin(characters, eq(items.ownerCharacterId, characters.id))
    .leftJoin(locations, eq(items.locationId, locations.id));
}

export function listItemRows(db: AppDatabase): ItemRecord[] {
  return createCurrentItemQuery(db)
    .where(isNull(items.existsToTick))
    .orderBy(desc(items.updatedAt), desc(items.id))
    .all();
}

export function getItemRow(db: AppDatabase, id: number): ItemRecord | undefined {
  return createCurrentItemQuery(db).where(eq(items.id, id)).get();
}

export function getItemRowAsOf(
  db: AppDatabase,
  id: number,
  tick: number,
): ItemRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        i.id,
        iv.name,
        iv.summary,
        iv.quantity,
        ias.owner_character_id AS ownerCharacterId,
        cv.name AS ownerCharacterName,
        ias.location_id AS locationId,
        lv.name AS locationName,
        i.exists_from_tick AS existsFromTick,
        i.exists_to_tick AS existsToTick,
        i.created_at AS createdAt,
        i.updated_at AS updatedAt
      FROM items i
      JOIN item_versions iv
        ON iv.item_id = i.id
       AND iv.valid_from <= ?
       AND (iv.valid_to IS NULL OR ? < iv.valid_to)
      LEFT JOIN item_assignment_spans ias
        ON ias.item_id = i.id
       AND ias.valid_from <= ?
       AND (ias.valid_to IS NULL OR ? < ias.valid_to)
      LEFT JOIN character_versions cv
        ON cv.character_id = ias.owner_character_id
       AND cv.valid_from <= ?
       AND (cv.valid_to IS NULL OR ? < cv.valid_to)
      LEFT JOIN location_versions lv
        ON lv.location_id = ias.location_id
       AND lv.valid_from <= ?
       AND (lv.valid_to IS NULL OR ? < lv.valid_to)
      WHERE i.id = ?
        AND i.exists_from_tick <= ?
        AND (i.exists_to_tick IS NULL OR ? < i.exists_to_tick)
    `,
  );

  return statement.get(
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    id,
    tick,
    tick,
  ) as ItemRecord | undefined;
}

export function listItemRowsAsOf(db: AppDatabase, tick: number): ItemRecord[] {
  const statement = db.$client.prepare(
    `
      SELECT
        i.id,
        iv.name,
        iv.summary,
        iv.quantity,
        ias.owner_character_id AS ownerCharacterId,
        cv.name AS ownerCharacterName,
        ias.location_id AS locationId,
        lv.name AS locationName,
        i.exists_from_tick AS existsFromTick,
        i.exists_to_tick AS existsToTick,
        i.created_at AS createdAt,
        i.updated_at AS updatedAt
      FROM items i
      JOIN item_versions iv
        ON iv.item_id = i.id
       AND iv.valid_from <= ?
       AND (iv.valid_to IS NULL OR ? < iv.valid_to)
      LEFT JOIN item_assignment_spans ias
        ON ias.item_id = i.id
       AND ias.valid_from <= ?
       AND (ias.valid_to IS NULL OR ? < ias.valid_to)
      LEFT JOIN character_versions cv
        ON cv.character_id = ias.owner_character_id
       AND cv.valid_from <= ?
       AND (cv.valid_to IS NULL OR ? < cv.valid_to)
      LEFT JOIN location_versions lv
        ON lv.location_id = ias.location_id
       AND lv.valid_from <= ?
       AND (lv.valid_to IS NULL OR ? < lv.valid_to)
      WHERE i.exists_from_tick <= ?
        AND (i.exists_to_tick IS NULL OR ? < i.exists_to_tick)
      ORDER BY i.updated_at DESC, i.id DESC
    `,
  );

  return statement.all(
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
  ) as ItemRecord[];
}

export function createItemRow(db: AppDatabase, input: CreateItemRowInput): ItemRecord {
  const result = db.insert(items).values(input).run();
  const created = getItemRow(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created item.');
  }

  return created;
}

export function updateItemRow(
  db: AppDatabase,
  id: number,
  input: UpdateItemRowInput,
): ItemRecord {
  db.update(items).set(input).where(eq(items.id, id)).run();

  const updated = getItemRow(db, id);

  if (!updated) {
    throw new Error(`Item ${id} was not found after update.`);
  }

  return updated;
}
