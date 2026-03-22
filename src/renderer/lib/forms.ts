import type { CreateCharacterInput } from '@shared/character';
import type { CreateItemInput } from '@shared/item';
import type { CreateLocationInput } from '@shared/location';

export type WorkspaceView =
  | 'overview'
  | 'world-elements'
  | 'theories'
  | 'writing'
  | 'people'
  | 'places'
  | 'maps'
  | 'powers'
  | 'events'
  | 'items'
  | 'organizations'
  | 'manuscript'
  | 'plot'
  | 'writing-ideas';
export type CharacterFormState = CreateCharacterInput;
export type ItemFormState = CreateItemInput;
export type LocationFormState = CreateLocationInput;

export type WorkspaceOption = {
  description: string;
  group: 'Home' | 'Sections' | 'World Elements' | 'Writing';
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
    id: 'world-elements',
    label: 'World Elements',
    description: 'Browse canon-facing setting material that belongs inside the story world.',
    group: 'Sections',
  },
  {
    id: 'theories',
    label: 'Theories',
    description: 'Capture explanatory notes that inform the story without becoming manuscript text.',
    group: 'Sections',
  },
  {
    id: 'writing',
    label: 'Writing',
    description: 'Organize manuscript drafts, plot planning, and reusable writing ideas.',
    group: 'Sections',
  },
  {
    id: 'people',
    label: 'People',
    description: 'Track characters, connections, and current locations.',
    group: 'World Elements',
  },
  {
    id: 'places',
    label: 'Places',
    description: 'Organize regions, settlements, and notable locations.',
    group: 'World Elements',
  },
  {
    id: 'maps',
    label: 'Maps',
    description: 'Create maps, image-backed references, and linked place markers.',
    group: 'World Elements',
  },
  {
    id: 'items',
    label: 'Items',
    description: 'Track items, ownership, and where each item is stored.',
    group: 'World Elements',
  },
  {
    id: 'powers',
    label: 'Powers',
    description: 'Track active power systems, disciplines, and forces that operate inside the setting.',
    group: 'World Elements',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Track events on the timeline and where they happened.',
    group: 'World Elements',
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Track factions, institutions, and who they affect.',
    group: 'World Elements',
  },
  {
    id: 'manuscript',
    label: 'Manuscript',
    description: 'Write canon chapters, side stories, POV variants, and short fiction set in the world.',
    group: 'Writing',
  },
  {
    id: 'plot',
    label: 'Plot',
    description: 'Plan broad story beats, turning points, and major character arcs.',
    group: 'Writing',
  },
  {
    id: 'writing-ideas',
    label: 'Writing Ideas',
    description: 'Save reusable plot patterns, motifs, prompts, and other craft ideas.',
    group: 'Writing',
  },
];

export const workspaceGroups: Array<WorkspaceOption['group']> = [
  'Home',
  'Sections',
  'World Elements',
  'Writing',
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

export function areFormStatesEqual<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
