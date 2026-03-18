import { desc, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { locations, type LocationRow } from '../schema';

export type LocationRecord = {
  id: number;
  name: string;
  summary: string;
  existsFromTick: number;
  existsToTick: number | null;
  createdAt: number;
  updatedAt: number;
};

type CreateLocationRowInput = {
  name: string;
  summary: string;
  existsFromTick: number;
  existsToTick?: number | null;
  createdAt: number;
  updatedAt: number;
};

type UpdateLocationRowInput = Partial<{
  name: string;
  summary: string;
  existsFromTick: number;
  existsToTick: number | null;
  updatedAt: number;
}>;

export function listLocationRows(db: AppDatabase): LocationRecord[] {
  return db
    .select({
      id: locations.id,
      name: locations.name,
      summary: locations.summary,
      existsFromTick: locations.existsFromTick,
      existsToTick: locations.existsToTick,
      createdAt: locations.createdAt,
      updatedAt: locations.updatedAt,
    })
    .from(locations)
    .where(isNull(locations.existsToTick))
    .orderBy(desc(locations.updatedAt), desc(locations.id))
    .all();
}

export function getLocationRow(
  db: AppDatabase,
  id: number,
): LocationRow | undefined {
  return db.select().from(locations).where(eq(locations.id, id)).get();
}

export function getLocationRecord(
  db: AppDatabase,
  id: number,
): LocationRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        id,
        name,
        summary,
        exists_from_tick AS existsFromTick,
        exists_to_tick AS existsToTick,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM locations
      WHERE id = ?
    `,
  );

  return statement.get(id) as LocationRecord | undefined;
}

export function getLocationRowAsOf(
  db: AppDatabase,
  id: number,
  tick: number,
): LocationRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        l.id,
        lv.name,
        lv.summary,
        l.exists_from_tick AS existsFromTick,
        l.exists_to_tick AS existsToTick,
        l.created_at AS createdAt,
        l.updated_at AS updatedAt
      FROM locations l
      JOIN location_versions lv
        ON lv.location_id = l.id
       AND lv.valid_from <= ?
       AND (lv.valid_to IS NULL OR ? < lv.valid_to)
      WHERE l.id = ?
        AND l.exists_from_tick <= ?
        AND (l.exists_to_tick IS NULL OR ? < l.exists_to_tick)
    `,
  );

  return statement.get(tick, tick, id, tick, tick) as LocationRecord | undefined;
}

export function listLocationRowsAsOf(
  db: AppDatabase,
  tick: number,
): LocationRecord[] {
  const statement = db.$client.prepare(
    `
      SELECT
        l.id,
        lv.name,
        lv.summary,
        l.exists_from_tick AS existsFromTick,
        l.exists_to_tick AS existsToTick,
        l.created_at AS createdAt,
        l.updated_at AS updatedAt
      FROM locations l
      JOIN location_versions lv
        ON lv.location_id = l.id
       AND lv.valid_from <= ?
       AND (lv.valid_to IS NULL OR ? < lv.valid_to)
      WHERE l.exists_from_tick <= ?
        AND (l.exists_to_tick IS NULL OR ? < l.exists_to_tick)
      ORDER BY l.updated_at DESC, l.id DESC
    `,
  );

  return statement.all(tick, tick, tick, tick) as LocationRecord[];
}

export function createLocationRow(
  db: AppDatabase,
  input: CreateLocationRowInput,
): LocationRecord {
  const result = db.insert(locations).values(input).run();
  const created = getLocationRecord(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created location.');
  }

  return created;
}

export function updateLocationRow(
  db: AppDatabase,
  id: number,
  input: UpdateLocationRowInput,
): LocationRecord {
  db.update(locations).set(input).where(eq(locations.id, id)).run();

  const updated = getLocationRecord(db, id);

  if (!updated) {
    throw new Error(`Location ${id} was not found after update.`);
  }

  return updated;
}
