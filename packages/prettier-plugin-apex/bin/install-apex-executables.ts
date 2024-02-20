#!/usr/bin/env node

/* eslint-disable no-console -- this is a NodeJS script so console usage is expected */
import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import https from "https";
import path from "path";
import { getSerializerBinDirectory } from "../src/util.js";

const { arch, platform } = process;
const version = process.env["npm_package_version"];

const SUPPORTED_ARCHITECTURES = ["win32-x64", "linux-x64", "darwin-arm64"];

const currentArch = `${platform}-${arch}`;
if (!SUPPORTED_ARCHITECTURES.includes(currentArch)) {
  console.warn("Unsupported OS or architecture");
  process.exit(1);
}

const filename = `apex-ast-serializer-${version}-${currentArch}${platform === "win32" ? ".exe" : ""}`;
const artifactUrl = `https://github.com/dangmai/prettier-plugin-apex/releases/download/v${version}/${filename}`;

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

const downloadLocation = path.join(getSerializerBinDirectory(), filename);
downloadFile(artifactUrl, downloadLocation)
  .then(() =>
    console.log(`File downloaded successfully to ${downloadLocation}`),
  )
  .catch((error) => {
    console.error(`Failed to download from URL ${artifactUrl}: ${error}`);
    process.exit(2);
  });
