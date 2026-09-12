import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { extractEpubCoverBuffer } from "./cover-extract";

describe("extractEpubCoverBuffer", () => {
  it("extrae portada de un EPUB Calibre con guide cover (Fahrenheit 451)", async () => {
    const buf = readFileSync("scripts/fixtures/fahrenheit451.epub");
    const cover = await extractEpubCoverBuffer(buf);
    expect(cover).not.toBeNull();
    expect(cover!.buffer.length).toBeGreaterThan(1000);
    expect(cover!.mime).toBe("image/jpeg");
  }, 30000);
});
