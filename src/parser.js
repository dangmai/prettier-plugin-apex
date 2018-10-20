"use strict";

const childProcess = require("child_process");
const path = require("path");

const values = require("./values");
const apexNames = values.APEX_NAMES;

function parseText(text, options) {
  const runClientLocation = path.join(__dirname, "run_client.js");
  const args = [runClientLocation, "-a", options.serverHost, "-p", options.serverPort];
  if (options.serverAutoStart) {
    args.push("-s")
  }
  const executionResult = childProcess.spawnSync(
    process.argv[0],
    args,
    {
      input: text
    },
  );

  if (executionResult.status) {
    const executionError = executionResult.stderr.toString();
    throw new Error(executionError);
  }

  return executionResult;
}

// The XML given back contains references (to avoid circular references), which need to be resolved.
// This method recursively walks through the deserialized object and resolve those references.
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

// Here we generate metadata about empty lines for statement nodes
function generateExtraMetadata(node, emptyLineLocations, emptyLineNodeMap) {
  const apexClass = node["@class"];
  let lastNodeLoc;
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      if (Array.isArray(node) && key == node.length - 1) {
        node[key].isLastNode = true;  // So that we don't apply trailing empty line after this node
      }
      const nodeLoc = generateExtraMetadata(node[key], emptyLineLocations, emptyLineNodeMap);
      if (nodeLoc && (!lastNodeLoc || nodeLoc.endIndex > lastNodeLoc.endIndex)) {
        lastNodeLoc = nodeLoc;  // We keep track of the last node location for VariableDeclStmnt
      }
    }
  });

  if (apexClass === apexNames.VARIABLE_DECLARATION_STATEMENT && lastNodeLoc) {
    // Pretend that the last node location is the location of the Variable
    // Declaration Statement, since jorje doesn't give that information to us
    node.loc = lastNodeLoc;
  }
  if (apexClass && node.loc) {
    const nextEmptyLine = emptyLineLocations.indexOf(node.loc.endLine + 1);
    if (values.ALLOW_TRAILING_WHITESPACE.includes(apexClass) && nextEmptyLine !== -1) {
      node.trailingEmptyLine = true;
      // There's a chance that multiple statements exist on 1 line,
      // so we only want to tag one of them as having a trailing empty line.
      // We do that by applying the trailing empty line only after the last node.
      // e.g. `if (a === 1) {} else {}\n\n`,the empty line should be applied
      // after the `else`, not the `if`. We keep track of which
      // nodes have trailingEmptyLine turned on for a certain line, then turn
      // it off for all but the last one.
      if (emptyLineNodeMap[node.loc.endLine] && emptyLineNodeMap[node.loc.endLine].loc.endIndex > node.loc.endIndex) {
        node.trailingEmptyLine = false;
      } else {
        if (emptyLineNodeMap[node.loc.endLine]) {
          emptyLineNodeMap[node.loc.endLine].trailingEmptyLine = false;
        }
        emptyLineNodeMap[node.loc.endLine] = node;
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
    nodeLoc.endLine = lineIndexes.findIndex(index => index > nodeLoc.endIndex) - 1;
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
    lineIndexes[lineIndex] = lineIndexes[lineIndex - 1] + sourceCode.substring(characterIndex, eolIndex).length + 1;
    characterIndex = eolIndex + 1;
    lineIndex ++;
  }
  return lineIndexes;
}

function resolveLocations(node, locationMap) {
  const nodeLoc = node["location"] || node["loc"];
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
  const lines = sourceCode.split('\n');
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
  const lineIndexes = getLineIndexes(sourceCode);
  const executionResult = parseText(sourceCode, options);
  const serializedAst = executionResult.stdout.toString();
  let ast = {};
  const locationMap = new Map();
  let locations;
  if (serializedAst) {
    ast = JSON.parse(serializedAst);
    if (ast[apexNames.PARSER_OUTPUT] && ast[apexNames.PARSER_OUTPUT].parseErrors.length > 0) {
      const errors = ast[apexNames.PARSER_OUTPUT].parseErrors.map(err => `${err.message}. ${err.detailMessage}`);
      throw new Error(errors.join("\r\n"));
    }
    ast = resolveAstReferences(ast, {});
    ast = resolveLineIndexes(ast, lineIndexes);
    generateExtraMetadata(ast, getEmptyLineLocations(sourceCode), {});
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
