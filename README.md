# WorldForge

Desktop app foundation for WorldForge using Electron, Vite, React, TypeScript, typed IPC, Zod, Drizzle ORM, and SQLite with `better-sqlite3`.

## Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app in development:

   ```bash
   npm run dev
   ```

   That runs Vite in the foreground and opens Electron in the same terminal session.

3. Start the app with managed background start/stop commands:

   ```bash
   npm run app:start
   npm run app:status
   npm run app:stop
   ```

   The managed wrapper stores its PID and log under `.tmp-vite/`, so you can start and stop the full Vite + Electron session cleanly without leaving orphaned processes behind. Use `npm run app:restart` to recycle the session.

4. Typecheck the full project:

   ```bash
   npm run typecheck
   ```

5. Run the focused test suite:

   ```bash
   npm test
   ```

6. Build the renderer and Electron bundles:

   ```bash
   npm run build
   ```

7. Generate a new migration after schema changes:

   ```bash
   npm run db:generate -- --name=add-whatever-you-changed
   ```

## Architecture

The app is intentionally split into narrow layers:

- `src/renderer`
  React UI only. No Node APIs. No direct database access.
- `src/renderer/components`
  Reusable shell and panel primitives for the renderer.
- `src/renderer/features`
  Entity-specific workspaces and editors. People, places, and items have active UI flows on top of the current entity model; the other core world areas currently expose guided placeholder workspaces.
- `src/renderer/lib`
  Small renderer-only helpers such as form state utilities.
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

The renderer modularization keeps `src/renderer/App.tsx` focused on data loading, selection state, and top-level view switching while feature components own the workspace markup.

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

The test suite runs under plain Node, not Electron. `npm test` therefore rebuilds `better-sqlite3` for Node before running Vitest, then restores the Electron build afterward so app development still works immediately after the test run.

## Core World Areas

The renderer now exposes the six core world areas:

- `People`
  Home for characters and other significant individuals.
- `Places`
  Home for locations, landmarks, regions, and other geographic anchors.
- `Powers`
  Home for major power structures such as nations, blocs, and institutions with world-shaping reach.
- `Events`
  Home for major happenings that connect world state to chronology and change.
- `Items`
  Home for important objects, artifacts, equipment, goods, and possessions.
- `Organizations`
  Home for bounded institutions such as guilds, orders, religions, companies, and local factions.

## Implemented Data Model

The app currently proves the architecture across three entities:

- `Character`
  - `id`
  - `name`
  - `summary`
  - `locationId` nullable foreign key to `Location`
  - `createdAt`
  - `updatedAt`
- `Location`
  - `id`
  - `name`
  - `summary`
  - `createdAt`
  - `updatedAt`
- `Item`
  - `id`
  - `name`
  - `summary`
  - `quantity`
  - `ownerCharacterId` nullable foreign key to `Character`
  - `locationId` nullable foreign key to `Location`
  - `createdAt`
  - `updatedAt`

`Character` currently powers the `People` workspace, `Location` powers the `Places` workspace, and `Item` powers the `Items` workspace.

Implemented operations:

- `listCharacters`
- `getCharacter`
- `createCharacter`
- `updateCharacter`
- `deleteCharacter`
- `listLocations`
- `getLocation`
- `createLocation`
- `updateLocation`
- `deleteLocation`
- `listItems`
- `getItem`
- `createItem`
- `updateItem`
- `deleteItem`

The UI lets you:

- switch between `People`, `Places`, `Powers`, `Events`, `Items`, and `Organizations`
- list people
- search people by name, summary, or linked place
- filter people by assigned place or unassigned state
- select a person
- create a person
- edit a person
- delete a person
- assign or clear a person's linked place
- list places
- create places
- edit places
- delete places
- view the selected person's linked place cleanly in the detail panel
- list items
- search and filter items by assignment state
- create items
- edit items
- delete items
- assign items to a person, a place, or an unassigned state
- review the intended scope of powers, events, and organizations directly in the app shell

## Temporal RFC

Temporal support is planned, not implemented. The current RFC lives at [`docs/temporal-data-rfc.md`](docs/temporal-data-rfc.md) and is documentation only for now.

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

For each new entity, follow the same boring pattern:

1. Add the Drizzle table and migration in `src/db` and `drizzle/`.
2. Add shared Zod contracts in `src/shared`.
3. Add focused query helpers in `src/db/queries`.
4. Add one service in `src/backend/services`.
5. Expose only the required IPC handlers in `src/main/ipc.ts`.
6. Add only the minimum preload methods needed by the renderer.
7. Add a small set of service/contract tests before growing the UI further.
