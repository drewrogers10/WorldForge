import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabaseContext } from '@db/test-utils';
import { createCharacterService } from './character-service';
import { createItemService } from './item-service';
import { createLocationService } from './location-service';

type TestDatabaseContext = ReturnType<typeof createTestDatabaseContext>;

describe('entity services', () => {
  let context: TestDatabaseContext | undefined;

  beforeEach(() => {
    context = createTestDatabaseContext();
  });

  afterEach(() => {
    context?.cleanup();
    context = undefined;
  });

  it('supports location CRUD and character CRUD with location links', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);

    const coast = locationService.createLocation({
      name: '  Glass Coast  ',
      summary: '  A bright, storm-cut shoreline.  ',
    });
    const bastion = locationService.createLocation({
      name: 'North Bastion',
      summary: 'Fortress city above the fog line.',
    });

    expect(locationService.listLocations()).toHaveLength(2);
    expect(locationService.getLocation({ id: coast.id })).toMatchObject({
      id: coast.id,
      name: 'Glass Coast',
    });

    const createdCharacter = characterService.createCharacter({
      name: '  Aeris Vale  ',
      summary: '  Scout captain.  ',
      locationId: coast.id,
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

    const loadedCharacter = characterService.getCharacter({ id: createdCharacter.id });

    expect(loadedCharacter).toMatchObject({
      id: createdCharacter.id,
      locationId: coast.id,
      location: {
        id: coast.id,
        name: 'Glass Coast',
      },
    });

    const updatedCharacter = characterService.updateCharacter({
      id: createdCharacter.id,
      name: 'Aeris Vale',
      summary: 'Lead scout of the western watch.',
      locationId: bastion.id,
    });

    expect(updatedCharacter).toMatchObject({
      summary: 'Lead scout of the western watch.',
      locationId: bastion.id,
      location: {
        id: bastion.id,
        name: 'North Bastion',
      },
    });

    characterService.deleteCharacter({ id: createdCharacter.id });
    locationService.deleteLocation({ id: coast.id });
    locationService.deleteLocation({ id: bastion.id });

    expect(characterService.listCharacters()).toEqual([]);
    expect(characterService.getCharacter({ id: createdCharacter.id })).toBeNull();
    expect(locationService.listLocations()).toEqual([]);
  });

  it('rejects characters linked to missing locations and updates locations', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);

    const coast = locationService.createLocation({
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline.',
    });

    const character = characterService.createCharacter({
      name: 'Mira Thorne',
      summary: 'Harbor scribe.',
      locationId: null,
    });

    expect(() =>
      characterService.createCharacter({
        name: 'Broken Link',
        summary: '',
        locationId: 999_999,
      }),
    ).toThrow('Location 999999 does not exist.');

    expect(() =>
      characterService.updateCharacter({
        id: character.id,
        name: 'Mira Thorne',
        summary: 'Harbor scribe.',
        locationId: 999_999,
      }),
    ).toThrow('Location 999999 does not exist.');

    const updatedLocation = locationService.updateLocation({
      id: coast.id,
      name: 'Glass Coast',
      summary: 'A bright, storm-cut shoreline with rebuilt harbors.',
    });

    expect(updatedLocation.summary).toContain('rebuilt harbors');
    expect(locationService.listLocations()[0]?.summary).toContain('rebuilt harbors');
  });

  it('clears character and item location links when deleting a place', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const itemService = createItemService(context!.db);

    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A busy port district.',
    });
    const scribe = characterService.createCharacter({
      name: 'Caro Fen',
      summary: 'Port registrar.',
      locationId: harbor.id,
    });
    const ledger = itemService.createItem({
      name: 'Harbor Ledger',
      summary: 'Notes on incoming trade.',
      quantity: 1,
      ownerCharacterId: null,
      locationId: harbor.id,
    });

    locationService.deleteLocation({ id: harbor.id });

    expect(characterService.getCharacter({ id: scribe.id })).toMatchObject({
      locationId: null,
      location: null,
    });
    expect(itemService.getItem({ id: ledger.id })).toMatchObject({
      locationId: null,
      location: null,
    });
  });
});
