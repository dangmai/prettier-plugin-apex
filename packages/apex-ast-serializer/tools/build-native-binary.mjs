#!/usr/bin/env zx

// This is the script that builds native executable for the host platform.
// It contains multiple steps in order to achive this goal:
// - It runs the entire test suite, and uses native-image-agent
// to figure out what reflections/proxies are used as part of that run.
// - Then it uses native-image to compile an instrumented binary, using the information
// in the previous step (which is stored in `build/native/agent-output/`)
// - This artifact is produced and stored in `build/native/nativeCompile`
// - Then it runs the instrumented binary with all the test classes,
// in order to produce profiles that will be used later to optimize the binary.
// - Then it merges all the profiles into a single one.
// - Finally, it runs the nativeCompile task again, but this time with the merged profile,
// and produces the final artifact.

import { join } from "path";
import { $, fs, usePowerShell } from "zx";

$.verbose = false;

let gradle = "./gradlew";
if (process.platform === "win32") {
  usePowerShell();
  gradle += ".bat";
}

async function getFilesWithSuffix(rootDir, suffix) {
  let result = [];

  async function walkDir(dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dir, file.name);
      if (file.isDirectory()) {
        await walkDir(fullPath);
      } else if (file.name.endsWith(suffix)) {
        result.push(fullPath);
      }
    }
  }

  await walkDir(rootDir);
  return result;
}

console.log("Running nativeCompile with PGO instrumentation");
await $`${gradle} :parser:nativeInstrumentedTest :parser:nativeCompile --pgo-instrument`.pipe(
  process.stdout,
);
const classFiles = await getFilesWithSuffix(
  "./parser/build/resources/test",
  ".cls",
);
await fs.remove("./parser/src/pgo-profiles/main");
await fs.ensureDir("./parser/src/pgo-profiles/main");

let i = 1;
for (const classFile of classFiles) {
  if (classFile.includes("__snapshots__")) {
    continue;
  }
  console.log(`Processing ${classFile}`);
  const isAnonymous = classFile.includes("anonymous");

  await $({
    input: await fs.readFile(classFile),
  })`./parser/build/native/nativeCompile/apex-ast-serializer-instrumented -f json -i ${isAnonymous ? "--anonymous" : ""}`.pipe(
    process.stdout,
  );

  await fs.move(
    "./default.iprof",
    `./parser/src/pgo-profiles/main/${i}.iprof`,
    { overwrite: true },
  );
  i++;
}
console.log("Merging profiles");
await $`native-image-configure merge-pgo-profiles --input-dir=./parser/src/pgo-profiles/main --output-file=merged_profile.iprof`.pipe(
  process.stdout,
);
await fs.remove("./parser/src/pgo-profiles/main");
await fs.ensureDir("./parser/src/pgo-profiles/main");
await fs.move(
  "./merged_profile.iprof",
  `./parser/src/pgo-profiles/main/default.iprof`,
  { overwrite: true },
);

console.log("Running nativeCompile for final artifact");
await $`${gradle} :parser:nativeCompile`.pipe(process.stdout);
