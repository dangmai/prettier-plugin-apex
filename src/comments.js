/* eslint no-param-reassign: 0, no-plusplus: 0, no-else-return: 0, consistent-return: 0 */

const prettier = require("prettier");

const { concat, join, lineSuffix, hardline } = prettier.doc.builders;
const {
  addDanglingComment,
  addTrailingComment,
  skipWhitespace,
} = prettier.util;
const constants = require("./constants");
const { isApexDocComment, isBinaryish } = require("./util");

const apexTypes = constants.APEX_TYPES;

function printDanglingComment(commentPath, options, print) {
  const sourceCode = options.originalText;
  const comment = commentPath.getValue(commentPath);
  const loc = comment.location;
  const isFirstComment = commentPath.getName() === 0;
  const parts = [];

  const fromPos =
    skipWhitespace(sourceCode, loc.startIndex - 1, {
      backwards: true,
    }) + 1;
  const leadingSpace = sourceCode.slice(fromPos, loc.startIndex);
  const numberOfNewLines = isFirstComment
    ? 0
    : (leadingSpace.match(/\n/g) || []).length;

  if (numberOfNewLines > 0) {
    // If the leading space contains newlines, then add at most 2 new lines
    const numberOfNewLinesToInsert = Math.min(numberOfNewLines, 2);
    parts.push(...Array(numberOfNewLinesToInsert).fill(hardline));
  }
  if (comment["@class"] === apexTypes.INLINE_COMMENT) {
    parts.push(lineSuffix(print(commentPath)));
  } else {
    parts.push(print(commentPath));
  }
  comment.printed = true;
  return concat(parts);
}

function canAttachComment(node) {
  return (
    node.loc &&
    node["@class"] &&
    node["@class"] !== apexTypes.INLINE_COMMENT &&
    node["@class"] !== apexTypes.BLOCK_COMMENT
  );
}

function isBlockComment(comment) {
  return comment["@class"] === apexTypes.BLOCK_COMMENT;
}

function willPrintOwnComments() {
  return false;
}

/**
 * Print ApexDoc comment. This is straight from prettier handling of JSDoc
 * @param comment the comment to print.
 */
function printApexDocComment(comment) {
  const lines = comment.value.split("\n");
  return concat([
    join(
      hardline,
      lines.map(
        (commentLine, index) =>
          (index > 0 ? " " : "") +
          (index < lines.length - 1
            ? commentLine.trim()
            : commentLine.trimLeft()),
      ),
    ),
  ]);
}

function printComment(path) {
  // This handles both Inline and Block Comments.
  // We don't just pass through the value because unlike other string literals,
  // this should not be escaped
  const comment = path.getValue();
  let result;
  const node = path.getValue();
  if (isApexDocComment(node)) {
    result = printApexDocComment(node);
  } else {
    result = node.value;
  }
  if (comment.trailingEmptyLine) {
    result = concat([result, hardline]);
  }
  comment.printed = true;
  return result;
}

function getTrailingComments(node) {
  return node.comments.filter(comment => comment.trailing);
}

function handleDanglingComment(comment) {
  const { enclosingNode } = comment;
  if (
    enclosingNode &&
    constants.ALLOW_DANGLING_COMMENTS.indexOf(enclosingNode["@class"]) !== -1 &&
    ((enclosingNode.stmnts && enclosingNode.stmnts.length === 0) ||
      (enclosingNode.members && enclosingNode.members.length === 0))
  ) {
    addDanglingComment(enclosingNode, comment);
    return true;
  }
  return false;
}

function handleBinaryishExpressionTrailingComment(comment) {
  // Handle this situation:
  // a = i | j
  // /* Comments */;
  // We want to put the comment after the entire statement, because it is more
  // stable and also in line with Prettier's core.
  const { precedingNode, enclosingNode, trailingNode } = comment;
  if (
    precedingNode &&
    enclosingNode &&
    !trailingNode &&
    isBinaryish(precedingNode) &&
    enclosingNode.right === precedingNode
  ) {
    addTrailingComment(enclosingNode, comment);
    return true;
  }
  return false;
}

function handleOwnLineComment(comment) {
  return (
    handleDanglingComment(comment) ||
    handleBinaryishExpressionTrailingComment(comment)
  );
}

function handleEndOfLineComment(comment) {
  return (
    handleDanglingComment(comment) ||
    handleBinaryishExpressionTrailingComment(comment)
  );
}

function handleRemainingComment() {
  return false;
}

module.exports = {
  canAttachComment,
  getTrailingComments,
  handleOwnLineComment,
  handleEndOfLineComment,
  handleRemainingComment,
  isApexDocComment,
  isBlockComment,
  printComment,
  printDanglingComment,
  willPrintOwnComments,
};
