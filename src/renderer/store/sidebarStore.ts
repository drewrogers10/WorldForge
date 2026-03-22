import { create } from 'zustand';
import type { Character } from '@shared/character';
import type { Event } from '@shared/event';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import type { MapRecord } from '@shared/map';

type SidebarState = {
  characters: Character[];
  events: Event[];
  isLoading: boolean;
  items: Item[];
  loadSidebarData: (tick: number) => Promise<void>;
  locations: Location[];
  maps: MapRecord[];
};

export const useSidebarStore = create<SidebarState>((set) => ({
  characters: [],
  events: [],
  isLoading: false,
  items: [],
  locations: [],
  maps: [],
  loadSidebarData: async (tick: number) => {
    set({ isLoading: true });

    try {
      const [characters, locations, items, maps, events] = await Promise.all([
        window.worldForge.listCharacters({ asOfTick: tick }),
        window.worldForge.listLocations({ asOfTick: tick }),
        window.worldForge.listItems({ asOfTick: tick }),
        window.worldForge.listMaps(),
        window.worldForge.listEvents(),
      ]);

      set({
        characters,
        events,
        isLoading: false,
        items,
        locations,
        maps,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error(error);
    }
  },
}));
