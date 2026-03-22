import type { Character } from '@shared/character';
import type { Event } from '@shared/event';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import type { MapRecord } from '@shared/map';
import { workspaceOptions, type WorkspaceView } from './forms';

export type SidebarImplementedView = Extract<
  WorkspaceView,
  'people' | 'places' | 'maps' | 'items' | 'events'
>;
export type SidebarPlaceholderView = Extract<WorkspaceView, 'powers' | 'organizations'>;
export type SidebarFolderId = SidebarImplementedView | SidebarPlaceholderView;
export type SidebarEntityKind = 'character' | 'location' | 'map' | 'item' | 'event';
export type SidebarFolderExpansionState = Partial<Record<SidebarFolderId, boolean>>;

type SidebarHomeConfig = {
  kind: 'home';
  id: 'overview';
  label: string;
};

type SidebarImplementedFolderConfig = {
  kind: 'folder';
  id: SidebarImplementedView;
  label: string;
};

type SidebarDisabledFolderConfig = {
  kind: 'disabled-folder';
  id: SidebarPlaceholderView;
  label: string;
};

type SidebarConfig =
  | SidebarHomeConfig
  | SidebarImplementedFolderConfig
  | SidebarDisabledFolderConfig;

export type SidebarSelectionState = {
  selectedCharacterId: number | null;
  selectedEventId: number | null;
  selectedItemId: number | null;
  selectedLocationId: number | null;
  selectedMapId: number | null;
};

export type SidebarDataSnapshot = {
  characters: Character[];
  events: Event[];
  items: Item[];
  locations: Location[];
  maps: MapRecord[];
};

export type SidebarEntitySelection = {
  kind: SidebarEntityKind;
  id: number;
};

export type SidebarTreeItemNode = {
  type: 'item';
  id: string;
  itemKind: 'home' | 'record';
  label: string;
  route: WorkspaceView;
  entitySelection: SidebarEntitySelection | null;
  isCurrent: boolean;
};

export type SidebarTreeFolderNode = {
  type: 'folder';
  id: SidebarImplementedView;
  label: string;
  route: SidebarImplementedView;
  count: number;
  isCurrent: boolean;
  isExpanded: boolean;
  children: SidebarTreeItemNode[];
};

export type SidebarTreeDisabledFolderNode = {
  type: 'disabled-folder';
  id: SidebarPlaceholderView;
  label: string;
};

export type SidebarTreeNode =
  | SidebarTreeItemNode
  | SidebarTreeFolderNode
  | SidebarTreeDisabledFolderNode;

export type SidebarSelectableNode = SidebarTreeItemNode | SidebarTreeFolderNode;

export type SidebarSelectionIntent = {
  route: WorkspaceView;
  entitySelection: SidebarEntitySelection | null;
};

function getWorkspaceLabel(view: WorkspaceView): string {
  return workspaceOptions.find((workspace) => workspace.id === view)?.label ?? view;
}

const sidebarTreeConfig: SidebarConfig[] = [
  {
    kind: 'home',
    id: 'overview',
    label: getWorkspaceLabel('overview'),
  },
  {
    kind: 'folder',
    id: 'people',
    label: getWorkspaceLabel('people'),
  },
  {
    kind: 'folder',
    id: 'places',
    label: getWorkspaceLabel('places'),
  },
  {
    kind: 'folder',
    id: 'maps',
    label: getWorkspaceLabel('maps'),
  },
  {
    kind: 'folder',
    id: 'items',
    label: getWorkspaceLabel('items'),
  },
  {
    kind: 'folder',
    id: 'events',
    label: getWorkspaceLabel('events'),
  },
  {
    kind: 'disabled-folder',
    id: 'powers',
    label: getWorkspaceLabel('powers'),
  },
  {
    kind: 'disabled-folder',
    id: 'organizations',
    label: getWorkspaceLabel('organizations'),
  },
];

