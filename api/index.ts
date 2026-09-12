import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

// Algunos rewrites de Vercel pueden entregar a la función la ruta sin el
// prefijo /api. Normalizamos solo esas rutas y dejamos intactos los assets.
app.use((req, _res, next) => {
  if (req.url === "/oauth/callback" || req.url.startsWith("/oauth/callback?")) {
    req.url = `/api${req.url}`;
  } else if (req.url === "/trpc" || req.url.startsWith("/trpc/")) {
    req.url = `/api${req.url}`;
  }
  next();
});

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "library-omega" });
});

export default app;
