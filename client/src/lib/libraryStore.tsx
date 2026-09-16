/**
 * BIBLIOQUEST v2 — "Mono Library"
 * Almacén global de la biblioteca con persistencia en localStorage.
 * Gestiona: libros (catálogo + leídos) con clasificación por categoría,
 * XP/niveles, racha diaria, rol.
 * Todo el estado vive en localStorage — sin APIs externas.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { toast } from "sonner";
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval";
import { trpc } from "../lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/** Misma contraseña de admin que en Navbar.tsx */
const ADMIN_PASSWORD = "omega2024";

export type Role = "admin" | "lector";

export type BookCategory =
  | "Ficción"
  | "No Ficción"
  | "Ciencia"
  | "Historia"
  | "Arte"
  | "Tecnología"
  | "Filosofía"
  | "Poesía"
  | "Biografía"
  | "Clásicos"
  | "Aventura"
  | "Misterio"
  | "Terror"
  | "Otros";

export const BOOK_CATEGORIES: BookCategory[] = [
  "Ficción",
  "No Ficción",
  "Ciencia",
  "Historia",
  "Arte",
  "Tecnología",
  "Filosofía",
  "Poesía",
  "Biografía",
  "Clásicos",
  "Aventura",
  "Misterio",
  "Terror",
  "Otros",
];

/** Clasificación por edades, asignable a cada libro. */
export type AgeRange = "Infantil" | "Juvenil" | "Adolescente" | "Adulto" | "Universal";

export const AGE_RANGES: AgeRange[] = [
  "Universal",
  "Infantil",
  "Juvenil",
  "Adolescente",
  "Adulto",
];

/**
 * Clasificación automática por título: detecta el género y la edad más
 * probables a partir de palabras clave en el título (o "Otros"/"Universal"
 * si no hay pista). El admin puede ajustar ambos valores manualmente.
 */
export function classifyBook(title: string): {
  category: BookCategory;
  age: AgeRange;
} {
  const t = (title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Detección de género por palabras clave (orden importa).
  const genreHints: Array<[RegExp, BookCategory]> = [
    [/\bpoema|poesia|poesias|versos|poetas|haikus|antoologia\b/, "Poesía"],
    [/\bcuento|cuentos|fabula|fabulas|niños|ninos|para ninos|infantil|magica\b/, "Ficción"],
    [/\bciencia|fisica|quimica|biologia|matematicas|matematica|astronomia|universo|naturaleza|cuerpo humano\b/, "Ciencia"],
    [/\bguerra|civilizacion|revolucion|imperio|romanos|antigua|prehistoria|egipto|edades\b/, "Historia"],
    [/\bprincipito|pequeno principe\b/, "Ficción"],
    [/\bharry|percy\b/, "Aventura"],
    [/\bpintura|arte|dibujo|escultura|museo|arquitectura\b/, "Arte"],
    [/\btecnologia|programacion|informatica|robot|digital|internet|codigo\b/, "Tecnología"],
    [/\bfilosofia|pensamiento|etica|existencia|logica\b/, "Filosofía"],
    [/\bbiografia|vida de|memorias|diario\b/, "Biografía"],
    [/\baventura|viaje|explorador|expedicion|sur del mundo|vuelta al mundo\b/, "Aventura"],
    [/\bmisterio|crimen|detective|asesinato|enigma|secreto\b/, "Misterio"],
    [/\bterror|miedo|horror|pesadilla|monstruo|siniestro|escalofrio\b/, "Terror"],
    [/\bclasico|clasica|clasicos|iliada|odisea|quijote|divina comedia\b/, "Clásicos"],
    [/\bhistoria de|libro de|novela\b/, "Ficción"],
    [/\bpijama|rayas|romeo y julieta|romeo\b/, "Clásicos"],
  ];
  let category: BookCategory = "Otros";
  for (const [re, cat] of genreHints) {
    if (re.test(t)) {
      category = cat;
      break;
    }
  }

  // Detección de edad por palabras clave.
  const ageHints: Array<[RegExp, AgeRange]> = [
    [/\bniño|nino|niños|ninos|infantil|cuentos para|pequeños|peque|bebe|magica|principito|fabrica de chocolate|caperucita|cenicienta|blancanieves|dormir\b/, "Infantil"],
    [/\bharry|percy|hogwarts|teens?|teenage\b/, "Adolescente"],
    [/\bjuvenil|adolescencia|adolescen|secundaria|school\b/, "Juvenil"],
    [/\bjoven|young\b/, "Adolescente"],
  ];
  let age: AgeRange = "Universal";
  for (const [re, ar] of ageHints) {
    if (re.test(t)) {
      age = ar;
      break;
    }
  }

  return { category, age };
}

export interface Book {
  id: string;
  title: string;
  category: BookCategory;
  /** Rango de edad recomendado, asignado automáticamente al añadir. */
  age: AgeRange;
  fileName: string;
  fileType: "pdf" | "epub";
  /** dataURL del archivo para el visor (base64) */
  dataUrl: string;
  addedAt: number;
  readAt?: number;
  /** dataURL de la portada (base64), puede ser null */
  coverUrl?: string | null;
  /** true si el libro proviene de la carpeta libros/ del servidor (no se guarda en localStorage) */
  fromFolder?: boolean;
  /** URL de origen para libros de carpeta */
  folderUrl?: string;
  /** Última página leída (marca de página persistente entre dispositivos) */
  lastPage?: number;
  /** Libro seleccionado por administración para la estantería principal. */
  featured?: boolean;
}

export interface StreakState {
  current: number;
  lastVisitDate: string;
}

export interface ReadingLog {
  date: string; // YYYY-MM-DD
  pages: number;
  timeMinutes: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

interface PersistedState {
  books: Book[];
  readBookIds: string[];
  xp: number;
  streak: StreakState;
  firstVisitDate: string;
  readingLogs: ReadingLog[];
  achievements: Achievement[];
}

/** 
 * NOTA DE PRIVACIDAD: XP, Nivel, Racha y Fecha de primera visita son datos
 * estrictamente locales por dispositivo (localStorage). No se sincronizan
 * con la base de datos en la nube para asegurar que cada usuario tenga
 * su propio progreso personal e independiente.
 */

const STORAGE_KEY = "biblioquest-state-v2";
const IDB_META_KEY = "biblioquest-meta-v2";
const IDB_FILE_PREFIX = "file-"; // prefijo para los blobs en IndexedDB

/** Lista de IDs de libros cuyos archivos viven en IndexedDB */
const IDB_STORE_IDS_KEY = "biblioquest-fileids-v2";

/** Convierte dataUrl -> Blob para guardar en IndexedDB */
function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.split(",")[1] ?? "";
  const mime = (dataUrl.match(/^data:([^;]+);/) ?? [])[1] ?? "application/octet-stream";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Convierte Blob -> dataUrl para el visor */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error convirtiendo blob"));
    reader.readAsDataURL(blob);
  });
}

