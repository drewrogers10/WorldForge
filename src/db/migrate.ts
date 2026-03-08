import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { AppDatabase } from './client';

export function runMigrations(
  db: AppDatabase,
  migrationsFolder: string,
): void {
  migrate(db, { migrationsFolder });
}
