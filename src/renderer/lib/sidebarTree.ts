import type { Character } from '@shared/character';
import type { Event } from '@shared/event';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import type { MapRecord } from '@shared/map';
import { workspaceOptions, type WorkspaceView } from './forms';

export type SidebarSectionView = Extract<WorkspaceView, 'world-elements' | 'theories' | 'writing'>;
export type SidebarSectionWithChildrenView = Extract<
  SidebarSectionView,
  'world-elements' | 'writing'
>;
export type SidebarRecordWorkspaceView = Extract<
  WorkspaceView,
  'people' | 'places' | 'maps' | 'items' | 'events'
>;
export type SidebarLeafWorkspaceView = Extract<
  WorkspaceView,
  'powers' | 'organizations' | 'manuscript' | 'plot' | 'writing-ideas'
>;
export type SidebarWorkspaceView = SidebarRecordWorkspaceView | SidebarLeafWorkspaceView;
export type SidebarExpandableId = SidebarSectionWithChildrenView | SidebarRecordWorkspaceView;
export type SidebarEntityKind = 'character' | 'location' | 'map' | 'item' | 'event';
export type SidebarExpansionState = Partial<Record<SidebarExpandableId, boolean>>;

type SidebarHomeConfig = {
  kind: 'home';
  id: 'overview';
  label: string;
};

type SidebarSectionConfig = {
  childViews: SidebarWorkspaceView[];
  id: SidebarSectionView;
  kind: 'section';
  label: string;
};

type SidebarConfig = SidebarHomeConfig | SidebarSectionConfig;

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

type SidebarSelectableBaseNode = {
  entitySelection: SidebarEntitySelection | null;
  isCurrent: boolean;
  label: string;
  route: WorkspaceView;
};

export type SidebarHomeNode = SidebarSelectableBaseNode & {
  id: 'overview';
  type: 'home';
};

export type SidebarRecordNode = SidebarSelectableBaseNode & {
  id: string;
  route: SidebarRecordWorkspaceView;
  type: 'record';
};

export type SidebarWorkspaceNode = SidebarSelectableBaseNode & {
  children: SidebarRecordNode[];
  count: number | null;
  id: SidebarWorkspaceView;
  isExpandable: boolean;
  isExpanded: boolean;
  route: SidebarWorkspaceView;
  type: 'workspace';
};

export type SidebarSectionNode = SidebarSelectableBaseNode & {
  children: SidebarWorkspaceNode[];
  count: number | null;
  id: SidebarSectionView;
  isExpandable: boolean;
  isExpanded: boolean;
  route: SidebarSectionView;
  type: 'section';
};

export type SidebarTreeNode = SidebarHomeNode | SidebarSectionNode;
export type SidebarSelectableNode =
  | SidebarHomeNode
  | SidebarSectionNode
  | SidebarWorkspaceNode
  | SidebarRecordNode;

export type SidebarSelectionIntent = {
  entitySelection: SidebarEntitySelection | null;
  route: WorkspaceView;
};

const sidebarSections: Record<SidebarSectionView, WorkspaceView[]> = {
  'world-elements': [
    'world-elements',
    'people',
    'places',
    'maps',
    'items',
    'events',
    'powers',
    'organizations',
  ],
  theories: ['theories'],
  writing: ['writing', 'manuscript', 'plot', 'writing-ideas'],
};

const sidebarTreeConfig: SidebarConfig[] = [
  {
    kind: 'home',
    id: 'overview',
    label: getWorkspaceLabel('overview'),
  },
  {
    kind: 'section',
    id: 'world-elements',
    label: getWorkspaceLabel('world-elements'),
    childViews: [
      'people',
      'places',
      'maps',
      'items',
      'events',
      'powers',
      'organizations',
    ],
  },
  {
    kind: 'section',
    id: 'theories',
    label: getWorkspaceLabel('theories'),
    childViews: [],
  },
  {
    kind: 'section',
    id: 'writing',
    label: getWorkspaceLabel('writing'),
    childViews: ['manuscript', 'plot', 'writing-ideas'],
  },
];

function getWorkspaceLabel(view: WorkspaceView): string {
  return workspaceOptions.find((workspace) => workspace.id === view)?.label ?? view;
}

