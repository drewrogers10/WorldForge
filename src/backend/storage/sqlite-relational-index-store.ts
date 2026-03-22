import type { AppDatabase } from '@db/client';
import {
  type CharacterRecord,
  getCharacterRow,
  getCharacterRowAsOf,
} from '@db/queries/characters';
import { type ItemRecord, getItemRow, getItemRowAsOf } from '@db/queries/items';
import {
  type LocationRecord,
  getLocationRecord,
  getLocationRowAsOf,
} from '@db/queries/locations';
import { getTemporalDetailStatus } from '@db/queries/temporal';
import type { SearchWorldInput, StorageHealth, WorldSearchHit } from '@shared/storage';
import type {
  CanonicalEntityDocument,
  CurrentEntityState,
  EntityReference,
  RelationalIndexStore,
  SearchDocument,
  SnapshotJob,
  SnapshotRecord,
} from './types';

type SyncErrorRow = {
  lastError: string | null;
};

type HealthCountsRow = {
  documentDirtyCount: number;
  vectorDirtyCount: number;
  pendingSnapshotCount: number;
  searchDocumentCount: number;
};

type OpenIntervalRow = {
  id: number;
  validFrom: number;
};

type OpenCharacterLocationRow = OpenIntervalRow & {
  locationId: number;
};

type OpenItemAssignmentRow = OpenIntervalRow & {
  ownerCharacterId: number | null;
  locationId: number | null;
};

function toCurrentCharacterState(record: CharacterRecord): CurrentEntityState {
  return {
    entityType: 'character',
    entityId: record.id,
    name: record.name,
    summary: record.summary,
    quantity: null,
    existsFromTick: record.existsFromTick,
    existsToTick: record.existsToTick,
    location:
      record.locationId !== null
        ? {
            id: record.locationId,
            name: record.locationName,
          }
        : null,
    ownerCharacter: null,
  };
}

function toCurrentLocationState(record: LocationRecord): CurrentEntityState {
  return {
    entityType: 'location',
    entityId: record.id,
    name: record.name,
    summary: record.summary,
    quantity: null,
    existsFromTick: record.existsFromTick,
    existsToTick: record.existsToTick,
    location: null,
    ownerCharacter: null,
  };
}

function toCurrentItemState(record: ItemRecord): CurrentEntityState {
  return {
    entityType: 'item',
    entityId: record.id,
    name: record.name,
    summary: record.summary,
    quantity: record.quantity,
    existsFromTick: record.existsFromTick,
    existsToTick: record.existsToTick,
    location:
      record.locationId !== null
        ? {
            id: record.locationId,
            name: record.locationName,
          }
        : null,
    ownerCharacter:
      record.ownerCharacterId !== null
        ? {
            id: record.ownerCharacterId,
            name: record.ownerCharacterName,
          }
        : null,
  };
}

function formatTickRange(record: { existsFromTick: number; existsToTick: number | null }): string {
  return `${record.existsFromTick} -> ${record.existsToTick ?? 'present'}`;
}

function buildSnapshotRecord(
  reference: EntityReference,
  tick: number,
  status: SnapshotRecord['status'],
  input: {
    title: string;
    summary: string;
    details: string[];
  },
): SnapshotRecord {
  return {
    ...reference,
    tick,
    status,
    title: input.title,
    summary: input.summary,
    details: input.details,
  };
}

function sanitizeFtsQuery(query: string): string {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  return tokens.map((token) => `"${token.replace(/"/g, '""')}"*`).join(' ');
}

function sameCurrentShape(
  current: CurrentEntityState | null,
  document: CanonicalEntityDocument,
): boolean {
  if (!current) {
    return false;
  }

  return (
    current.name === document.frontmatter.name &&
    current.summary === document.frontmatter.summary &&
    current.quantity === document.frontmatter.quantity &&
    current.existsFromTick === document.frontmatter.existsFromTick &&
    current.existsToTick === document.frontmatter.existsToTick &&
    current.location?.id === document.frontmatter.location?.id &&
    current.ownerCharacter?.id === document.frontmatter.ownerCharacter?.id
  );
}

