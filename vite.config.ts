import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite"; // <--- Importamos o Tailwind de volta!

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tsconfigPaths(),
    tailwindcss(), // <--- Ativamos o processador do Tailwind!
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  optimizeDeps: {
    exclude: [
      "@tanstack/start",
      "@tanstack/start-server-core",
      "#tanstack-router-entry",
      "#tanstack-start-entry",
      "#tanstack-start-plugin-adapters"
    ]
  }
});