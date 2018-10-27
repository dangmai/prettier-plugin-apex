// We use the same algorithm to attach comments as recast
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
      comment.enclosingNode = child; // eslint-disable-line no-param-reassign
      // decorateComment(comment, locations, locationMap);
      break; // eslint-disable-line no-continue
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
    comment.precedingNode = precedingNode; // eslint-disable-line no-param-reassign
  }

  if (followingNode) {
    comment.followingNode = followingNode; // eslint-disable-line no-param-reassign
  }
}

function attach(ast, locations, locationMap) {
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
  });
}

module.exports = {
  attach,
};
