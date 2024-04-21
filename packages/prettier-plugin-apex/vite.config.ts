import { resolve } from "path";
// eslint-disable-next-line import/no-extraneous-dependencies, import/extensions -- vitest is in devDependencies and it's fine
import { defineConfig } from "vitest/config";

const ENABLE_COVERAGE = !!process.env["CI"];

export default defineConfig({
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
  test: {
    coverage: {
      enabled: ENABLE_COVERAGE,
    },
    setupFiles: ["tests_config/run-spec.ts"],
  },
});
