// This file is copied straight from Prettier's JS implementation,
// since everything works exactly the same for Apex code.

const docblock = require("jest-docblock");

function hasPragma(text) {
  const pragmas = Object.keys(docblock.parse(docblock.extract(text)));
  return pragmas.indexOf("prettier") !== -1 || pragmas.indexOf("format") !== -1;
}

function insertPragma(text) {
  const parsedDocblock = docblock.parseWithComments(docblock.extract(text));
  const pragmas = { format: "", ...parsedDocblock.pragmas };
  const newDocblock = docblock
    .print({
      pragmas,
      comments: parsedDocblock.comments.replace(/^(\s+?\r?\n)+/, ""), // remove leading newlines
    })
    .replace(/(\r\n|\r)/g, "\n"); // normalise newlines (mitigate use of os.EOL by jest-docblock)
  const strippedText = docblock.strip(text);
  const separatingNewlines = strippedText.startsWith("\n") ? "\n" : "\n\n";
  return newDocblock + separatingNewlines + strippedText;
}

module.exports = {
  hasPragma,
  insertPragma,
};
