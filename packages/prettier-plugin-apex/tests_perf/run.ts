#!/usr/bin/env -S tsx
//
// Performance harness for prettier-plugin-apex.
//
// Benchmarks the DEFAULT parser mode (whatever `apexStandaloneParser.default`
// resolves to in src/index.ts — currently "native") so that the numbers reflect
// the experience of someone adopting the project without any extra setup. It
// breaks a format down into four buckets using the env-gated marks in
// src/parser.ts:
//
//   transport   - process spawn / HTTP + jorje parse + Java-side serialization
//                 + receiving the payload (opaque; can't be split from JS)
//   deserialize - JSON.parse of the serialized AST
//   prepping    - post-deserialize enrichment (comment extraction, line
//                 indexes, and the DFS location/metadata walk)
//   printing    - everything after parse() returns: Prettier's comment
//                 attachment + the doc-IR print walk
//
// Usage:
//   pnpm tsx tests_perf/run.ts [--warmup N] [--iterations N] [--out file.json] [--raw]
//   pnpm tsx tests_perf/run.ts compare base.json head.json
//
process.env["APEX_PERF"] = "1"; // enable parser.ts marks before importing the plugin

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

import * as apex from "../src/index.js";
import { perfGetMarks, perfReset } from "../src/perf.js";
import {
  NATIVE_PACKAGES,
  getNativeExecutableNameForPlatform,
} from "../src/util.js";

const PKG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const MAIN_BUCKETS = [
  "transport",
  "deserialize",
  "prepping",
  "printing",
  "total",
] as const;
// Sub-breakdown of `transport`, only populated for spawn-based modes whose
// serializer emits Java-side timings (native / JVM, not built-in HTTP):
// jorje parse, XStream serialize, and the spawn/IPC residual.
const SUB_BUCKETS = ["java-parse", "java-serialize", "spawn-ipc"] as const;
const BUCKETS = [...MAIN_BUCKETS, ...SUB_BUCKETS] as const;
type Bucket = (typeof BUCKETS)[number];

const CORPUS: { name: string; file: string }[] = [
  { name: "Comments.cls (real)", file: "tests/comments/Comments.cls" },
  { name: "SOQLClass.cls (real)", file: "tests/soql/SOQLClass.cls" },
  {
    name: "ExpressionClass.cls (real)",
    file: "tests/expression/ExpressionClass.cls",
  },
  {
    name: "PerfBenchmarkLarge.cls (generated)",
    file: "tests_perf/corpus/PerfBenchmarkLarge.cls",
  },
];

interface Stats {
  median: number;
  mean: number;
  stddev: number;
  cv: number;
  n: number;
}
type FileResult = Record<Bucket, Stats>;

function stats(xs: number[]): Stats {
  const sorted = [...xs].sort((a, b) => a - b);
  const n = sorted.length;
  const median =
    n === 0
      ? 0
      : n % 2
        ? (sorted[(n - 1) / 2] as number)
        : ((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2;
  const mean = n ? xs.reduce((a, b) => a + b, 0) / n : 0;
  const variance =
    n > 1 ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const stddev = Math.sqrt(variance);
  const cv = mean ? (stddev / mean) * 100 : 0;
  return { median, mean, stddev, cv, n };
}

function resolvedDefaultMode(): string {
  // The plugin's declared default for apexStandaloneParser.
  const opt = (apex.options as Record<string, { default?: unknown }>)
    .apexStandaloneParser;
  return String(opt?.default ?? "unknown");
}

// Detects whether the real native binary is present. When it isn't, the plugin
// silently falls back to the JVM serializer, which has very different (slower)
// startup — so the numbers would NOT reflect the true default experience.
function nativeBinaryPresent(): boolean {
  const key = `${process.platform}-${process.arch}`;
  const pkg = NATIVE_PACKAGES[key];
  if (!pkg) return false;
  try {
    const require = module.createRequire(import.meta.url);
    require.resolve(path.join(pkg, getNativeExecutableNameForPlatform(key)));
    return true;
  } catch {
    return false;
  }
}

function optionDefault(name: string): string {
  const opt = (apex.options as Record<string, { default?: unknown }>)[name];
  return String(opt?.default ?? "");
}

async function serverReachable(): Promise<boolean> {
  const host = optionDefault("apexStandaloneHost") || "localhost";
  const port = optionDefault("apexStandalonePort") || "2117";
  const protocol = optionDefault("apexStandaloneProtocol") || "http";
  try {
    const res = await fetch(`${protocol}://${host}:${port}/api/ast/`);
    return res.ok;
  } catch {
    return false;
  }
}

async function precheck(mode: string): Promise<{ usingFallback: boolean }> {
  let usingFallback = false;
  if (mode === "native" && !nativeBinaryPresent()) {
    usingFallback = true;
    console.warn(
      "\n\x1b[33m⚠  Native binary not found for this platform.\x1b[0m",
    );
    console.warn(
      "   'native' mode will silently fall back to the JVM serializer.",
    );
    console.warn(
      "   The 'transport' bucket will reflect JVM startup, NOT real native.",
    );
    console.warn(
      "   Use the interactive harness (pnpm run benchmark) to download or build a binary.\n",
    );
  } else if (mode === "built-in" && !(await serverReachable())) {
    console.warn(
      "\n\x1b[33m⚠  Built-in parser server is not reachable.\x1b[0m",
    );
    console.warn(
      "   Start it first: pnpm run start-server (or use pnpm run benchmark).\n",
    );
  }
  return { usingFallback };
}

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: PKG_ROOT })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

