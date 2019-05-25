/* eslint no-param-reassign: 0 no-underscore-dangle: 0 */

const childProcess = require("child_process");
const path = require("path");

const { spawnSync } = childProcess;
const attachComments = require("./comments").attach;
const constants = require("./contants");

const apexTypes = constants.APEX_TYPES;

function parseTextWithSpawn(text) {
  let serializerBin = path.join(__dirname, "../vendor/apex-ast-serializer/bin");
  if (process.platform === "win32") {
    serializerBin = path.join(serializerBin, "apex-ast-serializer.bat");
  } else {
    serializerBin = path.join(serializerBin, "apex-ast-serializer");
  }
  const executionResult = spawnSync(serializerBin, ["-f", "json", "-i"], {
    input: text,
  });

  const executionError = executionResult.error;

  if (executionError) {
    throw executionError;
  }

  return executionResult.stdout.toString();
}

function parseTextWithNailgun(text, serverPort) {
  const ngClientLocation = path.join(__dirname, "ng-client.js");
  const args = [ngClientLocation, "-a", "localhost", "-p", serverPort];
  const executionResult = childProcess.spawnSync(process.argv[0], args, {
    input: text,
  });

  if (executionResult.status) {
    const executionError = executionResult.stderr.toString();
    throw new Error(executionError);
  }

  return executionResult.stdout.toString();
}

// jorje calls the location node differently for different types of nodes,
// so we use this method to abstract away that difference
function _getNodeLocation(node) {
  if (node.loc) {
    return node.loc;
  }
  if (node.location) {
    return node.location;
  }
  return null;
}

// The serialized string given back contains references (to avoid circular references),
// which need to be resolved. This method recursively walks through the
// deserialized object and resolve those references.
function resolveAstReferences(node, referenceMap) {
  const nodeId = node["@id"];
  const nodeReference = node["@reference"];
  if (nodeId) {
    referenceMap[nodeId] = node;
  }
  if (nodeReference) {
    // If it has a reference attribute, that means it's a leaf node
    return referenceMap[nodeReference];
  }
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      node[key] = resolveAstReferences(node[key], referenceMap);
    }
  });
  return node;
}

/**
 * Sometimes jorje lies about a node location, so we will fix it here before
 * using that information. We do it by enforcing that a parent node start
 * index is always <= any child node start index, and a parent node end index
 * is always >= any child node end index.
 * @param node the node being visited.
 */
function fixNodeLocation(node) {
  let currentLocation;
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      const location = fixNodeLocation(node[key]);
      if (location && currentLocation) {
        if (currentLocation.startIndex > location.startIndex) {
          currentLocation.startIndex = location.startIndex;
        }
        if (currentLocation.endIndex < location.endIndex) {
          currentLocation.endIndex = location.endIndex;
        }
      }
      if (location && !currentLocation) {
        currentLocation = location;
      }
    }
  });
  if (node.loc && currentLocation) {
    if (node.loc.startIndex > currentLocation.startIndex) {
      node.loc.startIndex = currentLocation.startIndex;
    } else {
      currentLocation.startIndex = node.loc.startIndex;
    }
    if (node.loc.endIndex < currentLocation.endIndex) {
      node.loc.endIndex = currentLocation.endIndex;
    } else {
      currentLocation.endIndex = node.loc.endIndex;
    }
  }
  if (currentLocation) {
    return currentLocation;
  }
  if (node.loc) {
    return {
      startIndex: node.loc.startIndex,
      endIndex: node.loc.endIndex,
    };
  }
  return null;
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
) {
  let indexFound = false;
  let index;
  while (!indexFound) {
    index = sourceCode.indexOf(character, fromIndex);
    indexFound =
      // eslint-disable-next-line no-loop-func
      commentNodes.filter(comment => {
        return (
          comment.location.startIndex <= index &&
          comment.location.endIndex >= index
        );
      }).length === 0;
    fromIndex = index + 1;
  }
  return index;
}

/**
 * Certain node types do not get their endIndex reported from the jorje compiler,
 * or the number they report is not the end of the entire block,
 * so we'll have to figure it out by hand here.
 * This method mutates the node that was passed in, and assumes that `lastNodeLoc`
 * is set on it.
 * @param node the node to look at
 * @param sourceCode the entire source code
 * @param commentNodes all the comment nodes
 * @param lineIndexes the indexes of the lines
 */
