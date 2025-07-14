import type { AstPath, Doc, ParserOptions } from "prettier";
import * as prettier from "prettier";

import type * as jorje from "../vendor/apex-ast-serializer/typings/jorje.d.js";
import { ALLOW_DANGLING_COMMENTS, APEX_TYPES } from "./constants.js";
import {
  type AnnotatedComment,
  type GenericComment,
  isApexDocComment,
  isBinaryish,
} from "./util.js";

const { join, lineSuffix, hardline } = prettier.doc.builders;
const {
  addDanglingComment,
  addLeadingComment,
  addTrailingComment,
  hasNewlineInRange,
  skipWhitespace,
} = prettier.util;

/**
 * Print ApexDoc comment. This is straight from prettier handling of JSDoc
 * @param comment the comment to print.
 */
function printApexDocComment(comment: jorje.BlockComment): Doc {
  const lines = comment.value.split("\n");
  return [
    join(
      hardline,
      lines.map(
        (commentLine, index) =>
          (index > 0 ? " " : "") +
          (index < lines.length - 1
            ? commentLine.trim()
            : commentLine.trimStart()),
      ),
    ),
  ];
}

export function isPrettierIgnore(comment: AnnotatedComment): boolean {
  let content: string;
  if (comment["@class"] === APEX_TYPES.BLOCK_COMMENT) {
    // For simplicity sake we only support this format
    // /* prettier-ignore */
    content = comment.value
      .trim()
      .substring(2, comment.value.length - 2)
      .trim();
  } else {
    content = comment.value.trim().substring(2).trim();
  }
  return content === "prettier-ignore";
}

export function printComment(path: AstPath): Doc {
  // This handles both Inline and Block Comments.
  // We don't just pass through the value because unlike other string literals,
  // this should not be escaped
  let result: Doc;
  const node = path.getNode();
  if (isApexDocComment(node)) {
    result = printApexDocComment(node);
  } else {
    result = node.value;
  }
  if (node.trailingEmptyLine) {
    result = [result, hardline];
  }
  node.printed = true;
  return result;
}

export function printDanglingComment(
  commentPath: AstPath,
  options: ParserOptions,
): Doc {
  const sourceCode = options.originalText;
  const comment = commentPath.getNode();
  const loc = comment.location;
  const isFirstComment = commentPath.getName() === 0;
  const parts = [];

  let fromPos = skipWhitespace(sourceCode, loc.startIndex - 1, {
    backwards: true,
  });
  /* v8 ignore next 3 */
  if (fromPos === false) {
    return "";
  }
  fromPos += 1;
  const leadingSpace = sourceCode.slice(fromPos, loc.startIndex);
  const numberOfNewLines = isFirstComment
    ? 0
    : /* v8 ignore next 1 */
      (leadingSpace.match(/\n/g) || []).length;

  if (numberOfNewLines > 0) {
    // If the leading space contains newlines, then add at most 2 new lines
    const numberOfNewLinesToInsert = Math.min(numberOfNewLines, 2);
    parts.push(...Array(numberOfNewLinesToInsert).fill(hardline));
  }
  if (comment["@class"] === APEX_TYPES.INLINE_COMMENT) {
    parts.push(lineSuffix(printComment(commentPath)));
  } else {
    parts.push(printComment(commentPath));
  }
  comment.printed = true;
  return parts;
}

/**
 * This is called by Prettier's comment handling code, in order for Prettier
 * to tell if this is a node to which a comment can be attached.
 *
 * @param node The current node
 * @returns {boolean} whether a comment can be attached to this node or not.
 */
export function canAttachComment(node: any): boolean {
  return (
    node.loc &&
    node["@class"] &&
    node["@class"] !== APEX_TYPES.INLINE_COMMENT &&
    node["@class"] !== APEX_TYPES.BLOCK_COMMENT
  );
}

/**
 * This is called by Prettier's comment handling code, in order to find out
 * if this is a block comment.
 *
 * @param comment The current comment node.
 * @returns {boolean} whether it is a block comment.
 */
export function isBlockComment(comment: GenericComment): boolean {
  return comment["@class"] === APEX_TYPES.BLOCK_COMMENT;
}

/**
 * This is called by Prettier's comment handling code.
 * We can use this to tell Prettier that we will print comments manually on
 * certain nodes.
 * @returns {boolean} whether or not we will print the comment on this node manually.
 */
export function willPrintOwnComments(path: AstPath): boolean {
  const node = path.getNode();
  return !node || !node["@class"] || node["@class"] === APEX_TYPES.ANNOTATION;
}

export function getTrailingComments(node: any): AnnotatedComment[] {
  return node.comments.filter((comment: AnnotatedComment) => comment.trailing);
}

