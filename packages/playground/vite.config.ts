import { resolve } from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePluginRadar } from "vite-plugin-radar";

const analyticsId = process.env["GOOGLE_ANALYTICS_ID"] || "";

export default defineConfig(({ mode }) => {
  process.env["VITE_APP_TITLE"] =
    mode === "production"
      ? "Salesforce Apex Formatter"
      : `[${mode}] Salesforce Apex Formatter`;
  return {
    root: resolve(__dirname, "src"),
    server: {
      port: 5173,
      strictPort: true,
    },
    plugins: [
      react(),
      VitePluginRadar({
        enableDev: true,
        analytics: {
          id: analyticsId,
        },
      }),
    ],
    build: {
      emptyOutDir: false,
      outDir: resolve(__dirname, "dist"),
    },
  };
});
