CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`owner_character_id` integer,
	`location_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "items_single_assignment_check" CHECK("items"."owner_character_id" IS NULL OR "items"."location_id" IS NULL)
);
--> statement-breakpoint
CREATE INDEX `items_owner_character_id_idx` ON `items` (`owner_character_id`);--> statement-breakpoint
CREATE INDEX `items_location_id_idx` ON `items` (`location_id`);