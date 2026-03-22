import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type FormEvent,
} from 'react';
import clsx from 'clsx';
import { EntityLinksPanel } from '@renderer/components/EntityLinksPanel';
import { Panel } from '@renderer/components/Panel';
import { useTopBarControls } from '@renderer/components/TopBarControls';
import { areFormStatesEqual, getErrorMessage } from '@renderer/lib/forms';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import type { Event } from '@shared/event';
import type { Location } from '@shared/location';
import type {
  FeatureRole,
  MapAnchor,
  MapFeature,
  MapGeometry,
  MapRecord,
  MapStyle,
  ThemePreset,
} from '@shared/map';
import { formatWorldTick } from '@shared/temporal';
import {
  centerViewportOn,
  clampViewport,
  createFullViewport,
  zoomViewportAt,
  type Point,
  type Viewport,
} from './mapViewport';
import {
  getAnchorBadgeMetrics,
  getAnchorLabelMetrics,
  getDraftOverlayMetrics,
  getFeatureHandleMetrics,
  getFeatureLabelMetrics,
  getFeatureMarkerMetrics,
  getFeatureStrokeWidth,
} from './mapOverlayScale';
import {
  createDefaultLayerVisibility,
  createEditorHistory,
  filterVisibleFeatures,
  insertGeometryPoint,
  pushEditorHistory,
  redoEditorHistory,
  removeGeometryPoint,
  snapPointToGrid,
  undoEditorHistory,
  type EditorHistorySnapshot,
  type LayerVisibility,
} from './mapEditorState';
import {
  getCompatibleFeatureRoles,
  getDefaultFeatureStyle,
  getFeatureKindForRole,
  getThemeVisuals,
  themePresetLabels,
  toolLabels,
  type FeatureKind,
  type MapTool,
} from './mapFeaturePresets';
import styles from './MapPage.module.css';

type DisplayKind = MapRecord['displayKind'];
type MapFormState = {
  name: string;
  displayKind: DisplayKind;
  themePreset: ThemePreset;
  focusLocationId: string;
  parentMapId: string;
  imageAssetPath: string;
  canvasWidth: number;
  canvasHeight: number;
};
type FeatureFormState = {
  featureKind: FeatureKind;
  featureRole: FeatureRole;
  label: string;
  locationId: string;
  eventId: string;
  sourceEventId: string;
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity: number;
  markerSize: number;
  effectiveTick: number;
};
type DragVertexState = {
  featureId: number;
  pointIndex: number;
};
type ActiveDrawer = 'none' | 'admin' | 'inspector';
type AdminMode = 'browse' | 'create' | 'edit';
type InspectorMode = 'none' | 'feature' | 'anchor' | 'draft';

const MAP_WHEEL_PASSTHROUGH_SELECTOR =
  '[data-map-wheel-passthrough="true"], button, input, select, textarea, [contenteditable="true"]';

function isFeatureTool(tool: MapTool): tool is FeatureRole {
  return tool !== 'select' && tool !== 'pan' && tool !== 'anchor';
}

function isDraftCapableTool(tool: MapTool, featureKind: FeatureKind): boolean {
  return isFeatureTool(tool) && getFeatureKindForRole(tool, featureKind) !== 'marker';
}

function createEmptyMapForm(): MapFormState {
  return {
    name: '',
    displayKind: 'vector',
    themePreset: 'parchment',
    focusLocationId: '',
    parentMapId: '',
    imageAssetPath: '',
    canvasWidth: 10000,
    canvasHeight: 10000,
  };
}

function toMapForm(map: MapRecord): MapFormState {
  return {
    name: map.name,
    displayKind: map.displayKind,
    themePreset: map.themePreset,
    focusLocationId: map.focusLocationId === null ? '' : String(map.focusLocationId),
    parentMapId: map.parentMapId === null ? '' : String(map.parentMapId),
    imageAssetPath: map.imageAssetPath ?? '',
    canvasWidth: map.canvasWidth,
    canvasHeight: map.canvasHeight,
  };
}

function createFeatureFormState(
  themePreset: ThemePreset,
  defaultTick: number,
  featureRole: FeatureRole = 'custom',
  fallbackKind: FeatureKind = 'marker',
): FeatureFormState {
  const featureKind = getFeatureKindForRole(featureRole, fallbackKind);
  const style = getDefaultFeatureStyle(featureRole, themePreset, featureKind);

  return {
    featureKind,
    featureRole,
    label: '',
    locationId: '',
    eventId: '',
    sourceEventId: '',
    stroke: style.stroke ?? '',
    fill: style.fill ?? '',
    strokeWidth: style.strokeWidth ?? 120,
    opacity: style.opacity ?? 0.92,
    markerSize: style.markerSize ?? 260,
    effectiveTick: defaultTick,
  };
}

function toFeatureForm(feature: MapFeature, committedTick: number): FeatureFormState {
  return {
    featureKind: feature.featureKind,
    featureRole: feature.featureRole,
    label: feature.label,
    locationId: feature.locationId === null ? '' : String(feature.locationId),
    eventId: feature.eventId === null ? '' : String(feature.eventId),
    sourceEventId: feature.sourceEventId === null ? '' : String(feature.sourceEventId),
    stroke: feature.style?.stroke ?? '#f7c46c',
    fill: feature.style?.fill ?? '#f7c46c22',
    strokeWidth: feature.style?.strokeWidth ?? 120,
    opacity: feature.style?.opacity ?? 0.92,
    markerSize: feature.style?.markerSize ?? 260,
    effectiveTick: committedTick,
  };
}

function buildStyle(form: FeatureFormState): MapStyle {
  return {
    stroke: form.stroke,
    fill: form.featureKind === 'path' ? 'none' : form.fill,
    strokeWidth: form.strokeWidth,
    opacity: form.opacity,
    markerSize: form.markerSize,
  };
}

function updateGeometryPoint(geometry: MapGeometry, index: number, point: Point): MapGeometry {
  if (geometry.type === 'marker') {
    return {
      ...geometry,
      point,
    };
  }

  return {
    ...geometry,
    points: geometry.points.map((current, currentIndex) =>
      currentIndex === index ? point : current,
    ),
  };
}

function getGeometryPoints(geometry: MapGeometry): Point[] {
  return geometry.type === 'marker' ? [geometry.point] : geometry.points;
}

function defaultGeometryForTool(tool: FeatureKind, points: Point[]): MapGeometry | null {
  if (tool === 'marker') {
    return points[0] ? { type: 'marker', point: points[0] } : null;
  }

  if (tool === 'path') {
    return points.length >= 2 ? { type: 'path', points } : null;
  }

  if (tool === 'polygon') {
    return points.length >= 3 ? { type: 'polygon', points } : null;
  }

  return points.length >= 3 ? { type: 'border', points } : null;
}

function getMapImageHref(imageAssetPath: string | null): string | null {
  if (!imageAssetPath) {
    return null;
  }

  return `file://${encodeURI(imageAssetPath)}`;
}

function getSvgPoint(
  svg: SVGSVGElement,
  event: Pick<MouseEvent, 'clientX' | 'clientY'> | Pick<ReactMouseEvent<SVGSVGElement>, 'clientX' | 'clientY'>,
  viewport: Viewport,
): Point {
  const rect = svg.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return {
      x: Math.round(viewport.x + viewport.width / 2),
      y: Math.round(viewport.y + viewport.height / 2),
    };
  }

  return {
    x: Math.round(((event.clientX - rect.left) / rect.width) * viewport.width + viewport.x),
    y: Math.round(((event.clientY - rect.top) / rect.height) * viewport.height + viewport.y),
  };
}

function shouldBypassWheelZoom(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(MAP_WHEEL_PASSTHROUGH_SELECTOR) !== null;
}

function shouldIgnoreKeyboardTarget(target: EventTarget | null): boolean {
  return shouldBypassWheelZoom(target);
}

function createFeatureLabelStyle(fontSize: number, strokeWidth: number): CSSProperties {
  return {
    ['--feature-label-font-size' as string]: `${fontSize}px`,
    ['--feature-label-stroke-width' as string]: `${strokeWidth}px`,
  } as CSSProperties;
}

function createAnchorLabelStyle(fontSize: number, strokeWidth: number): CSSProperties {
  return {
    ['--anchor-label-font-size' as string]: `${fontSize}px`,
    ['--anchor-label-stroke-width' as string]: `${strokeWidth}px`,
  } as CSSProperties;
}

