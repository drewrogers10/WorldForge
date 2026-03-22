ALTER TABLE `maps`
ADD COLUMN `theme_preset` text NOT NULL DEFAULT 'parchment'
  CHECK(`theme_preset` IN ('parchment', 'terrain', 'political'));
--> statement-breakpoint
ALTER TABLE `map_feature_versions`
ADD COLUMN `feature_role` text NOT NULL DEFAULT 'custom'
  CHECK(`feature_role` IN ('custom', 'settlement', 'river', 'road', 'mountainRange', 'forest', 'regionBorder'));
--> statement-breakpoint
ALTER TABLE `map_anchors` RENAME TO `__old_map_anchors`;
--> statement-breakpoint
CREATE TABLE `map_anchors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_id` integer NOT NULL REFERENCES `maps`(`id`) ON DELETE cascade,
	`location_id` integer NOT NULL REFERENCES `locations`(`id`) ON DELETE cascade,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "map_anchors_x_check" CHECK(`x` >= 0),
	CONSTRAINT "map_anchors_y_check" CHECK(`y` >= 0)
);
--> statement-breakpoint
INSERT INTO `map_anchors` (
  `id`,
  `map_id`,
  `location_id`,
  `x`,
  `y`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `map_id`,
  `location_id`,
  `x`,
  `y`,
  `created_at`,
  `updated_at`
FROM `__old_map_anchors`;
--> statement-breakpoint
DROP TABLE `__old_map_anchors`;
--> statement-breakpoint
CREATE UNIQUE INDEX `map_anchors_map_location_unique_idx`
ON `map_anchors` (`map_id`, `location_id`);
--> statement-breakpoint
CREATE INDEX `map_anchors_location_idx` ON `map_anchors` (`location_id`);
