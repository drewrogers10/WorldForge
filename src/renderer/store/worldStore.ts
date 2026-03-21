import { create } from 'zustand';
import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import type { Item } from '@shared/item';

type OverviewDelta = {
  gaps: number;
  items: number;
  people: number;
  places: number;
};

type WorldState = {
  characters: Character[];
  locations: Location[];
  items: Item[];
  isLoading: boolean;
  overviewDelta: OverviewDelta;
  loadWorldData: (tick: number) => Promise<void>;
};

function countCoverageGaps(characters: Character[], items: Item[]): number {
  const unplacedCharacters = characters.filter((character) => character.locationId === null);
  const unassignedItems = items.filter(
    (item) => item.ownerCharacterId === null && item.locationId === null,
  );
  return unplacedCharacters.length + unassignedItems.length;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  characters: [],
  locations: [],
  items: [],
  isLoading: false,
  overviewDelta: { gaps: 0, items: 0, people: 0, places: 0 },
  loadWorldData: async (tick: number) => {
    set({ isLoading: true });
    
    const previousCharacters = get().characters;
    const previousLocations = get().locations;
    const previousItems = get().items;

    try {
      const [characters, locations, items] = await Promise.all([
        window.worldForge.listCharacters({ asOfTick: tick }),
        window.worldForge.listLocations({ asOfTick: tick }),
        window.worldForge.listItems({ asOfTick: tick })
      ]);
      
      const delta = {
        people: characters.length - previousCharacters.length,
        places: locations.length - previousLocations.length,
        items: items.length - previousItems.length,
        gaps: countCoverageGaps(characters, items) - countCoverageGaps(previousCharacters, previousItems),
      };

      set({ characters, locations, items, overviewDelta: delta, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error(error);
    }
  }
}));
