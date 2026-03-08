import type {
  Character,
  CreateCharacterInput,
  GetCharacterInput,
  UpdateCharacterInput,
} from './character';

export interface WorldForgeApi {
  listCharacters: () => Promise<Character[]>;
  getCharacter: (input: GetCharacterInput) => Promise<Character | null>;
  createCharacter: (input: CreateCharacterInput) => Promise<Character>;
  updateCharacter: (input: UpdateCharacterInput) => Promise<Character>;
}
