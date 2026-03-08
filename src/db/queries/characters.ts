import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { characters, type CharacterRow } from '../schema';

type CreateCharacterRowInput = {
  name: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
};

type UpdateCharacterRowInput = {
  name: string;
  summary: string;
  updatedAt: number;
};

export function listCharacterRows(db: AppDatabase): CharacterRow[] {
  return db
    .select()
    .from(characters)
    .orderBy(desc(characters.updatedAt), desc(characters.id))
    .all();
}

export function getCharacterRow(
  db: AppDatabase,
  id: number,
): CharacterRow | undefined {
  return db.select().from(characters).where(eq(characters.id, id)).get();
}

export function createCharacterRow(
  db: AppDatabase,
  input: CreateCharacterRowInput,
): CharacterRow {
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
): CharacterRow {
  db.update(characters).set(input).where(eq(characters.id, id)).run();

  const updated = getCharacterRow(db, id);

  if (!updated) {
    throw new Error(`Character ${id} was not found after update.`);
  }

  return updated;
}
