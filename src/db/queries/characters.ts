import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { characters, locations } from '../schema';

const characterSelection = {
  id: characters.id,
  name: characters.name,
  summary: characters.summary,
  locationId: characters.locationId,
  locationName: locations.name,
  createdAt: characters.createdAt,
  updatedAt: characters.updatedAt,
};

export type CharacterRecord = {
  id: number;
  name: string;
  summary: string;
  locationId: number | null;
  locationName: string | null;
  createdAt: number;
  updatedAt: number;
};

type CreateCharacterRowInput = {
  name: string;
  summary: string;
  locationId: number | null;
  createdAt: number;
  updatedAt: number;
};

type UpdateCharacterRowInput = {
  name: string;
  summary: string;
  locationId: number | null;
  updatedAt: number;
};

function createCharacterQuery(db: AppDatabase) {
  return db
    .select(characterSelection)
    .from(characters)
    .leftJoin(locations, eq(characters.locationId, locations.id));
}

export function listCharacterRows(db: AppDatabase): CharacterRecord[] {
  return createCharacterQuery(db)
    .orderBy(desc(characters.updatedAt), desc(characters.id))
    .all();
}

export function getCharacterRow(
  db: AppDatabase,
  id: number,
): CharacterRecord | undefined {
  return createCharacterQuery(db).where(eq(characters.id, id)).get();
}

export function createCharacterRow(
  db: AppDatabase,
  input: CreateCharacterRowInput,
): CharacterRecord {
  const result = db.insert(characters).values(input).run();
  const created = getCharacterRow(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created character.');
  }

  return created;
}

export function updateCharacterRow(
  db: AppDatabase,
  id: number,
  input: UpdateCharacterRowInput,
): CharacterRecord {
  db.update(characters).set(input).where(eq(characters.id, id)).run();

  const updated = getCharacterRow(db, id);

  if (!updated) {
    throw new Error(`Character ${id} was not found after update.`);
  }

  return updated;
}

export function deleteCharacterRow(db: AppDatabase, id: number): void {
  const result = db.delete(characters).where(eq(characters.id, id)).run();

  if (result.changes === 0) {
    throw new Error(`Character ${id} does not exist.`);
  }
}
