import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tsconfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});