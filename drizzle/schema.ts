import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Libros de la biblioteca (compartidos entre dispositivos). */
export const books = mysqlTable("books", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").references(() => users.id),
  title: varchar("title", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileType: mysqlEnum("fileType", ["pdf", "epub"]).notNull(),
  category: varchar("category", { length: 64 }).notNull().default("Otros"),
  age: varchar("age", { length: 32 }).notNull().default("Universal"),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  coverKey: varchar("coverKey", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Progreso de lectura por usuario y libro. */
export const userProgress = mysqlTable("user_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  bookId: varchar("bookId", { length: 64 }).notNull().references(() => books.id),
  lastPage: int("lastPage").notNull().default(0),
  isFinished: int("isFinished").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Estadísticas y gamificación por usuario. */
export const userStats = mysqlTable("user_stats", {
  userId: int("userId").primaryKey().references(() => users.id),
  xp: int("xp").notNull().default(0),
  streakCount: int("streakCount").notNull().default(0),
  lastVisitDate: varchar("lastVisitDate", { length: 10 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

/** Registro de accesos de usuarios (email + fecha) tras pasar el CAPTCHA. */
export const accessLogs = mysqlTable("access_logs", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = typeof accessLogs.$inferInsert;

/** Reseñas de libros (censuradas para el usuario, visibles solo para admin). */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  bookId: varchar("bookId", { length: 64 }),
  userEmail: varchar("userEmail", { length: 320 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;