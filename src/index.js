const parse = require("./parser");
const print = require("./printer");

const languages = [
  {
    name: "Apex",
    parsers: ["apex"],
    extensions: [".cls", ".trigger"],
    linguistLanguageId: 17,
    vscodeLanguageIds: ["apex"],
  },
];

function locStart(node) {
  if (node.loc) {
    return node.loc;
  }
  return { line: -1, column: -1 };
}

function locEnd() {
  return -1;
}

const parsers = {
  apex: {
    astFormat: "apex",
    parse,
    locStart,
    locEnd,
  },
};

const printers = {
  apex: {
    print,
  },
};

// TODO we have to take out serverHost here, since prettier does not like string
// option - look at optionInfoToSchema in options-normalizer.js
const options = {
  serverAutoStart: {
    type: "boolean",
    category: "Global",
    default: true,
    description: "Whether the nailgun server should be autostarted",
  },
  serverPort: {
    type: "int",
    category: "Global",
    default: 2113,
    description: "Nailgun server port",
  },
};

const defaultOptions = {
  tabWidth: 4,
  printWidth: 100,
};

module.exports = {
  languages,
  printers,
  parsers,
  options,
  defaultOptions,
};
