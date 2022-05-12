// This file is copied straight from Prettier's JS implementation,
// since everything works exactly the same for Apex code.

import { extract, parse, parseWithComments, print, strip } from "jest-docblock";

export function hasPragma(text: string): boolean {
  const pragmas = Object.keys(parse(extract(text)));
  return pragmas.indexOf("prettier") !== -1 || pragmas.indexOf("format") !== -1;
}

export function insertPragma(text: string): string {
  const parsedDocblock = parseWithComments(extract(text));
  const pragmas = { format: "", ...parsedDocblock.pragmas };
  const newDocblock = print({
    pragmas,
    comments: parsedDocblock.comments.replace(/^(\s+?\r?\n)+/, ""), // remove leading newlines
  }).replace(/(\r\n|\r)/g, "\n"); // normalise newlines (mitigate use of os.EOL by jest-docblock)
  const strippedText = strip(text);
  const separatingNewlines = strippedText.startsWith("\n") ? "\n" : "\n\n";
  return newDocblock + separatingNewlines + strippedText;
}
