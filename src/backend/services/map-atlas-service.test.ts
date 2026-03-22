import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestStorageContext } from '@backend/storage/test-utils';
import { createEntityLinkService } from './entity-link-service';
import { createEventService } from './event-service';
import { createLocationService } from './location-service';
import { createMapService } from './map-service';

type TestDatabaseContext = ReturnType<typeof createTestStorageContext>;

describe('map atlas services', () => {
  let context: TestDatabaseContext | undefined;

  beforeEach(() => {
    context = createTestStorageContext();
  });

  afterEach(() => {
    context?.cleanup();
    context = undefined;
  });

  it('supports temporal map features and shared anchors across maps', async () => {
    const locationService = createLocationService(context!.db, context!.storageCoordinator);
    const eventService = createEventService(context!.db);
    const mapService = createMapService(context!.db);

    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A tidal city.',
      effectiveTick: 10,
    });
    const treaty = eventService.createEvent({
      title: 'Treaty of Harbor Reach',
      summary: 'The coast is redrawn.',
      startTick: 20,
      endTick: 25,
      primaryLocationId: harbor.id,
    });

    const worldMap = mapService.createMap({
      name: 'World Atlas',
      displayKind: 'vector',
      focusLocationId: null,
      parentMapId: null,
      imageAssetPath: null,
      canvasWidth: 10_000,
      canvasHeight: 10_000,
    });
    const regionMap = mapService.createMap({
      name: 'Harbor Reach Region',
      displayKind: 'image',
      focusLocationId: harbor.id,
      parentMapId: worldMap.id,
      imageAssetPath: '/tmp/harbor-reach.png',
      canvasWidth: 10_000,
      canvasHeight: 10_000,
    });

    const createdFeature = mapService.createMapFeature({
      mapId: worldMap.id,
      featureKind: 'border',
      locationId: harbor.id,
      eventId: treaty.id,
      label: 'Old Coast Border',
      geometry: {
        type: 'border',
        points: [
          { x: 1000, y: 1000 },
          { x: 3000, y: 1200 },
          { x: 2800, y: 2600 },
        ],
      },
      style: {
        stroke: '#ddbb77',
        fill: '#ddbb7722',
        strokeWidth: 90,
      },
      sourceEventId: treaty.id,
      effectiveTick: 20,
    });

    mapService.updateMapFeatureVersion({
      id: createdFeature.id,
      mapId: worldMap.id,
      featureKind: 'border',
      locationId: harbor.id,
      eventId: treaty.id,
      label: 'New Coast Border',
      geometry: {
        type: 'border',
        points: [
          { x: 1200, y: 1000 },
          { x: 3400, y: 1400 },
          { x: 3000, y: 2900 },
        ],
      },
      style: {
        stroke: '#ddbb77',
        fill: '#ddbb7722',
        strokeWidth: 90,
      },
      sourceEventId: treaty.id,
      effectiveTick: 40,
    });

    expect(
      mapService.listMapFeatures({ mapId: worldMap.id, asOfTick: 25 })[0],
    ).toMatchObject({
      id: createdFeature.id,
      label: 'Old Coast Border',
      validFrom: 20,
      validTo: 40,
      locationId: harbor.id,
      eventId: treaty.id,
    });
    expect(
      mapService.listMapFeatures({ mapId: worldMap.id, asOfTick: 45 })[0],
    ).toMatchObject({
      id: createdFeature.id,
      label: 'New Coast Border',
      validFrom: 40,
      validTo: null,
    });

    mapService.upsertMapAnchor({
      mapId: worldMap.id,
      locationId: harbor.id,
      x: 1500,
      y: 1800,
    });
    mapService.upsertMapAnchor({
      mapId: worldMap.id,
      locationId: harbor.id,
      x: 1900,
      y: 2200,
    });
    mapService.upsertMapAnchor({
      mapId: regionMap.id,
      locationId: harbor.id,
      x: 5200,
      y: 4700,
    });

    expect(mapService.listMapAnchors({ mapId: worldMap.id })).toHaveLength(1);
    expect(mapService.listMapAnchors({ mapId: worldMap.id })[0]).toMatchObject({
      locationId: harbor.id,
      x: 1900,
      y: 2200,
    });
    expect(mapService.listMapAnchors({ mapId: regionMap.id })[0]).toMatchObject({
      locationId: harbor.id,
      x: 5200,
      y: 4700,
    });
  });

  it('supports events as chronology rows and entity file links', () => {
    const locationService = createLocationService(context!.db, context!.storageCoordinator);
    const eventService = createEventService(context!.db);
    const entityLinkService = createEntityLinkService(context!.db);

    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A tidal city.',
      effectiveTick: 10,
    });
    const treaty = eventService.createEvent({
      title: 'Treaty of Harbor Reach',
      summary: 'The coast is redrawn.',
      startTick: 20,
      endTick: 25,
      primaryLocationId: harbor.id,
    });

    expect(eventService.getEvent({ id: treaty.id, asOfTick: 19 })).toEqual({
      status: 'notYetCreated',
      record: null,
    });
    expect(eventService.getEvent({ id: treaty.id, asOfTick: 22 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: treaty.id,
        primaryLocationId: harbor.id,
      }),
    });
    expect(eventService.getEvent({ id: treaty.id, asOfTick: 30 })).toEqual({
      status: 'ended',
      record: null,
    });
    expect(eventService.listEvents({ locationId: harbor.id })).toHaveLength(1);

    const locationLink = entityLinkService.createEntityLink({
      entityKind: 'location',
      entityId: harbor.id,
      linkKind: 'file',
      label: 'Harbor Notes',
      target: '/tmp/harbor-notes.md',
    });
    const eventLink = entityLinkService.createEntityLink({
      entityKind: 'event',
      entityId: treaty.id,
      linkKind: 'url',
      label: 'Treaty Reference',
      target: 'https://example.com/treaty',
    });

    expect(entityLinkService.listEntityLinks({ entityKind: 'location', entityId: harbor.id })).toEqual(
      [
        expect.objectContaining({
          id: locationLink.id,
          label: 'Harbor Notes',
        }),
      ],
    );

    const updatedEventLink = entityLinkService.updateEntityLink({
      id: eventLink.id,
      entityKind: 'event',
      entityId: treaty.id,
      linkKind: 'url',
      label: 'Updated Treaty Reference',
      target: 'https://example.com/treaty-v2',
    });

    expect(updatedEventLink).toMatchObject({
      id: eventLink.id,
      label: 'Updated Treaty Reference',
      target: 'https://example.com/treaty-v2',
    });

    entityLinkService.deleteEntityLink({ id: locationLink.id });

    expect(entityLinkService.listEntityLinks({ entityKind: 'location', entityId: harbor.id })).toEqual([]);
  });
});
