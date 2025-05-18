/* eslint no-param-reassign: 0 */
import fs from "node:fs/promises";
import module from "node:module";
import nodePath from "node:path";
import * as url from "node:url";
import { AstPath } from "prettier";

import * as jorje from "../vendor/apex-ast-serializer/typings/jorje.d.js";
import {
  APEX_TYPES,
  AST_ROOT_NODE_CLASS,
  DATA_CATEGORY,
  MODIFIER,
  ORDER,
  ORDER_NULL,
  QUERY,
  QUERY_WHERE,
} from "./constants.js";

export type Ast = {
  unit: jorje.CompilationUnit;
  loc: Omit<jorje.Location, "loc">;
  comments: jorje.HiddenToken[];
  "@class": typeof AST_ROOT_NODE_CLASS;
};

export type JorjeResponse = {
  [APEX_TYPES.PARSER_OUTPUT]: jorje.ParserOutput;
};

export type GenericComment = jorje.HiddenToken;

type AstNode = {
  "@class": string;
  "@id": string;
};
type ReferenceNode = {
  "@reference": string;
};
export type Node = AstNode | ReferenceNode;

export type AnnotatedAstNode = AstNode & {
  trailingEmptyLine?: boolean;
};

export type AnnotatedComment = AnnotatedAstNode &
  GenericComment & {
    trailing?: boolean;
    leading?: boolean;
    printed?: boolean;
    enclosingNode?: any;
    followingNode?: any;
    precedingNode?: any;
    placement: string;
  };

export function isBinaryish(node: jorje.Expr): boolean {
  return (
    node["@class"] === APEX_TYPES.BOOLEAN_EXPRESSION ||
    node["@class"] === APEX_TYPES.BINARY_EXPRESSION
  );
}

/**
 * Check if this comment is an ApexDoc-style comment.
 * This code is straight from prettier JSDoc detection.
 * @param comment the comment to check.
 */
export function isApexDocComment(comment: jorje.BlockComment): boolean {
  const lines = comment.value.split("\n");
  return (
    lines.length > 1 &&
    lines
      .slice(1, lines.length - 1)
      .every((commentLine) => commentLine.trim()[0] === "*")
  );
}

export function checkIfParentIsDottedExpression(path: AstPath): boolean {
  const node = path.getNode();
  const parentNode = path.getParentNode();

  let result = false;
  // We're making an assumption here that `callParent` is always synchronous.
  // We're doing it because FastPath does not expose other ways to find the
  // parent name.
  let parentNodeName;
  let grandParentNodeName;
  path.callParent((innerPath) => {
    parentNodeName = innerPath.getName();
  });
  path.callParent((innerPath) => {
    grandParentNodeName = innerPath.getName();
  }, 1);
  if (parentNodeName === "dottedExpr") {
    result = true;
  } else if (
    node["@class"] === APEX_TYPES.VARIABLE_EXPRESSION &&
    parentNode["@class"] === APEX_TYPES.ARRAY_EXPRESSION &&
    grandParentNodeName === "dottedExpr"
  ) {
    // a
    //   .b[0]  // <- Node b here
    //   .c()
    // For this situation we want to flag b as a nested dotted expression,
    // so that we can make it part of the grand parent's group, even though
    // technically it's the grandchild of the dotted expression.
    result = true;
  }
  return result;
}

// The metadata corresponding to these keys cannot be compared for some reason
// or another, so we will delete them before the AST comparison
const METADATA_TO_IGNORE = [
  "loc",
  "location",
  "lastNodeLoc",
  "text",
  "rawQuery",
  "@id",
  // It is impossible to preserve the comment AST. Neither recast nor
  // prettier tries to do it so we are not going to bother either.
  "comments",
  "$",
  "leading",
  "trailing",
  "hiddenTokenMap",
  "trailingEmptyLine",
  "forcedHardline",
];

