/* eslint no-param-reassign: 0, no-plusplus: 0, no-else-return: 0, consistent-return: 0 */

// We use the same algorithm to attach comments as recast
const assert = require("assert");
const prettier = require("prettier");

const { concat, lineSuffix, hardline } = prettier.doc.builders;
const { skipWhitespace } = prettier.util;
const childNodesCacheKey = require("private").makeUniqueKey();
const values = require("./values");

const apexNames = values.APEX_NAMES;

function getSortedChildNodes(node, resultArray) {
  if (resultArray && node.loc) {
    let i;
    for (i = resultArray.length - 1; i >= 0; --i) {
      if (resultArray[i].loc.endIndex - node.loc.startIndex <= 0) {
        break;
      }
    }
    resultArray.splice(i + 1, 0, node);
    return;
  } else if (node[childNodesCacheKey]) {
    return node[childNodesCacheKey];
  }

  if (!Array.isArray(node) && typeof node !== "object") {
    return;
  }

  const names = Object.keys(node).filter(key => key !== "apexComments");
  if (!resultArray) {
    Object.defineProperty(node, childNodesCacheKey, {
      value: (resultArray = []),
      enumerable: false,
    });
  }

  let i;
  for (i = 0; i < names.length; ++i) {
    getSortedChildNodes(node[names[i]], resultArray);
  }
  return resultArray;
}

function getRootNodeLocation(ast) {
  // Some root node like TriggerDeclUnit has the `loc` property directly on it,
  // while others has it in the `body` property. This function abstracts away
  // that difference.
  if (ast[apexNames.PARSER_OUTPUT].unit.loc) {
    return ast[apexNames.PARSER_OUTPUT].unit.loc;
  }
  if (ast[apexNames.PARSER_OUTPUT].unit.body.loc) {
    return ast[apexNames.PARSER_OUTPUT].unit.body.loc;
  }
  throw new Error(
    "Cannot find the root node location. Please file a bug report with your code sample",
  );
}

