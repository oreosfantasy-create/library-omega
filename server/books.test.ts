import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

// Mocks de la capa de datos y almacenamiento
const mockListBooks = vi.fn();
const mockInsertBook = vi.fn();
const mockDeleteBook = vi.fn();
const mockUpdateBookMetadata = vi.fn();

vi.mock("./db", () => ({
  listBooks: (...args: unknown[]) => mockListBooks(...args),
  insertBook: (...args: unknown[]) => mockInsertBook(...args),
  deleteBook: (...args: unknown[]) => mockDeleteBook(...args),
  updateBookMetadata: (...args: unknown[]) => mockUpdateBookMetadata(...args),
}));

const mockStoragePut = vi.fn();
vi.mock("./storage", () => ({
  storagePut: (...args: unknown[]) => mockStoragePut(...args),
}));

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createCtx(role: "admin" | "lector" | null = null): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: role ? {
      id: 1,
      openId: "test-open-id",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    } : null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("books router", () => {
  it("lista los libros sin autenticación", async () => {
    const { ctx } = createCtx();
    mockListBooks.mockResolvedValue([
      {
        id: "1-abc",
        title: "Libro 1",
        fileName: "libro1.pdf",
        fileType: "pdf" as const,
        category: "Ficción",
        storageKey: "libros/1-abc.pdf",
        coverKey: null,
        createdAt: new Date(),
      },
    ]);
    const caller = appRouter.createCaller(ctx);
    const books = await caller.books.list();
    expect(books).toHaveLength(1);
    expect(books[0]?.url).toBe("/manus-storage/libros/1-abc.pdf");
    expect(books[0]?.title).toBe("Libro 1");
  });

  it("rechaza agregar libro sin la contraseña de admin", async () => {
    const { ctx } = createCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.books.add({
        password: "incorrecta",
        fileName: "libro1.pdf",
        category: "Otros",
        dataBase64: "JVBER...",
        mimeType: "application/pdf",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mockInsertBook).not.toHaveBeenCalled();
  });

  it("rechaza eliminar libro a un usuario que no tiene rol admin", async () => {
    const { ctx } = createCtx("lector");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.books.remove({ id: "1-abc" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockDeleteBook).not.toHaveBeenCalled();
  });

  it("agrega un libro con la contraseña correcta y guarda en S3 + DB", async () => {
    const { ctx } = createCtx();
    mockStoragePut.mockResolvedValue({ key: "libros/1-abc.pdf", url: "/manus-storage/libros/1-abc.pdf" });
    mockInsertBook.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.books.add({
      password: "omega2024",
      fileName: "libro1.pdf",
      category: "Ficción",
      dataBase64: Buffer.from("fake-pdf").toString("base64"),
      mimeType: "application/pdf",
    });
    expect(result.id).toBeTruthy();
    expect(mockStoragePut).toHaveBeenCalledTimes(1);
    expect(mockInsertBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "libro1",
        fileName: "libro1.pdf",
        fileType: "pdf",
        category: "Ficción",
        storageKey: "libros/1-abc.pdf",
      }),
    );
  });

  it("elimina un libro con un usuario autenticado admin", async () => {
    const { ctx } = createCtx("admin");
    mockDeleteBook.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.books.remove({ id: "1-abc" });
    expect(result).toEqual({ success: true });
    expect(mockDeleteBook).toHaveBeenCalledWith("1-abc");
  });
  it("rechaza actualizar metadatos a un usuario que no tiene rol admin", async () => {
    const { ctx } = createCtx("lector");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.books.updateMetadata({ id: "1-abc", category: "Terror" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mockUpdateBookMetadata).not.toHaveBeenCalled();
  });
  it("actualiza género y edad de un libro con la contraseña correcta", async () => {
    const { ctx } = createCtx("admin");
    mockUpdateBookMetadata.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.books.updateMetadata({
      id: "1-abc",
      category: "Terror",
      age: "Adolescente",
    });
    expect(result).toEqual({ success: true });
    expect(mockUpdateBookMetadata).toHaveBeenCalledWith("1-abc", {
      category: "Terror",
      age: "Adolescente",
    });
  });
  it("lista los libros incluyendo el campo de edad", async () => {
    const { ctx } = createCtx();
    mockListBooks.mockResolvedValue([
      {
        id: "1-abc",
        title: "Libro 1",
        fileName: "libro1.pdf",
        fileType: "pdf" as const,
        category: "Ficción",
        age: "Infantil",
        storageKey: "libros/1-abc.pdf",
        coverKey: null,
        createdAt: new Date(),
      },
    ]);
    const caller = appRouter.createCaller(ctx);
    const books = await caller.books.list();
    expect(books[0]?.age).toBe("Infantil");
  });
});
