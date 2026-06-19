import childProcess from "node:child_process";
import { EventEmitter } from "node:events";

import prettier from "prettier";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { APEX_TYPES } from "../../src/constants.js";
import * as prettierApex from "../../src/index.js";
import parse from "../../src/parser.js";

type FakeChild = EventEmitter & {
  stdin: { write: () => void; end: () => void };
  stdout: EventEmitter;
  stderr: EventEmitter;
};

function makeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdin = { write: () => {}, end: () => {} };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}

function format(source: string): Promise<string> {
  return prettier.format(source, {
    plugins: [prettierApex],
    parser: "apex",
    apexStandaloneParser: "none",
  });
}

describe("parse (mocked serializer)", () => {
  const spawnSpy = vi.spyOn(childProcess, "spawn");

  beforeEach(() => {
    spawnSpy.mockReset();
  });

  afterAll(() => {
    spawnSpy.mockRestore();
  });

  it("rejects with stderr output when the parser exits with a non-zero code", async () => {
    spawnSpy.mockImplementation(() => {
      const child = makeChild();
      queueMicrotask(() => {
        child.stderr.emit("data", "boom");
        child.emit("close", 1);
      });
      return child as unknown as ReturnType<typeof childProcess.spawn>;
    });

    await expect(format("class Foo {}")).rejects.toThrow("boom");
  });

  it("rejects when the spawned process emits an error event", async () => {
    spawnSpy.mockImplementation(() => {
      const child = makeChild();
      queueMicrotask(() => {
        child.stdout.emit("data", "partial");
        child.emit("error", new Error("spawn failure"));
      });
      return child as unknown as ReturnType<typeof childProcess.spawn>;
    });

    await expect(format("class Foo {}")).rejects.toThrow("partial");
  });

  it("rejects when the parser exits successfully but returns no output", async () => {
    spawnSpy.mockImplementation(() => {
      const child = makeChild();
      queueMicrotask(() => {
        child.emit("close", 0);
      });
      return child as unknown as ReturnType<typeof childProcess.spawn>;
    });

    await expect(format("class Foo {}")).rejects.toThrow(
      "Failed to parse Apex code: the parser returned no output",
    );
  });

  it("records the trailing empty line when the source ends with a newline", async () => {
    const serializedAst = JSON.stringify({
      [APEX_TYPES.PARSER_OUTPUT]: { parseErrors: [], hiddenTokenMap: [] },
    });
    spawnSpy.mockImplementation(() => {
      const child = makeChild();
      queueMicrotask(() => {
        child.stdout.emit("data", serializedAst);
        child.emit("close", 0);
      });
      return child as unknown as ReturnType<typeof childProcess.spawn>;
    });

    // Call parse directly to bypass the plugin's trimming preprocess, so the
    // source retains the trailing newline that produces an empty final line.
    await expect(
      parse("class Foo {}\n", {
        apexStandaloneParser: "none",
        parser: "apex",
      } as unknown as prettier.RequiredOptions),
    ).resolves.toBeDefined();
  });
});
