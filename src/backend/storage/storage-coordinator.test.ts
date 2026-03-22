import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocationService } from '@backend/services/location-service';
import { createTestDatabaseContext } from '@db/test-utils';
import { createDocumentStore } from './document-store';
import { createSearchDocumentBuilder } from './search-document-builder';
import { createRelationalIndexStore } from './sqlite-relational-index-store';
import { createStorageCoordinator } from './storage-coordinator';
import { createTestStorageContext } from './test-utils';
import { createVectorIndex } from './vector-index';
import type {
  DocumentStore,
  SearchDocument,
  SearchDocumentBuilder,
  StorageCoordinator,
  VectorIndex,
} from './types';

type CleanupContext = {
  cleanup(): void;
};

function flushAsyncWork(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function renderDocument(input: {
  frontmatter: Record<string, unknown>;
  body: string;
}): string {
  return `---\n${JSON.stringify(input.frontmatter, null, 2)}\n---\n\n${input.body.trimEnd()}\n`;
}

function createCoordinatorHarness(overrides: Partial<{
  documentStore: DocumentStore;
  searchDocumentBuilder: SearchDocumentBuilder;
  vectorIndex: VectorIndex;
}> = {}) {
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

describe('storage coordinator', () => {
  const cleanups: CleanupContext[] = [];

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()?.cleanup();
    }
  });

  it('records document dirty state when SQLite commit succeeds but canonical markdown sync fails, then clears it on rebuild', () => {
    const databaseContext = createTestDatabaseContext();
    cleanups.push(databaseContext);

    const worldRoot = path.join(databaseContext.directory, 'world');
    const baseDocumentStore = createDocumentStore(worldRoot);
    let remainingFailures = 1;
    const flakyDocumentStore: DocumentStore = {
      ...baseDocumentStore,
      writeCanonicalDocument(state, options) {
        if (remainingFailures > 0) {
          remainingFailures -= 1;
          throw new Error('synthetic markdown failure');
        }

        return baseDocumentStore.writeCanonicalDocument(state, options);
      },
    };
    const storageCoordinator = createStorageCoordinator({
      documentStore: flakyDocumentStore,
      relationalIndexStore: createRelationalIndexStore(databaseContext.db),
      searchDocumentBuilder: createSearchDocumentBuilder(),
      vectorIndex: createVectorIndex(path.join(worldRoot, '.worldforge', 'vector', 'index.json')),
    });
    const locationService = createLocationService(databaseContext.db, storageCoordinator);

    storageCoordinator.initialize();

    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A tidal city.',
      effectiveTick: 10,
    });

    expect(locationService.getLocation({ id: harbor.id })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: harbor.id,
        name: 'Harbor Reach',
      }),
    });
    expect(storageCoordinator.getStorageHealth()).toMatchObject({
      documentDirtyCount: 1,
    });

    const rebuildResult = storageCoordinator.rebuildIndexes();

    expect(rebuildResult.errorCount).toBe(0);
    expect(storageCoordinator.getStorageHealth()).toMatchObject({
      documentDirtyCount: 0,
    });
    expect(
      storageCoordinator.searchWorld({
        query: 'tidal',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'location',
          entityId: harbor.id,
        }),
      ]),
    );
  });

  it('records vector dirty state on async indexing failure and clears it on a later rebuild', async () => {
    const databaseContext = createTestDatabaseContext();
    cleanups.push(databaseContext);

    const worldRoot = path.join(databaseContext.directory, 'world');
    const baseVectorIndex = createVectorIndex(
      path.join(worldRoot, '.worldforge', 'vector', 'index.json'),
    );
    let remainingFailures = 1;
    const flakyVectorIndex: VectorIndex = {
      ...baseVectorIndex,
      upsertDocument(document: SearchDocument) {
        if (remainingFailures > 0) {
          remainingFailures -= 1;
          throw new Error('synthetic vector failure');
        }

        baseVectorIndex.upsertDocument(document);
      },
    };
    const storageCoordinator = createStorageCoordinator({
      documentStore: createDocumentStore(worldRoot),
      relationalIndexStore: createRelationalIndexStore(databaseContext.db),
      searchDocumentBuilder: createSearchDocumentBuilder(),
      vectorIndex: flakyVectorIndex,
    });
    const locationService = createLocationService(databaseContext.db, storageCoordinator);

    storageCoordinator.initialize();

    locationService.createLocation({
      name: 'Windward Steps',
      summary: 'Basalt stairs above the spray line.',
      effectiveTick: 10,
    });

    await flushAsyncWork();

    expect(storageCoordinator.getStorageHealth()).toMatchObject({
      vectorDirtyCount: 1,
    });

    storageCoordinator.rebuildIndexes();
    await flushAsyncWork();

    expect(storageCoordinator.getStorageHealth()).toMatchObject({
      vectorDirtyCount: 0,
    });
    expect(
      storageCoordinator.semanticSearch({
        query: 'basalt stairs',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'location',
          title: 'Windward Steps',
        }),
      ]),
    );
  });

  it('imports external markdown edits, normalizes moved files, and keeps the SQLite current view in sync', () => {
    const context = createTestStorageContext();
    cleanups.push(context);

    const locationService = createLocationService(context.db, context.storageCoordinator);
    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A tidal city.',
      effectiveTick: 10,
    });
    const canonicalDocument = context.documentStore
      .readCanonicalDocuments()
      .find((document) => document.frontmatter.id === harbor.id);

    expect(canonicalDocument).toBeDefined();

    const relocatedDirectory = path.join(context.worldRoot, 'imports', 'relocated');
    const relocatedPath = path.join(relocatedDirectory, 'relocated-harbor.md');
    mkdirSync(relocatedDirectory, { recursive: true });
    renameSync(canonicalDocument!.path, relocatedPath);
    writeFileSync(
      relocatedPath,
      renderDocument({
        frontmatter: {
          ...canonicalDocument!.frontmatter,
          slug: 'totally-ignored-slug',
          name: 'Sunspire Harbor',
          summary: 'A rebuilt harbor beneath the observatory cliffs.',
        },
        body: 'The harbor is watched by a glass beacon above the cliffs.',
      }),
      'utf8',
    );

    const importResult = context.storageCoordinator.importMarkdownChanges();

    expect(importResult).toMatchObject({
      processedCount: 1,
      errorCount: 0,
    });
    expect(locationService.getLocation({ id: harbor.id })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        name: 'Sunspire Harbor',
        summary: 'A rebuilt harbor beneath the observatory cliffs.',
      }),
    });

    const normalizedPath = path.join(
      context.worldRoot,
      'locations',
      `sunspire-harbor--${harbor.id}.md`,
    );

    expect(existsSync(normalizedPath)).toBe(true);
    expect(existsSync(relocatedPath)).toBe(false);
    expect(
      context.storageCoordinator.searchWorld({
        query: 'beacon cliffs',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'location',
          entityId: harbor.id,
        }),
      ]),
    );
  });

  it('writes time-slider snapshots for active and ended states', () => {
    const context = createTestStorageContext();
    cleanups.push(context);

    const locationService = createLocationService(context.db, context.storageCoordinator);
    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A tidal city.',
      effectiveTick: 10,
    });

    locationService.deleteLocation({
      id: harbor.id,
      effectiveTick: 20,
    });

    const createdSnapshotPath = path.join(
      context.worldRoot,
      '.worldforge',
      'snapshots',
      'location',
      String(harbor.id),
      '10.md',
    );
    const endedSnapshotPath = path.join(
      context.worldRoot,
      '.worldforge',
      'snapshots',
      'location',
      String(harbor.id),
      '20.md',
    );

    expect(readFileSync(createdSnapshotPath, 'utf8')).toContain('"status": "active"');
    expect(readFileSync(endedSnapshotPath, 'utf8')).toContain('"status": "ended"');
  });

  it('prunes stale search and vector records during startup reconciliation', () => {
    const context = createCoordinatorHarness();
    cleanups.push(context);

    const locationService = createLocationService(context.db, context.storageCoordinator);
    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A tidal city.',
      effectiveTick: 10,
    });

    context.relationalIndexStore.upsertSearchDocument({
      entityType: 'location',
      entityId: 999_999,
      title: 'Phantom Harbor',
      summary: 'Stale search row.',
      body: 'Stale search row.',
      relationshipsText: '',
      canonicalPath: '/tmp/phantom.md',
      contentHash: 'stale',
      updatedAt: Date.now(),
    });
    context.vectorIndex.upsertDocument({
      entityType: 'location',
      entityId: 999_999,
      title: 'Phantom Harbor',
      summary: 'Stale vector row.',
      body: 'Stale vector row.',
      relationshipsText: '',
      canonicalPath: '/tmp/phantom.md',
      contentHash: 'stale',
      updatedAt: Date.now(),
    });

    expect(context.relationalIndexStore.listSearchDocumentReferences()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'location',
          entityId: 999_999,
        }),
      ]),
    );

    context.storageCoordinator.initialize();

    expect(context.relationalIndexStore.listSearchDocumentReferences()).not.toContainEqual(
      expect.objectContaining({
        entityId: 999_999,
      }),
    );
    expect(
      context.storageCoordinator.searchWorld({
        query: 'phantom',
      }),
    ).toEqual([]);
    expect(
      context.storageCoordinator.semanticSearch({
        query: 'phantom',
      }),
    ).toEqual([]);
    expect(locationService.getLocation({ id: harbor.id })).toMatchObject({
      status: 'active',
      record: expect.objectContaining({
        id: harbor.id,
      }),
    });
  });
});
