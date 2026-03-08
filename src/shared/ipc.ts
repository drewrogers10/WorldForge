import { z, type ZodTypeAny } from 'zod';
import {
  characterSchema,
  createCharacterInputSchema,
  getCharacterInputSchema,
  updateCharacterInputSchema,
} from './character';

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
} as const;

export type IpcContractKey = keyof typeof ipcContracts;
export type IpcInput<K extends IpcContractKey> = z.input<
  (typeof ipcContracts)[K]['input']
>;
export type IpcOutput<K extends IpcContractKey> = z.output<
  (typeof ipcContracts)[K]['output']
>;