/**
 * Massaging the AST node so that it can be compared. This gets called by
 * Prettier's internal code
 * @param ast the Abstract Syntax Tree to compare
 * @param newObj the newly created object
 */
export function massageAstNode(ast: any, newObj: any): any {
  // Handling ApexDoc
  if (
    ast["@class"] &&
    ast["@class"] === APEX_TYPES.BLOCK_COMMENT &&
    isApexDocComment(ast)
  ) {
    newObj.value = ast.value.replace(/\s/g, "");
  }
  if (ast.scope && typeof ast.scope === "string") {
    // Apex is case insensitivity, but in some case we're forcing the strings
    // to be uppercase for consistency so the ASTs may be different between
    // the original and parsed strings.
    newObj.scope = ast.scope.toUpperCase();
  } else if (
    ast.dottedExpr &&
    ast.dottedExpr.value &&
    ast.dottedExpr.value.names &&
    ast.dottedExpr.value["@class"] === APEX_TYPES.VARIABLE_EXPRESSION &&
    ast.names
  ) {
    // This is a workaround for #38 - jorje sometimes groups names with
    // spaces as dottedExpr, so we can't compare AST effectively.
    // In those cases we will bring the dottedExpr out into the names.
    newObj.names = newObj.dottedExpr.value.names.concat(newObj.names);
    newObj.dottedExpr = newObj.dottedExpr.value.dottedExpr;
  } else if (
    ast["@class"] &&
    ast["@class"] === APEX_TYPES.WHERE_COMPOUND_EXPRESSION
  ) {
    // This flattens the SOQL/SOSL Compound Expression, e.g.:
    // SELECT Id FROM Account WHERE Name = 'Name' AND (Status = 'Active' AND City = 'Boston')
    // is equivalent to:
    // SELECT Id FROM Account WHERE Name = 'Name' AND Status = 'Active' AND City = 'Boston'
    for (let i = newObj.expr.length - 1; i >= 0; i -= 1) {
      if (
        newObj.expr[i]["@class"] === APEX_TYPES.WHERE_COMPOUND_EXPRESSION &&
        newObj.expr[i].op["@class"] === newObj.op["@class"]
      ) {
        newObj.expr.splice(i, 1, ...newObj.expr[i].expr);
      }
    }
  }
  METADATA_TO_IGNORE.forEach((name) => delete newObj[name]);
}

/**
 * Helper function to find a character in a string, starting at an index.
 * It will ignore characters that are part of comments.
 */
export function findNextUncommentedCharacter(
  sourceCode: string,
  character: string,
  fromIndex: number,
  commentNodes: GenericComment[],
  backwards = false,
): number {
  let indexFound = false;
  let index = -1;

  const findIndex = (comment: GenericComment) =>
    comment.location &&
    comment.location.startIndex &&
    comment.location.endIndex &&
    comment.location.startIndex <= index &&
    comment.location.endIndex - 1 >= index;
  while (!indexFound) {
    if (backwards) {
      index = sourceCode.lastIndexOf(character, fromIndex);
    } else {
      index = sourceCode.indexOf(character, fromIndex);
    }
    indexFound = commentNodes.filter(findIndex).length === 0;
    if (backwards) {
      fromIndex = index - 1;
    } else {
      fromIndex = index + 1;
    }
  }
  return index;
}

