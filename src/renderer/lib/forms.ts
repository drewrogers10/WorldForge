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

export type WorkspaceOption = {
  description: string;
  group: 'Workspace' | 'Atlas' | 'Lore';
  id: WorkspaceView;
  label: string;
};

export const workspaceOptions: WorkspaceOption[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Review world coverage, recent additions, and where to work next.',
    group: 'Workspace',
  },
  {
    id: 'people',
    label: 'People',
    description: 'Track your cast, connections, and where each person belongs.',
    group: 'Atlas',
  },
  {
    id: 'places',
    label: 'Places',
    description: 'Organize regions, settlements, and the anchors of your setting.',
    group: 'Atlas',
  },
  {
    id: 'items',
    label: 'Items',
    description: 'Manage artifacts, gear, and loose assets across the world.',
    group: 'Atlas',
  },
  {
    id: 'powers',
    label: 'Powers',
    description: 'Outline systems of magic, abilities, and exceptional forces.',
    group: 'Lore',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Map timelines, turning points, and the history of the world.',
    group: 'Lore',
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Catalog factions, institutions, and shared agendas.',
    group: 'Lore',
  },
];

export const workspaceGroups: Array<WorkspaceOption['group']> = [
  'Workspace',
  'Atlas',
  'Lore',
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
