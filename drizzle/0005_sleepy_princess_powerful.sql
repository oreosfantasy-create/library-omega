CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` varchar(64) NOT NULL,
	`userEmail` varchar(320) NOT NULL,
	`rating` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
