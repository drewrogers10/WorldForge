# Temporal Data Model RFC

Status: Draft  
Project: WorldForge  
Date: 2026-03-07

## Summary

WorldForge should adopt a **valid-time temporal model** built on:

- one canonical project-wide `world_tick` integer for ordering and slider position
- stable entity identity tables (`characters`, `locations`, `items`, `events`)
- append-mostly state/version tables with effective intervals `[valid_from, valid_to)`
- separate temporal relationship/span tables for things like character location
- existing current-state tables retained in v1 for simple CRUD and cheap "present" reads
- `events` treated as first-class chronology records, but **not** as the source of truth for all state changes

This is the smallest robust foundation that can support a universal time slider, time-sliced entity views, map evolution, movement history, and future relationship history in SQLite without forcing an event-sourced architecture.

## Implementation Note

This RFC is documentation only in the current merge. It does not add
time-slider UI, temporal IPC, or temporal runtime tables yet.

## Current State

Today the app has:

- `characters`
  - `id`, `name`, `summary`, `location_id`, `created_at`, `updated_at`
- `locations`
  - `id`, `name`, `summary`, `created_at`, `updated_at`
- `items`
  - `id`, `name`, `summary`, `quantity`, `owner_character_id`, `location_id`,
    `created_at`, `updated_at`

Important properties of the current codebase:

- SQLite is local and embedded via `better-sqlite3`
- schema is defined with Drizzle
- reads and writes already pass cleanly through `renderer -> preload -> main -> services -> db`
- data is modeled as current state only; there is no temporal layer yet

That matters because the temporal design should extend this shape, not replace it with backend-style infrastructure the app does not need.

## Goals

- support one universal time slider across views
- answer "what was true at time T?" efficiently
- model entity state changes over time
- model map state changes over time
- model character location and movement history
- model authored event chronology
- leave a clean path for future relationship history
- fit SQLite and Drizzle cleanly
- stay understandable for a small local desktop app

## Non-Goals

- full event sourcing
- distributed consistency or multi-writer conflict resolution
- bitemporal modeling in v1
- fuzzy/probabilistic chronology in v1
- alternate timeline branching in v1
- GIS-heavy map storage in v1

## Core Temporal Concepts

### `world_tick`

`world_tick` is the canonical integer used to order world time.

- type: SQLite `INTEGER`
- meaning: a project-defined scalar timeline position
- purpose: slider position, ordering, interval comparison, event chronology

The app should not use display strings as the primary time key. A custom calendar can be added later as a formatter/parser that maps to `world_tick`.

### System Time vs World Time

WorldForge needs two different clocks:

- `world_tick`: when something is true in the fictional world
- `created_at` / `updated_at`: when the row was written in the real app

V1 should model **valid time**, not full transaction time. Real timestamps stay for audit/debugging, but slider behavior should be driven by `world_tick`.

### Instant

A single `world_tick`.

### Interval

A half-open range: `[valid_from, valid_to)`

Rules:

- `valid_from` is inclusive
- `valid_to` is exclusive
- `valid_to = NULL` means "still active / open-ended"

Half-open intervals avoid double-counting at boundaries and make adjacent states easy to store.

### State Version

A row representing an entity snapshot that is valid for an interval.

Examples:

- character name/summary/status between ticks 100 and 180
- location description between ticks 0 and 500
- item description between ticks 40 and open-ended

### Relationship Span

A time-bounded relationship between two entities.

Examples:

- character is at location X during `[120, 160)`
- item is carried by character Y during `[200, 240)`
- character A and character B have relationship "allies" during `[300, NULL)`

### Current Slice

The state visible at the selected slider time.  
If no `asOfTick` is provided, the app should default to the current/latest slice.

### Event

An authored chronology record with a start tick and optional end tick.  
Events describe things that happened in the world and can be linked to entities, but they do **not** need to be the storage mechanism for every state mutation.

### Inferred History

Backfilled temporal rows created during migration when exact historical start times are not known.

Example:

- a `character_location_span` created from the current `characters.location_id` value may have an inferred start tick

