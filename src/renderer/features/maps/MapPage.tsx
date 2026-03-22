import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type FormEvent,
} from 'react';
import clsx from 'clsx';
import { EntityLinksPanel } from '@renderer/components/EntityLinksPanel';
import { Panel } from '@renderer/components/Panel';
import { getErrorMessage } from '@renderer/lib/forms';
import { useEntityStore } from '@renderer/store/entityStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import type { Event } from '@shared/event';
import type { Location } from '@shared/location';
import type {
  MapAnchor,
  MapFeature,
  MapGeometry,
  MapRecord,
  MapStyle,
} from '@shared/map';
import { formatWorldTick } from '@shared/temporal';
import styles from './MapPage.module.css';

type DisplayKind = MapRecord['displayKind'];
type FeatureKind = MapFeature['featureKind'];
type Tool = 'select' | 'pan' | 'anchor' | FeatureKind;
type Point = { x: number; y: number };
type Viewport = { x: number; y: number; width: number; height: number };
type MapFormState = {
  name: string;
  displayKind: DisplayKind;
  focusLocationId: string;
  parentMapId: string;
  imageAssetPath: string;
  canvasWidth: number;
  canvasHeight: number;
};
type FeatureFormState = {
  featureKind: FeatureKind;
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

const toolLabels: Record<Tool, string> = {
  select: 'Select',
  pan: 'Pan',
  marker: 'Marker',
  path: 'Path',
  polygon: 'Polygon',
  border: 'Boundary',
  anchor: 'Place Link',
};

function createEmptyMapForm(): MapFormState {
  return {
    name: '',
    displayKind: 'vector',
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
    focusLocationId: map.focusLocationId === null ? '' : String(map.focusLocationId),
    parentMapId: map.parentMapId === null ? '' : String(map.parentMapId),
    imageAssetPath: map.imageAssetPath ?? '',
    canvasWidth: map.canvasWidth,
    canvasHeight: map.canvasHeight,
  };
}

function createEmptyFeatureForm(defaultTick: number): FeatureFormState {
  return {
    featureKind: 'marker',
    label: '',
    locationId: '',
    eventId: '',
    sourceEventId: '',
    stroke: '#f7c46c',
    fill: '#f7c46c22',
    strokeWidth: 120,
    opacity: 0.92,
    markerSize: 260,
    effectiveTick: defaultTick,
  };
}

function toFeatureForm(feature: MapFeature, committedTick: number): FeatureFormState {
  return {
    featureKind: feature.featureKind,
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
    fill: form.fill,
    strokeWidth: form.strokeWidth,
    opacity: form.opacity,
    markerSize: form.markerSize,
  };
}

function clampViewport(viewport: Viewport, map: MapRecord): Viewport {
  const width = Math.max(500, Math.min(viewport.width, map.canvasWidth));
  const height = Math.max(500, Math.min(viewport.height, map.canvasHeight));
  const x = Math.max(0, Math.min(viewport.x, Math.max(0, map.canvasWidth - width)));
  const y = Math.max(0, Math.min(viewport.y, Math.max(0, map.canvasHeight - height)));

  return { x, y, width, height };
}

function createFullViewport(map: MapRecord): Viewport {
  return {
    x: 0,
    y: 0,
    width: map.canvasWidth,
    height: map.canvasHeight,
  };
}

function centerViewportOn(map: MapRecord, point: Point, current: Viewport): Viewport {
  return clampViewport(
    {
      x: point.x - current.width / 2,
      y: point.y - current.height / 2,
      width: current.width,
      height: current.height,
    },
    map,
  );
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

  return {
    x: Math.round(((event.clientX - rect.left) / rect.width) * viewport.width + viewport.x),
    y: Math.round(((event.clientY - rect.top) / rect.height) * viewport.height + viewport.y),
  };
}

function renderFeatureShape(
  feature: MapFeature,
  geometry: MapGeometry,
  isSelected: boolean,
): ReactElement {
  const stroke = isSelected ? '#ffede0' : feature.style?.stroke ?? '#f7c46c';
  const fill =
    geometry.type === 'path'
      ? 'none'
      : isSelected
        ? 'rgba(255, 237, 224, 0.14)'
        : feature.style?.fill ?? '#f7c46c22';
  const strokeWidth = feature.style?.strokeWidth ?? 120;
  const opacity = feature.style?.opacity ?? 0.92;
  const markerSize = feature.style?.markerSize ?? 260;

  if (geometry.type === 'marker') {
    return (
      <circle
        cx={geometry.point.x}
        cy={geometry.point.y}
        fill={stroke}
        opacity={opacity}
        r={markerSize}
        stroke={isSelected ? '#fff6ef' : 'rgba(9, 12, 17, 0.7)'}
        strokeWidth={80}
      />
    );
  }

  const points = geometry.points.map((point) => `${point.x},${point.y}`).join(' ');

  if (geometry.type === 'path') {
    return (
      <polyline
        fill="none"
        opacity={opacity}
        points={points}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    );
  }

  return (
    <polygon
      fill={fill}
      opacity={opacity}
      points={points}
      stroke={stroke}
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  );
}

export function MapPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { selectedMapId, setSelectedMapId } = useEntityStore();
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [tool, setTool] = useState<Tool>('select');
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [anchorCache, setAnchorCache] = useState<Record<number, MapAnchor[]>>({});
  const [selectedMap, setSelectedMap] = useState<MapRecord | null>(null);
  const [mapFeatures, setMapFeatures] = useState<MapFeature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [dragVertex, setDragVertex] = useState<DragVertexState | null>(null);
  const [liveGeometry, setLiveGeometry] = useState<MapGeometry | null>(null);
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
    createEmptyFeatureForm(committedTick),
  );
  const [editFeatureForm, setEditFeatureForm] = useState<FeatureFormState>(
    createEmptyFeatureForm(committedTick),
  );
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
  const canvasPanelClassName = styles.canvasPanel ?? '';

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
        setSelectedFeatureId(null);
        setViewport(null);
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
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    }

    void loadSelectedMapData();
  }, [selectedMapId, setErrorMessage, tick]);

  useEffect(() => {
    if (!selectedFeature) {
      setLiveGeometry(null);
      return;
    }

    setEditFeatureForm(toFeatureForm(selectedFeature, committedTick));
    setLiveGeometry(null);
  }, [committedTick, selectedFeature]);

  useEffect(() => {
    if (!dragVertex || !selectedFeature || !selectedFeatureGeometry || !selectedMap || !viewport) {
      return;
    }

    const currentViewport = viewport;
    const currentDragVertex = dragVertex;
    const baseGeometry = selectedFeatureGeometry;

    function handleMouseMove(event: MouseEvent) {
      if (!svgRef.current) {
        return;
      }

      const point = getSvgPoint(svgRef.current, event, currentViewport);
      setLiveGeometry(updateGeometryPoint(baseGeometry, currentDragVertex.pointIndex, point));
    }

    async function handleMouseUp() {
      if (selectedFeature && (liveGeometry ?? baseGeometry)) {
        try {
          setIsSavingFeature(true);
          const updated = await window.worldForge.updateMapFeatureVersion({
            id: selectedFeature.id,
            featureKind: selectedFeature.featureKind,
            label: editFeatureForm.label,
            locationId: editFeatureForm.locationId === '' ? null : Number(editFeatureForm.locationId),
            eventId: editFeatureForm.eventId === '' ? null : Number(editFeatureForm.eventId),
            sourceEventId:
              editFeatureForm.sourceEventId === '' ? null : Number(editFeatureForm.sourceEventId),
            geometry: liveGeometry ?? baseGeometry,
            style: buildStyle(editFeatureForm),
            effectiveTick: editFeatureForm.effectiveTick,
            mapId: selectedFeature.mapId,
          });
          setMapFeatures((current) =>
            current.map((feature) => (feature.id === updated.id ? updated : feature)),
          );
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        } finally {
          setIsSavingFeature(false);
        }
      }

      setDragVertex(null);
      setLiveGeometry(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragVertex,
    editFeatureForm,
    liveGeometry,
    selectedFeature,
    selectedFeatureGeometry,
    selectedMap,
    setErrorMessage,
    viewport,
  ]);

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
        focusLocationId: editMapForm.focusLocationId === '' ? null : Number(editMapForm.focusLocationId),
        parentMapId: editMapForm.parentMapId === '' ? null : Number(editMapForm.parentMapId),
        imageAssetPath: editMapForm.imageAssetPath || null,
        canvasWidth: editMapForm.canvasWidth,
        canvasHeight: editMapForm.canvasHeight,
      });
      setMaps((current) => current.map((map) => (map.id === updated.id ? updated : map)));
      setSelectedMap(updated);
      setViewport(clampViewport(viewport ?? createFullViewport(updated), updated));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingMap(false);
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
      setDraftPoints([]);
      setCreateFeatureForm((current) => ({
        ...createEmptyFeatureForm(committedTick),
        effectiveTick: current.effectiveTick,
        featureKind: current.featureKind,
      }));
      setSelectedFeatureId(created.id);
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
        label: editFeatureForm.label,
        locationId: editFeatureForm.locationId === '' ? null : Number(editFeatureForm.locationId),
        eventId: editFeatureForm.eventId === '' ? null : Number(editFeatureForm.eventId),
        sourceEventId:
          editFeatureForm.sourceEventId === '' ? null : Number(editFeatureForm.sourceEventId),
        geometry: selectedFeatureGeometry,
        style: buildStyle(editFeatureForm),
        effectiveTick: editFeatureForm.effectiveTick,
      });
      setMapFeatures((current) =>
        current.map((feature) => (feature.id === updated.id ? updated : feature)),
      );
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

    const point = getSvgPoint(svgRef.current, event, viewport);

    if (tool === 'select') {
      setSelectedFeatureId(null);
      return;
    }

    if (tool === 'anchor') {
      void handleUpsertAnchor(point);
      return;
    }

    if (tool === 'marker') {
      void handleCreateFeature({ type: 'marker', point });
      return;
    }

    setDraftPoints((current) => [...current, point]);
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

  function handleZoom(multiplier: number) {
    if (!selectedMap || !viewport) {
      return;
    }

    const next = clampViewport(
      {
        x: viewport.x + (viewport.width - viewport.width * multiplier) / 2,
        y: viewport.y + (viewport.height - viewport.height * multiplier) / 2,
        width: viewport.width * multiplier,
        height: viewport.height * multiplier,
      },
      selectedMap,
    );
    setViewport(next);
  }

  async function handleFinishDraft() {
    if (!selectedMap || tool === 'select' || tool === 'pan' || tool === 'anchor' || tool === 'marker') {
      return;
    }

    const geometry = defaultGeometryForTool(tool, draftPoints);

    if (!geometry) {
      return;
    }

    await handleCreateFeature(geometry);
  }

  function handleToolChange(nextTool: Tool) {
    setTool(nextTool);
    setDraftPoints([]);

    if (nextTool === 'marker' || nextTool === 'path' || nextTool === 'polygon' || nextTool === 'border') {
      setCreateFeatureForm((current) => ({
        ...current,
        featureKind: nextTool,
      }));
    }
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

  return (
    <main className={styles['maps-layout']}>
      <div className={styles.stack}>
        <Panel title="Maps">
          <p className={`muted helper-text ${styles.panelText}`}>
            Create vector maps or image-backed maps and link places to positions on each map.
          </p>

          {isLoading ? <p className="muted">Loading maps...</p> : null}

          <ul className="entity-list">
            {maps.map((map) => (
              <li key={map.id}>
                <button
                  className={clsx('entity-list-item', selectedMapId === map.id && 'active')}
                  onClick={() => {
                    setSelectedMapId(map.id);
                    setSelectedFeatureId(null);
                    setDraftPoints([]);
                  }}
                  type="button"
                >
                  <div className="entity-list-heading">
                    <strong>{map.name}</strong>
                    <div className="entity-list-pills">
                      <span className="pill small">{map.displayKind}</span>
                    </div>
                  </div>
                  <span>{map.focusLocation?.name ?? 'Whole world'}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Create Map">
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
                  onChange={(event) => {
                    setCreateMapForm((current) => ({
                      ...current,
                      imageAssetPath: event.target.value,
                    }));
                  }}
                  placeholder="/absolute/path/to/render.png"
                  required
                  value={createMapForm.imageAssetPath}
                />
              </label>
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
        </Panel>
      </div>

      <Panel className={canvasPanelClassName} title={selectedMap ? selectedMap.name : 'Map Canvas'}>
        <div className={styles.canvasShell}>
          <div className={styles.toolbar}>
            {(['select', 'pan', 'marker', 'path', 'polygon', 'border', 'anchor'] as Tool[]).map((item) => (
              <button
                key={item}
                className={clsx(styles.toolButton, tool === item && styles.toolButtonActive)}
                onClick={() => {
                  handleToolChange(item);
                }}
                type="button"
              >
                {toolLabels[item]}
              </button>
            ))}
            <button className="secondary-button" onClick={() => handleZoom(0.8)} type="button">
              Zoom In
            </button>
            <button className="secondary-button" onClick={() => handleZoom(1.25)} type="button">
              Zoom Out
            </button>
            {tool !== 'marker' && tool !== 'select' && tool !== 'pan' && tool !== 'anchor' ? (
              <>
                <button
                  className="secondary-button"
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
                  disabled={draftPoints.length === 0}
                  onClick={() => {
                    setDraftPoints([]);
                  }}
                  type="button"
                >
                  Clear Draft
                </button>
              </>
            ) : null}
          </div>

          {selectedMap && viewport ? (
            <>
              <div className={styles.canvasFrame}>
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
                  <rect
                    fill="rgba(20, 26, 34, 0.92)"
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
                  ) : (
                    <>
                      <defs>
                        <pattern
                          height={1000}
                          id="atlas-grid"
                          patternUnits="userSpaceOnUse"
                          width={1000}
                        >
                          <path
                            d="M 1000 0 L 0 0 0 1000"
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth={25}
                          />
                        </pattern>
                      </defs>
                      <rect fill="url(#atlas-grid)" height={selectedMap.canvasHeight} width={selectedMap.canvasWidth} />
                    </>
                  )}

                  {mapFeatures.map((feature) => {
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
                          setSelectedFeatureId(feature.id);
                        }}
                      >
                        {renderFeatureShape(feature, geometry, selectedFeatureId === feature.id)}
                        {feature.label ? (
                          <text
                            className={styles.featureLabel}
                            x={featurePoints[0]?.x ?? 0}
                            y={(featurePoints[0]?.y ?? 0) - 180}
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
                                fill="#fff3dd"
                                onMouseDown={(event) => {
                                  event.stopPropagation();
                                  setDragVertex({
                                    featureId: feature.id,
                                    pointIndex: index,
                                  });
                                  setLiveGeometry(geometry);
                                }}
                                r={180}
                                stroke="#0b1117"
                                strokeWidth={60}
                              />
                            ))
                          : null}
                      </g>
                    );
                  })}

                  {selectedMapAnchors.map((anchor) => (
                    <g key={anchor.id}>
                      <circle
                        cx={anchor.x}
                        cy={anchor.y}
                        fill="#6fd1bf"
                        opacity={0.9}
                        r={160}
                        stroke="#081016"
                        strokeWidth={70}
                      />
                      <text className={styles.anchorLabel} x={anchor.x + 180} y={anchor.y - 180}>
                        {anchor.location.name}
                      </text>
                    </g>
                  ))}

                  {draftPoints.length > 0 ? (
                    <g>
                      {tool === 'path' ? (
                        <polyline
                          fill="none"
                          points={draftPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                          stroke="#8de1ff"
                          strokeWidth={90}
                        />
                      ) : tool === 'polygon' || tool === 'border' ? (
                        <polygon
                          fill="rgba(141, 225, 255, 0.14)"
                          points={draftPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                          stroke="#8de1ff"
                          strokeWidth={90}
                        />
                      ) : null}
                      {draftPoints.map((point, index) => (
                        <circle
                          key={`draft-${index}`}
                          cx={point.x}
                          cy={point.y}
                          fill="#8de1ff"
                          r={120}
                        />
                      ))}
                    </g>
                  ) : null}
                </svg>
              </div>

              <div className={styles.canvasMeta}>
                <span className="pill subtle">Tick {formatWorldTick(tick, 'short')}</span>
                <span className="pill subtle">{mapFeatures.length} active features</span>
                <span className="pill subtle">{selectedMapAnchors.length} place links</span>
                {tool === 'anchor' ? (
                  <span className="pill highlight">
                    Place link target: {anchorLocationId === '' ? 'pick a place' : locations.find((location) => String(location.id) === anchorLocationId)?.name ?? 'unknown'}
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="muted">Create or select a map to start drawing.</p>
          )}
        </div>
      </Panel>

      <div className={styles.stack}>
        <Panel
          badge={selectedMap ? <span className="pill">#{selectedMap.id}</span> : null}
          className="details-panel"
          title="Map Inspector"
        >
          {selectedMap ? (
            <>
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
                    <input
                      onChange={(event) => {
                        setEditMapForm((current) => ({
                          ...current,
                          imageAssetPath: event.target.value,
                        }));
                      }}
                      value={editMapForm.imageAssetPath}
                    />
                  </label>
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

              <div className="linked-card">
                <p className="card-title">Place Link</p>
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
                  Switch to the `Place Link` tool, pick a place here, then click the canvas to place or move its linked position.
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

              <div className="linked-card">
                <p className="card-title">{selectedFeature ? 'Selected Feature' : 'Feature Draft'}</p>
                <form className="form" onSubmit={selectedFeature ? handleSaveSelectedFeature : undefined}>
                  <label>
                    <span>Label</span>
                    <input
                      onChange={(event) => {
                        const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                        updater((current) => ({ ...current, label: event.target.value }));
                      }}
                      value={selectedFeature ? editFeatureForm.label : createFeatureForm.label}
                    />
                  </label>

                  <label>
                    <span>Linked Place</span>
                    <select
                      onChange={(event) => {
                        const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                        updater((current) => ({ ...current, locationId: event.target.value }));
                      }}
                      value={selectedFeature ? editFeatureForm.locationId : createFeatureForm.locationId}
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
                      value={selectedFeature ? editFeatureForm.eventId : createFeatureForm.eventId}
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
                      value={selectedFeature ? editFeatureForm.sourceEventId : createFeatureForm.sourceEventId}
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
                        value={selectedFeature ? editFeatureForm.stroke : createFeatureForm.stroke}
                      />
                    </label>
                    <label>
                      <span>Fill</span>
                      <input
                        onChange={(event) => {
                          const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                          updater((current) => ({ ...current, fill: event.target.value }));
                        }}
                        value={selectedFeature ? editFeatureForm.fill : createFeatureForm.fill}
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
                        value={selectedFeature ? editFeatureForm.strokeWidth : createFeatureForm.strokeWidth}
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
                        value={selectedFeature ? editFeatureForm.opacity : createFeatureForm.opacity}
                      />
                    </label>
                    <label>
                      <span>Marker Size</span>
                      <input
                        min={20}
                        onChange={(event) => {
                          const updater = selectedFeature ? setEditFeatureForm : setCreateFeatureForm;
                          updater((current) => ({
                            ...current,
                            markerSize: Number(event.target.value) || 20,
                          }));
                        }}
                        type="number"
                        value={selectedFeature ? editFeatureForm.markerSize : createFeatureForm.markerSize}
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
                        value={selectedFeature ? editFeatureForm.effectiveTick : createFeatureForm.effectiveTick}
                      />
                    </label>
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
                      Choose a draw tool, click on the canvas, and finish the draft shape to create this feature at {formatWorldTick(createFeatureForm.effectiveTick)}.
                    </p>
                  )}
                </form>
              </div>

              {selectedFeature ? (
                <>
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

                  {selectedFeature.locationId !== null ? (
                    <EntityLinksPanel
                      entityId={selectedFeature.locationId}
                      entityKind="location"
                      emptyMessage="This feature is not linked to a place."
                      title="Linked Place Files"
                    />
                  ) : null}

                  {selectedFeature.eventId !== null ? (
                    <EntityLinksPanel
                      entityId={selectedFeature.eventId}
                      entityKind="event"
                      emptyMessage="This feature is not linked to an event."
                      title="Linked Event Files"
                    />
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <p className="muted">Select a map to inspect it.</p>
          )}
        </Panel>
      </div>
    </main>
  );
}
