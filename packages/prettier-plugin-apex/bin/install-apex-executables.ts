#!/usr/bin/env node

/* eslint-disable no-console -- this is a NodeJS script so console usage is expected */
import { chmod, copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { doesFileExist, getNativeExecutable } from "../src/util.js";

const { arch, platform } = process;

const PREBUILT_ARCHITECTURES = [
  "win32-x64",
  "linux-x64",
  "darwin-arm64",
  "darwin-x64",
];

const {
  values: { dev, force },
} = parseArgs({
  options: {
    dev: {
      type: "boolean",
      short: "d",
    },
    force: {
      type: "boolean",
      short: "f",
    },
  },
});

const downloadFile = async (url: string, dest: string) => {
  const response = await fetch(url);
  // See this discussion for why we need to typecast: https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/65542#discussioncomment-6071004
  const body = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
  await writeFile(dest, body);
};

const downloadExecutable = async (
  path: string,
  filename: string,
  version: string,
) => {
  const currentArch = `${platform}-${arch}`;
  if (!PREBUILT_ARCHITECTURES.includes(currentArch)) {
    console.warn(
      `We currently do not have prebuilt binaries for ${currentArch}. You can either build the binary from source, or open an issue to request it.`,
    );
    process.exit(1);
  }

  const artifactUrl = `https://github.com/dangmai/prettier-plugin-apex/releases/download/v${version}/${filename}`;
  console.log(
    `Downloading Apex AST Serializer native executable from ${artifactUrl}`,
  );
  try {
    await downloadFile(artifactUrl, path);
    // By default, this file is not executable, so we need to manually give it
    // the +x permission bit here
    await chmod(path, 0o755);
    console.log(`File downloaded successfully to ${path}`);
  } catch (error) {
    console.error(`Failed to download from URL ${artifactUrl}: ${error}`);
    process.exit(2);
  }
};

const copyDevExecutable = async (path: string) => {
  const executablePath = join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../apex-ast-serializer/parser/build/native/nativeCompile/apex-ast-serializer",
  );
  console.log(
    `Copying Apex AST Serializer native executable from ${executablePath}`,
  );
  if (!(await doesFileExist(executablePath))) {
    console.error(`File does not exist at ${executablePath}`);
    process.exit(3);
  }
  await copyFile(executablePath, path);
  console.log(`File copied successfully to ${path}`);
};

(async () => {
  const { path, filename, version } = await getNativeExecutable();
  if ((await doesFileExist(path)) && !force) {
    console.warn(
      `File already exists at ${path}. If you want to overwrite it, use --force`,
    );
    process.exit(0);
  }

  if (dev) {
    await copyDevExecutable(path);
  } else {
    await downloadExecutable(path, filename, version);
  }
})();