function decorateComment(node, comment, ast) {
  // Special case: Comment is the first thing in the document,
  // then "unit" node would be the followingNode to it.
  if (comment.location.endIndex < getRootNodeLocation(ast).startIndex) {
    comment.followingNode = ast[apexNames.PARSER_OUTPUT].unit;
    return;
  }
  // Handling the normal cases
  const childNodes = getSortedChildNodes(node);

  let left = 0;
  let right = childNodes.length;
  let precedingNode;
  let followingNode;
  while (left < right) {
    const middle = (left + right) >> 1; // eslint-disable-line no-bitwise
    const child = childNodes[middle];

    if (
      child.loc.startIndex <= comment.location.startIndex &&
      child.loc.endIndex >= comment.location.endIndex
    ) {
      // The comment is completely contained by this child node
      comment.enclosingNode = child;

      // Special case: if the child is a declaration type and has no members,
      // we should go no deeper; otherwise the `name` node will mistakenly
      // be decorated as the preceding node to this comment.
      const declarationUnits = [
        apexNames.CLASS_DECLARATION,
        apexNames.TRIGGER_DECLARATION_UNIT,
        apexNames.ENUM_DECLARATION,
        apexNames.INTERFACE_DECLARATION,
      ];
      if (
        declarationUnits.includes(child["@class"]) &&
        child.members.length === 0
      ) {
        return;
      }

      // Standard case: recursively decorating the children nodes
      decorateComment(child, comment, ast);
      return; // Abandon the binary search at this level
    }

    if (comment.location.startIndex >= child.loc.endIndex) {
      // This child node falls completely after the comment.
      // Because we will never consider this node or any nodes before it again,
      // this node must be the closest preceding node we have encountered so far
      precedingNode = child;
      left = middle + 1;
      continue; // eslint-disable-line no-continue
    }

    if (comment.location.endIndex <= child.loc.startIndex) {
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

  comment = tiesToBreak[indexOfFirstLeadingComment];
  while (
    comment &&
    indexOfFirstLeadingComment <= tieCount &&
    // If the comment is indented more deeply than the node itself, and there's
    // non-whitespace characters before it on the same line, reconsider it as
    // trailing.
    comment.location.column > fn.loc.column &&
    !/\n(\s*)$/.test(sourceCode.slice(0, comment.location.startIndex))
  ) {
    indexOfFirstLeadingComment += 1;
    comment = tiesToBreak[indexOfFirstLeadingComment];
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

function attach(ast, sourceCode) {
  const comments = ast[apexNames.PARSER_OUTPUT].hiddenTokenMap
    .map(item => item[1])
    .filter(
      item =>
        item["@class"] === apexNames.INLINE_COMMENT ||
        item["@class"] === apexNames.BLOCK_COMMENT,
    );
  const tiesToBreak = [];

  comments.forEach(comment => {
    decorateComment(ast[apexNames.PARSER_OUTPUT], comment, ast);

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
      if (en && en["@class"] === apexNames.BLOCK_STATEMENT && !fn) {
        // Special case: this is a trailing comment in a block statement
        breakTies(tiesToBreak, sourceCode);
        // Our algorithm for attaching comment generally attaches the comment
        // to the last node, however we want to attach this comment to the last
        // statement node instead.
        addTrailingComment(en.stmnts[en.stmnts.length - 1], comment);
      } else {
        // No contest: we have a trailing comment.
        breakTies(tiesToBreak, sourceCode);
        addTrailingComment(pn, comment);
      }
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
    comment.printed = false;
    // These node references were useful for breaking ties, but we
    // don't need them anymore, and they create cycles in the AST that
    // may lead to infinite recursion if we don't delete them here.
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
    parts.push(hardline);
  } else {
    const trailingWhitespace = options.originalText.slice(
      comment.location.endIndex,
      skipWhitespace(options.originalText, comment.location.endIndex),
    );
    const numberOfNewLines = (trailingWhitespace.match(/\n/g) || []).length;

    if (trailingWhitespace.length > 0 && numberOfNewLines === 0) {
      // If trailing space exists, we will add at most one space to replace it.
      parts.push(" ");
    } else if (numberOfNewLines > 0) {
      // If the trailing space contains newlines, then replace it
      // with at most 2 new lines
      const numberOfNewLinesToInsert = Math.min(numberOfNewLines, 2);
      parts.push(...Array(numberOfNewLinesToInsert).fill(hardline));
    }
  }
  return concat(parts);
}

function printTrailingComment(commentPath, options, print) {
  const sourceCode = options.originalText;
  const comment = commentPath.getValue(commentPath);
  const parentNode = commentPath.getParentNode();
  const loc = comment.location;
  const parts = [];

  const fromPos =
    skipWhitespace(sourceCode, loc.startIndex - 1, {
      backwards: true,
    }) + 1;
  const leadingSpace = sourceCode.slice(fromPos, loc.startIndex);
  const numberOfNewLines = (leadingSpace.match(/\n/g) || []).length;

  if (numberOfNewLines > 0) {
    // If the leading space contains newlines, then add at most 2 new lines
    const numberOfNewLinesToInsert = Math.min(numberOfNewLines, 2);
    parts.push(...Array(numberOfNewLinesToInsert).fill(hardline));
  }
  // When we print trailing inline comments, we have to make sure that nothing
  // else is printed after it (e.g. a semicolon), so we'll use lineSuffix
  // from prettier to buffer the output
  if (comment["@class"] === apexNames.INLINE_COMMENT) {
    if (
      (leadingSpace.length > 0 && numberOfNewLines === 0) ||
      parentNode["@class"] === apexNames.LOCATION_IDENTIFIER
    ) {
      parts.push(lineSuffix(concat([" ", print(commentPath)])));
    } else {
      parts.push(lineSuffix(print(commentPath)));
    }
  } else {
    // Handling block comment, which does not need lineSuffix
    if (leadingSpace.length > 0 && numberOfNewLines === 0) {
      // If the leading space contains no newlines, then we add at most 1 space
      parts.push(" ");
    }
    parts.push(print(commentPath));
  }

  return concat(parts);
}

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
  if (comment["@class"] === apexNames.INLINE_COMMENT) {
    parts.push(lineSuffix(print(commentPath)));
  } else {
    parts.push(print(commentPath));
  }
  return concat(parts);
}

function allowTrailingComments(apexClass) {
  const allowedTypes = [
    apexNames.CLASS_DECLARATION,
    apexNames.INTERFACE_DECLARATION,
    apexNames.METHOD_DECLARATION,
    apexNames.ENUM_DECLARATION,
    apexNames.VARIABLE_DECLARATION,
    apexNames.LOCATION_IDENTIFIER,
  ];
  let trailingCommentsAllowed = allowedTypes.includes(apexClass);
  const separatorIndex = apexClass.indexOf("$");
  if (separatorIndex !== -1) {
    const parentClass = apexClass.substring(0, separatorIndex);
    trailingCommentsAllowed =
      trailingCommentsAllowed || parentClass === apexNames.STATEMENT;
  }
  return trailingCommentsAllowed;
}

function printComments(path, options, print) {
  const value = path.getValue();
  const innerLines = print(path);
  const comments = value ? value.apexComments : null;

  if (!comments || comments.filter(comment => !comment.printed).length === 0) {
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
          allowTrailingComments(value["@class"]) ||
          comment["@class"] === apexNames.BLOCK_COMMENT
        ))
    ) {
      leadingParts.push(printLeadingComment(commentPath, options, print));
    } else if (trailing) {
      trailingParts.push(printTrailingComment(commentPath, options, print));
    } else if (!leading && !trailing) {
      // Dangling comments
      // Note: in this statement `Integer a = 1 /* Comment */;`
      // the comment is considered dangling, since jorje considers the literal
      // number 1 node to end after the comment
      trailingParts.push(printTrailingComment(commentPath, options, print));
    } else {
      throw new Error(
        "Comment is not printed because we cannot determine its property. Please submit a bug report with your code sample",
      );
    }
  }, "apexComments");

  // eslint-disable-next-line prefer-spread
  leadingParts.push.apply(leadingParts, trailingParts);
  return concat(leadingParts);
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

module.exports = {
  attach,
  isApexDocComment,
  printComments,
  printDanglingComment,
};
