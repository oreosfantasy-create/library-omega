import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";

// Importación dinámica para evitar errores de ESM en tiempo de carga
async function extractCoverBuffer(buffer: Buffer, type: "epub" | "pdf"): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const { extractCoverBuffer: extractor } = await import("./cover-extract.ts");
    return await extractor(buffer, type);
  } catch (e) {
    console.error("Error cargando extractor de portadas:", e);
    return null;
  }
}

const ADMIN_PASSWORD = "omega2024";

function llmText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => typeof part === "object" && part && "text" in part ? String((part as { text: unknown }).text) : "").join("\n");
  }
  return "";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  access: router({
    log: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await db.logAccess({ email: input.email });
        return { success: true } as const;
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      // Los correos y horarios son datos privados: solo el rol admin autenticado puede verlos.
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const rows = await db.listAccessLogs();
      return rows.map(r => ({ id: r.id, email: r.email, timestamp: r.timestamp.getTime() }));
    }),
  }),

  recommendations: router({
    chat: publicProcedure
      .input(z.object({
        message: z.string().trim().min(2).max(1200),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) })).max(8).default([]),
      }))
      .mutation(async ({ input }) => {
        const availableBooks = await db.listBooks();
        const catalog = availableBooks.map((book) => ({
          id: book.id,
          title: book.title,
          category: book.category,
          age: book.age ?? "Universal",
        }));
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Eres Gato Omega, un bibliotecario amable. Responde en español latinoamericano. Primero busca coincidencias en el catálogo disponible y devuelve sus IDs exactos en recommendations. También puedes proponer hasta 3 libros externos en externalSuggestions cuando ayuden al lector; márcalos como no disponibles y nunca les inventes un ID. No afirmes que un libro está en la biblioteca si no aparece en el catálogo. Si la petición es ambigua, haz una pregunta breve." },
            ...input.history.map((item) => ({ role: item.role as "user" | "assistant", content: item.content })),
            { role: "user", content: `Catálogo disponible ahora (se actualiza cada vez que se consulta):\n${JSON.stringify(catalog)}\n\nPetición del lector:\n${input.message}` },
          ],
          maxTokens: 700,
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "book_recommendations",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  answer: { type: "string" },
                  recommendations: { type: "array", items: { type: "object", properties: { id: { type: "string" }, reason: { type: "string" } }, required: ["id", "reason"], additionalProperties: false } },
                  externalSuggestions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, author: { type: "string" }, reason: { type: "string" } }, required: ["title", "author", "reason"], additionalProperties: false } },
                },
                required: ["answer", "recommendations", "externalSuggestions"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = llmText(response.choices?.[0]?.message?.content);
        try {
          const parsed = JSON.parse(raw) as { answer?: string; recommendations?: Array<{ id?: string; reason?: string }>; externalSuggestions?: Array<{ title?: string; author?: string; reason?: string }> };
          const allowed = new Set(catalog.map((book) => book.id));
          const recommendations = (parsed.recommendations || [])
            .filter((item) => item.id && allowed.has(item.id))
            .slice(0, 5)
            .map((item) => ({ id: item.id as string, reason: item.reason || "Podría encajar con lo que buscas." }));
          const externalSuggestions = (parsed.externalSuggestions || []).filter((item) => item.title && item.author && item.reason).slice(0, 3).map((item) => ({ title: item.title as string, author: item.author as string, reason: item.reason as string }));
          return { answer: parsed.answer || "Encontré algunas opciones para ti.", recommendations, externalSuggestions };
        } catch {
          return { answer: raw || "No pude organizar una recomendación. Prueba describiendo el tipo de historia que buscas.", recommendations: [], externalSuggestions: [] };
        }
      }),
  }),

  books: router({
    list: publicProcedure.query(async () => {
      const rows = await db.listBooks();
      return rows.map((b) => ({
        id: b.id,
        title: b.title,
        fileName: b.fileName,
        fileType: b.fileType,
        category: b.category,
        age: b.age ?? "Universal",
        url: `/manus-storage/${b.storageKey}`,
        coverUrl: b.coverKey ? `/manus-storage/${b.coverKey}` : null,
        featured: Boolean(b.featured),
        addedAt: b.createdAt.getTime(),
      }));
    }),

    sync: protectedProcedure.query(async ({ ctx }) => {
      const stats = await db.getOrCreateUserStats(ctx.user.id);
      const progress = await db.listUserProgress(ctx.user.id);
      return {
        stats: { xp: stats.xp, streak: stats.streakCount, lastVisit: stats.lastVisitDate },
        progress: progress.map(p => ({ bookId: p.bookId, lastPage: p.lastPage, isFinished: p.isFinished === 1 })),
      };
    }),

    updateProgress: protectedProcedure
      .input(z.object({ bookId: z.string(), lastPage: z.number().int().min(0), isFinished: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserProgress(ctx.user.id, input.bookId, { lastPage: input.lastPage, isFinished: input.isFinished ? 1 : 0 });
        return { success: true };
      }),

    updateStats: protectedProcedure
      .input(z.object({ xp: z.number().int().min(0), streak: z.number().int().min(0), lastVisit: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserStats(ctx.user.id, { xp: input.xp, streakCount: input.streak, lastVisitDate: input.lastVisit });
        return { success: true };
      }),

    add: publicProcedure
      .input(z.object({
        password: z.string(),
        fileName: z.string().min(1).max(512),
        category: z.string().max(64).default("Otros"),
        age: z.string().max(32).default("Universal"),
        dataBase64: z.string().min(1),
        mimeType: z.string().default("application/octet-stream"),
        coverBase64: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) throw new TRPCError({ code: "UNAUTHORIZED" });
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ext = input.fileName.toLowerCase().endsWith(".epub") ? "epub" : "pdf";
        const buffer = Buffer.from(input.dataBase64, "base64");

        const { key: storageKey } = await storagePut(`libros/${id}.${ext}`, buffer, input.mimeType);

        let coverKey: string | null = null;
        if (input.coverBase64) {
          try {
            const coverBuf = Buffer.from(input.coverBase64, "base64");
            const { key } = await storagePut(`portadas/${id}.jpg`, coverBuf, "image/jpeg");
            coverKey = key;
          } catch {}
        } else {
          try {
            const cover = await extractCoverBuffer(buffer, ext);
            if (cover) {
              const { key } = await storagePut(`portadas/${id}.jpg`, cover.buffer, cover.mime);
              coverKey = key;
            }
          } catch {}
        }

        await db.insertBook({
          id,
          title: input.fileName.replace(/\.(pdf|epub)$/i, "").trim(),
          fileName: input.fileName,
          fileType: ext,
          category: input.category,
          age: input.age,
          storageKey,
          coverKey,
        });

        return { id } as const;
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteBook(input.id);
        return { success: true } as const;
      }),

    removeWithPassword: publicProcedure
      .input(z.object({ id: z.string().min(1), password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) throw new TRPCError({ code: "UNAUTHORIZED" });
        await db.deleteBook(input.id);
        return { success: true } as const;
      }),

    updateMetadata: protectedProcedure
      .input(z.object({ id: z.string().min(1), category: z.string().optional(), age: z.string().optional(), featured: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBookMetadata(input.id, { category: input.category, age: input.age, featured: input.featured === undefined ? undefined : input.featured ? 1 : 0 });
        return { success: true } as const;
      }),

    updateBookmark: protectedProcedure
      .input(z.object({ id: z.string().min(1), lastPage: z.number().int().min(0) }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserProgress(ctx.user.id, input.id, { lastPage: input.lastPage });
        return { success: true } as const;
      }),

    regenCovers: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) throw new TRPCError({ code: "UNAUTHORIZED" });
        const books = await db.listBooks();
        const results: { id: string; title: string; ok: boolean }[] = [];
        for (const b of books) {
          if (b.coverKey) {
            results.push({ id: b.id, title: b.title, ok: false });
            continue;
          }
          try {
            const url = await storageGetSignedUrl(b.storageKey);
            const res = await fetch(url);
            if (!res.ok) continue;
            const buf = Buffer.from(await res.arrayBuffer());
            const cover = await extractCoverBuffer(buf, b.fileType as any);
            if (cover) {
              const { key } = await storagePut(`portadas/${b.id}.jpg`, cover.buffer, cover.mime);
              await db.updateBookMetadata(b.id, { coverKey: key });
              results.push({ id: b.id, title: b.title, ok: true });
            }
          } catch {
            results.push({ id: b.id, title: b.title, ok: false });
          }
        }
        return { results } as const;
      }),
  }),

  reviews: router({
    add: protectedProcedure
      .input(z.object({ bookId: z.string().optional(), rating: z.number().min(1).max(5), comment: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        await db.insertReview({ ...input, userId: ctx.user.id, userEmail: ctx.user.email || "unknown" });
        return { success: true } as const;
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const rows = await db.listReviews();
      return rows.map(r => ({ ...r, createdAt: r.createdAt.getTime() }));
    }),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteReview(input.id);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
