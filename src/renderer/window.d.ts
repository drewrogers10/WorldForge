import type { WorldForgeApi } from '@shared/api';

declare global {
  interface Window {
    worldForge: WorldForgeApi;
  }
}

export {};
