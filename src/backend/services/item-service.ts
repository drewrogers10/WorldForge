import type { AppDatabase } from '@db/client';
import {
  createItemRow,
  deleteItemRow,
  getItemRow,
  listItemRows,
  updateItemRow,
} from '@db/queries/items';
import { getCharacterRow } from '@db/queries/characters';
import { getLocationRow } from '@db/queries/locations';
import type {
  CreateItemInput,
  DeleteItemInput,
  GetItemInput,
  Item,
  UpdateItemInput,
} from '@shared/item';

function toItem(record: {
  id: number;
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  locationId: number | null;
  createdAt: number;
  updatedAt: number;
}): Item {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    quantity: record.quantity,
    ownerCharacterId: record.ownerCharacterId,
    locationId: record.locationId,
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

function normalizeItemFields(input: {
  name: string;
  summary: string;
  quantity: number;
  ownerCharacterId: number | null;
  locationId: number | null;
}): Pick<Item, 'name' | 'summary' | 'quantity' | 'ownerCharacterId' | 'locationId'> {
  return {
    name: input.name.trim(),
    summary: input.summary.trim(),
    quantity: input.quantity,
    ownerCharacterId: input.ownerCharacterId,
    locationId: input.locationId,
  };
}

function assertSingleAssignment(input: {
  ownerCharacterId: number | null;
  locationId: number | null;
}): void {
  if (input.ownerCharacterId !== null && input.locationId !== null) {
    throw new Error('Item cannot be assigned to both a character and a location.');
  }
}

function assertReferencedEntitiesExist(
  db: AppDatabase,
  input: {
    ownerCharacterId: number | null;
    locationId: number | null;
  },
): void {
  if (input.ownerCharacterId !== null && !getCharacterRow(db, input.ownerCharacterId)) {
    throw new Error(`Character ${input.ownerCharacterId} does not exist.`);
  }

  if (input.locationId !== null && !getLocationRow(db, input.locationId)) {
    throw new Error(`Location ${input.locationId} does not exist.`);
  }
}

export function createItemService(db: AppDatabase) {
  return {
    listItems(): Item[] {
      return listItemRows(db).map(toItem);
    },
    getItem(input: GetItemInput): Item | null {
      const record = getItemRow(db, input.id);
      return record ? toItem(record) : null;
    },
    createItem(input: CreateItemInput): Item {
      const now = Date.now();

      assertSingleAssignment(input);
      assertReferencedEntitiesExist(db, input);

      const fields = normalizeItemFields(input);
      const record = createItemRow(db, {
        ...fields,
        createdAt: now,
        updatedAt: now,
      });

      return toItem(record);
    },
    updateItem(input: UpdateItemInput): Item {
      const existing = getItemRow(db, input.id);

      if (!existing) {
        throw new Error(`Item ${input.id} does not exist.`);
      }

      assertSingleAssignment(input);
      assertReferencedEntitiesExist(db, input);

      const fields = normalizeItemFields(input);
      const record = updateItemRow(db, input.id, {
        ...fields,
        updatedAt: Date.now(),
      });

      return toItem(record);
    },
    deleteItem(input: DeleteItemInput): void {
      const existing = getItemRow(db, input.id);

      if (!existing) {
        throw new Error(`Item ${input.id} does not exist.`);
      }

      deleteItemRow(db, input.id);
    },
  };
}

export type ItemService = ReturnType<typeof createItemService>;
