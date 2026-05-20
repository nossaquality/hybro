import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  // ISSO AQUI VAI FORÇAR O VITE A RESOLVER O FORMATO DO LOVABLE CORRETAMENTE:
  ssr: {
    noExternal: ["lovable-tagger", "@lovable.dev/vite-tanstack-config"],
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