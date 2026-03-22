import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import type { StorageCoordinator } from '@backend/storage/types';
import type { CharacterService } from '@backend/services/character-service';
import type { EntityLinkService } from '@backend/services/entity-link-service';
import type { EventService } from '@backend/services/event-service';
import type { ItemService } from '@backend/services/item-service';
import type { LocationService } from '@backend/services/location-service';
import type { MapService } from '@backend/services/map-service';
import type { TimelineService } from '@backend/services/timeline-service';
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
    entityLinkService: EntityLinkService;
    eventService: EventService;
    itemService: ItemService;
    locationService: LocationService;
    mapService: MapService;
    timelineService: TimelineService;
    storageCoordinator: StorageCoordinator;
  },
): void {
  registerHandler('listCharacters', (input) =>
    services.characterService.listCharacters(
      input.asOfTick === undefined ? undefined : { asOfTick: input.asOfTick },
    ),
  );
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
  registerHandler('listLocations', (input) =>
    services.locationService.listLocations(
      input.asOfTick === undefined ? undefined : { asOfTick: input.asOfTick },
    ),
  );
  registerHandler('getLocation', (input) =>
    services.locationService.getLocation(input),
  );
  registerHandler('createLocation', (input) =>
    services.locationService.createLocation(input),
  );
  registerHandler('updateLocation', (input) =>
    services.locationService.updateLocation(input),
  );
  registerHandler('deleteLocation', (input) =>
    services.locationService.deleteLocation(input),
  );
  registerHandler('listItems', (input) =>
    services.itemService.listItems(
      input.asOfTick === undefined ? undefined : { asOfTick: input.asOfTick },
    ),
  );
  registerHandler('getItem', (input) => services.itemService.getItem(input));
  registerHandler('createItem', (input) => services.itemService.createItem(input));
  registerHandler('updateItem', (input) => services.itemService.updateItem(input));
  registerHandler('deleteItem', (input) => services.itemService.deleteItem(input));
  registerHandler('listEvents', (input) => services.eventService.listEvents(input));
  registerHandler('getEvent', (input) => services.eventService.getEvent(input));
  registerHandler('createEvent', (input) => services.eventService.createEvent(input));
  registerHandler('updateEvent', (input) => services.eventService.updateEvent(input));
  registerHandler('deleteEvent', (input) => services.eventService.deleteEvent(input));
  registerHandler('listMaps', () => services.mapService.listMaps());
  registerHandler('getMap', (input) => services.mapService.getMap(input));
  registerHandler('createMap', (input) => services.mapService.createMap(input));
  registerHandler('updateMap', (input) => services.mapService.updateMap(input));
  registerHandler('pickMapImage', async () => {
    const options: OpenDialogOptions = {
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
        },
      ],
    };
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, options)
      : await dialog.showOpenDialog(options);

    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  registerHandler('listMapFeatures', (input) => services.mapService.listMapFeatures(input));
  registerHandler('createMapFeature', (input) =>
    services.mapService.createMapFeature(input),
  );
  registerHandler('updateMapFeatureVersion', (input) =>
    services.mapService.updateMapFeatureVersion(input),
  );
  registerHandler('deleteMapFeature', (input) =>
    services.mapService.deleteMapFeature(input),
  );
  registerHandler('listMapAnchors', (input) => services.mapService.listMapAnchors(input));
  registerHandler('upsertMapAnchor', (input) => services.mapService.upsertMapAnchor(input));
  registerHandler('deleteMapAnchor', (input) => services.mapService.deleteMapAnchor(input));
  registerHandler('listEntityLinks', (input) =>
    services.entityLinkService.listEntityLinks(input),
  );
  registerHandler('createEntityLink', (input) =>
    services.entityLinkService.createEntityLink(input),
  );
  registerHandler('updateEntityLink', (input) =>
    services.entityLinkService.updateEntityLink(input),
  );
  registerHandler('deleteEntityLink', (input) =>
    services.entityLinkService.deleteEntityLink(input),
  );
  registerHandler('getTimelineBounds', () => services.timelineService.getTimelineBounds());
  registerHandler('listTimelineAnchors', () =>
    services.timelineService.listTimelineAnchors(),
  );
  registerHandler('searchWorld', (input) =>
    services.storageCoordinator.searchWorld({
      ...input,
      limit: input.limit ?? 20,
    }),
  );
  registerHandler('semanticSearch', (input) =>
    services.storageCoordinator.semanticSearch({
      ...input,
      limit: input.limit ?? 20,
    }),
  );
  registerHandler('rebuildIndexes', () => services.storageCoordinator.rebuildIndexes());
  registerHandler('importMarkdownChanges', () =>
    services.storageCoordinator.importMarkdownChanges(),
  );
  registerHandler('getStorageHealth', () =>
    services.storageCoordinator.getStorageHealth(),
  );
}