/** Guardar el estado (sin dataUrl) en localStorage y los archivos en IndexedDB */
async function saveState(s: PersistedState) {
  try {
    // Separar archivos y metadata: guardar blobs en IndexedDB
    const fileIds: string[] = [];
    for (const book of s.books) {
      if (book.dataUrl) {
        const blob = dataUrlToBlob(book.dataUrl);
        await idbSet(IDB_FILE_PREFIX + book.id, blob);
        fileIds.push(book.id);
      }
    }
    await idbSet(IDB_STORE_IDS_KEY, fileIds);

    // Estado ligero (sin dataUrl) en localStorage
    const light: PersistedState = {
      ...s,
      books: s.books.map((b) => ({ ...b, dataUrl: "" })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
  } catch (e) {
    console.error("Error guardando estado:", e);
  }
}

/** Cargar estado desde localStorage + IndexedDB */
async function loadState(): Promise<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let parsed: PersistedState;
    if (raw) {
      parsed = JSON.parse(raw) as PersistedState;
    } else {
      // Migración desde v1 (todo en localStorage) por si hay datos viejos
      const rawV1 = localStorage.getItem("biblioquest-state-v1");
      if (rawV1) {
        parsed = JSON.parse(rawV1) as PersistedState;
        localStorage.removeItem("biblioquest-state-v1");
      } else {
        return defaultState();
      }
    }

    // Restaurar dataUrl desde IndexedDB
    const books = await Promise.all(
      parsed.books.map(async (b) => {
        if (b.dataUrl) return b; // ya tiene dataUrl (v1 migrado)
        try {
          const blob = await idbGet<Blob>(IDB_FILE_PREFIX + b.id);
          if (blob) {
            const dataUrl = await blobToDataURL(blob);
            return { ...b, dataUrl };
          }
        } catch {
          /* archivo no encontrado */
        }
        return { ...b, dataUrl: "" };
      })
    );

    return {
      books,
      readBookIds: parsed.readBookIds ?? [],
      xp: parsed.xp ?? 0,
      streak: parsed.streak ?? { current: 0, lastVisitDate: "" },
      firstVisitDate: parsed.firstVisitDate ?? todayStr(),
      readingLogs: parsed.readingLogs ?? [],
      achievements: parsed.achievements ?? [],
    };
  } catch {
    /* primera visita o estado corrupto */
  }
  return defaultState();
}

function defaultState(): PersistedState {
  return {
    books: [],
    readBookIds: [],
    xp: 0,
    streak: { current: 0, lastVisitDate: "" },
    firstVisitDate: todayStr(),
    readingLogs: [],
    achievements: [],
  };
}

/** Prefijo para los IDs de libros que vienen de la carpeta libros/ del servidor */
export const FOLDER_BOOK_PREFIX = "folder-";

const XP_PER_BOOK = 100;
export const XP_PER_LEVEL = 100;
export const MAX_LEVEL = 20;

export function levelFromXp(xp: number): number {
  // 0-99 XP = Nivel 1, 100-199 XP = Nivel 2, etc.
  return Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL) + 1);
}

/** Colores del gato por nivel: 20 colores únicos (nivel 1-20) */
export const CAT_COLORS: string[] = [
  "#000000", // 1 negro
  "#3D2314", // 2 café muy oscuro
  "#5C3A21", // 3 café oscuro
  "#8B5E3C", // 4 café
  "#A0522D", // 5 sienna
  "#CD853F", // 6 peru
  "#D2691E", // 7 chocolate
  "#E8873C", // 8 naranja oscuro
  "#FFA500", // 9 naranja
  "#FFB347", // 10 naranja claro
  "#FFD700", // 11 dorado
  "#DAA520", // 12 goldenrod
  "#B8860B", // 13 darkgoldenrod
  "#CD5C5C", // 14 indiano
  "#DC143C", // 15 carmín
  "#B22222", // 16 rojo fuego
  "#4169E1", // 17 azul real
  "#6A5ACD", // 18 azul violáceo
  "#9370DB", // 19 morado medio
  "#F0E6D2", // 20 crema/blanco
];

export function catColorForLevel(_level: number): string {
  // El color del gato ahora es fijo (no depende del nivel)
  return CAT_FIXED_COLOR;
}

