ALTER TABLE `locations` ADD `exists_from_tick` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `locations` ADD `exists_to_tick` integer;
--> statement-breakpoint
ALTER TABLE `characters` ADD `exists_from_tick` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `characters` ADD `exists_to_tick` integer;
--> statement-breakpoint
ALTER TABLE `items` ADD `exists_from_tick` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `items` ADD `exists_to_tick` integer;
--> statement-breakpoint
CREATE TABLE `character_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL REFERENCES `characters`(`id`) ON DELETE cascade,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`is_inferred` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "character_versions_validity_check" CHECK("character_versions"."valid_to" IS NULL OR "character_versions"."valid_to" > "character_versions"."valid_from")
);
--> statement-breakpoint
CREATE TABLE `location_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_id` integer NOT NULL REFERENCES `locations`(`id`) ON DELETE cascade,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`is_inferred` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "location_versions_validity_check" CHECK("location_versions"."valid_to" IS NULL OR "location_versions"."valid_to" > "location_versions"."valid_from")
);
--> statement-breakpoint
CREATE TABLE `item_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL REFERENCES `items`(`id`) ON DELETE cascade,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`is_inferred` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "item_versions_validity_check" CHECK("item_versions"."valid_to" IS NULL OR "item_versions"."valid_to" > "item_versions"."valid_from")
);
--> statement-breakpoint
CREATE TABLE `character_location_spans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL REFERENCES `characters`(`id`) ON DELETE cascade,
	`location_id` integer NOT NULL REFERENCES `locations`(`id`) ON DELETE restrict,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`is_inferred` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "character_location_spans_validity_check" CHECK("character_location_spans"."valid_to" IS NULL OR "character_location_spans"."valid_to" > "character_location_spans"."valid_from")
);
--> statement-breakpoint
CREATE TABLE `item_assignment_spans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL REFERENCES `items`(`id`) ON DELETE cascade,
	`owner_character_id` integer REFERENCES `characters`(`id`) ON DELETE restrict,
	`location_id` integer REFERENCES `locations`(`id`) ON DELETE restrict,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`is_inferred` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "item_assignment_spans_validity_check" CHECK("item_assignment_spans"."valid_to" IS NULL OR "item_assignment_spans"."valid_to" > "item_assignment_spans"."valid_from"),
	CONSTRAINT "item_assignment_spans_single_assignment_check" CHECK((`owner_character_id` IS NOT NULL OR `location_id` IS NOT NULL) AND (`owner_character_id` IS NULL OR `location_id` IS NULL))
);
--> statement-breakpoint
CREATE INDEX `characters_exists_from_tick_idx` ON `characters` (`exists_from_tick`);
--> statement-breakpoint
CREATE INDEX `items_exists_from_tick_idx` ON `items` (`exists_from_tick`);
--> statement-breakpoint
CREATE INDEX `character_versions_lookup_idx` ON `character_versions` (`character_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `location_versions_lookup_idx` ON `location_versions` (`location_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `item_versions_lookup_idx` ON `item_versions` (`item_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `character_location_spans_lookup_idx` ON `character_location_spans` (`character_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `character_location_spans_location_idx` ON `character_location_spans` (`location_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `item_assignment_spans_lookup_idx` ON `item_assignment_spans` (`item_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `item_assignment_spans_owner_idx` ON `item_assignment_spans` (`owner_character_id`, `valid_from`);
--> statement-breakpoint
CREATE INDEX `item_assignment_spans_location_idx` ON `item_assignment_spans` (`location_id`, `valid_from`);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_versions_open_idx`
ON `character_versions` (`character_id`)
WHERE `valid_to` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `location_versions_open_idx`
ON `location_versions` (`location_id`)
WHERE `valid_to` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `item_versions_open_idx`
ON `item_versions` (`item_id`)
WHERE `valid_to` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `character_location_spans_open_idx`
ON `character_location_spans` (`character_id`)
WHERE `valid_to` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `item_assignment_spans_open_idx`
ON `item_assignment_spans` (`item_id`)
WHERE `valid_to` IS NULL;
--> statement-breakpoint
INSERT INTO `location_versions` (
	`location_id`,
	`valid_from`,
	`valid_to`,
	`name`,
	`summary`,
	`is_inferred`,
	`created_at`
)
SELECT
	`id`,
	`exists_from_tick`,
	`exists_to_tick`,
	`name`,
	`summary`,
	1,
	`updated_at`
FROM `locations`;
--> statement-breakpoint
INSERT INTO `character_versions` (
	`character_id`,
	`valid_from`,
	`valid_to`,
	`name`,
	`summary`,
	`is_inferred`,
	`created_at`
)
SELECT
	`id`,
	`exists_from_tick`,
	`exists_to_tick`,
	`name`,
	`summary`,
	1,
	`updated_at`
FROM `characters`;
--> statement-breakpoint
INSERT INTO `character_location_spans` (
	`character_id`,
	`location_id`,
	`valid_from`,
	`valid_to`,
	`is_inferred`,
	`created_at`
)
SELECT
	`id`,
	`location_id`,
	`exists_from_tick`,
	`exists_to_tick`,
	1,
	`updated_at`
FROM `characters`
WHERE `location_id` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `item_versions` (
	`item_id`,
	`valid_from`,
	`valid_to`,
	`name`,
	`summary`,
	`quantity`,
	`is_inferred`,
	`created_at`
)
SELECT
	`id`,
	`exists_from_tick`,
	`exists_to_tick`,
	`name`,
	`summary`,
	`quantity`,
	1,
	`updated_at`
FROM `items`;
--> statement-breakpoint
INSERT INTO `item_assignment_spans` (
	`item_id`,
	`owner_character_id`,
	`location_id`,
	`valid_from`,
	`valid_to`,
	`is_inferred`,
	`created_at`
)
SELECT
	`id`,
	`owner_character_id`,
	`location_id`,
	`exists_from_tick`,
	`exists_to_tick`,
	1,
	`updated_at`
FROM `items`
WHERE `owner_character_id` IS NOT NULL OR `location_id` IS NOT NULL;
