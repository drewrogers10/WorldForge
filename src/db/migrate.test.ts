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

describe('database migrations', () => {
  const contexts: Array<ReturnType<typeof createTestDatabaseContext>> = [];

  afterEach(() => {
    while (contexts.length > 0) {
      contexts.pop()?.cleanup();
    }
  });

  it('creates the location table and character location link on startup', () => {
    const context = createTestDatabaseContext();
    contexts.push(context);

    const locationColumns = context.client
      .prepare("PRAGMA table_info('locations')")
      .all() as TableInfoRow[];
    const characterColumns = context.client
      .prepare("PRAGMA table_info('characters')")
      .all() as TableInfoRow[];
    const foreignKeys = context.client
      .prepare("PRAGMA foreign_key_list('characters')")
      .all() as ForeignKeyRow[];

    expect(locationColumns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'summary',
      'created_at',
      'updated_at',
    ]);
    expect(characterColumns.some((column) => column.name === 'location_id')).toBe(true);
    expect(foreignKeys).toHaveLength(1);
    expect(foreignKeys[0]).toMatchObject({
      table: 'locations',
      from: 'location_id',
    });
    expect(String(foreignKeys[0]?.on_delete).toUpperCase()).toBe('SET NULL');
  });
});
