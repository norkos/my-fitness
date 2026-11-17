ALTER TABLE `exercises` ADD `video_url` text;--> statement-breakpoint
ALTER TABLE `sets` ADD `completed` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `workouts` ADD `status` text DEFAULT 'done' NOT NULL;--> statement-breakpoint
CREATE INDEX `workouts_status_date_idx` ON `workouts` (`status`,`date`);