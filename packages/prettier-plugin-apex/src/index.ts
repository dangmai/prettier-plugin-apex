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
    default: "none",
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
        description: "Use native executable parser",
      },
    ],
    description:
      "Use a standalone process to speed up parsing. This process needs to be started and stopped separately from the Prettier process",
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
