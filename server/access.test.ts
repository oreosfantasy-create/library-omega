import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const mockListAccessLogs = vi.fn();
const mockLogAccess = vi.fn();

vi.mock("./db", () => ({
  listAccessLogs: (...args: unknown[]) => mockListAccessLogs(...args),
  logAccess: (...args: unknown[]) => mockLogAccess(...args),
}));

function createContext(role: "admin" | "user" | null = null): TrpcContext {
  return {
    user: role ? {
      id: 1,
      openId: "admin-open-id",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("access router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve los accesos registrados a una sesión autenticada con rol admin", async () => {
    const timestamp = new Date("2026-08-24T18:30:00.000Z");
    mockListAccessLogs.mockResolvedValue([
      { id: 12, email: "persona@example.com", timestamp },
      { id: 11, email: "lectora@example.com", timestamp: new Date("2026-08-24T17:30:00.000Z") },
    ]);

    const result = await appRouter.createCaller(createContext("admin")).access.list();

    expect(result).toEqual([
      { id: 12, email: "persona@example.com", timestamp: timestamp.getTime() },
      { id: 11, email: "lectora@example.com", timestamp: new Date("2026-08-24T17:30:00.000Z").getTime() },
    ]);
    expect(mockListAccessLogs).toHaveBeenCalledOnce();
  });

  it("rechaza consultar identidades a un lector o visitante", async () => {
    await expect(appRouter.createCaller(createContext("user")).access.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(createContext()).access.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mockListAccessLogs).not.toHaveBeenCalled();
  });

  it("registra un acceso después de la verificación", async () => {
    mockLogAccess.mockResolvedValue(undefined);

    const result = await appRouter.createCaller(createContext()).access.log({ email: "persona@example.com" });

    expect(result).toEqual({ success: true });
    expect(mockLogAccess).toHaveBeenCalledWith({ email: "persona@example.com" });
  });
});
