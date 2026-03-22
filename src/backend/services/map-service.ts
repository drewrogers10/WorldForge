import type { AppDatabase } from '@db/client';
import { getEventRecord } from '@db/queries/events';
import { getLocationRecord } from '@db/queries/locations';
import {
  createMapFeatureBaseRow,
  createMapRow,
  deleteMapAnchorRow,
  deleteMapFeatureBaseRow,
  getMapAnchorRow,
  getMapFeatureBaseRow,
  getMapRecord,
  getMapRow,
  getOpenMapFeatureVersion,
  listMapAnchorRows,
  listMapFeatureRows,
  listMapFeatureRowsAsOf,
  listMapRows,
  updateMapFeatureBaseRow,
  updateMapRow,
  upsertMapAnchorRow,
} from '@db/queries/maps';
import type {
  CreateMapFeatureInput,
  CreateMapInput,
  DeleteMapAnchorInput,
  DeleteMapFeatureInput,
  MapAnchor,
  MapFeature,
  MapGeometry,
  MapRecord,
  MapStyle,
  UpdateMapFeatureVersionInput,
  UpdateMapInput,
  UpsertMapAnchorInput,
  GetMapInput,
  ListMapFeaturesInput,
  ListMapAnchorsInput,
} from '@shared/map';

type OpenVersionRow = {
  id: number;
  validFrom: number;
  validTo: number | null;
};

