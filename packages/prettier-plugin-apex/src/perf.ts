import { performance } from "node:perf_hooks";

// Env-gated performance instrumentation for the benchmark harness.
//
// This module is a no-op unless the APEX_PERF environment variable is set, so
// it has effectively zero cost (a single env lookup per mark) during normal
// formatting. The harness sets APEX_PERF, resets the marks before each
// `prettier.format` call, and reads them back afterwards to derive per-phase
// timings. The check is done at call time (rather than cached at import) so the
// harness doesn't have to worry about import ordering relative to setting the
// env var.

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
