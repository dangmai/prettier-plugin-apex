import fs from "node:fs";
import { basename, extname, join } from "node:path";
import prettier from "prettier";
import { test } from "vitest";

import * as prettierApex from "../src/index.js";

const { AST_COMPARE, APEX_PARSER } = process.env;

function read(filename: string): string {
  return fs.readFileSync(filename, "utf8");
}

const PARSER_OPTIONS = {
  apexStandaloneParser: APEX_PARSER ?? "none",
  apexStandalonePort: 2117,
  apexStandaloneHost: "localhost",
};

async function prettyPrint(
  src: string,
  filename: string,
  options: prettier.Options,
): Promise<string> {
  return prettier.format(src, {
    filepath: filename,
    ...PARSER_OPTIONS,
    ...options,
  });
}

async function parse(string: string, opts: prettier.Options): Promise<any> {
  // eslint-disable-next-line no-underscore-dangle
  const result = await prettier.__debug.parse(
    string,
    {
      ...PARSER_OPTIONS,
      ...opts,
    },
    {
      massage: true,
    },
  );
  return result.ast;
}

function runSpec(
  dirname: string,
  parsers: string[],
  specOptions?: prettier.Options,
): void {
  if (!parsers || !parsers.length) {
    throw new Error(`No parsers were specified for ${dirname}`);
  }

  fs.readdirSync(dirname).forEach((filename: string) => {
    const path = `${dirname}${filename}`;
    const extension = extname(filename);
    const baseName = basename(filename, extension);
    if (
      fs.lstatSync(path).isFile() &&
      filename[0] !== "." &&
      filename !== "jsfmt.spec.ts"
    ) {
      const source = read(path).replace(/\r\n/g, "\n");

      let options: prettier.Options[] = [];
      if (specOptions !== undefined) {
        if (!Array.isArray(specOptions)) {
          options = [specOptions];
        } else {
          options = specOptions;
        }
      } else {
        options.push({});
      }
      const mergedOptions = options.map((opts: prettier.Options) => ({
        plugins: [prettierApex],
        ...opts,
        parser: parsers[0],
      }));

      mergedOptions.forEach((mergedOpts, index) => {
        let output: string;
        test.concurrent(
          `Format ${mergedOpts.parser}: ${filename} ${index + 1}`,
          async ({ expect }) => {
            output = await prettyPrint(source, path, mergedOpts);
            expect(output).toMatchFileSnapshot(
              join(
                "__snapshots__",
                `Formatted${baseName}${index + 1}${extension}`,
              ),
            );
          },
        );

        if (AST_COMPARE) {
          test(`Verify AST: ${filename} ${index + 1}`, async ({ expect }) => {
            const ast = await parse(source, mergedOpts);
            const ppast = await parse(output, mergedOpts);
            expect(ppast).toBeDefined();
            expect(ast).toEqual(ppast);
          });

          test(`Stable format: ${filename} ${index + 1}`, async ({
            expect,
          }) => {
            const secondOutput = await prettyPrint(output, path, mergedOpts);
            expect(secondOutput).toEqual(output);
          });
        }
      });
    }
  });
}
global.runSpec = runSpec;
