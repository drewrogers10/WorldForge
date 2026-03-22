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
  listEvents: (input = {}) => invoke('listEvents', input),
  getEvent: (input) => invoke('getEvent', input),
  createEvent: (input) => invoke('createEvent', input),
  updateEvent: (input) => invoke('updateEvent', input),
  deleteEvent: (input) => invoke('deleteEvent', input),
  listMaps: () => invoke('listMaps', undefined),
  getMap: (input) => invoke('getMap', input),
  createMap: (input) => invoke('createMap', input),
  updateMap: (input) => invoke('updateMap', input),
  pickMapImage: () => invoke('pickMapImage', undefined),
  listMapFeatures: (input) => invoke('listMapFeatures', input),
  createMapFeature: (input) => invoke('createMapFeature', input),
  updateMapFeatureVersion: (input) => invoke('updateMapFeatureVersion', input),
  deleteMapFeature: (input) => invoke('deleteMapFeature', input),
  listMapAnchors: (input) => invoke('listMapAnchors', input),
  upsertMapAnchor: (input) => invoke('upsertMapAnchor', input),
  deleteMapAnchor: (input) => invoke('deleteMapAnchor', input),
  listEntityLinks: (input) => invoke('listEntityLinks', input),
  createEntityLink: (input) => invoke('createEntityLink', input),
  updateEntityLink: (input) => invoke('updateEntityLink', input),
  deleteEntityLink: (input) => invoke('deleteEntityLink', input),
  getTimelineBounds: () => invoke('getTimelineBounds', undefined),
  listTimelineAnchors: () => invoke('listTimelineAnchors', undefined),
  searchWorld: (input) => invoke('searchWorld', input),
  semanticSearch: (input) => invoke('semanticSearch', input),
  rebuildIndexes: () => invoke('rebuildIndexes', undefined),
  importMarkdownChanges: () => invoke('importMarkdownChanges', undefined),
  getStorageHealth: () => invoke('getStorageHealth', undefined),
};

contextBridge.exposeInMainWorld('worldForge', api);
