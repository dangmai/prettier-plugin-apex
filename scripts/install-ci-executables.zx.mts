#!/usr/bin/env -S tsx

// This script is used to copy executable artifacts to the correct packages
// within the CI/CD pipeline.
import { $, argv, fs } from "zx";
import {
  getNativeExecutableNameForPlatform,
  NATIVE_PACKAGES,
} from "../packages/prettier-plugin-apex/src/util.js"; // eslint-disable-line import/no-unresolved

$.verbose = true;
const artifactDir = argv._[0];

await Promise.all(
  Object.keys(NATIVE_PACKAGES).map(async (key) => {
    const fileName = getNativeExecutableNameForPlatform(key);
    await fs.copyFile(
      `${artifactDir}/${fileName}`,
      `packages/${NATIVE_PACKAGES[key]}/${fileName}`,
    );
  }),
);
