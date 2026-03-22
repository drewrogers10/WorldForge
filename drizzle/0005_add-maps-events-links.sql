CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`start_tick` integer NOT NULL,
	`end_tick` integer,
	`primary_location_id` integer REFERENCES `locations`(`id`) ON DELETE set null,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "events_tick_range_check" CHECK(`end_tick` IS NULL OR `end_tick` >= `start_tick`)
);
--> statement-breakpoint
CREATE INDEX `events_start_idx` ON `events` (`start_tick`, `id`);
--> statement-breakpoint
CREATE INDEX `events_primary_location_idx` ON `events` (`primary_location_id`);
--> statement-breakpoint
CREATE TABLE `maps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_kind` text NOT NULL,
	`focus_location_id` integer REFERENCES `locations`(`id`) ON DELETE set null,
	`parent_map_id` integer REFERENCES `maps`(`id`) ON DELETE set null,
	`image_asset_path` text,
	`canvas_width` integer DEFAULT 10000 NOT NULL,
	`canvas_height` integer DEFAULT 10000 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "maps_display_kind_check" CHECK(`display_kind` IN ('vector', 'image')),
	CONSTRAINT "maps_canvas_width_check" CHECK(`canvas_width` > 0),
	CONSTRAINT "maps_canvas_height_check" CHECK(`canvas_height` > 0)
);
--> statement-breakpoint
CREATE INDEX `maps_focus_location_idx` ON `maps` (`focus_location_id`);
--> statement-breakpoint
CREATE INDEX `maps_parent_map_idx` ON `maps` (`parent_map_id`);
--> statement-breakpoint
CREATE TABLE `map_features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_id` integer NOT NULL REFERENCES `maps`(`id`) ON DELETE cascade,
	`feature_kind` text NOT NULL,
	`location_id` integer REFERENCES `locations`(`id`) ON DELETE set null,
	`event_id` integer REFERENCES `events`(`id`) ON DELETE set null,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "map_features_kind_check" CHECK(`feature_kind` IN ('marker', 'path', 'polygon', 'border'))
);
--> statement-breakpoint
CREATE INDEX `map_features_map_idx` ON `map_features` (`map_id`, `id`);
--> statement-breakpoint
CREATE INDEX `map_features_location_idx` ON `map_features` (`location_id`);
--> statement-breakpoint
CREATE INDEX `map_features_event_idx` ON `map_features` (`event_id`);
--> statement-breakpoint
CREATE TABLE `map_feature_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feature_id` integer NOT NULL REFERENCES `map_features`(`id`) ON DELETE cascade,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`label` text DEFAULT '' NOT NULL,
	`geometry_json` text NOT NULL,
	`style_json` text,
	`source_event_id` integer REFERENCES `events`(`id`) ON DELETE set null,
	`created_at` integer NOT NULL,
	CONSTRAINT "map_feature_versions_validity_check" CHECK(`valid_to` IS NULL OR `valid_to` > `valid_from`)
);
--> statement-breakpoint
CREATE INDEX `map_feature_versions_lookup_idx` ON `map_feature_versions` (`feature_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `map_feature_versions_source_event_idx` ON `map_feature_versions` (`source_event_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_feature_versions_open_idx`
ON `map_feature_versions` (`feature_id`)
WHERE `valid_to` IS NULL;
--> statement-breakpoint
CREATE TABLE `map_anchors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_id` integer NOT NULL REFERENCES `maps`(`id`) ON DELETE cascade,
	`location_id` integer NOT NULL REFERENCES `locations`(`id`) ON DELETE cascade,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "map_anchors_x_check" CHECK(`x` >= 0 AND `x` <= 10000),
	CONSTRAINT "map_anchors_y_check" CHECK(`y` >= 0 AND `y` <= 10000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_anchors_map_location_unique_idx`
ON `map_anchors` (`map_id`, `location_id`);
--> statement-breakpoint
CREATE INDEX `map_anchors_location_idx` ON `map_anchors` (`location_id`);
--> statement-breakpoint
CREATE TABLE `entity_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_kind` text NOT NULL,
	`entity_id` integer NOT NULL,
	`link_kind` text NOT NULL,
	`label` text NOT NULL,
	`target` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "entity_links_entity_kind_check" CHECK(`entity_kind` IN ('location', 'event')),
	CONSTRAINT "entity_links_link_kind_check" CHECK(`link_kind` IN ('file', 'url'))
);
--> statement-breakpoint
CREATE INDEX `entity_links_entity_idx` ON `entity_links` (`entity_kind`, `entity_id`, `id`);
