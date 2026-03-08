CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `__new_characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`location_id` integer REFERENCES `locations`(`id`) ON DELETE SET NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_characters` (`id`, `name`, `summary`, `created_at`, `updated_at`)
SELECT `id`, `name`, `summary`, `created_at`, `updated_at`
FROM `characters`;
--> statement-breakpoint
DROP TABLE `characters`;
--> statement-breakpoint
ALTER TABLE `__new_characters` RENAME TO `characters`;
--> statement-breakpoint
CREATE INDEX `characters_location_id_idx` ON `characters` (`location_id`);
