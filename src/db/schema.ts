import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  summary: text('summary').notNull().default(''),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

export const characters = sqliteTable(
  'characters',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    locationId: integer('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    locationIdIdx: index('characters_location_id_idx').on(table.locationId),
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
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    ownerCharacterIdIdx: index('items_owner_character_id_idx').on(
      table.ownerCharacterId,
    ),
    locationIdIdx: index('items_location_id_idx').on(table.locationId),
    assignmentCheck: check(
      'items_single_assignment_check',
      sql`${table.ownerCharacterId} IS NULL OR ${table.locationId} IS NULL`,
    ),
  }),
);

export type CharacterRow = typeof characters.$inferSelect;
export type NewCharacterRow = typeof characters.$inferInsert;
export type ItemRow = typeof items.$inferSelect;
export type NewItemRow = typeof items.$inferInsert;
export type LocationRow = typeof locations.$inferSelect;
export type NewLocationRow = typeof locations.$inferInsert;
