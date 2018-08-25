"use strict";

const spawnSync = require("child_process").spawnSync;
const path = require("path");

const apexNames = require("./values").APEX_NAMES;

function parseText(text) {
  let serializerBin = path.join(__dirname, "../vendor/apex-ast-serializer/bin");
  if (process.platform === "win32") {
    serializerBin = path.join(serializerBin, "apex-ast-serializer.bat");
  } else {
    serializerBin = path.join(serializerBin, "apex-ast-serializer");
  }
  const executionResult = spawnSync(
    serializerBin,
    ["-f", "json", "-i"],
    {
      input: text
    },
  );

  const executionError = executionResult.error;

  if (executionError) {
    throw executionError;
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

function parse(text) {
  const executionResult = parseText(text);

  const res = executionResult.stdout.toString();
  let ast = {};
  if (res) {
    console.log(res);
    ast = JSON.parse(res);
    if (ast[apexNames.PARSER_OUTPUT] && ast[apexNames.PARSER_OUTPUT].parseErrors.length > 0) {
      const errors = ast[apexNames.PARSER_OUTPUT].parseErrors.map(err => `${err.message}. ${err.detailMessage}`);
      throw new Error(errors.join("\r\n"));
    }
    ast = resolveAstReferences(ast, {});
  }
  return ast;
}

module.exports = parse;
