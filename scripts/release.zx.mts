#!/usr/bin/env -S tsx

// This script is meant to be used as part of the `release` script on the root
// repository. Don't call it directly (unless it's for debugging purposes).
// To release, simply run `npm version v${version}` on the root repository.
// This script updates the version for all packages that need releasing,
// finalizes the CHANGELOG for stable releases, then run `git add` on the
// updated files.
import { fileURLToPath } from "node:url";
import semver from "semver";
import { $, echo, fs, glob, path, within } from "zx";

$.verbose = true;
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

// Prereleases keep the `# Unreleased` heading, it only gets renamed once the
// stable version ships.
const changelogPath = path.join(rootDir, "CHANGELOG.md");
const unreleasedHeading = "# Unreleased\n";
if (!semver.prerelease(version)) {
  const changelog = fs.readFileSync(changelogPath, "utf8");
  if (!changelog.startsWith(unreleasedHeading)) {
    throw new Error(
      `CHANGELOG.md must start with "${unreleasedHeading.trim()}" to release ${version}`,
    );
  }
  fs.writeFileSync(
    changelogPath,
    `# ${version}\n${changelog.slice(unreleasedHeading.length)}`,
  );
}

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
await $`git add ${packages} ${changelogPath}`;
