import { describe, expect, it } from "vitest";

import { APEX_TYPES } from "../../src/constants.js";
import { massageAstNode } from "../../src/util.js";

describe("massageAstNode", () => {
  it("strips whitespace from the value of an ApexDoc block comment", () => {
    const value = "/**\n * Hello World\n */";
    const ast = { "@class": APEX_TYPES.BLOCK_COMMENT, value };
    const newObj = { value };

    massageAstNode(ast, newObj);

    expect(newObj.value).toBe(value.replace(/\s/g, ""));
  });
});