function compareAlphabetically(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function isRecordWorkspaceView(view: SidebarWorkspaceView): view is SidebarRecordWorkspaceView {
  return (
    view === 'people' ||
    view === 'places' ||
    view === 'maps' ||
    view === 'items' ||
    view === 'events'
  );
}

function isViewInSection(sectionId: SidebarSectionView, activeView: WorkspaceView): boolean {
  return sidebarSections[sectionId].includes(activeView);
}

function buildCharacterNodes(
  characters: Character[],
  activeView: WorkspaceView,
  selectedCharacterId: number | null,
): SidebarRecordNode[] {
  return [...characters]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((character) => ({
      type: 'record',
      id: `people:${character.id}`,
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
): SidebarRecordNode[] {
  return [...locations]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((location) => ({
      type: 'record',
      id: `places:${location.id}`,
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
): SidebarRecordNode[] {
  return [...maps]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((map) => ({
      type: 'record',
      id: `maps:${map.id}`,
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
): SidebarRecordNode[] {
  return [...items]
    .sort((left, right) => compareAlphabetically(left.name, right.name) || left.id - right.id)
    .map((item) => ({
      type: 'record',
      id: `items:${item.id}`,
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
): SidebarRecordNode[] {
  return [...events]
    .sort((left, right) => right.startTick - left.startTick || right.id - left.id)
    .map((event) => ({
      type: 'record',
      id: `events:${event.id}`,
      label: event.title,
      route: 'events',
      entitySelection: { kind: 'event', id: event.id },
      isCurrent: activeView === 'events' && selectedEventId === event.id,
    }));
}

function buildRecordChildren(
  workspaceId: SidebarRecordWorkspaceView,
  data: SidebarDataSnapshot,
  activeView: WorkspaceView,
  selectionState: SidebarSelectionState,
): SidebarRecordNode[] {
  switch (workspaceId) {
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

function buildWorkspaceNode(input: {
  activeView: WorkspaceView;
  data: SidebarDataSnapshot;
  expansionState: SidebarExpansionState;
  selectionState: SidebarSelectionState;
  workspaceId: SidebarWorkspaceView;
}): SidebarWorkspaceNode {
  const { activeView, data, expansionState, selectionState, workspaceId } = input;
  const isExpandable = isRecordWorkspaceView(workspaceId);
  const children = isExpandable
    ? buildRecordChildren(workspaceId, data, activeView, selectionState)
    : [];

  return {
    type: 'workspace',
    id: workspaceId,
    label: getWorkspaceLabel(workspaceId),
    route: workspaceId,
    entitySelection: null,
    isCurrent: activeView === workspaceId,
    isExpandable,
    isExpanded: isExpandable
      ? isSidebarNodeExpanded(workspaceId, activeView, expansionState)
      : false,
    count: isExpandable ? children.length : null,
    children,
  };
}

export function isSidebarNodeExpanded(
  nodeId: SidebarExpandableId,
  activeView: WorkspaceView,
  expansionState: SidebarExpansionState,
): boolean {
  const manualValue = expansionState[nodeId];

  if (manualValue !== undefined) {
    return manualValue;
  }

  if (nodeId === 'world-elements' || nodeId === 'writing') {
    return isViewInSection(nodeId, activeView);
  }

  return activeView === nodeId;
}

export function buildSidebarTreeNodes(input: {
  activeView: WorkspaceView;
  data: SidebarDataSnapshot;
  expansionState: SidebarExpansionState;
  selectionState: SidebarSelectionState;
}): SidebarTreeNode[] {
  const { activeView, data, expansionState, selectionState } = input;

  return sidebarTreeConfig.map((config): SidebarTreeNode => {
    if (config.kind === 'home') {
      return {
        type: 'home',
        id: config.id,
        label: config.label,
        route: config.id,
        entitySelection: null,
        isCurrent: activeView === config.id,
      };
    }

    const isExpandable = config.childViews.length > 0;
    const children = config.childViews.map((workspaceId) =>
      buildWorkspaceNode({
        activeView,
        data,
        expansionState,
        selectionState,
        workspaceId,
      }),
    );

    return {
      type: 'section',
      id: config.id,
      label: config.label,
      route: config.id,
      entitySelection: null,
      isCurrent: isViewInSection(config.id, activeView),
      isExpandable,
      isExpanded: isExpandable
        ? isSidebarNodeExpanded(config.id as SidebarSectionWithChildrenView, activeView, expansionState)
        : false,
      count: isExpandable ? children.length : null,
      children,
    };
  });
}

export function resolveSidebarSelection(node: SidebarSelectableNode): SidebarSelectionIntent {
  return {
    route: node.route,
    entitySelection: node.entitySelection,
  };
}
