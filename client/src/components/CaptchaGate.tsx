import { useState, useEffect } from "react";
import { ShieldCheck, RefreshCw, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { readStorage, removeStorage, writeStorage } from "@/lib/safeStorage";

interface CaptchaGateProps {
  onVerify: (email: string) => void;
}

export default function CaptchaGate({ onVerify }: CaptchaGateProps) {
  const { loading } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(() => {
    const saved = readStorage("omega_lock_until", "local");
    if (saved) {
      const until = parseInt(saved, 10);
      return until > Date.now() ? until : null;
    }
    return null;
  });

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!lockUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockUntil(null);
        removeStorage("omega_lock_until", "local");
        setAttempts(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newCode = "";
    for (let i = 0; i < 5; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(newCode);
    setInput("");
    setError("");
  };

  useEffect(() => {
    generateCode();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockUntil) return;

    if (!email || !email.includes("@")) {
      setError("Por favor ingresa un correo válido");
      return;
    }

    if (input.toUpperCase() === code) {
      onVerify(email);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        const until = Date.now() + 5 * 60 * 1000;
        setLockUntil(until);
        writeStorage("omega_lock_until", until.toString(), "local");
        setError("Demasiados intentos. Bloqueado por 5 minutos.");
      } else {
        setError(`Código incorrecto. Intentos: ${newAttempts}/3`);
        generateCode();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-black px-4">
      <div className="w-full max-w-sm border-2 border-black dark:border-white bg-white dark:bg-black p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,0.1)] animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-black dark:border-white bg-secondary dark:bg-white/10">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Acceso Protegido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifica que eres humano para entrar a Library Omega.
          </p>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => startLogin()}
            disabled={loading || !!lockUntil}
            className="h-14 w-full border-2 border-black dark:border-white bg-foreground text-background text-base font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Entrar con Google
          </Button>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-border"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">O usar invitado</span>
            <div className="h-[1px] flex-1 bg-border"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest">Correo de Invitado</label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!lockUntil}
                className="w-full border-2 border-black dark:border-white bg-transparent px-4 py-3 text-sm font-bold outline-none transition-colors focus:bg-secondary dark:focus:bg-white/10 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div 
                className="flex flex-1 items-center justify-center border-2 border-black dark:border-white bg-secondary dark:bg-white/10 py-4 text-3xl font-bold tracking-[0.5em] italic select-none"
                style={{ 
                  textShadow: "2px 2px 0px rgba(0,0,0,0.1)",
                  backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                  backgroundSize: "12px 12px"
                }}
              >
                {code}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={generateCode}
                className="h-16 w-16 border-2 border-black dark:border-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black"
              >
                <RefreshCw className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Ingresa el código"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!!lockUntil}
                className={`w-full border-2 border-black dark:border-white bg-transparent px-4 py-3 text-center text-lg font-bold uppercase tracking-widest outline-none transition-colors focus:bg-secondary dark:focus:bg-white/10 ${
                  error ? "border-border bg-secondary dark:bg-secondary/30" : ""
                }`}
              />
              {error && (
                <p className="text-center text-xs font-bold uppercase text-foreground">
                  {error}
                </p>
              )}
              {lockUntil && (
                <p className="text-center text-xs font-bold uppercase text-black animate-pulse">
                  Desbloqueo en: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!!lockUntil}
            className="h-14 w-full border-2 border-black dark:border-white bg-black dark:bg-white text-base font-bold uppercase tracking-widest text-white dark:text-black transition-all hover:bg-black/90 dark:hover:bg-white/90 active:scale-[0.98] disabled:bg-gray-400 disabled:border-gray-400"
          >
            {lockUntil ? (
              <><Lock className="mr-2 h-5 w-5" /> Bloqueado</>
            ) : (
              <><ShieldCheck className="mr-2 h-5 w-5" /> Verificar y Entrar</>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Library Omega &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
