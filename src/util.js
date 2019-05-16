const { isApexDocComment } = require("./comments");
const values = require("./values");

const apexNames = values.APEX_NAMES;

function massageMetadata(ast) {
  if (Array.isArray(ast)) {
    return ast.map(e => massageMetadata(e));
  }
  if (typeof ast === "object") {
    let newObj = {};
    // ApexDoc needs to be massaged a bit before they can be compared
    if (
      ast["@class"] &&
      ast["@class"] === apexNames.BLOCK_COMMENT &&
      isApexDocComment(ast)
    ) {
      newObj = Object.assign({}, ast, {
        value: ast.value.replace(/\s/g, ""),
      });

      delete newObj.$;
      delete newObj.leading;
      delete newObj.trailing;
      delete newObj.location;
      return newObj;
    }
    Object.keys(ast).forEach(key => {
      if (
        key === "loc" ||
        key === "location" ||
        key === "lastNodeLoc" ||
        key === "text" ||
        key === "rawQuery" ||
        key === "@id" ||
        // It is impossible to preserve the comment AST. Neither recase nor
        // prettier tries to do it so we are not going to bother either.
        key === "apexComments" ||
        key === "$" ||
        key === "leading" ||
        key === "trailing" ||
        key === "hiddenTokenMap" ||
        key === "trailingEmptyLine"
      ) {
        return;
      }
      if (key === "scope" && typeof ast[key] === "string") {
        // Apex is case insensitivity, but in sone case we're forcing the strings
        // to be uppercase for consistency so the ASTs may be different between
        // the original and parsed strings.
        newObj[key] = ast[key].toUpperCase();
      } else {
        newObj[key] = massageMetadata(ast[key]);
      }
    });
    return newObj;
  }
  return ast;
}

module.exports = {
  massageMetadata,
};
