import type { CreateCharacterInput } from '@shared/character';
import type { CreateItemInput } from '@shared/item';
import type { CreateLocationInput } from '@shared/location';

export type WorkspaceView =
  | 'overview'
  | 'people'
  | 'places'
  | 'maps'
  | 'powers'
  | 'events'
  | 'items'
  | 'organizations';
export type CharacterFormState = CreateCharacterInput;
export type ItemFormState = CreateItemInput;
export type LocationFormState = CreateLocationInput;

export type WorkspaceOption = {
  description: string;
  group: 'Home' | 'World' | 'Timeline' | 'Reference';
  id: WorkspaceView;
  label: string;
};

export const workspaceOptions: WorkspaceOption[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Review coverage, recent changes, and where to work next.',
    group: 'Home',
  },
  {
    id: 'people',
    label: 'People',
    description: 'Track characters, connections, and current locations.',
    group: 'World',
  },
  {
    id: 'places',
    label: 'Places',
    description: 'Organize regions, settlements, and notable locations.',
    group: 'World',
  },
  {
    id: 'maps',
    label: 'Maps',
    description: 'Create maps, image-backed references, and linked place markers.',
    group: 'World',
  },
  {
    id: 'items',
    label: 'Items',
    description: 'Track items, ownership, and where each item is stored.',
    group: 'World',
  },
  {
    id: 'powers',
    label: 'Powers',
    description: 'Define magic systems, abilities, and special rules.',
    group: 'Reference',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Track events on the timeline and where they happened.',
    group: 'Timeline',
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Track factions, institutions, and who they affect.',
    group: 'Reference',
  },
];

export const workspaceGroups: Array<WorkspaceOption['group']> = [
  'Home',
  'World',
  'Timeline',
  'Reference',
];

export const emptyCharacterForm = (
  effectiveTick = 0,
): CharacterFormState => ({
  name: '',
  summary: '',
  locationId: null,
  effectiveTick,
});

export const emptyLocationForm = (
  effectiveTick = 0,
): LocationFormState => ({
  name: '',
  summary: '',
  effectiveTick,
});

export const emptyItemForm = (
  effectiveTick = 0,
): ItemFormState => ({
  name: '',
  summary: '',
  quantity: 1,
  ownerCharacterId: null,
  locationId: null,
  effectiveTick,
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
