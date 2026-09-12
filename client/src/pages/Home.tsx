/**
 * LIBRARY OMEGA — Home Elite.
 * Diseño premium con secciones dinámicas y optimización de carga.
 */
import { useEffect, useState } from "react";
import { useLibrary, BOOK_CATEGORIES, AGE_RANGES, type Book } from "@/lib/libraryStore";
import BookCard from "@/components/BookCard";
import CatMascot from "@/components/CatMascot";
import AdminPanel from "@/components/AdminPanel";
import ReaderModal from "@/components/ReaderModal";
import Navbar from "@/components/Navbar";
import CaptchaGate from "@/components/CaptchaGate";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Sparkles, BookMarked, Filter, MessageSquare, Star, Send, BookOpen, Clock, Award, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isVerified, setIsVerified] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("omega_verified") === "true";
  });

  const logAccessMutation = trpc.access.log.useMutation();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      setIsVerified(true);
      sessionStorage.setItem("omega_verified", "true");
      logAccessMutation.mutate({ email: user.email || "google-user" });
    }
  }, [isAuthenticated, user]);

  const handleVerify = (email: string) => {
    setIsVerified(true);
    sessionStorage.setItem("omega_verified", "true");
    logAccessMutation.mutate({ email });
  };

  const {
    role,
    books,
    readBooks,
    catalogBooks,
    allBooks,
    recommendedBooks,
    booksByCategory,
    filterCategory,
    setFilterCategory,
    filterAge,
    setFilterAge,
    levelUpJustHappened,
    resetLevelUpFlag,
  } = useLibrary();

  const [openBook, setOpenBook] = useState<Book | null>(null);

  useEffect(() => {
    const booksToPrefetch = [...recommendedBooks, ...allBooks.filter(b => (b.lastPage || 0) > 0).slice(0, 3)];
    booksToPrefetch.forEach(book => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.OMEGA_PREFETCH) {
        // @ts-ignore
        void window.OMEGA_PREFETCH(book);
      }
    });
  }, [recommendedBooks, allBooks]);

  const isRead = (id: string) => readBooks.some((b) => b.id === id);

  // Filtrar catálogo por categoría y edad
  const filteredCatalog = catalogBooks.filter(
    (b) =>
      (filterCategory === "Todas" || b.category === filterCategory) &&
      (filterAge === "Todas" || b.age === filterAge),
  );

  if (!isVerified) return <CaptchaGate onVerify={handleVerify} />;

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10">
      <Navbar />
      
      {levelUpJustHappened && <LevelUpOverlay onDismiss={resetLevelUpFlag} />}

      <main className="container flex-1 py-8 sm:py-12 mb-24 sm:mb-0">
        {role === "admin" ? (
          <AdminPanel />
        ) : (
          <div className="grid gap-12 lg:grid-cols-[320px_1fr]">
            {/* Sidebar Elite */}
            <aside className="lg:sticky lg:top-28 lg:self-start space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
              <CatMascot />
              
              <div className="catalog-card p-6 bg-secondary/30 border-none premium-shadow">
                <h4 className="font-display text-lg mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 opacity-40" />
                  Tu Actividad
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-60 font-bold uppercase tracking-widest">Leídos</span>
                    <span className="font-black tabular-nums">{readBooks.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-60 font-bold uppercase tracking-widest">En Progreso</span>
                    <span className="font-black tabular-nums">{allBooks.filter(b => (b.lastPage || 0) > 0 && !isRead(b.id)).length}</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Contenido Elite */}
            <div className="space-y-16 min-w-0 animate-in fade-in duration-1000">
              {/* Continuar leyendo Elite */}
              {allBooks.filter(b => (b.lastPage || 0) > 0 && !isRead(b.id)).length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-foreground text-background rounded-xl shadow-lg"><BookOpen className="h-5 w-5" /></div>
                      <h2 className="font-display text-3xl tracking-tight">Continuar leyendo</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {allBooks
                      .filter(b => (b.lastPage || 0) > 0 && !isRead(b.id))
                      .slice(0, 4)
                      .map((book, i) => (
                        <BookCard key={book.id} book={book} index={i} onOpen={setOpenBook} read={false} />
                      ))}
                  </div>
                </section>
              )}

              {/* Recomendados Elite */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl"><Sparkles className="h-5 w-5" /></div>
                  <h2 className="font-display text-3xl tracking-tight">Selección Omega</h2>
                </div>
                {recommendedBooks.length === 0 ? (
                  <div className="catalog-card p-12 text-center border-dashed border-2 border-border/50">
                    <p className="font-display text-xl opacity-40">Nuevos títulos pronto...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {recommendedBooks.map((book, i) => (
                      <BookCard key={book.id} book={book} index={i} onOpen={setOpenBook} read={isRead(book.id)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Catálogo con Filtros Elite */}
              <section className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="font-display text-4xl tracking-tight">Explorar Biblioteca</h2>
                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">{filteredCatalog.length} Volúmenes Disponibles</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-secondary/50 rounded-2xl border border-border/50">
                    <button
                      onClick={() => setFilterCategory("Todas")}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                        filterCategory === "Todas" ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Todas
                    </button>
                    {BOOK_CATEGORIES.map((cat) => {
                      const count = booksByCategory[cat]?.length ?? 0;
                      if (count === 0) return null;
                      return (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                            filterCategory === cat ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredCatalog.length === 0 ? (
                  <div className="catalog-card p-20 text-center">
                    <h3 className="font-display text-2xl opacity-40">Sin resultados</h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                    {filteredCatalog.map((book, i) => (
                      <BookCard key={book.id} book={book} index={i} onOpen={setOpenBook} read={isRead(book.id)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Leídos Elite */}
              {readBooks.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 text-green-600 rounded-xl"><Award className="h-5 w-5" /></div>
                    <h2 className="font-display text-3xl tracking-tight">Colección de Honor</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {readBooks.map((book) => (
                      <div key={book.id} className="catalog-card p-4 flex items-center gap-4 group">
                        <div className="h-16 w-12 bg-secondary rounded-lg overflow-hidden shrink-0">
                          {book.coverUrl ? <img src={book.coverUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center opacity-20"><BookMarked className="h-6 w-6" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display text-lg truncate group-hover:text-primary transition-colors">{book.title}</h4>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{book.category} · {book.fileType}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setOpenBook(book)} className="rounded-xl font-black text-[9px] uppercase tracking-widest">Releer</Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Reseñas Elite */}
              <section id="opinion" className="relative min-w-0 scroll-mt-24 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 p-4 text-white shadow-[0_24px_70px_-30px_rgba(0,0,0,0.7)] sm:p-6 lg:p-8">
                <div className="pointer-events-none absolute -right-12 -top-16 text-white/[0.045]"><MessageSquare className="h-64 w-64" /></div>
                <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)] lg:gap-10">
                  <div className="flex min-w-0 flex-col justify-between gap-8 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 sm:p-6">
                    <div className="space-y-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-zinc-950 shadow-lg shadow-amber-300/10"><MessageSquare className="h-5 w-5" /></div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200/80">Canal privado</p>
                        <h2 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">Tu opinión importa</h2>
                        <p className="max-w-sm text-sm leading-6 text-white/65">Comparte una idea, un problema o una sugerencia para seguir afinando tu experiencia de lectura.</p>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Solo la verá el equipo de administración</div>
                  </div>
                  <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6"><ReviewForm /></div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {openBook && <ReaderModal book={openBook} onClose={() => setOpenBook(null)} />}
      
      <footer className="py-12 border-t border-border/40 text-center opacity-40">
        <div className="container">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Library Omega · Los libros se guardan en la nube y no se comparten entre dispositivos</p>
        </div>
      </footer>
    </div>
  );
}

export function ReviewForm() {
  const { isAuthenticated, loading } = useAuth();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const addReviewMutation = trpc.reviews.add.useMutation({
    onSuccess: () => {
      setIsSent(true);
      setSendError(null);
      setName("");
      setComment("");
      window.setTimeout(() => setIsSent(false), 5000);
    },
    onError: (error) => setSendError(error.message || "No se pudo enviar tu opinión."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    if (!comment.trim() || !isAuthenticated) return;
    // Las opiniones se guardan de forma privada y solo las ve el administrador.
    addReviewMutation.mutate({ rating, comment: `${name ? name + ": " : ""}${comment.trim()}` });
  };

  if (loading) {
    return <div className="min-h-40 animate-pulse rounded-2xl bg-white/[0.06]" aria-label="Cargando formulario de opinión" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-40 flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <p className="font-display text-2xl">Inicia sesión para escribir</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/60">Necesitamos asociar el mensaje a tu cuenta. Tu opinión seguirá siendo privada y solo la verá administración.</p>
        <button type="button" onClick={() => startLogin()} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-6 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-950 shadow-lg transition-transform hover:bg-amber-200 active:scale-95 sm:w-fit">Entrar con Google</button>
      </div>
    );
  }

  if (isSent) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-6 text-center animate-bubble">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300 text-zinc-950 shadow-lg shadow-emerald-300/10"><Send className="h-6 w-6" /></div>
        <p className="font-display text-2xl">Mensaje recibido</p>
        <p className="mt-2 text-sm text-white/60">Gracias. El equipo lo revisará de forma privada.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Formulario de opinión privada">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-2">
          <label htmlFor="review-name" className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Firma opcional</label>
          <input id="review-name" value={name} onChange={e => setName(e.target.value)} placeholder="Cómo quieres identificarte" className="h-12 w-full min-w-0 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-amber-200/70 focus:bg-white/[0.11]" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Valoración</label>
            <span className="text-xs font-semibold text-amber-200">{rating} de 5</span>
          </div>
          <div className="flex h-12 items-center gap-1 rounded-xl border border-white/15 bg-white/[0.07] px-4" role="group" aria-label="Seleccionar valoración">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} de 5 estrellas`} aria-pressed={s <= rating} className={`rounded-lg p-1.5 transition-all hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200 ${s <= rating ? "scale-110 text-amber-300" : "text-white/20"}`}><Star className="h-4 w-4 fill-current" /></button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="review-comment" className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Comentario o sugerencia</label>
          <span className="text-[10px] tabular-nums text-white/35">{comment.length}/1000</span>
        </div>
        <textarea id="review-comment" value={comment} maxLength={1000} onChange={e => setComment(e.target.value)} placeholder="Cuéntanos qué podemos mejorar…" className="min-h-36 w-full min-w-0 resize-y rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/30 focus:border-amber-200/70 focus:bg-white/[0.11]" required />
      </div>
      {sendError && <p role="alert" className="rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-xs leading-5 text-red-100">{sendError}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-white/40">No se publica en la biblioteca.</p>
        <button type="submit" disabled={addReviewMutation.isPending || !comment.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-950 shadow-xl transition-all hover:bg-amber-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"><Send className="h-4 w-4" /> {addReviewMutation.isPending ? "Enviando…" : "Enviar mensaje"}</button>
      </div>
    </form>
  );
}

function LevelUpOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="text-center space-y-8 animate-bubble">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
          <div className="relative h-48 w-48 bg-foreground text-background rounded-[3rem] flex items-center justify-center shadow-2xl rotate-12">
            <Award className="h-24 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-6xl tracking-tighter">¡NIVEL ALCANZADO!</h2>
          <p className="text-sm font-black uppercase tracking-[0.5em] opacity-40">Tu leyenda continúa en Library Omega</p>
        </div>
        <Button onClick={onDismiss} size="lg" className="rounded-2xl px-12 py-8 text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Continuar Aventura</Button>
      </div>
    </div>
  );
}
