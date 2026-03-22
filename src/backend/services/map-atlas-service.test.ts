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
      themePreset: 'parchment',
      focusLocationId: null,
      parentMapId: null,
      imageAssetPath: null,
      canvasWidth: 10_000,
      canvasHeight: 10_000,
    });
    const regionMap = mapService.createMap({
      name: 'Harbor Reach Region',
      displayKind: 'image',
      themePreset: 'terrain',
      focusLocationId: harbor.id,
      parentMapId: worldMap.id,
      imageAssetPath: '/tmp/harbor-reach.png',
      canvasWidth: 10_000,
      canvasHeight: 10_000,
    });

    const createdFeature = mapService.createMapFeature({
      mapId: worldMap.id,
      featureKind: 'border',
      featureRole: 'regionBorder',
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
      featureRole: 'regionBorder',
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
      featureRole: 'regionBorder',
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
      featureRole: 'regionBorder',
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

  it('persists map theme presets, feature roles, and validates actual map bounds', () => {
    const locationService = createLocationService(context!.db, context!.storageCoordinator);
    const mapService = createMapService(context!.db);

    const forestKeep = locationService.createLocation({
      name: 'Forest Keep',
      summary: 'A fortress in the green sea.',
      effectiveTick: 5,
    });

    const regionMap = mapService.createMap({
      name: 'Emerald March',
      displayKind: 'vector',
      themePreset: 'terrain',
      focusLocationId: forestKeep.id,
      parentMapId: null,
      imageAssetPath: null,
      canvasWidth: 1600,
      canvasHeight: 900,
    });

    expect(mapService.getMap({ id: regionMap.id })).toMatchObject({
      id: regionMap.id,
      themePreset: 'terrain',
      canvasWidth: 1600,
      canvasHeight: 900,
    });

    const river = mapService.createMapFeature({
      mapId: regionMap.id,
      featureKind: 'path',
      featureRole: 'river',
      locationId: forestKeep.id,
      eventId: null,
      label: 'Silver Run',
      geometry: {
        type: 'path',
        points: [
          { x: 100, y: 100 },
          { x: 900, y: 500 },
          { x: 1500, y: 820 },
        ],
      },
      style: {
        stroke: '#4f8ab5',
        strokeWidth: 30,
        opacity: 0.95,
      },
      sourceEventId: null,
      effectiveTick: 10,
    });

    expect(river).toMatchObject({
      featureKind: 'path',
      featureRole: 'river',
    });

    mapService.updateMapFeatureVersion({
      id: river.id,
      mapId: regionMap.id,
      featureKind: 'path',
      featureRole: 'road',
      locationId: forestKeep.id,
      eventId: null,
      label: 'Silver Road',
      geometry: {
        type: 'path',
        points: [
          { x: 120, y: 120 },
          { x: 880, y: 460 },
          { x: 1480, y: 780 },
        ],
      },
      style: {
        stroke: '#9b7a4e',
        strokeWidth: 28,
        opacity: 0.92,
      },
      sourceEventId: null,
      effectiveTick: 22,
    });

    expect(
      mapService.listMapFeatures({ mapId: regionMap.id, asOfTick: 12 })[0],
    ).toMatchObject({
      id: river.id,
      featureRole: 'river',
      validTo: 22,
    });
    expect(
      mapService.listMapFeatures({ mapId: regionMap.id, asOfTick: 30 })[0],
    ).toMatchObject({
      id: river.id,
      featureRole: 'road',
      validFrom: 22,
    });

    expect(() =>
      mapService.createMapFeature({
        mapId: regionMap.id,
        featureKind: 'marker',
        featureRole: 'settlement',
        locationId: forestKeep.id,
        eventId: null,
        label: 'Broken Point',
        geometry: {
          type: 'marker',
          point: { x: 1700, y: 100 },
        },
        style: null,
        sourceEventId: null,
        effectiveTick: 14,
      }),
    ).toThrow(/bounds/i);

    mapService.upsertMapAnchor({
      mapId: regionMap.id,
      locationId: forestKeep.id,
      x: 1500,
      y: 820,
    });

    expect(() =>
      mapService.upsertMapAnchor({
        mapId: regionMap.id,
        locationId: forestKeep.id,
        x: 1601,
        y: 820,
      }),
    ).toThrow(/bounds/i);
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
