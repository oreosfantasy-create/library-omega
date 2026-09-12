/**
 * LIBRARY OMEGA — Navbar Elite.
 * Diseño premium con efectos de desenfoque y navegación optimizada.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useLibrary } from "@/lib/libraryStore";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Flame, Award, Zap, X, Library, Search, User, ArrowLeft, LogIn, LogOut, Shield, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import BrandMark from "@/components/BrandMark";
import { useTheme } from "@/contexts/ThemeContext";

const ADMIN_PASSWORD = "omega2024";

export default function Navbar() {
  const { role, setRole, streak, level, xp } = useLibrary();
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const tabs: { path: string; label: string; icon: React.ReactNode }[] = [
    { path: "/", label: "Biblioteca", icon: <Library className="h-4 w-4" /> },
    { path: "/explorar", label: "Explorar", icon: <Search className="h-4 w-4" /> },
    { path: "/perfil", label: "Perfil", icon: <User className="h-4 w-4" /> },
  ];

  const handleAdminToggle = () => {
    if (role === "admin") {
      setRole("lector");
    } else {
      setShowPasswordDialog(true);
      setPasswordInput("");
    }
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setRole("admin");
      setShowPasswordDialog(false);
      setPasswordInput("");
      toast.success("Acceso Elite activado");
    } else {
      toast.error("Contraseña incorrecta");
      setPasswordInput("");
    }
  };

  return (
    <header className="omega-header sticky top-0 z-50 w-full">
      <div className="container flex min-w-0 h-[4.5rem] items-center justify-between gap-2 sm:h-24 sm:gap-5">
        {/* Marca Elite & Back Button */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          {location !== "/" && (
            <button 
              onClick={() => navigate("/")} 
              className="shrink-0 p-2 sm:p-3 bg-secondary/50 border border-border/50 rounded-xl sm:rounded-2xl hover:bg-foreground hover:text-background"
              title="Volver al inicio"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex min-w-0 cursor-pointer items-center gap-2.5 sm:gap-4" onClick={() => navigate("/")}>
            <div className="relative">
              <BrandMark size="sm" label="Library Omega, gatito con símbolo Omega" />
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
            </div>
            <div className="hidden sm:block leading-none">
              <h1 className="font-display text-xl tracking-[-0.04em] sm:text-2xl">Library <span className="text-primary">Omega</span></h1>
              <p className="text-[8px] font-black uppercase tracking-[0.28em] text-muted-foreground">Estudio Digital</p>
            </div>
          </div>
        </div>

        {/* Navegación Desktop Elite */}
        <nav aria-label="Navegación principal" className="omega-nav hidden md:flex items-center gap-1 p-1">
          {tabs.map((t) => {
            const isActive = location === t.path;
            return (
              <button
                key={t.path}
                onClick={() => navigate(t.path)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] ${
                  isActive
                    ? "bg-foreground text-background shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User & Stats Elite */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="omega-stats hidden lg:flex items-center gap-1 rounded-2xl p-1" aria-label="Progreso personal">
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" title="Días de racha">
              <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
              <div className="leading-none">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Racha</p>
                <span className="text-xs font-black tabular-nums">{streak}</span>
              </div>
            </div>
            <div className="h-7 w-px bg-border/60" aria-hidden="true" />
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" title="Nivel actual">
              <Award className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <div className="leading-none">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Nivel</p>
                <span className="text-xs font-black tabular-nums">{level}</span>
              </div>
            </div>
            <div className="h-7 w-px bg-border/60" aria-hidden="true" />
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" title="XP total">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
              <div className="leading-none">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">XP</p>
                <span className="text-xs font-black tabular-nums">{xp}</span>
              </div>
            </div>
          </div>

          <button type="button" onClick={() => toggleTheme?.()} className="omega-icon-button" title={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"} aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2">
              <div className="hidden xl:flex flex-col items-end leading-none mr-2">
                <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">{user?.name}</span>
                <span className="text-[8px] text-muted-foreground opacity-60 truncate max-w-[120px]">{user?.email}</span>
              </div>
              <button
                onClick={() => logout()}
                className="omega-icon-button hover:bg-destructive hover:text-destructive-foreground"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => startLogin()}
              disabled={loading}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-6 py-2.5 sm:py-3 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl hover:opacity-90 shadow-xl disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Entrar con Google</span>
            </button>
          )}

          <button
            onClick={handleAdminToggle}
            className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl ${
              role === "admin" 
                ? "bg-primary text-background shadow-lg" 
                : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/50"
            }`}
            title={role === "admin" ? "Modo Admin Activo" : "Acceso Admin"}
          >
            <Shield className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navegación Móvil Elite (Inferior) */}
      <nav aria-label="Navegación móvil" className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex md:hidden max-w-[calc(100vw-1rem)] items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-background/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-border/50 shadow-2xl premium-shadow overflow-x-auto">
        {tabs.map((t) => {
          const isActive = location === t.path;
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
                className={`flex shrink-0 items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl ${
                isActive
                  ? "bg-foreground text-background shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {isActive && <span>{t.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Diálogo de contraseña Elite */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md p-6">
          <div className="bg-card p-8 w-full max-w-md rounded-3xl border border-border/50 shadow-2xl premium-shadow">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-foreground text-background rounded-xl">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-display text-2xl tracking-tight">Acceso Elite</h3>
              </div>
              <button onClick={() => setShowPasswordDialog(false)} className="p-2 hover:bg-secondary rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={submitPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Contraseña de Seguridad</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordDialog(false)}
                  className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-foreground text-background px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 shadow-lg"
                >
                  Verificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
