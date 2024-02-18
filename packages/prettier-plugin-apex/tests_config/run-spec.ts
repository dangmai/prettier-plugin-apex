import fs from "fs";
import { wrap } from "jest-snapshot-serializer-raw";
import { extname } from "path";
import prettier from "prettier";

const { AST_COMPARE } = process.env;

function read(filename: string): string {
  return fs.readFileSync(filename, "utf8");
}

async function prettyPrint(
  src: string,
  filename: string,
  options: prettier.Options,
): Promise<string> {
  return prettier.format(src, {
    filepath: filename,
    apexStandaloneParser: "built-in",
    apexStandalonePort: 2117,
    apexStandaloneHost: "localhost",
    ...options,
  });
}

async function parse(string: string, opts: prettier.Options): Promise<any> {
  // eslint-disable-next-line no-underscore-dangle
  const result = await prettier.__debug.parse(
    string,
    {
      apexStandaloneParser: "built-in",
      apexStandalonePort: 2117,
      apexStandaloneHost: "localhost",
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
  /* istanbul ignore if */
  if (!parsers || !parsers.length) {
    throw new Error(`No parsers were specified for ${dirname}`);
  }

  fs.readdirSync(dirname).forEach((filename: string) => {
    const path = `${dirname}${filename}`;
    if (
      extname(filename) !== ".snap" &&
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
        plugins: ["./src/index.ts"],
        ...opts,
        parser: parsers[0],
      }));

      mergedOptions.forEach((mergedOpts) => {
        let output: string;
        test(`Format ${mergedOpts.parser}: ${filename}`, async () => {
          output = await prettyPrint(source, path, mergedOpts);
          expect(wrap(`${source}${"~".repeat(80)}\n${output}`)).toMatchSnapshot(
            filename,
          );
        });

        if (AST_COMPARE) {
          test(`Verify AST: ${filename}`, async () => {
            const ast = await parse(source, mergedOpts);
            const ppast = await parse(output, mergedOpts);
            expect(ppast).toBeDefined();
            expect(ast).toEqual(ppast);
          });

          test(`Stable format: ${filename}`, async () => {
            const secondOutput = await prettyPrint(output, path, mergedOpts);
            expect(secondOutput).toEqual(output);
          });
        }
      });
    }
  });
}
global.runSpec = runSpec;
