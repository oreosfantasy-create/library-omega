import { useMemo, useState } from "react";
import { BookOpen, Sparkles, ArrowLeft, LibraryBig } from "lucide-react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import ReaderModal from "@/components/ReaderModal";
import { useLibrary, type Book } from "@/lib/libraryStore";
import { trpc } from "@/lib/trpc";

interface Recommendation {
  id: string;
  reason: string;
}

interface ExternalSuggestion {
  title: string;
  author: string;
  reason: string;
}

export default function Recommender() {
  const [, navigate] = useLocation();
  const { allBooks } = useLibrary();
  const [openBook, setOpenBook] = useState<Book | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [externalSuggestions, setExternalSuggestions] = useState<ExternalSuggestion[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Soy Gato Omega. Cuéntame qué te gustaría leer y buscaré coincidencias entre los libros disponibles en tu biblioteca." },
  ]);

  const chatMutation = trpc.recommendations.chat.useMutation({
    onSuccess: (response) => {
      setRecommendations(response.recommendations);
      setExternalSuggestions(response.externalSuggestions);
      setMessages((current) => [...current, { role: "assistant", content: response.answer }]);
    },
    onError: () => {
      setMessages((current) => [...current, { role: "assistant", content: "No pude consultar la biblioteca ahora. Intenta nuevamente en unos segundos." }]);
    },
  });

  const recommendationBooks = useMemo(() => {
    const byId = new Map(allBooks.map((book) => [book.id, book]));
    return recommendations.map((item) => ({ ...item, book: byId.get(item.id) })).filter((item): item is Recommendation & { book: Book } => Boolean(item.book));
  }, [allBooks, recommendations]);

  const handleSend = (content: string) => {
    const history = messages.filter((message) => message.role !== "system").slice(-8).map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));
    setMessages((current) => [...current, { role: "user", content }]);
    chatMutation.mutate({ message: content, history });
  };

  return (
    <div className="omega-home min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 sm:py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex flex-col gap-5 border-b border-border/50 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <button onClick={() => navigate("/")} className="omega-button border border-border/60 bg-card text-muted-foreground hover:bg-secondary">
                <ArrowLeft className="h-4 w-4" /> Volver a biblioteca
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <p className="eyebrow">Gato Omega · Curaduría inteligente</p>
                  <h1 className="font-display text-4xl tracking-tight sm:text-5xl">¿Qué quieres leer?</h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Descríbeme una historia, un estado de ánimo o un tema. Revisaré tu biblioteca actual y también podré sugerir títulos externos para ampliar tus opciones.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <LibraryBig className="h-4 w-4" /> {allBooks.length} títulos disponibles
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSend}
              isLoading={chatMutation.isPending}
              height="min(640px, calc(100vh - 250px))"
              placeholder="Ej.: quiero una aventura breve y misteriosa…"
              emptyStateMessage="Habla con Gato Omega para encontrar tu próxima lectura"
              suggestedPrompts={["Algo misterioso y atrapante", "Una aventura para leer hoy", "Un libro juvenil"]}
              className="rounded-[1.75rem] border-border/60 shadow-xl"
            />

            <aside className="space-y-5">
              <div className="static-card p-5">
                <div className="mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4 opacity-50" /><h2 className="text-[10px] font-black uppercase tracking-widest">Coincidencias</h2></div>
                {recommendationBooks.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">Las coincidencias disponibles aparecerán aquí. El catálogo se actualiza automáticamente cada vez que agregas libros.</p>
                ) : (
                  <div className="space-y-3">
                    {recommendationBooks.map(({ book, reason }) => (
                      <button key={book.id} onClick={() => setOpenBook(book)} className="group w-full rounded-2xl border border-border/60 bg-secondary/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-secondary">
                        <div className="flex gap-3">
                          <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                            {book.coverUrl ? <img src={book.coverUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="m-3 h-5 w-5 opacity-30" />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 font-display text-base leading-tight group-hover:underline">{book.title}</h3>
                            <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-muted-foreground">{reason}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {externalSuggestions.length > 0 && <div className="static-card p-5">
                <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 opacity-50" /><h2 className="text-[10px] font-black uppercase tracking-widest">Para explorar fuera</h2></div>
                <div className="space-y-3">
                  {externalSuggestions.map((item) => <div key={`${item.title}-${item.author}`} className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-3">
                    <h3 className="font-display text-base leading-tight">{item.title}</h3>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.author} · No está en tu biblioteca</p>
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{item.reason}</p>
                  </div>)}
                </div>
              </div>}
              <div className="rounded-[1.5rem] bg-foreground p-5 text-background shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-background/50">Consejo</p>
                <p className="mt-3 font-display text-xl leading-tight">Mientras más me cuentes, mejor podré afinar la selección.</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      {openBook && <ReaderModal book={openBook} onClose={() => setOpenBook(null)} />}
    </div>
  );
}
