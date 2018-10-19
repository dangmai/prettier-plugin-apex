"use strict";

const childProcess = require("child_process");
const path = require("path");

const apexNames = require("./values").APEX_NAMES;

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
    // Also, copy over the attributes from the current node to the reference node.
    return referenceMap[nodeReference];
  }
  Object.keys(node).forEach(key => {
    if (typeof node[key] === "object") {
      node[key] = resolveAstReferences(node[key], referenceMap);
    }
  });
  return node;
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


// Get a map of line number to the index of its first character
function getLineIndexes(sourceCode) {
  // First line always start with index 0
  const lineIndexes = {1: 0};
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

function getEmptyLineLocations(sourceCode) {
  const whiteSpaceRegEx = /^\s*$/;
  const lines = sourceCode.split('\n');
  const lineIndexes = getLineIndexes(sourceCode);
  return lines
    .map(line => whiteSpaceRegEx.test(line))
    .reduce((accumulator, currentValue, currentIndex) => {
      const lineNumber = currentIndex + 1;
      if (currentValue) {
        accumulator.push({
          column: 0,
          line: lineNumber,
          startIndex: lineIndexes[lineNumber],
          endIndex: lineIndexes[lineNumber] + lines[currentIndex].length + 1,
        });
      }
      return accumulator;
    }, []);
}

function parse(sourceCode, _, options) {
  const emptyLineIndexes = getEmptyLineLocations(sourceCode);
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
