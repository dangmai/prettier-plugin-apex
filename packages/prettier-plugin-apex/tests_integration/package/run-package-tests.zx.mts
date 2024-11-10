#!/usr/bin/env -S tsx

import assert from "node:assert";

// eslint-disable-next-line import/no-extraneous-dependencies -- we will use shared zx from the root
import { $, argv, cd, fs, path, usePowerShell } from "zx";

if (process.platform === "win32") {
  usePowerShell();
}

$.verbose = true;

// Use whitespace in module name to test resiliency of package
let moduleName = "test npm module";
if (argv["module"]) {
  moduleName = argv["module"];
}

await $`mkdir ${moduleName}`;

cd(moduleName);
await $`npm init -y`;
await $`npm install --save-dev prettier prettier-plugin-apex`;
await $`cp ../tests/anonymous/AnonymousBlock.cls ./AnonymousBlock.apex`;
await $`cp ../tests/annotated_class/AnnotatedClass.cls ./AnnotatedClass.cls`;

const packageJson = await fs.readJSON("package.json");
console.log(packageJson);
packageJson.scripts = {
  "prettier:named": "prettier AnnotatedClass.cls",
  "prettier:named:debug": "prettier --debug-check AnnotatedClass.cls",
  "prettier:anonymous": "prettier AnonymousBlock.apex",
  "prettier:anonymous:debug": "prettier --debug-check AnonymousBlock.apex",
};
await fs.writeJSON("package.json", packageJson, { spaces: 2 });
await fs.writeJSON(
  ".prettierrc.json",
  { plugins: ["prettier-plugin-apex"] },
  { spaces: 2 },
);

// Assertions
let result = await $`npm run prettier:named`;
assert(result.stdout.includes("TestClass"));
result = await $`npm run prettier:anonymous`;
assert(result.stdout.includes("Hello"));
await $`npm run prettier:named:debug`;
await $`npm run prettier:anonymous:debug`;

// Get out of the directory since Windows can't delete it if we're in it
cd("..");

await fs.remove(path.join(process.cwd(), moduleName));
