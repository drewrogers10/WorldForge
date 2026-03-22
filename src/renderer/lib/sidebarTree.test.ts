import { describe, expect, it } from 'vitest';
import {
  buildSidebarTreeNodes,
  isSidebarFolderExpanded,
  resolveSidebarSelection,
  type SidebarDataSnapshot,
  type SidebarFolderExpansionState,
  type SidebarSelectionState,
  type SidebarTreeDisabledFolderNode,
  type SidebarTreeFolderNode,
} from './sidebarTree';

function createSidebarData(): SidebarDataSnapshot {
  return {
    characters: [
      {
        id: 2,
        name: 'Zed',
        summary: '',
        locationId: null,
        location: null,
        existsFromTick: 0,
        existsToTick: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 1,
        name: 'Ada',
        summary: '',
        locationId: null,
        location: null,
        existsFromTick: 0,
        existsToTick: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    locations: [
      {
        id: 4,
        name: 'Westreach',
        summary: '',
        existsFromTick: 0,
        existsToTick: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    items: [
      {
        id: 5,
        name: 'Amber Key',
        summary: '',
        quantity: 1,
        ownerCharacterId: null,
        ownerCharacter: null,
        locationId: null,
        location: null,
        existsFromTick: 0,
        existsToTick: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    maps: [
      {
        id: 9,
        name: 'North Atlas',
        displayKind: 'vector',
        focusLocationId: null,
        focusLocation: null,
        parentMapId: null,
        parentMap: null,
        imageAssetPath: null,
        canvasWidth: 1000,
        canvasHeight: 1000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 8,
        name: 'Archive Sheet',
        displayKind: 'image',
        focusLocationId: null,
        focusLocation: null,
        parentMapId: null,
        parentMap: null,
        imageAssetPath: '/tmp/archive.png',
        canvasWidth: 1000,
        canvasHeight: 1000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    events: [
      {
        id: 12,
        title: 'Founding Feast',
        summary: '',
        startTick: 25,
        endTick: null,
        primaryLocationId: null,
        primaryLocation: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 13,
        title: 'Ashfall',
        summary: '',
        startTick: 80,
        endTick: null,
        primaryLocationId: null,
        primaryLocation: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function createSelectionState(): SidebarSelectionState {
  return {
    selectedCharacterId: 1,
    selectedEventId: 13,
    selectedItemId: 5,
    selectedLocationId: 4,
    selectedMapId: 8,
  };
}

function getFolderNode(
  nodes: ReturnType<typeof buildSidebarTreeNodes>,
  id: SidebarTreeFolderNode['id'],
): SidebarTreeFolderNode {
  const node = nodes.find(
    (current): current is SidebarTreeFolderNode =>
      current.type === 'folder' && current.id === id,
  );

  if (!node) {
    throw new Error(`Expected folder node ${id}.`);
  }

  return node;
}

function getDisabledFolderNode(
  nodes: ReturnType<typeof buildSidebarTreeNodes>,
  id: SidebarTreeDisabledFolderNode['id'],
): SidebarTreeDisabledFolderNode {
  const node = nodes.find(
    (current): current is SidebarTreeDisabledFolderNode =>
      current.type === 'disabled-folder' && current.id === id,
  );

  if (!node) {
    throw new Error(`Expected disabled folder node ${id}.`);
  }

  return node;
}

describe('buildSidebarTreeNodes', () => {
  it('builds implemented folders with sorted children and counts', () => {
    const nodes = buildSidebarTreeNodes({
      activeView: 'people',
      data: createSidebarData(),
      expansionState: {},
      selectionState: createSelectionState(),
    });

    const peopleFolder = getFolderNode(nodes, 'people');
    const mapsFolder = getFolderNode(nodes, 'maps');
    const eventsFolder = getFolderNode(nodes, 'events');

    expect(peopleFolder?.count).toBe(2);
    expect(peopleFolder?.children.map((child) => child.label)).toEqual(['Ada', 'Zed']);
    expect(mapsFolder?.children.map((child) => child.label)).toEqual([
      'Archive Sheet',
      'North Atlas',
    ]);
    expect(eventsFolder?.children.map((child) => child.label)).toEqual([
      'Ashfall',
      'Founding Feast',
    ]);
    expect(peopleFolder?.children[0]?.isCurrent).toBe(true);
    expect(peopleFolder?.isExpanded).toBe(true);
  });

  it('emits disabled placeholder folders without children', () => {
    const nodes = buildSidebarTreeNodes({
      activeView: 'overview',
      data: createSidebarData(),
      expansionState: {},
      selectionState: createSelectionState(),
    });

    const powersFolder = getDisabledFolderNode(nodes, 'powers');

    expect(powersFolder).toEqual({
      type: 'disabled-folder',
      id: 'powers',
      label: 'Powers',
    });
    expect(resolveSidebarSelection(powersFolder)).toBeNull();
  });
});

describe('resolveSidebarSelection', () => {
  it('maps child records to the correct route and entity selection', () => {
    const nodes = buildSidebarTreeNodes({
      activeView: 'maps',
      data: createSidebarData(),
      expansionState: { maps: true },
      selectionState: createSelectionState(),
    });

    const mapFolder = getFolderNode(nodes, 'maps');
    const selectedMap = mapFolder.children.find((child) => child.label === 'Archive Sheet');

    if (!selectedMap) {
      throw new Error('Expected selected map node.');
    }

    expect(resolveSidebarSelection(mapFolder)).toEqual({
      route: 'maps',
      entitySelection: null,
    });
    expect(resolveSidebarSelection(selectedMap)).toEqual({
      route: 'maps',
      entitySelection: {
        kind: 'map',
        id: 8,
      },
    });
  });
});

describe('isSidebarFolderExpanded', () => {
  it('auto-expands the active workspace without discarding same-session manual toggles', () => {
    const expansionState: SidebarFolderExpansionState = {
      maps: true,
      items: false,
    };

    expect(isSidebarFolderExpanded('people', 'people', expansionState)).toBe(true);
    expect(isSidebarFolderExpanded('maps', 'people', expansionState)).toBe(true);
    expect(isSidebarFolderExpanded('items', 'people', expansionState)).toBe(false);
  });
});
