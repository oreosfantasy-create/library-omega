import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { accessLogs, books, InsertAccessLog, InsertBook, InsertUser, users, reviews, InsertReview, userProgress, userStats } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Listar todos los libros de la biblioteca (público, cualquier dispositivo los ve). */
export async function listBooks() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(books).orderBy(asc(books.createdAt));
}

/** Insertar un libro con sus referencias de almacenamiento. */
export async function insertBook(book: InsertBook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(books).values(book);
}

/** Actualizar metadatos de clasificación de un libro (género y/o edad). */
export async function updateBookMetadata(
  id: string,
  meta: { category?: string; age?: string; coverKey?: string; featured?: number },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updates: Record<string, string | number> = {};
  if (meta.category !== undefined) updates.category = meta.category;
  if (meta.age !== undefined) updates.age = meta.age;
  if (meta.coverKey !== undefined) updates.coverKey = meta.coverKey;
  if (meta.featured !== undefined) updates.featured = meta.featured;
  if (Object.keys(updates).length === 0) return;
  await db.update(books).set(updates).where(eq(books.id, id));
}

/** Obtener o crear estadísticas de usuario. */
export async function getOrCreateUserStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  
  await db.insert(userStats).values({ userId });
  return { userId, xp: 0, streakCount: 0, lastVisitDate: null };
}

/** Actualizar estadísticas de usuario (XP, Racha). */
export async function updateUserStats(userId: number, stats: { xp?: number; streakCount?: number; lastVisitDate?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userStats).set(stats).where(eq(userStats.userId, userId));
}

/** Obtener progreso de lectura de un usuario para un libro. */
export async function getUserProgress(userId: number, bookId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.select().from(userProgress).where(sql`${userProgress.userId} = ${userId} AND ${userProgress.bookId} = ${bookId}`).limit(1);
  return res.length > 0 ? res[0] : null;
}

/** Actualizar o insertar progreso de lectura. */
export async function upsertUserProgress(userId: number, bookId: string, progress: { lastPage?: number; isFinished?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserProgress(userId, bookId);
  if (existing) {
    await db.update(userProgress).set(progress).where(eq(userProgress.id, existing.id));
  } else {
    await db.insert(userProgress).values({ userId, bookId, ...progress });
  }
}

/** Listar todo el progreso de un usuario. */
export async function listUserProgress(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(userProgress).where(eq(userProgress.userId, userId));
}

/** Eliminar un libro por su id. */
export async function deleteBook(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // user_progress tiene una FK hacia books sin ON DELETE CASCADE.
  // Limpiamos dependencias antes del registro principal para que el borrado
  // administrativo funcione también con libros ya abiertos o marcados.
  await db.delete(userProgress).where(eq(userProgress.bookId, id));
  await db.delete(reviews).where(eq(reviews.bookId, id));
  await db.delete(books).where(eq(books.id, id));
}

/** Registrar un acceso de usuario tras pasar el CAPTCHA. */
export async function logAccess(log: InsertAccessLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(accessLogs).values(log);
}

/** Listar los últimos 100 registros de acceso para el panel de Admin. */
export async function listAccessLogs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Mostrar los accesos más recientes primero.
  return db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp), desc(accessLogs.id)).limit(100);
}

/** Registrar una reseña privada. */
export async function insertReview(review: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reviews).values(review);
}

/** Listar todas las reseñas (solo admin las ve). */
export async function listReviews() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(reviews).orderBy(asc(reviews.createdAt));
}

/** Eliminar una reseña. */
export async function deleteReview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reviews).where(eq(reviews.id, id));
}
