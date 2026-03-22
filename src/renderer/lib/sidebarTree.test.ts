import { describe, expect, it } from 'vitest';
import {
  buildSidebarTreeNodes,
  isSidebarNodeExpanded,
  resolveSidebarSelection,
  type SidebarDataSnapshot,
  type SidebarExpansionState,
  type SidebarSectionNode,
  type SidebarSelectionState,
  type SidebarWorkspaceNode,
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
        themePreset: 'parchment',
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
        themePreset: 'terrain',
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

function getSectionNode(
  nodes: ReturnType<typeof buildSidebarTreeNodes>,
  id: SidebarSectionNode['id'],
): SidebarSectionNode {
  const node = nodes.find(
    (current): current is SidebarSectionNode =>
      current.type === 'section' && current.id === id,
  );

  if (!node) {
    throw new Error(`Expected section node ${id}.`);
  }

  return node;
}

function getWorkspaceNode(
  section: SidebarSectionNode,
  id: SidebarWorkspaceNode['id'],
): SidebarWorkspaceNode {
  const node = section.children.find((child) => child.id === id);

  if (!node) {
    throw new Error(`Expected workspace node ${id}.`);
  }

  return node;
}

describe('buildSidebarTreeNodes', () => {
  it('builds the top-level section order and nested child workspaces', () => {
    const nodes = buildSidebarTreeNodes({
      activeView: 'overview',
      data: createSidebarData(),
      expansionState: {},
      selectionState: createSelectionState(),
    });

    expect(nodes.map((node) => node.label)).toEqual([
      'Overview',
      'World Elements',
      'Theories',
      'Writing',
    ]);

    const worldElements = getSectionNode(nodes, 'world-elements');
    const writing = getSectionNode(nodes, 'writing');
    const theories = getSectionNode(nodes, 'theories');

    expect(worldElements.isExpandable).toBe(true);
    expect(worldElements.count).toBe(7);
    expect(worldElements.children.map((child) => child.label)).toEqual([
      'People',
      'Places',
      'Maps',
      'Items',
      'Events',
      'Powers',
      'Organizations',
    ]);

    expect(writing.isExpandable).toBe(true);
    expect(writing.count).toBe(3);
    expect(writing.children.map((child) => child.label)).toEqual([
      'Manuscript',
      'Plot',
      'Writing Ideas',
    ]);

    expect(theories.isExpandable).toBe(false);
    expect(theories.count).toBeNull();
    expect(theories.children).toEqual([]);
  });

  it('keeps record workspaces sorted and highlighted under world elements', () => {
    const nodes = buildSidebarTreeNodes({
      activeView: 'people',
      data: createSidebarData(),
      expansionState: {},
      selectionState: createSelectionState(),
    });

    const worldElements = getSectionNode(nodes, 'world-elements');
    const peopleWorkspace = getWorkspaceNode(worldElements, 'people');
    const mapsWorkspace = getWorkspaceNode(worldElements, 'maps');
    const eventsWorkspace = getWorkspaceNode(worldElements, 'events');

    expect(worldElements.isCurrent).toBe(true);
    expect(worldElements.isExpanded).toBe(true);

    expect(peopleWorkspace.isCurrent).toBe(true);
    expect(peopleWorkspace.isExpanded).toBe(true);
    expect(peopleWorkspace.children.map((child) => child.label)).toEqual(['Ada', 'Zed']);
    expect(peopleWorkspace.children[0]?.isCurrent).toBe(true);

    expect(mapsWorkspace.children.map((child) => child.label)).toEqual([
      'Archive Sheet',
      'North Atlas',
    ]);
    expect(eventsWorkspace.children.map((child) => child.label)).toEqual([
      'Ashfall',
      'Founding Feast',
    ]);
  });

  it('resolves active leaf workspaces and section routes without disabled placeholders', () => {
    const nodes = buildSidebarTreeNodes({
      activeView: 'writing',
      data: createSidebarData(),
      expansionState: {},
      selectionState: createSelectionState(),
    });

    const worldElements = getSectionNode(nodes, 'world-elements');
    const writing = getSectionNode(nodes, 'writing');
    const theories = getSectionNode(nodes, 'theories');
    const powersWorkspace = getWorkspaceNode(worldElements, 'powers');
    const organizationsWorkspace = getWorkspaceNode(worldElements, 'organizations');

    expect(resolveSidebarSelection(theories)).toEqual({
      route: 'theories',
      entitySelection: null,
    });
    expect(resolveSidebarSelection(writing)).toEqual({
      route: 'writing',
      entitySelection: null,
    });
    expect(resolveSidebarSelection(powersWorkspace)).toEqual({
      route: 'powers',
      entitySelection: null,
    });
    expect(resolveSidebarSelection(organizationsWorkspace)).toEqual({
      route: 'organizations',
      entitySelection: null,
    });
  });
});

describe('resolveSidebarSelection', () => {
  it('maps record nodes to the correct route and entity selection', () => {
    const nodes = buildSidebarTreeNodes({
      activeView: 'maps',
      data: createSidebarData(),
      expansionState: { maps: true },
      selectionState: createSelectionState(),
    });

    const worldElements = getSectionNode(nodes, 'world-elements');
    const mapWorkspace = getWorkspaceNode(worldElements, 'maps');
    const selectedMap = mapWorkspace.children.find((child) => child.label === 'Archive Sheet');

    if (!selectedMap) {
      throw new Error('Expected selected map node.');
    }

    expect(resolveSidebarSelection(mapWorkspace)).toEqual({
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

describe('isSidebarNodeExpanded', () => {
  it('auto-expands the active section and preserves manual toggles', () => {
    const expansionState: SidebarExpansionState = {
      writing: true,
      items: false,
    };

    expect(isSidebarNodeExpanded('world-elements', 'people', expansionState)).toBe(true);
    expect(isSidebarNodeExpanded('writing', 'people', expansionState)).toBe(true);
    expect(isSidebarNodeExpanded('items', 'people', expansionState)).toBe(false);
  });
});
