import { z, type ZodTypeAny } from 'zod';
import {
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
  locationSchema,
  updateLocationInputSchema,
} from './location';
import {
  createItemInputSchema,
  deleteItemInputSchema,
  getItemInputSchema,
  itemSchema,
  updateItemInputSchema,
} from './item';

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
    z.void(),
    z.array(characterSchema),
  ),
  getCharacter: createContract(
    'characters:get',
    getCharacterInputSchema,
    characterSchema.nullable(),
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
    z.void(),
    z.array(locationSchema),
  ),
  getLocation: createContract(
    'locations:get',
    getLocationInputSchema,
    locationSchema.nullable(),
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
  listItems: createContract('items:list', z.void(), z.array(itemSchema)),
  getItem: createContract('items:get', getItemInputSchema, itemSchema.nullable()),
  createItem: createContract('items:create', createItemInputSchema, itemSchema),
  updateItem: createContract('items:update', updateItemInputSchema, itemSchema),
  deleteItem: createContract('items:delete', deleteItemInputSchema, z.void()),
} as const;

export type IpcContractKey = keyof typeof ipcContracts;
export type IpcInput<K extends IpcContractKey> = z.input<
  (typeof ipcContracts)[K]['input']
>;
export type IpcOutput<K extends IpcContractKey> = z.output<
  (typeof ipcContracts)[K]['output']
>;
