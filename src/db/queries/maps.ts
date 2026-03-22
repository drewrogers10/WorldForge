import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { mapAnchors, mapFeatures, maps } from '../schema';

export type MapRecord = {
  id: number;
  name: string;
  displayKind: 'vector' | 'image';
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
};

export type MapFeatureBaseRecord = {
  id: number;
  mapId: number;
  featureKind: 'marker' | 'path' | 'polygon' | 'border';
  locationId: number | null;
  eventId: number | null;
  createdAt: number;
  updatedAt: number;
};

export type MapFeatureRecord = {
  id: number;
  mapId: number;
  featureKind: 'marker' | 'path' | 'polygon' | 'border';
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
};

export type MapFeatureVersionRecord = {
  id: number;
  validFrom: number;
  validTo: number | null;
};

export type MapAnchorRecord = {
  id: number;
  mapId: number;
  locationId: number;
  locationName: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
};

type CreateMapRowInput = {
  name: string;
  displayKind: 'vector' | 'image';
  focusLocationId: number | null;
  parentMapId: number | null;
  imageAssetPath: string | null;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: number;
  updatedAt: number;
};

type UpdateMapRowInput = Partial<CreateMapRowInput>;

type CreateMapFeatureBaseRowInput = {
  mapId: number;
  featureKind: 'marker' | 'path' | 'polygon' | 'border';
  locationId: number | null;
  eventId: number | null;
  createdAt: number;
  updatedAt: number;
};

type UpdateMapFeatureBaseRowInput = Partial<CreateMapFeatureBaseRowInput>;

type UpsertMapAnchorRowInput = {
  mapId: number;
  locationId: number;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
};

function mapSelectSql(): string {
  return `
    SELECT
      m.id,
      m.name,
      m.display_kind AS displayKind,
      m.focus_location_id AS focusLocationId,
      fl.name AS focusLocationName,
      m.parent_map_id AS parentMapId,
      pm.name AS parentMapName,
      pm.display_kind AS parentMapDisplayKind,
      m.image_asset_path AS imageAssetPath,
      m.canvas_width AS canvasWidth,
      m.canvas_height AS canvasHeight,
      m.created_at AS createdAt,
      m.updated_at AS updatedAt
    FROM maps m
    LEFT JOIN locations fl
      ON fl.id = m.focus_location_id
    LEFT JOIN maps pm
      ON pm.id = m.parent_map_id
  `;
}

export function listMapRows(db: AppDatabase): MapRecord[] {
  const statement = db.$client.prepare(
    `${mapSelectSql()}
     ORDER BY m.updated_at DESC, m.id DESC`,
  );

  return statement.all() as MapRecord[];
}

export function getMapRow(db: AppDatabase, id: number) {
  return db.select().from(maps).where(eq(maps.id, id)).get();
}

export function getMapRecord(
  db: AppDatabase,
  id: number,
): MapRecord | undefined {
  const statement = db.$client.prepare(
    `${mapSelectSql()}
     WHERE m.id = ?`,
  );

  return statement.get(id) as MapRecord | undefined;
}

export function createMapRow(
  db: AppDatabase,
  input: CreateMapRowInput,
): MapRecord {
  const result = db.insert(maps).values(input).run();
  const created = getMapRecord(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created map.');
  }

  return created;
}

export function updateMapRow(
  db: AppDatabase,
  id: number,
  input: UpdateMapRowInput,
): MapRecord {
  db.update(maps).set(input).where(eq(maps.id, id)).run();

  const updated = getMapRecord(db, id);

  if (!updated) {
    throw new Error(`Map ${id} was not found after update.`);
  }

  return updated;
}

export function getMapFeatureBaseRow(
  db: AppDatabase,
  id: number,
): MapFeatureBaseRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        id,
        map_id AS mapId,
        feature_kind AS featureKind,
        location_id AS locationId,
        event_id AS eventId,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM map_features
      WHERE id = ?
    `,
  );

  return statement.get(id) as MapFeatureBaseRecord | undefined;
}

function mapFeatureSelectSql(intervalClause: string): string {
  return `
    SELECT
      mf.id,
      mf.map_id AS mapId,
      mf.feature_kind AS featureKind,
      mf.location_id AS locationId,
      l.name AS locationName,
      mf.event_id AS eventId,
      e.title AS eventTitle,
      mfv.label,
      mfv.geometry_json AS geometryJson,
      mfv.style_json AS styleJson,
      mfv.source_event_id AS sourceEventId,
      se.title AS sourceEventTitle,
      mfv.valid_from AS validFrom,
      mfv.valid_to AS validTo,
      mf.created_at AS createdAt,
      mf.updated_at AS updatedAt
    FROM map_features mf
    JOIN map_feature_versions mfv
      ON mfv.feature_id = mf.id
     AND ${intervalClause}
    LEFT JOIN locations l
      ON l.id = mf.location_id
    LEFT JOIN events e
      ON e.id = mf.event_id
    LEFT JOIN events se
      ON se.id = mfv.source_event_id
  `;
}

export function listMapFeatureRows(
  db: AppDatabase,
  mapId: number,
): MapFeatureRecord[] {
  const statement = db.$client.prepare(
    `${mapFeatureSelectSql('mfv.valid_to IS NULL')}
     WHERE mf.map_id = ?
     ORDER BY mf.updated_at DESC, mf.id DESC`,
  );

  return statement.all(mapId) as MapFeatureRecord[];
}

export function listMapFeatureRowsAsOf(
  db: AppDatabase,
  mapId: number,
  tick: number,
): MapFeatureRecord[] {
  const statement = db.$client.prepare(
    `${mapFeatureSelectSql('mfv.valid_from <= ? AND (mfv.valid_to IS NULL OR ? < mfv.valid_to)')}
     WHERE mf.map_id = ?
     ORDER BY mf.updated_at DESC, mf.id DESC`,
  );

  return statement.all(tick, tick, mapId) as MapFeatureRecord[];
}

export function getOpenMapFeatureVersion(
  db: AppDatabase,
  featureId: number,
): MapFeatureVersionRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT id, valid_from AS validFrom, valid_to AS validTo
      FROM map_feature_versions
      WHERE feature_id = ?
        AND valid_to IS NULL
    `,
  );

  return statement.get(featureId) as MapFeatureVersionRecord | undefined;
}

