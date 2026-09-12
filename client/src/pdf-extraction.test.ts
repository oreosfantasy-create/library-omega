/**
 * Pruebas del pipeline de extracción de PDF: valida que el agrupamiento de
 * líneas por fila (columnas -> filas, orden arriba->abajo) convierte los
 * ítems de texto de pdf.js en NodeChunk[] en el orden correcto.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Tipo mínimo compatible con TextContent para el mock de pdf.js.
type MockTextItem = {
  str: string;
  width: number;
  transform: number[];
};

function rowGrouped(items: MockTextItem[]): string[] {
  // Copia fiel de la lógica de agrupamiento usada en parsePdf (ReaderModal).
  const rowMap = new Map<number, Array<{ x: number; text: string; w: number }>>();
  for (const item of items) {
    const y = Math.round(item.transform[5]);
    const row = rowMap.get(y) ?? [];
    row.push({ x: Math.round(item.transform[4]), text: item.str, w: item.width });
    rowMap.set(y, row);
  }
  const out: string[] = [];
  const rows = Array.from(rowMap.entries()).sort((a, b) => b[0] - a[0]);
  for (const [, rowItems] of rows) {
    rowItems.sort((a, b) => a.x - b.x);
    let line = "";
    let prevEnd = -Infinity;
    for (const it of rowItems) {
      const gap = it.x - prevEnd;
      if (prevEnd !== -Infinity && gap > Math.max(it.w * 0.6, 6)) line += "  ";
      line += it.text;
      prevEnd = it.x + it.w;
    }
    const t = line.trim();
    if (t) out.push(t);
  }
  return out;
}

describe("extracción de texto por filas de PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ordena filas de arriba a abajo e ítems por columna", () => {
    // Coordenadas PDF: y crece hacia ARRIBA. Items desordenados de propósito.
    const items: MockTextItem[] = [
      { str: "tercera", width: 60, transform: [1, 0, 0, 1, 0, 500] },
      { str: "primera", width: 60, transform: [1, 0, 0, 1, 0, 600] },
      { str: "segunda", width: 60, transform: [1, 0, 0, 1, 0, 550] },
    ];
    expect(rowGrouped(items)).toEqual(["primera", "segunda", "tercera"]);
  });

  it("ordena palabras dentro de la misma fila por columna", () => {
    const items: MockTextItem[] = [
      { str: "mundo", width: 50, transform: [1, 0, 0, 1, 80, 600] },
      { str: "Hola", width: 40, transform: [1, 0, 0, 1, 0, 600] },
    ];
    // Hueco de 40 px > 0.6 * 50 px: inserta doble espacio entre columnas.
    expect(rowGrouped(items)).toEqual(["Hola  mundo"]);
  });

  it("inserta espacios dobles entre columnas separadas (más de 0.6 del ancho)", () => {
    const items: MockTextItem[] = [
      { str: "Izq", width: 40, transform: [1, 0, 0, 1, 0, 600] },
      { str: "Der", width: 40, transform: [1, 0, 0, 1, 300, 600] },
    ];
    expect(rowGrouped(items)).toEqual(["Izq  Der"]);
  });

  it("no fragmenta palabras pegadas con hueco pequeño", () => {
    const items: MockTextItem[] = [
      { str: "Casa", width: 40, transform: [1, 0, 0, 1, 0, 600] },
      { str: "bonita", width: 50, transform: [1, 0, 0, 1, 45, 600] },
    ];
    expect(rowGrouped(items)).toEqual(["Casabonita"]);
  });

  it("agrupa por fila aproximada redondeando la coordenada y", () => {
    // Decimales iguales tras redondear van a la misma fila.
    const items: MockTextItem[] = [
      { str: "A", width: 10, transform: [1, 0, 0, 1, 0, 600.2] },
      { str: "B", width: 10, transform: [1, 0, 0, 1, 20, 600.3] },
    ];
    // Hueco de 20 px > 0.6 * 10 px: doble espacio entre columnas (igual que palabras separadas).
    expect(rowGrouped(items)).toEqual(["A  B"]);
  });

  it("separa en filas distintas coordenadas y con decimales que redondean distinto", () => {
    const items: MockTextItem[] = [
      { str: "A", width: 10, transform: [1, 0, 0, 1, 0, 600.2] },
      { str: "B", width: 10, transform: [1, 0, 0, 1, 20, 600.7] },
    ];
    expect(rowGrouped(items)).toEqual(["B", "A"]);
  });

  it("salta líneas vacías resultantes", () => {
    const items: MockTextItem[] = [
      { str: " solo espacio ", width: 100, transform: [1, 0, 0, 1, 0, 600] },
    ];
    expect(rowGrouped(items)).toEqual(["solo espacio"]);
  });
});
