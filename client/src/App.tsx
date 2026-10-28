import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LibraryProvider } from "./lib/libraryStore";
import Explore from "./pages/Explore";
import Home from "./pages/Home";
import Profile from "@/pages/Profile";
import Recommender from "@/pages/Recommender";

function Router() {
  // SPA sin dependencias de la URL: Home siempre visible.
  // Esto permite abrir la app con doble clic (protocolo file://)
  // donde la ruta del navegador no es "/".
  void NotFound;
  return (
    <Switch>
      <Route path="/">{() => <Home />}</Route>
      <Route path="/explorar">{() => <Explore />}</Route>
      <Route path="/perfil">{() => <Profile />}</Route>
      <Route path="/recomendador">{() => <Recommender />}</Route>
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster position="bottom-center" mobileOffset={{ bottom: "5.5rem" }} />
          <LibraryProvider>
            <Router />
          </LibraryProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