function handleDanglingComment(comment: AnnotatedComment): boolean {
  const { enclosingNode } = comment;
  if (
    enclosingNode &&
    ALLOW_DANGLING_COMMENTS.indexOf(enclosingNode["@class"]) !== -1 &&
    ((enclosingNode.stmnts && enclosingNode.stmnts.length === 0) ||
      (enclosingNode.members && enclosingNode.members.length === 0))
  ) {
    addDanglingComment(enclosingNode, comment, null);
    return true;
  }
  return false;
}

/**
 * Turn the leading comment to a WhereExpression inside a
 * WhereCompoundExpression into a trailing comment to the previous WhereExpression.
 * The reason is that a WhereExpression does not contain the location of
 * the WhereCompoundOp (e.g. AND, OR), and without doing that, the following
 * transformation occurs:
 * ```
 * SELECT Id
 * FROM Contact
 * WHERE
 *   Name = 'Name'
 *   AND
 *     // Comment
 *     Name = 'Another Name'
 * ```
 * Instead, this looks better:
 * ```
 * SELECT Id
 * FROM Contact
 * WHERE
 *   Name = 'Name'
 *   // Comment
 *   AND Name = 'Another Name'
 * ```
 */
function handleWhereExpression(
  comment: AnnotatedComment,
  sourceCode: string,
): boolean {
  const { enclosingNode, precedingNode, followingNode } = comment;
  if (
    !enclosingNode ||
    !precedingNode ||
    !followingNode ||
    !precedingNode["@class"] ||
    !followingNode["@class"] ||
    enclosingNode["@class"] !== APEX_TYPES.WHERE_COMPOUND_EXPRESSION ||
    comment.location === undefined ||
    comment.location.startIndex === undefined
  ) {
    return false;
  }
  if (
    hasNewlineInRange(
      sourceCode,
      precedingNode.loc.endIndex,
      comment.location.startIndex,
    )
  ) {
    addTrailingComment(precedingNode, comment);
    return true;
  }
  return false;
}

/**
 * Bring leading comment before Block Statement into the block itself:
 * ```
 * for (
 *   Contact a: [SELECT Id FROM Contact]
 *   // Trailing EOL Inline comment
 * ) {
 *   System.debug('Hello');
 * }
 * ```
 * transformed into
 * ```
 * for (Contact a: [SELECT Id FROM Contact]) {
 *   // Trailing EOL Inline Comment
 *   System.debug('Hello');
 * }
 * ```
 */
function handleBlockStatementLeadingComment(
  comment: AnnotatedComment,
): boolean {
  const { followingNode } = comment;
  if (
    !followingNode ||
    followingNode["@class"] !== APEX_TYPES.BLOCK_STATEMENT
  ) {
    return false;
  }
  if (followingNode.stmnts.length) {
    addLeadingComment(followingNode.stmnts[0], comment);
  } else {
    addDanglingComment(followingNode, comment, null);
  }
  return true;
}

/**
 * In a binaryish expression, if there is an end of line comment, we want to
 * attach it to the right child expression instead of the entire binaryish
 * expression, because doing the latter can lead to unstable comments in
 * certain situations.
 */
function handleBinaryishExpressionRightChildTrailingComment(
  comment: AnnotatedComment,
) {
  const { precedingNode } = comment;
  if (
    comment.placement !== "endOfLine" ||
    !precedingNode ||
    !isBinaryish(precedingNode)
  ) {
    return false;
  }
  addTrailingComment(precedingNode.right, comment);
  return true;
}

/**
 * Turn the leading comment in a long method or variable chain into the preceding
 * comment of a previous node. Without doing that, we have an awkward position
 * for the . character like so:
 * ```
 * return StringBuilder()
 *   .// Test Comment
 *   append('Hello')
 *   .toString();
 * ```
 * Instead, this looks better:
 * ```
 * return StringBuilder()
 *   // Test Comment
 *   .append('Hello')
 *   .toString();
 * ```
 */
function handleLongChainComment(comment: AnnotatedComment): boolean {
  const { enclosingNode, precedingNode, followingNode } = comment;
  if (
    !enclosingNode ||
    !precedingNode ||
    !followingNode ||
    (enclosingNode["@class"] !== APEX_TYPES.METHOD_CALL_EXPRESSION &&
      enclosingNode["@class"] !== APEX_TYPES.VARIABLE_EXPRESSION)
  ) {
    return false;
  }
  if (
    enclosingNode.dottedExpr &&
    enclosingNode.dottedExpr.value === precedingNode
  ) {
    addTrailingComment(precedingNode, comment);
    return true;
  }
  return false;
}

