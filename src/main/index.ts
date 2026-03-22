import { existsSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { createDocumentStore } from '@backend/storage/document-store';
import { createSearchDocumentBuilder } from '@backend/storage/search-document-builder';
import { createRelationalIndexStore } from '@backend/storage/sqlite-relational-index-store';
import { createStorageCoordinator } from '@backend/storage/storage-coordinator';
import { createVectorIndex } from '@backend/storage/vector-index';
import { createCharacterService } from '@backend/services/character-service';
import { createEntityLinkService } from '@backend/services/entity-link-service';
import { createEventService } from '@backend/services/event-service';
import { createItemService } from '@backend/services/item-service';
import { createLocationService } from '@backend/services/location-service';
import { createMapService } from '@backend/services/map-service';
import { createTimelineService } from '@backend/services/timeline-service';
import { createDatabase } from '@db/client';
import { runMigrations } from '@db/migrate';
import { registerIpcHandlers } from './ipc';

function resolveMigrationsPath(): string {
  const candidates = [
    path.join(app.getAppPath(), 'drizzle'),
    path.join(process.cwd(), 'drizzle'),
    path.join(__dirname, '../../drizzle'),
  ];

  const migrationsPath = candidates.find((candidate) => existsSync(candidate));

  if (!migrationsPath) {
    throw new Error('Unable to locate the Drizzle migrations folder.');
  }

  return migrationsPath;
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: '#10131a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  return window;
}

function initializeBackend(): void {
  const userDataPath = app.getPath('userData');
  const databasePath = path.join(userDataPath, 'worldforge.sqlite');
  const worldRoot = path.join(userDataPath, 'world');
  const { db } = createDatabase(databasePath);

  runMigrations(db, resolveMigrationsPath());

  const documentStore = createDocumentStore(worldRoot);
  const relationalIndexStore = createRelationalIndexStore(db);
  const searchDocumentBuilder = createSearchDocumentBuilder();
  const vectorIndex = createVectorIndex(
    path.join(worldRoot, '.worldforge', 'vector', 'index.json'),
  );
  const storageCoordinator = createStorageCoordinator({
    documentStore,
    relationalIndexStore,
    searchDocumentBuilder,
    vectorIndex,
  });

  storageCoordinator.initialize();

  const characterService = createCharacterService(db, storageCoordinator);
  const entityLinkService = createEntityLinkService(db);
  const eventService = createEventService(db);
  const itemService = createItemService(db, storageCoordinator);
  const locationService = createLocationService(db, storageCoordinator);
  const mapService = createMapService(db);
  const timelineService = createTimelineService(db);

  registerIpcHandlers({
    characterService,
    entityLinkService,
    eventService,
    itemService,
    locationService,
    mapService,
    timelineService,
    storageCoordinator,
  });
}

app.whenReady()
  .then(() => {
    initializeBackend();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start WorldForge.', error);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
