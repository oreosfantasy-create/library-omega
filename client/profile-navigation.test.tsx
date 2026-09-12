import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import Profile from "./src/pages/Profile";

vi.mock("wouter", () => ({
  useLocation: () => ["/perfil", vi.fn()],
}));

vi.mock("./src/lib/libraryStore", () => ({
  XP_PER_LEVEL: 100,
  MAX_LEVEL: 20,
  levelTitle: (level: number) => `Nivel ${level}`,
  levelMessage: () => "Sigue leyendo.",
  useLibrary: () => ({
    xp: 0,
    level: 1,
    xpProgressInfo: { inLevel: 0, levelTarget: 100 },
    streak: 0,
    readBooks: [],
    catalogBooks: [],
    resetProgress: vi.fn(),
    readingLogs: [],
    achievements: [],
    role: "lector",
    setRole: vi.fn(),
  }),
}));

vi.mock("./src/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      openId: "profile-test-user",
      name: "Lector de prueba",
      email: "lector@example.com",
      role: "user",
    },
    loading: false,
    error: null,
    isAuthenticated: true,
    refresh: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("Profile navigation", () => {
  it("muestra la Navbar, activa Perfil y deja espacio para la navegación móvil", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    render(
      <ThemeProvider defaultTheme="light" switchable>
        <Profile />
      </ThemeProvider>,
    );

    expect(screen.getByRole("heading", { name: "Tu Legado" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Perfil" }).some((button) => button.classList.contains("bg-foreground"))).toBe(true);
    expect(document.querySelector("main.mb-24")).toBeTruthy();
    const mascotCard = screen.getByText("Sigue leyendo.").closest(".catalog-card");
    expect(mascotCard?.className.includes("text-card-foreground")).toBe(true);
  });
});
