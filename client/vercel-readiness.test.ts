import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Vercel package readiness", () => {
  it("includes the local cat-and-Omega logo", () => {
    const asset = path.join(root, "client/public/library-omega-cat.png");
    expect(fs.existsSync(asset)).toBe(true);
    expect(fs.statSync(asset).size).toBeGreaterThan(1000);
    expect(read("client/src/components/BrandMark.tsx")).toContain("/library-omega-cat.png");
  });

  it("keeps OAuth tied to the deployed origin and reports missing build variables", () => {
    const source = read("client/src/const.ts");
    expect(source).toContain("window.location.origin");
    expect(source).toContain("VITE_OAUTH_PORTAL_URL");
    expect(source).toContain("VITE_APP_ID");
    expect(source).toContain("El inicio con Google no está configurado");
  });

  it("routes API requests to the serverless Express entry", () => {
    const config = read("vercel.json");
    expect(config).toContain('"api/index.ts"');
    expect(config).toContain('"/api/(.*)"');
    expect(config).toContain('"/api/oauth/callback"');
  });
});
