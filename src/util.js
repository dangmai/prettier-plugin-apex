/* eslint no-param-reassign: 0 */

const { isApexDocComment } = require("./comments");
const constants = require("./contants");

const apexNames = constants.APEX_TYPES;

// The metadata corresponding to these keys cannot be compared for some reason
// or another, so we will delete them before the AST comparison
const METADATA_TO_IGNORE = [
  "loc",
  "location",
  "lastNodeLoc",
  "text",
  "rawQuery",
  "@id",
  // It is impossible to preserve the comment AST. Neither recast nor
  // prettier tries to do it so we are not going to bother either.
  "apexComments",
  "$",
  "leading",
  "trailing",
  "hiddenTokenMap",
  "trailingEmptyLine",
  "isLastNodeInArray",
];

/**
 * Massaging the AST so that it can be compared
 * @param ast the Abstract Syntax Tree to compare
 * @returns the massaged AST
 */
function massageMetadata(ast) {
  if (Array.isArray(ast)) {
    return ast.map(e => massageMetadata(e));
  }
  if (typeof ast === "object") {
    let newObj = {};
    // Handling ApexDoc
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
      if (METADATA_TO_IGNORE.indexOf(key) !== -1) {
        return;
      }
      if (key === "scope" && typeof ast[key] === "string") {
        // Apex is case insensitivity, but in sone case we're forcing the strings
        // to be uppercase for consistency so the ASTs may be different between
        // the original and parsed strings.
        newObj[key] = ast[key].toUpperCase();
      } else {
        newObj[key] = massageMetadata(ast[key]);
        // This is a workaround for #38 - jorje sometimes groups names with
        // spaces as dottedExpr, so we can't compare AST effectively.
        // In those cases we will bring the dottedExpr out into the names.
        if (
          key === "dottedExpr" &&
          ast.dottedExpr.value &&
          ast.dottedExpr.value.names &&
          ast.dottedExpr.value["@class"] === apexNames.VARIABLE_EXPRESSION &&
          ast.names
        ) {
          ast.names = ast.dottedExpr.value.names.concat(ast.names);
          newObj.names = ast.names;
          newObj.dottedExpr = newObj.dottedExpr.value.dottedExpr;
        }
      }
    });
    return newObj;
  }
  return ast;
}

/**
 * Helper function to find a character in a string, starting at an index.
 * It will ignore characters that are part of comments.
 */
function findNextUncommentedCharacter(
  sourceCode,
  character,
  fromIndex,
  commentNodes,
  backwards = false,
) {
  let indexFound = false;
  let index;
  while (!indexFound) {
    if (backwards) {
      index = sourceCode.lastIndexOf(character, fromIndex);
    } else {
      index = sourceCode.indexOf(character, fromIndex);
    }
    indexFound =
      // eslint-disable-next-line no-loop-func
      commentNodes.filter(comment => {
        return (
          comment.location.startIndex <= index &&
          comment.location.endIndex >= index
        );
      }).length === 0;
    if (backwards) {
      fromIndex = index - 1;
    } else {
      fromIndex = index + 1;
    }
  }
  return index;
}

module.exports = {
  findNextUncommentedCharacter,
  massageMetadata,
};
