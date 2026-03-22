import type { AppDatabase } from '@db/client';
import {
  createEntityLinkRow,
  deleteEntityLinkRow,
  getEntityLinkRow,
  listEntityLinkRows,
  updateEntityLinkRow,
} from '@db/queries/entity-links';
import { getEventRow } from '@db/queries/events';
import { getLocationRow } from '@db/queries/locations';
import type {
  CreateEntityLinkInput,
  DeleteEntityLinkInput,
  EntityLink,
  ListEntityLinksInput,
  UpdateEntityLinkInput,
} from '@shared/entity-link';

function toEntityLink(record: {
  id: number;
  entityKind: 'location' | 'event';
  entityId: number;
  linkKind: 'file' | 'url';
  label: string;
  target: string;
  createdAt: number;
}): EntityLink {
  return {
    ...record,
    createdAt: new Date(record.createdAt).toISOString(),
  };
}

function normalizeLinkFields(input: {
  entityKind: 'location' | 'event';
  entityId: number;
  linkKind: 'file' | 'url';
  label: string;
  target: string;
}) {
  return {
    entityKind: input.entityKind,
    entityId: input.entityId,
    linkKind: input.linkKind,
    label: input.label.trim(),
    target: input.target.trim(),
  };
}

function assertLinkedEntityExists(
  db: AppDatabase,
  input: {
    entityKind: 'location' | 'event';
    entityId: number;
  },
): void {
  if (input.entityKind === 'location') {
    if (!getLocationRow(db, input.entityId)) {
      throw new Error(`Location ${input.entityId} does not exist.`);
    }
    return;
  }

  if (!getEventRow(db, input.entityId)) {
    throw new Error(`Event ${input.entityId} does not exist.`);
  }
}

export function createEntityLinkService(db: AppDatabase) {
  return {
    listEntityLinks(input: ListEntityLinksInput): EntityLink[] {
      return listEntityLinkRows(db, input.entityKind, input.entityId).map(toEntityLink);
    },
    createEntityLink(input: CreateEntityLinkInput): EntityLink {
      assertLinkedEntityExists(db, input);
      const fields = normalizeLinkFields(input);

      return toEntityLink(
        createEntityLinkRow(db, {
          ...fields,
          createdAt: Date.now(),
        }),
      );
    },
    updateEntityLink(input: UpdateEntityLinkInput): EntityLink {
      const existing = getEntityLinkRow(db, input.id);

      if (!existing) {
        throw new Error(`Entity link ${input.id} does not exist.`);
      }

      assertLinkedEntityExists(db, input);
      const fields = normalizeLinkFields(input);

      return toEntityLink(updateEntityLinkRow(db, input.id, fields));
    },
    deleteEntityLink(input: DeleteEntityLinkInput): void {
      const existing = getEntityLinkRow(db, input.id);

      if (!existing) {
        throw new Error(`Entity link ${input.id} does not exist.`);
      }

      deleteEntityLinkRow(db, input.id);
    },
  };
}

export type EntityLinkService = ReturnType<typeof createEntityLinkService>;
