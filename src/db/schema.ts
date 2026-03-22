import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const existenceCheck = (fromColumn: { name: string }, toColumn: { name: string }) =>
  sql`${toColumn} IS NULL OR ${toColumn} > ${fromColumn}`;

export const locations = sqliteTable(
  'locations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    existsFromTick: integer('exists_from_tick').notNull().default(0),
    existsToTick: integer('exists_to_tick'),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    existenceCheck: check(
      'locations_existence_range_check',
      existenceCheck(table.existsFromTick, table.existsToTick),
    ),
  }),
);

export const characters = sqliteTable(
  'characters',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    locationId: integer('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    existsFromTick: integer('exists_from_tick').notNull().default(0),
    existsToTick: integer('exists_to_tick'),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    locationIdIdx: index('characters_location_id_idx').on(table.locationId),
    existsFromTickIdx: index('characters_exists_from_tick_idx').on(table.existsFromTick),
    existenceCheck: check(
      'characters_existence_range_check',
      existenceCheck(table.existsFromTick, table.existsToTick),
    ),
  }),
);

export const items = sqliteTable(
  'items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    quantity: integer('quantity').notNull().default(0),
    ownerCharacterId: integer('owner_character_id').references(() => characters.id, {
      onDelete: 'set null',
    }),
    locationId: integer('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    existsFromTick: integer('exists_from_tick').notNull().default(0),
    existsToTick: integer('exists_to_tick'),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    ownerCharacterIdIdx: index('items_owner_character_id_idx').on(
      table.ownerCharacterId,
    ),
    locationIdIdx: index('items_location_id_idx').on(table.locationId),
    existsFromTickIdx: index('items_exists_from_tick_idx').on(table.existsFromTick),
    assignmentCheck: check(
      'items_single_assignment_check',
      sql`${table.ownerCharacterId} IS NULL OR ${table.locationId} IS NULL`,
    ),
    existenceCheck: check(
      'items_existence_range_check',
      existenceCheck(table.existsFromTick, table.existsToTick),
    ),
  }),
);

export const characterVersions = sqliteTable(
  'character_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to'),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    isInferred: integer('is_inferred', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    lookupIdx: index('character_versions_lookup_idx').on(
      table.characterId,
      table.validFrom,
    ),
    validityCheck: check(
      'character_versions_validity_check',
      existenceCheck(table.validFrom, table.validTo),
    ),
  }),
);

export const locationVersions = sqliteTable(
  'location_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to'),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    isInferred: integer('is_inferred', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    lookupIdx: index('location_versions_lookup_idx').on(
      table.locationId,
      table.validFrom,
    ),
    validityCheck: check(
      'location_versions_validity_check',
      existenceCheck(table.validFrom, table.validTo),
    ),
  }),
);

export const itemVersions = sqliteTable(
  'item_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to'),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    quantity: integer('quantity').notNull().default(0),
    isInferred: integer('is_inferred', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    lookupIdx: index('item_versions_lookup_idx').on(table.itemId, table.validFrom),
    validityCheck: check(
      'item_versions_validity_check',
      existenceCheck(table.validFrom, table.validTo),
    ),
  }),
);

export const characterLocationSpans = sqliteTable(
  'character_location_spans',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'restrict' }),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to'),
    isInferred: integer('is_inferred', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    characterLookupIdx: index('character_location_spans_lookup_idx').on(
      table.characterId,
      table.validFrom,
    ),
    locationLookupIdx: index('character_location_spans_location_idx').on(
      table.locationId,
      table.validFrom,
    ),
    validityCheck: check(
      'character_location_spans_validity_check',
      existenceCheck(table.validFrom, table.validTo),
    ),
  }),
);

export const itemAssignmentSpans = sqliteTable(
  'item_assignment_spans',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    ownerCharacterId: integer('owner_character_id').references(() => characters.id, {
      onDelete: 'restrict',
    }),
    locationId: integer('location_id').references(() => locations.id, {
      onDelete: 'restrict',
    }),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to'),
    isInferred: integer('is_inferred', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    itemLookupIdx: index('item_assignment_spans_lookup_idx').on(
      table.itemId,
      table.validFrom,
    ),
    ownerLookupIdx: index('item_assignment_spans_owner_idx').on(
      table.ownerCharacterId,
      table.validFrom,
    ),
    locationLookupIdx: index('item_assignment_spans_location_idx').on(
      table.locationId,
      table.validFrom,
    ),
    validityCheck: check(
      'item_assignment_spans_validity_check',
      existenceCheck(table.validFrom, table.validTo),
    ),
    assignmentCheck: check(
      'item_assignment_spans_single_assignment_check',
      sql`(${table.ownerCharacterId} IS NOT NULL OR ${table.locationId} IS NOT NULL)
        AND (${table.ownerCharacterId} IS NULL OR ${table.locationId} IS NULL)`,
    ),
  }),
);

