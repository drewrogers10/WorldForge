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
} as const;

export type IpcContractKey = keyof typeof ipcContracts;
export type IpcInput<K extends IpcContractKey> = z.input<
  (typeof ipcContracts)[K]['input']
>;
export type IpcOutput<K extends IpcContractKey> = z.output<
  (typeof ipcContracts)[K]['output']
>;
