const fs = require("fs");
const { extname } = require("path");
const prettier = require("prettier");

const { AST_COMPARE } = process.env;

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

function prettyprint(src, filename, options) {
  return prettier.format(
    src,
    Object.assign(
      {
        filepath: filename,
        serverAutoStart: false,
      },
      options,
    ),
  );
}

function stripLocation(ast) {
  if (Array.isArray(ast)) {
    return ast.map(e => stripLocation(e));
  }
  if (typeof ast === "object") {
    const newObj = {};
    Object.keys(ast).forEach(key => {
      if (
        key === "loc" ||
        key === "location" ||
        key === "lastNodeLoc" ||
        key === "text" ||
        key === "rawQuery" ||
        key === "@id" ||
        key === "hiddenTokenMap" // TODO remove this when we finish implement comments
      ) {
        return;
      }
      newObj[key] = stripLocation(ast[key]);
    });
    return newObj;
  }
  return ast;
}

function parse(string, opts) {
  return stripLocation(
    // eslint-disable-next-line no-underscore-dangle
    prettier.__debug.parse(
      string,
      Object.assign(
        {
          serverAutoStart: false,
        },
        opts,
      ),
    ),
  );
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

function runSpec(dirname, parsers, options) {
  // eslint-disable-next-line no-param-reassign
  options = Object.assign(
    {
      plugins: ["."],
    },
    options,
  );

  /* instabul ignore if */
  if (!parsers || !parsers.length) {
    throw new Error(`No parsers were specified for ${dirname}`);
  }

  fs.readdirSync(dirname).forEach(filename => {
    const path = `${dirname}/${filename}`;
    if (
      extname(filename) !== ".snap" &&
      fs.lstatSync(path).isFile() &&
      filename[0] !== "." &&
      filename !== "jsfmt.spec.js"
    ) {
      const source = read(path).replace(/\r\n/g, "\n");

      const mergedOptions = Object.assign({}, options, {
        parser: parsers[0],
      });
      const output = prettyprint(source, path, mergedOptions);
      test(`${filename} - ${mergedOptions.parser}-verify`, () => {
        expect(raw(`${source}${"~".repeat(80)}\n${output}`)).toMatchSnapshot(
          filename,
        );
      });

      if (AST_COMPARE) {
        const ast = parse(source, mergedOptions);
        const ppast = parse(
          prettyprint(source, path, mergedOptions),
          mergedOptions,
        );

        test(`${path} parse`, () => {
          expect(ppast).toBeDefined();
          expect(ast).toEqual(ppast);
        });
      }
    }
  });
}
global.run_spec = runSpec;
