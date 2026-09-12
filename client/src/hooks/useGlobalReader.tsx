/**
 * Hook global para abrir el lector desde cualquier vista.
 * Las vistas (Home, Explore) despachan un evento "open-book" con el libro
 * y este hook lo captura y expone el libro abierto.
 */
import { useEffect, useState } from "react";
import type { Book } from "@/lib/libraryStore";

export function useGlobalReader() {
  const [openBook, setOpenBook] = useState<Book | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as Book | null;
      setOpenBook(detail);
    };
    window.addEventListener("open-book", onOpen);
    return () => window.removeEventListener("open-book", onOpen);
  }, []);

  const closeReader = () => setOpenBook(null);

  return { openBook, closeReader };
}
