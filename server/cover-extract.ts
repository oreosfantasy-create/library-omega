/**
 * Extracción de portada de un EPUB en el servidor.
 */
import JSZip from "jszip";

export async function extractCoverBuffer(
  buffer: Buffer | Uint8Array,
  type: "epub" | "pdf"
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (type === "pdf") {
    // PDF extraction requires heavy libraries like pdf.js or canvas in node.
    // For now, we return null and let the client handle it if possible.
    return null;
  }
  return extractEpubCoverBuffer(buffer);
}

export async function extractEpubCoverBuffer(
  epubBuffer: Buffer | Uint8Array,
): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const zip = await JSZip.loadAsync(epubBuffer);

    const containerXml = await zip.file("META-INF/container.xml")?.async("text");
    if (!containerXml) return null;
    const containerDoc = parseXml(containerXml);
    const rootfile = containerDoc.querySelector("rootfile");
    if (!rootfile) return null;
    const opfPath = rootfile.getAttribute("full-path")!;
    const opfDir = opfPath.includes("/")
      ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1)
      : "";

    const opfXml = await zip.file(opfPath)?.async("text");
    if (!opfXml) return null;
    const opfDoc = parseXml(opfXml);

    const manifest = new Map<string, { href: string }>();
    opfDoc.querySelectorAll("manifest item").forEach((item: any) => {
      const id = item.getAttribute("id");
      const href = item.getAttribute("href");
      if (id && href) manifest.set(id, { href });
    });

    const coverMeta =
      opfDoc.querySelector('meta[name="cover"]') ||
      opfDoc.querySelector('[properties~="cover-image"]');
    if (coverMeta) {
      const coverId =
        coverMeta.getAttribute("content") || coverMeta.getAttribute("href");
      if (coverId) {
        const found = await findCoverImage(zip, opfDir, manifest, coverId);
        if (found) return found;
      }
    }

    const guideRef = (opfDoc.querySelectorAll("guide reference") as any[]).find(
      (ref) => ref.getAttribute("type")?.toLowerCase() === "cover"
    );
    if (guideRef) {
      const href = guideRef.getAttribute("href");
      if (href) {
        const coverPath = href.includes("/")
          ? opfDir + href.substring(0, href.lastIndexOf("/") + 1)
          : opfDir;
        const xhtmlFile = zip.file(href.includes("/") ? href : opfDir + href);
        if (xhtmlFile) {
          const xhtml = await xhtmlFile.async("text");
          const imgMatch =
            xhtml.match(/<image[^>]+(?:xlink:)?href=["']([^"']+\.jpe?g[^"']*)["']/i) || 
            xhtml.match(/<image[^>]+(?:xlink:)?href=["']([^"']+)["']/i);
          if (imgMatch) {
            let imgHref = imgMatch[1];
            if (imgHref.startsWith("../")) imgHref = opfDir + imgHref.slice(3);
            else if (!imgHref.includes("/")) imgHref = coverPath + imgHref;
            const found = await loadCoverFile(zip, imgHref);
            if (found) return found;
          }
        }
      }
    }

    for (const [id, { href }] of Array.from(manifest.entries())) {
      if (/\.(jpe?g|png|webp)$/i.test(href) && /cover/i.test(id + href)) {
        const found = await loadCoverFile(zip, opfDir + href);
        if (found) return found;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function loadCoverFile(
  zip: JSZip,
  path: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  const file = zip.file(path);
  if (!file) return null;
  const data = await file.async("uint8array");
  const ext = path.split(".").pop()?.toLowerCase() || "jpg";
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { buffer: Buffer.from(data), mime };
}

async function findCoverImage(
  zip: JSZip,
  opfDir: string,
  manifest: Map<string, { href: string }>,
  coverId: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  const item = manifest.get(coverId);
  if (item) return loadCoverFile(zip, opfDir + item.href);
  for (const [, { href }] of Array.from(manifest.entries())) {
    const name = href.replace(/\.[^.]+$/, "");
    if (name === coverId) return loadCoverFile(zip, opfDir + href);
  }
  return loadCoverFile(zip, opfDir + coverId);
}

function findElements(xml: string, sel: string): any[] {
  const out: any[] = [];
  const m = sel.match(/^([a-z]+)(?:\s+([a-z]+))?(?:\[([a-z:-]+)~?=?["']([^"']*)["']\])?$/i);
  if (!m) return out;
  const [, tag1, tag2, attrName, attrVal] = m;
  const tag = tag2 ?? tag1;
  const tagRe = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(xml)) !== null) {
    const full = match[0];
    let keep = true;
    if (attrName) {
      const attrEsc = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const valEsc = (attrVal ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const attrRe = attrVal
        ? new RegExp(`\\b${attrEsc}=["'][^"']*${valEsc}["']`, "i")
        : new RegExp(`\\b${attrEsc}=["'][^"']*["']`, "i");
      keep = attrRe.test(full);
    }
    if (keep) {
      out.push({
        getAttribute: (name: string) => {
          const am = full.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
          return am ? am[1] : null;
        }
      });
    }
  }
  return out;
}

function parseXml(xml: string): any {
  return {
    querySelector: (sel: string) => findElements(xml, sel)[0] ?? null,
    querySelectorAll: (sel: string) => findElements(xml, sel)
  };
}
