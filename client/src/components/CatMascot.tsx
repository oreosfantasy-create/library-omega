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
    <div className="catalog-card p-6 bg-card premium-shadow text-card-foreground">
      {/* Medalla de nivel Elite */}
      <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-xl ring-4 ring-background">
        <div className="flex flex-col items-center leading-none">
          <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">Nv.</span>
          <span className="text-lg font-black">{level}</span>
        </div>
      </div>

      <div className="mb-6 flex justify-center">
        <div className="relative h-32 w-32">
          <BrandMark size="lg" label="Logo Library Omega, gatito con símbolo Omega" />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-display text-2xl tracking-tight">{title}</h3>
        <p className="text-[10px] font-medium text-muted-foreground max-w-[200px] mx-auto leading-relaxed opacity-80">
          {message}
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-secondary/50 border border-border/50">
            <div className="flex items-center gap-1.5 text-foreground">
              <Flame className={`h-4 w-4 ${streak > 0 ? 'text-foreground' : 'opacity-40'}`} />
              <span className="text-xs font-black tabular-nums">{streak}</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Días Racha</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-secondary/50 border border-border/50">
            <div className="flex items-center gap-1.5 text-foreground">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-black tabular-nums">{xp}</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Total XP</span>
          </div>
        </div>

        {/* Barra de XP Elite */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
            <span>Progreso de Nivel</span>
            <span className="tabular-nums">{progressPercent}%</span>
          </div>
          <div className="xp-progress-bar bg-secondary/80 h-3 p-0.5 border border-border/50">
            <div
              className="xp-progress-fill rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)]"
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