## Decision Drivers For This App

The design should optimize for these realities:

1. SQLite queries need to stay simple and index-friendly.
2. The app is still small; current CRUD flows should not be thrown away unnecessarily.
3. The most common query later will be "give me the world as of tick T".
4. `Character`, `Location`, and `Item` should feel consistent.
5. `Event` should be first-class, but not force event-sourcing complexity.
6. The model should support adding map temporal state and relationship history later without redesigning everything again.

## Candidate Approaches

### 1. Pure Effective-Dated Rows

Every time-varying entity uses version rows as the canonical source of truth. Base tables hold only stable identity.

### Sketch

```sql
CREATE TABLE characters (
  id INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE character_versions (
  id INTEGER PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_event_id INTEGER REFERENCES events(id),
  created_at INTEGER NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX character_versions_lookup_idx
  ON character_versions (character_id, valid_from DESC);

CREATE UNIQUE INDEX character_versions_one_open_idx
  ON character_versions (character_id)
  WHERE valid_to IS NULL;
```

### Query Pattern

```sql
SELECT *
FROM character_versions
WHERE character_id = :characterId
  AND valid_from <= :tick
  AND (valid_to IS NULL OR :tick < valid_to)
ORDER BY valid_from DESC
LIMIT 1;
```

### Pros

- single source of truth for current and historical state
- clean temporal semantics
- slider queries naturally read the same tables as current-state queries
- no duplicate "current snapshot" data to keep synchronized

### Cons In WorldForge

- forces an immediate rewrite of current CRUD flows
- every current list/detail query becomes a temporal query
- more friction while `Item` is still being introduced and other entity types are still forming
- current `characters.location_id` has to be redesigned immediately
- more complex migration from the current schema

### Assessment

This is conceptually clean, but too invasive for the app's current maturity.

### 2. Hybrid Current Snapshot + Historical Version Tables

Keep simple current-state tables for the live app, and add temporal version/span tables for time-aware features. Current tables stay cheap to query; history tables power slider and chronology.

This is effectively a pragmatic hybrid of current snapshots plus effective-dated history.

### Sketch

```sql
CREATE TABLE characters (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE character_versions (
  id INTEGER PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_event_id INTEGER REFERENCES events(id),
  is_inferred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE TABLE character_location_spans (
  id INTEGER PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  source_event_id INTEGER REFERENCES events(id),
  is_inferred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);
```

### Write Pattern

On a temporal change:

1. update the current table
2. close any open history/span row
3. insert a new open-ended history/span row
4. do all of it in one SQLite transaction

### Pros

- easiest migration from today's schema
- existing current-state UI can keep working during rollout
- current reads remain cheap and simple
- temporal features can be added entity by entity
- fits SQLite and service-layer transactions well
- lets `Item` start on the new pattern without forcing all existing screens to convert at once

### Cons

- dual writes mean current tables and history tables must stay in sync
- some columns become cached/derived over time, especially `characters.location_id`
- temporal bugs can create overlaps if writes are not disciplined
- full temporal correctness depends on service tests and transactional updates

### Assessment

This is the best fit for the current app. It minimizes migration risk while still building the right temporal foundation.

### 3. Event Log + Projections

Persist changes as domain events and derive current and historical views from projections.

### Sketch

```sql
CREATE TABLE domain_events (
  id INTEGER PRIMARY KEY,
  event_type TEXT NOT NULL,
  world_tick INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE character_projection (...);
CREATE TABLE timeline_projection (...);
CREATE TABLE map_projection (...);
```

### Pros

- full chronological audit trail
- easy to answer "what happened?" at a narrative level
- flexible if the app later needs replay/rebuild behavior

### Cons In WorldForge

- highest implementation complexity
- every feature needs projection logic
- projection drift and rebuild tooling become new responsibilities
- editing past state becomes more complex than "close old interval, insert new row"
- overkill for a local single-user desktop app

### Assessment

Not justified for v1. Use authored `events`, but do not make the database event-sourced.

## Recommendation