// #1946 - when a comment is between the `continue`/`break`/`return` statement and
// the `;` at the end of the line, it is technically a dangling comment to that
// node. However, it makes more sense to simply classify it as a trailing
// comment to the statement itself, i.e.:
// ```
// continue /* Comment */;
// ```
// should be formatted as:
// ```
// continue; /* Comment */
// ```
function handleContinueBreakDanglingComment(
  comment: AnnotatedComment,
): boolean {
  const { enclosingNode } = comment;
  if (!enclosingNode) {
    return false;
  }
  if (
    enclosingNode["@class"] === APEX_TYPES.CONTINUE_STATEMENT ||
    enclosingNode["@class"] === APEX_TYPES.BREAK_STATEMENT
  ) {
    addTrailingComment(enclosingNode, comment);
    return true;
  }
  if (
    enclosingNode["@class"] === APEX_TYPES.RETURN_STATEMENT &&
    // if there is some value that's returned, the comment is attached to that
    // value, so we don't need to handle this case
    !enclosingNode.expr.value
  ) {
    addTrailingComment(enclosingNode, comment);
    return true;
  }
  return false;
}

/**
 * #383 (bug number 2) - If a prettier-ignore comment is attached to a modifier,
 * we need to bring it up a level, otherwise the only thing that's getting
 * ignored is the modifier itself, not the expression surrounding it (which is
 * more likely what the user wants).
 */
function handleModifierPrettierIgnoreComment(
  comment: AnnotatedComment,
): boolean {
  const { enclosingNode, followingNode } = comment;
  if (
    !isPrettierIgnore(comment) ||
    !enclosingNode ||
    !followingNode ||
    !followingNode["@class"] ||
    !followingNode["@class"].startsWith(APEX_TYPES.MODIFIER)
  ) {
    return false;
  }
  addLeadingComment(enclosingNode, comment);
  return true;
}

/**
 * This is called by Prettier's comment handling code, in order to handle
 * comments that are on their own line.
 *
 * @param comment The comment node.
 * @param sourceCode The entire source code.
 * @returns {boolean} Whether we have manually attached this comment to some AST
 * node. If `true` is returned, Prettier will no longer try to attach this
 * comment based on its internal heuristic.
 */
export function handleOwnLineComment(
  comment: AnnotatedComment,
  sourceCode: string,
): boolean {
  return (
    handleDanglingComment(comment) ||
    handleBlockStatementLeadingComment(comment) ||
    handleWhereExpression(comment, sourceCode) ||
    handleModifierPrettierIgnoreComment(comment) ||
    handleLongChainComment(comment)
  );
}

/**
 * This is called by Prettier's comment handling code, in order to handle
 * comments that have preceding text but no trailing text on a line.
 *
 * @param comment The comment node.
 * @param sourceCode The entire source code.
 * @returns {boolean} Whether we have manually attached this comment to some AST
 * node. If `true` is returned, Prettier will no longer try to attach this
 * comment based on its internal heuristic.
 */
export function handleEndOfLineComment(
  comment: AnnotatedComment,
  sourceCode: string,
): boolean {
  return (
    handleDanglingComment(comment) ||
    handleBinaryishExpressionRightChildTrailingComment(comment) ||
    handleBlockStatementLeadingComment(comment) ||
    handleWhereExpression(comment, sourceCode) ||
    handleModifierPrettierIgnoreComment(comment) ||
    handleLongChainComment(comment) ||
    handleContinueBreakDanglingComment(comment)
  );
}

/**
 * This is called by Prettier's comment handling code, in order to handle
 * comments that have both preceding text and trailing text on a line.
 *
 * @param comment The comment node.
 * @param sourceCode The entire source code.
 * @returns {boolean} Whether we have manually attached this comment to some AST
 * node. If `true` is returned, Prettier will no longer try to attach this
 * comment based on its internal heuristic.
 */
export function handleRemainingComment(
  comment: AnnotatedComment,
  sourceCode: string,
): boolean {
  return (
    handleWhereExpression(comment, sourceCode) ||
    handleModifierPrettierIgnoreComment(comment) ||
    handleLongChainComment(comment) ||
    handleContinueBreakDanglingComment(comment)
  );
}

/**
 * This is called by Prettier's comment handling code, in order to find out
 * if a node should be formatted or not.
 * @param path The FastPath object.
 * @returns {boolean} Whether the path should be formatted.
 */
export function hasPrettierIgnore(path: AstPath): boolean {
  const node = path.getNode();
  return (
    node?.comments?.length > 0 &&
    node.comments.filter(isPrettierIgnore).length > 0
  );
}
