import type { SupportOptions } from "prettier";

import * as jorje from "../vendor/apex-ast-serializer/typings/jorje.d.js";
import {
  canAttachComment,
  handleEndOfLineComment,
  handleOwnLineComment,
  handleRemainingComment,
  hasPrettierIgnore,
  isBlockComment,
  printComment,
  willPrintOwnComments,
} from "./comments.js";
import { EXCLUDED_VISITOR_KEYS } from "./constants.js";
import parse from "./parser.js";
import { hasPragma, insertPragma } from "./pragma.js";
import printFn from "./printer.js";
import { massageAstNode } from "./util.js";

export const languages = [
  {
    name: "Apex",
    parsers: ["apex"],
    extensions: [".cls", ".trigger"],
    linguistLanguageId: 17,
    vscodeLanguageIds: ["apex"],
  },
  {
    name: "Apex Anonymous",
    parsers: ["apex-anonymous"],
    extensions: [".apex"],
    linguistLanguageId: 17,
    vscodeLanguageIds: ["apex-anon"],
  },
];

interface WithLocation {
  location: jorje.Location;
}
type Locatable = jorje.Locatable & WithLocation;

function locStart(node: Locatable): number {
  const location = node.loc ? node.loc : node.location;
  return location.startIndex;
}

function locEnd(node: Locatable): number {
  const location = node.loc ? node.loc : node.location;
  return location.endIndex;
}

function getVisitorKeys(node: any, nonTraversableKeys: Set<string>): string[] {
  return Object.keys(node)
    .filter(
      (key) => !nonTraversableKeys.has(key) && !EXCLUDED_VISITOR_KEYS.has(key),
    )
    .filter((key) => node[key] != null && Object.keys(node[key]).length > 0);
}

export const parsers = {
  apex: {
    astFormat: "apex",
    parse,
    locStart,
    locEnd,
    hasPragma,
    preprocess: (text: string): string => text.trim(),
  },
  "apex-anonymous": {
    astFormat: "apex",
    parse,
    locStart,
    locEnd,
    hasPragma,
    preprocess: (text: string): string => text.trim(),
  },
};

export const printers = {
  apex: {
    print: printFn,
    massageAstNode,
    getVisitorKeys,
    hasPrettierIgnore,
    insertPragma,
    isBlockComment,
    canAttachComment,
    printComment,
    willPrintOwnComments,
    handleComments: {
      ownLine: handleOwnLineComment,
      endOfLine: handleEndOfLineComment,
      remaining: handleRemainingComment,
    },
  },
};

const CATEGORY_APEX = "apex";

export const options: SupportOptions = {
  apexStandaloneParser: {
    type: "choice",
    category: CATEGORY_APEX,
    default: "native",
    choices: [
      {
        value: "none",
        description: "Do not use a standalone parser",
      },
      {
        value: "built-in",
        description: "Use the built in HTTP standalone parser",
      },
      {
        value: "native",
        description:
          "Use native executable parser, with fallback to Java binaries",
      },
    ],
    description: "Use different methods to speed up parsing. Default to none.",
  },
  apexStandaloneHost: {
    type: "string",
    category: CATEGORY_APEX,
    default: "localhost",
    description:
      "The standalone server host to connect to. Only applicable if apexStandaloneParser is built-in. Default to localhost.",
  },
  apexStandalonePort: {
    type: "int",
    category: CATEGORY_APEX,
    default: 2117,
    description:
      "The standalone server port to connect to. Only applicable if apexStandaloneParser is built-in. Default to 2117.",
  },
  apexStandaloneProtocol: {
    type: "string",
    category: CATEGORY_APEX,
    default: "http",
    description:
      "The protocol for the standalone server. Only applicable if apexStandaloneParser is built-in. Default to http.",
  },
  apexInsertFinalNewline: {
    type: "boolean",
    category: CATEGORY_APEX,
    default: true,
    description:
      "Whether to insert one newline as the last thing in the output. Default to true.",
  },
};

export const defaultOptions = {};