Choose **Approach 2: Hybrid Current Snapshot + Historical Version Tables**, with these concrete rules:

1. Use one canonical integer `world_tick` across the project.
2. Keep current entity tables for fast present-day CRUD during rollout.
3. Add per-entity state version tables for time-varying fields.
4. Add separate span tables for time-varying relationships.
5. Keep `events` as authored chronology records, not as the persistence engine for all state.
6. Use SQLite transactions for every temporal write.
7. Enforce interval discipline in the service layer first; add DB-level backstops only if needed later.

This gives WorldForge:

- efficient local querying
- a clean universal slider contract
- low migration risk
- a direct path to map state, movement history, and relationship history

## Recommended V1 Design

### Temporal Scope

V1 should model **valid time only**.

That means:

- the slider asks "what was true in-world at tick T?"
- real timestamps are still stored, but only for app bookkeeping
- no transaction-time querying like "what did the database believe last Tuesday?"

### Timeline Model

Use a single project-wide timeline in v1.

- one slider
- one `world_tick` axis
- no alternate branches
- no multi-calendar storage model yet

If custom calendars are added later, they should map to and from `world_tick`. The canonical stored value should remain numeric.

The project should also define one "present" tick for default current-time behavior. That can live in project settings later; it does not need its own temporal subsystem in v1.

### Data Modeling Rule

Split temporal data into three categories:

1. **Identity**
   Stable rows such as `characters.id` or `locations.id`
2. **State**
   Versioned snapshots such as name, summary, status, description
3. **Relationships**
   Time-bounded links such as character-at-location or item-owned-by-character

This is preferable to a single generic `entity_history(payload_json)` table because the app will need typed queries, typed validation, and type-specific UI.

### V1 Table Shape

#### Keep Current Tables

Keep:

- `characters`
- `locations`

Add in phase 1:

- `items`
- `events`

In v1 these remain the fastest "current state" path. Their rows should still carry `created_at` and `updated_at`.

#### Add Version Tables

Use one version table per entity type that needs time-sliced state.

Example:

```sql
CREATE TABLE character_versions (
  id INTEGER PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_event_id INTEGER REFERENCES events(id),
  is_inferred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX character_versions_lookup_idx
  ON character_versions (character_id, valid_from DESC);

CREATE UNIQUE INDEX character_versions_one_open_idx
  ON character_versions (character_id)
  WHERE valid_to IS NULL;
```

Equivalent tables should exist for:

- `location_versions`
- `item_versions`

#### Add Relationship Span Tables

For facts that change independently of entity content, use separate span tables.

Example:

```sql
CREATE TABLE character_location_spans (
  id INTEGER PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  source_event_id INTEGER REFERENCES events(id),
  is_inferred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX character_location_character_idx
  ON character_location_spans (character_id, valid_from DESC);

CREATE INDEX character_location_location_idx
  ON character_location_spans (location_id, valid_from DESC);

CREATE UNIQUE INDEX character_location_one_open_idx
  ON character_location_spans (character_id)
  WHERE valid_to IS NULL;
```

Later the same pattern supports:

- `item_location_spans`
- `item_possession_spans`
- `relationship_spans`

#### Add Events As First-Class Rows

Events are different from state versions. They represent chronology, not storage mechanics.

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  start_tick INTEGER NOT NULL,
  end_tick INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (end_tick IS NULL OR end_tick >= start_tick)
);

CREATE INDEX events_start_idx
  ON events (start_tick, id);
