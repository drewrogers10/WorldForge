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

  it('supports item CRUD across unassigned, character-owned, and location-owned states', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const itemService = createItemService(context!.db);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
    });
    const aeris = characterService.createCharacter({
      name: 'Aeris Vale',
      summary: 'Scout captain.',
      locationId: coast.id,
    });

    const unassignedItem = itemService.createItem({
      name: '  Salvage Kit  ',
      summary: '  Packed for shoreline repairs.  ',
      quantity: 3,
      ownerCharacterId: null,
      locationId: null,
    });
    const ownedItem = itemService.createItem({
      name: 'Storm Lens',
      summary: 'Polished glass for scouting.',
      quantity: 1,
      ownerCharacterId: aeris.id,
      locationId: null,
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
      locationId: null,
    });
    expect(itemService.listItems()).toHaveLength(2);
    expect(itemService.getItem({ id: ownedItem.id })).toMatchObject({
      id: ownedItem.id,
      ownerCharacterId: aeris.id,
    });

    const movedItem = itemService.updateItem({
      id: ownedItem.id,
      name: 'Storm Lens',
      summary: 'Stored with coastal charts.',
      quantity: 2,
      ownerCharacterId: null,
      locationId: coast.id,
    });

    expect(movedItem).toMatchObject({
      summary: 'Stored with coastal charts.',
      quantity: 2,
      ownerCharacterId: null,
      locationId: coast.id,
    });

    itemService.deleteItem({ id: unassignedItem.id });

    expect(itemService.getItem({ id: unassignedItem.id })).toBeNull();
    expect(itemService.listItems()).toHaveLength(1);
  });

  it('rejects invalid assignments and missing referenced entities', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const itemService = createItemService(context!.db);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
    });
    const aeris = characterService.createCharacter({
      name: 'Aeris Vale',
      summary: 'Scout captain.',
      locationId: coast.id,
    });
    const item = itemService.createItem({
      name: 'Storm Lens',
      summary: 'Polished glass for scouting.',
      quantity: 1,
      ownerCharacterId: null,
      locationId: null,
    });

    expect(() =>
      itemService.createItem({
        name: 'Conflicted Relic',
        summary: '',
        quantity: 1,
        ownerCharacterId: aeris.id,
        locationId: coast.id,
      }),
    ).toThrow('Item cannot be assigned to both a character and a location.');

    expect(() =>
      itemService.createItem({
        name: 'Missing Owner',
        summary: '',
        quantity: 1,
        ownerCharacterId: 999_999,
        locationId: null,
      }),
    ).toThrow('Character 999999 does not exist.');

    expect(() =>
      itemService.updateItem({
        id: item.id,
        name: 'Missing Place',
        summary: '',
        quantity: 1,
        ownerCharacterId: null,
        locationId: 999_999,
      }),
    ).toThrow('Location 999999 does not exist.');
  });

  it('clears item assignments when the linked character or location is deleted', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const itemService = createItemService(context!.db);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
    });
    const aeris = characterService.createCharacter({
      name: 'Aeris Vale',
      summary: 'Scout captain.',
      locationId: coast.id,
    });
    const ownedItem = itemService.createItem({
      name: 'Storm Lens',
      summary: 'Polished glass for scouting.',
      quantity: 1,
      ownerCharacterId: aeris.id,
      locationId: null,
    });
    const storedItem = itemService.createItem({
      name: 'Harbor Ledger',
      summary: 'Notes on incoming trade.',
      quantity: 1,
      ownerCharacterId: null,
      locationId: coast.id,
    });

    characterService.deleteCharacter({ id: aeris.id });

    expect(itemService.getItem({ id: ownedItem.id })).toMatchObject({
      ownerCharacterId: null,
      locationId: null,
    });

    const refreshedStoredItem = itemService.getItem({ id: storedItem.id });

    expect(refreshedStoredItem?.locationId).toBe(coast.id);

    context!.client.prepare('DELETE FROM locations WHERE id = ?').run(coast.id);

    expect(itemService.getItem({ id: storedItem.id })).toMatchObject({
      ownerCharacterId: null,
      locationId: null,
    });
  });
});
