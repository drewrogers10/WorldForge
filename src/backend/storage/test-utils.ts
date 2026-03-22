import path from 'node:path';
import { createTestDatabaseContext } from '@db/test-utils';
import { createDocumentStore } from './document-store';
import { createSearchDocumentBuilder } from './search-document-builder';
import { createRelationalIndexStore } from './sqlite-relational-index-store';
import { createStorageCoordinator } from './storage-coordinator';
import { createVectorIndex } from './vector-index';
import type {
  DocumentStore,
  SearchDocumentBuilder,
  StorageCoordinator,
  VectorIndex,
} from './types';

type TestStorageOverrides = Partial<{
  documentStore: DocumentStore;
  searchDocumentBuilder: SearchDocumentBuilder;
  vectorIndex: VectorIndex;
}>;

export function createTestStorageContext(overrides: TestStorageOverrides = {}) {
  const databaseContext = createTestDatabaseContext();
  const worldRoot = path.join(databaseContext.directory, 'world');
  const documentStore = overrides.documentStore ?? createDocumentStore(worldRoot);
  const relationalIndexStore = createRelationalIndexStore(databaseContext.db);
  const searchDocumentBuilder =
    overrides.searchDocumentBuilder ?? createSearchDocumentBuilder();
  const vectorIndex =
    overrides.vectorIndex ??
    createVectorIndex(path.join(worldRoot, '.worldforge', 'vector', 'index.json'));
  const storageCoordinator: StorageCoordinator = createStorageCoordinator({
    documentStore,
    relationalIndexStore,
    searchDocumentBuilder,
    vectorIndex,
  });

  storageCoordinator.initialize();

  return {
    ...databaseContext,
    worldRoot,
    documentStore,
    relationalIndexStore,
    searchDocumentBuilder,
    vectorIndex,
    storageCoordinator,
  };
}
