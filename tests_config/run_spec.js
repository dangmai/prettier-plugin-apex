const fs = require("fs");
const { extname } = require("path");
const prettier = require("prettier");

const { AST_COMPARE } = process.env;

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

function prettyPrint(src, filename, options) {
  return prettier.format(src, {
    filepath: filename,
    apexStandaloneParser: "built-in",
    apexStandalonePort: 2117,
    apexStandaloneHost: "localhost",
    ...options,
  });
}

function parse(string, opts) {
  // eslint-disable-next-line no-underscore-dangle
  return prettier.__debug.parse(
    string,
    {
      apexStandaloneParser: "built-in",
      apexStandalonePort: 2117,
      apexStandaloneHost: "localhost",
      ...opts,
    },
    /* massage */ true,
  ).ast;
}

/**
 * Wraps a string in a marker object that is used by `./raw-serializer.js` to
 * directly print that string in a snapshot without escaping all double quotes.
 * Backticks will still be escaped.
 */
function raw(string) {
  if (typeof string !== "string") {
    throw new Error("Raw snapshots have to be strings.");
  }
  return { [Symbol.for("raw")]: string };
}

function runSpec(dirname, parsers, specOptions) {
  /* instabul ignore if */
  if (!parsers || !parsers.length) {
    throw new Error(`No parsers were specified for ${dirname}`);
  }

  fs.readdirSync(dirname).forEach((filename) => {
    const path = `${dirname}/${filename}`;
    if (
      extname(filename) !== ".snap" &&
      fs.lstatSync(path).isFile() &&
      filename[0] !== "." &&
      filename !== "jsfmt.spec.js"
    ) {
      const source = read(path).replace(/\r\n/g, "\n");

      let options;
      if (!Array.isArray(specOptions)) {
        options = [specOptions];
      } else {
        options = specOptions;
      }
      const mergedOptions = options.map((opts) => ({
        plugins: ["."],
        ...opts,
        parser: parsers[0],
      }));

      mergedOptions.forEach((mergedOpts) => {
        const output = prettyPrint(source, path, mergedOpts);
        test(`Format ${mergedOpts.parser}: ${filename}`, () => {
          expect(raw(`${source}${"~".repeat(80)}\n${output}`)).toMatchSnapshot(
            filename,
          );
        });

        if (AST_COMPARE) {
          const ast = parse(source, mergedOpts);
          const ppast = parse(output, mergedOpts);
          const secondOutput = prettyPrint(output, path, mergedOpts);

          test(`Verify AST: ${filename}`, () => {
            expect(ppast).toBeDefined();
            expect(ast).toEqual(ppast);
          });

          test(`Stable format: ${filename}`, () => {
            expect(secondOutput).toEqual(output);
          });
        }
      });
    }
  });
}
global.run_spec = runSpec;
