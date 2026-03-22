CREATE TABLE `entity_document_sync_state` (
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`canonical_path` text,
	`content_hash` text,
	`last_synced_at` integer,
	`dirty_reason` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	PRIMARY KEY(`entity_type`, `entity_id`),
	CONSTRAINT "entity_document_sync_state_entity_type_check" CHECK("entity_document_sync_state"."entity_type" IN ('character', 'location', 'item'))
);
--> statement-breakpoint
CREATE INDEX `entity_document_sync_state_dirty_idx` ON `entity_document_sync_state` (`dirty_reason`);
--> statement-breakpoint
CREATE TABLE `entity_vector_sync_state` (
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`content_hash` text,
	`last_synced_at` integer,
	`dirty_reason` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	PRIMARY KEY(`entity_type`, `entity_id`),
	CONSTRAINT "entity_vector_sync_state_entity_type_check" CHECK("entity_vector_sync_state"."entity_type" IN ('character', 'location', 'item'))
);
--> statement-breakpoint
CREATE INDEX `entity_vector_sync_state_dirty_idx` ON `entity_vector_sync_state` (`dirty_reason`);
--> statement-breakpoint
CREATE TABLE `entity_snapshot_jobs` (
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`tick` integer NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	PRIMARY KEY(`entity_type`, `entity_id`, `tick`),
	CONSTRAINT "entity_snapshot_jobs_entity_type_check" CHECK("entity_snapshot_jobs"."entity_type" IN ('character', 'location', 'item'))
);
--> statement-breakpoint
CREATE INDEX `entity_snapshot_jobs_tick_idx` ON `entity_snapshot_jobs` (`tick`);
--> statement-breakpoint
CREATE TABLE `world_search_documents` (
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`relationships_text` text DEFAULT '' NOT NULL,
	`canonical_path` text NOT NULL,
	`content_hash` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`entity_type`, `entity_id`),
	CONSTRAINT "world_search_documents_entity_type_check" CHECK("world_search_documents"."entity_type" IN ('character', 'location', 'item'))
);
--> statement-breakpoint
CREATE INDEX `world_search_documents_updated_idx` ON `world_search_documents` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `world_search_documents_canonical_path_idx` ON `world_search_documents` (`canonical_path`);
--> statement-breakpoint
CREATE VIRTUAL TABLE `world_search_fts`
USING fts5(
	`entity_type` UNINDEXED,
	`entity_id` UNINDEXED,
	`title`,
	`summary`,
	`body`,
	`relationships`
);
