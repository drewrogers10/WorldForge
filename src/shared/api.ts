import type {
  Character,
  CreateCharacterInput,
  DeleteCharacterInput,
  GetCharacterInput,
  UpdateCharacterInput,
} from './character';
import type {
  CreateLocationInput,
  GetLocationInput,
  Location,
  UpdateLocationInput,
} from './location';

export interface WorldForgeApi {
  listCharacters: () => Promise<Character[]>;
  getCharacter: (input: GetCharacterInput) => Promise<Character | null>;
  createCharacter: (input: CreateCharacterInput) => Promise<Character>;
  updateCharacter: (input: UpdateCharacterInput) => Promise<Character>;
  deleteCharacter: (input: DeleteCharacterInput) => Promise<void>;
  listLocations: () => Promise<Location[]>;
  getLocation: (input: GetLocationInput) => Promise<Location | null>;
  createLocation: (input: CreateLocationInput) => Promise<Location>;
  updateLocation: (input: UpdateLocationInput) => Promise<Location>;
}