export function createRelationalIndexStore(db: AppDatabase): RelationalIndexStore {
  function withTransaction<TResult>(callback: () => TResult): TResult {
    return db.$client.transaction(callback)();
  }

  function loadCurrentEntityState(reference: EntityReference): CurrentEntityState | null {
    switch (reference.entityType) {
      case 'character': {
        const record = getCharacterRow(db, reference.entityId);
        return record ? toCurrentCharacterState(record) : null;
      }
      case 'location': {
        const record = getLocationRecord(db, reference.entityId);
        return record ? toCurrentLocationState(record) : null;
      }
      case 'item': {
        const record = getItemRow(db, reference.entityId);
        return record ? toCurrentItemState(record) : null;
      }
    }
  }

  function loadEntitySnapshot(reference: EntityReference, tick: number): SnapshotRecord {
    switch (reference.entityType) {
      case 'character': {
        const current = getCharacterRow(db, reference.entityId);
        const status = getTemporalDetailStatus(current, tick);

        if (status !== 'active') {
          return buildSnapshotRecord(reference, tick, status, {
            title: current?.name ?? `Character ${reference.entityId}`,
            summary: current?.summary ?? 'No current character state is available.',
            details: [`Status at tick ${tick}: ${status}`],
          });
        }

        const record = getCharacterRowAsOf(db, reference.entityId, tick);

        return buildSnapshotRecord(reference, tick, status, {
          title: record?.name ?? current?.name ?? `Character ${reference.entityId}`,
          summary: record?.summary ?? current?.summary ?? '',
          details: [
            `Tick: ${tick}`,
            `Location: ${record?.locationName ?? 'None'}`,
            `Exists: ${record ? formatTickRange(record) : formatTickRange(current!)}`,
          ],
        });
      }
      case 'location': {
        const current = getLocationRecord(db, reference.entityId);
        const status = getTemporalDetailStatus(current, tick);

        if (status !== 'active') {
          return buildSnapshotRecord(reference, tick, status, {
            title: current?.name ?? `Location ${reference.entityId}`,
            summary: current?.summary ?? 'No current location state is available.',
            details: [`Status at tick ${tick}: ${status}`],
          });
        }

        const record = getLocationRowAsOf(db, reference.entityId, tick);

        return buildSnapshotRecord(reference, tick, status, {
          title: record?.name ?? current?.name ?? `Location ${reference.entityId}`,
          summary: record?.summary ?? current?.summary ?? '',
          details: [
            `Tick: ${tick}`,
            `Exists: ${record ? formatTickRange(record) : formatTickRange(current!)}`,
          ],
        });
      }
      case 'item': {
        const current = getItemRow(db, reference.entityId);
        const status = getTemporalDetailStatus(current, tick);

        if (status !== 'active') {
          return buildSnapshotRecord(reference, tick, status, {
            title: current?.name ?? `Item ${reference.entityId}`,
            summary: current?.summary ?? 'No current item state is available.',
            details: [`Status at tick ${tick}: ${status}`],
          });
        }

        const record = getItemRowAsOf(db, reference.entityId, tick);

        return buildSnapshotRecord(reference, tick, status, {
          title: record?.name ?? current?.name ?? `Item ${reference.entityId}`,
          summary: record?.summary ?? current?.summary ?? '',
          details: [
            `Tick: ${tick}`,
            `Quantity: ${record?.quantity ?? current?.quantity ?? 0}`,
            `Owner: ${record?.ownerCharacterName ?? 'None'}`,
            `Location: ${record?.locationName ?? 'None'}`,
            `Exists: ${record ? formatTickRange(record) : formatTickRange(current!)}`,
          ],
        });
      }
    }
  }

  function enqueueSnapshotJob(job: SnapshotJob): void {
    db.$client
      .prepare(
        `
          INSERT INTO entity_snapshot_jobs (
            entity_type,
            entity_id,
            tick,
            retry_count,
            last_error
          ) VALUES (?, ?, ?, 0, NULL)
          ON CONFLICT(entity_type, entity_id, tick) DO UPDATE SET
            last_error = NULL
        `,
      )
      .run(job.entityType, job.entityId, job.tick);
  }

  function listPendingSnapshotJobs(): SnapshotJob[] {
    return db.$client
      .prepare(
        `
          SELECT entity_type AS entityType, entity_id AS entityId, tick
          FROM entity_snapshot_jobs
          ORDER BY tick, entity_type, entity_id
        `,
      )
      .all() as SnapshotJob[];
  }

  function markSnapshotJobComplete(job: SnapshotJob): void {
    db.$client
      .prepare(
        `
          DELETE FROM entity_snapshot_jobs
          WHERE entity_type = ?
            AND entity_id = ?
            AND tick = ?
        `,
      )
      .run(job.entityType, job.entityId, job.tick);
  }

  function markSnapshotJobFailed(job: SnapshotJob, error: unknown): void {
    db.$client
      .prepare(
        `
          UPDATE entity_snapshot_jobs
          SET retry_count = retry_count + 1,
              last_error = ?
          WHERE entity_type = ?
            AND entity_id = ?
            AND tick = ?
        `,
      )
      .run(String(error), job.entityType, job.entityId, job.tick);
  }

  function markDocumentSyncClean(
    reference: EntityReference,
    input: {
      canonicalPath: string;
      contentHash: string;
      syncedAt: number;
    },
  ): void {
    db.$client
      .prepare(
        `
          INSERT INTO entity_document_sync_state (
            entity_type,
            entity_id,
            canonical_path,
            content_hash,
            last_synced_at,
            dirty_reason,
            retry_count,
            last_error
          ) VALUES (?, ?, ?, ?, ?, NULL, 0, NULL)
          ON CONFLICT(entity_type, entity_id) DO UPDATE SET
            canonical_path = excluded.canonical_path,
            content_hash = excluded.content_hash,
            last_synced_at = excluded.last_synced_at,
            dirty_reason = NULL,
            retry_count = 0,
            last_error = NULL
        `,
      )
      .run(
        reference.entityType,
        reference.entityId,
        input.canonicalPath,
        input.contentHash,
        input.syncedAt,
      );
  }

  function markDocumentSyncDirty(
    reference: EntityReference,
    input: {
      reason: string;
      error: unknown;
    },
  ): void {
    db.$client
      .prepare(
        `
          INSERT INTO entity_document_sync_state (
            entity_type,
            entity_id,
            canonical_path,
            content_hash,
            last_synced_at,
            dirty_reason,
            retry_count,
            last_error
          ) VALUES (?, ?, NULL, NULL, NULL, ?, 1, ?)
          ON CONFLICT(entity_type, entity_id) DO UPDATE SET
            dirty_reason = excluded.dirty_reason,
            retry_count = entity_document_sync_state.retry_count + 1,
            last_error = excluded.last_error
        `,
      )
      .run(reference.entityType, reference.entityId, input.reason, String(input.error));
  }

  function listDirtyDocumentReferences(): EntityReference[] {
    return db.$client
      .prepare(
        `
          SELECT entity_type AS entityType, entity_id AS entityId
          FROM entity_document_sync_state
          WHERE dirty_reason IS NOT NULL
          ORDER BY entity_type, entity_id
        `,
      )
      .all() as EntityReference[];
  }

  function upsertSearchDocument(document: SearchDocument): void {
    db.$client
      .prepare(
        `
          INSERT INTO world_search_documents (
            entity_type,
            entity_id,
            title,
            summary,
            body,
            relationships_text,
            canonical_path,
            content_hash,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(entity_type, entity_id) DO UPDATE SET
            title = excluded.title,
            summary = excluded.summary,
            body = excluded.body,
            relationships_text = excluded.relationships_text,
            canonical_path = excluded.canonical_path,
            content_hash = excluded.content_hash,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        document.entityType,
        document.entityId,
        document.title,
        document.summary,
        document.body,
        document.relationshipsText,
        document.canonicalPath,
        document.contentHash,
        document.updatedAt,
      );

    db.$client
      .prepare(
        `
          DELETE FROM world_search_fts
          WHERE entity_type = ?
            AND entity_id = ?
        `,
      )
      .run(document.entityType, document.entityId);

    db.$client
      .prepare(
        `
          INSERT INTO world_search_fts (
            entity_type,
            entity_id,
            title,
            summary,
            body,
            relationships
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        document.entityType,
        document.entityId,
        document.title,
        document.summary,
        document.body,
        document.relationshipsText,
      );
  }

  function deleteSearchDocument(reference: EntityReference): void {
    db.$client
      .prepare(
        `
          DELETE FROM world_search_documents
          WHERE entity_type = ?
            AND entity_id = ?
        `,
      )
      .run(reference.entityType, reference.entityId);

    db.$client
      .prepare(
        `
          DELETE FROM world_search_fts
          WHERE entity_type = ?
            AND entity_id = ?
        `,
      )
      .run(reference.entityType, reference.entityId);
  }

  function markVectorSyncDirty(
    reference: EntityReference,
    input: {
      reason: string;
      contentHash: string | null;
    },
  ): void {
    db.$client
      .prepare(
        `
          INSERT INTO entity_vector_sync_state (
            entity_type,
            entity_id,
            content_hash,
            last_synced_at,
            dirty_reason,
            retry_count,
            last_error
          ) VALUES (?, ?, ?, NULL, ?, 0, NULL)
          ON CONFLICT(entity_type, entity_id) DO UPDATE SET
            content_hash = excluded.content_hash,
            dirty_reason = excluded.dirty_reason
        `,
      )
      .run(reference.entityType, reference.entityId, input.contentHash, input.reason);
  }

  function markVectorSyncClean(
    reference: EntityReference,
    input: {
      contentHash: string | null;
      indexedAt: number;
    },
  ): void {
    db.$client
      .prepare(
        `
          INSERT INTO entity_vector_sync_state (
            entity_type,
            entity_id,
            content_hash,
            last_synced_at,
            dirty_reason,
            retry_count,
            last_error
          ) VALUES (?, ?, ?, ?, NULL, 0, NULL)
          ON CONFLICT(entity_type, entity_id) DO UPDATE SET
            content_hash = excluded.content_hash,
            last_synced_at = excluded.last_synced_at,
            dirty_reason = NULL,
            retry_count = 0,
            last_error = NULL
        `,
      )
      .run(reference.entityType, reference.entityId, input.contentHash, input.indexedAt);
  }

  function markVectorSyncFailed(reference: EntityReference, error: unknown): void {
    db.$client
      .prepare(
        `
          INSERT INTO entity_vector_sync_state (
            entity_type,
            entity_id,
            content_hash,
            last_synced_at,
            dirty_reason,
            retry_count,
            last_error
          ) VALUES (?, ?, NULL, NULL, 'vector_sync_failed', 1, ?)
          ON CONFLICT(entity_type, entity_id) DO UPDATE SET
            dirty_reason = 'vector_sync_failed',
            retry_count = entity_vector_sync_state.retry_count + 1,
            last_error = excluded.last_error
        `,
      )
      .run(reference.entityType, reference.entityId, String(error));
  }

  function listDirtyVectorReferences(): EntityReference[] {
    return db.$client
      .prepare(
        `
          SELECT entity_type AS entityType, entity_id AS entityId
          FROM entity_vector_sync_state
          WHERE dirty_reason IS NOT NULL
          ORDER BY entity_type, entity_id
        `,
      )
      .all() as EntityReference[];
  }

  function listAllEntityReferences(): EntityReference[] {
    return db.$client
      .prepare(
        `
          SELECT 'character' AS entityType, id AS entityId FROM characters
          UNION ALL
          SELECT 'location' AS entityType, id AS entityId FROM locations
          UNION ALL
          SELECT 'item' AS entityType, id AS entityId FROM items
          ORDER BY entityType, entityId
        `,
      )
      .all() as EntityReference[];
  }

  function listSearchDocumentReferences(): EntityReference[] {
    return db.$client
      .prepare(
        `
          SELECT entity_type AS entityType, entity_id AS entityId
          FROM world_search_documents
          ORDER BY entity_type, entity_id
        `,
      )
      .all() as EntityReference[];
  }

  function searchWorld(input: SearchWorldInput): WorldSearchHit[] {
    const matchQuery = sanitizeFtsQuery(input.query);

    if (matchQuery.length === 0) {
      return [];
    }

    return db.$client
      .prepare(
        `
          SELECT
            d.entity_type AS entityType,
            d.entity_id AS entityId,
            d.title,
            d.summary,
            COALESCE(
              NULLIF(snippet(world_search_fts, 4, '[', ']', '…', 12), ''),
              NULLIF(snippet(world_search_fts, 3, '[', ']', '…', 12), ''),
              d.summary,
              d.title
            ) AS matchedText,
            -bm25(world_search_fts) AS score
          FROM world_search_fts
          JOIN world_search_documents d
            ON d.entity_type = world_search_fts.entity_type
           AND d.entity_id = world_search_fts.entity_id
          WHERE world_search_fts MATCH ?
          ORDER BY bm25(world_search_fts), d.updated_at DESC, d.entity_type, d.entity_id
          LIMIT ?
        `,
      )
      .all(matchQuery, input.limit ?? 20) as WorldSearchHit[];
  }

  function getStorageHealth(input: {
    worldRoot: string;
    vectorEngine: string;
  }): StorageHealth {
    const counts = db.$client
      .prepare(
        `
          SELECT
            (SELECT COUNT(*) FROM entity_document_sync_state WHERE dirty_reason IS NOT NULL) AS documentDirtyCount,
            (SELECT COUNT(*) FROM entity_vector_sync_state WHERE dirty_reason IS NOT NULL) AS vectorDirtyCount,
            (SELECT COUNT(*) FROM entity_snapshot_jobs) AS pendingSnapshotCount,
            (SELECT COUNT(*) FROM world_search_documents) AS searchDocumentCount
        `,
      )
      .get() as HealthCountsRow;
    const lastDocumentError = db.$client
      .prepare(
        `
          SELECT last_error AS lastError
          FROM entity_document_sync_state
          WHERE last_error IS NOT NULL
          ORDER BY rowid DESC
          LIMIT 1
        `,
      )
      .get() as SyncErrorRow | undefined;
    const lastVectorError = db.$client
      .prepare(
        `
          SELECT last_error AS lastError
          FROM entity_vector_sync_state
          WHERE last_error IS NOT NULL
          ORDER BY rowid DESC
          LIMIT 1
        `,
      )
      .get() as SyncErrorRow | undefined;

    return {
      worldRoot: input.worldRoot,
      vectorEngine: input.vectorEngine,
      documentDirtyCount: counts.documentDirtyCount,
      vectorDirtyCount: counts.vectorDirtyCount,
      pendingSnapshotCount: counts.pendingSnapshotCount,
      searchDocumentCount: counts.searchDocumentCount,
      lastDocumentError: lastDocumentError?.lastError ?? null,
      lastVectorError: lastVectorError?.lastError ?? null,
    };
  }

  function getOpenLocationVersion(locationId: number): OpenIntervalRow | undefined {
    return db.$client
      .prepare(
        `
          SELECT id, valid_from AS validFrom
          FROM location_versions
          WHERE location_id = ?
            AND valid_to IS NULL
        `,
      )
      .get(locationId) as OpenIntervalRow | undefined;
  }

  function getOpenCharacterVersion(characterId: number): OpenIntervalRow | undefined {
    return db.$client
      .prepare(
        `
          SELECT id, valid_from AS validFrom
          FROM character_versions
          WHERE character_id = ?
            AND valid_to IS NULL
        `,
      )
      .get(characterId) as OpenIntervalRow | undefined;
  }

  function getOpenItemVersion(itemId: number): OpenIntervalRow | undefined {
    return db.$client
      .prepare(
        `
          SELECT id, valid_from AS validFrom
          FROM item_versions
          WHERE item_id = ?
            AND valid_to IS NULL
        `,
      )
      .get(itemId) as OpenIntervalRow | undefined;
  }

  function getOpenCharacterLocationSpan(
    characterId: number,
  ): OpenCharacterLocationRow | undefined {
    return db.$client
      .prepare(
        `
          SELECT id, valid_from AS validFrom, location_id AS locationId
          FROM character_location_spans
          WHERE character_id = ?
            AND valid_to IS NULL
        `,
      )
      .get(characterId) as OpenCharacterLocationRow | undefined;
  }

  function getOpenItemAssignmentSpan(itemId: number): OpenItemAssignmentRow | undefined {
    return db.$client
      .prepare(
        `
          SELECT
            id,
            valid_from AS validFrom,
            owner_character_id AS ownerCharacterId,
            location_id AS locationId
          FROM item_assignment_spans
          WHERE item_id = ?
            AND valid_to IS NULL
        `,
      )
      .get(itemId) as OpenItemAssignmentRow | undefined;
  }

  function importLocationDocument(document: CanonicalEntityDocument): 'created' | 'updated' | 'unchanged' {
    const current = loadCurrentEntityState({
      entityType: 'location',
      entityId: document.frontmatter.id,
    });

    if (sameCurrentShape(current, document)) {
      const openVersion = getOpenLocationVersion(document.frontmatter.id);

      if (openVersion) {
        db.$client
          .prepare(
            `
              UPDATE location_versions
              SET name = ?, summary = ?, is_inferred = 0, created_at = ?
              WHERE id = ?
            `,
          )
          .run(
            document.frontmatter.name,
            document.frontmatter.summary,
            Date.now(),
            openVersion.id,
          );
      }

      return 'unchanged';
    }

    const now = Date.now();
    const openVersion = getOpenLocationVersion(document.frontmatter.id);

    if (!current) {
      db.$client
        .prepare(
          `
            INSERT INTO locations (
              id,
              name,
              summary,
              exists_from_tick,
              exists_to_tick,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.name,
          document.frontmatter.summary,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          now,
          now,
        );

      db.$client
        .prepare(
          `
            INSERT INTO location_versions (
              location_id,
              valid_from,
              valid_to,
              name,
              summary,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          document.frontmatter.name,
          document.frontmatter.summary,
          now,
        );

      return 'created';
    }

    db.$client
      .prepare(
        `
          UPDATE locations
          SET name = ?,
              summary = ?,
              exists_from_tick = ?,
              exists_to_tick = ?,
              updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        document.frontmatter.name,
        document.frontmatter.summary,
        document.frontmatter.existsFromTick,
        document.frontmatter.existsToTick,
        now,
        document.frontmatter.id,
      );

    if (openVersion) {
      db.$client
        .prepare(
          `
            UPDATE location_versions
            SET name = ?, summary = ?, valid_to = ?, is_inferred = 0, created_at = ?
            WHERE id = ?
          `,
        )
        .run(
          document.frontmatter.name,
          document.frontmatter.summary,
          document.frontmatter.existsToTick,
          now,
          openVersion.id,
        );
    } else {
      db.$client
        .prepare(
          `
            INSERT INTO location_versions (
              location_id,
              valid_from,
              valid_to,
              name,
              summary,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          document.frontmatter.name,
          document.frontmatter.summary,
          now,
        );
    }

    return 'updated';
  }

  function importCharacterDocument(document: CanonicalEntityDocument): 'created' | 'updated' | 'unchanged' {
    const reference = {
      entityType: 'character' as const,
      entityId: document.frontmatter.id,
    };
    const current = loadCurrentEntityState(reference);
    const now = Date.now();
    const openVersion = getOpenCharacterVersion(document.frontmatter.id);
    const openSpan = getOpenCharacterLocationSpan(document.frontmatter.id);
    const locationId = document.frontmatter.location?.id ?? null;

    if (!current) {
      db.$client
        .prepare(
          `
            INSERT INTO characters (
              id,
              name,
              summary,
              location_id,
              exists_from_tick,
              exists_to_tick,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.name,
          document.frontmatter.summary,
          locationId,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          now,
          now,
        );

      db.$client
        .prepare(
          `
            INSERT INTO character_versions (
              character_id,
              valid_from,
              valid_to,
              name,
              summary,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          document.frontmatter.name,
          document.frontmatter.summary,
          now,
        );

      if (locationId !== null) {
        db.$client
          .prepare(
            `
              INSERT INTO character_location_spans (
                character_id,
                location_id,
                valid_from,
                valid_to,
                is_inferred,
                created_at
              ) VALUES (?, ?, ?, ?, 0, ?)
            `,
          )
          .run(
            document.frontmatter.id,
            locationId,
            document.frontmatter.existsFromTick,
            document.frontmatter.existsToTick,
            now,
          );
      }

      return 'created';
    }

    if (sameCurrentShape(current, document)) {
      return 'unchanged';
    }

    db.$client
      .prepare(
        `
          UPDATE characters
          SET name = ?,
              summary = ?,
              location_id = ?,
              exists_from_tick = ?,
              exists_to_tick = ?,
              updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        document.frontmatter.name,
        document.frontmatter.summary,
        locationId,
        document.frontmatter.existsFromTick,
        document.frontmatter.existsToTick,
        now,
        document.frontmatter.id,
      );

    if (openVersion) {
      db.$client
        .prepare(
          `
            UPDATE character_versions
            SET name = ?, summary = ?, valid_to = ?, is_inferred = 0, created_at = ?
            WHERE id = ?
          `,
        )
        .run(
          document.frontmatter.name,
          document.frontmatter.summary,
          document.frontmatter.existsToTick,
          now,
          openVersion.id,
        );
    } else {
      db.$client
        .prepare(
          `
            INSERT INTO character_versions (
              character_id,
              valid_from,
              valid_to,
              name,
              summary,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          document.frontmatter.name,
          document.frontmatter.summary,
          now,
        );
    }

    if (openSpan) {
      db.$client
        .prepare(
          `
            DELETE FROM character_location_spans
            WHERE id = ?
          `,
        )
        .run(openSpan.id);
    }

    if (locationId !== null) {
      db.$client
        .prepare(
          `
            INSERT INTO character_location_spans (
              character_id,
              location_id,
              valid_from,
              valid_to,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          locationId,
          openSpan?.validFrom ?? openVersion?.validFrom ?? document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          now,
        );
    }

    return 'updated';
  }

  function importItemDocument(document: CanonicalEntityDocument): 'created' | 'updated' | 'unchanged' {
    const reference = {
      entityType: 'item' as const,
      entityId: document.frontmatter.id,
    };
    const current = loadCurrentEntityState(reference);
    const now = Date.now();
    const openVersion = getOpenItemVersion(document.frontmatter.id);
    const openSpan = getOpenItemAssignmentSpan(document.frontmatter.id);
    const ownerCharacterId = document.frontmatter.ownerCharacter?.id ?? null;
    const locationId = document.frontmatter.location?.id ?? null;

    if (!current) {
      db.$client
        .prepare(
          `
            INSERT INTO items (
              id,
              name,
              summary,
              quantity,
              owner_character_id,
              location_id,
              exists_from_tick,
              exists_to_tick,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.name,
          document.frontmatter.summary,
          document.frontmatter.quantity ?? 0,
          ownerCharacterId,
          locationId,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          now,
          now,
        );

      db.$client
        .prepare(
          `
            INSERT INTO item_versions (
              item_id,
              valid_from,
              valid_to,
              name,
              summary,
              quantity,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          document.frontmatter.name,
          document.frontmatter.summary,
          document.frontmatter.quantity ?? 0,
          now,
        );

      if (ownerCharacterId !== null || locationId !== null) {
        db.$client
          .prepare(
            `
              INSERT INTO item_assignment_spans (
                item_id,
                owner_character_id,
                location_id,
                valid_from,
                valid_to,
                is_inferred,
                created_at
              ) VALUES (?, ?, ?, ?, ?, 0, ?)
            `,
          )
          .run(
            document.frontmatter.id,
            ownerCharacterId,
            locationId,
            document.frontmatter.existsFromTick,
            document.frontmatter.existsToTick,
            now,
          );
      }

      return 'created';
    }

    if (sameCurrentShape(current, document)) {
      return 'unchanged';
    }

    db.$client
      .prepare(
        `
          UPDATE items
          SET name = ?,
              summary = ?,
              quantity = ?,
              owner_character_id = ?,
              location_id = ?,
              exists_from_tick = ?,
              exists_to_tick = ?,
              updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        document.frontmatter.name,
        document.frontmatter.summary,
        document.frontmatter.quantity ?? 0,
        ownerCharacterId,
        locationId,
        document.frontmatter.existsFromTick,
        document.frontmatter.existsToTick,
        now,
        document.frontmatter.id,
      );

    if (openVersion) {
      db.$client
        .prepare(
          `
            UPDATE item_versions
            SET name = ?, summary = ?, quantity = ?, valid_to = ?, is_inferred = 0, created_at = ?
            WHERE id = ?
          `,
        )
        .run(
          document.frontmatter.name,
          document.frontmatter.summary,
          document.frontmatter.quantity ?? 0,
          document.frontmatter.existsToTick,
          now,
          openVersion.id,
        );
    } else {
      db.$client
        .prepare(
          `
            INSERT INTO item_versions (
              item_id,
              valid_from,
              valid_to,
              name,
              summary,
              quantity,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          document.frontmatter.name,
          document.frontmatter.summary,
          document.frontmatter.quantity ?? 0,
          now,
        );
    }

    if (openSpan) {
      db.$client
        .prepare(
          `
            DELETE FROM item_assignment_spans
            WHERE id = ?
          `,
        )
        .run(openSpan.id);
    }

    if (ownerCharacterId !== null || locationId !== null) {
      db.$client
        .prepare(
          `
            INSERT INTO item_assignment_spans (
              item_id,
              owner_character_id,
              location_id,
              valid_from,
              valid_to,
              is_inferred,
              created_at
            ) VALUES (?, ?, ?, ?, ?, 0, ?)
          `,
        )
        .run(
          document.frontmatter.id,
          ownerCharacterId,
          locationId,
          openSpan?.validFrom ?? openVersion?.validFrom ?? document.frontmatter.existsFromTick,
          document.frontmatter.existsToTick,
          now,
        );
    }

    return 'updated';
  }

  function upsertImportedDocument(document: CanonicalEntityDocument): 'created' | 'updated' | 'unchanged' {
    switch (document.frontmatter.type) {
      case 'location':
        return importLocationDocument(document);
      case 'character':
        return importCharacterDocument(document);
      case 'item':
        return importItemDocument(document);
    }
  }

  return {
    withTransaction,
    loadCurrentEntityState,
    loadEntitySnapshot,
    upsertImportedDocument,
    listAllEntityReferences,
    listSearchDocumentReferences,
    enqueueSnapshotJob,
    listPendingSnapshotJobs,
    markSnapshotJobComplete,
    markSnapshotJobFailed,
    markDocumentSyncClean,
    markDocumentSyncDirty,
    listDirtyDocumentReferences,
    upsertSearchDocument,
    deleteSearchDocument,
    markVectorSyncDirty,
    markVectorSyncClean,
    markVectorSyncFailed,
    listDirtyVectorReferences,
    searchWorld,
    getStorageHealth,
  };
}
