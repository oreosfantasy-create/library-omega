CREATE TABLE `access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_logs_id` PRIMARY KEY(`id`)
);
