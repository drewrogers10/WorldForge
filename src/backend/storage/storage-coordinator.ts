import type {
  SearchWorldInput,
  SemanticSearchInput,
  StorageHealth,
  StorageOperationResult,
  WorldEntityType,
  WorldSearchHit,
} from '@shared/storage';
import type {
  DocumentStore,
  EntityReference,
  RelationalIndexStore,
  SearchDocumentBuilder,
  SnapshotJob,
  StorageCoordinator,
  StorageMutationResult,
  VectorIndex,
} from './types';

type StorageCoordinatorDependencies = {
  documentStore: DocumentStore;
  relationalIndexStore: RelationalIndexStore;
  searchDocumentBuilder: SearchDocumentBuilder;
  vectorIndex: VectorIndex;
};

const ENTITY_IMPORT_ORDER: Record<WorldEntityType, number> = {
  location: 0,
  character: 1,
  item: 2,
};

function referenceKey(reference: EntityReference): string {
  return `${reference.entityType}:${reference.entityId}`;
}

export function createStorageCoordinator(
  dependencies: StorageCoordinatorDependencies,
): StorageCoordinator {
  const {
    documentStore,
    relationalIndexStore,
    searchDocumentBuilder,
    vectorIndex,
  } = dependencies;

  let vectorSyncScheduled = false;

  function scheduleVectorSync(): void {
    if (vectorSyncScheduled) {
      return;
    }

    vectorSyncScheduled = true;

    queueMicrotask(() => {
      vectorSyncScheduled = false;

      try {
        processDirtyVectorSync();
      } catch {
        // Dirty state is already tracked in SQLite and will be retried later.
      }
    });
  }

  function syncCanonicalDocument(
    reference: EntityReference,
    options?: {
      body?: string;
    },
  ): void {
    const currentState = relationalIndexStore.loadCurrentEntityState(reference);

    if (!currentState) {
      relationalIndexStore.deleteSearchDocument(reference);
      vectorIndex.deleteEntity(reference);
      relationalIndexStore.markVectorSyncClean(reference, {
        contentHash: null,
        indexedAt: Date.now(),
      });
      return;
    }

    try {
      const document = documentStore.writeCanonicalDocument(currentState, options);
      const searchDocument = searchDocumentBuilder.build({
        document,
        currentState,
      });

      relationalIndexStore.markDocumentSyncClean(reference, {
        canonicalPath: document.path,
        contentHash: document.contentHash,
        syncedAt: Date.now(),
      });
      relationalIndexStore.upsertSearchDocument(searchDocument);
      relationalIndexStore.markVectorSyncDirty(reference, {
        reason: 'pending_reindex',
        contentHash: document.contentHash,
      });
      scheduleVectorSync();
    } catch (error) {
      relationalIndexStore.markDocumentSyncDirty(reference, {
        reason: 'canonical_write_failed',
        error,
      });
    }
  }

  function processSnapshotJobs(): void {
    for (const job of relationalIndexStore.listPendingSnapshotJobs()) {
      try {
        const snapshot = relationalIndexStore.loadEntitySnapshot(job, job.tick);
        documentStore.writeSnapshot(snapshot);
        relationalIndexStore.markSnapshotJobComplete(job);
      } catch (error) {
        relationalIndexStore.markSnapshotJobFailed(job, error);
      }
    }
  }

  function processDirtyVectorSync(): void {
    const documents = documentStore.readCanonicalDocuments();
    const documentMap = new Map(
      documents.map((document) => [
        referenceKey({
          entityType: document.frontmatter.type,
          entityId: document.frontmatter.id,
        }),
        document,
      ]),
    );

    for (const reference of relationalIndexStore.listDirtyVectorReferences()) {
      try {
        const currentState = relationalIndexStore.loadCurrentEntityState(reference);
        const document = documentMap.get(referenceKey(reference));

        if (!currentState || !document) {
          vectorIndex.deleteEntity(reference);
          relationalIndexStore.markVectorSyncClean(reference, {
            contentHash: null,
            indexedAt: Date.now(),
          });
          continue;
        }

        const searchDocument = searchDocumentBuilder.build({
          document,
          currentState,
        });

        vectorIndex.upsertDocument(searchDocument);
        relationalIndexStore.markVectorSyncClean(reference, {
          contentHash: document.contentHash,
          indexedAt: Date.now(),
        });
      } catch (error) {
        relationalIndexStore.markVectorSyncFailed(reference, error);
      }
    }
  }

  function reconcileAllEntityDocuments(): void {
    for (const reference of relationalIndexStore.listAllEntityReferences()) {
      syncCanonicalDocument(reference);
    }
  }

  function pruneStaleArtifacts(validReferences: EntityReference[]): number {
    const validKeys = new Set(validReferences.map((reference) => referenceKey(reference)));
    let deletedCount = 0;

    for (const reference of relationalIndexStore.listSearchDocumentReferences()) {
      if (validKeys.has(referenceKey(reference))) {
        continue;
      }

      relationalIndexStore.deleteSearchDocument(reference);
      deletedCount += 1;
    }

    deletedCount += vectorIndex.pruneMissingEntities(validReferences);

    return deletedCount;
  }

  function importMarkdownChanges(): StorageOperationResult {
    const documents = documentStore
      .readCanonicalDocuments()
      .sort((left, right) => {
        const orderDifference =
          ENTITY_IMPORT_ORDER[left.frontmatter.type] -
          ENTITY_IMPORT_ORDER[right.frontmatter.type];

        if (orderDifference !== 0) {
          return orderDifference;
        }

        return left.frontmatter.id - right.frontmatter.id;
      });
    const result: StorageOperationResult = {
      processedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      errorCount: 0,
      errors: [],
    };

    for (const document of documents) {
      const reference = {
        entityType: document.frontmatter.type,
        entityId: document.frontmatter.id,
      } satisfies EntityReference;

      try {
        const importStatus = relationalIndexStore.withTransaction(() =>
          relationalIndexStore.upsertImportedDocument(document),
        );
        const currentState = relationalIndexStore.loadCurrentEntityState(reference);

        if (!currentState) {
          throw new Error(
            `Imported ${reference.entityType} ${reference.entityId} but could not reload it from SQLite.`,
          );
        }

        const normalizedDocument = documentStore.writeCanonicalDocument(currentState, {
          body: document.body,
        });
        const searchDocument = searchDocumentBuilder.build({
          document: normalizedDocument,
          currentState,
        });

        relationalIndexStore.markDocumentSyncClean(reference, {
          canonicalPath: normalizedDocument.path,
          contentHash: normalizedDocument.contentHash,
          syncedAt: Date.now(),
        });
        relationalIndexStore.upsertSearchDocument(searchDocument);
        relationalIndexStore.markVectorSyncDirty(reference, {
          reason: 'imported_markdown',
          contentHash: normalizedDocument.contentHash,
        });

        result.processedCount += 1;

        if (importStatus !== 'unchanged') {
          result.updatedCount += 1;
        }
      } catch (error) {
        relationalIndexStore.markDocumentSyncDirty(reference, {
          reason: 'markdown_import_failed',
          error,
        });
        result.errorCount += 1;
        result.errors.push(String(error));
      }
    }

    processDirtyVectorSync();

    return result;
  }

  function rebuildIndexes(): StorageOperationResult {
    const importResult = importMarkdownChanges();
    reconcileAllEntityDocuments();
    processSnapshotJobs();
    processDirtyVectorSync();

    return {
      processedCount:
        importResult.processedCount +
        relationalIndexStore.listAllEntityReferences().length,
      updatedCount: importResult.updatedCount,
      deletedCount: pruneStaleArtifacts(relationalIndexStore.listAllEntityReferences()),
      errorCount: importResult.errorCount,
      errors: importResult.errors,
    };
  }

  function getStorageHealth(): StorageHealth {
    return relationalIndexStore.getStorageHealth({
      worldRoot: documentStore.worldRoot,
      vectorEngine: vectorIndex.engineName,
    });
  }

  function commitEntityMutation<TResult>(input: {
    entityType: WorldEntityType;
    tick: number;
    mutate: () => StorageMutationResult<TResult>;
  }): TResult {
    const payload = relationalIndexStore.withTransaction(() => {
      const mutation = input.mutate();
      const job: SnapshotJob = {
        entityType: input.entityType,
        entityId: mutation.entityId,
        tick: input.tick,
      };

      relationalIndexStore.enqueueSnapshotJob(job);

      return mutation;
    });
    const reference = {
      entityType: input.entityType,
      entityId: payload.entityId,
    } satisfies EntityReference;

    syncCanonicalDocument(reference);
    processSnapshotJobs();

    return payload.result;
  }

  function initialize(): void {
    documentStore.ensureWorldStructure();
    vectorIndex.open();
    importMarkdownChanges();
    reconcileAllEntityDocuments();
    processSnapshotJobs();
    pruneStaleArtifacts(relationalIndexStore.listAllEntityReferences());
    processDirtyVectorSync();
  }

  function searchWorld(input: SearchWorldInput): WorldSearchHit[] {
    return relationalIndexStore.searchWorld(input);
  }

  function semanticSearch(input: SemanticSearchInput): WorldSearchHit[] {
    return vectorIndex.search(input);
  }

  return {
    initialize,
    commitEntityMutation,
    searchWorld,
    semanticSearch,
    rebuildIndexes,
    importMarkdownChanges,
    getStorageHealth,
  };
}
