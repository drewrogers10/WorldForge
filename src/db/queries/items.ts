import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { items, type ItemRow } from '../schema';

type CreateItemRowInput = {
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  locationId: number | null;
  createdAt: number;
  updatedAt: number;
};

type UpdateItemRowInput = {
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  locationId: number | null;
  updatedAt: number;
};

export function listItemRows(db: AppDatabase): ItemRow[] {
  return db
    .select()
    .from(items)
    .orderBy(desc(items.updatedAt), desc(items.id))
    .all();
}

export function getItemRow(db: AppDatabase, id: number): ItemRow | undefined {
  return db.select().from(items).where(eq(items.id, id)).get();
}

export function createItemRow(db: AppDatabase, input: CreateItemRowInput): ItemRow {
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
): ItemRow {
  db.update(items).set(input).where(eq(items.id, id)).run();

  const updated = getItemRow(db, id);

  if (!updated) {
    throw new Error(`Item ${id} was not found after update.`);
  }

  return updated;
}

export function deleteItemRow(db: AppDatabase, id: number): void {
  const result = db.delete(items).where(eq(items.id, id)).run();

  if (result.changes === 0) {
    throw new Error(`Item ${id} does not exist.`);
  }
}
