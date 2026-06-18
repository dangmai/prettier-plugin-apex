import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

// Env-gated performance instrumentation for the benchmark harness.
//
// This module is a no-op unless the APEX_PERF environment variable is set, so
// it has effectively zero cost during normal formatting. The harness sets
// APEX_PERF, resets the marks before each `prettier.format` call, and reads them
// back afterwards to derive per-phase timings. The check is done at call time
// (rather than cached at import) so the harness doesn't have to worry about
// import ordering relative to setting the env var.
//
// All the conditional logic lives here (this file is excluded from coverage as
// instrumentation) so callers in parser.ts are plain, covered call sites.

export type PerfMarks = Record<string, number>;

let marks: PerfMarks = {};

export function perfMark(name: string): void {
  if (process.env["APEX_PERF"]) {
    marks[name] = performance.now();
  }
}

export function perfReset(): void {
  marks = {};
}

export function perfGetMarks(): PerfMarks {
  return { ...marks };
}

// Returns a unique temp-file path for the serializer to write its Java-side
// timings to, or "" when benchmarking is disabled. Passed to the spawned
// process as APEX_PERF_FILE; the serializer ignores an empty value. A unique
// path per call keeps concurrent formats from colliding.
export function perfSpawnFile(): string {
  if (!process.env["APEX_PERF"]) return "";
  return path.join(os.tmpdir(), `apex-perf-${crypto.randomUUID()}.json`);
}

// Reads the serializer's timing file (if any) into the marks map and removes
// it. Silently ignores a missing/old file (e.g. a serializer build without
// timing support).
export function perfReadSpawnFile(file: string): void {
  if (!file) return;
  try {
    const timings = JSON.parse(fs.readFileSync(file, "utf8"));
    marks["javaParseMs"] = timings.parseNs / 1e6;
    marks["javaSerializeMs"] = timings.serializeNs / 1e6;
    fs.unlinkSync(file);
  } catch {
    // Older serializer without timing support, or the write failed.
  }
}
