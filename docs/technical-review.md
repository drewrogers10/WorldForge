# WorldForge Technical Review

An assessment of the architecture, code patterns, and engineering decisions — what's well-built, what's brittle, and what to address before the codebase grows.

---

## What's Well-Built

### Type-Safe IPC Layer
The `registerHandler` pattern with Zod contract validation on both input and output is excellent. Every IPC boundary is runtime-validated, and the generic typing (`IpcInput<K>`, `IpcOutput<K>`) means adding a new endpoint is type-checked end-to-end. This is one of the strongest parts of the architecture.

### Strict TypeScript Configuration
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns` — the tsconfig is tight. This catches real bugs and the codebase is written to comply naturally rather than fighting the config with casts.

### Clean Layered Architecture
The `renderer → preload → main → services → queries → db` stack is well-enforced. The renderer genuinely has no access to Node APIs. The shared directory contains only types and Zod schemas — no business logic leaks across boundaries.

### Database Schema Design
The temporal model (existence ticks, version history tables, assignment spans) is thoughtfully designed. Check constraints enforce data integrity at the database level (existence ranges, single-assignment for items). Indexes are placed on the right columns for the query patterns used.

### Service-Level Tests
Testing at the service layer rather than mocking everything is the right call for a data-heavy app. Tests exercise real SQLite through Drizzle, which catches actual query issues.

---

## What Needs Attention

### 1. Page Components Are Doing Too Much

`CharacterPage.tsx` (155 lines) manages: selection state, detail fetching, form state for both create and edit, search, filtering, five boolean loading flags, three async handlers, and effect coordination. `LocationPage` and `ItemPage` follow the same pattern.

This creates several problems:
- Every state change re-renders the entire page tree
- Adding a feature (e.g., bulk select, drag-and-drop) means touching a file that's already dense
- The `useEffect` chains with `setTimeout(..., 50)` for debouncing are fragile — they're not real debouncing, they're just "delay slightly and hope"

**Recommendation**: Extract the data-fetching and mutation logic into a custom hook per entity (e.g., `useCharacterWorkspace`). The page component should be thin glue between the hook and the presentational workspace component. The debounce pattern should use a proper `useDebouncedValue` hook rather than raw `setTimeout`.

### 2. Duplicated Data Loading Pattern

Every page has this identical effect:

```tsx
useEffect(() => {
  const timeout = setTimeout(() => {
    void loadWorldData(tick);
  }, 50);
  return () => clearTimeout(timeout);
}, [tick, loadWorldData]);
```

This is copy-pasted across `CharacterPage`, `LocationPage`, `ItemPage`, and `OverviewPage`. It should be a single hook (e.g., `useWorldDataSync(tick)`) or handled at the `AppShell` level since `loadWorldData` fetches all entities regardless of which page is active.

### 3. World Store Fetches Everything Every Time

`loadWorldData` calls `listCharacters`, `listLocations`, and `listItems` in parallel on every tick change — even if the user is on the Characters page and only needs characters. With small datasets this is fine, but the pattern won't scale. Consider:
- Per-entity loading (only fetch what the active workspace needs)
- Or at minimum, a staleness check so unchanged entities aren't re-fetched

The delta calculation (`overviewDelta`) compares current counts against previous counts, but it resets every time the store loads. Navigating away and back resets the delta to zero. If the delta is meant to be meaningful, it needs a stable reference point (e.g., the last committed tick's counts, persisted).

### 4. `changedCharacterIds` Is Always Empty

`OverviewPage` and `CharacterPage` both pass `changedCharacterIds={new Set()}` (same for locations and items). The `WorldOverview` component renders "Changed" pills based on these sets, but they're never populated. Either implement the change-tracking or remove the prop to avoid dead code paths.

### 5. Error Handling Is Global-Only

All errors funnel to `uiStore.errorMessage`, which renders as a single red banner at the top of the app. This means:
- A failed character creation shows the same error regardless of which form submitted it
- Multiple rapid errors overwrite each other
- There's no per-field validation feedback (e.g., "Name is required" next to the name input)

For form validation, Zod schemas already exist — surface them at the form level before hitting IPC. For operation errors, consider returning errors to the calling component rather than pushing to a global store.

### 6. No Optimistic Updates

Every mutation follows: disable button → call IPC → refresh timeline → reload all world data → re-enable button. This means the UI goes through a loading state on every save. For small, predictable mutations (rename a character, update a summary), an optimistic update to the Zustand store with rollback on failure would make the app feel instant.

### 7. The `window.dispatchEvent` Refresh Mechanism

`AppShell.handleRefresh` dispatches a custom DOM event (`app:refreshList`) that pages listen to. This is a side-channel outside of React's data flow. If a component isn't mounted when the event fires, it misses the refresh. Consider making refresh a Zustand action that pages can subscribe to reactively, or triggering it through the store's state (e.g., a `refreshCounter` that effects depend on).

### 8. Temporal Store Has Initialization Race

`App.tsx` calls `refreshTimeline()` on mount, which sets `hasInitializedTimeline`. But pages start loading `worldData` immediately using the default `committedTick` (0), which may not be the correct starting tick. If the timeline refresh returns a `presentTick` that's different from 0, the page will re-fetch. This is a minor inefficiency in practice, but the initialization ordering should be explicit — don't render workspace pages until the timeline is initialized.

### 9. No Request Deduplication or Cancellation

If a user scrubs the timeline slider quickly, each tick change triggers a new `loadWorldData` call. The 50ms setTimeout helps slightly, but multiple in-flight requests can still race and resolve out of order. The last response wins in Zustand's `set()`, but it might not be the response for the latest tick. Consider:
- An `AbortController` pattern for IPC calls
- Or a sequence number that discards stale responses

### 10. CSS Architecture Is Split Across Two Systems

Some components use CSS Modules (`AppShell.module.css`, `Sidebar.module.css`), while most styling lives in the 1019-line global `styles.css`. Class names like `.panel`, `.pill`, `.muted`, `.form`, `.button-row` are global, while `.app-shell`, `.function-bar-link` are also global but scoped by convention. This creates ambiguity about where to put new styles and risks accidental name collisions as the app grows.

**Recommendation**: Pick one approach. If CSS Modules, migrate the shared primitives to a `shared.module.css` or a set of component-level modules. If global CSS, at least namespace with a prefix or use CSS layers to prevent specificity conflicts.

### 11. Missing Cleanup for Version History

Services create version records on every update, but there's no mechanism to clean up old versions. Over time with frequent edits, the version tables will grow without bound. Consider a pruning strategy (keep N most recent versions, or compact versions older than M ticks).

### 12. Test Coverage Gaps

Tests cover services and migrations but not:
- IPC handler registration (does the contract wiring actually work end-to-end?)
- Store logic (does `loadWorldData` correctly compute deltas?)
- Edge cases in temporal queries (what happens at boundary ticks, with overlapping version spans?)

The test infrastructure is solid — extending coverage is low-friction.

---

## Architecture Recommendations for Growth

| Area | Current | Recommended |
|------|---------|-------------|
| Page state management | useState + useEffect chains | Custom hooks per entity workspace |
| Data loading | Global fetch on every tick change | Per-entity fetching with staleness checks |
| Debouncing | Raw setTimeout | `useDebouncedValue` hook |
| Error handling | Global banner only | Per-form + global for unhandled |
| Mutation feedback | Full reload after every save | Optimistic updates with rollback |
| CSS | Mixed global + modules | Fully modular or fully global with namespacing |
| Inter-component communication | DOM events | Zustand subscriptions or React context |
| Request management | Fire-and-forget | AbortController or sequence-based deduplication |
