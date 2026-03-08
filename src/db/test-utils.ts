import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from './client';
import { runMigrations } from './migrate';

export function createTestDatabaseContext() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'worldforge-test-'));
  const databasePath = path.join(directory, 'worldforge.sqlite');
  const { client, db } = createDatabase(databasePath);

  runMigrations(db, path.resolve(process.cwd(), 'drizzle'));

  return {
    client,
    db,
    cleanup(): void {
      client.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
