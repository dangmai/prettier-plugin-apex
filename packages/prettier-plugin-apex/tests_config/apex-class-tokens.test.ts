import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { TOKEN_TO_CLASS } from "../src/apex-class-tokens.js";

// The serializer (Java) and the plugin (TypeScript) each hold a copy of the
// list of jorje class names that get interned to short `@class` tokens. They
// must stay identical or the plugin would fail to expand tokens the serializer
// emits. This test fails if the two copies diverge.
describe("apex @class token list", () => {
  it("matches the Java serializer resource", () => {
    const resourcePath = resolve(
      import.meta.dirname,
      "../../apex-ast-serializer/parser/src/main/resources/net/dangmai/serializer/apex-class-tokens.txt",
    );
    const javaClasses = readFileSync(resourcePath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .sort();
    const tsClasses = Object.values(TOKEN_TO_CLASS).sort();

    expect(tsClasses).toEqual(javaClasses);
  });
});
