/**
 * LIBRARY OMEGA — Visor de lectura Elite.
 * PDF: páginas independientes renderizadas con pdf.js y fallback nativo. EPUB: paginado real.
 * Diseño simplificado para móviles con scroll vertical y botones grandes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Book } from "@/lib/libraryStore";
import { useLibrary } from "@/lib/libraryStore";
import { X, ChevronLeft, ChevronRight, Settings, Play, Pause, Plus, Trash2, Maximize2, Minimize2, BookOpen, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import BrandMark from "@/components/BrandMark";

const PARSED_BOOKS_CACHE = new Map<string, any>();
if (typeof window !== 'undefined') {
  (window as any).PARSED_BOOKS_CACHE = PARSED_BOOKS_CACHE;
}

interface EpubChapter {
  href: string;
  title: string;
  html: string;
}

interface NodeChunk {
  kind: "text" | "img";
  value: string;
  block?: string | null;
  altText?: string;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Archivo sin datos válidos");
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function normalizeZipPath(path: string): string {
  const normalized: string[] = [];
  for (const part of path.replaceAll("\\\\", "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return normalized.join("/");
}

function resolveZipPath(baseDir: string, href: string): string {
  const clean = decodeURIComponent((href || "").split("#")[0].split("?")[0]);
  const hasScheme = clean.includes(":");
  if (hasScheme || clean.startsWith("//")) return clean;
  return normalizeZipPath(clean.startsWith("/") ? clean : `${baseDir}${clean}`);
}

function imageMimeType(path: string, declared: string): string | null {
  const normalizedDeclared = (declared || "").split(";", 1)[0].trim().toLowerCase();
  if (normalizedDeclared.startsWith("image/")) return normalizedDeclared;
  const extension = path.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
  };
  return extension ? byExtension[extension] || null : null;
}

type ZipAsset = { async: (type: "base64") => Promise<string> };

type ZipArchive = {
  file: (path: string) => ZipAsset | null;
  files?: Record<string, { dir?: boolean }>;
};

function findZipAsset(zip: ZipArchive, path: string): { path: string; file: ZipAsset } | null {
  const normalizedPath = normalizeZipPath(path);
  const exact = zip.file(normalizedPath);
  if (exact) return { path: normalizedPath, file: exact };
  const files = zip.files || {};
  const lowerPath = normalizedPath.toLowerCase();
  const match = Object.keys(files).find((entry) => !files[entry]?.dir && normalizeZipPath(entry).toLowerCase() === lowerPath);
  if (!match) return null;
  const file = zip.file(match);
  return file ? { path: match, file } : null;
}

function isExternalAsset(source: string): boolean {
  return source.startsWith("data:") || source.startsWith("http:") || source.startsWith("https:") || source.startsWith("blob:") || source.startsWith("//") || source.startsWith("mailto:");
}

function firstSrcSetCandidate(srcSet: string): string {
  return srcSet.split(",")[0]?.trim().split(/\s+/)[0] || "";
}

async function inlineEpubImages(
  body: HTMLElement,
  chapterPath: string,
  opfDir: string,
  zip: ZipArchive,
  manifest: Map<string, { href: string; mediaType: string }>,
): Promise<void> {
  const resolveAsset = async (source: string, declaredMime = "") => {
    if (!source || isExternalAsset(source)) return null;
    const imagePath = resolveZipPath(chapterPath, source);
    const asset = findZipAsset(zip, imagePath);
    if (!asset) return null;
    const manifestItem = Array.from(manifest.values()).find((item) => {
      const manifestPath = resolveZipPath(opfDir, item.href);
      return manifestPath.toLowerCase() === imagePath.toLowerCase();
    });
    const mime = imageMimeType(asset.path, declaredMime || manifestItem?.mediaType || "");
    if (!mime) return null;
    const base64 = await asset.file.async("base64");
    return `data:${mime};base64,${base64}`;
  };

  body.querySelectorAll("picture").forEach((picture) => {
    const image = picture.querySelector("img");
    if (!image) return;
    const source = picture.querySelector("source[srcset], source[data-srcset]");
    const candidate = firstSrcSetCandidate(source?.getAttribute("srcset") || source?.getAttribute("data-srcset") || "");
    if (candidate) image.setAttribute("data-picture-src", candidate);
    picture.querySelectorAll("source").forEach((sourceElement) => sourceElement.remove());
  });

  const imageElements = Array.from(body.querySelectorAll("img, image, object"));
  for (const element of imageElements) {
    const tag = element.tagName.toLowerCase();
    const candidates = tag === "image"
      ? [element.getAttribute("href") || element.getAttribute("xlink:href") || ""]
      : tag === "object"
        ? [element.getAttribute("data") || ""]
        : [element.getAttribute("data-picture-src") || "", element.getAttribute("data-src") || "", element.getAttribute("data-original") || "", firstSrcSetCandidate(element.getAttribute("srcset") || ""), element.getAttribute("src") || ""];
    let dataUrl: string | null = null;
    for (const source of candidates) {
      if (!source || isExternalAsset(source)) continue;
      dataUrl = await resolveAsset(source, element.getAttribute("type") || "");
      if (dataUrl) break;
    }
    if (!dataUrl) continue;
    if (tag === "object") {
      const replacement = body.ownerDocument.createElement("img");
      replacement.setAttribute("src", dataUrl);
      replacement.setAttribute("alt", element.getAttribute("aria-label") || element.getAttribute("title") || "Ilustración");
      element.replaceWith(replacement);
    } else if (tag === "image") {
      element.setAttribute("href", dataUrl);
      element.setAttribute("xlink:href", dataUrl);
    } else {
      element.setAttribute("src", dataUrl);
      element.removeAttribute("srcset");
      element.removeAttribute("sizes");
      element.removeAttribute("data-src");
      element.removeAttribute("data-original");
      element.removeAttribute("data-picture-src");
      element.setAttribute("loading", "eager");
    }
  }

  for (const element of Array.from(body.querySelectorAll<HTMLElement>("[style]"))) {
    const match = element.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/i);
    if (!match) continue;
    const dataUrl = await resolveAsset(match[1]);
    if (!dataUrl) continue;
    const image = body.ownerDocument.createElement("img");
    image.setAttribute("src", dataUrl);
    image.setAttribute("alt", element.getAttribute("aria-label") || "Ilustración");
    image.setAttribute("class", "epub-background-image");
    element.insertBefore(image, element.firstChild);
  }

  for (const svg of Array.from(body.querySelectorAll("svg"))) {
    const markup = new XMLSerializer().serializeToString(svg);
    const image = body.ownerDocument.createElement("img");
    image.setAttribute("src", `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
    image.setAttribute("alt", svg.getAttribute("aria-label") || "Ilustración SVG");
    svg.replaceWith(image);
  }
}

async function parseEpub(dataUrl: string): Promise<{
  title: string;
  chapters: EpubChapter[];
  coverUrl: string | null;
}> {
  const JSZip = (await import("jszip")).default;
  const bytes = dataUrlToBytes(dataUrl);
  const zip = await JSZip.loadAsync(bytes.buffer as ArrayBuffer);
  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) throw new Error("EPUB sin container.xml válido");
  const containerXml = await containerFile.async("text");
  const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml");
  const rootfile = containerDoc.querySelector("rootfile");
  if (!rootfile) throw new Error("EPUB sin container.xml válido");
  const opfPath = rootfile.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB sin archivo OPF válido");
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
  const opfFile = zip.file(resolveZipPath("", opfPath));
  if (!opfFile) throw new Error("EPUB sin archivo OPF válido");
  const opfXml = await opfFile.async("text");
  const opfDoc = new DOMParser().parseFromString(opfXml, "application/xml");

  const manifest = new Map<string, { href: string; mediaType: string }>();
  opfDoc.querySelectorAll("manifest item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) return;
    manifest.set(id, { href, mediaType: item.getAttribute("media-type") || "" });
  });

  const spineIds: string[] = [];
  opfDoc.querySelectorAll("spine itemref").forEach((ref) => {
    const idref = ref.getAttribute("idref");
    if (idref) spineIds.push(idref);
  });

  const titleEl = opfDoc.querySelector("metadata title") || opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "title")[0];
  const title = titleEl?.textContent?.trim() || "";

  const chapters: EpubChapter[] = [];
  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item) continue;
    const isHtml = item.mediaType.includes("html") || /\\.(?:xhtml|html?)$/i.test(item.href.split("#")[0]);
    if (!isHtml) continue;
    const chapterPath = resolveZipPath(opfDir, item.href);
    const file = zip.file(chapterPath);
    if (!file) continue;
    const html = await file.async("text");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const body = doc.body;
    if (!body) continue;
    body.querySelectorAll("script").forEach((s) => s.remove());
    body.querySelectorAll('[role="doc-pagebreak"], [epub\\:type~="pagebreak"], .page-number, .pagenum, #page-number').forEach((node) => node.remove());
    body.querySelectorAll("header, footer").forEach((node) => {
      if (/^\d{1,4}$/.test(node.textContent?.trim() || "")) node.remove();
    });
    await inlineEpubImages(body, chapterPath.substring(0, chapterPath.lastIndexOf("/") + 1), opfDir, zip, manifest);
    const chapterTitle = (body.querySelector("h1, h2, h3") || doc.querySelector("title"))?.textContent?.trim() || `Capítulo ${chapters.length + 1}`;
    if (!body.querySelector("h1, h2, h3") && body.textContent?.trim()) {
      const heading = doc.createElement("h2");
      heading.textContent = chapterTitle;
      body.insertBefore(heading, body.firstChild);
    }
    chapters.push({
      href: item.href,
      title: chapterTitle,
      html: body.innerHTML,
    });
  }
  return { title, chapters, coverUrl: null };
}

function flattenBody(html: string): NodeChunk[] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const chunks: NodeChunk[] = [];
  const walk = (root: Element) => {
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = cleanReaderText(node.textContent || "");
        if (t.trim()) chunks.push({ kind: "text", value: t });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (tag === "img") {
          const src = el.getAttribute("src");
          if (src) chunks.push({ kind: "img", value: src, altText: el.getAttribute("alt") || undefined });
        } else if (tag === "br") {
          chunks.push({ kind: "text", value: "\n", block: "br" });
        } else if (["h1", "h2", "h3"].includes(tag)) {
          chunks.push({ kind: "text", value: cleanReaderText(el.textContent || ""), block: tag });
        } else if (["p", "li", "td", "blockquote"].includes(tag)) {
          const text = cleanReaderText(el.textContent || "");
          if (text) chunks.push({ kind: "text", value: text, block: tag });
        } else {
          walk(el as Element);
        }
      }
    }
  };
  walk(doc.firstElementChild || doc.body);
  return chunks;
}

function cleanReaderText(value: string): string {
  return value
    .replace(/\u00ad/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/([A-Za-zÀ-ÖØ-öø-ÿ])-\n([A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const MEASURER_STYLE = "position:absolute;left:-9999px;top:0;font-family:Georgia,serif;font-size:1.05rem;line-height:1.8;max-width:42em;padding:0;visibility:hidden;white-space:pre-wrap;";
let _measurer: HTMLDivElement | null = null;

function measureTextHeight(text: string, style?: string): number {
  if (!_measurer) {
    _measurer = document.createElement("div");
    _measurer.style.cssText = MEASURER_STYLE;
    document.body.appendChild(_measurer);
  }
  if (style) _measurer.style.cssText = MEASURER_STYLE + style;
  _measurer.textContent = text;
  return _measurer.offsetHeight;
}

function paginate(chunks: NodeChunk[], pageHeight: number, contentWidth: number, fontSize: number, lineHeight: number, fontFamily: string): { pageCount: number; chunkPageIdx: number[] } {
  const chunkPageIdx: number[] = [];
  let page = 0;
  let used = 0;
  const style = `font-size:${fontSize}rem;line-height:${lineHeight};font-family:${fontFamily};width:${contentWidth}px;`;

  for (let ci = 0; ci < chunks.length; ci++) {
    const ch = chunks[ci];
    let h = ch.kind === "img" ? (ch.block === "pdf-page" ? pageHeight : Math.min(pageHeight - 32, 250)) : measureTextHeight(ch.value, style);
    if (ch.kind === "text" && ch.block === "br") h = Math.ceil(fontSize * 8);
    if (ch.kind === "text" && ["p", "li", "td", "div", "tr", "blockquote", "figure"].includes(ch.block || "")) h = Math.ceil(fontSize * 12);
    if (ch.block === "h1" || ch.block === "h2" || ch.block === "h3") h += Math.ceil(fontSize * 12);
    if (used + h > pageHeight && used > 0) {
      page++;
      used = 0;
    }
    used += h;
    chunkPageIdx.push(page);
  }
  return { pageCount: page + 1, chunkPageIdx };
}

async function loadPdf(dataUrl: string): Promise<{ document: any; pageCount: number }> {
  const pdfModule = await import("pdfjs-dist");
  const { getDocument, GlobalWorkerOptions } = pdfModule;
  GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  const bytes = dataUrlToBytes(dataUrl);
  const document = await getDocument({ data: bytes.buffer as ArrayBuffer }).promise;
  return { document, pageCount: document.numPages };
}

async function renderPdfPage(pdfDocument: any, pageNumber: number, scale: number): Promise<NodeChunk> {
  const pdfPage = await pdfDocument.getPage(pageNumber);
  const textContent = await pdfPage.getTextContent();
  const altText = textContent.items
    .map((item: any) => typeof item.str === "string" ? item.str.trim() : "")
    .filter(Boolean)
    .join(" ");
  const viewport = pdfPage.getViewport({ scale });
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("No se pudo preparar el lienzo del PDF");
  await pdfPage.render({ canvas: null, canvasContext: context, viewport }).promise;
  return {
    kind: "img",
    value: canvas.toDataURL("image/png"),
    block: "pdf-page",
    altText,
  };
}

export default function ReaderModal({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const { setBookLastPage, addReadingLog, isAuthenticated } = useLibrary();
  const updateProgressMutation = trpc.books.updateProgress.useMutation();
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [page, setPage] = useState(0);
  const [startTime] = useState(Date.now());
  const [pagesReadInSession, setPagesReadInSession] = useState(new Set<number>());
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPageImage, setPdfPageImage] = useState<NodeChunk | null>(null);
  const [pdfPageLoading, setPdfPageLoading] = useState(false);
  const [pdfNativeFallback, setPdfNativeFallback] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pageHeight, setPageHeight] = useState(Math.max(240, window.innerHeight - 170));
  const [contentWidth, setContentWidth] = useState(Math.max(260, window.innerWidth - 48));
  const contentRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<"white" | "dark" | "sepia">("white");
  const [fontSize, setFontSize] = useState(1.1);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");
  const [showSettings, setShowSettings] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [dictionaryWord, setDictionaryWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<string | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'LOOKUP_WORD') {
        lookupWord(e.data.word);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const s = localStorage.getItem("omega-reader-settings");
    if (s) {
      const p = JSON.parse(s);
      setTheme(p.theme || "white");
      setFontSize(p.fontSize || 1.1);
      setLineHeight(p.lineHeight || 1.8);
      setFontFamily(p.fontFamily || "'Inter', sans-serif");
    }
    const n = localStorage.getItem("omega-reader-notes");
    if (n) setNotes(JSON.parse(n));
    
    const handleResize = () => {
      setPageHeight(Math.max(240, window.innerHeight - 170));
      setContentWidth(Math.max(260, window.innerWidth - (window.innerWidth < 640 ? 32 : 96)));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("omega-reader-settings", JSON.stringify({ theme, fontSize, lineHeight, fontFamily }));
  }, [theme, fontSize, lineHeight, fontFamily]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setIsReady(false);
    setPdfDocument(null);
    setPdfPageImage(null);
    setPdfPageCount(0);
    setPdfPageLoading(false);
    setPdfNativeFallback(false);
    setPdfZoom(100);
    setPage(0);
    setChapters([]);

    if (!book) {
      setLoading(false);
      return;
    }

    const cached = PARSED_BOOKS_CACHE.get(book.id);
    const load = async () => {
      try {
        if (book.fileType === "epub") {
          const cachedChapters = Array.isArray(cached) ? cached : null;
          const nextChapters = cachedChapters || (await parseEpub(book.dataUrl)).chapters;
          if (cancelled) return;
          PARSED_BOOKS_CACHE.set(book.id, nextChapters);
          setChapters(nextChapters);
        } else {
          const cachedPdf = cached && !Array.isArray(cached) && cached.document && cached.pageCount ? cached : null;
          const loadedPdf = cachedPdf || await loadPdf(book.dataUrl);
          if (cancelled) return;
          PARSED_BOOKS_CACHE.set(book.id, loadedPdf);
          setPdfDocument(loadedPdf.document);
          setPdfPageCount(loadedPdf.pageCount);
          setPage(Math.min(book.lastPage || 0, Math.max(0, loadedPdf.pageCount - 1)));
        }
        if (!cancelled) {
          setIsReady(true);
          if (book.fileType !== "pdf") setPage(book.lastPage || 0);
        }
      } catch {
        if (!cancelled) {
          if (book.fileType === "pdf") {
            // Si pdf.js no puede interpretar o rasterizar el archivo, se activa el visor nativo.
            // Así se distingue una limitación del PDF/compatibilidad de una página que sí fue renderizada.
            setPdfNativeFallback(true);
            setIsReady(true);
            setPage(0);
          } else {
            setLoadError(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [book]);

  const pdfScale = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return Math.min(2, Math.max(1, (window.devicePixelRatio || 1) * (pdfZoom / 100)));
  }, [pdfZoom]);

  useEffect(() => {
    if (book?.fileType !== "pdf" || !pdfDocument || !isReady || pdfPageCount === 0) return;
    let cancelled = false;
    setPdfPageLoading(true);
    setPdfNativeFallback(false);
    renderPdfPage(pdfDocument, Math.min(page + 1, pdfPageCount), pdfScale)
      .then((image) => {
        if (cancelled) return;
        setPdfPageImage(image);
        setPdfPageLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // El fallback nativo se reserva para errores de pdf.js; el render normal espera
        // a que termine la promesa completa para no capturar páginas sin imágenes.
        setPdfPageLoading(false);
        setPdfNativeFallback(true);
      });
    return () => { cancelled = true; };
  }, [book?.fileType, pdfDocument, isReady, pdfPageCount, page, pdfScale]);

  const allChunks = useMemo((): NodeChunk[] => {
    if (!isReady) return [];
    if (book?.fileType === "pdf") return pdfPageImage ? [pdfPageImage] : [];
    return chapters.flatMap(ch => flattenBody(ch.html));
  }, [isReady, chapters, book?.fileType, pdfPageImage]);

  const paginated = useMemo(() => paginate(allChunks, pageHeight, contentWidth, fontSize, lineHeight, fontFamily), [allChunks, pageHeight, contentWidth, fontSize, lineHeight, fontFamily]);
  const readerPageCount = book?.fileType === "pdf" ? pdfPageCount : paginated.pageCount;
  const currentPageChunks = useMemo(() => {
    if (book?.fileType === "pdf") return pdfPageImage ? [pdfPageImage] : [];
    return allChunks.filter((_, index) => paginated.chunkPageIdx[index] === page);
  }, [book?.fileType, pdfPageImage, allChunks, paginated.chunkPageIdx, page]);
  const nextPageChunks = useMemo(() => {
    if (book?.fileType !== "epub") return [];
    return allChunks.filter((_, index) => paginated.chunkPageIdx[index] === page + 1);
  }, [book?.fileType, allChunks, paginated.chunkPageIdx, page]);
  
  useEffect(() => {
    if (book && isReady) {
      const timer = setTimeout(() => {
        setBookLastPage(book.id, page);
        if (isAuthenticated) updateProgressMutation.mutate({ bookId: book.id, lastPage: page });
        setPagesReadInSession(prev => new Set(prev).add(page));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [page, book?.id, isReady, setBookLastPage, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (isReady && pagesReadInSession.size > 0) {
        const durationMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));
        addReadingLog(pagesReadInSession.size, durationMinutes);
      }
      if (isReading) window.speechSynthesis.cancel();
    };
  }, [isReady, pagesReadInSession.size, startTime, addReadingLog, isReading]);

  const addNote = () => {
    if (!book || !newNote.trim()) return;
    const updated = { ...notes, [book.id]: [...(notes[book.id] || []), newNote.trim()] };
    setNotes(updated);
    localStorage.setItem("omega-reader-notes", JSON.stringify(updated));
    setNewNote("");
    toast.success("Nota guardada");
  };

  const deleteNote = (idx: number) => {
    if (!book) return;
    const updated = { ...notes, [book.id]: notes[book.id].filter((_, i) => i !== idx) };
    setNotes(updated);
    localStorage.setItem("omega-reader-notes", JSON.stringify(updated));
  };

  const toggleTTS = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }
    const fullText = currentPageChunks.map(c => c.kind === "text" ? c.value : (c.altText || "")).join(" ");
    if (!fullText.trim()) return;
    const u = new SpeechSynthesisUtterance(fullText);
    u.lang = "es-ES";
    u.onend = () => setIsReading(false);
    u.onerror = () => setIsReading(false);
    window.speechSynthesis.speak(u);
    setIsReading(true);
  };

  const lookupWord = async (word: string) => {
    const cleanWord = word.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    if (!cleanWord || cleanWord.length < 2) return;
    
    setDictionaryWord(cleanWord);
    setLoadingDef(true);
    setShowNotes(false);
    setShowSettings(false);
    
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
      if (!res.ok) {
        // Fallback simple si no hay definición
        setDefinition("No se encontró una definición exacta, pero sigue explorando el conocimiento.");
      } else {
        const data = await res.json();
        const def = data[0]?.meanings[0]?.definitions[0]?.definition;
        setDefinition(def || "Definición no disponible.");
      }
    } catch {
      setDefinition("Error al conectar con el diccionario.");
    } finally {
      setLoadingDef(false);
    }
  };

  const colors = useMemo(() => ({ 
    white: { bg: "#ffffff", text: "#121212", border: "rgba(0,0,0,0.1)" }, 
    dark: { bg: "#0a0a0a", text: "#e0e0e0", border: "rgba(255,255,255,0.1)" }, 
    sepia: { bg: "#f4ecd8", text: "#5b4636", border: "rgba(91,70,54,0.1)" } 
  })[theme], [theme]);

  const sideMargins = useMemo(() => {
    if (typeof window === 'undefined') return 2;
    return window.innerWidth < 640 ? 1 : 4;
  }, []);

  const renderPageHtml = useCallback((chunks: NodeChunk[]) => chunks.map(c => {
    if (c.kind === "img") return `<img src="${escapeHtml(c.value)}" alt="${escapeHtml(c.altText || "Página del documento PDF")}" class="${c.block === "pdf-page" ? "pdf-page-image" : "epub-image"}" />`;
    if (c.block === "br") return "<div class=\"reader-break\"></div>";
    const tag = c.block === "h1" || c.block === "h2" || c.block === "h3" ? c.block : "p";
    return `<${tag}>${escapeHtml(c.value).replace(/\n/g, '<br/>')}</${tag}>`;
  }).join(""), []);

  const pageHtml = useMemo(() => renderPageHtml(currentPageChunks), [renderPageHtml, currentPageChunks]);
  const nextPageHtml = useMemo(() => renderPageHtml(nextPageChunks), [renderPageHtml, nextPageChunks]);

  const makeSrcDoc = useCallback((html: string) => `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      body {
        background:${colors.bg}; color:${colors.text}; font-family:${fontFamily}; font-size:${fontSize}rem; line-height:${lineHeight}; 
        padding: 2rem ${sideMargins}rem 3rem; margin:0; overflow:hidden; overflow-wrap:anywhere; text-align:left; word-wrap:break-word; box-sizing:border-box; height:100vh;
        pointer-events: auto;
      }
      img { max-width:100%; height:auto; display:block; margin:1.25rem auto; border-radius:0.5rem; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
      .epub-image { width:auto; }
      .pdf-page-image { width:min(100%, 48rem); object-fit:contain; background:${colors.bg}; }
      p { margin:0 0 0.72rem; break-inside:avoid; text-indent:0; }
      h1,h2,h3 { margin:0 0 1rem; line-height:1.2; break-after:avoid; }
      .reader-break { height:0.35rem; }
      ::selection { background: var(--primary); color: white; }
      body::-webkit-scrollbar { width: 4px; }
      body::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 10px; }
    </style>
    <script>
      document.addEventListener('mouseup', () => {
        const selection = window.getSelection().toString();
        if (selection && selection.length > 2) {
          window.parent.postMessage({ type: 'LOOKUP_WORD', word: selection }, '*');
        }
      });
      document.addEventListener('touchend', () => {
        const selection = window.getSelection().toString();
        if (selection && selection.length > 2) {
          window.parent.postMessage({ type: 'LOOKUP_WORD', word: selection }, '*');
        }
      });
    </script>
    </head><body>${html}</body></html>`, [colors, fontFamily, fontSize, lineHeight, sideMargins]);

  const srcDoc = useMemo(() => makeSrcDoc(pageHtml), [makeSrcDoc, pageHtml]);
  const nextSrcDoc = useMemo(() => makeSrcDoc(nextPageHtml), [makeSrcDoc, nextPageHtml]);

  if (!book) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col transition-colors duration-500" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Header Elite */}
      {!isFocusMode && (
        <header className="flex min-h-16 items-center justify-between gap-2 border-b border-border/10 px-3 sm:px-6 py-2 backdrop-blur-md bg-transparent">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <BrandMark size="sm" label="Library Omega, gatito con símbolo Omega" />
            <div className="hidden sm:block leading-tight">
              <h2 className="line-clamp-1 max-w-md font-display text-base tracking-tight">{book.title}</h2>
              <p className="opacity-40 text-[9px] font-black uppercase tracking-widest">{book.fileType}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button onClick={toggleTTS} aria-label="Leer en voz alta" className={`hidden sm:flex p-3 rounded-2xl transition-all active:scale-90 ${isReading ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-secondary"}`}>
              {isReading ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={() => setShowNotes(!showNotes)} aria-label="Abrir notas" className="hidden sm:flex p-3 rounded-2xl hover:bg-secondary transition-all active:scale-90 relative">
              <MessageSquare className="h-5 w-5" />
              {notes[book.id]?.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />}
            </button>
            <button onClick={() => setShowSettings(!showSettings)} aria-label="Abrir ajustes" className="hidden sm:flex p-3 rounded-2xl hover:bg-secondary transition-all active:scale-90">
              <Settings className="h-5 w-5" />
            </button>
            <button onClick={() => setIsFocusMode(!isFocusMode)} aria-label={isFocusMode ? "Salir del modo enfoque" : "Activar modo enfoque"} className="p-2 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-secondary transition-all active:scale-90">
              {isFocusMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <div className="hidden sm:block w-px h-6 bg-border/20 mx-2" />
            <button onClick={onClose} aria-label="Cerrar lector" className="p-2 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-destructive hover:text-white transition-all active:scale-90">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
      )}

      {/* Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col sm:flex-row">
        {/* Iframe Viewport */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-20">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Abriendo Archivos Omega...</p>
            </div>
          )}
          
          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-20 p-12 text-center">
              <div className="p-6 bg-destructive/10 text-destructive rounded-3xl"><Trash2 className="h-12 w-12" /></div>
              <h3 className="font-display text-2xl">Error de Transmisión</h3>
              <p className="text-sm opacity-60 max-w-xs">No pudimos procesar este libro. Inténtalo de nuevo o contacta al administrador.</p>
              <Button onClick={onClose} variant="outline" className="rounded-2xl px-8">Cerrar Visor</Button>
            </div>
          )}

          {isReady && book.fileType !== "pdf" && (
            <div className="reader-spread flex h-full w-full items-stretch justify-center gap-0 overflow-hidden bg-secondary/30 p-2 sm:gap-3 sm:p-6">
              <iframe
                srcDoc={srcDoc}
                className="reader-page h-full min-w-0 flex-1 border-none bg-background"
                title="Reader Viewport"
              />
              {page + 1 < readerPageCount && (
                <iframe
                  srcDoc={nextSrcDoc}
                  className="reader-page hidden h-full min-w-0 flex-1 border-none bg-background sm:block"
                  title={`Página ${page + 2}`}
                />
              )}
            </div>
          )}

          {isReady && book.fileType === "pdf" && !pdfNativeFallback && (
            <>
              {pdfPageLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-50">Renderizando página {page + 1}…</p>
                </div>
              )}
              {pdfPageImage && (
                <iframe
                  srcDoc={srcDoc}
                  className="h-full w-full border-none"
                  title={`Página PDF ${page + 1}`}
                />
              )}
            </>
          )}

          {isReady && book.fileType === "pdf" && pdfNativeFallback && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
              <p className="max-w-sm text-sm opacity-70">Este PDF no pudo renderizarse en el lector paginado. Puedes abrirlo con el visor nativo del navegador.</p>
              <iframe src={book.dataUrl} className="h-64 w-full rounded-2xl border border-border/30" title="Visor PDF nativo" />
            </div>
          )}
        </div>

        {/* Side Panels (Settings/Notes/Dictionary) */}
        {(showSettings || showNotes || dictionaryWord) && !isFocusMode && (
          <aside className="w-full sm:w-80 border-l border-border/10 p-8 space-y-8 animate-in slide-in-from-right duration-300 bg-background/50 backdrop-blur-xl z-50 overflow-y-auto">
            {showSettings && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Ajustes de Visión</h3>
                  <button onClick={() => setShowSettings(false)}><X className="h-4 w-4 opacity-40" /></button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {["white", "dark", "sepia"].map(t => (
                      <button key={t} onClick={() => setTheme(t as any)} className={`h-12 rounded-xl border-2 transition-all ${theme === t ? "border-primary shadow-lg scale-105" : "border-transparent bg-secondary/50"}`} style={{ backgroundColor: t === "white" ? "#fff" : t === "dark" ? "#1a1a1a" : "#f4ecd8" }} />
                    ))}
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Tamaño de Texto</label>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setFontSize(f => Math.max(0.8, f - 0.1))} className="flex-1 h-10 bg-secondary/50 rounded-xl hover:bg-secondary">-</button>
                      <span className="w-8 text-center font-bold">{Math.round(fontSize * 10)}</span>
                      <button onClick={() => setFontSize(f => Math.min(2, f + 0.1))} className="flex-1 h-10 bg-secondary/50 rounded-xl hover:bg-secondary">+</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Tipografía</label>
                    <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-secondary/50 rounded-2xl px-4 py-3 outline-none border border-border/50 font-medium">
                      <option value="'Inter', sans-serif">Sans (Moderno)</option>
                      <option value="'Georgia', serif">Serif (Clásico)</option>
                      <option value="'DM Serif Display', serif">Elegante</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {showNotes && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Tus Notas</h3>
                  <button onClick={() => setShowNotes(false)}><X className="h-4 w-4 opacity-40" /></button>
                </div>
                <div className="space-y-4">
                  <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Escribe un pensamiento..." className="w-full bg-secondary/30 border border-border/50 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-none" />
                  <Button onClick={addNote} className="w-full rounded-2xl h-12 shadow-lg"><Plus className="h-4 w-4 mr-2" />Guardar Nota</Button>
                </div>
                <div className="space-y-3">
                  {notes[book.id]?.map((note, i) => (
                    <div key={i} className="p-4 bg-secondary/50 rounded-2xl border border-border/50 group relative">
                      <p className="text-xs leading-relaxed">{note}</p>
                      <button onClick={() => deleteNote(i)} className="absolute top-2 right-2 p-1 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dictionaryWord && (
              <div className="space-y-8 animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Diccionario Omega</h3>
                  <button onClick={() => setDictionaryWord(null)}><X className="h-4 w-4 opacity-40" /></button>
                </div>
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20 space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Search className="h-5 w-5" />
                    <h4 className="font-display text-2xl tracking-tight capitalize">{dictionaryWord}</h4>
                  </div>
                  {loadingDef ? (
                    <div className="h-4 w-full bg-secondary/50 animate-pulse rounded-full" />
                  ) : (
                    <p className="text-sm leading-relaxed opacity-80">{definition}</p>
                  )}
                </div>
                <Button onClick={() => lookupWord(dictionaryWord)} variant="outline" className="w-full rounded-2xl h-12 border-dashed">Buscar otra vez</Button>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* Floating Controls Elite (Simplificado para móviles) */}
      {!isFocusMode && !(book.fileType === "pdf" && pdfNativeFallback) && (
        <div className="fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] sm:bottom-8 left-1/2 -translate-x-1/2 z-[70] flex max-w-[calc(100vw-1rem)] flex-nowrap items-center justify-center gap-1 sm:gap-8 px-2 sm:px-6 py-1.5 sm:py-4 bg-background/95 backdrop-blur-2xl rounded-full sm:rounded-3xl border border-border/50 shadow-2xl premium-shadow">
          {book.fileType === "pdf" && (
            <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
              <button onClick={() => setPdfZoom(value => Math.max(80, value - 10))} aria-label="Alejar PDF" disabled={pdfZoom <= 80} className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black hover:bg-background disabled:opacity-30">−</button>
              <span className="min-w-9 text-center text-[9px] font-black tabular-nums">{pdfZoom}%</span>
              <button onClick={() => setPdfZoom(value => Math.min(160, value + 10))} aria-label="Acercar PDF" disabled={pdfZoom >= 160} className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black hover:bg-background disabled:opacity-30">+</button>
              <button onClick={() => setPdfZoom(100)} aria-label="Restablecer zoom PDF" className="hidden h-8 rounded-lg px-2 text-[9px] font-black uppercase tracking-wider hover:bg-background sm:block">Ajustar</button>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(0, p - (book.fileType === "epub" ? 2 : 1))); }} aria-label="Página anterior" disabled={page === 0} className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full sm:rounded-2xl bg-secondary/50 text-foreground hover:bg-foreground hover:text-background transition-all active:scale-90 disabled:opacity-20">
            <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>
          <div className="flex min-w-[80px] flex-col items-center">
            <span className="hidden sm:block text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Página</span>
            <span className="text-[11px] sm:text-sm font-black tabular-nums">{book.fileType === "pdf" && !readerPageCount ? "—" : `${page + 1}${book.fileType === "epub" && page + 1 < readerPageCount ? `–${Math.min(page + 2, readerPageCount)}` : ""} / ${readerPageCount}`}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setPage(p => Math.min(Math.max(0, readerPageCount - 1), p + (book.fileType === "epub" ? 2 : 1))); }} aria-label="Página siguiente" disabled={!readerPageCount || page >= readerPageCount - 1} className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full sm:rounded-2xl bg-secondary/50 text-foreground hover:bg-foreground hover:text-background transition-all active:scale-90 disabled:opacity-20">
            <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
