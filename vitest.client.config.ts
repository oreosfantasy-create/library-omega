import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  esbuild: {
    // Los componentes (p. ej. ReaderModal) no importan React: inyectarlo
    // automáticamente para que el JSX compile sin "React is not defined".
    jsxInject: `import React from "react";`,
  },
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["client/**/*.test.tsx", "client/**/*.spec.ts"],
  },
});
