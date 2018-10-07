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

// For each node, the jorje compiler gives us its line and its index within
// that line; however we use this method to resolve that line index to a global
// index of that node within the source code. That allows us to use prettier
// utility methods.
function resolveLineIndexes(node, lineIndexes) {
  const nodeLoc = node["loc"];
  if (nodeLoc) {
    nodeLoc["startIndex"] = lineIndexes[nodeLoc["line"]] + nodeLoc["column"];
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

function parse(sourceCode, _, options) {
  const lineIndexes = getLineIndexes(sourceCode);
  const executionResult = parseText(sourceCode, options);
  const serializedAst = executionResult.stdout.toString();
  let ast = {};
  if (serializedAst) {
    ast = JSON.parse(serializedAst);
    if (ast[apexNames.PARSER_OUTPUT] && ast[apexNames.PARSER_OUTPUT].parseErrors.length > 0) {
      const errors = ast[apexNames.PARSER_OUTPUT].parseErrors.map(err => `${err.message}. ${err.detailMessage}`);
      throw new Error(errors.join("\r\n"));
    }
    ast = resolveAstReferences(ast, {});
    ast = resolveLineIndexes(ast, lineIndexes);
  }
  return ast;
}

module.exports = parse;
