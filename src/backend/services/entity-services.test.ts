import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestStorageContext } from '@backend/storage/test-utils';
import { createCharacterService } from './character-service';
import { createItemService } from './item-service';
import { createLocationService } from './location-service';

type TestDatabaseContext = ReturnType<typeof createTestStorageContext>;

describe('entity services', () => {
  let context: TestDatabaseContext | undefined;

  beforeEach(() => {
    context = createTestStorageContext();
  });

  afterEach(() => {
    context?.cleanup();
    context = undefined;
  });

  it('supports temporal location CRUD and character CRUD with location links', () => {
    const locationService = createLocationService(context!.db, context!.storageCoordinator);
    const characterService = createCharacterService(context!.db, context!.storageCoordinator);

    const coast = locationService.createLocation({
      name: '  Glass Coast  ',
      summary: '  A bright, storm-cut shoreline.  ',
      effectiveTick: 10,
    });
    const bastion = locationService.createLocation({
      name: 'North Bastion',
      summary: 'Fortress city above the fog line.',
      effectiveTick: 20,
    });

    expect(locationService.listLocations()).toHaveLength(2);
    expect(locationService.getLocation({ id: coast.id })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: coast.id,
        name: 'Glass Coast',
      }),
    });

    const createdCharacter = characterService.createCharacter({
      name: '  Aeris Vale  ',
      summary: '  Scout captain.  ',
      locationId: coast.id,
      effectiveTick: 25,
    });

    expect(createdCharacter).toMatchObject({
      name: 'Aeris Vale',
      summary: 'Scout captain.',
      locationId: coast.id,
      location: {
        id: coast.id,
        name: 'Glass Coast',
      },
    });

    const loadedAtCreation = characterService.getCharacter({
      id: createdCharacter.id,
      asOfTick: 25,
    });

    expect(loadedAtCreation).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: createdCharacter.id,
        locationId: coast.id,
      }),
    });

    const updatedCharacter = characterService.updateCharacter({
      id: createdCharacter.id,
      name: 'Aeris Vale',
      summary: 'Lead scout of the western watch.',
      locationId: bastion.id,
      effectiveTick: 40,
    });

    expect(updatedCharacter).toMatchObject({
      summary: 'Lead scout of the western watch.',
      locationId: bastion.id,
      location: {
        id: bastion.id,
        name: 'North Bastion',
      },
    });

    expect(
      characterService.getCharacter({ id: createdCharacter.id, asOfTick: 30 }),
    ).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        locationId: coast.id,
      }),
    });
    expect(
      characterService.getCharacter({ id: createdCharacter.id, asOfTick: 45 }),
    ).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        locationId: bastion.id,
      }),
    });

    characterService.deleteCharacter({ id: createdCharacter.id, effectiveTick: 60 });
    locationService.deleteLocation({ id: coast.id, effectiveTick: 70 });
    locationService.deleteLocation({ id: bastion.id, effectiveTick: 80 });

    expect(characterService.listCharacters()).toEqual([]);
    expect(characterService.getCharacter({ id: createdCharacter.id, asOfTick: 50 })).toMatchObject(
      {
        status: 'active',
        record: expect.objectContaining({
          id: createdCharacter.id,
        }),
      },
    );
    expect(characterService.getCharacter({ id: createdCharacter.id, asOfTick: 65 })).toEqual({
      status: 'ended',
      record: null,
    });
    expect(locationService.listLocations()).toEqual([]);
  });

  it('rejects characters linked to missing or inactive locations and updates locations', () => {
    const locationService = createLocationService(context!.db, context!.storageCoordinator);
    const characterService = createCharacterService(context!.db, context!.storageCoordinator);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
      effectiveTick: 10,
    });

    const character = characterService.createCharacter({
      name: 'Mira Thorne',
      summary: 'Harbor scribe.',
      locationId: null,
      effectiveTick: 15,
    });

    expect(() =>
      characterService.createCharacter({
        name: 'Broken Link',
        summary: '',
        locationId: 999_999,
        effectiveTick: 20,
      }),
    ).toThrow('Location 999999 does not exist.');

    locationService.deleteLocation({ id: coast.id, effectiveTick: 30 });

    expect(() =>
      characterService.updateCharacter({
        id: character.id,
        name: 'Mira Thorne',
        summary: 'Harbor scribe.',
        locationId: coast.id,
        effectiveTick: 35,
      }),
    ).toThrow(`Location ${coast.id} is not active at tick 35.`);

    expect(() =>
      characterService.updateCharacter({
        id: character.id,
        name: 'Mira Thorne',
        summary: 'Harbor scribe.',
        locationId: 999_999,
        effectiveTick: 35,
      }),
    ).toThrow('Location 999999 does not exist.');

    const updatedLocation = locationService.createLocation({
      name: 'Renewed Coast',
      summary: 'A rebuilt harbor frontier.',
      effectiveTick: 40,
    });

    expect(updatedLocation.summary).toContain('rebuilt harbor frontier');
    expect(locationService.listLocations()[0]?.summary).toContain('rebuilt harbor frontier');
  });

  it('clears character and item location links when ending a place', () => {
    const locationService = createLocationService(context!.db, context!.storageCoordinator);
    const characterService = createCharacterService(context!.db, context!.storageCoordinator);
    const itemService = createItemService(context!.db, context!.storageCoordinator);

    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A busy port district.',
      effectiveTick: 10,
    });
    const scribe = characterService.createCharacter({
      name: 'Caro Fen',
      summary: 'Port registrar.',
      locationId: harbor.id,
      effectiveTick: 15,
    });
    const ledger = itemService.createItem({
      name: 'Harbor Ledger',
      summary: 'Notes on incoming trade.',
      quantity: 1,
      ownerCharacterId: null,
      locationId: harbor.id,
      effectiveTick: 15,
    });

    locationService.deleteLocation({ id: harbor.id, effectiveTick: 25 });

    expect(characterService.getCharacter({ id: scribe.id, asOfTick: 24 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        locationId: harbor.id,
      }),
    });
    expect(characterService.getCharacter({ id: scribe.id, asOfTick: 30 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        locationId: null,
        location: null,
      }),
    });
    expect(itemService.getItem({ id: ledger.id, asOfTick: 30 })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        locationId: null,
        location: null,
      }),
    });
  });
});