function toMap(record: {
  id: number;
  name: string;
  displayKind: 'vector' | 'image';
  themePreset: 'parchment' | 'terrain' | 'political';
  focusLocationId: number | null;
  focusLocationName: string | null;
  parentMapId: number | null;
  parentMapName: string | null;
  parentMapDisplayKind: 'vector' | 'image' | null;
  imageAssetPath: string | null;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: number;
  updatedAt: number;
}): MapRecord {
  return {
    id: record.id,
    name: record.name,
    displayKind: record.displayKind,
    themePreset: record.themePreset,
    focusLocationId: record.focusLocationId,
    focusLocation:
      record.focusLocationId !== null && record.focusLocationName
        ? {
            id: record.focusLocationId,
            name: record.focusLocationName,
          }
        : null,
    parentMapId: record.parentMapId,
    parentMap:
      record.parentMapId !== null && record.parentMapName && record.parentMapDisplayKind
        ? {
            id: record.parentMapId,
            name: record.parentMapName,
            displayKind: record.parentMapDisplayKind,
          }
        : null,
    imageAssetPath: record.imageAssetPath,
    canvasWidth: record.canvasWidth,
    canvasHeight: record.canvasHeight,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function toMapFeature(record: {
  id: number;
  mapId: number;
  featureKind: 'marker' | 'path' | 'polygon' | 'border';
  featureRole:
    | 'custom'
    | 'settlement'
    | 'river'
    | 'road'
    | 'mountainRange'
    | 'forest'
    | 'regionBorder';
  locationId: number | null;
  locationName: string | null;
  eventId: number | null;
  eventTitle: string | null;
  label: string;
  geometryJson: string;
  styleJson: string | null;
  sourceEventId: number | null;
  sourceEventTitle: string | null;
  validFrom: number;
  validTo: number | null;
  createdAt: number;
  updatedAt: number;
}): MapFeature {
  const geometry = JSON.parse(record.geometryJson) as MapGeometry;
  const style = record.styleJson ? (JSON.parse(record.styleJson) as MapStyle) : null;

  return {
    id: record.id,
    mapId: record.mapId,
    featureKind: record.featureKind,
    featureRole: record.featureRole,
    locationId: record.locationId,
    location:
      record.locationId !== null && record.locationName
        ? {
            id: record.locationId,
            name: record.locationName,
          }
        : null,
    eventId: record.eventId,
    event:
      record.eventId !== null && record.eventTitle
        ? {
            id: record.eventId,
            title: record.eventTitle,
          }
        : null,
    label: record.label,
    geometry,
    style,
    sourceEventId: record.sourceEventId,
    sourceEvent:
      record.sourceEventId !== null && record.sourceEventTitle
        ? {
            id: record.sourceEventId,
            title: record.sourceEventTitle,
          }
        : null,
    validFrom: record.validFrom,
    validTo: record.validTo,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function toMapAnchor(record: {
  id: number;
  mapId: number;
  locationId: number;
  locationName: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
}): MapAnchor {
  return {
    id: record.id,
    mapId: record.mapId,
    locationId: record.locationId,
    location: {
      id: record.locationId,
      name: record.locationName,
    },
    x: record.x,
    y: record.y,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function normalizeMapFields(input: CreateMapInput | UpdateMapInput) {
  const normalizedImageAssetPath =
    input.displayKind === 'image'
      ? input.imageAssetPath?.trim() || null
      : null;

  if (input.displayKind === 'image' && normalizedImageAssetPath === null) {
    throw new Error('Image-backed maps require an image asset path.');
  }

  return {
    name: input.name.trim(),
    displayKind: input.displayKind,
    themePreset: input.themePreset,
    focusLocationId: input.focusLocationId,
    parentMapId: input.parentMapId,
    imageAssetPath: normalizedImageAssetPath,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
  } as const;
}

function assertLocationExists(db: AppDatabase, locationId: number | null): void {
  if (locationId === null) {
    return;
  }

  if (!getLocationRecord(db, locationId)) {
    throw new Error(`Location ${locationId} does not exist.`);
  }
}

function assertEventExists(db: AppDatabase, eventId: number | null): void {
  if (eventId === null) {
    return;
  }

  if (!getEventRecord(db, eventId)) {
    throw new Error(`Event ${eventId} does not exist.`);
  }
}

function assertMapExists(db: AppDatabase, mapId: number): NonNullable<ReturnType<typeof getMapRow>> {
  const map = getMapRow(db, mapId);

  if (!map) {
    throw new Error(`Map ${mapId} does not exist.`);
  }

  return map;
}

function assertMapFeatureExists(
  db: AppDatabase,
  id: number,
): NonNullable<ReturnType<typeof getMapFeatureBaseRow>> {
  const feature = getMapFeatureBaseRow(db, id);

  if (!feature) {
    throw new Error(`Map feature ${id} does not exist.`);
  }

  return feature;
}

function assertParentMapValid(
  db: AppDatabase,
  parentMapId: number | null,
  currentMapId?: number,
): void {
  if (parentMapId === null) {
    return;
  }

  if (currentMapId !== undefined && parentMapId === currentMapId) {
    throw new Error('A map cannot be its own parent.');
  }

  if (!getMapRow(db, parentMapId)) {
    throw new Error(`Map ${parentMapId} does not exist.`);
  }
}

function assertMapFeatureReferences(
  db: AppDatabase,
  input: {
    mapId: number;
    locationId: number | null;
    eventId: number | null;
    sourceEventId: number | null;
  },
): void {
  assertMapExists(db, input.mapId);
  assertLocationExists(db, input.locationId);
  assertEventExists(db, input.eventId);
  assertEventExists(db, input.sourceEventId);
}

function assertForwardOnlyTick(
  tick: number,
  openVersion: OpenVersionRow | undefined,
  featureId: number,
): OpenVersionRow {
  if (!openVersion) {
    throw new Error(`Map feature ${featureId} has no open temporal state.`);
  }

  if (tick < openVersion.validFrom) {
    throw new Error(
      `Map feature ${featureId} cannot be changed at tick ${tick} before its latest state at tick ${openVersion.validFrom}.`,
    );
  }

  return openVersion;
}

function serializeGeometry(geometry: MapGeometry): string {
  return JSON.stringify(geometry);
}

function serializeStyle(style: MapStyle | null): string | null {
  return style ? JSON.stringify(style) : null;
}

function assertPointWithinMap(
  point: { x: number; y: number },
  map: {
    id: number;
    canvasWidth: number;
    canvasHeight: number;
  },
  label: string,
): void {
  if (point.x < 0 || point.x > map.canvasWidth || point.y < 0 || point.y > map.canvasHeight) {
    throw new Error(
      `${label} must be within map ${map.id} bounds 0..${map.canvasWidth} by 0..${map.canvasHeight}.`,
    );
  }
}

function assertGeometryWithinMap(
  geometry: MapGeometry,
  map: {
    id: number;
    canvasWidth: number;
    canvasHeight: number;
  },
): void {
  const points = geometry.type === 'marker' ? [geometry.point] : geometry.points;

  points.forEach((point, index) => {
    assertPointWithinMap(point, map, `Geometry point ${index + 1}`);
  });
}

export function createMapService(db: AppDatabase) {
  return {
    listMaps(): MapRecord[] {
      return listMapRows(db).map(toMap);
    },
    getMap(input: GetMapInput): MapRecord | null {
      const record = getMapRecord(db, input.id);
      return record ? toMap(record) : null;
    },
    createMap(input: CreateMapInput): MapRecord {
      const fields = normalizeMapFields(input);
      assertLocationExists(db, fields.focusLocationId);
      assertParentMapValid(db, fields.parentMapId);
      const systemNow = Date.now();

      return toMap(
        createMapRow(db, {
          ...fields,
          createdAt: systemNow,
          updatedAt: systemNow,
        }),
      );
    },
    updateMap(input: UpdateMapInput): MapRecord {
      if (!getMapRow(db, input.id)) {
        throw new Error(`Map ${input.id} does not exist.`);
      }

      const fields = normalizeMapFields(input);
      assertLocationExists(db, fields.focusLocationId);
      assertParentMapValid(db, fields.parentMapId, input.id);

      return toMap(
        updateMapRow(db, input.id, {
          ...fields,
          updatedAt: Date.now(),
        }),
      );
    },
    listMapFeatures(input: ListMapFeaturesInput): MapFeature[] {
      assertMapExists(db, input.mapId);
      const records =
        input.asOfTick === undefined
          ? listMapFeatureRows(db, input.mapId)
          : listMapFeatureRowsAsOf(db, input.mapId, input.asOfTick);

      return records.map(toMapFeature);
    },
    createMapFeature(input: CreateMapFeatureInput): MapFeature {
      assertMapFeatureReferences(db, input);
      const map = assertMapExists(db, input.mapId);
      assertGeometryWithinMap(input.geometry, map);
      const systemNow = Date.now();

      const transaction = db.$client.transaction(() => {
        const feature = createMapFeatureBaseRow(db, {
          mapId: input.mapId,
          featureKind: input.featureKind,
          locationId: input.locationId,
          eventId: input.eventId,
          createdAt: systemNow,
          updatedAt: systemNow,
        });

        db.$client
          .prepare(
            `
              INSERT INTO map_feature_versions (
                feature_id,
                valid_from,
                valid_to,
                label,
                feature_role,
                geometry_json,
                style_json,
                source_event_id,
                created_at
              ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
            `,
          )
          .run(
            feature.id,
            input.effectiveTick,
            input.label.trim(),
            input.featureRole,
            serializeGeometry(input.geometry),
            serializeStyle(input.style),
            input.sourceEventId,
            systemNow,
          );

        return feature.id;
      });

      const featureId = transaction();
      const created = listMapFeatureRows(db, input.mapId).find(
        (feature) => feature.id === featureId,
      );
      if (created) {
        return toMapFeature(created);
      }

      const refreshed = listMapFeatureRows(db, input.mapId).find((feature) => feature.validFrom === input.effectiveTick && feature.label === input.label.trim());

      if (!refreshed) {
        throw new Error('Failed to load the created map feature.');
      }

      return toMapFeature(refreshed);
    },
    updateMapFeatureVersion(input: UpdateMapFeatureVersionInput): MapFeature {
      const feature = assertMapFeatureExists(db, input.id);
      const map = assertMapExists(db, feature.mapId);
      assertMapFeatureReferences(db, {
        mapId: feature.mapId,
        locationId: input.locationId,
        eventId: input.eventId,
        sourceEventId: input.sourceEventId,
      });
      assertGeometryWithinMap(input.geometry, map);

      if (input.featureKind !== feature.featureKind) {
        throw new Error('Feature kind cannot change after creation.');
      }

      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenMapFeatureVersion(db, input.id),
        input.id,
      );
      const systemNow = Date.now();

      const transaction = db.$client.transaction(() => {
        updateMapFeatureBaseRow(db, input.id, {
          locationId: input.locationId,
          eventId: input.eventId,
          updatedAt: systemNow,
        });

        if (input.effectiveTick === openVersion.validFrom) {
          db.$client
            .prepare(
              `
                UPDATE map_feature_versions
                SET label = ?, feature_role = ?, geometry_json = ?, style_json = ?, source_event_id = ?, created_at = ?
                WHERE id = ?
              `,
            )
            .run(
              input.label.trim(),
              input.featureRole,
              serializeGeometry(input.geometry),
              serializeStyle(input.style),
              input.sourceEventId,
              systemNow,
              openVersion.id,
            );
        } else {
          db.$client
            .prepare(
              `
                UPDATE map_feature_versions
                SET valid_to = ?
                WHERE id = ?
              `,
            )
            .run(input.effectiveTick, openVersion.id);

          db.$client
            .prepare(
              `
                INSERT INTO map_feature_versions (
                  feature_id,
                valid_from,
                valid_to,
                label,
                feature_role,
                geometry_json,
                style_json,
                source_event_id,
                created_at
              ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
              `,
            )
            .run(
              input.id,
              input.effectiveTick,
              input.label.trim(),
              input.featureRole,
              serializeGeometry(input.geometry),
              serializeStyle(input.style),
              input.sourceEventId,
              systemNow,
            );
        }
      });

      transaction();

      const updated = listMapFeatureRows(db, feature.mapId).find((candidate) => candidate.id === input.id);

      if (!updated) {
        throw new Error(`Map feature ${input.id} was not found after update.`);
      }

      return toMapFeature(updated);
    },
    deleteMapFeature(input: DeleteMapFeatureInput): void {
      assertMapFeatureExists(db, input.id);
      const openVersion = assertForwardOnlyTick(
        input.effectiveTick,
        getOpenMapFeatureVersion(db, input.id),
        input.id,
      );

      const transaction = db.$client.transaction(() => {
        if (input.effectiveTick === openVersion.validFrom) {
          deleteMapFeatureBaseRow(db, input.id);
          return;
        }

        db.$client
          .prepare(
            `
              UPDATE map_feature_versions
              SET valid_to = ?
              WHERE id = ?
            `,
          )
          .run(input.effectiveTick, openVersion.id);

        updateMapFeatureBaseRow(db, input.id, {
          updatedAt: Date.now(),
        });
      });

      transaction();
    },
    listMapAnchors(input: ListMapAnchorsInput): MapAnchor[] {
      assertMapExists(db, input.mapId);
      return listMapAnchorRows(db, input.mapId).map(toMapAnchor);
    },
    upsertMapAnchor(input: UpsertMapAnchorInput): MapAnchor {
      const map = assertMapExists(db, input.mapId);
      assertLocationExists(db, input.locationId);
      assertPointWithinMap(input, map, 'Anchor point');
      const systemNow = Date.now();

      return toMapAnchor(
        upsertMapAnchorRow(db, {
          ...input,
          createdAt: systemNow,
          updatedAt: systemNow,
        }),
      );
    },
    deleteMapAnchor(input: DeleteMapAnchorInput): void {
      const existing = getMapAnchorRow(db, input.id);

      if (!existing) {
        throw new Error(`Map anchor ${input.id} does not exist.`);
      }

      deleteMapAnchorRow(db, input.id);
    },
  };
}

export type MapService = ReturnType<typeof createMapService>;
