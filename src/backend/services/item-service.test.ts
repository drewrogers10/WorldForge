import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabaseContext } from '@db/test-utils';
import { createCharacterService } from './character-service';
import { createItemService } from './item-service';
import { createLocationService } from './location-service';

type TestDatabaseContext = ReturnType<typeof createTestDatabaseContext>;

describe('item service', () => {
  let context: TestDatabaseContext | undefined;

  beforeEach(() => {
    context = createTestDatabaseContext();
  });

  afterEach(() => {
    context?.cleanup();
    context = undefined;
  });

  it('supports temporal item CRUD across unassigned, character-owned, and location-owned states', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const itemService = createItemService(context!.db);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
      effectiveTick: 10,
    });
    const aeris = characterService.createCharacter({
      name: 'Aeris Vale',
      summary: 'Scout captain.',
      locationId: coast.id,
      effectiveTick: 15,
    });

    const unassignedItem = itemService.createItem({
      name: '  Salvage Kit  ',
      summary: '  Packed for shoreline repairs.  ',
      quantity: 3,
      ownerCharacterId: null,
      locationId: null,
      effectiveTick: 20,
    });
    const ownedItem = itemService.createItem({
      name: 'Storm Lens',
      summary: 'Polished glass for scouting.',
      quantity: 1,
      ownerCharacterId: aeris.id,
      locationId: null,
      effectiveTick: 20,
    });

    expect(unassignedItem).toMatchObject({
      name: 'Salvage Kit',
      summary: 'Packed for shoreline repairs.',
      quantity: 3,
      ownerCharacterId: null,
      locationId: null,
    });
    expect(ownedItem).toMatchObject({
      ownerCharacterId: aeris.id,
      ownerCharacter: {
        id: aeris.id,
        name: 'Aeris Vale',
      },
      locationId: null,
      location: null,
    });
    expect(itemService.listItems()).toHaveLength(2);
    expect(itemService.getItem({ id: ownedItem.id, asOfTick: 20 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: ownedItem.id,
        ownerCharacterId: aeris.id,
      }),
    });

    const movedItem = itemService.updateItem({
      id: ownedItem.id,
      name: 'Storm Lens',
      summary: 'Stored with coastal charts.',
      quantity: 2,
      ownerCharacterId: null,
      locationId: coast.id,
      effectiveTick: 30,
    });

    expect(movedItem).toMatchObject({
      summary: 'Stored with coastal charts.',
      quantity: 2,
      ownerCharacterId: null,
      ownerCharacter: null,
      locationId: coast.id,
      location: {
        id: coast.id,
        name: 'Glass Coast',
      },
    });

    expect(itemService.getItem({ id: ownedItem.id, asOfTick: 25 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        ownerCharacterId: aeris.id,
        locationId: null,
      }),
    });
    expect(itemService.getItem({ id: ownedItem.id, asOfTick: 35 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        ownerCharacterId: null,
        locationId: coast.id,
      }),
    });

    itemService.deleteItem({ id: unassignedItem.id, effectiveTick: 40 });

    expect(itemService.getItem({ id: unassignedItem.id, asOfTick: 39 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: unassignedItem.id,
      }),
    });
    expect(itemService.getItem({ id: unassignedItem.id, asOfTick: 41 })).toEqual({
      status: 'ended',
      record: null,
    });
    expect(itemService.listItems()).toHaveLength(1);
  });

  it('rejects invalid assignments and missing or inactive referenced entities', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const itemService = createItemService(context!.db);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
      effectiveTick: 10,
    });
    const aeris = characterService.createCharacter({
      name: 'Aeris Vale',
      summary: 'Scout captain.',
      locationId: coast.id,
      effectiveTick: 15,
    });
    const item = itemService.createItem({
      name: 'Storm Lens',
      summary: 'Polished glass for scouting.',
      quantity: 1,
      ownerCharacterId: null,
      locationId: null,
      effectiveTick: 20,
    });

    expect(() =>
      itemService.createItem({
        name: 'Conflicted Relic',
        summary: '',
        quantity: 1,
        ownerCharacterId: aeris.id,
        locationId: coast.id,
        effectiveTick: 20,
      }),
    ).toThrow('Item cannot be assigned to both a character and a location.');

    expect(() =>
      itemService.createItem({
        name: 'Missing Owner',
        summary: '',
        quantity: 1,
        ownerCharacterId: 999_999,
        locationId: null,
        effectiveTick: 20,
      }),
    ).toThrow('Character 999999 does not exist.');

    locationService.deleteLocation({ id: coast.id, effectiveTick: 25 });

    expect(() =>
      itemService.updateItem({
        id: item.id,
        name: 'Missing Place',
        summary: '',
        quantity: 1,
        ownerCharacterId: null,
        locationId: coast.id,
        effectiveTick: 30,
      }),
    ).toThrow(`Location ${coast.id} is not active at tick 30.`);
  });

  it('clears item assignments when the linked character or location ends', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const itemService = createItemService(context!.db);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
      effectiveTick: 10,
    });
    const aeris = characterService.createCharacter({
      name: 'Aeris Vale',
      summary: 'Scout captain.',
      locationId: coast.id,
      effectiveTick: 15,
    });
    const ownedItem = itemService.createItem({
      name: 'Storm Lens',
      summary: 'Polished glass for scouting.',
      quantity: 1,
      ownerCharacterId: aeris.id,
      locationId: null,
      effectiveTick: 20,
    });
    const storedItem = itemService.createItem({
      name: 'Harbor Ledger',
      summary: 'Notes on incoming trade.',
      quantity: 1,
      ownerCharacterId: null,
      locationId: coast.id,
      effectiveTick: 20,
    });

    characterService.deleteCharacter({ id: aeris.id, effectiveTick: 30 });

    expect(itemService.getItem({ id: ownedItem.id, asOfTick: 35 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        ownerCharacterId: null,
        ownerCharacter: null,
        locationId: null,
        location: null,
      }),
    });

    expect(itemService.getItem({ id: storedItem.id, asOfTick: 29 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        locationId: coast.id,
      }),
    });

    locationService.deleteLocation({ id: coast.id, effectiveTick: 35 });

    expect(itemService.getItem({ id: storedItem.id, asOfTick: 40 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        ownerCharacterId: null,
        ownerCharacter: null,
        locationId: null,
        location: null,
      }),
    });
  });
});
