#!/usr/bin/env -S tsx
//
// Interactive setup wizard for the performance harness (local use).
//
// Benchmarking the default mode means having the right parser artifact in place,
// and how you get it depends on what you're measuring. This wizard provisions
// the environment — choosing the mode, and for native, how to obtain the binary
// — then hands off to the non-interactive core (run.ts).
//
// In CI you do NOT use this; CI builds the native binary deterministically and
// calls run.ts directly.
//
// Usage:
//   pnpm run benchmark                      # interactive
//   pnpm run benchmark -- --mode native --obtain download [run flags...]   # scripted
//
// Run flags (--warmup, --iterations, --out, --raw) are forwarded to run.ts.
//
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { confirm, select } from "@inquirer/prompts";

import {
  NATIVE_PACKAGES,
  getNativeExecutableNameForPlatform,
} from "../src/util.js";

const PKG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const REPO_ROOT = path.resolve(PKG_ROOT, "../..");
const PLATFORM_KEY = `${process.platform}-${process.arch}`;
const NATIVE_NAME = getNativeExecutableNameForPlatform(PLATFORM_KEY);

type Mode = "native" | "built-in" | "none";
type Obtain = "existing" | "download" | "build";

function sh(
  command: string,
  args: string[],
  opts: { cwd?: string; allowFail?: boolean } = {},
): boolean {
  const res = spawnSync(command, args, {
    cwd: opts.cwd ?? REPO_ROOT,
    stdio: "inherit",
  });
  if (res.status !== 0 && !opts.allowFail) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
  return res.status === 0;
}

function capture(command: string, args: string[]): string | null {
  const res = spawnSync(command, args, { cwd: REPO_ROOT, encoding: "utf8" });
  return res.status === 0 ? res.stdout.trim() : null;
}

function nativeBinaryPresent(): boolean {
  const pkg = NATIVE_PACKAGES[PLATFORM_KEY];
  if (!pkg) return false;
  return existsSync(path.join(REPO_ROOT, "packages", pkg, NATIVE_NAME));
}

// True when the Java serializer differs from origin/main, in which case a
// downloaded main binary would be stale and only build-from-scratch is correct.
function javaChangedVsMain(): boolean | null {
  const ok =
    spawnSync("git", ["rev-parse", "--verify", "--quiet", "origin/main"], {
      cwd: REPO_ROOT,
    }).status === 0;
  if (!ok) return null; // can't tell without origin/main
  const res = spawnSync(
    "git",
    ["diff", "--quiet", "origin/main", "--", "packages/apex-ast-serializer"],
    { cwd: REPO_ROOT },
  );
  return res.status !== 0; // non-zero == differences exist
}

function downloadLatestMainBinary(): void {
  const pkg = NATIVE_PACKAGES[PLATFORM_KEY];
  if (!pkg) throw new Error(`No native package mapping for ${PLATFORM_KEY}`);

  console.log("Finding the latest scheduled main build...");
  const runId = capture("gh", [
    "run",
    "list",
    "--workflow=tests-deployments.yml",
    "--branch=main",
    "--event=schedule",
    "--status=success",
    "--limit=1",
    "--json=databaseId",
    "--jq=.[0].databaseId",
  ]);
  if (!runId) {
    throw new Error(
      "Couldn't find a successful scheduled main run (is `gh` installed and authed?).",
    );
  }
  const dir = mkdtempSync(path.join(tmpdir(), "apex-perf-native-"));
  console.log(`Downloading ${NATIVE_NAME} from run ${runId}...`);
  sh("gh", ["run", "download", runId, "-n", NATIVE_NAME, "-D", dir]);

  const dest = path.join(REPO_ROOT, "packages", pkg, NATIVE_NAME);
  copyFileSync(path.join(dir, NATIVE_NAME), dest);
  chmodSync(dest, 0o755); // GH artifacts don't preserve the exec bit
  console.log(`Installed native binary -> ${dest}`);
}

function buildFromScratch(): void {
  console.log(
    "\nBuilding the native binary from scratch. This is slow (GraalVM native-image + PGO).",
  );
  const muslNeeded =
    process.platform === "linux" &&
    process.arch === "x64" &&
    !existsSync(
      path.join(REPO_ROOT, "packages/apex-ast-serializer/musl-toolchain/bin"),
    );
  if (muslNeeded) {
    console.log("Building the musl toolchain first (one-time, also slow)...");
    sh("pnpm", ["nx", "run", "apex-ast-serializer:build:musl"]);
  }
  sh("pnpm", ["run", "build:native"]);
  sh("pnpm", ["run", "install:native:dev"]);
}

