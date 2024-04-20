#!/usr/bin/env node

/* eslint-disable no-console -- this is a NodeJS script so console usage is expected */
import { createWriteStream } from "node:fs";
import { chmod, copyFile, unlink } from "node:fs/promises";
import https from "node:https";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { doesFileExist, getNativeExecutable } from "../src/util.js";

const { arch, platform } = process;

const SUPPORTED_ARCHITECTURES = ["win32-x64", "linux-x64", "darwin-arm64"];

const currentArch = `${platform}-${arch}`;
if (!SUPPORTED_ARCHITECTURES.includes(currentArch)) {
  console.warn("Unsupported OS or architecture");
  process.exit(1);
}

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

const downloadFile = (url: string, dest: string) =>
  new Promise<void>((resolve, reject) => {
    const file = createWriteStream(dest);
    https
      .get(url, async (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 200 &&
          response.statusCode < 300
        ) {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        } else if (response.headers.location) {
          resolve(downloadFile(response.headers.location, dest));
        } else {
          console.log(response.statusCode);
          file.close();
          await unlink(dest);
          reject(new Error(response.statusMessage));
        }
      })
      .on("error", async (error) => {
        file.close();
        await unlink(dest);
        reject(new Error(error.message));
      });
  });

const downloadExecutable = async (
  path: string,
  filename: string,
  version: string,
) => {
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
