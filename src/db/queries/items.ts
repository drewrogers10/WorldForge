import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { characters, items, locations } from '../schema';

const itemSelection = {
  id: items.id,
  name: items.name,
  summary: items.summary,
  quantity: items.quantity,
  ownerCharacterId: items.ownerCharacterId,
  ownerCharacterName: characters.name,
  locationId: items.locationId,
  locationName: locations.name,
  createdAt: items.createdAt,
  updatedAt: items.updatedAt,
};

export type ItemRecord = {
  id: number;
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  ownerCharacterName: string | null;
  locationId: number | null;
  locationName: string | null;
  createdAt: number;
  updatedAt: number;
};

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

function createItemQuery(db: AppDatabase) {
  return db
    .select(itemSelection)
    .from(items)
    .leftJoin(characters, eq(items.ownerCharacterId, characters.id))
    .leftJoin(locations, eq(items.locationId, locations.id));
}

export function listItemRows(db: AppDatabase): ItemRecord[] {
  return createItemQuery(db).orderBy(desc(items.updatedAt), desc(items.id)).all();
}

export function getItemRow(db: AppDatabase, id: number): ItemRecord | undefined {
  return createItemQuery(db).where(eq(items.id, id)).get();
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

export function deleteItemRow(db: AppDatabase, id: number): void {
  const result = db.delete(items).where(eq(items.id, id)).run();

  if (result.changes === 0) {
    throw new Error(`Item ${id} does not exist.`);
  }
}