/** COLOR FIJO DEL GATO: el gato ya no cambia de color con el nivel. */
export const CAT_FIXED_COLOR = "#000000";

/** Títulos por nivel (1-20) */
export function levelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: "Gato Novato", 2: "Gato Aprendiz", 3: "Gato Curioso",
    4: "Gato Avanzado", 5: "Gato Experto", 6: "Gato Sabio",
    7: "Gato Místico", 8: "Gato Supremo", 9: "Gato Iluminado",
    10: "Gato Legendario", 11: "Gato Dorado", 12: "Gato Brillante",
    13: "Gato Radiante", 14: "Gato Carmesí", 15: "Gato Escarlata",
    16: "Gato Ardiente", 17: "Gato Real", 18: "Gato Violeta",
    19: "Gato Mágico", 20: "Gato Omega",
  };
  return titles[level] ?? `Gato Nivel ${level}`;
}

export function levelMessage(level: number): string {
  const messages: Record<number, string> = {
    1: "¡Bienvenido! Abre tu primer libro y comienza la aventura.",
    2: "Buen ritmo. Un libro tras otro.",
    3: "La lectura es tu pasión. Sigue así.",
    4: "El conocimiento fluye en tus venas. Excelente trabajo.",
    5: "Ya no eres un simple lector. Eres un experto.",
    6: "Cada página te hace más fuerte. Eres imparable.",
    7: "Tu sabiduría es inmensa. Sigue leyendo, pequeño felino.",
    8: "Eres el guardián de la biblioteca. El conocimiento es tuyo.",
    9: "Tu mente brilla como el oro. ¡Increíble constancia!",
    10: "10 niveles. Eres una leyenda viviente.",
    11: "El dorado es tuyo. Sigue brillando.",
    12: "Tu luz interior crece con cada página.",
    13: "Eres radiante. El universo lector te admira.",
    14: "Rojo pasión. La literatura corre por tus venas.",
    15: "Escarlata como el fuego del conocimiento.",
    16: "Ardiente lector. Nada te detiene.",
    17: "Azul real. La realeza de los libros.",
    18: "Violeta místico. Tu aura lectora es poderosa.",
    19: "Mágico eres. Los libros te responden.",
    20: "Ω Gato Omega. Has alcanzado el máximo. La biblioteca es tuya.",
  };
  return messages[level] ?? `¡Nivel ${level}! Eres un lector extraordinario.`;
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}

/** Convierte una URL (fetch) en dataURL, igual que readFileAsDataURL */
async function fetchAsDataURL(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo descargar " + url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(blob);
  });
}



