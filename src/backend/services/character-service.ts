import type { AppDatabase } from '@db/client';
import {
  createCharacterRow,
  getCharacterRow,
  listCharacterRows,
  updateCharacterRow,
} from '@db/queries/characters';
import type {
  Character,
  CreateCharacterInput,
  GetCharacterInput,
  UpdateCharacterInput,
} from '@shared/character';

function toCharacter(record: {
  id: number;
  name: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
}): Character {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function normalizeCharacterFields(input: {
  name: string;
  summary: string;
}): Pick<Character, 'name' | 'summary'> {
  return {
    name: input.name.trim(),
    summary: input.summary.trim(),
  };
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

      const fields = normalizeCharacterFields(input);
      const record = updateCharacterRow(db, input.id, {
        ...fields,
        updatedAt: Date.now(),
      });

      return toCharacter(record);
    },
  };
}

export type CharacterService = ReturnType<typeof createCharacterService>;
