import { create } from 'zustand';

type UiState = {
  errorMessage: string | null;
  isRefreshing: boolean;
  setErrorMessage: (msg: string | null) => void;
  setIsRefreshing: (val: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  errorMessage: null,
  isRefreshing: false,
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setIsRefreshing: (val) => set({ isRefreshing: val }),
}));
