/**
 * LIBRARY OMEGA — Explore Elite.
 * Diseño premium con búsqueda avanzada y filtros dinámicos.
 */
import { useMemo, useState } from "react";
import { useLibrary, BOOK_CATEGORIES, AGE_RANGES, type Book } from "@/lib/libraryStore";
import BookCard from "@/components/BookCard";
import { Search, SlidersHorizontal, BookOpen, X } from "lucide-react";
import ReaderModal from "@/components/ReaderModal";
import Navbar from "@/components/Navbar";

export default function Explore() {
  const { catalogBooks, readBooks } = useLibrary();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Todas");
  const [age, setAge] = useState<string>("Todas");
  const [openBook, setOpenBook] = useState<Book | null>(null);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = catalogBooks;
    if (q) list = list.filter((b) => b.title.toLowerCase().includes(q));
    if (category !== "Todas") list = list.filter((b) => b.category === category);
    if (age !== "Todas") list = list.filter((b) => b.age === age);
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, [catalogBooks, q, category, age]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container flex-1 py-8 sm:py-12 mb-24 sm:mb-0 animate-in fade-in duration-700">
        <div className="space-y-8 sm:space-y-12">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
          <div className="p-4 bg-foreground text-background rounded-[2rem] shadow-2xl animate-bubble"><BookOpen className="h-10 w-10" /></div>
          <div className="space-y-2">
            <h2 className="font-display text-5xl tracking-tight">Descubre tu próxima aventura</h2>
            <p className="text-sm font-medium opacity-40">Explora {catalogBooks.length} volúmenes curados. La sabiduría te espera en cada página.</p>
          </div>
        </section>

        {/* Search & Filters Elite */}
        <section className="catalog-card p-8 bg-secondary/30 border-none premium-shadow space-y-8">
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 opacity-20" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, autor o palabra clave..."
              className="w-full bg-background/50 border border-border/50 rounded-[2rem] pl-16 pr-16 py-6 text-lg outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-foreground/5 rounded-full transition-colors"><X className="h-5 w-5 opacity-40" /></button>
            )}
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-background/50 rounded-2xl border border-border/50">
              <div className="px-4 py-2 flex items-center gap-2 opacity-40"><SlidersHorizontal className="h-3 w-3" /><span className="text-[9px] font-black uppercase tracking-widest">Género</span></div>
              <button
                onClick={() => setCategory("Todas")}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  category === "Todas" ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas
              </button>
              {BOOK_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    category === cat ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-background/50 rounded-2xl border border-border/50">
              <div className="px-4 py-2 flex items-center gap-2 opacity-40"><span className="text-[9px] font-black uppercase tracking-widest">Edad</span></div>
              <button
                onClick={() => setAge("Todas")}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  age === "Todas" ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas
              </button>
              {AGE_RANGES.map((ar) => (
                <button
                  key={ar}
                  onClick={() => setAge(ar)}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    age === ar ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Results Elite */}
        <section className="space-y-8">
          {filtered.length === 0 ? (
            <div className="catalog-card p-24 text-center border-dashed border-2 border-border/50">
              <h3 className="font-display text-3xl opacity-20">Silencio en los estantes...</h3>
              <p className="text-xs font-black uppercase tracking-widest opacity-20 mt-4">Prueba con otra búsqueda</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{filtered.length} Resultados Encontrados</p>
              </div>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((book, i) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    index={i}
                    onOpen={setOpenBook}
                    read={readBooks.some((r) => r.id === book.id)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

        {openBook && <ReaderModal book={openBook} onClose={() => setOpenBook(null)} />}
      </main>
    </div>
  );
}
