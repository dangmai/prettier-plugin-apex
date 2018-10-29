/* eslint no-param-reassign: 0 */

// We use the same algorithm to attach comments as recast
const assert = require("assert");
const prettier = require("prettier");

const { concat, softline } = prettier.doc.builders;
const { skipSpaces } = prettier.util;
const values = require("./values");

const apexNames = values.APEX_NAMES;

function decorateComment(comment, locations, locationMap) {
  let left = 0;
  let right = locations.length;
  let precedingNode;
  let followingNode;
  while (left < right) {
    const middle = (left + right) >> 1; // eslint-disable-line no-bitwise
    const location = locations[middle];
    const child = locationMap.get(location);

    if (
      location.startIndex <= comment.location.startIndex &&
      location.endIndex >= comment.location.endIndex
    ) {
      // The comment is completely contained by this child node
      comment.enclosingNode = child;
      right = middle;
      continue; // eslint-disable-line no-continue
    }

    if (comment.location.startIndex >= location.endIndex) {
      // This child node falls completely after the comment.
      // Because we will never consider this node or any nodes before it again,
      // this node must be the closest preceding node we have encountered so far
      precedingNode = child;
      left = middle + 1;
      continue; // eslint-disable-line no-continue
    }

    if (comment.location.endIndex <= location.startIndex) {
      // This child node falls completely after the comment.
      // Because we will never consider this node or any nodes after
      // it again, this node must be the closest following node we
      // have encountered so far.
      followingNode = child;
      right = middle;
      continue; // eslint-disable-line no-continue
    }

    throw new Error("Comment location overlaps with node location");
  }

  if (precedingNode) {
    comment.precedingNode = precedingNode;
  }

  if (followingNode) {
    comment.followingNode = followingNode;
  }
}

function addCommentHelper(node, comment) {
  const comments = node.apexComments || (node.apexComments = []);
  comments.push(comment);
}

function addLeadingComment(node, comment) {
  comment.leading = true;
  comment.trailing = false;
  addCommentHelper(node, comment);
}

function addDanglingComment(node, comment) {
  comment.leading = false;
  comment.trailing = false;
  addCommentHelper(node, comment);
}

function addTrailingComment(node, comment) {
  comment.leading = false;
  comment.trailing = true;
  addCommentHelper(node, comment);
}

function breakTies(tiesToBreak, sourceCode) {
  const tieCount = tiesToBreak.length;
  if (tieCount === 0) {
    return;
  }

  const pn = tiesToBreak[0].precedingNode;
  const fn = tiesToBreak[0].followingNode;
  let gapEndPos = fn.loc.startIndex;

  // Iterate backwards through tiesToBreak, examining the gaps
  // between the tied comments. In order to qualify as leading, a
  // comment must be separated from fn by an unbroken series of
  // whitespace-only gaps (or other comments).
  let comment;
  let indexOfFirstLeadingComment;
  for (
    indexOfFirstLeadingComment = tieCount;
    indexOfFirstLeadingComment > 0;
    indexOfFirstLeadingComment -= 1
  ) {
    comment = tiesToBreak[indexOfFirstLeadingComment - 1];
    assert.strictEqual(comment.precedingNode, pn);
    assert.strictEqual(comment.followingNode, fn);

    const gap = sourceCode.slice(comment.location.endIndex, gapEndPos);
    if (/\S/.test(gap)) {
      // The gap string contained something other than whitespace.
      break;
    }

    gapEndPos = comment.location.startIndex;
  }

  // eslint-disable-next-line no-cond-assign
  while (
    indexOfFirstLeadingComment <= tieCount &&
    (comment = tiesToBreak[indexOfFirstLeadingComment]) &&
    // If the comment is a //-style comment and indented more
    // deeply than the node itself, reconsider it as trailing.
    comment["@class"] === apexNames.INLINE_COMMENT &&
    comment.location.column > fn.loc.column
  ) {
    indexOfFirstLeadingComment += 1;
  }

  tiesToBreak.forEach((commentNode, i) => {
    if (i < indexOfFirstLeadingComment) {
      addTrailingComment(pn, commentNode);
    } else {
      addLeadingComment(fn, commentNode);
    }
  });

  tiesToBreak.length = 0;
}

