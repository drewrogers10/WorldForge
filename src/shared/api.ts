import type {
  Character,
  CharacterDetail,
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
  ItemDetail,
  UpdateItemInput,
} from './item';
import type {
  CreateLocationInput,
  DeleteLocationInput,
  GetLocationInput,
  Location,
  LocationDetail,
  UpdateLocationInput,
} from './location';
import type { AsOfInput, TimelineAnchor, TimelineBounds } from './temporal';

export interface WorldForgeApi {
  listCharacters: (input?: AsOfInput) => Promise<Character[]>;
  getCharacter: (input: GetCharacterInput) => Promise<CharacterDetail>;
  createCharacter: (input: CreateCharacterInput) => Promise<Character>;
  updateCharacter: (input: UpdateCharacterInput) => Promise<Character>;
  deleteCharacter: (input: DeleteCharacterInput) => Promise<void>;
  listLocations: (input?: AsOfInput) => Promise<Location[]>;
  getLocation: (input: GetLocationInput) => Promise<LocationDetail>;
  createLocation: (input: CreateLocationInput) => Promise<Location>;
  updateLocation: (input: UpdateLocationInput) => Promise<Location>;
  deleteLocation: (input: DeleteLocationInput) => Promise<void>;
  listItems: (input?: AsOfInput) => Promise<Item[]>;
  getItem: (input: GetItemInput) => Promise<ItemDetail>;
  createItem: (input: CreateItemInput) => Promise<Item>;
  updateItem: (input: UpdateItemInput) => Promise<Item>;
  deleteItem: (input: DeleteItemInput) => Promise<void>;
  getTimelineBounds: () => Promise<TimelineBounds>;
  listTimelineAnchors: () => Promise<TimelineAnchor[]>;
}
