import { create } from 'zustand';

type EntityState = {
  selectedCharacterId: number | null;
  selectedEventId: number | null;
  selectedLocationId: number | null;
  selectedItemId: number | null;
  selectedMapId: number | null;

  setSelectedCharacterId: (id: number | null) => void;
  setSelectedEventId: (id: number | null) => void;
  setSelectedLocationId: (id: number | null) => void;
  setSelectedItemId: (id: number | null) => void;
  setSelectedMapId: (id: number | null) => void;
};

export const useEntityStore = create<EntityState>((set) => ({
  selectedCharacterId: null,
  selectedEventId: null,
  selectedLocationId: null,
  selectedItemId: null,
  selectedMapId: null,

  setSelectedCharacterId: (id) => set({ selectedCharacterId: id }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  setSelectedLocationId: (id) => set({ selectedLocationId: id }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setSelectedMapId: (id) => set({ selectedMapId: id }),
}));
