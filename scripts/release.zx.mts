#!/usr/bin/env -S tsx

// This script is meant to be used as part of the `release` script on the root
// repository. Don't call it directly (unless it's for debugging purposes).
// To release, simply run `npm version v${version}` on the root repository.
// This script updates the version for all packages that need releasing,
// then run `git add` on the updated files.
import { fileURLToPath } from "url";
import { $, echo, fs, glob, path, within } from "zx";

$.verbose = true;
const { version } = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json"),
    "utf8",
  ),
);
const packages = await glob(
  ["packages/prettier-plugin-apex*", "packages/@prettier-apex/*"],
  {
    onlyDirectories: true,
  },
);
echo(packages);
await Promise.all(
  packages.map((pkg) =>
    within(async () => {
      $.cwd = pkg;
      await $`npm version --no-git-tag-version ${version}`;
    }),
  ),
);
await $`git add ${packages}`;
