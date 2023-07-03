import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prettier from "prettier";
import { jest } from "@jest/globals";

describe("Parser Tests", () => {
  // Synchronous parser tends to run slow on GitHub Actions
  jest.setTimeout(10000);
  it("runs synchronous parser on valid class correctly", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "ValidClass.cls",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.format(source.replace(/\r\n/g, "\n"), {
        plugins: ["./src/index"],
        filepath: fileName,
        parser: "apex",
      }),
    ).resolves.toBeDefined();
  });
  it("runs synchronous parser on valid anonymous block correctly", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "ValidAnonymousBlock.apex",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.format(source.replace(/\r\n/g, "\n"), {
        plugins: ["./src/index"],
        filepath: fileName,
        parser: "apex-anonymous",
      }),
    ).resolves.toBeDefined();
  });
  it("runs asynchronous parser correctly", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "ValidClass.cls",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.format(source.replace(/\r\n/g, "\n"), {
        plugins: ["./src/index"],
        filepath: fileName,
        parser: "apex",
        apexStandaloneParser: "built-in",
        apexStandalonePort: 2117,
        apexStandaloneHost: "localhost",
      }),
    ).resolves.toBeDefined();
  });
  it("throws error when asynchronous parser server cannot be reached", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "ValidClass.cls",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.format(source.replace(/\r\n/g, "\n"), {
        plugins: ["./src/index"],
        filepath: fileName,
        parser: "apex",
        apexStandaloneParser: "built-in",
        apexStandalonePort: 2118,
        apexStandaloneHost: "localhost",
      }),
    ).rejects.toThrow("Failed to connect to Apex parsing server");
  });
  it("throws error when synchronous parser runs into invalid input file", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "InvalidClass.cls",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.format(source.replace(/\r\n/g, "\n"), {
        plugins: ["./src/index"],
        filepath: fileName,
        parser: "apex",
      }),
    ).rejects.toThrow("Unexpected token");
  });
  it("throws error when asynchronous parser runs into invalid input file", async () => {
    const fileName = path.join(
      fileURLToPath(new URL(".", import.meta.url)),
      "InvalidClass.cls",
    );
    const source = await fs.readFile(fileName, "utf8");
    await expect(
      prettier.format(source.replace(/\r\n/g, "\n"), {
        plugins: ["./src/index"],
        filepath: fileName,
        parser: "apex",
        apexStandaloneParser: "built-in",
        apexStandalonePort: 2117,
        apexStandaloneHost: "localhost",
      }),
    ).rejects.toThrow("Unexpected token");
  });
});
