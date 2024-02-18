import { resolve } from "path";

// eslint-disable-next-line import/no-extraneous-dependencies -- this file is only used in dev mode
import react from "@vitejs/plugin-react";
// eslint-disable-next-line import/no-extraneous-dependencies -- we use the shared vite version from the root installation
import { defineConfig } from "vite";
// eslint-disable-next-line import/no-extraneous-dependencies -- this file is only used in dev mode
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
