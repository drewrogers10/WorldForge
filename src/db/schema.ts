import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export type CharacterRow = typeof characters.$inferSelect;
export type NewCharacterRow = typeof characters.$inferInsert;
export type ItemRow = typeof items.$inferSelect;
export type NewItemRow = typeof items.$inferInsert;
export type LocationRow = typeof locations.$inferSelect;
export type NewLocationRow = typeof locations.$inferInsert;
