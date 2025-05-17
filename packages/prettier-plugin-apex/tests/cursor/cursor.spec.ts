import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";
import { describe, expect, it } from "vitest";
import * as prettierApex from "../../src/index.js";

describe("Cursor Tests", () => {
  it.concurrent("formats Apex class with cursor correctly", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "../parser/ValidClass.cls",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.formatWithCursor(source.replace(/\r\n/g, "\n"), {
        cursorOffset: 5,
        plugins: [prettierApex],
        filepath: fileName,
        parser: "apex",
      }),
    ).resolves.toBeDefined();
  });
  it.concurrent(
    "formats anonymous Apex class with cursor correctly",
    async () => {
      const fileName = path.join(
        fileURLToPath(new URL(".", import.meta.url)),
        "../parser/ValidAnonymousBlock.apex",
      );
      const source = await fs.readFile(fileName, "utf8");
      await expect(
        prettier.formatWithCursor(source.replace(/\r\n/g, "\n"), {
          cursorOffset: 5,
          plugins: [prettierApex],
          filepath: fileName,
          parser: "apex-anonymous",
        }),
      ).resolves.toBeDefined();
    },
  );
});