function compareAlphabetically(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function buildCharacterNodes(
  characters: Character[],
  activeView: WorkspaceView,
  selectedCharacterId: number | null,
): SidebarTreeItemNode[] {
  return [...characters]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((character) => ({
      type: 'item',
      id: `people:${character.id}`,
      itemKind: 'record',
      label: character.name,
      route: 'people',
      entitySelection: { kind: 'character', id: character.id },
      isCurrent: activeView === 'people' && selectedCharacterId === character.id,
    }));
}

function buildLocationNodes(
  locations: Location[],
  activeView: WorkspaceView,
  selectedLocationId: number | null,
): SidebarTreeItemNode[] {
  return [...locations]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((location) => ({
      type: 'item',
      id: `places:${location.id}`,
      itemKind: 'record',
      label: location.name,
      route: 'places',
      entitySelection: { kind: 'location', id: location.id },
      isCurrent: activeView === 'places' && selectedLocationId === location.id,
    }));
}

function buildMapNodes(
  maps: MapRecord[],
  activeView: WorkspaceView,
  selectedMapId: number | null,
): SidebarTreeItemNode[] {
  return [...maps]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((map) => ({
      type: 'item',
      id: `maps:${map.id}`,
      itemKind: 'record',
      label: map.name,
      route: 'maps',
      entitySelection: { kind: 'map', id: map.id },
      isCurrent: activeView === 'maps' && selectedMapId === map.id,
    }));
}

function buildItemNodes(
  items: Item[],
  activeView: WorkspaceView,
  selectedItemId: number | null,
): SidebarTreeItemNode[] {
  return [...items]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((item) => ({
      type: 'item',
      id: `items:${item.id}`,
      itemKind: 'record',
      label: item.name,
      route: 'items',
      entitySelection: { kind: 'item', id: item.id },
      isCurrent: activeView === 'items' && selectedItemId === item.id,
    }));
}

function buildEventNodes(
  events: Event[],
  activeView: WorkspaceView,
  selectedEventId: number | null,
): SidebarTreeItemNode[] {
  return [...events]
    .sort((left, right) => right.startTick - left.startTick || right.id - left.id)
    .map((event) => ({
      type: 'item',
      id: `events:${event.id}`,
      itemKind: 'record',
      label: event.title,
      route: 'events',
      entitySelection: { kind: 'event', id: event.id },
      isCurrent: activeView === 'events' && selectedEventId === event.id,
    }));
}

function buildFolderChildren(
  folderId: SidebarImplementedView,
  data: SidebarDataSnapshot,
  activeView: WorkspaceView,
  selectionState: SidebarSelectionState,
): SidebarTreeItemNode[] {
  switch (folderId) {
    case 'people':
      return buildCharacterNodes(data.characters, activeView, selectionState.selectedCharacterId);
    case 'places':
      return buildLocationNodes(data.locations, activeView, selectionState.selectedLocationId);
    case 'maps':
      return buildMapNodes(data.maps, activeView, selectionState.selectedMapId);
    case 'items':
      return buildItemNodes(data.items, activeView, selectionState.selectedItemId);
    case 'events':
      return buildEventNodes(data.events, activeView, selectionState.selectedEventId);
  }
}

export function isSidebarFolderExpanded(
  folderId: SidebarFolderId,
  activeView: WorkspaceView,
  expansionState: SidebarFolderExpansionState,
): boolean {
  const manualValue = expansionState[folderId];

  if (manualValue !== undefined) {
    return manualValue;
  }

  return activeView === folderId;
}

export function buildSidebarTreeNodes(input: {
  activeView: WorkspaceView;
  data: SidebarDataSnapshot;
  expansionState: SidebarFolderExpansionState;
  selectionState: SidebarSelectionState;
}): SidebarTreeNode[] {
  const { activeView, data, expansionState, selectionState } = input;

  return sidebarTreeConfig.map((config): SidebarTreeNode => {
    if (config.kind === 'home') {
      return {
        type: 'item',
        id: config.id,
        itemKind: 'home',
        label: config.label,
        route: config.id,
        entitySelection: null,
        isCurrent: activeView === config.id,
      };
    }

    if (config.kind === 'disabled-folder') {
      return {
        type: 'disabled-folder',
        id: config.id,
        label: config.label,
      };
    }

    const children = buildFolderChildren(config.id, data, activeView, selectionState);

    return {
      type: 'folder',
      id: config.id,
      label: config.label,
      route: config.id,
      count: children.length,
      isCurrent: activeView === config.id,
      isExpanded: isSidebarFolderExpanded(config.id, activeView, expansionState),
      children,
    };
  });
}

export function resolveSidebarSelection(
  node: SidebarTreeNode,
): SidebarSelectionIntent | null {
  if (node.type === 'disabled-folder') {
    return null;
  }

  if (node.type === 'folder') {
    return {
      route: node.route,
      entitySelection: null,
    };
  }

  return {
    route: node.route,
    entitySelection: node.entitySelection,
  };
}
