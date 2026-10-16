/**
 * LIBRARY OMEGA — Admin Panel Elite.
 * Diseño premium para gestión de inventario, accesos y reseñas.
 */
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLibrary, BOOK_CATEGORIES, AGE_RANGES, type BookCategory, type AgeRange } from "@/lib/libraryStore";
import { Upload, FileText, X, Plus, Trash2, Tag, Search, History, MessageSquare, Star, Shield, LayoutGrid, FileSearch, RefreshCw, AlertCircle, Users, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function AdminPanel() {
  const { catalogBooks, addBook, updateBookCategory, updateBookAge, updateBookFeatured, removeBook } = useLibrary();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const canViewAccess = isAuthenticated && user?.role === "admin";
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<BookCategory | "auto">("auto");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"inventory" | "featured" | "access" | "reviews">("inventory");

  const visibleBooks = useMemo(() => {
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!q) return catalogBooks;
    return catalogBooks.filter((b) => b.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
  }, [catalogBooks, search]);

  const acceptFile = useCallback((file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".epub")) {
      toast.error(`"${file.name}" no es válido`);
      return false;
    }
    if (file.size > 150 * 1024 * 1024) {
      toast.error(`"${file.name}" excede 150MB`);
      return false;
    }
    return true;
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(acceptFile);
    if (valid.length === 0) return;
    setUploading(true);
    // No se impone un límite de cantidad: se procesan pequeños lotes para
    // permitir cientos de libros sin saturar el navegador ni el almacenamiento.
    const batchSize = 4;
    try {
      for (let start = 0; start < valid.length; start += batchSize) {
        const batch = valid.slice(start, start + batchSize);
        await Promise.all(batch.map(async (file) => {
          try {
            await addBook(file, defaultCategory === "auto" ? undefined : defaultCategory);
            toast.success(`"${file.name}" añadido`);
          } catch {
            toast.error(`Error con "${file.name}"`);
          }
        }));
      }
      setPendingFiles([]);
    } finally {
      setUploading(false);
    }
  }, [acceptFile, addBook, defaultCategory]);

  const { data: logs, isLoading: loadingLogs, isError: logsError, refetch: refetchLogs } = trpc.access.list.useQuery(
    undefined,
    { enabled: activeTab === "access" && canViewAccess, retry: 1 },
  );
  const { data: reviews, isLoading: loadingReviews, refetch: refetchReviews } = trpc.reviews.list.useQuery(undefined, { enabled: activeTab === "reviews" });

  const deleteReviewMutation = trpc.reviews.remove.useMutation({
    onSuccess: () => { toast.success("Reseña eliminada"); refetchReviews(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary text-background rounded-2xl shadow-xl"><Plus className="h-6 w-6" /></div>
          <h2 className="font-display text-4xl tracking-tight">Centro de Control Elite</h2>
        </div>
        
        <nav className="flex gap-2 p-1.5 bg-secondary/50 rounded-2xl border border-border/50 w-fit">
          {[
            { id: "inventory", label: "Inventario", icon: LayoutGrid },
            { id: "featured", label: "Destacados", icon: Star },
            { id: "access", label: "Accesos", icon: History },
            { id: "reviews", label: "Reseñas", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                activeTab === tab.id ? "bg-foreground text-background shadow-lg scale-105" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "featured" ? (
        <section className="space-y-8 animate-in fade-in duration-500" aria-labelledby="featured-books-title">
          <div className="rounded-[1.75rem] border border-border/50 bg-foreground p-6 text-background shadow-xl sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background text-foreground"><Star className="h-5 w-5" /></div>
                <div>
                  <h3 id="featured-books-title" className="font-display text-3xl tracking-tight">Selección Omega</h3>
                  <p className="mt-1 max-w-xl text-sm text-background/60">Elige los libros que aparecerán destacados en la interfaz principal. Puedes seleccionar varios.</p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-background/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-background/70">{catalogBooks.filter((book) => book.featured).length} seleccionados</span>
            </div>
          </div>

          {catalogBooks.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border/60 p-12 text-center text-muted-foreground">Carga libros para elegir tus destacados.</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {catalogBooks.map((book) => (
                <article key={book.id} className={`catalog-card overflow-hidden p-3 transition-all ${book.featured ? "ring-2 ring-foreground" : ""}`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary">
                    {book.coverUrl ? <img src={book.coverUrl} alt={`Portada de ${book.title}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><FileText className="h-10 w-10 opacity-20" /></div>}
                    {book.featured && <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-[9px] font-black uppercase tracking-widest text-background">Destacado</span>}
                  </div>
                  <div className="space-y-3 p-3">
                    <h4 className="line-clamp-2 font-display text-xl leading-tight">{book.title}</h4>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{book.category} · {book.age}</p>
                    <button type="button" onClick={() => updateBookFeatured(book.id, !book.featured)} className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${book.featured ? "bg-foreground text-background" : "border border-border/50 bg-secondary/50 hover:bg-foreground hover:text-background"}`}>
                      <Star className="h-4 w-4" /> {book.featured ? "Quitar destacado" : "Elegir destacado"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : activeTab === "inventory" ? (
        <div className="space-y-10">
          <section className="grid md:grid-cols-[1fr_350px] gap-8">
            <div
              role="button"
              onClick={() => document.getElementById("file-input")?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); setPendingFiles(Array.from(e.dataTransfer.files)); }}
              className={`catalog-card flex flex-col items-center justify-center gap-6 p-16 text-center border-dashed border-2 transition-all ${
                dragActive ? "border-primary bg-primary/5 scale-[0.98]" : "border-border/50 hover:border-primary/50"
              }`}
            >
              <div className="p-4 bg-secondary rounded-full"><Upload className="h-8 w-8 opacity-40" /></div>
              <div className="space-y-2">
                <p className="font-display text-2xl tracking-tight">Cargar Nuevos Volúmenes</p>
                <p className="text-xs font-medium opacity-40">Arrastra tantos PDF o EPUB como necesites · hasta 150MB por archivo</p>
              </div>
              <input id="file-input" type="file" accept=".pdf,.epub" multiple className="hidden" onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))} />
            </div>

            <div className="catalog-card p-8 bg-secondary/30 border-none space-y-6">
              <div className="flex items-center gap-2 text-primary">
                <Tag className="h-5 w-5" />
                <h4 className="font-display text-xl">Configuración</h4>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Clasificación al cargar</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDefaultCategory("auto")}
                    className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                      defaultCategory === "auto" ? "bg-foreground text-background border-foreground shadow-lg" : "bg-background border-border/50 text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    Automática
                  </button>
                  {BOOK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDefaultCategory(cat)}
                      className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                        defaultCategory === cat ? "bg-foreground text-background border-foreground shadow-lg" : "bg-background border-border/50 text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">Omega analiza el título del PDF o EPUB y asigna automáticamente género y edad. Puedes corregirlos después en el inventario.</p>
              </div>
              {pendingFiles.length > 0 && (
                <div className="pt-6 border-t border-border/50 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest">{pendingFiles.length} Pendientes</span>
                    <button onClick={() => setPendingFiles([])} className="text-[10px] font-black uppercase tracking-widest text-destructive">Limpiar</button>
                  </div>
                  <Button onClick={() => processFiles(pendingFiles)} disabled={uploading} className="w-full rounded-2xl py-6 font-black uppercase tracking-widest shadow-xl">
                    {uploading ? "Procesando..." : "Subir Ahora"}
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-3xl tracking-tight">Inventario Global</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Marca los libros que aparecerán en “Selección Omega” en el inicio.</p>
                  </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en la biblioteca..."
                  className="w-full bg-secondary/50 border border-border/50 rounded-2xl pl-12 pr-6 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {visibleBooks.map((b) => (
                <div key={b.id} className="catalog-card p-4 flex flex-col sm:flex-row sm:items-center gap-6 group">
                  <div className="h-20 w-16 bg-secondary rounded-xl overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    {b.coverUrl ? <img src={b.coverUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center opacity-20"><FileText className="h-8 w-8" /></div>}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-display text-xl truncate">{b.title}</h4>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{b.fileType} · ID: {b.id.slice(0,8)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select value={b.category} onChange={(e) => updateBookCategory(b.id, e.target.value as any)} className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-primary/20">
                      {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={b.age} onChange={(e) => updateBookAge(b.id, e.target.value as any)} className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-primary/20">
                      {AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => updateBookFeatured(b.id, !b.featured)}
                      aria-pressed={Boolean(b.featured)}
                      title={b.featured ? "Quitar de Selección Omega" : "Mostrar en Selección Omega"}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${b.featured ? "border-foreground bg-foreground text-background shadow-lg" : "border-border/50 bg-secondary/50 text-muted-foreground hover:border-foreground hover:text-foreground"}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden lg:inline">{b.featured ? "Destacado" : "Destacar"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar “${b.title}” de la biblioteca? Esta acción no se puede deshacer.`)) removeBook(b.id);
                      }}
                      title="Eliminar libro"
                      aria-label={`Eliminar ${b.title}`}
                      className="rounded-xl p-3 text-destructive transition-colors hover:bg-destructive/10"
                    ><Trash2 className="h-5 w-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : activeTab === "access" ? (
        <section className="space-y-5 animate-in fade-in duration-500" aria-labelledby="access-log-title">
          <div className="flex flex-col gap-4 rounded-[1.75rem] border border-border/50 bg-secondary/20 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 id="access-log-title" className="font-display text-2xl tracking-tight">Personas que ingresaron</h3>
                <p className="mt-1 text-xs text-muted-foreground">Registro privado de los últimos accesos verificados.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="rounded-full border border-border/50 bg-background px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {logs?.length ?? 0} registros
              </span>
              <button
                type="button"
                onClick={() => refetchLogs()}
                disabled={loadingLogs}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-50"
                aria-label="Actualizar historial de accesos"
                title="Actualizar historial"
              >
                <RefreshCw className={`h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {authLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-[1.75rem] border border-border/50 bg-card text-sm text-muted-foreground" aria-live="polite">
              <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> Verificando sesión de administrador…
            </div>
          ) : !canViewAccess ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[1.75rem] border border-border bg-foreground/5 p-6 text-center" role="alert">
              <Shield className="mb-3 h-8 w-8 text-foreground" />
              <p className="font-semibold">Historial protegido</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Inicia sesión con la cuenta Google que tiene rol administrador para consultar quién ingresó y cuándo.</p>
            </div>
          ) : loadingLogs ? (
            <div className="flex min-h-48 items-center justify-center rounded-[1.75rem] border border-border/50 bg-card text-sm text-muted-foreground" aria-live="polite">
              <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> Cargando accesos…
            </div>
          ) : logsError ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[1.75rem] border border-destructive/20 bg-destructive/5 p-6 text-center" role="alert">
              <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
              <p className="font-semibold">No se pudo cargar el historial.</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Comprueba la conexión y vuelve a intentarlo. El registro está protegido y solo se consulta desde este panel.</p>
              <button type="button" onClick={() => refetchLogs()} className="mt-5 rounded-xl bg-foreground px-4 py-2 text-[10px] font-black uppercase tracking-widest text-background transition-opacity hover:opacity-80">Reintentar</button>
            </div>
          ) : !logs?.length ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/60 bg-card p-6 text-center">
              <History className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold">Todavía no hay accesos registrados.</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Cuando una persona complete el acceso, su identificador y la fecha aparecerán aquí.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/50">
                      <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground sm:px-8 sm:py-6">Persona / correo</th>
                      <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground sm:px-8 sm:py-6">Fecha de acceso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {logs.map((log) => {
                      const email = log.email.trim() || "Identificador no disponible";
                      return (
                        <tr key={log.id} className="transition-colors hover:bg-secondary/20">
                          <td className="px-5 py-4 sm:px-8 sm:py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-[10px] font-black uppercase text-background shadow-sm">{email.charAt(0).toUpperCase()}</div>
                              <span className="break-all text-sm font-bold">{email}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right text-xs font-medium text-muted-foreground sm:px-8 sm:py-5">
                            {format(new Date(log.timestamp), "d 'de' MMMM, yyyy · HH:mm", { locale: es })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : (
        <div className="grid gap-6 animate-in fade-in duration-500">
          {reviews?.map((rev) => (
            <div key={rev.id} className="catalog-card p-8 bg-card premium-shadow group">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center"><UserIcon className="h-5 w-5 opacity-40" /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{rev.userEmail}</p>
                      <div className="flex gap-1 text-foreground">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-3 w-3 ${s <= rev.rating ? "fill-current" : "opacity-20"}`} />)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold opacity-30">{format(new Date(rev.createdAt), "d MMM, HH:mm", { locale: es })}</span>
                  <button onClick={() => deleteReviewMutation.mutate({ id: rev.id })} className="p-2 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="text-lg font-display italic leading-relaxed opacity-80">"{rev.comment}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );
}
