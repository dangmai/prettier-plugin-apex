/* eslint no-param-reassign: 0 no-underscore-dangle: 0 */

const childProcess = require("child_process");
const path = require("path");

const { spawnSync } = childProcess;
const attachComments = require("./comments").attach;
const constants = require("./constants");
const { findNextUncommentedCharacter } = require("./util");

const apexTypes = constants.APEX_TYPES;

function parseTextWithSpawn(text, anonymous) {
  let serializerBin = path.join(__dirname, "../vendor/apex-ast-serializer/bin");
  if (process.platform === "win32") {
    serializerBin = path.join(serializerBin, "apex-ast-serializer.bat");
  } else {
    serializerBin = path.join(serializerBin, "apex-ast-serializer");
  }
  const args = ["-f", "json", "-i"];
  if (anonymous) {
    args.push("-a");
  }
  const executionResult = spawnSync(serializerBin, args, {
    input: text,
  });

  const executionError = executionResult.error;

  if (executionError) {
    throw executionError;
  }

  return executionResult.stdout.toString();
}

function parseTextWithNailgun(text, serverPort, anonymous) {
  const ngClientLocation = path.join(__dirname, "ng-client.js");
  const args = [ngClientLocation, "-a", "localhost", "-p", serverPort];
  if (anonymous) {
    args.push("-n");
  }
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

function handleInnerQueryLocation(location, sourceCode, commentNodes) {
  const resultLocation = {};
  resultLocation.startIndex = findNextUncommentedCharacter(
    sourceCode,
    "(",
    location.startIndex,
    commentNodes,
    /* backwards */ true,
  );
  resultLocation.endIndex = findNextUncommentedCharacter(
    sourceCode,
    ")",
    location.startIndex,
    commentNodes,
    /* backwards */ false,
  );
  return resultLocation;
}

function handleNodeEndedWithCharacter(endCharacter) {
  return (location, sourceCode, commentNodes) => {
    const resultLocation = {};
    resultLocation.startIndex = location.startIndex;
    resultLocation.endIndex = findNextUncommentedCharacter(
      sourceCode,
      endCharacter,
      location.endIndex,
      commentNodes,
      /* backwards */ false,
    );
    return resultLocation;
  };
}

function handleAnonymousUnitLocation(location, sourceCode) {
  return {
    startIndex: 0,
    endIndex: sourceCode.length,
  };
}

// We need to generate the location for a node differently based on the node
// type. This object holds a String => Function mapping in order to do that.
const locationGenerationHandler = {};
const identityFunction = location => location;
locationGenerationHandler[apexTypes.QUERY] = identityFunction;
locationGenerationHandler[apexTypes.VARIABLE_EXPRESSION] = identityFunction;
locationGenerationHandler[apexTypes.INNER_CLASS_MEMBER] = identityFunction;
locationGenerationHandler[apexTypes.INNER_INTERFACE_MEMBER] = identityFunction;
locationGenerationHandler[apexTypes.INNER_ENUM_MEMBER] = identityFunction;
locationGenerationHandler[apexTypes.METHOD_MEMBER] = identityFunction;
locationGenerationHandler[apexTypes.IF_ELSE_BLOCK] = identityFunction;
locationGenerationHandler[
  apexTypes.SELECT_INNER_QUERY
] = handleInnerQueryLocation;
locationGenerationHandler[
  apexTypes.ANONYMOUS_BLOCK_UNIT
] = handleAnonymousUnitLocation;
locationGenerationHandler[
  apexTypes.PROPERTY_MEMBER
] = handleNodeEndedWithCharacter("}");
locationGenerationHandler[
  apexTypes.SWITCH_STATEMENT
] = handleNodeEndedWithCharacter("}");
locationGenerationHandler[
  apexTypes.VARIABLE_DECLARATION_STATEMENT
] = handleNodeEndedWithCharacter(";");
locationGenerationHandler[
  apexTypes.FIELD_MEMBER
] = handleNodeEndedWithCharacter(";");

/**
 * Generate and/or fix node locations, because jorje sometimes either provides
 * wrong location information or a node, or doesn't provide any information at
 * all.
 * We will fix it here by enforcing that a parent node start
 * index is always <= any child node start index, and a parent node end index
 * is always >= any child node end index.
 * @param node the node being visited.
 * @param sourceCode the entire source code.
 * @param commentNodes all the comment nodes.
 * @return the corrected node.
 */
function handleNodeLocation(node, sourceCode, commentNodes) {
  let currentLocation;
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      const location = handleNodeLocation(node[key], sourceCode, commentNodes);
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

  const apexClass = node["@class"];
  if (apexClass && apexClass in locationGenerationHandler && currentLocation) {
    node.loc = locationGenerationHandler[apexClass](
      currentLocation,
      sourceCode,
      commentNodes,
    );
  }
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
    return Object.assign({}, currentLocation);
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
 * Generate metadata about empty lines for statement nodes.
 * This method is called recursively while visiting each node in the tree.
 *
 * @param node the node being visited
 * @param emptyLineLocations a list of lines that are empty in the source code
 * @param allowTrailingEmptyLine whether trailing empty line is allowed
 * for this node. This helps when dealing with statements that contain other
 * statements. For example, we turn this to `false` for the block statements
 * inside an IfElseBlock
 *
 */
function generateExtraMetadata(
  node,
  emptyLineLocations,
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
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      if (Array.isArray(node) && parseInt(key, 10) === node.length - 1) {
        node[key].isLastNodeInArray = true; // So that we don't apply trailing empty line after this node
      }
      generateExtraMetadata(
        node[key],
        emptyLineLocations,
        allowTrailingEmptyLineWithin,
      );
    }
  });

  const nodeLoc = _getNodeLocation(node);
  if (
    apexClass &&
    nodeLoc &&
    allowTrailingEmptyLine &&
    !node.isLastNodeInArray
  ) {
    const nextLine = nodeLoc.endLine + 1;
    const nextEmptyLine = emptyLineLocations.indexOf(nextLine);
    if (trailingEmptyLineAllowed && nextEmptyLine !== -1) {
      node.trailingEmptyLine = true;
    }
  }
  return nodeLoc;
}