```

Optional later:

```sql
CREATE TABLE event_participants (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  role TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX event_participants_lookup_idx
  ON event_participants (entity_kind, entity_id, event_id);
```

In v1, a polymorphic participant table is acceptable if it keeps the schema simpler. If stricter referential integrity becomes important later, it can be replaced with explicit join tables per entity type.

## Example Tables Likely Needed Later

These are the tables WorldForge will likely grow into if time features keep expanding.

| Table | Purpose | Likely Phase |
| --- | --- | --- |
| `characters` | stable identity + current snapshot | current / phase 1 |
| `locations` | stable identity + current snapshot | current / phase 1 |
| `items` | stable identity + current snapshot | phase 1 |
| `events` | chronology records | phase 1 |
| `character_versions` | time-sliced character state | phase 1 |
| `location_versions` | time-sliced location state | phase 1 |
| `item_versions` | time-sliced item state | phase 1 |
| `character_location_spans` | movement / presence history | phase 1 |
| `event_participants` | link entities to events | phase 2 |
| `item_location_spans` | item placement history | phase 2 |
| `item_possession_spans` | item ownership/carrying history | phase 2 |
| `relationship_spans` | relationship history between entities | phase 3 |
| `maps` | stable map identity | phase 2 |
| `map_features` | stable map object identity | phase 2 |
| `map_feature_versions` | map geometry/style/label over time | phase 2 |

## How Core Entities Evolve Under The Model

### Character

Current:

- `characters` row stores current `name`, `summary`, `location_id`

Temporal evolution:

- `characters` remains the current snapshot / identity table
- `character_versions` stores versioned name/summary/status-type fields
- `character_location_spans` stores movement history
- later `relationship_spans` can reference characters for social history

Important implication:

- once movement history exists, `characters.location_id` should be treated as the **current cache** of the active span, not the authoritative historical record

### Location

Current:

- `locations` row stores current `name` and `summary`

Temporal evolution:

- `locations` remains identity/current snapshot
- `location_versions` stores time-sliced descriptive state
- later map-facing features can point to a location or a map feature
- changes to map representation should not be shoved into `locations` directly; use map feature versioning when the map arrives

### Item

Recommended from the start:

- add `items` as identity/current snapshot
- add `item_versions` immediately when `Item` is introduced

That avoids creating a third current-only table that will need the same migration later.

Later:

- `item_location_spans` for where the item is
- `item_possession_spans` for who carries/owns it

### Event

Events should be first-class authored data, not a projection artifact.

- `events` stores chronology entries with `start_tick` and optional `end_tick`
- `event_participants` can link characters, locations, and items to an event
- temporal state rows may optionally include `source_event_id` to explain why a change happened

Important implication:

- not every state change needs an event in v1
- not every event needs to mutate state

That keeps authored lore and mechanical temporal state related, but not tightly coupled.

## Universal Time Slider Query Model

The slider should push one value through the existing architecture:

- renderer holds selected `asOfTick`
- preload/API methods accept optional `asOfTick`
- services translate that into "current" or "time-slice" reads
- DB queries use interval predicates

### Default Contract

If `asOfTick` is omitted:

- use current snapshot tables for cheap present-day reads where possible

If `asOfTick` is provided:

- read version/span tables using interval predicates

### Core Predicate

```sql
valid_from <= :tick
AND (valid_to IS NULL OR :tick < valid_to)
```

### Single Entity As Of Time

```sql
SELECT *
FROM character_versions
WHERE character_id = :characterId
  AND valid_from <= :tick
  AND (valid_to IS NULL OR :tick < valid_to)
ORDER BY valid_from DESC
LIMIT 1;
```

### Character With Active Location As Of Time

```sql
SELECT
  c.id,
  cv.name,
  cv.summary,
  cls.location_id,
  lv.name AS location_name
FROM characters c
JOIN character_versions cv
  ON cv.character_id = c.id
 AND cv.valid_from <= :tick
 AND (cv.valid_to IS NULL OR :tick < cv.valid_to)
LEFT JOIN character_location_spans cls
  ON cls.character_id = c.id
 AND cls.valid_from <= :tick
 AND (cls.valid_to IS NULL OR :tick < cls.valid_to)
LEFT JOIN location_versions lv
  ON lv.location_id = cls.location_id
 AND lv.valid_from <= :tick
 AND (lv.valid_to IS NULL OR :tick < lv.valid_to)
WHERE c.id = :characterId;
```

### All Characters Visible In A Time Slice

```sql
SELECT
  c.id,
  cv.name,
  cv.summary,
  cls.location_id
FROM characters c
JOIN character_versions cv
  ON cv.character_id = c.id
 AND cv.valid_from <= :tick
 AND (cv.valid_to IS NULL OR :tick < cv.valid_to)
LEFT JOIN character_location_spans cls
  ON cls.character_id = c.id
 AND cls.valid_from <= :tick
 AND (cls.valid_to IS NULL OR :tick < cls.valid_to);
```

For list views, the app should query only the entities needed for the visible screen rather than trying to materialize the entire world on every slider move.

### Events In A Slider Window

```sql
SELECT *
FROM events
WHERE start_tick <= :windowEnd
  AND (end_tick IS NULL OR end_tick >= :windowStart)
ORDER BY start_tick, id;
```

## Efficient Querying In SQLite

SQLite can handle this model well if the tables stay narrow and the indexes are intentional.

Recommended indexing pattern:

- `(entity_id, valid_from DESC)` on every version table
- partial unique index on open rows: `WHERE valid_to IS NULL`
- `(left_entity_id, valid_from DESC)` and `(right_entity_id, valid_from DESC)` on relationship span tables
- `(location_id, valid_from DESC)` on movement/placement tables
- `(start_tick, id)` on events

Recommended write discipline:

- all temporal writes happen in one transaction
- only one open row per entity/aspect
- service layer checks for overlap before insert

If overlap bugs become a real issue later, add triggers. Do not start there.

## How The Map Can Consume Temporal State Later

The map does not need a special temporal system. It can consume the same interval model.

### Recommended Direction

Use stable map objects plus versioned geometry/state:

```sql
CREATE TABLE maps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE map_features (
  id INTEGER PRIMARY KEY,
  map_id INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  feature_kind TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE map_feature_versions (
  id INTEGER PRIMARY KEY,
  feature_id INTEGER NOT NULL REFERENCES map_features(id) ON DELETE CASCADE,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER,
  label TEXT NOT NULL DEFAULT '',
  geometry_json TEXT NOT NULL,
  style_json TEXT,
  source_event_id INTEGER REFERENCES events(id),
  created_at INTEGER NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);
```

### Why This Works

- a town can move, grow, or rename over time
- borders can change
- markers can appear/disappear
- the same `asOfTick` from the global slider can drive the map query

### Character And Item Overlays

Map overlays can come from existing temporal relationships:

- character markers from `character_location_spans`
- item markers from `item_location_spans`
- event markers from `events`

This keeps the map integrated with the same temporal foundation as sheets and timelines.

## Migration Strategy From The Current Schema

The migration should be incremental and low-risk.

### Step 1: Add Temporal Tables Without Breaking Current Reads

Add new version/span tables while leaving:

- `characters`
- `locations`
- existing current queries

unchanged.

### Step 2: Backfill Open-Ended History

Backfill one open row per current entity:

```sql
INSERT INTO character_versions (
  character_id,
  valid_from,
  valid_to,
  name,
  summary,
  is_inferred,
  created_at
)
SELECT
  id,
  :bootstrapTick,
  NULL,
  name,
  summary,
  1,
  updated_at
FROM characters;
```

For current character location:

```sql
INSERT INTO character_location_spans (
  character_id,
  location_id,
  valid_from,
  valid_to,
  is_inferred,
  created_at
)
SELECT
  id,
  location_id,
  :bootstrapTick,
  NULL,
  1,
  updated_at
FROM characters
WHERE location_id IS NOT NULL;
```

Notes:

- historical accuracy before migration is not recoverable
- migrated history should be marked as inferred
- use a chosen project world-time anchor such as `0` or the project's initial "present" tick
- do **not** reuse `created_at` or `updated_at` as fictional time; those are system timestamps

### Step 3: Switch Writes To Dual-Write Transactions

When a character or location changes:

- update the current table
- close the active version row
- insert the new active version row

When a character moves:

- update `characters.location_id`
- close the active `character_location_spans` row
- insert the new active span if the new location is non-null

### Step 4: Add Optional `asOfTick` To Read APIs

Extend list/detail APIs so they can accept:

- no `asOfTick` for current reads
- `asOfTick` for temporal reads

This fits the current IPC/service architecture well and avoids a second query stack.

### Step 5: Introduce `Item` On The New Pattern

Do not add `Item` as current-only and migrate it later.  
Introduce `items` together with `item_versions` from the start.

### Step 6: Later Decide Whether Current Tables Remain Permanent

Once most screens become temporal, there are two viable end states:

1. keep current tables as the cached latest snapshot
2. reduce current tables to identity-only rows and derive current state from version tables

V1 should choose option 1 because it is less disruptive.

## Example Write Patterns

### Update Character State At Tick T

```sql
BEGIN;

UPDATE character_versions
SET valid_to = :tick
WHERE character_id = :characterId
  AND valid_to IS NULL;

INSERT INTO character_versions (
  character_id,
  valid_from,
  valid_to,
  name,
  summary,
  source_event_id,
  is_inferred,
  created_at
) VALUES (
  :characterId,
  :tick,
  NULL,
  :name,
  :summary,
  :sourceEventId,
  0,
  :systemNow
);

UPDATE characters
SET
  name = :name,
  summary = :summary,
  updated_at = :systemNow
WHERE id = :characterId;

COMMIT;
```

### Move Character To A New Location At Tick T

```sql
BEGIN;

UPDATE character_location_spans
SET valid_to = :tick
WHERE character_id = :characterId
  AND valid_to IS NULL;

INSERT INTO character_location_spans (
  character_id,
  location_id,
  valid_from,
  valid_to,
  source_event_id,
  is_inferred,
  created_at
) VALUES (
  :characterId,
  :locationId,
  :tick,
  NULL,
  :sourceEventId,
  0,
  :systemNow
);

UPDATE characters
SET
  location_id = :locationId,
  updated_at = :systemNow
WHERE id = :characterId;

COMMIT;
```

If the new location is "unknown/unassigned", close the open span and do not insert a replacement span.

## Phased Rollout Plan

### Phase 1: Minimal Foundation

Goal: establish the temporal model without disrupting the current app.

- define `world_tick` as the canonical time value
- add `character_versions` and `location_versions`
- add `character_location_spans`
- backfill current data into open-ended inferred rows
- add `events`
- introduce `items` using `items` + `item_versions`
- keep existing current-state queries working

Expected outcome:

- the app still behaves mostly as it does today
- backend is capable of answering basic as-of queries
- `Item` does not repeat the current-only pattern

### Phase 2: Useful Time-Aware UX

Goal: make time visible in user-facing features.

- add `asOfTick` to shared API contracts and services
- add universal slider state in the renderer
- convert character sheets, location views, item views, and event lists to time-sliced reads
- add `event_participants`
- add map tables and `map_feature_versions`
- add `item_location_spans` and/or `item_possession_spans`

Expected outcome:

- moving the slider changes sheets, map state, and chronology coherently

### Phase 3: More Advanced Temporal World State

Goal: extend the same model to richer simulation and history.

- add `relationship_spans`
- add world-state snapshots/derived views if needed for performance
- add playback/scrubbing helpers
- add diff-style comparisons between two ticks
- consider triggers or stronger DB constraints if temporal write volume grows

Expected outcome:

- relationships, possessions, and world state can all evolve over time on the same foundation

## What Not To Do Yet

- Do not adopt full event sourcing.
- Do not build a generic `temporal_records(entity_type, entity_id, payload_json)` table.
- Do not add bitemporal querying unless a real product requirement appears.
- Do not model alternate timeline branches in v1.
- Do not solve vague or uncertain dates beyond simple inferred rows.
- Do not pull map geometry into a GIS stack unless map requirements actually demand it.
- Do not temporalize every field immediately; only temporalize state the slider needs.

## Final Choice

WorldForge v1 should use a **hybrid valid-time design**:

- current snapshot tables remain in place
- append-mostly version tables store entity state over time
- span tables store temporal relationships
- events are first-class chronology data
- one integer `world_tick` drives every as-of query

That is the simplest robust temporal foundation for the app's current scale and future roadmap.
