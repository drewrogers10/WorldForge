import { describe, expect, it } from 'vitest';
import { ipcContracts } from './ipc';

describe('ipc contracts', () => {
  it('validates character payloads including linked locations and delete', () => {
    const createCharacterInput = ipcContracts.createCharacter.input.parse({
      name: '  Aeris Vale  ',
      summary: '  Ranger of the glass coast.  ',
      locationId: 2,
    });

    expect(createCharacterInput).toEqual({
      name: 'Aeris Vale',
      summary: 'Ranger of the glass coast.',
      locationId: 2,
    });

    const characterOutput = ipcContracts.getCharacter.output.parse({
      id: 4,
      name: 'Aeris Vale',
      summary: 'Ranger of the glass coast.',
      locationId: 2,
      location: {
        id: 2,
        name: 'Glass Coast',
      },
      createdAt: '2026-03-07T15:10:00.000Z',
      updatedAt: '2026-03-07T16:10:00.000Z',
    });

    expect(characterOutput?.location?.name).toBe('Glass Coast');
    expect(() =>
      ipcContracts.createCharacter.input.parse({
        name: '',
        summary: 'x',
        locationId: -1,
      }),
    ).toThrow();
    expect(() => ipcContracts.deleteCharacter.input.parse({ id: 0 })).toThrow();
    expect(ipcContracts.deleteCharacter.output.parse(undefined)).toBeUndefined();
  });

  it('validates location payloads', () => {
    const createLocationInput = ipcContracts.createLocation.input.parse({
      name: '  The Glass Coast  ',
      summary: '  Wind-cut settlements above a silver sea.  ',
    });

    expect(createLocationInput).toEqual({
      name: 'The Glass Coast',
      summary: 'Wind-cut settlements above a silver sea.',
    });

    expect(ipcContracts.getLocation.output.parse(null)).toBeNull();
    expect(
      ipcContracts.updateLocation.output.parse({
        id: 1,
        name: 'The Glass Coast',
        summary: 'Wind-cut settlements above a silver sea.',
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
      }),
    ).toThrow();
  });
});
