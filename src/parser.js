/* eslint no-param-reassign:0 */

const childProcess = require("child_process");
const path = require("path");

const values = require("./values");

const apexNames = values.APEX_NAMES;

function parseText(text, options) {
  const runClientLocation = path.join(__dirname, "run_client.js");
  const args = [
    runClientLocation,
    "-a",
    options.serverHost,
    "-p",
    options.serverPort,
  ];
  if (options.serverAutoStart) {
    args.push("-s");
  }
  const executionResult = childProcess.spawnSync(process.argv[0], args, {
    input: text,
  });

  if (executionResult.status) {
    const executionError = executionResult.stderr.toString();
    throw new Error(executionError);
  }

  return executionResult;
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
 * Certain node types do not get their endIndex reported from the jorje compiler,
 * or the number they report is not the end of the entire block,
 * so we'll have to figure it out by hand here.
 * This method mutates the node that was passed in, and assumes that `lastNodeLoc`
 * is set on it.
 * @param node the node to look at
 * @param sourceCode the entire source code
 * @param lineIndexes the indexes of the lines
 */
function generateEndIndexForNode(node, sourceCode, lineIndexes) {
  switch (node["@class"]) {
    case apexNames.PROPERTY_MEMBER:
    case apexNames.SWITCH_STATEMENT:
      node.lastNodeLoc.endIndex = sourceCode.indexOf(
        "}",
        node.lastNodeLoc.endIndex,
      );
      node.lastNodeLoc.endLine =
        lineIndexes.findIndex(index => index > node.lastNodeLoc.endIndex) - 1;
      break;
    case apexNames.VARIABLE_DECLARATION_STATEMENT:
      node.lastNodeLoc.endIndex = sourceCode.indexOf(
        ";",
        node.lastNodeLoc.endIndex,
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
  lineIndexes,
  emptyLineLocations,
  emptyLineNodeMap,
  allowTrailingEmptyLine,
) {
  const apexClass = node["@class"];
  let allowTrailingEmptyLineWithin;
  const isSpecialClass = values.TRAILING_EMPTY_LINE_AFTER_LAST_NODE.includes(
    apexClass,
  );
  const trailingEmptyLineAllowed = values.ALLOW_TRAILING_EMPTY_LINE.includes(
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
        lastNodeLoc = node.loc;
      }
    }
  });

  if (isSpecialClass && lastNodeLoc) {
    // Store the last node information for some special node types, so that
    // we can add trailing empty lines after them.
    node.lastNodeLoc = lastNodeLoc;
    generateEndIndexForNode(node, sourceCode, lineIndexes);
  }
  if (
    apexClass &&
    (node.loc || node.lastNodeLoc) &&
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
      : node.loc.endLine + 1;
    const nextEmptyLine = emptyLineLocations.indexOf(nextLine);
    if (trailingEmptyLineAllowed && nextEmptyLine !== -1) {
      node.trailingEmptyLine = true;

      if (emptyLineNodeMap[nextLine]) {
        const nodeMapEndIndex = emptyLineNodeMap[nextLine].lastNodeLoc
          ? emptyLineNodeMap[nextLine].lastNodeLoc.endIndex
          : emptyLineNodeMap[nextLine].loc.endIndex;
        const thisEndIndex = node.lastNodeLoc
          ? node.lastNodeLoc.endIndex
          : node.loc.endIndex;

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
  return node.loc;
}

// For each node, the jorje compiler gives us its line and its index within
// that line; however we use this method to resolve that line index to a global
// index of that node within the source code. That allows us to use prettier
// utility methods.
function resolveLineIndexes(node, lineIndexes) {
  const nodeLoc = node.loc;
  if (nodeLoc) {
    nodeLoc.endLine =
      lineIndexes.findIndex(index => index > nodeLoc.endIndex) - 1;
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

function resolveLocations(node, locationMap) {
  const nodeLoc = node.location || node.loc;
  if (nodeLoc) {
    locationMap.set(nodeLoc, node);
  }
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      resolveLocations(node[key], locationMap);
    }
  });
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
  const executionResult = parseText(sourceCode, options);
  const serializedAst = executionResult.stdout.toString();
  let ast = {};
  const locationMap = new Map();
  let locations;
  if (serializedAst) {
    ast = JSON.parse(serializedAst);
    if (
      ast[apexNames.PARSER_OUTPUT] &&
      ast[apexNames.PARSER_OUTPUT].parseErrors.length > 0
    ) {
      const errors = ast[apexNames.PARSER_OUTPUT].parseErrors.map(
        err => `${err.message}. ${err.detailMessage}`,
      );
      throw new Error(errors.join("\r\n"));
    }
    ast = resolveAstReferences(ast, {});
    ast = resolveLineIndexes(ast, lineIndexes);
    generateExtraMetadata(
      ast,
      sourceCode,
      lineIndexes,
      getEmptyLineLocations(sourceCode),
      {},
      true,
    );
    resolveLocations(ast, locationMap);
    locations = Array.from(locationMap.keys());
    locations.sort((first, second) => {
      const startIndexDiff = first.startIndex - second.startIndex;
      if (startIndexDiff !== 0) {
        return startIndexDiff;
      }
      return first.endIndex - second.endIndex;
    });
  }
  return ast;
}

module.exports = parse;
