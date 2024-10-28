#!/usr/bin/env -S tsx

// This script checks if the current version is a prerelease version.
// It is run in the CI/CD pipeline.
import semver from "semver";
import { $, fs } from "zx";

$.verbose = true;
const { version } = await fs.readJSON("package.json");

if (semver.prerelease(version)) {
  process.exit(1);
}
process.exit(0);
