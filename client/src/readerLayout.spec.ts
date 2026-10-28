import { describe, expect, it } from "vitest";
import { isMobileReaderMode, normalizeReaderPage } from "@/lib/readerLayout";

describe("reader layout", () => {
  it("usa una hoja en móvil, dos en computador y respeta Auto", () => {
    expect(isMobileReaderMode("mobile", 1280)).toBe(true);
    expect(isMobileReaderMode("desktop", 375)).toBe(false);
    expect(isMobileReaderMode("auto", 375)).toBe(true);
    expect(isMobileReaderMode("auto", 1280)).toBe(false);
  });

  it("ancla la navegación de dos hojas en una página par", () => {
    expect(normalizeReaderPage(5, 2, 20)).toBe(4);
    expect(normalizeReaderPage(5, 1, 20)).toBe(5);
    expect(normalizeReaderPage(99, 2, 20)).toBe(19);
    expect(normalizeReaderPage(-4, 1, 20)).toBe(0);
  });
});
