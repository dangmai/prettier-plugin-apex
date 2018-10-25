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

const options = {
  serverAutoStart: {
    type: "boolean",
    category: "Global",
    default: true,
    description: "Whether the nailgun server should be autostarted",
  },
  serverPort: {
    type: "number",
    category: "Global",
    default: 2113,
    description: "Nailgun server port",
  },
  serverHost: {
    type: "string",
    category: "Global",
    default: "localhost",
    description: "Nailgun server host",
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
