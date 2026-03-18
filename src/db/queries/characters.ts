import { desc, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { characters, locations } from '../schema';

export type CharacterRecord = {
  id: number;
  name: string;
  summary: string;
  locationId: number | null;
  locationName: string | null;
  existsFromTick: number;
  existsToTick: number | null;
  createdAt: number;
  updatedAt: number;
};

type CreateCharacterRowInput = {
  name: string;
  summary: string;
  locationId: number | null;
  existsFromTick: number;
  existsToTick?: number | null;
  createdAt: number;
  updatedAt: number;
};

type UpdateCharacterRowInput = Partial<{
  name: string;
  summary: string;
  locationId: number | null;
  existsFromTick: number;
  existsToTick: number | null;
  updatedAt: number;
}>;

const characterSelection = {
  id: characters.id,
  name: characters.name,
  summary: characters.summary,
  locationId: characters.locationId,
  locationName: locations.name,
  existsFromTick: characters.existsFromTick,
  existsToTick: characters.existsToTick,
  createdAt: characters.createdAt,
  updatedAt: characters.updatedAt,
};

function createCurrentCharacterQuery(db: AppDatabase) {
  return db
    .select(characterSelection)
    .from(characters)
    .leftJoin(locations, eq(characters.locationId, locations.id));
}

export function listCharacterRows(db: AppDatabase): CharacterRecord[] {
  return createCurrentCharacterQuery(db)
    .where(isNull(characters.existsToTick))
    .orderBy(desc(characters.updatedAt), desc(characters.id))
    .all();
}

export function getCharacterRow(
  db: AppDatabase,
  id: number,
): CharacterRecord | undefined {
  return createCurrentCharacterQuery(db).where(eq(characters.id, id)).get();
}

export function getCharacterRowAsOf(
  db: AppDatabase,
  id: number,
  tick: number,
): CharacterRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        c.id,
        cv.name,
        cv.summary,
        cls.location_id AS locationId,
        lv.name AS locationName,
        c.exists_from_tick AS existsFromTick,
        c.exists_to_tick AS existsToTick,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
      FROM characters c
      JOIN character_versions cv
        ON cv.character_id = c.id
       AND cv.valid_from <= ?
       AND (cv.valid_to IS NULL OR ? < cv.valid_to)
      LEFT JOIN character_location_spans cls
        ON cls.character_id = c.id
       AND cls.valid_from <= ?
       AND (cls.valid_to IS NULL OR ? < cls.valid_to)
      LEFT JOIN location_versions lv
        ON lv.location_id = cls.location_id
       AND lv.valid_from <= ?
       AND (lv.valid_to IS NULL OR ? < lv.valid_to)
      WHERE c.id = ?
        AND c.exists_from_tick <= ?
        AND (c.exists_to_tick IS NULL OR ? < c.exists_to_tick)
    `,
  );

  return statement.get(
    tick,
    tick,
    tick,
    tick,
    tick,
    tick,
    id,
    tick,
    tick,
  ) as CharacterRecord | undefined;
}

export function listCharacterRowsAsOf(
  db: AppDatabase,
  tick: number,
): CharacterRecord[] {
  const statement = db.$client.prepare(
    `
      SELECT
        c.id,
        cv.name,
        cv.summary,
        cls.location_id AS locationId,
        lv.name AS locationName,
        c.exists_from_tick AS existsFromTick,
        c.exists_to_tick AS existsToTick,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
      FROM characters c
      JOIN character_versions cv
        ON cv.character_id = c.id
       AND cv.valid_from <= ?
       AND (cv.valid_to IS NULL OR ? < cv.valid_to)
      LEFT JOIN character_location_spans cls
        ON cls.character_id = c.id
       AND cls.valid_from <= ?
       AND (cls.valid_to IS NULL OR ? < cls.valid_to)
      LEFT JOIN location_versions lv
        ON lv.location_id = cls.location_id
       AND lv.valid_from <= ?
       AND (lv.valid_to IS NULL OR ? < lv.valid_to)
      WHERE c.exists_from_tick <= ?
        AND (c.exists_to_tick IS NULL OR ? < c.exists_to_tick)
      ORDER BY c.updated_at DESC, c.id DESC
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
  ) as CharacterRecord[];
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
