/**
 * CatMascot — Silueta de gato Elite.
 * Diseño premium con sombras profundas y animaciones suaves.
 */
import { useState } from "react";
import { levelTitle, levelMessage, useLibrary } from "@/lib/libraryStore";
import BrandMark from "@/components/BrandMark";
import { Flame, RotateCcw, Zap, Sparkles } from "lucide-react";


export default function CatMascot() {
  const { level, xp, streak, xpProgressInfo, resetProgress } = useLibrary();
  const [confirmReset, setConfirmReset] = useState(false);
  const title = levelTitle(level);
  const message = levelMessage(level);
  const progressPercent = xpProgressInfo.levelTarget > 0
    ? Math.round((xpProgressInfo.inLevel / xpProgressInfo.levelTarget) * 100)
    : 100;

  return (
    <div className="catalog-card p-6 bg-card premium-shadow text-card-foreground sm:p-8">
      {/* Medalla de nivel Elite */}
      <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-xl ring-4 ring-background">
        <div className="flex flex-col items-center leading-none">
          <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">Nv.</span>
          <span className="text-lg font-black">{level}</span>
        </div>
      </div>

      <div className="mb-7 flex justify-center">
        <div className="relative h-40 w-40 sm:h-48 sm:w-48">
          <BrandMark size="lg" label="Logo Library Omega, gatito con símbolo Omega" />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-display text-3xl tracking-tight">{title}</h3>
        <p className="text-[10px] font-medium text-muted-foreground max-w-[200px] mx-auto leading-relaxed opacity-80">
          {message}
        </p>
      </div>

      <div className="mt-9 space-y-7">
        <div className="grid grid-cols-2 gap-4">
          <div className="group flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-foreground p-5 text-background shadow-lg transition-transform hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-foreground shadow-inner">
              <Flame className={`h-7 w-7 ${streak > 0 ? 'text-foreground' : 'opacity-40'}`} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-black tabular-nums leading-none">{streak}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-background/60">Días de racha</span>
          </div>
          <div className="group flex flex-col items-center gap-2 rounded-3xl border border-border/60 bg-secondary/80 p-5 text-foreground shadow-lg transition-transform hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-inner">
              <Zap className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-black tabular-nums leading-none">{xp}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] opacity-55">XP total</span>
          </div>
        </div>

        {/* Barra de XP Elite */}
        <div className="rounded-3xl border border-border/60 bg-secondary/50 p-5 shadow-inner">
          <div className="mb-3 flex items-end justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Progreso de nivel</span>
            <span className="text-2xl font-black tabular-nums leading-none">{progressPercent}%</span>
          </div>
          <div className="xp-progress-bar h-5 rounded-full border-2 border-border/60 bg-background/70 p-1 shadow-inner">
            <div
              className="xp-progress-fill h-full rounded-full bg-foreground shadow-[0_0_16px_rgba(0,0,0,0.28)] transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              window.setTimeout(() => setConfirmReset(false), 4000);
              return;
            }
            resetProgress();
            setConfirmReset(false);
          }}
          className={`w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl ${
            confirmReset
              ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20"
              : "bg-secondary text-muted-foreground shadow-sm"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {confirmReset ? "Confirmar Reseteo" : "Reiniciar Progreso"}
        </button>
      </div>
    </div>
  );
}