async function benchFile(
  src: string,
  warmup: number,
  iterations: number,
  collectRaw: boolean,
  parserOverride?: string,
): Promise<{ result: FileResult; raw?: Record<Bucket, number[]> }> {
  const samples = Object.fromEntries(
    BUCKETS.map((b) => [b, [] as number[]]),
  ) as Record<Bucket, number[]>;

  // Only pass apexStandaloneParser when explicitly overridden; otherwise the
  // plugin's own default is exercised (the zero-config adopter experience).
  const formatOptions: prettier.Options = {
    parser: "apex",
    plugins: [apex as unknown as prettier.Plugin],
    ...(parserOverride ? { apexStandaloneParser: parserOverride } : {}),
  };

  for (let i = 0; i < warmup + iterations; i++) {
    perfReset();
    const t0 = performance.now();
    await prettier.format(src, formatOptions);
    const t1 = performance.now();
    if (i < warmup) continue;

    const m = perfGetMarks();
    const transport = (m.transportEnd ?? 0) - (m.transportStart ?? 0);
    samples.transport.push(transport);
    samples.deserialize.push((m.deserializeEnd ?? 0) - (m.transportEnd ?? 0));
    samples.prepping.push((m.prepEnd ?? 0) - (m.deserializeEnd ?? 0));
    samples.printing.push(t1 - (m.prepEnd ?? 0));
    samples.total.push(t1 - t0);
    // Java-side timings (ms), recorded via the serializer's temp file. Absent
    // (0) for the built-in HTTP path, which emits no per-call timing.
    const javaParse = m.javaParseMs ?? 0;
    const javaSerialize = m.javaSerializeMs ?? 0;
    samples["java-parse"].push(javaParse);
    samples["java-serialize"].push(javaSerialize);
    // Clamp: the JS-clock transport vs Java nanoTime brackets can differ by
    // measurement noise, which would otherwise show a tiny negative residual.
    samples["spawn-ipc"].push(
      Math.max(0, transport - javaParse - javaSerialize),
    );
  }

  const result = Object.fromEntries(
    BUCKETS.map((b) => [b, stats(samples[b])]),
  ) as FileResult;
  return collectRaw ? { result, raw: samples } : { result };
}

function fmt(n: number, width = 9): string {
  return n.toFixed(3).padStart(width);
}

function printRow(label: string, s: Stats): void {
  console.log(
    `  ${label}${fmt(s.median)}${fmt(s.mean, 10)}${fmt(s.stddev, 10)}${s.cv.toFixed(1).padStart(8)}`,
  );
}