/** Extrae la portada de un EPUB (dataURL) */
async function extractEpubCover(dataUrl: string): Promise<string | null> {
  try {
    const JSZip = (await import("jszip")).default;
    const base64 = dataUrl.split(",")[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const zip = await JSZip.loadAsync(bytes.buffer as ArrayBuffer);

    const containerXml = await zip.file("META-INF/container.xml")?.async("text");
    if (!containerXml) return null;
    const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
    const rootfile = containerDoc.querySelector("rootfile");
    if (!rootfile) return null;
    const opfPath = rootfile.getAttribute("full-path")!;
    const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

    const opfXml = await zip.file(opfPath)?.async("text");
    if (!opfXml) return null;
    const opfDoc = new DOMParser().parseFromString(opfXml, "application/xml");

    const manifest = new Map<string, { href: string; mediaType: string }>();
    opfDoc.querySelectorAll("manifest item").forEach((item) => {
      manifest.set(item.getAttribute("id")!, {
        href: item.getAttribute("href")!,
        mediaType: item.getAttribute("media-type") || "",
      });
    });

    // Estrategia 1: <meta name="cover" content="..."> o properties="cover-image"
    const coverMeta = opfDoc.querySelector('meta[name="cover"]') || opfDoc.querySelector('[properties~="cover-image"]');
    if (coverMeta) {
      const coverId = coverMeta.getAttribute("content") || coverMeta.getAttribute("href");
      if (coverId) {
        const found = await resolveCoverItem(zip, opfDir, manifest, coverId);
        if (found) return found;
      }
    }

    // Estrategia 2: <guide><reference type="cover" href="..."> (Calibre)
    const guideRef = Array.from(opfDoc.querySelectorAll("guide reference")).find(
      (r) => (r.getAttribute("type") || "").toLowerCase() === "cover",
    );
    if (guideRef) {
      const href = guideRef.getAttribute("href");
      if (href) {
        const found = await resolveCoverFromXhtml(zip, opfDir, href);
        if (found) return found;
      }
    }

    // Estrategia 3: item del manifest cuyo id/href contenga "cover"
    for (const [id, item] of Array.from(manifest.entries())) {
      if (/\.(jpe?g|png|webp)$/i.test(item.href) && /cover/i.test(id + item.href)) {
        const coverFile = zip.file(opfDir + item.href);
        if (coverFile) {
          const b64 = await coverFile.async("base64");
          const ext = item.href.split(".").pop()?.toLowerCase() || "png";
          const mime = item.mediaType || mimeFor(ext);
          return `data:${mime};base64,${b64}`;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveCoverItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zip: any,
  opfDir: string,
  manifest: Map<string, { href: string; mediaType: string }>,
  coverId: string,
): Promise<string | null> {
  // Id exacto, o id sin extensión (Calibre: content="cover" → id="cover.jpg")
  for (const [id, item] of Array.from(manifest.entries())) {
    if (id === coverId || id.replace(/\.[^.]+$/, "") === coverId) {
      const coverFile = zip.file(opfDir + item.href);
      if (coverFile) {
        const b64 = String(await coverFile.async("base64"));
        const ext = item.href.split(".").pop()?.toLowerCase() || "png";
        const mime = item.mediaType || mimeFor(ext);
        return `data:${mime};base64,${b64}`;
      }
    }
  }
  // Ruta directa (EPUB3: href de la imagen)
  const direct = zip.file(opfDir + coverId);
  if (direct) {
    const b64 = String(await direct.async("base64"));
    const ext = coverId.split(".").pop()?.toLowerCase() || "png";
    return `data:${mimeFor(ext)};base64,${b64}`;
  }
  return null;
}

async function resolveCoverFromXhtml(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zip: any,
  opfDir: string,
  href: string,
): Promise<string | null> {
  // Calibre usa un XHTML con <svg><image xlink:href> apuntando a la imagen
  const xhtmlFile = zip.file(href.includes("/") ? href : opfDir + href);
  if (!xhtmlFile) return null;
  const xhtml = String(await xhtmlFile.async("text"));
  const imgMatch =
    xhtml.match(/<image[^>]+(?:xlink:)?href=["']([^"']+\.(jpe?g|png|webp))["']/i) ||
    xhtml.match(/<image[^>]+(?:xlink:)?href=["']([^"']+)["']/i);
  if (!imgMatch) return null;
  const imgHref = imgMatch[1];
  const imgDir = imgHref.includes("/")
    ? imgHref.substring(0, imgHref.lastIndexOf("/") + 1)
    : opfDir;
  const imgFile = zip.file(
    imgHref.includes("/") ? imgHref : opfDir + imgHref,
  );
  if (!imgFile) return null;
  const b64 = String(await imgFile.async("base64"));
  const ext = imgHref.split(".").pop()?.toLowerCase() || "png";
  return `data:${mimeFor(ext)};base64,${b64}`;
}

function mimeFor(ext: string): string {
  return ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
}

function xpProgress(xp: number): { inLevel: number; levelTarget: number } {
  return {
    inLevel: xp % XP_PER_LEVEL,
    levelTarget: XP_PER_LEVEL,
  };
}

/** Racha diaria */
function computeStreak(streak: StreakState, now: string): StreakState {
  if (!streak.lastVisitDate) {
    return { current: 1, lastVisitDate: now };
  }
  const diff = Math.round(
    (new Date(now + "T00:00:00").getTime() -
      new Date(streak.lastVisitDate + "T00:00:00").getTime()) /
      86400000
  );
  if (diff === 0) return { ...streak };
  if (diff === 1) {
    return { current: streak.current + 1, lastVisitDate: now };
  }
  if (diff > 1) {
    return { current: 1, lastVisitDate: now };
  }
  return streak;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface LibraryContextValue {
  role: Role;
  setRole: (r: Role) => void;
  books: Book[];
  readBooks: Book[];
  catalogBooks: Book[];
  allBooks: Book[];
  xp: number;
  level: number;
  xpProgressInfo: { inLevel: number; levelTarget: number };
  streak: number;
  streakJustIncreased: boolean;
  levelUpJustHappened: boolean;
  resetLevelUpFlag: () => void;
  isAuthenticated: boolean;
  addBook: (file: File, category?: BookCategory) => Promise<Book>;
  updateBookCategory: (bookId: string, category: BookCategory) => void;
  updateBookAge: (bookId: string, age: AgeRange) => void;
  updateBookFeatured: (bookId: string, featured: boolean) => void;
  setBookLastPage: (bookId: string, lastPage: number) => void;
  markAsFinished: (bookId: string) => void;
  finishBook: (bookId: string) => void;
  resetProgress: () => void;
  removeBook: (bookId: string) => void;
  cloudAddState: boolean;
  unreadBooksCount: number;
  recommendedBooks: Book[];
  booksByCategory: Record<string, Book[]>;
  filterCategory: string;
  setFilterCategory: (c: string) => void;
  filterAge: string;
  setFilterAge: (a: string) => void;
  // Nuevos
  readingLogs: ReadingLog[];
  achievements: Achievement[];
  addReadingLog: (pages: number, minutes: number) => void;
  checkAchievements: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<PersistedState>(defaultState());
  const [role, setRole] = useState<Role>("lector");
  const [levelUpJustHappened, setLevelUpJustHappened] = useState(false);
  const [streakJustIncreased, setStreakJustIncreased] = useState(false);
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [filterAge, setFilterAge] = useState("Todas");
  const { isAuthenticated, user } = useAuth();

  // ---- Libros en la nube (visibles desde cualquier dispositivo) ----
  const utils = trpc.useUtils();
  const cloudQuery = trpc.books.list.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const syncQuery = trpc.books.sync.useQuery(undefined, {
    enabled: hydrated,
    staleTime: Infinity,
  });

  const updateStatsMutation = trpc.books.updateStats.useMutation();
  const updateProgressMutation = trpc.books.updateProgress.useMutation();

  const addBookMutation = trpc.books.add.useMutation({
    onSuccess: () => void utils.books.list.invalidate(),
    onError: (err) => {
      toast.error(err.message || "No se pudo subir el libro");
    },
  });

  const updateMetadataMutation = trpc.books.updateMetadata.useMutation({
    onSuccess: () => void utils.books.list.invalidate(),
    onError: (err) => {
      toast.error(err.message || "No se pudo guardar la clasificación");
    },
  });

  const updateBookmarkMutation = trpc.books.updateBookmark.useMutation({
    onSuccess: () => void utils.books.list.invalidate(),
    // Silencioso: la marca de página se guarda localmente de todos modos.
  });

  // ---- Libros de la nube (S3 + DB) -> descargar y cache en IndexedDB ----
  const [cloudBooks, setCloudBooks] = useState<Book[]>([]);

  // Sincronizar: los libros de la nube que el usuario subió en este
  // dispositivo ya están en state.books; cargar solo los nuevos.
  useEffect(() => {
    const rows = cloudQuery.data ?? [];
    if (rows.length === 0) {
      setCloudBooks([]);
      return;
    }
    let cancelled = false;
    async function syncCloudBooks() {
      const localIds = new Set(state.books.map((b) => b.id));
      const loaded: Book[] = [];
      for (const row of rows) {
        if (localIds.has(row.id)) continue;
        // Intentar caché local (IndexedDB) primero para no re-descargar
        let dataUrl: string | null = null;
        try {
          const cached = (await idbGet(IDB_FILE_PREFIX + row.id)) as Blob | undefined;
          if (cached) dataUrl = await blobToDataURL(cached);
        } catch { /* sin caché */ }
        // Descargar desde la nube
        if (!dataUrl) {
          try {
            dataUrl = await fetchAsDataURL(row.url);
            void idbSet(IDB_FILE_PREFIX + row.id, dataUrlToBlob(dataUrl));
          } catch {
            continue; // archivo inaccesible
          }
        }
        if (cancelled) return;
        loaded.push({
          id: row.id,
          title: row.title,
          category: (row.category as BookCategory) || "Otros",
          age: (row.age as AgeRange) || ("Universal" as AgeRange),
          fileName: row.fileName,
          fileType: row.fileType,
          dataUrl,
          coverUrl: row.coverUrl,
          featured: row.featured,
          addedAt: row.addedAt,
        });
      }
      if (!cancelled) setCloudBooks(loaded);
    }
    void syncCloudBooks();
    return () => {
      cancelled = true;
    };
  }, [cloudQuery.data, state.books]);

  const removeBookWithPasswordMutation = trpc.books.removeWithPassword.useMutation({
    onSuccess: () => void utils.books.list.invalidate(),
    onError: (err) => toast.error(err.message || "No se pudo eliminar el libro"),
  });

  // ---- Estado personal (XP, racha, leídos) en localStorage/IndexedDB ----


  // Marcar como hidratado después de que el estado se haya cargado
  useEffect(() => {
    let cancelled = false;
    loadState().then((s) => {
      if (!cancelled) {
        setState(s);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Guardar en localStorage + IndexedDB cuando ya estamos hidratados
  useEffect(() => {
    if (!hydrated) return;
    void saveState(state);
    
    // Sincronizar con el servidor si el usuario está autenticado
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        updateStatsMutation.mutate({
          xp: state.xp,
          streak: state.streak.current,
          lastVisit: state.streak.lastVisitDate,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.xp, state.streak, hydrated, isAuthenticated]);

  // Aplicar datos del servidor tras el primer login
  useEffect(() => {
    if (isAuthenticated && syncQuery.data && hydrated) {
      setState(prev => {
        // Solo actualizar si el servidor tiene datos más recientes o diferentes
        const serverXp = syncQuery.data.stats.xp;
        const serverStreak = syncQuery.data.stats.streak;
        const serverProgress = syncQuery.data.progress;

        // Fusionar libros leídos
        const serverReadIds = serverProgress.filter(p => p.isFinished).map(p => p.bookId);
        const combinedReadIds = Array.from(new Set([...prev.readBookIds, ...serverReadIds]));
        
        // Actualizar páginas leídas de libros locales
        const newBooks = prev.books.map(b => {
          const p = serverProgress.find(pr => pr.bookId === b.id);
          if (p && (p.lastPage || 0) > (b.lastPage || 0)) {
            return { ...b, lastPage: p.lastPage || 0 };
          }
          return b;
        });

        if (serverXp > prev.xp || serverStreak > prev.streak.current || combinedReadIds.length > prev.readBookIds.length) {
          return {
            ...prev,
            xp: Math.max(prev.xp, serverXp),
            streak: {
              current: Math.max(prev.streak.current, serverStreak),
              lastVisitDate: syncQuery.data.stats.lastVisit || prev.streak.lastVisitDate,
            },
            readBookIds: combinedReadIds,
            books: newBooks
          };
        }
        return { ...prev, books: newBooks };
      });
    }
  }, [isAuthenticated, syncQuery.data, hydrated]);

  // Chequeo automático de logros y misiones
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      const today = todayStr();
      const todayLog = state.readingLogs.find(l => l.date === today);
      
      setState(prev => {
        let xpGain = 0;
        const newAch = [...prev.achievements];
        const addAch = (id: string, title: string, desc: string, icon: string) => {
          if (!newAch.find(a => a.id === id)) {
            newAch.push({ id, title, description: desc, icon, unlockedAt: Date.now() });
            toast.success(`¡Logro desbloqueado: ${title}!`);
          }
        };

        // Misiones Diarias (solo una vez por día)
        const missionKey = `mission-${today}`;
        if (!newAch.find(a => a.id === `${missionKey}-pages`) && (todayLog?.pages || 0) >= 5) {
          xpGain += 20;
          addAch(`${missionKey}-pages`, "Lector del Día", "Misión diaria completada.", "✅");
        }
        if (!newAch.find(a => a.id === `${missionKey}-time`) && (todayLog?.timeMinutes || 0) >= 10) {
          xpGain += 30;
          addAch(`${missionKey}-time`, "Maratón de Lectura", "Misión diaria completada.", "⚡");
        }

        // Logros permanentes
        if (prev.readBookIds.length >= 1) addAch("first-book", "Primer Paso", "Has terminado tu primer libro.", "📖");
        if (prev.readBookIds.length >= 5) addAch("reader-5", "Lector Constante", "Has terminado 5 libros.", "📚");
        if (prev.xp >= 500) addAch("xp-500", "Sabio", "Has alcanzado 500 XP.", "🧠");
        if (prev.streak.current >= 3) addAch("streak-3", "Hábito Formado", "Racha de 3 días leyendo.", "🔥");
        
        const totalTime = prev.readingLogs.reduce((acc, l) => acc + l.timeMinutes, 0);
        if (totalTime >= 60) addAch("marathon", "Maratonista", "Has leído 60 minutos en total.", "⚡");
        
        const currentLevel = levelFromXp(prev.xp);
        if (currentLevel >= 20) addAch("library-omega", "Omega", "Has alcanzado el nivel máximo.", "Ω");

        if (xpGain > 0 || newAch.length !== prev.achievements.length) {
          return { ...prev, xp: prev.xp + xpGain, achievements: newAch };
        }
        return prev;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [state.readBookIds.length, state.xp, state.streak.current, state.readingLogs, hydrated]);

  // Solo actualizar la racha después de la hidratación
  useEffect(() => {
    if (!hydrated) return;
    const now = todayStr();
    setState((prev) => {
      const newStreak = computeStreak(prev.streak, now);
      if (newStreak.current !== prev.streak.current) {
        setStreakJustIncreased(true);
        window.setTimeout(() => setStreakJustIncreased(false), 4000);
      }
      return { ...prev, streak: newStreak };
    });
  }, [hydrated]);

  /** Libros que vienen de la carpeta libros/ del servidor (modo servidor).
   *  Los libros que aún no están en localStorage se convierten a libros
   *  persistidos automáticamente para que queden guardados en el sitio. */
  const [folderBooks, setFolderBooks] = useState<Book[]>([]);

  useEffect(() => {
    // Cargar libros de la carpeta libros/ del servidor (modo servidor).
    // En modo doble clic (file://) el endpoint no existe y esto no hace nada.
    let cancelled = false;
    async function loadFolderBooks() {
      try {
        const res = await fetch("/api/libros", { cache: "no-store" });
        if (!res.ok) return;
        const files: { name: string; url: string }[] = await res.json();
        if (!Array.isArray(files) || files.length === 0) return;
        // Solo cargar archivos que aún no estén en localStorage
        const existingNames = new Set(state.books.map((b) => b.fileName));
        const loaded: Book[] = [];
        for (const f of files) {
          if (existingNames.has(f.name)) continue;
          if (cancelled) return;
          try {
            const lower = f.name.toLowerCase();
            const fileType = lower.endsWith(".epub") ? "epub" : "pdf";
            const title = f.name.replace(/\.(pdf|epub)$/i, "").trim();
            const dataUrl = await fetchAsDataURL(f.url);
            let coverUrl: string | null = null;
            if (fileType === "epub") {
              coverUrl = await extractEpubCover(dataUrl);
            }
            const book: Book = {
              id: FOLDER_BOOK_PREFIX + hash(f.name),
              title,
              fileName: f.name,
              fileType,
              dataUrl,
              coverUrl,
              addedAt: Date.now(),
              fromFolder: true,
              folderUrl: f.url,
              ...classifyBook(title),
            };
            loaded.push(book);
          } catch {
            /* archivo inaccesible: ignorar */
          }
        }
        if (loaded.length > 0 && !cancelled) {
          setFolderBooks(loaded);
          // Convertir los libros de carpeta en libros persistidos en localStorage
          // para que queden guardados en el sitio (permanentes).
          const alreadyPersisted = new Set(state.books.map((b) => b.id));
          const toPersist = loaded.filter((b) => !alreadyPersisted.has(b.id));
          if (toPersist.length > 0) {
            setState((prev) => ({
              ...prev,
              books: [...toPersist, ...prev.books],
            }));
          }
        }
      } catch {
        /* sin servidor: modo doble clic, nada que hacer */
      }
    }
    loadFolderBooks();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Catálogo: ahora los libros terminados NO se borran, permanecen visibles
   *  (con badge "Leído") tanto en el catálogo como en la lista de leídos. */
  const catalogBooks = useMemo(() => {
    const combined = [...cloudBooks, ...folderBooks, ...state.books];
    const unique = new Map<string, Book>();
    combined.forEach(b => {
      // Si el libro ya existe, preferir la versión que tenga dataUrl o lastPage
      const existing = unique.get(b.id);
      if (!existing || (!existing.dataUrl && b.dataUrl) || (b.lastPage || 0) > (existing.lastPage || 0)) {
        unique.set(b.id, b);
      }
    });
    return Array.from(unique.values());
  }, [state.books, folderBooks, cloudBooks]);

  const allBooks = useMemo(() => catalogBooks, [catalogBooks]);
  const readBooks = useMemo(
    () =>
      allBooks
        .filter((b) => state.readBookIds.includes(b.id))
        .sort((a, b) => (b.readAt ?? 0) - (a.readAt ?? 0)),
    [allBooks, state.readBookIds]
  );

  const xp = useMemo(() => state.xp, [state.xp]);
  const level = useMemo(() => levelFromXp(xp), [xp]);
  const xpProgressInfo = useMemo(() => level >= MAX_LEVEL ? { inLevel: XP_PER_LEVEL, levelTarget: XP_PER_LEVEL } : xpProgress(xp), [level, xp]);

  const recommendedBooks = useMemo(() => {
    const pool = allBooks;
    if (pool.length === 0) return [];
    const featured = pool.filter((book) => book.featured);
    if (featured.length > 0) return featured.slice(0, 8);
    if (pool.length <= 3) return pool;
    const seed = new Date().toISOString().slice(0, 10);
    const idx = Array.from({ length: pool.length }, (_, i) => i)
      .map((i) => ({ i, h: hash(`${seed}-${i}-${pool.length}`) }))
      .sort((a, b) => a.h - b.h)
      .slice(0, 3)
      .map((x) => x.i);
    return idx.map((i) => pool[i]);
  }, [allBooks]);

  const booksByCategory = useMemo(() => {
    const grouped: Record<string, Book[]> = {};
    BOOK_CATEGORIES.forEach((cat) => {
      // En los filtros de categoría también incluir los leídos
      grouped[cat] = allBooks.filter((b) => b.category === cat);
    });
    return grouped;
  }, [allBooks]);

  /** Sube un libro a la nube (S3 + base de datos) para que todos los
   *  dispositivos lo vean. La contraseña de admin se envía al backend. */
  const addBook = useCallback(
    async (file: File, category?: BookCategory): Promise<Book> => {
      const lower = file.name.toLowerCase();
      const fileType = lower.endsWith(".epub") ? "epub" : "pdf";
      const dataUrl = await readFileAsDataURL(file);
      // Intentar extraer portada del EPUB
      let coverUrl: string | null = null;
      if (fileType === "epub") {
        try {
          coverUrl = await extractEpubCover(dataUrl);
        } catch {
          // La portada es opcional: un EPUB válido debe importarse aunque su imagen falle.
          coverUrl = null;
        }
      }
      const title = file.name.replace(/\.(pdf|epub)$/i, "").trim();
      // Si el admin no indicó categoría, se clasifica automáticamente por el título.
      const auto = category ? undefined : classifyBook(title);
      const book: Book = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        category: category ?? (auto?.category ?? "Otros"),
        age: auto?.age ?? "Universal",
        fileName: file.name,
        fileType,
        dataUrl,
        coverUrl,
        addedAt: Date.now(),
      };
      // Esperar la confirmación remota para no perder libros ni mostrar falsos éxitos.
      const remote = await addBookMutation.mutateAsync({
        password: ADMIN_PASSWORD,
        fileName: file.name,
        category: category ?? (auto?.category ?? "Otros"),
        age: auto?.age ?? "Universal",
        dataBase64: dataUrl.split(",")[1] ?? "",
        mimeType: fileType === "epub" ? "application/epub+zip" : "application/pdf",
        coverBase64: coverUrl?.split(",")[1],
      });
      const completeBook = { ...book, id: remote.id };
      setState((prev) => ({
        ...prev,
        books: [completeBook, ...prev.books.filter((existing) => existing.id !== completeBook.id)],
      }));
      return completeBook;
    },
    [addBookMutation]
  );

    const updateBookCategory = useCallback(
    (bookId: string, category: BookCategory) => {
      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) => (b.id === bookId ? { ...b, category } : b)),
      }));
      // Persistir en la nube para que el cambio se vea en todos los dispositivos.
      // Los libros de nube tienen id de servidor (formato ts-xxxx).
      if (/^\d+-[a-z0-9]+$/.test(bookId)) {
        updateMetadataMutation.mutate({ id: bookId, category });
      }
    },
    [updateMetadataMutation]
  );
  const updateBookAge = useCallback(
    (bookId: string, age: AgeRange) => {
      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) => (b.id === bookId ? { ...b, age } : b)),
      }));
      // Persistir en la nube para que el cambio se vea en todos los dispositivos.
      if (/^\d+-[a-z0-9]+$/.test(bookId)) {
        updateMetadataMutation.mutate({ id: bookId, age });
      }
    },
    [updateMetadataMutation]
  );

  const updateBookFeatured = useCallback(
    (bookId: string, featured: boolean) => {
      setCloudBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, featured } : b)));
      setState((prev) => ({
        ...prev,
        books: prev.books.map((b) => (b.id === bookId ? { ...b, featured } : b)),
      }));
      if (/^\d+-[a-z0-9]+$/.test(bookId)) updateMetadataMutation.mutate({ id: bookId, featured });
    },
    [updateMetadataMutation]
  );

  const setBookLastPage = useCallback(
    (bookId: string, lastPage: number) => {
      setState((prev) => {
        const book = prev.books.find(b => b.id === bookId);
        if (book && book.lastPage === lastPage) return prev;
        
        return {
          ...prev,
          books: prev.books.map((b) =>
            b.id === bookId ? { ...b, lastPage } : b,
          ),
        };
      });

      setCloudBooks((prev) => {
        const book = prev.find(b => b.id === bookId);
        if (book && book.lastPage === lastPage) return prev;
        return prev.map((b) => (b.id === bookId ? { ...b, lastPage } : b));
      });

      if (/^\d+-[a-z0-9]+$/.test(bookId)) {
        updateBookmarkMutation.mutate({
          id: bookId,
          lastPage,
        });
      }
    },
    [updateBookmarkMutation]
  );

  const markAsFinished = useCallback(
    (bookId: string) => {
      setState((prev) => {
        if (prev.readBookIds.includes(bookId)) return prev;
        const oldLevel = levelFromXp(prev.xp);
        const newLevel = levelFromXp(prev.xp + XP_PER_BOOK);
        if (newLevel > oldLevel && newLevel <= MAX_LEVEL) {
          setLevelUpJustHappened(true);
          window.setTimeout(() => setLevelUpJustHappened(false), 6000);
        }
        return {
          ...prev,
          xp: prev.xp + XP_PER_BOOK,
          readBookIds: [...prev.readBookIds, bookId],
        };
      });
    },
    []
  );

  const resetLevelUpFlag = useCallback(() => setLevelUpJustHappened(false), []);

  /** Resetea XP, nivel y racha, manteniendo los libros en la biblioteca */
  const resetProgress = useCallback(() => {
    setState((prev) => ({
      ...prev,
      xp: 0,
      streak: { current: 0, lastVisitDate: "" },
    }));
    toast.success("XP, nivel y racha reseteados");
  }, []);

  /** Eliminar un libro: quita de la nube (si es libro de nube) y del estado local */
  const removeBook = useCallback(
    (bookId: string) => {
      setState((prev) => ({
        ...prev,
        books: prev.books.filter((b) => b.id !== bookId),
        readBookIds: prev.readBookIds.filter((id) => id !== bookId),
      }));
      setCloudBooks((prev) => prev.filter((b) => b.id !== bookId));
      setFolderBooks((prev) => prev.filter((b) => b.id !== bookId));
      // Borrar el blob de IndexedDB si existe
      void idbDel(IDB_FILE_PREFIX + bookId);
      // Borrar de la nube: los libros de nube tienen id de servidor (formato ts-xxxx).
      // Administración entra con contraseña Elite, no necesariamente con OAuth.
      if (/^\d+-[a-z0-9]+$/.test(bookId)) {
        removeBookWithPasswordMutation.mutate({ id: bookId, password: ADMIN_PASSWORD });
      }
    },
    [removeBookWithPasswordMutation]
  );

  /** Los libros de carpeta también dan XP al terminarlos (no se guardan en localStorage) */
  const finishBook = useCallback(
    (bookId: string) => {
      if (bookId.startsWith(FOLDER_BOOK_PREFIX)) {
        const book = folderBooks.find((b) => b.id === bookId);
        if (book && !state.readBookIds.includes(bookId)) {
          setState((prev) => {
            const oldLevel = levelFromXp(prev.xp);
            const newLevel = levelFromXp(prev.xp + XP_PER_BOOK);
            if (newLevel > oldLevel && newLevel <= MAX_LEVEL) {
              setLevelUpJustHappened(true);
              window.setTimeout(() => setLevelUpJustHappened(false), 6000);
            }
            return {
              ...prev,
              xp: prev.xp + XP_PER_BOOK,
              readBookIds: [...prev.readBookIds, bookId],
            };
          });
        }
        return;
      }
      markAsFinished(bookId);
    },
    [folderBooks, markAsFinished, state.readBookIds]
  );

  const addReadingLog = useCallback((pages: number, minutes: number) => {
    setState(prev => {
      const today = todayStr();
      const logs = [...(prev.readingLogs || [])];
      const idx = logs.findIndex(l => l.date === today);
      if (idx >= 0) {
        logs[idx] = { ...logs[idx], pages: logs[idx].pages + pages, timeMinutes: logs[idx].timeMinutes + minutes };
      } else {
        logs.push({ date: today, pages, timeMinutes: minutes });
      }
      return { ...prev, readingLogs: logs };
    });
  }, []);

  const checkAchievements = useCallback(() => {
    setState(prev => {
      const newAch: Achievement[] = [...(prev.achievements || [])];
      const add = (id: string, title: string, desc: string, icon: string) => {
        if (!newAch.find(a => a.id === id)) {
          newAch.push({ id, title, description: desc, icon, unlockedAt: Date.now() });
          toast.success(`¡Logro desbloqueado: ${title}!`);
        }
      };

      if (prev.readBookIds.length >= 1) add("first-book", "Primer Paso", "Has terminado tu primer libro.", "📖");
      if (prev.readBookIds.length >= 5) add("reader-5", "Lector Constante", "Has terminado 5 libros.", "📚");
      if (prev.xp >= 500) add("xp-500", "Sabio", "Has alcanzado 500 XP.", "🧠");
      if (prev.streak.current >= 3) add("streak-3", "Hábito Formado", "Racha de 3 días leyendo.", "🔥");

      return { ...prev, achievements: newAch };
    });
  }, []);

  const value = useMemo<LibraryContextValue>(() => ({
    role,
    setRole,
    books: state.books,
    cloudAddState: addBookMutation.isPending,
    readBooks,
    catalogBooks,
    xp,
    level,
    xpProgressInfo,
    streak: state.streak.current,
    streakJustIncreased,
    levelUpJustHappened,
    resetLevelUpFlag,
    isAuthenticated,
    addBook,
    updateBookCategory,
    updateBookAge,
    updateBookFeatured,
    markAsFinished,
    finishBook,
    setBookLastPage,
    unreadBooksCount: allBooks.length - readBooks.length,
    resetProgress,
    removeBook,
    recommendedBooks,
    allBooks,
    booksByCategory,
    filterCategory,
    setFilterCategory,
    filterAge,
    setFilterAge,
    readingLogs: state.readingLogs,
    achievements: state.achievements,
    addReadingLog,
    checkAchievements,
  }), [
    role, state.books, state.streak.current, state.readingLogs, state.achievements,
    addBookMutation.isPending, readBooks, catalogBooks, xp, level, xpProgressInfo,
    streakJustIncreased, levelUpJustHappened, resetLevelUpFlag, isAuthenticated, addBook,
    updateBookCategory, updateBookAge, updateBookFeatured, markAsFinished, finishBook, setBookLastPage,
    allBooks, resetProgress, removeBook, recommendedBooks, booksByCategory,
    filterCategory, filterAge, addReadingLog, checkAchievements
  ]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