function renderFeatureShape(
  feature: MapFeature,
  geometry: MapGeometry,
  isSelected: boolean,
  viewport: Viewport,
  map: Pick<MapRecord, 'canvasWidth' | 'canvasHeight'>,
): ReactElement {
  const stroke = isSelected ? '#ffede0' : feature.style?.stroke ?? '#f7c46c';
  const fill =
    geometry.type === 'path'
      ? 'none'
      : isSelected
        ? 'rgba(255, 237, 224, 0.14)'
        : feature.style?.fill ?? '#f7c46c22';
  const opacity = feature.style?.opacity ?? 0.92;
  const markerSize = feature.style?.markerSize ?? 260;

  if (geometry.type === 'marker') {
    const markerMetrics = getFeatureMarkerMetrics(markerSize, viewport, map);

    if (feature.featureRole === 'settlement') {
      return (
        <g>
          <circle
            cx={geometry.point.x}
            cy={geometry.point.y}
            fill={fill}
            opacity={opacity}
            r={markerMetrics.radius * 1.15}
            stroke={stroke}
            strokeWidth={markerMetrics.strokeWidth}
          />
          <circle
            cx={geometry.point.x}
            cy={geometry.point.y}
            fill={stroke}
            opacity={opacity}
            r={markerMetrics.radius * 0.45}
          />
        </g>
      );
    }

    return (
      <circle
        cx={geometry.point.x}
        cy={geometry.point.y}
        fill={stroke}
        opacity={opacity}
        r={markerMetrics.radius}
        stroke={isSelected ? '#fff6ef' : 'rgba(9, 12, 17, 0.7)'}
        strokeWidth={markerMetrics.strokeWidth}
      />
    );
  }

  const points = geometry.points.map((point) => `${point.x},${point.y}`).join(' ');
  const strokeWidth = getFeatureStrokeWidth(feature.style?.strokeWidth ?? 120, viewport, map);

  if (geometry.type === 'path') {
    const dashArray =
      feature.featureRole === 'road'
        ? `${strokeWidth * 1.2} ${strokeWidth * 0.6}`
        : feature.featureRole === 'mountainRange'
          ? `${strokeWidth * 0.6} ${strokeWidth * 0.9}`
          : undefined;

    return (
      <g>
        <polyline
          fill="none"
          opacity={opacity}
          points={points}
          stroke={stroke}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        {feature.featureRole === 'mountainRange'
          ? geometry.points.slice(0, -1).flatMap((point, index) => {
              const next = geometry.points[index + 1];
              if (!next) {
                return [];
              }
              const rotation = Math.atan2(next.y - point.y, next.x - point.x) * (180 / Math.PI);
              const midX = (point.x + next.x) / 2;
              const midY = (point.y + next.y) / 2;
              const triangleSize = strokeWidth * 2.1;

              return [
                <path
                  key={`${feature.id}-mountain-${index}`}
                  d={`M ${midX - triangleSize} ${midY + triangleSize * 0.7} L ${midX} ${midY - triangleSize} L ${midX + triangleSize} ${midY + triangleSize * 0.7} Z`}
                  fill={fill}
                  opacity={Math.min(1, opacity + 0.05)}
                  stroke={stroke}
                  strokeWidth={strokeWidth * 0.18}
                  transform={`rotate(${rotation}, ${midX}, ${midY})`}
                />,
              ];
            })
          : null}
      </g>
    );
  }

  const dashArray =
    feature.featureRole === 'regionBorder'
      ? `${strokeWidth * 1.25} ${strokeWidth * 0.75}`
      : undefined;

  return (
    <polygon
      fill={fill}
      opacity={opacity}
      points={points}
      stroke={stroke}
      strokeDasharray={dashArray}
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  );
}

