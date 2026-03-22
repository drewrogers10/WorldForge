import { describe, expect, it } from 'vitest';
import { ipcContracts } from './ipc';

describe('ipc contracts', () => {
  it('validates character payloads including linked locations and delete', () => {
    const createCharacterInput = ipcContracts.createCharacter.input.parse({
      name: '  Aeris Vale  ',
      summary: '  Ranger of the glass coast.  ',
      locationId: 2,
      effectiveTick: 120,
    });

    expect(createCharacterInput).toEqual({
      name: 'Aeris Vale',
      summary: 'Ranger of the glass coast.',
      locationId: 2,
      effectiveTick: 120,
    });

    const characterOutput = ipcContracts.getCharacter.output.parse({
      status: 'active',
      record: {
        id: 4,
        name: 'Aeris Vale',
        summary: 'Ranger of the glass coast.',
        locationId: 2,
        location: {
          id: 2,
          name: 'Glass Coast',
        },
        existsFromTick: 100,
        existsToTick: null,
        createdAt: '2026-03-07T15:10:00.000Z',
        updatedAt: '2026-03-07T16:10:00.000Z',
      },
    });

    expect(characterOutput.record?.location?.name).toBe('Glass Coast');
    expect(() =>
      ipcContracts.createCharacter.input.parse({
        name: '',
        summary: 'x',
        locationId: -1,
        effectiveTick: -1,
      }),
    ).toThrow();
    expect(() => ipcContracts.deleteCharacter.input.parse({ id: 0, effectiveTick: 10 })).toThrow();
    expect(ipcContracts.deleteCharacter.output.parse(undefined)).toBeUndefined();
  });

  it('validates location payloads', () => {
    const createLocationInput = ipcContracts.createLocation.input.parse({
      name: '  The Glass Coast  ',
      summary: '  Wind-cut settlements above a silver sea.  ',
      effectiveTick: 10,
    });

    expect(createLocationInput).toEqual({
      name: 'The Glass Coast',
      summary: 'Wind-cut settlements above a silver sea.',
      effectiveTick: 10,
    });

    expect(
      ipcContracts.getLocation.output.parse({
        status: 'missing',
        record: null,
      }),
    ).toEqual({
      status: 'missing',
      record: null,
    });
    expect(
      ipcContracts.updateLocation.output.parse({
        id: 1,
        name: 'The Glass Coast',
        summary: 'Wind-cut settlements above a silver sea.',
        existsFromTick: 0,
        existsToTick: null,
        createdAt: '2026-03-07T10:00:00.000Z',
        updatedAt: '2026-03-07T12:00:00.000Z',
      }),
    ).toMatchObject({
      id: 1,
      name: 'The Glass Coast',
    });
    expect(() =>
      ipcContracts.createLocation.input.parse({
        name: ' ',
        summary: '',
        effectiveTick: 0,
      }),
    ).toThrow();
    expect(() => ipcContracts.deleteLocation.input.parse({ id: 0, effectiveTick: 10 })).toThrow();
    expect(ipcContracts.deleteLocation.output.parse(undefined)).toBeUndefined();
  });

  it('validates item payloads and assignment rules', () => {
    const createItemInput = ipcContracts.createItem.input.parse({
      name: '  Storm Lens  ',
      summary: '  A polished navigators lens.  ',
      quantity: 2,
      ownerCharacterId: 4,
      locationId: null,
      effectiveTick: 50,
    });

    expect(createItemInput).toEqual({
      name: 'Storm Lens',
      summary: 'A polished navigators lens.',
      quantity: 2,
      ownerCharacterId: 4,
      locationId: null,
      effectiveTick: 50,
    });

    expect(
      ipcContracts.getItem.output.parse({
        status: 'active',
        record: {
          id: 7,
          name: 'Storm Lens',
          summary: 'A polished navigators lens.',
          quantity: 2,
          ownerCharacterId: 4,
          ownerCharacter: {
            id: 4,
            name: 'Aeris Vale',
          },
          locationId: null,
          location: null,
          existsFromTick: 40,
          existsToTick: null,
          createdAt: '2026-03-07T10:00:00.000Z',
          updatedAt: '2026-03-07T12:00:00.000Z',
        },
      }),
    ).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: 7,
        quantity: 2,
        ownerCharacterId: 4,
      }),
    });

    expect(() =>
      ipcContracts.createItem.input.parse({
        name: 'Conflicted Relic',
        summary: '',
        quantity: 1,
        ownerCharacterId: 1,
        locationId: 2,
        effectiveTick: 10,
      }),
    ).toThrow('Item cannot be assigned to both a character and a location.');

    expect(() =>
      ipcContracts.updateItem.input.parse({
        id: 3,
        name: 'Broken Count',
        summary: '',
        quantity: -1,
        ownerCharacterId: null,
        locationId: null,
        effectiveTick: 10,
      }),
    ).toThrow();

    expect(() => ipcContracts.deleteItem.input.parse({ id: 0, effectiveTick: 10 })).toThrow();
    expect(ipcContracts.deleteItem.output.parse(undefined)).toBeUndefined();
  });

  it('validates event, map, and entity link payloads', () => {
    const createEventInput = ipcContracts.createEvent.input.parse({
      title: '  Treaty of Harbor Reach  ',
      summary: '  The coast is redrawn.  ',
      startTick: 20,
      endTick: 25,
      primaryLocationId: 3,
    });

    expect(createEventInput).toEqual({
      title: 'Treaty of Harbor Reach',
      summary: 'The coast is redrawn.',
      startTick: 20,
      endTick: 25,
      primaryLocationId: 3,
    });

    expect(
      ipcContracts.getEvent.output.parse({
        status: 'active',
        record: {
          id: 1,
          title: 'Treaty of Harbor Reach',
          summary: 'The coast is redrawn.',
          startTick: 20,
          endTick: 25,
          primaryLocationId: 3,
          primaryLocation: {
            id: 3,
            name: 'Harbor Reach',
          },
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
      }),
    ).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        primaryLocationId: 3,
      }),
    });

    const createMapFeatureInput = ipcContracts.createMapFeature.input.parse({
      mapId: 2,
      featureKind: 'border',
      locationId: 3,
      eventId: 1,
      label: '  Western Border  ',
      geometry: {
        type: 'border',
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 140 },
          { x: 180, y: 260 },
        ],
      },
      style: {
        stroke: '#d7b57a',
        fill: '#d7b57a22',
        strokeWidth: 90,
      },
      sourceEventId: 1,
      effectiveTick: 40,
    });

    expect(createMapFeatureInput.label).toBe('Western Border');
    expect(
      ipcContracts.createMap.output.parse({
        id: 2,
        name: 'Harbor Reach Region',
        displayKind: 'image',
        focusLocationId: 3,
        focusLocation: {
          id: 3,
          name: 'Harbor Reach',
        },
        parentMapId: null,
        parentMap: null,
        imageAssetPath: '/tmp/harbor-reach.png',
        canvasWidth: 10000,
        canvasHeight: 10000,
        createdAt: '2026-03-21T12:00:00.000Z',
        updatedAt: '2026-03-21T12:00:00.000Z',
      }),
    ).toMatchObject({
      displayKind: 'image',
      imageAssetPath: '/tmp/harbor-reach.png',
    });

    expect(
      ipcContracts.upsertMapAnchor.output.parse({
        id: 10,
        mapId: 2,
        locationId: 3,
        location: {
          id: 3,
          name: 'Harbor Reach',
        },
        x: 4000,
        y: 5200,
        createdAt: '2026-03-21T12:00:00.000Z',
        updatedAt: '2026-03-21T12:00:00.000Z',
      }),
    ).toMatchObject({
      x: 4000,
      y: 5200,
    });

    expect(
      ipcContracts.createEntityLink.input.parse({
        entityKind: 'location',
        entityId: 3,
        linkKind: 'file',
        label: '  Harbor Notes  ',
        target: '  /tmp/harbor-notes.md  ',
      }),
    ).toEqual({
      entityKind: 'location',
      entityId: 3,
      linkKind: 'file',
      label: 'Harbor Notes',
      target: '/tmp/harbor-notes.md',
    });

    expect(() =>
      ipcContracts.createMapFeature.input.parse({
        mapId: 2,
        featureKind: 'marker',
        locationId: null,
        eventId: null,
        label: '',
        geometry: {
          type: 'border',
          points: [
            { x: 100, y: 100 },
            { x: 200, y: 140 },
            { x: 180, y: 260 },
          ],
        },
        style: null,
        sourceEventId: null,
        effectiveTick: 10,
      }),
    ).toThrow('Feature kind must match geometry type.');
    expect(() =>
      ipcContracts.createEvent.input.parse({
        title: 'Broken Event',
        summary: '',
        startTick: 20,
        endTick: 10,
        primaryLocationId: null,
      }),
    ).toThrow();
  });

  it('validates storage search and health payloads', () => {
    expect(
      ipcContracts.searchWorld.input.parse({
        query: 'harbor beacon',
      }),
    ).toEqual({
      query: 'harbor beacon',
    });

    expect(
      ipcContracts.semanticSearch.output.parse([
        {
          entityType: 'location',
          entityId: 3,
          title: 'Sunspire Harbor',
          summary: 'A rebuilt harbor beneath the observatory cliffs.',
          matchedText: 'glass beacon above the cliffs',
          score: 0.82,
          tick: 40,
        },
      ]),
    ).toEqual([
      {
        entityType: 'location',
        entityId: 3,
        title: 'Sunspire Harbor',
        summary: 'A rebuilt harbor beneath the observatory cliffs.',
        matchedText: 'glass beacon above the cliffs',
        score: 0.82,
        tick: 40,
      },
    ]);

    expect(
      ipcContracts.getStorageHealth.output.parse({
        worldRoot: '/tmp/world',
        vectorEngine: 'embedded-hash-vector',
        documentDirtyCount: 0,
        vectorDirtyCount: 1,
        pendingSnapshotCount: 2,
        searchDocumentCount: 4,
        lastDocumentError: null,
        lastVectorError: 'vector write failed',
      }),
    ).toMatchObject({
      vectorDirtyCount: 1,
      pendingSnapshotCount: 2,
    });
  });
});