export const entityDocumentSyncState = sqliteTable(
  'entity_document_sync_state',
  {
    entityType: text('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    canonicalPath: text('canonical_path'),
    contentHash: text('content_hash'),
    lastSyncedAt: integer('last_synced_at', { mode: 'number' }),
    dirtyReason: text('dirty_reason'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entityType, table.entityId] }),
    entityTypeCheck: check(
      'entity_document_sync_state_entity_type_check',
      sql`${table.entityType} IN ('character', 'location', 'item')`,
    ),
    dirtyLookupIdx: index('entity_document_sync_state_dirty_idx').on(table.dirtyReason),
  }),
);

export const entityVectorSyncState = sqliteTable(
  'entity_vector_sync_state',
  {
    entityType: text('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    contentHash: text('content_hash'),
    lastSyncedAt: integer('last_synced_at', { mode: 'number' }),
    dirtyReason: text('dirty_reason'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entityType, table.entityId] }),
    entityTypeCheck: check(
      'entity_vector_sync_state_entity_type_check',
      sql`${table.entityType} IN ('character', 'location', 'item')`,
    ),
    dirtyLookupIdx: index('entity_vector_sync_state_dirty_idx').on(table.dirtyReason),
  }),
);

export const entitySnapshotJobs = sqliteTable(
  'entity_snapshot_jobs',
  {
    entityType: text('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    tick: integer('tick').notNull(),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entityType, table.entityId, table.tick] }),
    entityTypeCheck: check(
      'entity_snapshot_jobs_entity_type_check',
      sql`${table.entityType} IN ('character', 'location', 'item')`,
    ),
    tickLookupIdx: index('entity_snapshot_jobs_tick_idx').on(table.tick),
  }),
);

export const worldSearchDocuments = sqliteTable(
  'world_search_documents',
  {
    entityType: text('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    body: text('body').notNull().default(''),
    relationshipsText: text('relationships_text').notNull().default(''),
    canonicalPath: text('canonical_path').notNull(),
    contentHash: text('content_hash').notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entityType, table.entityId] }),
    entityTypeCheck: check(
      'world_search_documents_entity_type_check',
      sql`${table.entityType} IN ('character', 'location', 'item')`,
    ),
    updatedIdx: index('world_search_documents_updated_idx').on(table.updatedAt),
    canonicalPathIdx: index('world_search_documents_canonical_path_idx').on(
      table.canonicalPath,
    ),
  }),
);

export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    startTick: integer('start_tick').notNull(),
    endTick: integer('end_tick'),
    primaryLocationId: integer('primary_location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    startTickIdx: index('events_start_idx').on(table.startTick, table.id),
    primaryLocationIdx: index('events_primary_location_idx').on(table.primaryLocationId),
    rangeCheck: check(
      'events_tick_range_check',
      sql`${table.endTick} IS NULL OR ${table.endTick} >= ${table.startTick}`,
    ),
  }),
);

export const maps = sqliteTable(
  'maps',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    displayKind: text('display_kind').notNull(),
    themePreset: text('theme_preset').notNull().default('parchment'),
    focusLocationId: integer('focus_location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    parentMapId: integer('parent_map_id').references((): AnySQLiteColumn => maps.id, {
      onDelete: 'set null',
    }),
    imageAssetPath: text('image_asset_path'),
    canvasWidth: integer('canvas_width').notNull().default(10_000),
    canvasHeight: integer('canvas_height').notNull().default(10_000),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    displayKindCheck: check(
      'maps_display_kind_check',
      sql`${table.displayKind} IN ('vector', 'image')`,
    ),
    themePresetCheck: check(
      'maps_theme_preset_check',
      sql`${table.themePreset} IN ('parchment', 'terrain', 'political')`,
    ),
    canvasWidthCheck: check('maps_canvas_width_check', sql`${table.canvasWidth} > 0`),
    canvasHeightCheck: check('maps_canvas_height_check', sql`${table.canvasHeight} > 0`),
    focusLocationIdx: index('maps_focus_location_idx').on(table.focusLocationId),
    parentMapIdx: index('maps_parent_map_idx').on(table.parentMapId),
  }),
);