function ensureVendorBuilt(): void {
  if (!existsSync(path.join(PKG_ROOT, "vendor/apex-ast-serializer/bin"))) {
    console.log("Building the JVM serializer (vendor) ...");
    sh("pnpm", ["nx", "run", "apex-ast-serializer:build"]);
  }
}

function runCore(mode: Mode, passthrough: string[]): void {
  sh("pnpm", ["tsx", "tests_perf/run.ts", "--parser", mode, ...passthrough], {
    cwd: PKG_ROOT,
  });
}

async function provisionNative(scripted?: Obtain): Promise<void> {
  const present = nativeBinaryPresent();
  const javaChanged = javaChangedVsMain();

  if (javaChanged) {
    console.log(
      "\n\x1b[33mNote:\x1b[0m the Java serializer differs from origin/main, so a downloaded",
    );
    console.log(
      "main binary would be stale. Build-from-scratch is the correct choice here.\n",
    );
  }

  // Default: build if Java changed; else reuse an existing binary; else download.
  const defaultObtain: Obtain = javaChanged
    ? "build"
    : present
      ? "existing"
      : "download";

  const obtain: Obtain =
    scripted ??
    (await select<Obtain>({
      message: "How should we obtain the native binary?",
      default: defaultObtain,
      choices: [
        {
          name: `Use the existing binary${present ? "" : " (none installed)"}`,
          value: "existing",
          disabled: !present,
        },
        {
          name: "Download the latest main binary (fast, no local build)",
          value: "download",
        },
        {
          name: "Build from scratch (slow; required if you changed the Java serializer)",
          value: "build",
        },
      ],
    }));

  // Only prompt interactively. When --obtain was passed explicitly (scripted /
  // non-TTY), the caller already opted in, so don't block on a confirm() that
  // has no stdin to read.
  if (obtain === "download" && javaChanged && !scripted) {
    const proceed = await confirm({
      message:
        "Your Java changes won't be in the downloaded binary — numbers will be stale. Continue?",
      default: false,
    });
    if (!proceed) return provisionNative();
  }

  if (obtain === "existing") {
    if (!present) throw new Error("No existing native binary to use.");
  } else if (obtain === "download") {
    downloadLatestMainBinary();
  } else {
    buildFromScratch();
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let scriptedMode: Mode | undefined;
  let scriptedObtain: Obtain | undefined;
  const passthrough: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--")
      continue; // pnpm forwards its arg separator; ignore it
    else if (a === "--mode") scriptedMode = argv[++i] as Mode;
    else if (a === "--obtain") scriptedObtain = argv[++i] as Obtain;
    else passthrough.push(a as string);
  }

  const interactive = process.stdin.isTTY && !scriptedMode;
  if (!process.stdin.isTTY && !scriptedMode) {
    console.error(
      "Not a TTY. Either pass --mode (and --obtain for native), or call the core\n" +
        "directly: pnpm tsx tests_perf/run.ts [--parser <mode>] ...",
    );
    process.exit(1);
  }

  const mode: Mode =
    scriptedMode ??
    (await select<Mode>({
      message: "Which parser mode do you want to benchmark?",
      default: "native",
      choices: [
        {
          name: "native (default — the zero-config adopter experience)",
          value: "native",
        },
        {
          name: "built-in HTTP server (investigation only)",
          value: "built-in",
        },
        { name: "none / JVM (investigation only)", value: "none" },
      ],
    }));

  let serverStarted = false;
  try {
    if (mode === "native") {
      await provisionNative(scriptedObtain);
    } else if (mode === "built-in") {
      ensureVendorBuilt();
      console.log("Starting the parser server...");
      // start-server is long-running (CI backgrounds it with `&`), so spawn it
      // detached and let wait-server block until it's reachable. We stop it via
      // the shutdown endpoint (stop-server) in the finally block.
      spawn("pnpm", ["run", "start-server"], {
        cwd: PKG_ROOT,
        stdio: "ignore",
        detached: true,
      }).unref();
      sh("pnpm", ["run", "wait-server"], { cwd: PKG_ROOT });
      serverStarted = true;
    } else {
      ensureVendorBuilt();
    }

    runCore(mode, passthrough);
  } finally {
    if (serverStarted) {
      console.log("Stopping the parser server...");
      sh("pnpm", ["run", "stop-server"], { cwd: PKG_ROOT, allowFail: true });
    }
  }
  // interactive is referenced to make intent explicit even when scripted.
  void interactive;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
