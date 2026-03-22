import { z, type ZodTypeAny } from 'zod';
import {
  characterDetailSchema,
  characterSchema,
  createCharacterInputSchema,
  deleteCharacterInputSchema,
  getCharacterInputSchema,
  updateCharacterInputSchema,
} from './character';
import {
  createLocationInputSchema,
  deleteLocationInputSchema,
  getLocationInputSchema,
  locationDetailSchema,
  locationSchema,
  updateLocationInputSchema,
} from './location';
import {
  createItemInputSchema,
  deleteItemInputSchema,
  getItemInputSchema,
  itemDetailSchema,
  itemSchema,
  updateItemInputSchema,
} from './item';
import {
  asOfInputSchema,
  timelineAnchorSchema,
  timelineBoundsSchema,
} from './temporal';
import {
  createEventInputSchema,
  deleteEventInputSchema,
  eventDetailSchema,
  eventSchema,
  getEventInputSchema,
  listEventsInputSchema,
  updateEventInputSchema,
} from './event';
import {
  createEntityLinkInputSchema,
  deleteEntityLinkInputSchema,
  entityLinkSchema,
  listEntityLinksInputSchema,
  updateEntityLinkInputSchema,
} from './entity-link';
import {
  createMapFeatureInputSchema,
  createMapInputSchema,
  deleteMapAnchorInputSchema,
  deleteMapFeatureInputSchema,
  getMapInputSchema,
  listMapAnchorsInputSchema,
  listMapFeaturesInputSchema,
  mapAnchorSchema,
  mapFeatureSchema,
  mapSchema,
  updateMapFeatureVersionInputSchema,
  updateMapInputSchema,
  upsertMapAnchorInputSchema,
} from './map';
import {
  searchWorldInputSchema,
  semanticSearchInputSchema,
  storageHealthSchema,
  storageOperationResultSchema,
  worldSearchHitSchema,
} from './storage';

type IpcContract<TInput extends ZodTypeAny, TOutput extends ZodTypeAny> = {
  channel: string;
  input: TInput;
  output: TOutput;
};

function createContract<TInput extends ZodTypeAny, TOutput extends ZodTypeAny>(
  channel: string,
  input: TInput,
  output: TOutput,
): IpcContract<TInput, TOutput> {
  return { channel, input, output };
}

const filePathSchema = z.string().trim().min(1);

export const ipcContracts = {
  listCharacters: createContract(
    'characters:list',
    asOfInputSchema,
    z.array(characterSchema),
  ),
  getCharacter: createContract(
    'characters:get',
    getCharacterInputSchema,
    characterDetailSchema,
  ),
  createCharacter: createContract(
    'characters:create',
    createCharacterInputSchema,
    characterSchema,
  ),
  updateCharacter: createContract(
    'characters:update',
    updateCharacterInputSchema,
    characterSchema,
  ),
  deleteCharacter: createContract(
    'characters:delete',
    deleteCharacterInputSchema,
    z.void(),
  ),
  listLocations: createContract(
    'locations:list',
    asOfInputSchema,
    z.array(locationSchema),
  ),
  getLocation: createContract(
    'locations:get',
    getLocationInputSchema,
    locationDetailSchema,
  ),
  createLocation: createContract(
    'locations:create',
    createLocationInputSchema,
    locationSchema,
  ),
  updateLocation: createContract(
    'locations:update',
    updateLocationInputSchema,
    locationSchema,
  ),
  deleteLocation: createContract(
    'locations:delete',
    deleteLocationInputSchema,
    z.void(),
  ),
  listItems: createContract('items:list', asOfInputSchema, z.array(itemSchema)),
  getItem: createContract('items:get', getItemInputSchema, itemDetailSchema),
  createItem: createContract('items:create', createItemInputSchema, itemSchema),
  updateItem: createContract('items:update', updateItemInputSchema, itemSchema),
  deleteItem: createContract('items:delete', deleteItemInputSchema, z.void()),
  listEvents: createContract('events:list', listEventsInputSchema, z.array(eventSchema)),
  getEvent: createContract('events:get', getEventInputSchema, eventDetailSchema),
  createEvent: createContract('events:create', createEventInputSchema, eventSchema),
  updateEvent: createContract('events:update', updateEventInputSchema, eventSchema),
  deleteEvent: createContract('events:delete', deleteEventInputSchema, z.void()),
  listMaps: createContract('maps:list', z.void(), z.array(mapSchema)),
  getMap: createContract('maps:get', getMapInputSchema, mapSchema.nullable()),
  createMap: createContract('maps:create', createMapInputSchema, mapSchema),
  updateMap: createContract('maps:update', updateMapInputSchema, mapSchema),
  pickMapImage: createContract('maps:image:pick', z.void(), filePathSchema.nullable()),
  listMapFeatures: createContract(
    'maps:features:list',
    listMapFeaturesInputSchema,
    z.array(mapFeatureSchema),
  ),
  createMapFeature: createContract(
    'maps:features:create',
    createMapFeatureInputSchema,
    mapFeatureSchema,
  ),
  updateMapFeatureVersion: createContract(
    'maps:features:update',
    updateMapFeatureVersionInputSchema,
    mapFeatureSchema,
  ),
  deleteMapFeature: createContract(
    'maps:features:delete',
    deleteMapFeatureInputSchema,
    z.void(),
  ),
  listMapAnchors: createContract(
    'maps:anchors:list',
    listMapAnchorsInputSchema,
    z.array(mapAnchorSchema),
  ),
  upsertMapAnchor: createContract(
    'maps:anchors:upsert',
    upsertMapAnchorInputSchema,
    mapAnchorSchema,
  ),
  deleteMapAnchor: createContract(
    'maps:anchors:delete',
    deleteMapAnchorInputSchema,
    z.void(),
  ),
  listEntityLinks: createContract(
    'links:list',
    listEntityLinksInputSchema,
    z.array(entityLinkSchema),
  ),
  createEntityLink: createContract(
    'links:create',
    createEntityLinkInputSchema,
    entityLinkSchema,
  ),
  updateEntityLink: createContract(
    'links:update',
    updateEntityLinkInputSchema,
    entityLinkSchema,
  ),
  deleteEntityLink: createContract(
    'links:delete',
    deleteEntityLinkInputSchema,
    z.void(),
  ),
  getTimelineBounds: createContract(
    'timeline:bounds',
    z.void(),
    timelineBoundsSchema,
  ),
  listTimelineAnchors: createContract(
    'timeline:anchors',
    z.void(),
    z.array(timelineAnchorSchema),
  ),
  searchWorld: createContract(
    'search:world',
    searchWorldInputSchema,
    z.array(worldSearchHitSchema),
  ),
  semanticSearch: createContract(
    'search:semantic',
    semanticSearchInputSchema,
    z.array(worldSearchHitSchema),
  ),
  rebuildIndexes: createContract(
    'storage:rebuild-indexes',
    z.void(),
    storageOperationResultSchema,
  ),
  importMarkdownChanges: createContract(
    'storage:import-markdown',
    z.void(),
    storageOperationResultSchema,
  ),
  getStorageHealth: createContract(
    'storage:health',
    z.void(),
    storageHealthSchema,
  ),
} as const;

export type IpcContractKey = keyof typeof ipcContracts;
export type IpcInput<K extends IpcContractKey> = z.input<
  (typeof ipcContracts)[K]['input']
>;
export type IpcOutput<K extends IpcContractKey> = z.output<
  (typeof ipcContracts)[K]['output']
>;
