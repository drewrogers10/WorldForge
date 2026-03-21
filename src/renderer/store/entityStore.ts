import { create } from 'zustand';

type EntityState = {
  selectedCharacterId: number | null;
  selectedLocationId: number | null;
  selectedItemId: number | null;

  setSelectedCharacterId: (id: number | null) => void;
  setSelectedLocationId: (id: number | null) => void;
  setSelectedItemId: (id: number | null) => void;
};

export const useEntityStore = create<EntityState>((set) => ({
  selectedCharacterId: null,
  selectedLocationId: null,
  selectedItemId: null,

  setSelectedCharacterId: (id) => set({ selectedCharacterId: id }),
  setSelectedLocationId: (id) => set({ selectedLocationId: id }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
}));