export function createMapFeatureBaseRow(
  db: AppDatabase,
  input: CreateMapFeatureBaseRowInput,
): MapFeatureBaseRecord {
  const result = db.insert(mapFeatures).values(input).run();
  const created = getMapFeatureBaseRow(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created map feature.');
  }

  return created;
}

export function updateMapFeatureBaseRow(
  db: AppDatabase,
  id: number,
  input: UpdateMapFeatureBaseRowInput,
): MapFeatureBaseRecord {
  db.update(mapFeatures).set(input).where(eq(mapFeatures.id, id)).run();

  const updated = getMapFeatureBaseRow(db, id);

  if (!updated) {
    throw new Error(`Map feature ${id} was not found after update.`);
  }

  return updated;
}

export function deleteMapFeatureBaseRow(db: AppDatabase, id: number): void {
  db.delete(mapFeatures).where(eq(mapFeatures.id, id)).run();
}

export function listMapAnchorRows(
  db: AppDatabase,
  mapId: number,
): MapAnchorRecord[] {
  const statement = db.$client.prepare(
    `
      SELECT
        ma.id,
        ma.map_id AS mapId,
        ma.location_id AS locationId,
        l.name AS locationName,
        ma.x,
        ma.y,
        ma.created_at AS createdAt,
        ma.updated_at AS updatedAt
      FROM map_anchors ma
      JOIN locations l
        ON l.id = ma.location_id
      WHERE ma.map_id = ?
      ORDER BY l.name COLLATE NOCASE, ma.id
    `,
  );

  return statement.all(mapId) as MapAnchorRecord[];
}

export function getMapAnchorRow(
  db: AppDatabase,
  id: number,
): MapAnchorRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        ma.id,
        ma.map_id AS mapId,
        ma.location_id AS locationId,
        l.name AS locationName,
        ma.x,
        ma.y,
        ma.created_at AS createdAt,
        ma.updated_at AS updatedAt
      FROM map_anchors ma
      JOIN locations l
        ON l.id = ma.location_id
      WHERE ma.id = ?
    `,
  );

  return statement.get(id) as MapAnchorRecord | undefined;
}

export function getMapAnchorByLocation(
  db: AppDatabase,
  mapId: number,
  locationId: number,
): MapAnchorRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        ma.id,
        ma.map_id AS mapId,
        ma.location_id AS locationId,
        l.name AS locationName,
        ma.x,
        ma.y,
        ma.created_at AS createdAt,
        ma.updated_at AS updatedAt
      FROM map_anchors ma
      JOIN locations l
        ON l.id = ma.location_id
      WHERE ma.map_id = ?
        AND ma.location_id = ?
    `,
  );

  return statement.get(mapId, locationId) as MapAnchorRecord | undefined;
}

export function upsertMapAnchorRow(
  db: AppDatabase,
  input: UpsertMapAnchorRowInput,
): MapAnchorRecord {
  db.$client
    .prepare(
      `
        INSERT INTO map_anchors (
          map_id,
          location_id,
          x,
          y,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(map_id, location_id) DO UPDATE SET
          x = excluded.x,
          y = excluded.y,
          updated_at = excluded.updated_at
      `,
    )
    .run(
      input.mapId,
      input.locationId,
      input.x,
      input.y,
      input.createdAt,
      input.updatedAt,
    );

  const row = getMapAnchorByLocation(db, input.mapId, input.locationId);

  if (!row) {
    throw new Error('Failed to load the upserted map anchor.');
  }

  return row;
}

export function deleteMapAnchorRow(db: AppDatabase, id: number): void {
  db.delete(mapAnchors).where(eq(mapAnchors.id, id)).run();
}
