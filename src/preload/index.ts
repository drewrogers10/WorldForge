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
  listCharacters: (input = {}) => invoke('listCharacters', input),
  getCharacter: (input) => invoke('getCharacter', input),
  createCharacter: (input) => invoke('createCharacter', input),
  updateCharacter: (input) => invoke('updateCharacter', input),
  deleteCharacter: (input) => invoke('deleteCharacter', input),
  listLocations: (input = {}) => invoke('listLocations', input),
  getLocation: (input) => invoke('getLocation', input),
  createLocation: (input) => invoke('createLocation', input),
  updateLocation: (input) => invoke('updateLocation', input),
  deleteLocation: (input) => invoke('deleteLocation', input),
  listItems: (input = {}) => invoke('listItems', input),
  getItem: (input) => invoke('getItem', input),
  createItem: (input) => invoke('createItem', input),
  updateItem: (input) => invoke('updateItem', input),
  deleteItem: (input) => invoke('deleteItem', input),
  getTimelineBounds: () => invoke('getTimelineBounds', undefined),
  listTimelineAnchors: () => invoke('listTimelineAnchors', undefined),
};

contextBridge.exposeInMainWorld('worldForge', api);
