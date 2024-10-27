#!/usr/bin/env -S tsx

import { fs } from "zx";
// eslint-disable-next-line import/no-unresolved
import { NATIVE_PACKAGES } from "../packages/prettier-plugin-apex/src/util.js";

const fileName = `apex-ast-serializer${process.platform === "win32" ? ".exe" : ""}`;
await fs.copyFile(
  `packages/apex-ast-serializer/parser/build/native/nativeCompile/${fileName}`,
  `packages/${NATIVE_PACKAGES[`${process.platform}-${process.arch}`]}/${fileName}`,
);
