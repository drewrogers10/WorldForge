import type { CreateCharacterInput } from '@shared/character';
import type { CreateLocationInput } from '@shared/location';

export type WorkspaceView = 'characters' | 'locations';
export type CharacterFormState = CreateCharacterInput;
export type LocationFormState = CreateLocationInput;

export const emptyCharacterForm = (): CharacterFormState => ({
  name: '',
  summary: '',
  locationId: null,
});

export const emptyLocationForm = (): LocationFormState => ({
  name: '',
  summary: '',
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
