/* eslint no-param-reassign: 0, no-plusplus: 0, no-else-return: 0, consistent-return: 0 */

const prettier = require("prettier");

const { concat, join, lineSuffix, hardline } = prettier.doc.builders;
const { addDanglingComment, skipWhitespace } = prettier.util;
const constants = require("./constants");

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

/**
 * Check if this comment is an ApexDoc-style comment.
 * This code is straight from prettier JSDoc detection.
 * @param comment the comment to check.
 */
function isApexDocComment(comment) {
  const lines = comment.value.split("\n");
  return (
    lines.length > 1 &&
    lines
      .slice(1, lines.length - 1)
      .every(commentLine => commentLine.trim()[0] === "*")
  );
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

function handleOwnLineComment(comment) {
  return handleDanglingComment(comment);
}

function handleEndOfLineComment(comment) {
  return handleDanglingComment(comment);
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
