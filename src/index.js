const {
  canAttachComment,
  handleEndOfLineComment,
  handleOwnLineComment,
  handleRemainingComment,
  hasPrettierIgnore,
  isBlockComment,
  printComment,
  willPrintOwnComments,
} = require("./comments");
const parse = require("./parser");
const { hasPragma, insertPragma } = require("./pragma");
const print = require("./printer");
const { massageAstNode } = require("./util");

const languages = [
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

function locStart(node) {
  const location = node.loc ? node.loc : node.location;
  return location.startIndex;
}

function locEnd(node) {
  const location = node.loc ? node.loc : node.location;
  return location.endIndex;
}

const parsers = {
  apex: {
    astFormat: "apex",
    parse,
    locStart,
    locEnd,
    hasPragma,
    preprocess: (text) => text.trim(),
  },
  "apex-anonymous": {
    astFormat: "apex",
    parse,
    locStart,
    locEnd,
    hasPragma,
    preprocess: (text) => text.trim(),
  },
};

const printers = {
  apex: {
    print,
    massageAstNode,
    hasPrettierIgnore,
    insertPragma,
    isBlockComment,
    canAttachComment,
    printComment,
    willPrintOwnComments,
    handleComments: {
      ownLine: handleEndOfLineComment,
      endOfLine: handleOwnLineComment,
      remaining: handleRemainingComment,
    },
  },
};

const CATEGORY_APEX = "apex";

const options = {
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
    ],
    description:
      "Use a standalone process to speed up parsing. This process needs to be started and stopped separately from the Prettier process",
  },
  apexStandaloneHost: {
    type: "string",
    category: "Global",
    default: "localhost",
    description:
      "The standalone server host to connect to. Only applicable if apexStandaloneParser is true. Default to localhost.",
  },
  apexStandalonePort: {
    type: "int",
    category: CATEGORY_APEX,
    default: 2117,
    description:
      "The standalone server port to connect to. Only applicable if apexStandaloneParser is true. Default to 2117.",
  },
  apexInsertFinalNewline: {
    type: "boolean",
    category: CATEGORY_APEX,
    default: true,
    description:
      "Whether to insert one newline as the last thing in the output. Default to true.",
  },
};

const defaultOptions = {};

module.exports = {
  languages,
  printers,
  parsers,
  options,
  defaultOptions,
};
