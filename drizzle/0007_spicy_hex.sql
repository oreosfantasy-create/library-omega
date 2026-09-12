CREATE TABLE `user_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(64) NOT NULL,
	`lastPage` int NOT NULL DEFAULT 0,
	`isFinished` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`userId` int NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`streakCount` int NOT NULL DEFAULT 0,
	`lastVisitDate` varchar(10),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_stats_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `books` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `reviews` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `books` ADD CONSTRAINT `books_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `lastPage`;