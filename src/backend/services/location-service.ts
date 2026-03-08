import type { AppDatabase } from '@db/client';
import {
  createLocationRow,
  getLocationRow,
  listLocationRows,
  updateLocationRow,
} from '@db/queries/locations';
import type {
  CreateLocationInput,
  GetLocationInput,
  Location,
  UpdateLocationInput,
} from '@shared/location';

function toLocation(record: {
  id: number;
  name: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
}): Location {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function normalizeLocationFields(input: {
  name: string;
  summary: string;
}): Pick<Location, 'name' | 'summary'> {
  return {
    name: input.name.trim(),
    summary: input.summary.trim(),
  };
}

export function createLocationService(db: AppDatabase) {
  return {
    listLocations(): Location[] {
      return listLocationRows(db).map(toLocation);
    },
    getLocation(input: GetLocationInput): Location | null {
      const record = getLocationRow(db, input.id);
      return record ? toLocation(record) : null;
    },
    createLocation(input: CreateLocationInput): Location {
      const now = Date.now();
      const fields = normalizeLocationFields(input);
      const record = createLocationRow(db, {
        ...fields,
        createdAt: now,
        updatedAt: now,
      });

      return toLocation(record);
    },
    updateLocation(input: UpdateLocationInput): Location {
      const existing = getLocationRow(db, input.id);

      if (!existing) {
        throw new Error(`Location ${input.id} does not exist.`);
      }

      const fields = normalizeLocationFields(input);
      const record = updateLocationRow(db, input.id, {
        ...fields,
        updatedAt: Date.now(),
      });

      return toLocation(record);
    },
  };
}

export type LocationService = ReturnType<typeof createLocationService>;
