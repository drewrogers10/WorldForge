import type { AppDatabase } from '@db/client';
import {
  createCharacterRow,
  deleteCharacterRow,
  getCharacterRow,
  listCharacterRows,
  updateCharacterRow,
} from '@db/queries/characters';
import { getLocationRow } from '@db/queries/locations';
import type {
  Character,
  CreateCharacterInput,
  DeleteCharacterInput,
  GetCharacterInput,
  UpdateCharacterInput,
} from '@shared/character';

function toCharacter(record: {
  id: number;
  name: string;
  summary: string;
  locationId: number | null;
  locationName: string | null;
  createdAt: number;
  updatedAt: number;
}): Character {
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

function assertLocationExists(
  db: AppDatabase,
  locationId: number | null,
): void {
  if (locationId === null) {
    return;
  }

  if (!getLocationRow(db, locationId)) {
    throw new Error(`Location ${locationId} does not exist.`);
  }
}

export function createCharacterService(db: AppDatabase) {
  return {
    listCharacters(): Character[] {
      return listCharacterRows(db).map(toCharacter);
    },
    getCharacter(input: GetCharacterInput): Character | null {
      const record = getCharacterRow(db, input.id);
      return record ? toCharacter(record) : null;
    },
    createCharacter(input: CreateCharacterInput): Character {
      const now = Date.now();
      assertLocationExists(db, input.locationId);
      const fields = normalizeCharacterFields(input);
      const record = createCharacterRow(db, {
        ...fields,
        createdAt: now,
        updatedAt: now,
      });

      return toCharacter(record);
    },
    updateCharacter(input: UpdateCharacterInput): Character {
      const existing = getCharacterRow(db, input.id);

      if (!existing) {
        throw new Error(`Character ${input.id} does not exist.`);
      }

      assertLocationExists(db, input.locationId);
      const fields = normalizeCharacterFields(input);
      const record = updateCharacterRow(db, input.id, {
        ...fields,
        updatedAt: Date.now(),
      });

      return toCharacter(record);
    },
    deleteCharacter(input: DeleteCharacterInput): void {
      const existing = getCharacterRow(db, input.id);

      if (!existing) {
        throw new Error(`Character ${input.id} does not exist.`);
      }

      deleteCharacterRow(db, input.id);
    },
  };
}

export type CharacterService = ReturnType<typeof createCharacterService>;
