---
description: >-
  Performance benchmark harness for prettier-plugin-apex. Measures where
  end-to-end formatting time goes, split into buckets — transport (process
  spawn + jorje parse + serialize + receive), deserialize (JSON.parse),
  prepping (the DFS enrichment in parser.ts), and printing — plus a Java-side
  split of transport into jorje-parse vs XStream-serialize vs spawn/IPC. Read
  this before changing benchmarking/profiling code or the instrumentation it
  depends on.
files:
  - packages/prettier-plugin-apex/tests_perf/run.ts
  - packages/prettier-plugin-apex/tests_perf/setup.ts
  - packages/prettier-plugin-apex/tests_perf/generate-corpus.ts
  - packages/prettier-plugin-apex/tests_perf/corpus/PerfBenchmarkLarge.cls
  - packages/prettier-plugin-apex/src/perf.ts
  - packages/prettier-plugin-apex/src/parser.ts
  - packages/apex-ast-serializer/parser/src/main/java/net/dangmai/serializer/Apex.java
---

# Performance harness

Tooling to understand where time goes when formatting Apex, so optimizations are
driven by numbers rather than guesses.

## Running it

- `pnpm run benchmark` — interactive wizard (`tests_perf/setup.ts`). Picks the
  mode (native recommended; built-in/JVM are investigation-only) and, for
  native, how to obtain the binary: use existing, download the latest `main`
  build via `gh`, or build from scratch. It's git-aware: when the Java
  serializer differs from `origin/main`, a downloaded binary would be stale, so
  it steers to build-from-scratch. It also accepts `--mode`/`--obtain` to run
  unattended.
- `pnpm run benchmark:core` — the non-interactive core (`tests_perf/run.ts`).
  CI uses this directly after building the native binary. Flags: `--parser`,
  `--warmup`, `--iterations`, `--out <json>`, `--raw`, and a `compare
  base.json head.json` subcommand.

The harness benchmarks whatever the plugin's **default** mode is (currently
`native`) unless `--parser` overrides it, so the numbers reflect a zero-config
adopter's experience.

## How the buckets are measured

- `src/perf.ts` is **env-gated instrumentation** — a no-op unless `APEX_PERF`
  is set. It holds `performance.now()` marks plus helpers that hand the
  serializer a temp file (`APEX_PERF_FILE`) and read its timings back. All the
  conditional logic lives here so `parser.ts` only has plain, covered call
  sites. It is excluded from coverage in `vite.config.ts`.
- `src/parser.ts` places marks at the parse seams (around the serializer call,
  after `JSON.parse`, after the DFS enrichment) and wires the spawn temp file.
- `Apex.java` (`getAST`) brackets jorje parse and XStream serialize with
  `nanoTime` and, when `apexPerfFile`/`APEX_PERF_FILE` is set, writes
  `{parseNs,serializeNs}` to that file. Stdout (the JSON payload) is never
  touched. **Never set `APEX_PERF_FILE` in the long-running server** — only the
  short-lived CLI spawn — or concurrent requests race on one file.

## Notes

- Corpus: three real fixtures plus a generated ~4k-line class
  (`generate-corpus.ts` → `corpus/PerfBenchmarkLarge.cls`) so the prep/print
  buckets rise above native-mode spawn noise.
- The instrumentation has effectively zero cost on the normal formatting path
  (one env-var check per mark) and never alters formatted output.
- `tests_perf/` is not published to npm (the package `files` allowlist only
  ships `dist` + `vendor`); the compiled `dist/src/perf.js` does ship since
  `parser.ts` imports it.