export function MapPage() {
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previousSelectedFeatureIdRef = useRef<number | null>(null);
  const previousToolRef = useRef<MapTool>('select');
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { selectedMapId, setSelectedMapId } = useEntityStore();
  const loadSidebarData = useSidebarStore((state) => state.loadSidebarData);
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [tool, setTool] = useState<MapTool>('select');
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>('none');
  const [adminMode, setAdminMode] = useState<AdminMode>('browse');
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [anchorCache, setAnchorCache] = useState<Record<number, MapAnchor[]>>({});
  const [selectedMap, setSelectedMap] = useState<MapRecord | null>(null);
  const [mapFeatures, setMapFeatures] = useState<MapFeature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [dragVertex, setDragVertex] = useState<DragVertexState | null>(null);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [liveGeometry, setLiveGeometry] = useState<MapGeometry | null>(null);
  const [editorHistory, setEditorHistory] = useState(() => createEditorHistory());
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOrigin, setPanOrigin] = useState<{
    pointer: Point;
    viewport: Viewport;
  } | null>(null);
  const [anchorLocationId, setAnchorLocationId] = useState('');
  const [createMapForm, setCreateMapForm] = useState<MapFormState>(createEmptyMapForm());
  const [editMapForm, setEditMapForm] = useState<MapFormState>(createEmptyMapForm());
  const [createFeatureForm, setCreateFeatureForm] = useState<FeatureFormState>(
    createFeatureFormState('parchment', committedTick),
  );
  const [editFeatureForm, setEditFeatureForm] = useState<FeatureFormState>(
    createFeatureFormState('parchment', committedTick),
  );
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(createDefaultLayerVisibility());
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingMap, setIsSavingMap] = useState(false);
  const [isSavingFeature, setIsSavingFeature] = useState(false);
  const [isSavingAnchor, setIsSavingAnchor] = useState(false);

  const selectedFeature = useMemo(
    () => mapFeatures.find((feature) => feature.id === selectedFeatureId) ?? null,
    [mapFeatures, selectedFeatureId],
  );
  const selectedMapAnchors = selectedMap ? anchorCache[selectedMap.id] ?? [] : [];
  const selectedFeatureGeometry =
    selectedFeature && liveGeometry ? liveGeometry : selectedFeature?.geometry ?? null;
  const visibleMapFeatures = useMemo(
    () => filterVisibleFeatures(mapFeatures, layerVisibility),
    [layerVisibility, mapFeatures],
  );
  const inspectorMode = useMemo<InspectorMode>(() => {
    if (!selectedMap) {
      return 'none';
    }

    if (selectedFeature) {
      return 'feature';
    }

    if (tool === 'anchor') {
      return 'anchor';
    }

    return isFeatureTool(tool) ? 'draft' : 'none';
  }, [selectedFeature, selectedMap, tool]);
  const isInspectorDrawerOpen = activeDrawer === 'inspector' && inspectorMode !== 'none';
  const selectedAnchorLocationName =
    anchorLocationId === ''
      ? 'pick a place'
      : locations.find((location) => String(location.id) === anchorLocationId)?.name ?? 'unknown';
  const relatedMaps = useMemo(() => {
    if (!selectedMap || !selectedFeature?.locationId) {
      return [];
    }

    return maps.filter((map) => {
      if (map.id === selectedMap.id) {
        return false;
      }

      return (anchorCache[map.id] ?? []).some(
        (anchor) => anchor.locationId === selectedFeature.locationId,
      );
    });
  }, [anchorCache, maps, selectedFeature, selectedMap]);
  const createMapBaseline = useMemo(() => createEmptyMapForm(), []);
  const editMapBaseline = useMemo(
    () => (selectedMap ? toMapForm(selectedMap) : createEmptyMapForm()),
    [selectedMap],
  );
  const isMapAdminDirty =
    activeDrawer === 'admin' &&
    (adminMode === 'create'
      ? !areFormStatesEqual(createMapForm, createMapBaseline)
      : adminMode === 'edit' && selectedMap
        ? !areFormStatesEqual(editMapForm, editMapBaseline)
        : false);
  const themeVisuals = useMemo(
    () => getThemeVisuals(selectedMap?.themePreset ?? 'parchment'),
    [selectedMap?.themePreset],
  );

  function applyFeaturePreset(
    currentForm: FeatureFormState,
    featureRole: FeatureRole,
    themePreset: ThemePreset,
    fallbackKind = currentForm.featureKind,
  ): FeatureFormState {
    const featureKind = getFeatureKindForRole(featureRole, fallbackKind);
    const style = getDefaultFeatureStyle(featureRole, themePreset, featureKind);

    return {
      ...currentForm,
      featureKind,
      featureRole,
      stroke: style.stroke ?? currentForm.stroke,
      fill: featureKind === 'path' ? 'none' : (style.fill ?? currentForm.fill),
      strokeWidth: style.strokeWidth ?? currentForm.strokeWidth,
      opacity: style.opacity ?? currentForm.opacity,
      markerSize: style.markerSize ?? currentForm.markerSize,
    };
  }

  function buildEditorSnapshot(
    overrides: Partial<EditorHistorySnapshot> = {},
  ): EditorHistorySnapshot {
    return {
      draftPoints: overrides.draftPoints ?? draftPoints,
      liveGeometry: overrides.liveGeometry ?? liveGeometry,
      selectedFeatureId: overrides.selectedFeatureId ?? selectedFeatureId,
      selectedVertexIndex: overrides.selectedVertexIndex ?? selectedVertexIndex,
    };
  }

  function applyEditorSnapshot(snapshot: EditorHistorySnapshot): void {
    setDraftPoints(snapshot.draftPoints);
    setLiveGeometry(snapshot.liveGeometry);
    setSelectedVertexIndex(snapshot.selectedVertexIndex);
    setSelectedFeatureId(snapshot.selectedFeatureId);
  }

  function resetEditorState(overrides: Partial<EditorHistorySnapshot> = {}): void {
    const snapshot = buildEditorSnapshot({
      draftPoints: [],
      liveGeometry: null,
      selectedVertexIndex: null,
      ...overrides,
    });

    applyEditorSnapshot(snapshot);
    setEditorHistory(createEditorHistory(snapshot));
  }

  function commitEditorSnapshot(overrides: Partial<EditorHistorySnapshot>): void {
    const snapshot = buildEditorSnapshot(overrides);
    applyEditorSnapshot(snapshot);
    setEditorHistory((current) => pushEditorHistory(current, snapshot));
  }

  function handleUndo(): void {
    const nextHistory = undoEditorHistory(editorHistory);

    if (nextHistory === editorHistory) {
      return;
    }

    setEditorHistory(nextHistory);
    applyEditorSnapshot(nextHistory.present);
  }

  function handleRedo(): void {
    const nextHistory = redoEditorHistory(editorHistory);

    if (nextHistory === editorHistory) {
      return;
    }

    setEditorHistory(nextHistory);
    applyEditorSnapshot(nextHistory.present);
  }

  function resolveCanvasPoint(point: Point): Point {
    return snapToGrid ? snapPointToGrid(point) : point;
  }

  useEffect(() => {
    setCreateFeatureForm((current) => ({ ...current, effectiveTick: committedTick }));
    setEditFeatureForm((current) => ({ ...current, effectiveTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    async function loadBaseData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextMaps = await window.worldForge.listMaps();
        const [nextLocations, nextEvents] = await Promise.all([
          window.worldForge.listLocations({ asOfTick: tick }),
          window.worldForge.listEvents(),
        ]);
        const anchorEntries = await Promise.all(
          nextMaps.map(async (map) => [map.id, await window.worldForge.listMapAnchors({ mapId: map.id })] as const),
        );

        setMaps(nextMaps);
        setLocations(nextLocations);
        setEvents(nextEvents);
        setAnchorCache(Object.fromEntries(anchorEntries));

        if (selectedMapId === null && nextMaps[0]) {
          setSelectedMapId(nextMaps[0].id);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadBaseData();
  }, [selectedMapId, setErrorMessage, setSelectedMapId, tick]);

  useEffect(() => {
    async function loadSelectedMapData() {
      if (selectedMapId === null) {
        setSelectedMap(null);
        setMapFeatures([]);
        setViewport(null);
        resetEditorState({ selectedFeatureId: null });
        return;
      }

      setErrorMessage(null);

      try {
        const [mapRecord, features] = await Promise.all([
          window.worldForge.getMap({ id: selectedMapId }),
          window.worldForge.listMapFeatures({ mapId: selectedMapId, asOfTick: tick }),
        ]);

        setSelectedMap(mapRecord);
        setMapFeatures(features);
        setSelectedFeatureId((current) =>
          current !== null && features.some((feature) => feature.id === current) ? current : null,
        );

        if (mapRecord) {
          setEditMapForm(toMapForm(mapRecord));
          setViewport((current) => current ?? createFullViewport(mapRecord));
          setCreateFeatureForm((current) => ({
            ...createFeatureFormState(
              mapRecord.themePreset,
              committedTick,
              isFeatureTool(tool) ? tool : current.featureRole,
              current.featureKind,
            ),
            effectiveTick: current.effectiveTick,
          }));
        }

        resetEditorState({ selectedFeatureId: null });
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    }

    void loadSelectedMapData();
  }, [committedTick, selectedMapId, setErrorMessage, tick, tool]);

  useEffect(() => {
    if (!selectedFeature) {
      setLiveGeometry(null);
      setSelectedVertexIndex(null);
      return;
    }

    setEditFeatureForm(toFeatureForm(selectedFeature, committedTick));
    resetEditorState({
      selectedFeatureId: selectedFeature.id,
    });
  }, [committedTick, selectedFeature]);

  useEffect(() => {
    if (selectedMapId === null) {
      setActiveDrawer('admin');
      setAdminMode('create');
    }
  }, [selectedMapId]);

  useEffect(() => {
    if (
      selectedFeatureId !== null &&
      selectedFeatureId !== previousSelectedFeatureIdRef.current
    ) {
      setActiveDrawer('inspector');
    }

    previousSelectedFeatureIdRef.current = selectedFeatureId;
  }, [selectedFeatureId]);

  useEffect(() => {
    if (tool !== previousToolRef.current && (tool === 'anchor' || isFeatureTool(tool))) {
      setActiveDrawer('inspector');
    }

    previousToolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    if (activeDrawer === 'inspector' && inspectorMode === 'none') {
      setActiveDrawer(selectedMapId === null ? 'admin' : 'none');
    }
  }, [activeDrawer, inspectorMode, selectedMapId]);

  useEffect(() => {
    if (!dragVertex || !selectedFeatureGeometry || !selectedMap || !viewport) {
      return;
    }

    const currentViewport = viewport;
    const currentDragVertex = dragVertex;
    const baseGeometry = selectedFeatureGeometry;
    let currentGeometry = baseGeometry;

    function handleMouseMove(event: MouseEvent) {
      if (!svgRef.current) {
        return;
      }

      const point = resolveCanvasPoint(getSvgPoint(svgRef.current, event, currentViewport));
      currentGeometry = updateGeometryPoint(baseGeometry, currentDragVertex.pointIndex, point);
      setLiveGeometry(currentGeometry);
    }

    function handleMouseUp() {
      commitEditorSnapshot({
        liveGeometry: currentGeometry,
        selectedVertexIndex: currentDragVertex.pointIndex,
      });
      setDragVertex(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    commitEditorSnapshot,
    dragVertex,
    selectedFeatureGeometry,
    selectedMap,
    snapToGrid,
    viewport,
  ]);

  useEffect(() => {
    const frame = canvasFrameRef.current;

    if (!frame || !selectedMap) {
      return;
    }

    const handleFrameWheel = (event: WheelEvent) => {
      const svg = svgRef.current;

      if (!svg || shouldBypassWheelZoom(event.target) || event.deltaY === 0) {
        return;
      }

      const multiplier = event.deltaY < 0 ? 0.88 : 1.12;
      const clientPoint = {
        clientX: event.clientX,
        clientY: event.clientY,
      };

      event.preventDefault();

      setViewport((current) => {
        if (!current) {
          return current;
        }

        return zoomViewportAt(
          current,
          selectedMap,
          multiplier,
          getSvgPoint(svg, clientPoint, current),
        );
      });
    };

    frame.addEventListener('wheel', handleFrameWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      frame.removeEventListener('wheel', handleFrameWheel, true);
    };
  }, [selectedMap]);

  async function reloadCurrentMapFeatures(mapId: number, preserveSelectionId?: number | null) {
    const nextFeatures = await window.worldForge.listMapFeatures({
      mapId,
      asOfTick: tick,
    });
    setMapFeatures(nextFeatures);

    if (preserveSelectionId !== undefined) {
      setSelectedFeatureId(
        preserveSelectionId !== null && nextFeatures.some((feature) => feature.id === preserveSelectionId)
          ? preserveSelectionId
          : null,
      );
    }
  }

  async function handleCreateMap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingMap(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createMap({
        name: createMapForm.name,
        displayKind: createMapForm.displayKind,
        themePreset: createMapForm.themePreset,
        focusLocationId:
          createMapForm.focusLocationId === '' ? null : Number(createMapForm.focusLocationId),
        parentMapId: createMapForm.parentMapId === '' ? null : Number(createMapForm.parentMapId),
        imageAssetPath: createMapForm.imageAssetPath || null,
        canvasWidth: createMapForm.canvasWidth,
        canvasHeight: createMapForm.canvasHeight,
      });
      setMaps((current) => [created, ...current]);
      setAnchorCache((current) => ({ ...current, [created.id]: [] }));
      setSelectedMapId(created.id);
      setCreateMapForm(createEmptyMapForm());
      setAdminMode('edit');
      setActiveDrawer('admin');
      await loadSidebarData(committedTick);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingMap(false);
    }
  }

  async function handleUpdateMap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMap) {
      return;
    }

    setIsSavingMap(true);
    setErrorMessage(null);

    try {
      const updated = await window.worldForge.updateMap({
        id: selectedMap.id,
        name: editMapForm.name,
        displayKind: editMapForm.displayKind,
        themePreset: editMapForm.themePreset,
        focusLocationId: editMapForm.focusLocationId === '' ? null : Number(editMapForm.focusLocationId),
        parentMapId: editMapForm.parentMapId === '' ? null : Number(editMapForm.parentMapId),
        imageAssetPath: editMapForm.imageAssetPath || null,
        canvasWidth: editMapForm.canvasWidth,
        canvasHeight: editMapForm.canvasHeight,
      });
      setMaps((current) => current.map((map) => (map.id === updated.id ? updated : map)));
      setSelectedMap(updated);
      setViewport(clampViewport(viewport ?? createFullViewport(updated), updated));
      setAdminMode('edit');
      await loadSidebarData(committedTick);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingMap(false);
    }
  }

  async function handlePickMapImage(target: 'create' | 'edit') {
    try {
      const imagePath = await window.worldForge.pickMapImage();

      if (!imagePath) {
        return;
      }

      if (target === 'create') {
        setCreateMapForm((current) => ({
          ...current,
          imageAssetPath: imagePath,
        }));
        return;
      }

      setEditMapForm((current) => ({
        ...current,
        imageAssetPath: imagePath,
      }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleCreateFeature(geometry: MapGeometry) {
    if (!selectedMap) {
      return;
    }

    setIsSavingFeature(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createMapFeature({
        mapId: selectedMap.id,
        featureKind: geometry.type,
        featureRole: createFeatureForm.featureRole,
        label: createFeatureForm.label,
        locationId: createFeatureForm.locationId === '' ? null : Number(createFeatureForm.locationId),
        eventId: createFeatureForm.eventId === '' ? null : Number(createFeatureForm.eventId),
        sourceEventId:
          createFeatureForm.sourceEventId === '' ? null : Number(createFeatureForm.sourceEventId),
        geometry,
        style: buildStyle(createFeatureForm),
        effectiveTick: createFeatureForm.effectiveTick,
      });

      await refreshTimeline();
      await reloadCurrentMapFeatures(selectedMap.id, created.id);
      setCreateFeatureForm((current) => ({
        ...applyFeaturePreset(
          createFeatureFormState(
            selectedMap.themePreset,
            committedTick,
            current.featureRole,
            current.featureKind,
          ),
          current.featureRole,
          selectedMap.themePreset,
          current.featureKind,
        ),
        effectiveTick: current.effectiveTick,
        featureKind: current.featureKind,
        featureRole: current.featureRole,
      }));
      resetEditorState({
        selectedFeatureId: created.id,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingFeature(false);
    }
  }

  async function handleSaveSelectedFeature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFeature || !selectedFeatureGeometry || !selectedMap) {
      return;
    }

    setIsSavingFeature(true);
    setErrorMessage(null);

    try {
      const updated = await window.worldForge.updateMapFeatureVersion({
        id: selectedFeature.id,
        mapId: selectedMap.id,
        featureKind: selectedFeature.featureKind,
        featureRole: editFeatureForm.featureRole,
        label: editFeatureForm.label,
        locationId: editFeatureForm.locationId === '' ? null : Number(editFeatureForm.locationId),
        eventId: editFeatureForm.eventId === '' ? null : Number(editFeatureForm.eventId),
        sourceEventId:
          editFeatureForm.sourceEventId === '' ? null : Number(editFeatureForm.sourceEventId),
        geometry: selectedFeatureGeometry,
        style: buildStyle(editFeatureForm),
        effectiveTick: editFeatureForm.effectiveTick,
      });
      await refreshTimeline();
      setMapFeatures((current) =>
        current.map((feature) => (feature.id === updated.id ? updated : feature)),
      );
      resetEditorState({
        selectedFeatureId: selectedFeature.id,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingFeature(false);
    }
  }

  async function handleDeleteSelectedFeature() {
    if (!selectedFeature || !selectedMap) {
      return;
    }

    if (!window.confirm('End this map feature at the selected effective tick?')) {
      return;
    }

    setIsSavingFeature(true);
    setErrorMessage(null);

    try {
      await window.worldForge.deleteMapFeature({
        id: selectedFeature.id,
        effectiveTick: editFeatureForm.effectiveTick,
      });
      await refreshTimeline();
      await reloadCurrentMapFeatures(selectedMap.id, null);
      resetEditorState({ selectedFeatureId: null });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingFeature(false);
    }
  }

  async function handleUpsertAnchor(point: Point) {
    if (!selectedMap || anchorLocationId === '') {
      return;
    }

    setIsSavingAnchor(true);
    setErrorMessage(null);

    try {
      const anchor = await window.worldForge.upsertMapAnchor({
        mapId: selectedMap.id,
        locationId: Number(anchorLocationId),
        x: point.x,
        y: point.y,
      });

      setAnchorCache((current) => {
        const nextAnchors = [...(current[selectedMap.id] ?? []).filter((item) => item.locationId !== anchor.locationId), anchor]
          .sort((left, right) => left.location.name.localeCompare(right.location.name));
        return {
          ...current,
          [selectedMap.id]: nextAnchors,
        };
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingAnchor(false);
    }
  }

  async function handleDeleteAnchor(id: number) {
    if (!selectedMap) {
      return;
    }

    setIsSavingAnchor(true);
    setErrorMessage(null);

    try {
      await window.worldForge.deleteMapAnchor({ id });
      setAnchorCache((current) => ({
        ...current,
        [selectedMap.id]: (current[selectedMap.id] ?? []).filter((anchor) => anchor.id !== id),
      }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingAnchor(false);
    }
  }

  function handleCanvasClick(event: ReactMouseEvent<SVGSVGElement>) {
    if (!selectedMap || !viewport || !svgRef.current || isPanning) {
      return;
    }

    const point = resolveCanvasPoint(getSvgPoint(svgRef.current, event, viewport));

    if (tool === 'select') {
      resetEditorState({ selectedFeatureId: null });
      return;
    }

    if (tool === 'anchor') {
      void handleUpsertAnchor(point);
      return;
    }

    if (!isFeatureTool(tool)) {
      return;
    }

    const featureKind = getFeatureKindForRole(tool, createFeatureForm.featureKind);

    if (featureKind === 'marker') {
      void handleCreateFeature({
        type: 'marker',
        point,
      });
      return;
    }

    commitEditorSnapshot({
      draftPoints: [...draftPoints, point],
      liveGeometry: null,
      selectedFeatureId: null,
      selectedVertexIndex: null,
    });
  }

  function handleMouseDown(event: ReactMouseEvent<SVGSVGElement>) {
    if (tool !== 'pan' || !selectedMap || !viewport || !svgRef.current) {
      return;
    }

    const point = getSvgPoint(svgRef.current, event, viewport);
    setIsPanning(true);
    setPanOrigin({
      pointer: point,
      viewport,
    });
  }

  function handleMouseMove(event: ReactMouseEvent<SVGSVGElement>) {
    if (!selectedMap || !svgRef.current || !viewport || !isPanning || !panOrigin) {
      return;
    }

    const point = getSvgPoint(svgRef.current, event, viewport);
    const deltaX = panOrigin.pointer.x - point.x;
    const deltaY = panOrigin.pointer.y - point.y;

    setViewport(
      clampViewport(
        {
          ...panOrigin.viewport,
          x: panOrigin.viewport.x + deltaX,
          y: panOrigin.viewport.y + deltaY,
        },
        selectedMap,
      ),
    );
  }

  function handleMouseUp() {
    setIsPanning(false);
    setPanOrigin(null);
  }

  function handleZoom(multiplier: number, resolveFocusPoint?: (viewport: Viewport) => Point | undefined) {
    if (!selectedMap) {
      return;
    }

    setViewport((current) =>
      current ? zoomViewportAt(current, selectedMap, multiplier, resolveFocusPoint?.(current)) : current,
    );
  }

  async function handleFinishDraft() {
    if (!selectedMap || !isFeatureTool(tool)) {
      return;
    }

    const featureKind = getFeatureKindForRole(tool, createFeatureForm.featureKind);

    if (featureKind === 'marker') {
      return;
    }

    const geometry = defaultGeometryForTool(featureKind, draftPoints);

    if (!geometry) {
      return;
    }

    await handleCreateFeature(geometry);
  }

  function handleToolChange(nextTool: MapTool) {
    setTool(nextTool);
    resetEditorState({
      selectedFeatureId:
        nextTool === 'select' || nextTool === 'pan' ? selectedFeatureId : null,
    });

    if (isFeatureTool(nextTool)) {
      setCreateFeatureForm((current) => ({
        ...applyFeaturePreset(
          current,
          nextTool,
          selectedMap?.themePreset ?? createMapForm.themePreset,
          current.featureKind,
        ),
        effectiveTick: current.effectiveTick,
      }));
    }
  }

  const confirmMapNavigation = useCallback(() => {
    if (!isMapAdminDirty) {
      return true;
    }

    return window.confirm(
      adminMode === 'create'
        ? 'Discard this new map draft?'
        : 'Discard unsaved changes to this map?',
    );
  }, [adminMode, isMapAdminDirty]);

  const openMapSettings = useCallback(() => {
    if (activeDrawer === 'admin') {
      if (!confirmMapNavigation()) {
        return;
      }

      setActiveDrawer('none');
      setAdminMode('browse');
      return;
    }

    setActiveDrawer('admin');
    setAdminMode('browse');
  }, [activeDrawer, confirmMapNavigation]);

  const openCreateMapAdmin = useCallback(() => {
    if (!confirmMapNavigation()) {
      return;
    }

    setCreateMapForm(createEmptyMapForm());
    setActiveDrawer('admin');
    setAdminMode('create');
  }, [confirmMapNavigation]);

  const openEditMapAdmin = useCallback(() => {
    if (!selectedMap || !confirmMapNavigation()) {
      return;
    }

    setEditMapForm(toMapForm(selectedMap));
    setActiveDrawer('admin');
    setAdminMode('edit');
  }, [confirmMapNavigation, selectedMap]);

  const handleMapRecordSelect = useCallback(
    (mapId: number) => {
      if (mapId === selectedMapId) {
        return;
      }

      if (!confirmMapNavigation()) {
        return;
      }

      setSelectedMapId(mapId);
      resetEditorState({
        selectedFeatureId: null,
      });
    },
    [confirmMapNavigation, resetEditorState, selectedMapId, setSelectedMapId],
  );

  function handleFeatureSelect(featureId: number) {
    setSelectedFeatureId(featureId);
    setActiveDrawer('inspector');
  }

  function handleJumpToRelatedMap(map: MapRecord) {
    const locationId = selectedFeature?.locationId;
    if (!locationId) {
      setSelectedMapId(map.id);
      return;
    }

    const targetAnchor = (anchorCache[map.id] ?? []).find((anchor) => anchor.locationId === locationId);
    setSelectedMapId(map.id);

    if (targetAnchor) {
      setViewport((current) =>
        centerViewportOn(
          map,
          { x: targetAnchor.x, y: targetAnchor.y },
          current ?? createFullViewport(map),
        ),
      );
    }
  }

  function handleInsertSelectedVertex(point: Point) {
    if (!selectedFeature || !selectedFeatureGeometry || selectedFeatureGeometry.type === 'marker') {
      return;
    }

    commitEditorSnapshot({
      liveGeometry: insertGeometryPoint(selectedFeatureGeometry, point),
      selectedFeatureId: selectedFeature.id,
      selectedVertexIndex: null,
    });
  }

  function handleRemoveSelectedVertex() {
    if (!selectedFeature || !selectedFeatureGeometry || selectedVertexIndex === null) {
      return;
    }

    const nextGeometry = removeGeometryPoint(selectedFeatureGeometry, selectedVertexIndex);

    if (!nextGeometry) {
      return;
    }

    commitEditorSnapshot({
      liveGeometry: nextGeometry,
      selectedFeatureId: selectedFeature.id,
      selectedVertexIndex: null,
    });
  }

  function handleClearSelection() {
    resetEditorState({ selectedFeatureId: null });
  }

  function handleResetViewport() {
    if (!selectedMap) {
      return;
    }

    setViewport(createFullViewport(selectedMap));
  }

  function handleCenterOnSelection() {
    if (!selectedMap || !selectedFeatureGeometry) {
      return;
    }

    const points = getGeometryPoints(selectedFeatureGeometry);
    const focusPoint = points[0];

    if (!focusPoint) {
      return;
    }

    setViewport((current) =>
      centerViewportOn(selectedMap, focusPoint, current ?? createFullViewport(selectedMap)),
    );
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (isMod && key === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (draftPoints.length > 0) {
          resetEditorState({ selectedFeatureId: null });
          return;
        }

        if (liveGeometry) {
          resetEditorState({ selectedFeatureId });
          return;
        }

        if (selectedFeatureId !== null) {
          handleClearSelection();
        }
        return;
      }

      if (event.key === 'Enter' && isDraftCapableTool(tool, createFeatureForm.featureKind)) {
        event.preventDefault();
        void handleFinishDraft();
        return;
      }

      if (event.key !== 'Backspace' && event.key !== 'Delete') {
        return;
      }

      if (selectedVertexIndex !== null) {
        event.preventDefault();
        handleRemoveSelectedVertex();
        return;
      }

      if (selectedFeatureId !== null) {
        event.preventDefault();
        void handleDeleteSelectedFeature();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    createFeatureForm.featureKind,
    draftPoints.length,
    liveGeometry,
    selectedFeatureId,
    selectedVertexIndex,
    tool,
  ]);

  const activeFeatureForm = selectedFeature ? editFeatureForm : createFeatureForm;
  const compatibleFeatureRoles = getCompatibleFeatureRoles(activeFeatureForm.featureKind);
  const currentDraftFeatureKind = isFeatureTool(tool)
    ? getFeatureKindForRole(tool, createFeatureForm.featureKind)
    : createFeatureForm.featureKind;

  const featureFormCard = (
    <div className="linked-card">
      <p className="card-title">{selectedFeature ? 'Selected Feature' : 'Feature Draft'}</p>
      <form className="form" onSubmit={selectedFeature ? handleSaveSelectedFeature : undefined}>
        <label>
          <span>Cartography Preset</span>
          <select
            onChange={(event) => {
              const nextRole = event.target.value as FeatureRole;
              const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;

              updater((current) =>
                applyFeaturePreset(
                  current,
                  nextRole,
                  selectedMap?.themePreset ?? createMapForm.themePreset,
                  current.featureKind,
                ),
              );

              if (!selectedFeature) {
                setTool(nextRole);
              }
            }}
            value={activeFeatureForm.featureRole}
          >
            {compatibleFeatureRoles.map((featureRole) => (
              <option key={featureRole} value={featureRole}>
                {toolLabels[featureRole]}
              </option>
            ))}
          </select>
        </label>

        {activeFeatureForm.featureRole === 'custom' ? (
          <label>
            <span>Geometry</span>
            <select
              onChange={(event) => {
                const nextKind = event.target.value as FeatureKind;
                const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;

                updater((current) =>
                  applyFeaturePreset(
                    current,
                    'custom',
                    selectedMap?.themePreset ?? createMapForm.themePreset,
                    nextKind,
                  ),
                );
              }}
              value={activeFeatureForm.featureKind}
            >
              <option value="marker">Marker</option>
              <option value="path">Path</option>
              <option value="polygon">Polygon</option>
              <option value="border">Border</option>
            </select>
          </label>
        ) : null}

        <label>
          <span>Label</span>
          <input
            onChange={(event) => {
              const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
              updater((current) => ({ ...current, label: event.target.value }));
            }}
            value={activeFeatureForm.label}
          />
        </label>

        <label>
          <span>Linked Place</span>
          <select
            onChange={(event) => {
              const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
              updater((current) => ({ ...current, locationId: event.target.value }));
            }}
            value={activeFeatureForm.locationId}
          >
            <option value="">No linked place</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Linked Event</span>
          <select
            onChange={(event) => {
              const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
              updater((current) => ({ ...current, eventId: event.target.value }));
            }}
            value={activeFeatureForm.eventId}
          >
            <option value="">No linked event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Source Event</span>
          <select
            onChange={(event) => {
              const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
              updater((current) => ({ ...current, sourceEventId: event.target.value }));
            }}
            value={activeFeatureForm.sourceEventId}
          >
            <option value="">No source event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.miniGrid}>
          <label>
            <span>Stroke</span>
            <input
              onChange={(event) => {
                const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                updater((current) => ({ ...current, stroke: event.target.value }));
              }}
              value={activeFeatureForm.stroke}
            />
          </label>
          <label>
            <span>Fill</span>
            <input
              disabled={activeFeatureForm.featureKind === 'path'}
              onChange={(event) => {
                const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                updater((current) => ({ ...current, fill: event.target.value }));
              }}
              value={activeFeatureForm.featureKind === 'path' ? 'none' : activeFeatureForm.fill}
            />
          </label>
          <label>
            <span>Stroke Width</span>
            <input
              min={10}
              onChange={(event) => {
                const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                updater((current) => ({
                  ...current,
                  strokeWidth: Number(event.target.value) || 10,
                }));
              }}
              type="number"
              value={activeFeatureForm.strokeWidth}
            />
          </label>
          <label>
            <span>Opacity</span>
            <input
              max={1}
              min={0}
              onChange={(event) => {
                const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                updater((current) => ({
                  ...current,
                  opacity: Number(event.target.value) || 0,
                }));
              }}
              step="0.05"
              type="number"
              value={activeFeatureForm.opacity}
            />
          </label>
          <label>
            <span>Marker Size</span>
            <input
              disabled={activeFeatureForm.featureKind !== 'marker'}
              min={20}
              onChange={(event) => {
                const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                updater((current) => ({
                  ...current,
                  markerSize: Number(event.target.value) || 20,
                }));
              }}
              type="number"
              value={activeFeatureForm.markerSize}
            />
          </label>
          <label>
            <span>Effective Tick</span>
            <input
              min={0}
              onChange={(event) => {
                const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                updater((current) => ({
                  ...current,
                  effectiveTick: Number(event.target.value) || 0,
                }));
              }}
              type="number"
              value={activeFeatureForm.effectiveTick}
            />
          </label>
        </div>

        <div className="button-row">
          <button
            className="secondary-button"
            onClick={() => {
              const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
              updater((current) =>
                applyFeaturePreset(
                  current,
                  current.featureRole,
                  selectedMap?.themePreset ?? createMapForm.themePreset,
                  current.featureKind,
                ),
              );
            }}
            type="button"
          >
            Apply Preset Style
          </button>
          {selectedFeature && selectedFeatureGeometry?.type !== 'marker' ? (
            <button
              className="secondary-button"
              disabled={selectedVertexIndex === null}
              onClick={() => {
                handleRemoveSelectedVertex();
              }}
              type="button"
            >
              Remove Vertex
            </button>
          ) : null}
        </div>

        {selectedFeature ? (
          <div className="button-row">
            <button disabled={isSavingFeature} type="submit">
              {isSavingFeature ? 'Saving...' : 'Save Feature'}
            </button>
            <button
              className="danger-button"
              disabled={isSavingFeature}
              onClick={() => {
                void handleDeleteSelectedFeature();
              }}
              type="button"
            >
              End Feature
            </button>
          </div>
        ) : (
          <p className="muted helper-text">
            Using the {toolLabels[activeFeatureForm.featureRole]} preset. Click on the canvas
            {activeFeatureForm.featureKind === 'marker'
              ? ' to place a feature'
              : ' to place draft points, then finish the shape'}
            {` at ${formatWorldTick(createFeatureForm.effectiveTick)}.`}
          </p>
        )}
      </form>
    </div>
  );

  const inspectorTitle =
    inspectorMode === 'feature'
      ? 'Feature Editor'
      : inspectorMode === 'anchor'
        ? 'Place Links'
        : 'Feature Draft';
  const overlayMetrics = useMemo(() => {
    if (!selectedMap || !viewport) {
      return null;
    }

    const featureLabel = getFeatureLabelMetrics(viewport, selectedMap);
    const anchorLabel = getAnchorLabelMetrics(viewport, selectedMap);

    return {
      featureHandle: getFeatureHandleMetrics(viewport, selectedMap),
      anchorBadge: getAnchorBadgeMetrics(viewport, selectedMap),
      draft: getDraftOverlayMetrics(viewport, selectedMap),
      featureLabel,
      anchorLabel,
      featureLabelStyle: createFeatureLabelStyle(featureLabel.fontSize, featureLabel.strokeWidth),
      anchorLabelStyle: createAnchorLabelStyle(anchorLabel.fontSize, anchorLabel.strokeWidth),
    };
  }, [selectedMap, viewport]);
  const topBarConfig = useMemo(
    () => ({
      actions: [
        {
          id: 'open-map-settings',
          label: activeDrawer === 'admin' ? 'Close Maps & Settings' : 'Open Maps & Settings',
          onSelect: openMapSettings,
          variant: 'secondary' as const,
        },
        {
          id: 'new-map',
          label: 'New Map',
          onSelect: openCreateMapAdmin,
          variant: 'primary' as const,
        },
        {
          id: 'edit-map',
          label: 'Edit Map',
          onSelect: openEditMapAdmin,
          variant: 'secondary' as const,
          disabled: selectedMap === null,
        },
      ],
      confirmNavigation: confirmMapNavigation,
      isBusy: isLoading || isSavingMap,
      modeLabel:
        activeDrawer === 'admin' && adminMode === 'create'
          ? 'Creating Map'
          : activeDrawer === 'admin' && adminMode === 'edit'
            ? 'Editing Map'
            : 'Map Workspace',
      selectionLabel: selectedMap ? `Map: ${selectedMap.name}` : 'No map selected',
    }),
    [
      activeDrawer,
      adminMode,
      confirmMapNavigation,
      isLoading,
      isSavingMap,
      openCreateMapAdmin,
      openEditMapAdmin,
      openMapSettings,
      selectedMap,
    ],
  );

  useTopBarControls(topBarConfig);

  return (
    <main className={styles['maps-layout']}>
      <div className={styles.canvasShell}>
        <div className={styles.canvasFrame} ref={canvasFrameRef}>
          {selectedMap && viewport ? (
            <>
              <svg
                ref={svgRef}
                className={clsx(
                  styles.canvas,
                  tool === 'pan' && styles.canvasPan,
                  isPanning && styles.canvasDragging,
                )}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
              >
                <defs>
                  <pattern
                    height={1000}
                    id="atlas-grid"
                    patternUnits="userSpaceOnUse"
                    width={1000}
                  >
                    <rect
                      fill={themeVisuals.gridFill}
                      height={1000}
                      width={1000}
                    />
                    <path
                      d="M 1000 0 L 0 0 0 1000"
                      fill="none"
                      stroke={themeVisuals.gridStroke}
                      strokeWidth={25}
                    />
                  </pattern>
                </defs>

                <rect
                  fill={themeVisuals.canvasFill}
                  height={selectedMap.canvasHeight}
                  width={selectedMap.canvasWidth}
                  x={0}
                  y={0}
                />
                <rect
                  fill={themeVisuals.canvasOverlay}
                  height={selectedMap.canvasHeight}
                  width={selectedMap.canvasWidth}
                  x={0}
                  y={0}
                />

                {selectedMap.displayKind === 'image' && getMapImageHref(selectedMap.imageAssetPath) ? (
                  <image
                    height={selectedMap.canvasHeight}
                    href={getMapImageHref(selectedMap.imageAssetPath)!}
                    preserveAspectRatio="none"
                    width={selectedMap.canvasWidth}
                    x={0}
                    y={0}
                  />
                ) : null}

                {showGrid ? (
                  <rect
                    fill="url(#atlas-grid)"
                    height={selectedMap.canvasHeight}
                    width={selectedMap.canvasWidth}
                  />
                ) : null}

                <rect
                  fill="none"
                  height={selectedMap.canvasHeight}
                  stroke={themeVisuals.frameStroke}
                  strokeWidth={40}
                  width={selectedMap.canvasWidth}
                  x={0}
                  y={0}
                />

                {visibleMapFeatures.map((feature) => {
                  const geometry =
                    selectedFeatureId === feature.id && selectedFeatureGeometry
                      ? selectedFeatureGeometry
                      : feature.geometry;
                  const featurePoints = getGeometryPoints(geometry);

                  return (
                    <g
                      key={feature.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleFeatureSelect(feature.id);
                      }}
                      onDoubleClick={(event) => {
                        if (selectedFeatureId !== feature.id || !selectedMap || !viewport || !svgRef.current) {
                          return;
                        }

                        event.stopPropagation();
                        handleInsertSelectedVertex(
                          resolveCanvasPoint(getSvgPoint(svgRef.current, event, viewport)),
                        );
                      }}
                    >
                      {renderFeatureShape(feature, geometry, selectedFeatureId === feature.id, viewport, selectedMap)}
                      {feature.label ? (
                        <text
                          className={styles.featureLabel}
                          style={overlayMetrics?.featureLabelStyle}
                          x={featurePoints[0]?.x ?? 0}
                          y={(featurePoints[0]?.y ?? 0) - (overlayMetrics?.featureLabel.yOffset ?? 0)}
                        >
                          {feature.label}
                        </text>
                      ) : null}
                      {selectedFeatureId === feature.id
                        ? featurePoints.map((point, index) => (
                            <circle
                              key={`${feature.id}-${index}`}
                              className={styles.handle}
                              cx={point.x}
                              cy={point.y}
                              onMouseDown={(event) => {
                                event.stopPropagation();
                                setDragVertex({
                                  featureId: feature.id,
                                  pointIndex: index,
                                });
                                setSelectedVertexIndex(index);
                                setLiveGeometry(geometry);
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedVertexIndex(index);
                              }}
                              r={overlayMetrics?.featureHandle.radius ?? 0}
                              stroke="#0b1117"
                              strokeWidth={overlayMetrics?.featureHandle.strokeWidth ?? 0}
                              fill={selectedVertexIndex === index ? '#8de1ff' : '#fff3dd'}
                            />
                          ))
                        : null}
                    </g>
                  );
                })}

                {layerVisibility.anchors
                  ? selectedMapAnchors.map((anchor) => (
                  <g key={anchor.id}>
                    <circle
                      cx={anchor.x}
                      cy={anchor.y}
                      fill="#6fd1bf"
                      opacity={0.9}
                      r={overlayMetrics?.anchorBadge.radius ?? 0}
                      stroke="#081016"
                      strokeWidth={overlayMetrics?.anchorBadge.strokeWidth ?? 0}
                    />
                    <text
                      className={styles.anchorLabel}
                      style={overlayMetrics?.anchorLabelStyle}
                      x={anchor.x + (overlayMetrics?.anchorLabel.xOffset ?? 0)}
                      y={anchor.y - (overlayMetrics?.anchorLabel.yOffset ?? 0)}
                    >
                      {anchor.location.name}
                    </text>
                  </g>
                    ))
                  : null}

                {draftPoints.length > 0 ? (
                  <g>
                    {currentDraftFeatureKind === 'path' ? (
                      <polyline
                        fill="none"
                        points={draftPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                        stroke="#8de1ff"
                        strokeWidth={overlayMetrics?.draft.strokeWidth ?? 0}
                      />
                    ) : currentDraftFeatureKind === 'polygon' || currentDraftFeatureKind === 'border' ? (
                      <polygon
                        fill="rgba(141, 225, 255, 0.14)"
                        points={draftPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                        stroke="#8de1ff"
                        strokeWidth={overlayMetrics?.draft.strokeWidth ?? 0}
                      />
                    ) : null}
                    {draftPoints.map((point, index) => (
                      <circle
                        key={`draft-${index}`}
                        cx={point.x}
                        cy={point.y}
                        fill="#8de1ff"
                        r={overlayMetrics?.draft.pointRadius ?? 0}
                      />
                    ))}
                  </g>
                ) : null}
              </svg>
            </>
          ) : (
            <div className={styles.canvasEmptyState}>
              <p className="muted">Create or select a map to start drawing.</p>
            </div>
          )}

          <div className={styles.overlayLayer}>
            <div className={styles.toolbarRegion}>
              <div className={styles.toolbar}>
                <span className={styles.workspaceLabel}>
                  {selectedMap ? selectedMap.name : 'Map Workspace'}
                </span>
                {([
                  'select',
                  'pan',
                  'custom',
                  'settlement',
                  'river',
                  'road',
                  'mountainRange',
                  'forest',
                  'regionBorder',
                  'anchor',
                ] as MapTool[]).map((item) => (
                  <button
                    key={item}
                    className={clsx(styles.toolButton, tool === item && styles.toolButtonActive)}
                    data-map-wheel-passthrough="true"
                    onClick={() => {
                      handleToolChange(item);
                    }}
                    type="button"
                  >
                    {toolLabels[item]}
                  </button>
                ))}
                <button
                  className="secondary-button"
                  data-map-wheel-passthrough="true"
                  disabled={editorHistory.past.length === 0}
                  onClick={handleUndo}
                  type="button"
                >
                  Undo
                </button>
                <button
                  className="secondary-button"
                  data-map-wheel-passthrough="true"
                  disabled={editorHistory.future.length === 0}
                  onClick={handleRedo}
                  type="button"
                >
                  Redo
                </button>
                <button
                  className="secondary-button"
                  data-map-wheel-passthrough="true"
                  onClick={() => handleZoom(0.8)}
                  type="button"
                >
                  Zoom In
                </button>
                <button
                  className="secondary-button"
                  data-map-wheel-passthrough="true"
                  onClick={() => handleZoom(1.25)}
                  type="button"
                >
                  Zoom Out
                </button>
                <button
                  className="secondary-button"
                  data-map-wheel-passthrough="true"
                  onClick={handleResetViewport}
                  type="button"
                >
                  Fit Map
                </button>
                <button
                  className="secondary-button"
                  data-map-wheel-passthrough="true"
                  disabled={!selectedFeatureGeometry}
                  onClick={handleCenterOnSelection}
                  type="button"
                >
                  Center Selection
                </button>
                <button
                  className={clsx(styles.toolButton, showGrid && styles.toolButtonActive)}
                  data-map-wheel-passthrough="true"
                  onClick={() => {
                    setShowGrid((current) => !current);
                  }}
                  type="button"
                >
                  Grid
                </button>
                <button
                  className={clsx(styles.toolButton, snapToGrid && styles.toolButtonActive)}
                  data-map-wheel-passthrough="true"
                  onClick={() => {
                    setSnapToGrid((current) => !current);
                  }}
                  type="button"
                >
                  Snap
                </button>
                {selectedFeatureId !== null ? (
                  <button
                    className="secondary-button"
                    data-map-wheel-passthrough="true"
                    onClick={handleClearSelection}
                    type="button"
                  >
                    Clear Selection
                  </button>
                ) : null}
                {isDraftCapableTool(tool, createFeatureForm.featureKind) ? (
                  <>
                    <button
                      className="secondary-button"
                      data-map-wheel-passthrough="true"
                      disabled={draftPoints.length === 0 || isSavingFeature}
                      onClick={() => {
                        void handleFinishDraft();
                      }}
                      type="button"
                    >
                      Finish Shape
                    </button>
                    <button
                      className="secondary-button"
                      data-map-wheel-passthrough="true"
                      disabled={draftPoints.length === 0}
                      onClick={() => {
                        resetEditorState({ selectedFeatureId: null });
                      }}
                      type="button"
                    >
                      Cancel Draft
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {activeDrawer === 'admin' ? (
              <div className={clsx(styles.drawerRegion, styles.drawerRegionStart)}>
                <div className={styles.drawerPanelShell} data-map-wheel-passthrough="true">
                  <Panel
                    badge={
                      <button
                        className="secondary-button"
                        onClick={() => {
                          openMapSettings();
                        }}
                        type="button"
                      >
                        Close
                      </button>
                    }
                    className={clsx('details-panel', styles.drawerPanel)}
                    title="Maps & Settings"
                  >
                    <div className={styles.drawerStack}>
                      <div className="linked-card">
                        <p className="card-title">Maps</p>
                        <p className={`muted helper-text ${styles.panelText}`}>
                          Create vector maps or image-backed maps and link places to positions on each map.
                        </p>

                        {isLoading ? <p className="muted">Loading maps...</p> : null}
                        {!isLoading && maps.length === 0 ? (
                          <p className="muted helper-text">No maps yet.</p>
                        ) : null}

                        <ul className="entity-list">
                          {maps.map((map) => (
                            <li key={map.id}>
                              <button
                                className={clsx('entity-list-item', selectedMapId === map.id && 'active')}
                                onClick={() => {
                                  handleMapRecordSelect(map.id);
                                }}
                                type="button"
                              >
                                <div className="entity-list-heading">
                                  <strong>{map.name}</strong>
                                  <div className="entity-list-pills">
                                    <span className="pill small">{map.displayKind}</span>
                                    <span className="pill small">{themePresetLabels[map.themePreset]}</span>
                                  </div>
                                </div>
                                <span>{map.focusLocation?.name ?? 'Whole world'}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="linked-card">
                        <p className="card-title">Display & Layers</p>
                        <div className={styles.layerToggleGrid}>
                          <label className={styles.layerToggle}>
                            <input
                              checked={showGrid}
                              onChange={(event) => {
                                setShowGrid(event.target.checked);
                              }}
                              type="checkbox"
                            />
                            <span>Show grid</span>
                          </label>
                          <label className={styles.layerToggle}>
                            <input
                              checked={snapToGrid}
                              onChange={(event) => {
                                setSnapToGrid(event.target.checked);
                              }}
                              type="checkbox"
                            />
                            <span>Snap to grid</span>
                          </label>
                          {(['anchors', 'custom', 'settlement', 'river', 'road', 'mountainRange', 'forest', 'regionBorder'] as Array<keyof LayerVisibility>).map((layerKey) => (
                            <label className={styles.layerToggle} key={layerKey}>
                              <input
                                checked={layerVisibility[layerKey]}
                                onChange={(event) => {
                                  setLayerVisibility((current) => ({
                                    ...current,
                                    [layerKey]: event.target.checked,
                                  }));
                                }}
                                type="checkbox"
                              />
                              <span>
                                {layerKey === 'anchors'
                                  ? 'Place links'
                                  : toolLabels[layerKey]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {adminMode === 'browse' ? (
                        <div className="linked-card">
                          <p className="card-title">Map Actions</p>
                          <p className={`muted helper-text ${styles.panelText}`}>
                            Use the top bar to start a new map or open the selected map in edit mode.
                          </p>
                        </div>
                      ) : null}

                      {adminMode === 'edit' && selectedMap ? (
                        <div className="linked-card">
                          <div className={clsx('entity-list-heading', styles.drawerSectionHeader)}>
                            <p className="card-title">Selected Map Settings</p>
                            <span className="pill small">#{selectedMap.id}</span>
                          </div>

                          <form className="form" onSubmit={handleUpdateMap}>
                            <label>
                              <span>Name</span>
                              <input
                                onChange={(event) => {
                                  setEditMapForm((current) => ({ ...current, name: event.target.value }));
                                }}
                                required
                                value={editMapForm.name}
                              />
                            </label>

                            <label>
                              <span>Display</span>
                              <select
                                onChange={(event) => {
                                  setEditMapForm((current) => ({
                                    ...current,
                                    displayKind: event.target.value as DisplayKind,
                                  }));
                                }}
                                value={editMapForm.displayKind}
                              >
                                <option value="vector">Vector</option>
                                <option value="image">Image-backed</option>
                              </select>
                            </label>

                            <label>
                              <span>Theme</span>
                              <select
                                onChange={(event) => {
                                  setEditMapForm((current) => ({
                                    ...current,
                                    themePreset: event.target.value as ThemePreset,
                                  }));
                                }}
                                value={editMapForm.themePreset}
                              >
                                {(['parchment', 'terrain', 'political'] as ThemePreset[]).map((themePreset) => (
                                  <option key={themePreset} value={themePreset}>
                                    {themePresetLabels[themePreset]}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label>
                              <span>Focus Place</span>
                              <select
                                onChange={(event) => {
                                  setEditMapForm((current) => ({
                                    ...current,
                                    focusLocationId: event.target.value,
                                  }));
                                }}
                                value={editMapForm.focusLocationId}
                              >
                                <option value="">Whole world</option>
                                {locations.map((location) => (
                                  <option key={location.id} value={location.id}>
                                    {location.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label>
                              <span>Parent Map</span>
                              <select
                                onChange={(event) => {
                                  setEditMapForm((current) => ({
                                    ...current,
                                    parentMapId: event.target.value,
                                  }));
                                }}
                                value={editMapForm.parentMapId}
                              >
                                <option value="">No parent</option>
                                {maps
                                  .filter((map) => map.id !== selectedMap.id)
                                  .map((map) => (
                                    <option key={map.id} value={map.id}>
                                      {map.name}
                                    </option>
                                  ))}
                              </select>
                            </label>

                            {editMapForm.displayKind === 'image' ? (
                              <label>
                                <span>Image File Path</span>
                                <input readOnly value={editMapForm.imageAssetPath} />
                              </label>
                            ) : null}

                            {editMapForm.displayKind === 'image' ? (
                              <div className="button-row">
                                <button
                                  className="secondary-button"
                                  onClick={() => {
                                    void handlePickMapImage('edit');
                                  }}
                                  type="button"
                                >
                                  Choose Image
                                </button>
                                <button
                                  className="secondary-button"
                                  onClick={() => {
                                    setEditMapForm((current) => ({
                                      ...current,
                                      imageAssetPath: '',
                                    }));
                                  }}
                                  type="button"
                                >
                                  Clear
                                </button>
                              </div>
                            ) : null}

                            <div className={styles.miniGrid}>
                              <label>
                                <span>Width</span>
                                <input
                                  min={1000}
                                  onChange={(event) => {
                                    setEditMapForm((current) => ({
                                      ...current,
                                      canvasWidth: Number(event.target.value) || 1000,
                                    }));
                                  }}
                                  type="number"
                                  value={editMapForm.canvasWidth}
                                />
                              </label>
                              <label>
                                <span>Height</span>
                                <input
                                  min={1000}
                                  onChange={(event) => {
                                    setEditMapForm((current) => ({
                                      ...current,
                                      canvasHeight: Number(event.target.value) || 1000,
                                    }));
                                  }}
                                  type="number"
                                  value={editMapForm.canvasHeight}
                                />
                              </label>
                            </div>

                            <button disabled={isSavingMap} type="submit">
                              {isSavingMap ? 'Saving...' : 'Save Map'}
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {adminMode === 'create' ? (
                        <div className="linked-card">
                        <p className="card-title">Create Map</p>
                        <form className="form" onSubmit={handleCreateMap}>
                          <label>
                            <span>Name</span>
                            <input
                              onChange={(event) => {
                                setCreateMapForm((current) => ({ ...current, name: event.target.value }));
                              }}
                              placeholder="Western Continent"
                              required
                              value={createMapForm.name}
                            />
                          </label>

                          <label>
                            <span>Display</span>
                            <select
                              onChange={(event) => {
                                setCreateMapForm((current) => ({
                                  ...current,
                                  displayKind: event.target.value as DisplayKind,
                                }));
                              }}
                              value={createMapForm.displayKind}
                            >
                              <option value="vector">Vector</option>
                              <option value="image">Image-backed</option>
                            </select>
                          </label>

                          <label>
                            <span>Theme</span>
                            <select
                              onChange={(event) => {
                                setCreateMapForm((current) => ({
                                  ...current,
                                  themePreset: event.target.value as ThemePreset,
                                }));
                              }}
                              value={createMapForm.themePreset}
                            >
                              {(['parchment', 'terrain', 'political'] as ThemePreset[]).map((themePreset) => (
                                <option key={themePreset} value={themePreset}>
                                  {themePresetLabels[themePreset]}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span>Focus Place</span>
                            <select
                              onChange={(event) => {
                                setCreateMapForm((current) => ({
                                  ...current,
                                  focusLocationId: event.target.value,
                                }));
                              }}
                              value={createMapForm.focusLocationId}
                            >
                              <option value="">Whole world</option>
                              {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                  {location.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            <span>Parent Map</span>
                            <select
                              onChange={(event) => {
                                setCreateMapForm((current) => ({
                                  ...current,
                                  parentMapId: event.target.value,
                                }));
                              }}
                              value={createMapForm.parentMapId}
                            >
                              <option value="">No parent</option>
                              {maps.map((map) => (
                                <option key={map.id} value={map.id}>
                                  {map.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          {createMapForm.displayKind === 'image' ? (
                            <label>
                              <span>Image File Path</span>
                              <input
                                placeholder="/absolute/path/to/render.png"
                                readOnly
                                required
                                value={createMapForm.imageAssetPath}
                              />
                            </label>
                          ) : null}

                          {createMapForm.displayKind === 'image' ? (
                            <div className="button-row">
                              <button
                                className="secondary-button"
                                onClick={() => {
                                  void handlePickMapImage('create');
                                }}
                                type="button"
                              >
                                Choose Image
                              </button>
                              <button
                                className="secondary-button"
                                onClick={() => {
                                  setCreateMapForm((current) => ({
                                    ...current,
                                    imageAssetPath: '',
                                  }));
                                }}
                                type="button"
                              >
                                Clear
                              </button>
                            </div>
                          ) : null}

                          <div className={styles.miniGrid}>
                            <label>
                              <span>Width</span>
                              <input
                                min={1000}
                                onChange={(event) => {
                                  setCreateMapForm((current) => ({
                                    ...current,
                                    canvasWidth: Number(event.target.value) || 1000,
                                  }));
                                }}
                                type="number"
                                value={createMapForm.canvasWidth}
                              />
                            </label>
                            <label>
                              <span>Height</span>
                              <input
                                min={1000}
                                onChange={(event) => {
                                  setCreateMapForm((current) => ({
                                    ...current,
                                    canvasHeight: Number(event.target.value) || 1000,
                                  }));
                                }}
                                type="number"
                                value={createMapForm.canvasHeight}
                              />
                            </label>
                          </div>

                          <button disabled={isSavingMap} type="submit">
                            {isSavingMap ? 'Creating...' : 'Create Map'}
                          </button>
                        </form>
                        </div>
                      ) : null}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : null}

            {isInspectorDrawerOpen ? (
              <div className={clsx(styles.drawerRegion, styles.drawerRegionEnd)}>
                <div className={styles.drawerPanelShell} data-map-wheel-passthrough="true">
                  <Panel
                    badge={
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setActiveDrawer(selectedMapId === null ? 'admin' : 'none');
                        }}
                        type="button"
                      >
                        Close
                      </button>
                    }
                    className={clsx('details-panel', styles.drawerPanel)}
                    title={inspectorTitle}
                  >
                    <div className={styles.drawerStack}>
                      {inspectorMode === 'feature' ? (
                        <>
                          {featureFormCard}

                          {relatedMaps.length > 0 ? (
                            <div className="linked-card">
                              <p className="card-title">Related Maps</p>
                              <div className={styles.relatedList}>
                                {relatedMaps.map((map) => (
                                  <div className="entity-list-item" key={map.id}>
                                    <div className="entity-list-heading">
                                      <strong>{map.name}</strong>
                                      <span className="pill small">{map.displayKind}</span>
                                    </div>
                                    <span>{map.focusLocation?.name ?? 'Whole world'}</span>
                                    <button
                                      className="secondary-button"
                                      onClick={() => {
                                        handleJumpToRelatedMap(map);
                                      }}
                                      type="button"
                                    >
                                      Open Map
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {selectedFeature && selectedFeature.locationId !== null ? (
                            <EntityLinksPanel
                              entityId={selectedFeature.locationId}
                              entityKind="location"
                              emptyMessage="This feature is not linked to a place."
                              title="Linked Place Files"
                            />
                          ) : null}

                          {selectedFeature && selectedFeature.eventId !== null ? (
                            <EntityLinksPanel
                              entityId={selectedFeature.eventId}
                              entityKind="event"
                              emptyMessage="This feature is not linked to an event."
                              title="Linked Event Files"
                            />
                          ) : null}
                        </>
                      ) : null}

                      {inspectorMode === 'anchor' && selectedMap ? (
                        <>
                          <div className="linked-card">
                            <p className="card-title">Place Link Target</p>
                            <label>
                              <span>Location</span>
                              <select
                                onChange={(event) => {
                                  setAnchorLocationId(event.target.value);
                                }}
                                value={anchorLocationId}
                              >
                                <option value="">Choose a place</option>
                                {locations.map((location) => (
                                  <option key={location.id} value={location.id}>
                                    {location.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="muted helper-text">
                              Pick a place here, then click the canvas to place or move its linked position.
                            </p>
                          </div>

                          <div className="linked-card">
                            <p className="card-title">Place Links On This Map</p>
                            <div className={styles.relatedList}>
                              {selectedMapAnchors.length === 0 ? (
                                <p className="muted helper-text">No place links yet.</p>
                              ) : (
                                selectedMapAnchors.map((anchor) => (
                                  <div className="entity-list-item" key={anchor.id}>
                                    <div className="entity-list-heading">
                                      <strong>{anchor.location.name}</strong>
                                      <span className="pill small">
                                        {anchor.x}, {anchor.y}
                                      </span>
                                    </div>
                                    <div className="button-row">
                                      <button
                                        className="secondary-button"
                                        onClick={() => {
                                          setViewport((current) =>
                                            centerViewportOn(
                                              selectedMap,
                                              { x: anchor.x, y: anchor.y },
                                              current ?? createFullViewport(selectedMap),
                                            ),
                                          );
                                        }}
                                        type="button"
                                      >
                                        Center
                                      </button>
                                      <button
                                        className="danger-button"
                                        disabled={isSavingAnchor}
                                        onClick={() => {
                                          void handleDeleteAnchor(anchor.id);
                                        }}
                                        type="button"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      ) : null}

                      {inspectorMode === 'draft' ? featureFormCard : null}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.canvasMeta}>
          <span className="pill subtle">Tick {formatWorldTick(tick, 'short')}</span>
          <span className="pill subtle">{mapFeatures.length} active features</span>
          <span className="pill subtle">{selectedMapAnchors.length} place links</span>
          {selectedMap ? (
            <span className="pill subtle">{themePresetLabels[selectedMap.themePreset]} theme</span>
          ) : null}
          {showGrid ? <span className="pill subtle">Grid on</span> : null}
          {snapToGrid ? <span className="pill subtle">Snap on</span> : null}
          {tool === 'anchor' ? (
            <span className="pill highlight">Place link target: {selectedAnchorLocationName}</span>
          ) : null}
        </div>
      </div>
    </main>
  );
}
