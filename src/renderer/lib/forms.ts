import type { CreateCharacterInput } from '@shared/character';
import type { CreateItemInput } from '@shared/item';
import type { CreateLocationInput } from '@shared/location';

export type WorkspaceView =
  | 'overview'
  | 'people'
  | 'places'
  | 'powers'
  | 'events'
  | 'items'
  | 'organizations';
export type CharacterFormState = CreateCharacterInput;
export type ItemFormState = CreateItemInput;
export type LocationFormState = CreateLocationInput;

export const workspaceOptions: Array<{ id: WorkspaceView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'places', label: 'Places' },
  { id: 'powers', label: 'Powers' },
  { id: 'events', label: 'Events' },
  { id: 'items', label: 'Items' },
  { id: 'organizations', label: 'Organizations' },
];

export const emptyCharacterForm = (): CharacterFormState => ({
  name: '',
  summary: '',
  locationId: null,
});

export const emptyLocationForm = (): LocationFormState => ({
  name: '',
  summary: '',
});

export const emptyItemForm = (): ItemFormState => ({
  name: '',
  summary: '',
  quantity: 1,
  ownerCharacterId: null,
  locationId: null,
});

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function toSelectValue(value: number | null): string {
  return value === null ? '' : String(value);
}

export function toNullableId(value: string): number | null {
  return value ? Number(value) : null;
}
