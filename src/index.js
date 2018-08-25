"use strict";

const parse = require("./parser");
const print = require("./printer");

const languages = [
  {
    name: "Apex",
    parsers: ["apex"],
    extensions: [".cls", ".trigger"],
    linguistLanguageId: 17,
    vscodeLanguageIds: ["apex"],
  }
];

function locStart(node) {
  if (node.loc) {
    return node.loc;
  }
  return {line: -1, column: -1};
}

function locEnd() {
  return -1;
}

const parsers = {
  "apex": {
    astFormat: "apex",
    parse,
    locStart,
    locEnd,
  },
};

const printers = {
  apex: {
    print
  }
};

module.exports = {
  languages,
  printers,
  parsers,
};
