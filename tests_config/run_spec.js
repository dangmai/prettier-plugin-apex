const fs = require("fs");
const { extname } = require("path");
const prettier = require("prettier");

const { AST_COMPARE } = process.env;

const values = require("../src/values");
const { isApexDocComment } = require("../src/comments");

const apexNames = values.APEX_NAMES;

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

function prettyprint(src, filename, options) {
  return prettier.format(
    src,
    Object.assign(
      {
        filepath: filename,
        useStandaloneServer: true,
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
    let newObj = {};
    // ApexDoc needs to be massaged a bit before they can be compared
    if (
      ast["@class"] &&
      ast["@class"] === apexNames.BLOCK_COMMENT &&
      isApexDocComment(ast)
    ) {
      newObj = Object.assign({}, ast, {
        value: ast.value.replace(/\s/g, ""),
      });

      delete newObj.$;
      delete newObj.leading;
      delete newObj.trailing;
      delete newObj.location;
      return newObj;
    }
    Object.keys(ast).forEach(key => {
      if (
        key === "loc" ||
        key === "location" ||
        key === "lastNodeLoc" ||
        key === "text" ||
        key === "rawQuery" ||
        key === "@id" ||
        // It is impossible to preserve the comment AST. Neither recase nor
        // prettier tries to do it so we are not going to bother either.
        // We are still striving to not lose comments however, hence why we
        // don't blacklist hiddenToken
        key === "apexComments" ||
        key === "$" ||
        key === "leading" ||
        key === "trailing"
      ) {
        return;
      }
      if (key === "scope" && typeof ast[key] === "string") {
        // Apex is case insensitivity, but in sone case we're forcing the strings
        // to be uppercase for consistency so the ASTs may be different between
        // the original and parsed strings.
        newObj[key] = ast[key].toUpperCase();
      } else {
        newObj[key] = stripLocation(ast[key]);
      }
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
          useStandaloneServer: true,
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
