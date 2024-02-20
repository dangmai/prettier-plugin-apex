#!/usr/bin/env node

/* eslint-disable no-console -- this is a NodeJS script so console usage is expected */
import { createWriteStream } from "fs";
import { chmod, unlink } from "fs/promises";
import https from "https";
import { getNativeExecutable } from "../src/util.js";

const { arch, platform } = process;

const SUPPORTED_ARCHITECTURES = ["win32-x64", "linux-x64", "darwin-arm64"];

const currentArch = `${platform}-${arch}`;
if (!SUPPORTED_ARCHITECTURES.includes(currentArch)) {
  console.warn("Unsupported OS or architecture");
  process.exit(1);
}

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

(async () => {
  const { path, filename, version } = getNativeExecutable();
  const artifactUrl = `https://github.com/dangmai/prettier-plugin-apex/releases/download/v${version}/${filename}`;
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
})();
