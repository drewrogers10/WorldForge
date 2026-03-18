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
});