function generateEndIndexForNode(node, sourceCode, commentNodes, lineIndexes) {
  switch (node["@class"]) {
    case apexTypes.PROPERTY_MEMBER:
    case apexTypes.SWITCH_STATEMENT:
      node.lastNodeLoc.endIndex = findNextUncommentedCharacter(
        sourceCode,
        "}",
        node.lastNodeLoc.endIndex,
        commentNodes,
      );
      node.lastNodeLoc.endLine =
        lineIndexes.findIndex(index => index > node.lastNodeLoc.endIndex) - 1;
      break;
    case apexTypes.VARIABLE_DECLARATION_STATEMENT:
      node.lastNodeLoc.endIndex = findNextUncommentedCharacter(
        sourceCode,
        ";",
        node.lastNodeLoc.endIndex,
        commentNodes,
      );
      node.lastNodeLoc.endLine =
        lineIndexes.findIndex(index => index > node.lastNodeLoc.endIndex) - 1;
      break;
    default:
  }
  return node;
}

/**
 * Generate metadata about empty lines for statement nodes.
 * This method is called recursively while visiting each node in the tree.
 *
 * @param node the node being visited
 * @param sourceCode the entire source code
 * @param commentNodes all comment nodes
 * @param lineIndexes the indexes of the lines in the source code
 * @param emptyLineLocations a list of lines that are empty in the source code
 * @param emptyLineNodeMap a map of empty line to the node that is attached to
 * that line. Usually it is the statement right before it; however for certain
 * node type (e.g. IfElseBlock) that contains BlockStatement, it'll be the
 * outermost node (e.g. IfElseBlock instead of BlockStatement)
 * @param allowTrailingEmptyLine whether trailing empty line is allowed
 * for this node. This helps when dealing with statements that contain other
 * statements. For example, we turn this to `false` for the block statements
 * inside an IfElseBlock
 *
 */
function generateExtraMetadata(
  node,
  sourceCode,
  commentNodes,
  lineIndexes,
  emptyLineLocations,
  emptyLineNodeMap,
  allowTrailingEmptyLine,
) {
  const apexClass = node["@class"];
  let allowTrailingEmptyLineWithin;
  const isSpecialClass = constants.TRAILING_EMPTY_LINE_AFTER_LAST_NODE.includes(
    apexClass,
  );
  const trailingEmptyLineAllowed = constants.ALLOW_TRAILING_EMPTY_LINE.includes(
    apexClass,
  );
  if (isSpecialClass) {
    allowTrailingEmptyLineWithin = false;
  } else if (trailingEmptyLineAllowed) {
    allowTrailingEmptyLineWithin = true;
  } else {
    allowTrailingEmptyLineWithin = allowTrailingEmptyLine;
  }
  let lastNodeLoc;
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      if (Array.isArray(node) && parseInt(key, 10) === node.length - 1) {
        node[key].isLastNodeInArray = true; // So that we don't apply trailing empty line after this node
      }
      const nodeLoc = generateExtraMetadata(
        node[key],
        sourceCode,
        commentNodes,
        lineIndexes,
        emptyLineLocations,
        emptyLineNodeMap,
        allowTrailingEmptyLineWithin,
      );
      if (
        nodeLoc &&
        (!lastNodeLoc || nodeLoc.endIndex > lastNodeLoc.endIndex)
      ) {
        // This might not be the same node that `isLastNodeInArray` refers to,
        // since this searches for node in child objects instead of just child
        // arrays
        lastNodeLoc = nodeLoc;
      } else if (!nodeLoc && !lastNodeLoc) {
        lastNodeLoc = _getNodeLocation(node);
      }
    }
  });

  if (isSpecialClass && lastNodeLoc) {
    // Store the last node information for some special node types, so that
    // we can add trailing empty lines after them.
    node.lastNodeLoc = lastNodeLoc;
    generateEndIndexForNode(node, sourceCode, commentNodes, lineIndexes);
  }
  const nodeLoc = _getNodeLocation(node);
  if (
    apexClass &&
    (nodeLoc || node.lastNodeLoc) &&
    allowTrailingEmptyLine &&
    !node.isLastNodeInArray
  ) {
    // There's a chance that multiple statements exist on 1 line,
    // so we only want to tag one of them as having a trailing empty line.
    // We do that by applying the trailing empty line only after the last node.
    // e.g. `if (a === 1) {} else {}\n\n`,the empty line should be applied
    // after the `else`, not the `if`. We keep track of which
    // nodes have trailingEmptyLine turned on for a certain line, then turn
    // it off for all but the last one.
    const nextLine = isSpecialClass
      ? node.lastNodeLoc.endLine + 1
      : nodeLoc.endLine + 1;
    const nextEmptyLine = emptyLineLocations.indexOf(nextLine);
    if (trailingEmptyLineAllowed && nextEmptyLine !== -1) {
      node.trailingEmptyLine = true;

      if (emptyLineNodeMap[nextLine]) {
        const nodeMapEndIndex = emptyLineNodeMap[nextLine].lastNodeLoc
          ? emptyLineNodeMap[nextLine].lastNodeLoc.endIndex
          : _getNodeLocation(emptyLineNodeMap[nextLine]).endIndex;
        const thisEndIndex = node.lastNodeLoc
          ? node.lastNodeLoc.endIndex
          : nodeLoc.endIndex;

        if (nodeMapEndIndex > thisEndIndex) {
          node.trailingEmptyLine = false;
        } else {
          emptyLineNodeMap[nextLine].trailingEmptyLine = false;
          emptyLineNodeMap[nextLine] = node;
        }
      } else {
        emptyLineNodeMap[nextLine] = node;
      }
    }
  }
  if (lastNodeLoc) {
    return lastNodeLoc;
  }
  return nodeLoc;
}

