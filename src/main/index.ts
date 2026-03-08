import { existsSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { createCharacterService } from '@backend/services/character-service';
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
  const databasePath = path.join(app.getPath('userData'), 'worldforge.sqlite');
  const { db } = createDatabase(databasePath);

  runMigrations(db, resolveMigrationsPath());

  const characterService = createCharacterService(db);
  registerIpcHandlers(characterService);
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
