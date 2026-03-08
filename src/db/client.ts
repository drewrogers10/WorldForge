import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export function createDatabase(databasePath: string) {
  const client = new Database(databasePath);

  client.pragma('journal_mode = WAL');
  client.pragma('foreign_keys = ON');

  const db = drizzle({ client, schema });

  return { client, db };
}

export type AppDatabase = ReturnType<typeof createDatabase>['db'];
