import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

const buildMode = process.env["BUILD_MODE"] || "site";

export default defineConfig(
  buildMode === "library"
    ? {
        build: {
          emptyOutDir: false,
          lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, "src/index.ts"),
            name: "prettierPlugins.apex",
            // the proper extensions will be added
            fileName: "src/standalone",
            formats: ["umd"],
          },
          rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ["prettier", "fetch"],
            output: {
              // Provide global variables to use in the UMD build
              // for externalized deps
              globals: {
                prettier: "prettier",
                fetch: "fetch",
              },
            },
          },
        },
      }
    : {
        root: resolve(__dirname, "playground"),
        build: {
          emptyOutDir: false,
          outDir: resolve(__dirname, "dist", "playground"),
          rollupOptions: {
            // input: {
            //   main: resolve(__dirname, "playground/index.html"),
            // },
            plugins: [react()],
          },
        },
      },
);
