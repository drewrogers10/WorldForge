import type { FeatureRole, MapFeature, MapGeometry } from '@shared/map';
import type { Point } from './mapViewport';

export const DEFAULT_GRID_SIZE = 200;

export type LayerVisibility = Record<FeatureRole | 'anchors', boolean>;

export type EditorHistorySnapshot = {
  draftPoints: Point[];
  liveGeometry: MapGeometry | null;
  selectedFeatureId: number | null;
  selectedVertexIndex: number | null;
};

export type EditorHistoryState = {
  past: EditorHistorySnapshot[];
  present: EditorHistorySnapshot;
  future: EditorHistorySnapshot[];
};

type FeatureKind = MapFeature['featureKind'];

export function createDefaultLayerVisibility(): LayerVisibility {
  return {
    anchors: true,
    custom: true,
    settlement: true,
    river: true,
    road: true,
    mountainRange: true,
    forest: true,
    regionBorder: true,
  };
}

export function filterVisibleFeatures(
  features: MapFeature[],
  visibility: LayerVisibility,
): MapFeature[] {
  return features.filter((feature) => visibility[feature.featureRole]);
}

export function snapPointToGrid(point: Point, gridSize = DEFAULT_GRID_SIZE): Point {
  if (gridSize <= 1) {
    return point;
  }

  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

export function getMinimumPointCount(featureKind: FeatureKind): number {
  switch (featureKind) {
    case 'path':
      return 2;
    case 'polygon':
    case 'border':
      return 3;
    case 'marker':
    default:
      return 1;
  }
}

export function removeGeometryPoint(
  geometry: MapGeometry,
  pointIndex: number,
): MapGeometry | null {
  if (geometry.type === 'marker') {
    return null;
  }

  if (geometry.points.length <= getMinimumPointCount(geometry.type)) {
    return null;
  }

  return {
    ...geometry,
    points: geometry.points.filter((_, currentIndex) => currentIndex !== pointIndex),
  };
}

function distanceToSegmentSquared(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)),
  );
  const projectedX = start.x + dx * t;
  const projectedY = start.y + dy * t;

  return (point.x - projectedX) ** 2 + (point.y - projectedY) ** 2;
}

function getInsertIndexForPoint(geometry: Extract<MapGeometry, { type: 'path' | 'polygon' | 'border' }>, point: Point): number {
  let bestIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;
  const isClosedShape = geometry.type === 'polygon' || geometry.type === 'border';
  const segmentCount = isClosedShape ? geometry.points.length : geometry.points.length - 1;

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const start = geometry.points[segmentIndex];
    const end = geometry.points[(segmentIndex + 1) % geometry.points.length];

    if (!start || !end) {
      continue;
    }

    const distance = distanceToSegmentSquared(point, start, end);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = segmentIndex + 1;
    }
  }

  return bestIndex;
}

export function insertGeometryPoint(geometry: MapGeometry, point: Point): MapGeometry {
  if (geometry.type === 'marker') {
    return {
      ...geometry,
      point,
    };
  }

  const insertIndex = getInsertIndexForPoint(geometry, point);
  return {
    ...geometry,
    points: [
      ...geometry.points.slice(0, insertIndex),
      point,
      ...geometry.points.slice(insertIndex),
    ],
  };
}

function clonePoint(point: Point): Point {
  return {
    x: point.x,
    y: point.y,
  };
}

function cloneGeometry(geometry: MapGeometry | null): MapGeometry | null {
  if (geometry === null) {
    return null;
  }

  if (geometry.type === 'marker') {
    return {
      ...geometry,
      point: clonePoint(geometry.point),
    };
  }

  return {
    ...geometry,
    points: geometry.points.map(clonePoint),
  };
}

function cloneSnapshot(snapshot: EditorHistorySnapshot): EditorHistorySnapshot {
  return {
    draftPoints: snapshot.draftPoints.map(clonePoint),
    liveGeometry: cloneGeometry(snapshot.liveGeometry),
    selectedFeatureId: snapshot.selectedFeatureId,
    selectedVertexIndex: snapshot.selectedVertexIndex,
  };
}

function snapshotKey(snapshot: EditorHistorySnapshot): string {
  return JSON.stringify(snapshot);
}

export function createEditorHistory(
  initialSnapshot?: Partial<EditorHistorySnapshot>,
): EditorHistoryState {
  return {
    past: [],
    present: cloneSnapshot({
      draftPoints: [],
      liveGeometry: null,
      selectedFeatureId: null,
      selectedVertexIndex: null,
      ...initialSnapshot,
    }),
    future: [],
  };
}

export function pushEditorHistory(
  history: EditorHistoryState,
  snapshot: EditorHistorySnapshot,
): EditorHistoryState {
  if (snapshotKey(history.present) === snapshotKey(snapshot)) {
    return history;
  }

  return {
    past: [...history.past, cloneSnapshot(history.present)].slice(-40),
    present: cloneSnapshot(snapshot),
    future: [],
  };
}

export function undoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const previous = history.past.at(-1);

  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: cloneSnapshot(previous),
    future: [cloneSnapshot(history.present), ...history.future],
  };
}

export function redoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const [next, ...future] = history.future;

  if (!next) {
    return history;
  }

  return {
    past: [...history.past, cloneSnapshot(history.present)].slice(-40),
    present: cloneSnapshot(next),
    future,
  };
}