/**
 * jorje sometimes gives us different ASTs depending on the white spaces
 * between keywords (#38), which makes it very difficult to know how many
 * nested expressions there are in a method call or a variable expression.
 * This method is used to calculate that number.
 * After this method is called on a node that contains a `dottedExpr`,
 * that node will contain a `numberOfDottedExpressions` property.
 * @param node the current node being visited.
 */
function generateDottedExpressionMetadata(node) {
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      node[key] = generateDottedExpressionMetadata(node[key]);
    }
    if (key === "dottedExpr") {
      node.numberOfDottedExpressions = 1;
      if (node.names) {
        node.numberOfDottedExpressions = node.names.length;
      }
      if (node.dottedExpr && node.dottedExpr.value) {
        if (node.dottedExpr.value.numberOfDottedExpressions) {
          node.numberOfDottedExpressions +=
            node.dottedExpr.value.numberOfDottedExpressions;
        } else if (
          node.dottedExpr.value["@class"] === apexTypes.ARRAY_EXPRESSION &&
          node.dottedExpr.value.expr.numberOfDottedExpressions
        ) {
          node.numberOfDottedExpressions +=
            node.dottedExpr.value.expr.numberOfDottedExpressions;
        } else {
          node.numberOfDottedExpressions += 1;
        }
      }
    }
  });

  return node;
}

// For each node, the jorje compiler gives us its line and its index within
// that line; however we use this method to resolve that line index to a global
// index of that node within the source code. That allows us to use prettier
// utility methods.
function resolveLineIndexes(node, lineIndexes) {
  const nodeLoc = _getNodeLocation(node);
  if (nodeLoc && !("startLine" in nodeLoc)) {
    // The location node that we manually generate do not contain startLine
    // information, so we will create them here.
    nodeLoc.startLine =
      lineIndexes.findIndex(index => index > nodeLoc.startIndex) - 1;
  }
  if (nodeLoc && !("endLine" in nodeLoc)) {
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
  if (options.apexStandaloneParser === "built-in") {
    serializedAst = parseTextWithNailgun(
      sourceCode,
      options.apexStandalonePort,
      options.apexAnonymous,
    );
  } else {
    serializedAst = parseTextWithSpawn(sourceCode, options.apexAnonymous);
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
    const commentNodes = ast[apexTypes.PARSER_OUTPUT].hiddenTokenMap
      .map(item => item[1])
      .filter(
        node =>
          node["@class"] === apexTypes.BLOCK_COMMENT ||
          node["@class"] === apexTypes.INLINE_COMMENT,
      );
    ast = resolveAstReferences(ast, {});
    handleNodeLocation(ast, sourceCode, commentNodes);
    ast = resolveLineIndexes(ast, lineIndexes);
    ast = generateDottedExpressionMetadata(ast);

    generateExtraMetadata(ast, getEmptyLineLocations(sourceCode), true);
    attachComments(ast, sourceCode);
  }
  return ast;
}

module.exports = parse;
