import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { locations, type LocationRow } from '../schema';

type CreateLocationRowInput = {
  name: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
};

type UpdateLocationRowInput = {
  name: string;
  summary: string;
  updatedAt: number;
};

export function listLocationRows(db: AppDatabase): LocationRow[] {
  return db
    .select()
    .from(locations)
    .orderBy(desc(locations.updatedAt), desc(locations.id))
    .all();
}

export function getLocationRow(
  db: AppDatabase,
  id: number,
): LocationRow | undefined {
  return db.select().from(locations).where(eq(locations.id, id)).get();
}

export function createLocationRow(
  db: AppDatabase,
  input: CreateLocationRowInput,
): LocationRow {
  const result = db.insert(locations).values(input).run();
  const created = getLocationRow(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created location.');
  }

  return created;
}

export function updateLocationRow(
  db: AppDatabase,
  id: number,
  input: UpdateLocationRowInput,
): LocationRow {
  db.update(locations).set(input).where(eq(locations.id, id)).run();

  const updated = getLocationRow(db, id);

  if (!updated) {
    throw new Error(`Location ${id} was not found after update.`);
  }

  return updated;
}

export function deleteLocationRow(db: AppDatabase, id: number): void {
  const result = db.delete(locations).where(eq(locations.id, id)).run();

  if (result.changes === 0) {
    throw new Error(`Location ${id} does not exist.`);
  }
}
