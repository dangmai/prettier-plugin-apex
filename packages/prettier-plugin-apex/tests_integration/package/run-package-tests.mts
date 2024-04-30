#!/usr/bin/env -S tsx

// eslint-disable-next-line import/no-extraneous-dependencies -- we will use shared zx from the root
import { $, cd, fs, path } from "zx";

$.verbose = true;

await $`mkdir test-npm-module`;

cd("test-npm-module");
await $`npm init -y`;
await $`npm install --save-dev prettier prettier-plugin-apex`;
await $`cp ../tests/anonymous/AnonymousBlock.cls ./AnonymousBlock.apex`;
await $`cp ../tests/annotated_class/AnnotatedClass.cls ./AnnotatedClass.cls`;

const packageJson = await fs.readJSON("package.json");
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
await $`npm run prettier:named | grep TestClass`;
await $`npm run prettier:anonymous | grep Hello`;
await $`npm run prettier:named:debug`;
await $`npm run prettier:anonymous:debug`;

// Get out of the directory since Windows can't delete it if we're in it
cd("..");

await fs.remove(path.join(process.cwd(), "test-npm-module"));
