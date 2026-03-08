import { contextBridge, ipcRenderer } from 'electron';
import type { WorldForgeApi } from '@shared/api';
import {
  ipcContracts,
  type IpcContractKey,
  type IpcInput,
  type IpcOutput,
} from '@shared/ipc';

async function invoke<K extends IpcContractKey>(
  key: K,
  input: IpcInput<K>,
): Promise<IpcOutput<K>> {
  const contract = ipcContracts[key];
  const parsedInput = contract.input.parse(input);
  const rawOutput = await ipcRenderer.invoke(contract.channel, parsedInput);
  return contract.output.parse(rawOutput) as IpcOutput<K>;
}

const api: WorldForgeApi = {
  listCharacters: () => invoke('listCharacters', undefined),
  getCharacter: (input) => invoke('getCharacter', input),
  createCharacter: (input) => invoke('createCharacter', input),
  updateCharacter: (input) => invoke('updateCharacter', input),
};

contextBridge.exposeInMainWorld('worldForge', api);
