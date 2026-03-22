import type {
  SearchWorldInput,
  SemanticSearchInput,
  StorageHealth,
  StorageOperationResult,
  WorldEntityType,
  WorldSearchHit,
} from '@shared/storage';
import type { TemporalDetailStatus } from '@shared/temporal';

export type EntityReference = {
  entityType: WorldEntityType;
  entityId: number;
};

export type EntityRelation = {
  id: number;
  name?: string | null;
};

export type CurrentEntityState = EntityReference & {
  name: string;
  summary: string;
  quantity: number | null;
  existsFromTick: number;
  existsToTick: number | null;
  location: EntityRelation | null;
  ownerCharacter: EntityRelation | null;
};

export type CanonicalEntityFrontmatter = {
  id: number;
  type: WorldEntityType;
  slug: string;
  name: string;
  summary: string;
  quantity: number | null;
  location: EntityRelation | null;
  ownerCharacter: EntityRelation | null;
  existsFromTick: number;
  existsToTick: number | null;
  syncHash: string;
  syncVersion: number;
};

export type CanonicalEntityDocument = {
  path: string;
  body: string;
  contentHash: string;
  frontmatter: CanonicalEntityFrontmatter;
};

export type SearchDocument = EntityReference & {
  title: string;
  summary: string;
  body: string;
  relationshipsText: string;
  canonicalPath: string;
  contentHash: string;
  updatedAt: number;
};

export type SnapshotRecord = EntityReference & {
  tick: number;
  status: TemporalDetailStatus;
  title: string;
  summary: string;
  details: string[];
};

export type SnapshotJob = EntityReference & {
  tick: number;
};

export type StorageMutationResult<TResult> = {
  entityId: number;
  result: TResult;
};

export interface DocumentStore {
  readonly worldRoot: string;
  ensureWorldStructure(): void;
  writeCanonicalDocument(
    state: CurrentEntityState,
    options?: {
      body?: string;
    },
  ): CanonicalEntityDocument;
  readCanonicalDocuments(): CanonicalEntityDocument[];
  writeSnapshot(snapshot: SnapshotRecord): string;
}

export interface SearchDocumentBuilder {
  build(input: {
    document: CanonicalEntityDocument;
    currentState: CurrentEntityState | null;
  }): SearchDocument;
}

export interface RelationalIndexStore {
  withTransaction<TResult>(callback: () => TResult): TResult;
  loadCurrentEntityState(reference: EntityReference): CurrentEntityState | null;
  loadEntitySnapshot(reference: EntityReference, tick: number): SnapshotRecord;
  upsertImportedDocument(document: CanonicalEntityDocument): 'created' | 'updated' | 'unchanged';
  listAllEntityReferences(): EntityReference[];
  listSearchDocumentReferences(): EntityReference[];
  enqueueSnapshotJob(job: SnapshotJob): void;
  listPendingSnapshotJobs(): SnapshotJob[];
  markSnapshotJobComplete(job: SnapshotJob): void;
  markSnapshotJobFailed(job: SnapshotJob, error: unknown): void;
  markDocumentSyncClean(
    reference: EntityReference,
    input: {
      canonicalPath: string;
      contentHash: string;
      syncedAt: number;
    },
  ): void;
  markDocumentSyncDirty(
    reference: EntityReference,
    input: {
      reason: string;
      error: unknown;
    },
  ): void;
  listDirtyDocumentReferences(): EntityReference[];
  upsertSearchDocument(document: SearchDocument): void;
  deleteSearchDocument(reference: EntityReference): void;
  markVectorSyncDirty(
    reference: EntityReference,
    input: {
      reason: string;
      contentHash: string | null;
    },
  ): void;
  markVectorSyncClean(
    reference: EntityReference,
    input: {
      contentHash: string | null;
      indexedAt: number;
    },
  ): void;
  markVectorSyncFailed(reference: EntityReference, error: unknown): void;
  listDirtyVectorReferences(): EntityReference[];
  searchWorld(input: SearchWorldInput): WorldSearchHit[];
  getStorageHealth(input: {
    worldRoot: string;
    vectorEngine: string;
  }): StorageHealth;
}

export interface VectorIndex {
  readonly engineName: string;
  open(): void;
  upsertDocument(document: SearchDocument): void;
  deleteEntity(reference: EntityReference): void;
  pruneMissingEntities(validReferences: EntityReference[]): number;
  search(input: SemanticSearchInput): WorldSearchHit[];
}

export interface StorageCoordinator {
  initialize(): void;
  commitEntityMutation<TResult>(input: {
    entityType: WorldEntityType;
    tick: number;
    mutate: () => StorageMutationResult<TResult>;
  }): TResult;
  searchWorld(input: SearchWorldInput): WorldSearchHit[];
  semanticSearch(input: SemanticSearchInput): WorldSearchHit[];
  rebuildIndexes(): StorageOperationResult;
  importMarkdownChanges(): StorageOperationResult;
  getStorageHealth(): StorageHealth;
}
