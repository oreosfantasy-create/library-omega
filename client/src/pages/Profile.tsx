/**
 * LIBRARY OMEGA — Profile Elite.
 * Diseño premium con estadísticas avanzadas y estética refinada.
 */
import { useEffect, useMemo, useState } from "react";
import { useLibrary, XP_PER_LEVEL, MAX_LEVEL } from "@/lib/libraryStore";
import CatMascot from "@/components/CatMascot";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/contexts/ThemeContext";
import { Award, BookOpen, Flame, RotateCcw, Moon, Sun, BarChart2, Zap, Trophy, Quote } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BOOK_QUOTES = [
  { quote: "En un lugar de la Mancha, de cuyo nombre no quiero acordarme...", author: "Miguel de Cervantes" },
  { quote: "Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota...", author: "Gabriel García Márquez" },
  { quote: "La literatura es el fuego que en la noche.", author: "Julio Cortázar" },
  { quote: "Un libro debe ser el hacha que rompa el mar helado dentro de nosotros.", author: "Franz Kafka" },
  { quote: "Los lectores son personas peligrosas. Leer es soñar con los ojos abiertos.", author: "Annette Langen" },
];

export default function Profile() {
  const { xp, level, xpProgressInfo, streak, readBooks, catalogBooks, resetProgress, readingLogs, achievements } = useLibrary();
  const { theme, toggleTheme } = useTheme();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [resetArmed, setResetArmed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setQuoteIndex(i => (i + 1) % BOOK_QUOTES.length), 10000);
    return () => clearInterval(t);
  }, []);

  const progress = useMemo(() => {
    if (level >= MAX_LEVEL) return { current: XP_PER_LEVEL, levelTarget: XP_PER_LEVEL, pct: 100, maxed: true };
    const pct = Math.round((xpProgressInfo.inLevel / xpProgressInfo.levelTarget) * 100);
    return { current: xpProgressInfo.inLevel, levelTarget: xpProgressInfo.levelTarget, pct, maxed: false };
  }, [level, xpProgressInfo]);

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    resetProgress();
    setResetArmed(false);
  };

  const chartData = useMemo(() => (readingLogs || []).slice(-7).map(l => ({ ...l, dateShort: l.date.split('-').slice(1).join('/') })), [readingLogs]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
              <main className="container flex-1 py-8 sm:py-12 mb-24 sm:mb-0">

        <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12">
        
        {/* Header Elite */}
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-4xl tracking-tight">Tu Legado</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Perfil de Lector Omega</p>
          </div>
          <button onClick={toggleTheme} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-secondary/50 border border-border/50 shadow-lg">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </header>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          <div className="space-y-12">
            {/* Mascot & Level Elite */}
            <section className="static-card !bg-foreground p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-12 text-background premium-shadow overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12"><Trophy className="h-64 w-64" /></div>
              <div className="w-48 shrink-0 relative z-10"><CatMascot /></div>
              <div className="flex-1 space-y-8 relative z-10 w-full">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Award className="h-6 w-6 text-primary" />
                    <span className="font-display text-4xl tracking-tighter">Nivel {level}</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Maestro de la Biblioteca</p>
                </div>
                
                <div className="space-y-3">
                  <div className="h-3 w-full bg-background/20 rounded-full overflow-hidden">
                    <div className="h-full bg-background shadow-[0_0_20px_rgba(255,255,255,0.5)]" style={{ width: `${progress.pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                    <span>{progress.current} XP</span>
                    <span>{progress.maxed ? "MAX" : `${progress.levelTarget} XP`}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background/10 rounded-2xl border border-background/10 backdrop-blur-sm">
                    <Flame className="h-4 w-4 mb-2 text-orange-400" />
                    <p className="text-2xl font-display leading-none">{streak}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-1">Días de Racha</p>
                  </div>
                  <div className="p-4 bg-background/10 rounded-2xl border border-background/10 backdrop-blur-sm">
                    <BookOpen className="h-4 w-4 mb-2 text-blue-400" />
                    <p className="text-2xl font-display leading-none">{readBooks.length}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-1">Libros Leídos</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Quote Elite */}
            <section className="relative p-12 text-center overflow-hidden rounded-[2.5rem] bg-secondary/30">
              <Quote className="absolute top-8 left-8 h-12 w-12 opacity-5" />
              <blockquote className="relative z-10 font-display text-2xl leading-relaxed italic" key={quoteIndex}>
                “{BOOK_QUOTES[quoteIndex].quote}”
              </blockquote>
              <cite className="block mt-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40 not-italic">— {BOOK_QUOTES[quoteIndex].author}</cite>
            </section>

            {/* Stats Elite */}
            <section className="static-card p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-xl"><BarChart2 className="h-5 w-5 opacity-40" /></div>
                  <h3 className="font-display text-2xl tracking-tight">Actividad Semanal</h3>
                </div>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="dateShort" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="pages" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'var(--primary)' : 'var(--foreground)'} fillOpacity={index === chartData.length - 1 ? 1 : 0.1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            {/* Achievements Elite */}
            <section className="static-card p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 opacity-40" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Medallas</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "first-book", title: "Primer Paso", icon: "📖", desc: "Termina tu primer libro" },
                  { id: "reader-5", title: "Lector Constante", icon: "📚", desc: "Termina 5 libros" },
                  { id: "xp-500", title: "Sabio", icon: "🧠", desc: "Alcanza 500 XP" },
                  { id: "streak-3", title: "Hábito Formado", icon: "🔥", desc: "Racha de 3 días" },
                  { id: "marathon", title: "Maratonista", icon: "⚡", desc: "Lee 60 min en total" },
                  { id: "library-omega", title: "Omega", icon: "Ω", desc: "Alcanza el nivel 20" }
                ].map(badge => {
                  const unlocked = achievements?.find(a => a.id === badge.id);
                  return (
                    <div 
                      key={badge.id} 
                      className={`aspect-square rounded-2xl flex items-center justify-center text-2xl shadow-inner relative ${
                        unlocked ? "bg-primary/20" : "bg-secondary/20 grayscale opacity-20"
                      }`}
                      title={`${badge.title}: ${badge.desc}${unlocked ? "" : " (Bloqueado)"}`}
                      aria-label={`${badge.title}: ${badge.desc}${unlocked ? "" : " (Bloqueado)"}`}
                    >
                      {badge.icon}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Missions Elite */}
            <section className="static-card p-6 space-y-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <Zap className="h-4 w-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Misiones Diarias</h4>
              </div>
              <div className="space-y-4">
                {[
                  { id: 'pages', title: 'Lector del Día', desc: 'Lee 5 páginas', target: 5, current: readingLogs?.find(l => l.date === new Date().toISOString().slice(0, 10))?.pages || 0, xp: 20 },
                  { id: 'time', title: 'Maratón', desc: 'Lee 10 minutos', target: 10, current: readingLogs?.find(l => l.date === new Date().toISOString().slice(0, 10))?.timeMinutes || 0, xp: 30 }
                ].map(m => (
                  <div key={m.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold">{m.title}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{m.desc}</p>
                      </div>
                      <span className="text-[8px] font-black text-primary">+{m.xp} XP</span>
                    </div>
                    <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reset Elite */}
            <button
              onClick={handleReset}
              className={`w-full py-8 rounded-3xl border-2 border-dashed text-[10px] font-black uppercase tracking-[0.2em] ${
                resetArmed ? "bg-destructive text-destructive-foreground border-destructive" : "border-border/50 opacity-40"
              }`}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {resetArmed ? "Confirmar Reseteo" : "Resetear Progreso"}
            </button>
          </aside>
        </div>
        </div>
      </main>
    </div>
  );
}