function printFileTable(name: string, r: FileResult): void {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
  console.log(
    `  ${"bucket".padEnd(12)}${"median".padStart(9)}${"mean".padStart(10)}${"stddev".padStart(10)}${"cv%".padStart(8)}`,
  );
  for (const b of MAIN_BUCKETS) {
    const label =
      b === "total" ? `\x1b[1m${b}\x1b[0m`.padEnd(12 + 8) : b.padEnd(12);
    printRow(label, r[b]);
  }
  // Only show the transport breakdown when the serializer emitted Java timings.
  if (r["java-parse"].median > 0 || r["java-serialize"].median > 0) {
    console.log("  \x1b[2m└ transport breakdown:\x1b[0m");
    for (const b of SUB_BUCKETS) {
      printRow(`  ${b}`.padEnd(12), r[b]);
    }
  }
}

function parseFlags(argv: string[]): {
  warmup: number;
  iterations: number;
  out?: string;
  raw: boolean;
  parser?: string;
} {
  let warmup = 5;
  let iterations = 30;
  let out: string | undefined;
  let raw = false;
  let parser: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--warmup") warmup = Number(argv[++i]);
    else if (a === "--iterations") iterations = Number(argv[++i]);
    else if (a === "--out") out = argv[++i];
    else if (a === "--raw") raw = true;
    // --parser overrides the mode benchmarked. Omit it to exercise the
    // plugin's own default (what a zero-config adopter gets), which is the
    // CI default. The interactive wizard passes this explicitly.
    else if (a === "--parser") parser = argv[++i];
  }
  return { warmup, iterations, out, raw, parser };
}

async function runBenchmark(argv: string[]): Promise<void> {
  const { warmup, iterations, out, raw, parser } = parseFlags(argv);
  const mode = parser ?? resolvedDefaultMode();
  const { usingFallback } = await precheck(mode);

  const modeLabel = parser ? `${mode} (explicit)` : `${mode} (plugin default)`;
  console.log(
    `\nBenchmarking mode: \x1b[1m${modeLabel}\x1b[0m${usingFallback ? " \x1b[33m(JVM fallback)\x1b[0m" : ""}`,
  );
  console.log(
    `Node ${process.version}, ${process.platform}-${process.arch}, ${warmup} warmup + ${iterations} measured iterations/file (times in ms)`,
  );

  const results: Record<string, FileResult> = {};
  const rawResults: Record<string, Record<Bucket, number[]>> = {};

  for (const entry of CORPUS) {
    const abs = path.join(PKG_ROOT, entry.file);
    if (!existsSync(abs)) {
      console.warn(`  skipping ${entry.name}: file not found (${entry.file})`);
      continue;
    }
    const src = readFileSync(abs, "utf8");
    const { result, raw: rawSamples } = await benchFile(
      src,
      warmup,
      iterations,
      raw,
      parser,
    );
    results[entry.name] = result;
    if (rawSamples) rawResults[entry.name] = rawSamples;
    printFileTable(entry.name, result);
  }

  if (out) {
    const payload = {
      meta: {
        mode,
        explicitParser: parser ?? null,
        usingFallback,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        warmup,
        iterations,
        gitSha: gitSha(),
        timestamp: new Date().toISOString(),
      },
      results,
      ...(raw ? { raw: rawResults } : {}),
    };
    const outAbs = path.isAbsolute(out) ? out : path.join(PKG_ROOT, out);
    mkdirSync(path.dirname(outAbs), { recursive: true });
    writeFileSync(outAbs, JSON.stringify(payload, null, 2));
    console.log(`\nWrote results to ${outAbs}`);
  }
}

