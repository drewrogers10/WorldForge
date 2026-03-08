import type {
  Character,
  CreateCharacterInput,
  DeleteCharacterInput,
  GetCharacterInput,
  UpdateCharacterInput,
} from './character';
import type {
  CreateItemInput,
  DeleteItemInput,
  GetItemInput,
  Item,
  UpdateItemInput,
} from './item';
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
  listItems: () => Promise<Item[]>;
  getItem: (input: GetItemInput) => Promise<Item | null>;
  createItem: (input: CreateItemInput) => Promise<Item>;
  updateItem: (input: UpdateItemInput) => Promise<Item>;
  deleteItem: (input: DeleteItemInput) => Promise<void>;
}
