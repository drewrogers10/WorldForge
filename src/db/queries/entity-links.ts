import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../client';
import { entityLinks } from '../schema';

export type EntityLinkRecord = {
  id: number;
  entityKind: 'location' | 'event';
  entityId: number;
  linkKind: 'file' | 'url';
  label: string;
  target: string;
  createdAt: number;
};

type CreateEntityLinkRowInput = {
  entityKind: 'location' | 'event';
  entityId: number;
  linkKind: 'file' | 'url';
  label: string;
  target: string;
  createdAt: number;
};

type UpdateEntityLinkRowInput = Partial<CreateEntityLinkRowInput>;

export function listEntityLinkRows(
  db: AppDatabase,
  entityKind: 'location' | 'event',
  entityId: number,
): EntityLinkRecord[] {
  const statement = db.$client.prepare(
    `
      SELECT
        id,
        entity_kind AS entityKind,
        entity_id AS entityId,
        link_kind AS linkKind,
        label,
        target,
        created_at AS createdAt
      FROM entity_links
      WHERE entity_kind = ?
        AND entity_id = ?
      ORDER BY id DESC
    `,
  );

  return statement.all(entityKind, entityId) as EntityLinkRecord[];
}

export function getEntityLinkRow(
  db: AppDatabase,
  id: number,
): EntityLinkRecord | undefined {
  const statement = db.$client.prepare(
    `
      SELECT
        id,
        entity_kind AS entityKind,
        entity_id AS entityId,
        link_kind AS linkKind,
        label,
        target,
        created_at AS createdAt
      FROM entity_links
      WHERE id = ?
    `,
  );

  return statement.get(id) as EntityLinkRecord | undefined;
}

export function createEntityLinkRow(
  db: AppDatabase,
  input: CreateEntityLinkRowInput,
): EntityLinkRecord {
  const result = db.insert(entityLinks).values(input).run();
  const created = getEntityLinkRow(db, Number(result.lastInsertRowid));

  if (!created) {
    throw new Error('Failed to load the created entity link.');
  }

  return created;
}

export function updateEntityLinkRow(
  db: AppDatabase,
  id: number,
  input: UpdateEntityLinkRowInput,
): EntityLinkRecord {
  db.update(entityLinks).set(input).where(eq(entityLinks.id, id)).run();

  const updated = getEntityLinkRow(db, id);

  if (!updated) {
    throw new Error(`Entity link ${id} was not found after update.`);
  }

  return updated;
}

export function deleteEntityLinkRow(db: AppDatabase, id: number): void {
  db.delete(entityLinks).where(eq(entityLinks.id, id)).run();
}
