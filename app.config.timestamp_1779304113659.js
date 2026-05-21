// app.config.ts
import { defineConfig } from "@tanstack/react-start/config";
import tsconfigPaths from "vite-tsconfig-paths";
var app_config_default = defineConfig({
  tsr: {
    autoCodeSplitting: true
  },
  vite: {
    plugins: [tsconfigPaths()]
  }
});
export {
  app_config_default as default
};
