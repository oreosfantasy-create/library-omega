import { describe, expect, it } from "vitest";
import { isMobileReaderMode, normalizeReaderPage } from "@/lib/readerLayout";

describe("reader layout", () => {
  it("detecta una hoja en teléfono y dos en computador", () => {
    expect(isMobileReaderMode(375)).toBe(true);
    expect(isMobileReaderMode(639)).toBe(true);
    expect(isMobileReaderMode(640)).toBe(false);
    expect(isMobileReaderMode(1280)).toBe(false);
  });

  it("ancla la navegación de dos hojas en una página par", () => {
    expect(normalizeReaderPage(5, 2, 20)).toBe(4);
    expect(normalizeReaderPage(5, 1, 20)).toBe(5);
    expect(normalizeReaderPage(99, 2, 20)).toBe(19);
    expect(normalizeReaderPage(-4, 1, 20)).toBe(0);
  });
});
