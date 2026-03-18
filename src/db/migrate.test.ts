import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase } from './client';
import { runMigrations } from './migrate';
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

type CountRow = {
  count: number;
};

describe('database migrations', () => {
  const contexts: Array<ReturnType<typeof createTestDatabaseContext>> = [];
  const tempDirectories: string[] = [];

  afterEach(() => {
    while (contexts.length > 0) {
      contexts.pop()?.cleanup();
    }

    while (tempDirectories.length > 0) {
      rmSync(tempDirectories.pop()!, { recursive: true, force: true });
    }
  });

  it('creates temporal tables, existence columns, and assignment checks', () => {
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
    const itemAssignmentTableDefinition = context.client
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'item_assignment_spans'")
      .get() as SqlDefinitionRow | undefined;

    expect(locationColumns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'summary',
      'created_at',
      'updated_at',
      'exists_from_tick',
      'exists_to_tick',
    ]);
    expect(characterColumns.map((column) => column.name)).toEqual([
      'id',
      'name',
      'summary',
      'location_id',
      'created_at',
      'updated_at',
      'exists_from_tick',
      'exists_to_tick',
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
      'exists_from_tick',
      'exists_to_tick',
    ]);
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
    expect(itemTableDefinition?.sql).toContain(
      'CHECK("items"."owner_character_id" IS NULL OR "items"."location_id" IS NULL)',
    );
    expect(itemAssignmentTableDefinition?.sql).toContain(
      'item_assignment_spans_single_assignment_check',
    );
  });

  it('backfills inferred open-ended temporal rows for existing records during upgrade', () => {
    const rootDirectory = mkdtempSync(path.join(os.tmpdir(), 'worldforge-migrations-'));
    tempDirectories.push(rootDirectory);

    const oldMigrationsDirectory = path.join(rootDirectory, 'old-migrations');
    const oldMetaDirectory = path.join(oldMigrationsDirectory, 'meta');
    mkdirSync(oldMetaDirectory, { recursive: true });

    cpSync(path.resolve(process.cwd(), 'drizzle/0000_init.sql'), path.join(oldMigrationsDirectory, '0000_init.sql'));
    cpSync(
      path.resolve(process.cwd(), 'drizzle/0001_add-locations-and-character-links.sql'),
      path.join(oldMigrationsDirectory, '0001_add-locations-and-character-links.sql'),
    );
    cpSync(
      path.resolve(process.cwd(), 'drizzle/0002_add-items.sql'),
      path.join(oldMigrationsDirectory, '0002_add-items.sql'),
    );

    const journal = JSON.parse(
      readFileSync(path.resolve(process.cwd(), 'drizzle/meta/_journal.json'), 'utf8'),
    ) as {
      version: string;
      dialect: string;
      entries: Array<Record<string, unknown>>;
    };

    writeFileSync(
      path.join(oldMetaDirectory, '_journal.json'),
      JSON.stringify(
        {
          ...journal,
          entries: journal.entries.slice(0, 3),
        },
        null,
        2,
      ),
    );

    const databaseDirectory = mkdtempSync(path.join(os.tmpdir(), 'worldforge-upgrade-'));
    tempDirectories.push(databaseDirectory);
    const databasePath = path.join(databaseDirectory, 'worldforge.sqlite');
    const { client, db } = createDatabase(databasePath);

    try {
      runMigrations(db, oldMigrationsDirectory);

      client
        .prepare(
          `
            INSERT INTO locations (name, summary, created_at, updated_at)
            VALUES ('Old Harbor', 'Pre-upgrade place', 1, 2)
          `,
        )
        .run();
      const locationId = Number(
        (client.prepare('SELECT id FROM locations LIMIT 1').get() as { id: number }).id,
      );

      client
        .prepare(
          `
            INSERT INTO characters (name, summary, location_id, created_at, updated_at)
            VALUES ('Mira', 'Before history', ?, 3, 4)
          `,
        )
        .run(locationId);

      client
        .prepare(
          `
            INSERT INTO items (
              name, summary, quantity, owner_character_id, location_id, created_at, updated_at
            ) VALUES ('Harbor Ledger', 'Pre-upgrade item', 1, NULL, ?, 5, 6)
          `,
        )
        .run(locationId);

      runMigrations(db, path.resolve(process.cwd(), 'drizzle'));

      expect(
        (client.prepare('SELECT COUNT(*) AS count FROM location_versions').get() as CountRow)
          .count,
      ).toBe(1);
      expect(
        (client.prepare('SELECT COUNT(*) AS count FROM character_versions').get() as CountRow)
          .count,
      ).toBe(1);
      expect(
        (client.prepare('SELECT COUNT(*) AS count FROM item_versions').get() as CountRow).count,
      ).toBe(1);
      expect(
        (
          client.prepare('SELECT COUNT(*) AS count FROM character_location_spans').get() as CountRow
        ).count,
      ).toBe(1);
      expect(
        (
          client.prepare('SELECT COUNT(*) AS count FROM item_assignment_spans').get() as CountRow
        ).count,
      ).toBe(1);

      expect(
        client.prepare(
          'SELECT valid_from, valid_to, is_inferred FROM character_versions LIMIT 1',
        ).get(),
      ).toEqual({
        valid_from: 0,
        valid_to: null,
        is_inferred: 1,
      });
      expect(
        client.prepare(
          'SELECT valid_from, valid_to, is_inferred FROM item_assignment_spans LIMIT 1',
        ).get(),
      ).toEqual({
        valid_from: 0,
        valid_to: null,
        is_inferred: 1,
      });
    } finally {
      client.close();
    }
  });
});
