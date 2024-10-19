#!/usr/bin/env zx

import { join } from "path";
import { $, fs, usePowerShell } from "zx";

$.verbose = false;

if (process.platform === "win32") {
  usePowerShell();
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

console.log("Running nativeInstrumentedTest");
await $`node ./tools/run-gradle.mjs :parser:nativeInstrumentedTest`.pipe(
  process.stdout,
);
console.log("Running nativeCompile with instrumentation");
await $`node ./tools/run-gradle.mjs :parser:nativeCompile --pgo-instrument`.pipe(
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
  })`./parser/build/native/nativeCompile/apex-ast-serializer-instrumented -f json -i ${isAnonymous ? "--anonymous" : ""}`;

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
await $`node ./tools/run-gradle.mjs :parser:nativeCompile`.pipe(process.stdout);
