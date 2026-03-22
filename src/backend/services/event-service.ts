import type { AppDatabase } from '@db/client';
import {
  createEventRow,
  deleteEventRow,
  getEventRecord,
  getEventRow,
  listEventRows,
  listEventRowsAsOf,
  updateEventRow,
} from '@db/queries/events';
import { getLocationRecord } from '@db/queries/locations';
import type {
  CreateEventInput,
  DeleteEventInput,
  Event,
  EventDetail,
  GetEventInput,
  ListEventsInput,
  UpdateEventInput,
} from '@shared/event';

function toEvent(record: {
  id: number;
  title: string;
  summary: string;
  startTick: number;
  endTick: number | null;
  primaryLocationId: number | null;
  primaryLocationName: string | null;
  createdAt: number;
  updatedAt: number;
}): Event {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    startTick: record.startTick,
    endTick: record.endTick,
    primaryLocationId: record.primaryLocationId,
    primaryLocation:
      record.primaryLocationId !== null && record.primaryLocationName
        ? {
            id: record.primaryLocationId,
            name: record.primaryLocationName,
          }
        : null,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function normalizeEventFields(input: {
  title: string;
  summary: string;
  startTick: number;
  endTick: number | null;
  primaryLocationId: number | null;
}): Pick<Event, 'title' | 'summary' | 'startTick' | 'endTick' | 'primaryLocationId'> {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    startTick: input.startTick,
    endTick: input.endTick,
    primaryLocationId: input.primaryLocationId,
  };
}

function getEventStatus(
  event: ReturnType<typeof getEventRecord>,
  tick: number,
): EventDetail['status'] {
  if (!event) {
    return 'missing';
  }

  if (tick < event.startTick) {
    return 'notYetCreated';
  }

  if (event.endTick !== null && tick > event.endTick) {
    return 'ended';
  }

  return 'active';
}

function assertPrimaryLocationValid(
  db: AppDatabase,
  locationId: number | null,
  tick: number,
): void {
  if (locationId === null) {
    return;
  }

  const location = getLocationRecord(db, locationId);

  if (!location) {
    throw new Error(`Location ${locationId} does not exist.`);
  }

  if (tick < location.existsFromTick) {
    throw new Error(`Location ${locationId} does not exist yet at tick ${tick}.`);
  }

  if (location.existsToTick !== null && tick >= location.existsToTick) {
    throw new Error(`Location ${locationId} is not active at tick ${tick}.`);
  }
}

export function createEventService(db: AppDatabase) {
  return {
    listEvents(input: ListEventsInput = {}): Event[] {
      const records =
        input.asOfTick === undefined
          ? listEventRows(db, input.locationId)
          : listEventRowsAsOf(db, input.asOfTick, input.locationId);

      return records.map(toEvent);
    },
    getEvent(input: GetEventInput): EventDetail {
      const current = getEventRecord(db, input.id);

      if (input.asOfTick === undefined) {
        return current
          ? { status: 'active', record: toEvent(current) }
          : { status: 'missing', record: null };
      }

      const status = getEventStatus(current, input.asOfTick);

      return {
        status,
        record: status === 'active' && current ? toEvent(current) : null,
      };
    },
    createEvent(input: CreateEventInput): Event {
      assertPrimaryLocationValid(db, input.primaryLocationId, input.startTick);
      const fields = normalizeEventFields(input);
      const systemNow = Date.now();

      return toEvent(
        createEventRow(db, {
          ...fields,
          createdAt: systemNow,
          updatedAt: systemNow,
        }),
      );
    },
    updateEvent(input: UpdateEventInput): Event {
      const existing = getEventRow(db, input.id);

      if (!existing) {
        throw new Error(`Event ${input.id} does not exist.`);
      }

      assertPrimaryLocationValid(db, input.primaryLocationId, input.startTick);
      const fields = normalizeEventFields(input);

      return toEvent(
        updateEventRow(db, input.id, {
          ...fields,
          updatedAt: Date.now(),
        }),
      );
    },
    deleteEvent(input: DeleteEventInput): void {
      const existing = getEventRow(db, input.id);

      if (!existing) {
        throw new Error(`Event ${input.id} does not exist.`);
      }

      deleteEventRow(db, input.id);
    },
  };
}

export type EventService = ReturnType<typeof createEventService>;