// Renders the base-vs-head comparison as GitHub-flavored markdown, for the CI
// job summary and the sticky PR comment. Kept here (rather than in the workflow)
// so the bucket list and delta math stay shared with the console renderer.
function compareMarkdown(baseFile: string, headFile: string): string {
  const base = JSON.parse(readFileSync(baseFile, "utf8"));
  const head = JSON.parse(readFileSync(headFile, "utf8"));
  const m = head.meta ?? {};
  const out: string[] = [];
  out.push(
    `## Performance benchmark — base \`${base.meta?.gitSha ?? "?"}\` vs head \`${head.meta?.gitSha ?? "?"}\``,
  );
  out.push("");
  out.push(
    `Mode: \`${m.mode ?? "?"}\` · ${m.node ?? "?"} · ${m.platform ?? "?"}-${m.arch ?? "?"} · ${m.warmup ?? "?"} warmup + ${m.iterations ?? "?"} measured iterations`,
  );
  if (base.meta?.mode !== head.meta?.mode) {
    out.push("");
    out.push(
      `> ⚠️ Mode mismatch: base=\`${base.meta?.mode}\` head=\`${head.meta?.mode}\``,
    );
  }
  out.push("");
  out.push(
    "> ⚠️ Run on a shared GitHub-hosted runner, report-only. Both sides ran back-to-back on the same machine to cancel hardware variance, but small deltas (a few %) are still noise — look for consistent, sizeable shifts.",
  );

  for (const name of Object.keys(head.results)) {
    const b: FileResult | undefined = base.results[name];
    const h: FileResult = head.results[name];
    if (!b) continue;
    const hasSub = h["java-parse"].median > 0 || h["java-serialize"].median > 0;
    out.push("");
    out.push(`### ${name}`);
    out.push("");
    out.push("| bucket | base (ms) | head (ms) | Δ (ms) | Δ% |");
    out.push("| --- | ---: | ---: | ---: | ---: |");
    for (const bucket of BUCKETS) {
      if (!b[bucket] || !h[bucket]) continue;
      const isSub = (SUB_BUCKETS as readonly string[]).includes(bucket);
      if (isSub && !hasSub) continue;
      const bm = b[bucket].median;
      const hm = h[bucket].median;
      const delta = hm - bm;
      const pct = bm ? (delta / bm) * 100 : 0;
      const label =
        bucket === "total"
          ? "**total**"
          : isSub
            ? `└ ${bucket}`
            : bucket;
      const pctStr = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
      out.push(
        `| ${label} | ${bm.toFixed(3)} | ${hm.toFixed(3)} | ${delta >= 0 ? "+" : ""}${delta.toFixed(3)} | ${pctStr} |`,
      );
    }
  }
  out.push("");
  return out.join("\n");
}

function runCompare(baseFile: string, headFile: string): void {
  const base = JSON.parse(readFileSync(baseFile, "utf8"));
  const head = JSON.parse(readFileSync(headFile, "utf8"));
  console.log(
    `\nComparing median times (ms)  base=${base.meta?.gitSha ?? "?"}  head=${head.meta?.gitSha ?? "?"}`,
  );
  if (base.meta?.mode !== head.meta?.mode) {
    console.warn(
      `  \x1b[33m⚠ mode mismatch: base=${base.meta?.mode} head=${head.meta?.mode}\x1b[0m`,
    );
  }
  for (const name of Object.keys(head.results)) {
    const b: FileResult | undefined = base.results[name];
    const h: FileResult = head.results[name];
    if (!b) continue;
    console.log(`\n\x1b[1m${name}\x1b[0m`);
    console.log(
      `  ${"bucket".padEnd(12)}${"base".padStart(10)}${"head".padStart(10)}${"delta".padStart(10)}${"delta%".padStart(9)}`,
    );
    for (const bucket of BUCKETS) {
      // Tolerate result files from an older harness without the sub-buckets.
      if (!b[bucket] || !h[bucket]) continue;
      const bm = b[bucket].median;
      const hm = h[bucket].median;
      const delta = hm - bm;
      const pct = bm ? (delta / bm) * 100 : 0;
      const sign = delta > 0 ? "\x1b[31m" : delta < 0 ? "\x1b[32m" : "";
      console.log(
        `  ${bucket.padEnd(12)}${fmt(bm, 10)}${fmt(hm, 10)}${sign}${fmt(delta, 10)}${`${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`.padStart(9)}\x1b[0m`,
      );
    }
  }
}

const [, , maybeSub, ...rest] = process.argv;
if (maybeSub === "compare") {
  const positional = rest.filter((a) => !a.startsWith("--"));
  if (positional.length < 2) {
    console.error("Usage: run.ts compare base.json head.json [--markdown]");
    process.exit(1);
  }
  const [baseFile, headFile] = positional as [string, string];
  if (rest.includes("--markdown")) {
    // Emit only the markdown report to stdout, so CI can pipe it straight into
    // $GITHUB_STEP_SUMMARY / a PR comment without ANSI noise.
    process.stdout.write(compareMarkdown(baseFile, headFile));
  } else {
    runCompare(baseFile, headFile);
  }
} else {
  await runBenchmark(process.argv.slice(2));
}