// Optimization to look up parent types faster
const PARENT_TYPES = [
  ...Object.values(APEX_TYPES),
  ...Object.keys(DATA_CATEGORY),
  ...Object.keys(MODIFIER),
  ...Object.keys(QUERY),
  ...Object.keys(QUERY_WHERE),
  ...Object.keys(ORDER),
  ...Object.keys(ORDER_NULL),
]
  .filter((type) => type.includes("$"))
  .reduce(
    (acc, type) => {
      const [parentType] = type.split("$");
      if (parentType) {
        acc[type] = parentType;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

export function getParentType(type: string): string | undefined {
  return PARENT_TYPES[type];
}

// One big difference between our precedence list vs Prettier's core
// is that == (and its precedence equivalences) has the same precedence
// as < (and its precedence equivalences).
// e.g. a > b == c > d:
// in Javascript, this would be parsed this as: left (a > b), op (==), right (c > d)
// instead, jorje parses this as:
// left (a > b == c), op (>), right (d)
// The consequence is that formatted code does not look as nice as Prettier's core,
// but we can't change it because it will change the code's behavior.
const PRECEDENCE: { [key: string]: number } = {};
[
  ["||"],
  ["&&"],
  ["|"],
  ["^"],
  ["&"],
  ["==", "===", "!=", "!==", "<>", "<", ">", "<=", ">="],
  [">>", "<<", ">>>"],
  ["+", "-"],
  ["*", "/", "%"],
].forEach((tier, i) => {
  tier.forEach((op) => {
    PRECEDENCE[op] = i;
  });
});

export function getPrecedence(op: string): number {
  const precedence = PRECEDENCE[op];
  /* v8 ignore start */
  if (precedence === undefined) {
    throw new Error(`Failed to get precedence for operator ${op}`);
  }
  /* v8 ignore start */
  return precedence;
}

export async function doesFileExist(file: string): Promise<boolean> {
  return fs
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

// The relative path to the binary can be different based on how the script
// is being run - running using tsx vs running after code has been compiled
// to `dist` directory. We use this method to abstract out that difference.
export async function getSerializerBinDirectory(): Promise<string> {
  let serializerBin = nodePath.join(
    url.fileURLToPath(new URL(".", import.meta.url)),
    "../vendor/apex-ast-serializer/bin",
  );
  /* v8 ignore start */
  if (!(await doesFileExist(serializerBin))) {
    serializerBin = nodePath.join(
      url.fileURLToPath(new URL(".", import.meta.url)),
      "../../vendor/apex-ast-serializer/bin",
    );
  }
  // NodeJS struggles to spawn Windows processes with path having special characters,
  // like `=`, so we try to minimize that by using relative paths.
  /* v8 ignore stop */
  return nodePath.relative(process.cwd(), serializerBin);
}

export const NATIVE_PACKAGES: Record<string, string> = {
  "darwin-x64": "@prettier-apex/apex-ast-serializer-darwin-x64",
  "darwin-arm64": "@prettier-apex/apex-ast-serializer-darwin-arm64",
  "linux-x64": "@prettier-apex/apex-ast-serializer-linux-x64",
  "win32-x64": "@prettier-apex/apex-ast-serializer-win32-x64",
};

export function getNativeExecutableNameForPlatform(
  fullPlatform: string,
): string {
  return `apex-ast-serializer-${fullPlatform}${fullPlatform.startsWith("win32") ? ".exe" : ""}`;
}

export async function getNativeExecutableWithFallback(): Promise<string> {
  const { arch, platform } = process;
  const packageName = NATIVE_PACKAGES[`${platform}-${arch}`];
  try {
    if (!packageName) {
      throw new Error("No prebuilt binary available for this platform");
    }
    const nativeBin = nodePath.join(
      packageName,
      getNativeExecutableNameForPlatform(`${platform}-${arch}`),
    );
    const require = module.createRequire(import.meta.url);
    return nodePath.relative(process.cwd(), require.resolve(nativeBin));
  } catch (e: any) {
    if ("code" in e && e.code === "MODULE_NOT_FOUND") {
      console.warn(
        `Your platform ${platform}-${arch} is natively supported by Prettier Apex, but the executable cannot be found.`,
      );
      console.warn(
        `If you didn't intentionally install Prettier Apex with ignore-optional flag, please file a bug report.`,
      );
      console.warn(`Falling back to Java-based serializer.`);
    }
    return nodePath.join(
      await getSerializerBinDirectory(),
      `apex-ast-serializer${process.platform === "win32" ? ".bat" : ""}`,
    );
  }
}