export const mapFeatures = sqliteTable(
  'map_features',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    featureKind: text('feature_kind').notNull(),
    locationId: integer('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    eventId: integer('event_id').references(() => events.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    kindCheck: check(
      'map_features_kind_check',
      sql`${table.featureKind} IN ('marker', 'path', 'polygon', 'border')`,
    ),
    mapLookupIdx: index('map_features_map_idx').on(table.mapId, table.id),
    locationLookupIdx: index('map_features_location_idx').on(table.locationId),
    eventLookupIdx: index('map_features_event_idx').on(table.eventId),
  }),
);

export const mapFeatureVersions = sqliteTable(
  'map_feature_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    featureId: integer('feature_id')
      .notNull()
      .references(() => mapFeatures.id, { onDelete: 'cascade' }),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to'),
    label: text('label').notNull().default(''),
    featureRole: text('feature_role').notNull().default('custom'),
    geometryJson: text('geometry_json').notNull(),
    styleJson: text('style_json'),
    sourceEventId: integer('source_event_id').references(() => events.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    lookupIdx: index('map_feature_versions_lookup_idx').on(table.featureId, table.validFrom),
    sourceEventIdx: index('map_feature_versions_source_event_idx').on(table.sourceEventId),
    openIdx: uniqueIndex('map_feature_versions_open_idx')
      .on(table.featureId)
      .where(sql`${table.validTo} IS NULL`),
    featureRoleCheck: check(
      'map_feature_versions_role_check',
      sql`${table.featureRole} IN ('custom', 'settlement', 'river', 'road', 'mountainRange', 'forest', 'regionBorder')`,
    ),
    validityCheck: check(
      'map_feature_versions_validity_check',
      existenceCheck(table.validFrom, table.validTo),
    ),
  }),
);

export const mapAnchors = sqliteTable(
  'map_anchors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    mapLocationIdx: uniqueIndex('map_anchors_map_location_unique_idx').on(
      table.mapId,
      table.locationId,
    ),
    locationIdx: index('map_anchors_location_idx').on(table.locationId),
    xCheck: check('map_anchors_x_check', sql`${table.x} >= 0`),
    yCheck: check('map_anchors_y_check', sql`${table.y} >= 0`),
  }),
);

export const entityLinks = sqliteTable(
  'entity_links',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entityKind: text('entity_kind').notNull(),
    entityId: integer('entity_id').notNull(),
    linkKind: text('link_kind').notNull(),
    label: text('label').notNull(),
    target: text('target').notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    entityKindCheck: check(
      'entity_links_entity_kind_check',
      sql`${table.entityKind} IN ('location', 'event')`,
    ),
    linkKindCheck: check(
      'entity_links_link_kind_check',
      sql`${table.linkKind} IN ('file', 'url')`,
    ),
    entityLookupIdx: index('entity_links_entity_idx').on(
      table.entityKind,
      table.entityId,
      table.id,
    ),
  }),
);

export type CharacterRow = typeof characters.$inferSelect;
export type NewCharacterRow = typeof characters.$inferInsert;
export type ItemRow = typeof items.$inferSelect;
export type NewItemRow = typeof items.$inferInsert;
export type LocationRow = typeof locations.$inferSelect;
export type NewLocationRow = typeof locations.$inferInsert;
export type EntityDocumentSyncStateRow = typeof entityDocumentSyncState.$inferSelect;
export type NewEntityDocumentSyncStateRow = typeof entityDocumentSyncState.$inferInsert;
export type EntityVectorSyncStateRow = typeof entityVectorSyncState.$inferSelect;
export type NewEntityVectorSyncStateRow = typeof entityVectorSyncState.$inferInsert;
export type EntitySnapshotJobRow = typeof entitySnapshotJobs.$inferSelect;
export type NewEntitySnapshotJobRow = typeof entitySnapshotJobs.$inferInsert;
export type WorldSearchDocumentRow = typeof worldSearchDocuments.$inferSelect;
export type NewWorldSearchDocumentRow = typeof worldSearchDocuments.$inferInsert;
export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type MapRow = typeof maps.$inferSelect;
export type NewMapRow = typeof maps.$inferInsert;
export type MapFeatureRow = typeof mapFeatures.$inferSelect;
export type NewMapFeatureRow = typeof mapFeatures.$inferInsert;
export type MapAnchorRow = typeof mapAnchors.$inferSelect;
export type NewMapAnchorRow = typeof mapAnchors.$inferInsert;
export type EntityLinkRow = typeof entityLinks.$inferSelect;
export type NewEntityLinkRow = typeof entityLinks.$inferInsert;
