import { afterEach, describe, expect, it } from 'vitest';
import { createTestDatabaseContext } from './test-utils';

type TableInfoRow = {
  name: string;
};

type ForeignKeyRow = {
  table: string;
  from: string;
  on_delete: string;
};

type SqlDefinitionRow = {
  sql: string;
};

describe('database migrations', () => {
  const contexts: Array<ReturnType<typeof createTestDatabaseContext>> = [];

  afterEach(() => {
    while (contexts.length > 0) {
      contexts.pop()?.cleanup();
    }
  });

  it('creates the location, character, and item tables with expected links', () => {
    const context = createTestDatabaseContext();
    contexts.push(context);

    const locationColumns = context.client
      .prepare("PRAGMA table_info('locations')")
      .all() as TableInfoRow[];
    const characterColumns = context.client
      .prepare("PRAGMA table_info('characters')")
      .all() as TableInfoRow[];
    const itemColumns = context.client
      .prepare("PRAGMA table_info('items')")
      .all() as TableInfoRow[];
    const characterForeignKeys = context.client
      .prepare("PRAGMA foreign_key_list('characters')")
      .all() as ForeignKeyRow[];
    const itemForeignKeys = context.client
      .prepare("PRAGMA foreign_key_list('items')")
      .all() as ForeignKeyRow[];
    const itemTableDefinition = context.client
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'items'")
      .get() as SqlDefinitionRow | undefined;

    expect(locationColumns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'summary',
      'created_at',
      'updated_at',
    ]);
    expect(itemColumns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'summary',
      'quantity',
      'owner_character_id',
      'location_id',
      'created_at',
      'updated_at',
    ]);
    expect(characterColumns.some((column) => column.name === 'location_id')).toBe(true);
    expect(characterForeignKeys).toHaveLength(1);
    expect(characterForeignKeys[0]).toMatchObject({
      table: 'locations',
      from: 'location_id',
    });
    expect(String(characterForeignKeys[0]?.on_delete).toUpperCase()).toBe('SET NULL');
    expect(itemForeignKeys).toHaveLength(2);
    expect(itemForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'characters',
          from: 'owner_character_id',
          on_delete: 'SET NULL',
        }),
        expect.objectContaining({
          table: 'locations',
          from: 'location_id',
          on_delete: 'SET NULL',
        }),
      ]),
    );
    expect(itemTableDefinition?.sql).toContain('CHECK("items"."owner_character_id" IS NULL OR "items"."location_id" IS NULL)');
  });
});