function attach(ast, sourceCode, locations, locationMap) {
  const comments = ast[apexNames.PARSER_OUTPUT].hiddenTokenMap
    .map(item => item[1])
    .filter(
      item =>
        item["@class"] === apexNames.INLINE_COMMENT ||
        item["@class"] === apexNames.BLOCK_COMMENT,
    );
  const tiesToBreak = [];

  comments.forEach(comment => {
    decorateComment(comment, locations, locationMap);

    const pn = comment.precedingNode;
    const en = comment.enclosingNode;
    const fn = comment.followingNode;

    if (pn && fn) {
      const tieCount = tiesToBreak.length;
      if (tieCount > 0) {
        const lastTie = tiesToBreak[tieCount - 1];

        assert.strictEqual(
          lastTie.precedingNode === comment.precedingNode,
          lastTie.followingNode === comment.followingNode,
        );

        if (lastTie.followingNode !== comment.followingNode) {
          breakTies(tiesToBreak, sourceCode);
        }
      }

      tiesToBreak.push(comment);
    } else if (pn) {
      // No contest: we have a trailing comment.
      breakTies(tiesToBreak, sourceCode);
      addTrailingComment(pn, comment);
    } else if (fn) {
      // No contest: we have a leading comment.
      breakTies(tiesToBreak, sourceCode);
      addLeadingComment(fn, comment);
    } else if (en) {
      // The enclosing node has no child nodes at all, so what we
      // have here is a dangling comment, e.g. [/* crickets */].
      breakTies(tiesToBreak, sourceCode);
      addDanglingComment(en, comment);
    } else {
      throw new Error("AST contains no nodes at all?");
    }
  });
  breakTies(tiesToBreak, sourceCode);

  comments.forEach(comment => {
    delete comment.precedingNode;
    delete comment.enclosingNode;
    delete comment.followingNode;
  });
}

function printLeadingComment(commentPath, options, print) {
  const comment = commentPath.getValue();
  const parts = [print(commentPath)];

  if (comment.trailing) {
    // When we print trailing comments as leading comments, we don't
    // want to bring any trailing spaces along.
    // parts.push("\n");
  } else {
    // const trailingSpace = skipSpaces();
  }
  parts.push(softline);

  return concat(parts);
}

function printTrailingComment(commentPath, options, print) {
  const sourceCode = options.originalText;
  const comment = commentPath.getValue(commentPath);
  const loc = comment.location;
  const parts = [];

  const fromPos = skipSpaces(sourceCode, loc.startIndex, { backwards: true });
  const leadingSpace = sourceCode.slice(fromPos, loc.startIndex);

  if (leadingSpace.length === 1) {
    // If the leading space contains no newlines, then we want to
    // preserve it exactly as we found it.
    parts.push(leadingSpace);
  } else {
    // If the leading space contains newlines, then replace it
    // with just that many newlines, sans all other spaces.
    parts.push(new Array(leadingSpace.length).join(softline));
  }

  parts.push(print(commentPath));

  return concat(parts);
}

function printComments(path, options, print) {
  const value = path.getValue();
  const innerLines = print(path);
  const comments = value ? value.apexComments : null;

  if (!comments || comments.length === 0) {
    return innerLines;
  }

  const leadingParts = [];
  const trailingParts = [innerLines];

  path.each(commentPath => {
    const comment = commentPath.getValue();
    const { leading, trailing } = comment;

    if (
      leading ||
      (trailing &&
        !(
          comment["@class"] === apexNames.BLOCK_COMMENT ||
          comment.type === "CommentBlock"
        ))
    ) {
      leadingParts.push(printLeadingComment(commentPath, options, print));
    } else if (trailing) {
      trailingParts.push(printTrailingComment(commentPath, options, print));
    }
  }, "apexComments");

  // eslint-disable-next-line prefer-spread
  leadingParts.push.apply(leadingParts, trailingParts);
  return concat(leadingParts);
}

module.exports = {
  attach,
  printComments,
};
