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
import type {
  CreateEventInput,
  DeleteEventInput,
  Event,
  EventDetail,
  GetEventInput,
  ListEventsInput,
  UpdateEventInput,
} from './event';
import type {
  CreateEntityLinkInput,
  DeleteEntityLinkInput,
  EntityLink,
  ListEntityLinksInput,
  UpdateEntityLinkInput,
} from './entity-link';
import type {
  CreateMapFeatureInput,
  CreateMapInput,
  DeleteMapAnchorInput,
  DeleteMapFeatureInput,
  GetMapInput,
  ListMapAnchorsInput,
  ListMapFeaturesInput,
  MapAnchor,
  MapFeature,
  MapRecord,
  UpdateMapFeatureVersionInput,
  UpdateMapInput,
  UpsertMapAnchorInput,
} from './map';
import type {
  SearchWorldInput,
  SemanticSearchInput,
  StorageHealth,
  StorageOperationResult,
  WorldSearchHit,
} from './storage';
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
  listEvents: (input?: ListEventsInput) => Promise<Event[]>;
  getEvent: (input: GetEventInput) => Promise<EventDetail>;
  createEvent: (input: CreateEventInput) => Promise<Event>;
  updateEvent: (input: UpdateEventInput) => Promise<Event>;
  deleteEvent: (input: DeleteEventInput) => Promise<void>;
  listMaps: () => Promise<MapRecord[]>;
  getMap: (input: GetMapInput) => Promise<MapRecord | null>;
  createMap: (input: CreateMapInput) => Promise<MapRecord>;
  updateMap: (input: UpdateMapInput) => Promise<MapRecord>;
  listMapFeatures: (input: ListMapFeaturesInput) => Promise<MapFeature[]>;
  createMapFeature: (input: CreateMapFeatureInput) => Promise<MapFeature>;
  updateMapFeatureVersion: (input: UpdateMapFeatureVersionInput) => Promise<MapFeature>;
  deleteMapFeature: (input: DeleteMapFeatureInput) => Promise<void>;
  listMapAnchors: (input: ListMapAnchorsInput) => Promise<MapAnchor[]>;
  upsertMapAnchor: (input: UpsertMapAnchorInput) => Promise<MapAnchor>;
  deleteMapAnchor: (input: DeleteMapAnchorInput) => Promise<void>;
  listEntityLinks: (input: ListEntityLinksInput) => Promise<EntityLink[]>;
  createEntityLink: (input: CreateEntityLinkInput) => Promise<EntityLink>;
  updateEntityLink: (input: UpdateEntityLinkInput) => Promise<EntityLink>;
  deleteEntityLink: (input: DeleteEntityLinkInput) => Promise<void>;
  getTimelineBounds: () => Promise<TimelineBounds>;
  listTimelineAnchors: () => Promise<TimelineAnchor[]>;
  searchWorld: (input: SearchWorldInput) => Promise<WorldSearchHit[]>;
  semanticSearch: (input: SemanticSearchInput) => Promise<WorldSearchHit[]>;
  rebuildIndexes: () => Promise<StorageOperationResult>;
  importMarkdownChanges: () => Promise<StorageOperationResult>;
  getStorageHealth: () => Promise<StorageHealth>;
}
