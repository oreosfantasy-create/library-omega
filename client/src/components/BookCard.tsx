/**
 * LIBRARY OMEGA — Tarjeta de libro Elite.
 * Diseño premium con sombras profundas y transiciones suaves.
 */
import type { Book } from "@/lib/libraryStore";
import { BookMarked } from "lucide-react";

interface BookCardProps {
  book: Book;
  index?: number;
  onOpen: (book: Book) => void;
  read?: boolean;
}

export default function BookCard({ book, index, onOpen, read }: BookCardProps) {
  const isEpub = book.fileType === "epub";
  return (
    <button
      onClick={() => onOpen(book)}
      className="catalog-card animate-in-stagger group"
      style={{ animationDelay: `${Math.min((index ?? 0) * 50, 400)}ms` }}
    >
      <div className="relative aspect-[8.5/13] overflow-hidden rounded-t-2xl">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-foreground px-6 text-center text-background">
            <BookMarked className="h-12 w-12 text-background/30" />
            <h3 className="font-display text-base leading-tight text-background">{book.title}</h3>
          </div>
        )}
        
        {/* Badges Elite */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <span className="absolute bottom-3 right-3 glass-panel px-2 py-1 text-[8px] font-black uppercase tracking-widest text-foreground shadow-lg rounded-lg">
          {isEpub ? "EPUB" : "PDF"}
        </span>
        
        {read && (
          <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-lg ring-4 ring-background animate-bubble">
            <span className="text-[10px] font-black">✓</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="line-clamp-2 font-display text-sm leading-snug group-hover:text-primary transition-colors">{book.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{book.category}</span>
          <div className="h-1 w-1 rounded-full bg-border" />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{book.age}</span>
        </div>
      </div>
    </button>
  );
}
