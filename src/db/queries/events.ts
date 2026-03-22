import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { events, type EventRow } from '../schema';

export type EventRecord = {
  id: number;
  title: string;
  summary: string;
  startTick: number;
  endTick: number | null;
  primaryLocationId: number | null;
  primaryLocationName: string | null;
  createdAt: number;
  updatedAt: number;
};

type CreateEventRowInput = {
  title: string;
  summary: string;
  startTick: number;
  endTick: number | null;
  primaryLocationId: number | null;
  createdAt: number;
  updatedAt: number;
};

type UpdateEventRowInput = Partial<CreateEventRowInput>;

function baseSelectSql(): string {
  return `
    SELECT
      e.id,
      e.title,
      e.summary,
      e.start_tick AS startTick,
      e.end_tick AS endTick,
      e.primary_location_id AS primaryLocationId,
      l.name AS primaryLocationName,
      e.created_at AS createdAt,
      e.updated_at AS updatedAt
    FROM events e
    LEFT JOIN locations l
      ON l.id = e.primary_location_id
  `;
}

export function listEventRows(
  db: AppDatabase,
  locationId?: number,
): EventRecord[] {
  const whereClause = locationId === undefined ? '' : 'WHERE e.primary_location_id = ?';
  const statement = db.$client.prepare(
    `${baseSelectSql()}
     ${whereClause}
     ORDER BY e.start_tick DESC, e.id DESC`,
  );

  return (locationId === undefined
    ? statement.all()
    : statement.all(locationId)) as EventRecord[];
}

export function listEventRowsAsOf(
  db: AppDatabase,
  tick: number,
  locationId?: number,
): EventRecord[] {
  const whereParts = [
    'e.start_tick <= ?',
    '(e.end_tick IS NULL OR ? <= e.end_tick)',
  ];

  if (locationId !== undefined) {
    whereParts.push('e.primary_location_id = ?');
  }

  const statement = db.$client.prepare(
    `${baseSelectSql()}
     WHERE ${whereParts.join(' AND ')}
     ORDER BY e.start_tick DESC, e.id DESC`,
  );

  return (locationId === undefined
    ? statement.all(tick, tick)
    : statement.all(tick, tick, locationId)) as EventRecord[];
}

export function getEventRow(
  db: AppDatabase,
  id: number,
): EventRow | undefined {
  return db.select().from(events).where(eq(events.id, id)).get();
}

export function getEventRecord(
  db: AppDatabase,
  id: number,
): EventRecord | undefined {
  const statement = db.$client.prepare(
    `${baseSelectSql()}
     WHERE e.id = ?`,
  );

  return statement.get(id) as EventRecord | undefined;
}

export function createEventRow(
  db: AppDatabase,
  input: CreateEventRowInput,
): EventRecord {
  const result = db.insert(events).values(input).run();
  const created = getEventRecord(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created event.');
  }

  return created;
}

export function updateEventRow(
  db: AppDatabase,
  id: number,
  input: UpdateEventRowInput,
): EventRecord {
  db.update(events).set(input).where(eq(events.id, id)).run();

  const updated = getEventRecord(db, id);

  if (!updated) {
    throw new Error(`Event ${id} was not found after update.`);
  }

  return updated;
}

export function deleteEventRow(db: AppDatabase, id: number): void {
  db.delete(events).where(eq(events.id, id)).run();
}
