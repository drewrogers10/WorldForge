import { ipcMain } from 'electron';
import type { CharacterService } from '@backend/services/character-service';
import type { ItemService } from '@backend/services/item-service';
import type { LocationService } from '@backend/services/location-service';
import {
  ipcContracts,
  type IpcContractKey,
  type IpcInput,
  type IpcOutput,
} from '@shared/ipc';

function registerHandler<K extends IpcContractKey>(
  key: K,
  handler: (input: IpcInput<K>) => IpcOutput<K> | Promise<IpcOutput<K>>,
): void {
  const contract = ipcContracts[key];

  ipcMain.handle(contract.channel, async (_event, rawInput) => {
    const input = contract.input.parse(rawInput) as IpcInput<K>;
    const output = await handler(input);
    return contract.output.parse(output) as IpcOutput<K>;
  });
}

export function registerIpcHandlers(
  services: {
    characterService: CharacterService;
    itemService: ItemService;
    locationService: LocationService;
  },
): void {
  registerHandler('listCharacters', () => services.characterService.listCharacters());
  registerHandler('getCharacter', (input) =>
    services.characterService.getCharacter(input),
  );
  registerHandler('createCharacter', (input) =>
    services.characterService.createCharacter(input),
  );
  registerHandler('updateCharacter', (input) =>
    services.characterService.updateCharacter(input),
  );
  registerHandler('deleteCharacter', (input) =>
    services.characterService.deleteCharacter(input),
  );
  registerHandler('listLocations', () => services.locationService.listLocations());
  registerHandler('getLocation', (input) =>
    services.locationService.getLocation(input),
  );
  registerHandler('createLocation', (input) =>
    services.locationService.createLocation(input),
  );
  registerHandler('updateLocation', (input) =>
    services.locationService.updateLocation(input),
  );
  registerHandler('listItems', () => services.itemService.listItems());
  registerHandler('getItem', (input) => services.itemService.getItem(input));
  registerHandler('createItem', (input) => services.itemService.createItem(input));
  registerHandler('updateItem', (input) => services.itemService.updateItem(input));
  registerHandler('deleteItem', (input) => services.itemService.deleteItem(input));
}
