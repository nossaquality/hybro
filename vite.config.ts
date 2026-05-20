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
    hmr: {
      clientPort: 443,
      protocol: "wss",
    },
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: [
      "@tanstack/react-start",
      "@tanstack/start-server-core",
    ],
  },
  resolve: {
    alias: {
      "@tanstack/start-server-core": "/dev/null",
    },
  },
});
