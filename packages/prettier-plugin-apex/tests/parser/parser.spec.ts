import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";
// eslint-disable-next-line import/no-extraneous-dependencies -- use shared vite in root dir
import { describe, expect, it } from "vitest";
import * as prettierApex from "../../src/index.js";

describe("Parser Tests", () => {
  it.concurrent(
    "runs synchronous parser on valid class correctly",
    async () => {
      const fileName = path.join(
        fileURLToPath(new URL(".", import.meta.url)),
        "ValidClass.cls",
      );
      const source = await fs.readFile(fileName, "utf8");
      await expect(
        prettier.format(source.replace(/\r\n/g, "\n"), {
          plugins: [prettierApex],
          filepath: fileName,
          parser: "apex",
        }),
      ).resolves.toBeDefined();
    },
  );
  it.concurrent(
    "runs synchronous parser on valid anonymous block correctly",
    async () => {
      const fileName = path.join(
        fileURLToPath(new URL(".", import.meta.url)),
        "ValidAnonymousBlock.apex",
      );
      const source = await fs.readFile(fileName, "utf8");
      await expect(
        prettier.format(source.replace(/\r\n/g, "\n"), {
          plugins: [prettierApex],
          filepath: fileName,
          parser: "apex-anonymous",
        }),
      ).resolves.toBeDefined();
    },
  );
  it.concurrent("runs asynchronous parser correctly", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "ValidClass.cls",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.format(source.replace(/\r\n/g, "\n"), {
        plugins: [prettierApex],
        filepath: fileName,
        parser: "apex",
        apexStandaloneParser: "built-in",
        apexStandalonePort: 2117,
        apexStandaloneHost: "localhost",
      }),
    ).resolves.toBeDefined();
  });
  it.concurrent(
    "throws error when asynchronous parser server cannot be reached",
    async () => {
      const fileName = path.join(
        fileURLToPath(new URL(".", import.meta.url)),
        "ValidClass.cls",
      );
      const source = await fs.readFile(fileName, "utf8");
      await expect(
        prettier.format(source.replace(/\r\n/g, "\n"), {
          plugins: [prettierApex],
          filepath: fileName,
          parser: "apex",
          apexStandaloneParser: "built-in",
          apexStandalonePort: 2118,
          apexStandaloneHost: "localhost",
        }),
      ).rejects.toThrow("Failed to connect to Apex parsing server");
    },
  );
  it.concurrent(
    "throws error when synchronous parser runs into invalid input file",
    async () => {
      const fileName = path.join(
        fileURLToPath(new URL(".", import.meta.url)),
        "InvalidClass.cls",
      );
      const source = await fs.readFile(fileName, "utf8");
      await expect(
        prettier.format(source.replace(/\r\n/g, "\n"), {
          plugins: [prettierApex],
          filepath: fileName,
          parser: "apex",
        }),
      ).rejects.toThrow("Unexpected token");
    },
  );
  it.concurrent(
    "throws error when asynchronous parser runs into invalid input file",
    async () => {
      const fileName = path.join(
        fileURLToPath(new URL(".", import.meta.url)),
        "InvalidClass.cls",
      );
      const source = await fs.readFile(fileName, "utf8");
      await expect(
        prettier.format(source.replace(/\r\n/g, "\n"), {
          plugins: [prettierApex],
          filepath: fileName,
          parser: "apex",
          apexStandaloneParser: "built-in",
          apexStandalonePort: 2117,
          apexStandaloneHost: "localhost",
        }),
      ).rejects.toThrow("Unexpected token");
    },
  );
});
