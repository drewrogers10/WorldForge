# WorldForge Starter

Minimal desktop app foundation for WorldForge using Electron, Vite, React, TypeScript, typed IPC, Zod, Drizzle ORM, and SQLite with `better-sqlite3`.

## Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app in development:

   ```bash
   npm run dev
   ```

3. Typecheck the full project:

   ```bash
   npm run typecheck
   ```

4. Build the renderer and Electron bundles:

   ```bash
   npm run build
   ```

5. Generate a new migration after schema changes:

   ```bash
   npm run db:generate -- --name=add-whatever-you-changed
   ```

## Architecture

The app is intentionally split into narrow layers:

- `src/renderer`
  React UI only. No Node APIs. No direct database access.
- `src/preload`
  The only bridge between renderer and Electron. Exposes a very small explicit API on `window.worldForge`.
- `src/main`
  Electron app startup, window creation, database bootstrapping, and IPC handler registration.
- `src/backend/services`
  Business logic. Services orchestrate app behavior and call into the database layer.
- `src/db`
  Drizzle schema, migration runner, SQLite client setup, and query functions.
- `src/shared`
  Shared TypeScript and Zod contracts used by main, preload, and renderer.

Data flow for every database operation is:

`renderer -> preload -> ipcMain handler -> backend service -> db query`

That keeps the renderer isolated from both Node and SQLite while still giving you typed end-to-end calls.

## Database

- Runtime database file:
  Electron stores the SQLite file in `app.getPath('userData')/worldforge.sqlite`.
- Migrations:
  SQL migrations live in the repo under `drizzle/`.
- Startup:
  The main process applies migrations before the window is shown.
- Tooling config:
  `drizzle.config.ts` defaults to `./drizzle/local.sqlite` for CLI-only tooling. The app itself still uses Electron `userData`, so renderer code never touches SQLite directly.

## Native Module Note

`better-sqlite3` is a native module, so the project rebuilds it for Electron automatically during `npm install` via `@electron/rebuild`. That keeps development startup reliable after fresh installs and Electron version changes.

## Current Sample Feature

The starter app proves the architecture with one end-to-end entity:

- `Character`
  - `id`
  - `name`
  - `summary`
  - `createdAt`
  - `updatedAt`

Implemented operations:

- `listCharacters`
- `getCharacter`
- `createCharacter`
- `updateCharacter`

The UI lets you:

- list characters
- select a character
- create a character
- edit a character

## Where Future Features Should Go

- New UI screens and components:
  `src/renderer`
- New bridge methods:
  `src/preload`
- New Electron window or app lifecycle work:
  `src/main`
- New business rules and use cases:
  `src/backend/services`
- New tables, migrations, and reusable queries:
  `src/db`
- Shared contracts and validation:
  `src/shared`

Keep new capabilities following the same direction of dependency:

`renderer -> preload -> main -> services -> db`

Avoid importing Electron, Node APIs, or database code into the renderer.
