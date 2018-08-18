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
  return -1;
}

function locEnd(node) {
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