// For each node, the jorje compiler gives us its line and its index within
// that line; however we use this method to resolve that line index to a global
// index of that node within the source code. That allows us to use prettier
// utility methods.
function resolveLineIndexes(node, lineIndexes) {
  const nodeLoc = _getNodeLocation(node);
  if (nodeLoc) {
    nodeLoc.endLine =
      lineIndexes.findIndex(index => index > nodeLoc.endIndex) - 1;

    // Edge case: root node
    if (nodeLoc.endLine < 0) {
      nodeLoc.endLine = lineIndexes.length - 1;
    }
  }
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      node[key] = resolveLineIndexes(node[key], lineIndexes);
    }
  });
  return node;
}
// Get a map of line number to the index of its first character
function getLineIndexes(sourceCode) {
  // First line always start with index 0
  const lineIndexes = [0, 0];
  let characterIndex = 0;
  let lineIndex = 2;
  while (characterIndex < sourceCode.length) {
    const eolIndex = sourceCode.indexOf("\n", characterIndex);
    if (eolIndex < 0) {
      break;
    }
    lineIndexes[lineIndex] =
      lineIndexes[lineIndex - 1] +
      sourceCode.substring(characterIndex, eolIndex).length +
      1;
    characterIndex = eolIndex + 1;
    lineIndex += 1;
  }
  return lineIndexes;
}

function getEmptyLineLocations(sourceCode) {
  const whiteSpaceRegEx = /^\s*$/;
  const lines = sourceCode.split("\n");
  return lines
    .map(line => whiteSpaceRegEx.test(line))
    .reduce((accumulator, currentValue, currentIndex) => {
      if (currentValue) {
        accumulator.push(currentIndex + 1);
      }
      return accumulator;
    }, []);
}

function parse(sourceCode, _, options) {
  sourceCode = sourceCode.trim();
  const lineIndexes = getLineIndexes(sourceCode);
  let serializedAst;
  if (options.apexStandaloneParser) {
    serializedAst = parseTextWithNailgun(
      sourceCode,
      options.apexStandalonePort,
    );
  } else {
    serializedAst = parseTextWithSpawn(sourceCode);
  }
  let ast = {};
  if (serializedAst) {
    ast = JSON.parse(serializedAst);
    if (
      ast[apexTypes.PARSER_OUTPUT] &&
      ast[apexTypes.PARSER_OUTPUT].parseErrors.length > 0
    ) {
      const errors = ast[apexTypes.PARSER_OUTPUT].parseErrors.map(
        err => `${err.message}. ${err.detailMessage}`,
      );
      throw new Error(errors.join("\r\n"));
    }
    ast = resolveAstReferences(ast, {});
    fixNodeLocation(ast);
    ast = resolveLineIndexes(ast, lineIndexes);

    const commentNodes = ast[apexTypes.PARSER_OUTPUT].hiddenTokenMap
      .map(item => item[1])
      .filter(
        node =>
          node["@class"] === apexTypes.BLOCK_COMMENT ||
          node["@class"] === apexTypes.INLINE_COMMENT,
      );
    generateExtraMetadata(
      ast,
      sourceCode,
      commentNodes,
      lineIndexes,
      getEmptyLineLocations(sourceCode),
      {},
      true,
    );
    attachComments(ast, sourceCode);
  }
  return ast;
}

module.exports = parse;
