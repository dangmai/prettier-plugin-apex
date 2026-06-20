import { describe, expect, it } from "vitest";

import { APEX_TYPES } from "../../src/constants.js";
import {
  type GenericComment,
  findNextUncommentedCharacter,
  massageAstNode,
} from "../../src/util.js";

describe("massageAstNode", () => {
  it("strips whitespace from the value of an ApexDoc block comment", () => {
    const value = "/**\n * Hello World\n */";
    const ast = {
      "@class": APEX_TYPES.BLOCK_COMMENT,
      value,
    } as unknown as Parameters<typeof massageAstNode>[0];
    const newObj = { value };

    massageAstNode(ast, newObj);

    expect(newObj.value).toBe(value.replace(/\s/g, ""));
  });
});

describe("findNextUncommentedCharacter", () => {
  // endIndex is exclusive: a comment spans [startIndex, endIndex).
  const comment = (startIndex: number, endIndex: number): GenericComment =>
    ({ location: { startIndex, endIndex } }) as unknown as GenericComment;

  // "x; /* ; */ y": real ';' at 1, a commented ';' at 6 inside /* ; */ (3..10).
  const source = "x; /* ; */ y";
  const comments = [comment(3, 10)];

  it("scanning backwards, skips a match inside a comment and resumes before it", () => {
    // From the end, the nearest ';' (index 6) is inside the comment, so the
    // scan resumes at startIndex - 1 and finds the real ';' at index 1.
    expect(
      findNextUncommentedCharacter(
        source,
        ";",
        source.length - 1,
        comments,
        true,
      ),
    ).toBe(1);
  });

  it("scanning forwards, skips a match inside a comment and resumes after it", () => {
    // From the start, the first ';' (index 1) is real; from index 2 the next
    // ';' (index 6) is inside the comment, so the scan resumes at endIndex.
    expect(findNextUncommentedCharacter(source, ";", 2, comments, false)).toBe(
      -1,
    );
  });
});
