/* eslint no-param-reassign: 0 */
import childProcess from "node:child_process";
import path from "node:path";
import process from "node:process";
import prettier from "prettier";

import * as jorje from "../vendor/apex-ast-serializer/typings/jorje.d.js";
import {
  ALLOW_TRAILING_EMPTY_LINE,
  APEX_TYPES,
  TRAILING_EMPTY_LINE_AFTER_LAST_NODE,
} from "./constants.js";
import {
  AnnotatedComment,
  GenericComment,
  SerializedAst,
  findNextUncommentedCharacter,
  getNativeExecutableWithFallback,
  getParentType,
  getSerializerBinDirectory,
} from "./util.js";

type MinimalLocation = {
  startIndex: number;
  endIndex: number;
};

interface SpawnOutput {
  stdout: string;
  stderr: string;
}
async function parseTextWithSpawn(
  executable: string,
  text: string,
  anonymous: boolean,
): Promise<SpawnOutput> {
  const args: string[] = [];
  if (anonymous) {
    args.push("-a");
  }
  return new Promise((resolve, reject) => {
    const spawnedProcess = childProcess.spawn(executable, args, {
      shell: true,
      env: {
        ...process.env,
        // #1513 - Gradle's generated Windows application wrapper checks for
        // the DEBUG environment variable and will output verbose logs if it is set,
        // which will break the parser output.
        DEBUG: "",
      },
    });
    spawnedProcess.stdin.write(text);
    spawnedProcess.stdin.end();

    let stdout = "";
    let stderr = "";
    spawnedProcess.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    spawnedProcess.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    spawnedProcess.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stdout + stderr));
      }
    });
    spawnedProcess.on("error", () => {
      reject(new Error(stdout + stderr));
    });
  });
}

async function parseTextWithHttp(
  text: string,
  serverHost: string,
  serverPort: number,
  serverProtocol: string,
  anonymous: boolean,
): Promise<string> {
  try {
    const result = await fetch(
      `${serverProtocol}://${serverHost}:${serverPort}/api/ast`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceCode: text,
          anonymous,
          prettyPrint: false,
        }),
      },
    );
    return await result.text();
  } catch (err: any) {
    throw new Error(
      `Failed to connect to Apex parsing server\r\n${err.toString()}`,
    );
  }
}

// jorje calls the location node differently for different types of nodes,
// so we use this method to abstract away that difference
function getNodeLocation(node: any) {
  if (node.loc) {
    return node.loc;
  }
  if (node.location) {
    return node.location;
  }
  return null;
}

function handleNodeSurroundedByCharacters(
  startCharacter: string,
  endCharacter: string,
) {
  return (
    location: MinimalLocation,
    sourceCode: string,
    commentNodes: GenericComment[],
  ): MinimalLocation => ({
    startIndex: findNextUncommentedCharacter(
      sourceCode,
      startCharacter,
      location.startIndex,
      commentNodes,
      /* backwards */ true,
    ),
    endIndex:
      findNextUncommentedCharacter(
        sourceCode,
        endCharacter,
        location.startIndex,
        commentNodes,
        /* backwards */ false,
      ) + 1,
  });
}

function handleNodeStartedWithCharacter(startCharacter: string) {
  return (
    location: MinimalLocation,
    sourceCode: string,
    commentNodes: GenericComment[],
  ): MinimalLocation => ({
    startIndex: findNextUncommentedCharacter(
      sourceCode,
      startCharacter,
      location.startIndex,
      commentNodes,
      /* backwards */ true,
    ),
    endIndex: location.endIndex,
  });
}

function handleNodeEndedWithCharacter(endCharacter: string) {
  return (
    location: MinimalLocation,
    sourceCode: string,
    commentNodes: GenericComment[],
  ): MinimalLocation => ({
    startIndex: location.startIndex,
    endIndex:
      findNextUncommentedCharacter(
        sourceCode,
        endCharacter,
        location.endIndex,
        commentNodes,
        /* backwards */ false,
      ) + 1,
  });
}

function handleAnonymousUnitLocation(
  _location: MinimalLocation,
  sourceCode: string,
): MinimalLocation {
  return {
    startIndex: 0,
    endIndex: sourceCode.length,
  };
}

function handleMethodDeclarationLocation(
  location: MinimalLocation,
  sourceCode: string,
  commentNodes: GenericComment[],
  node: any,
): MinimalLocation {
  // This is a method declaration with a body, so we can safely use the identity
  // location.
  if (node.stmnt.value) {
    return location;
  }
  // This is a Method Declaration with no body, in which case we need to use the
  // position of the closing parenthesis for the input parameters, e.g:
  // void method();
  return handleNodeEndedWithCharacter(")")(location, sourceCode, commentNodes);
}

function handleAnnotationLocation(
  location: MinimalLocation,
  sourceCode: string,
  commentNodes: GenericComment[],
  node: any,
): MinimalLocation {
  // This is an annotation without parameters, so we only need to worry about
  // the starting character
  if (!node.parameters || node.parameters.length === 0) {
    return handleNodeStartedWithCharacter("@")(
      location,
      sourceCode,
      commentNodes,
    );
  }
  // If not, we need to use the position of the closing parenthesis after the
  // parameters as well
  return handleNodeSurroundedByCharacters("@", ")")(
    location,
    sourceCode,
    commentNodes,
  );
}

const identityFunction = (location: MinimalLocation): MinimalLocation =>
  location;
// Sometimes we need to delete a location node. For example, a WhereCompoundOp
// location does not make sense since it can appear in multiple places:
// SELECT Id FROM Account
// WHERE Name = 'Name'
// AND Name = 'Other Name' // <- this AND node here
// AND Name = 'Yet Another Name' <- this AND node here
// If we keep those locations, a comment might be duplicated since it is
// attached to one WhereCompoundOp, and that operator is printed multiple times.
const removeFunction = () => null;

// We need to generate the location for a node differently based on the node
// type. This object holds a String => Function mapping in order to do that.
const locationGenerationHandler: {
  [key: string]: (
    location: MinimalLocation,
    sourceCode: string,
    commentNodes: GenericComment[],
    node: any,
  ) => MinimalLocation | null;
} = {
  [APEX_TYPES.QUERY]: identityFunction,
  [APEX_TYPES.SEARCH]: identityFunction,
  [APEX_TYPES.FOR_INIT]: identityFunction,
  [APEX_TYPES.FOR_ENHANCED_CONTROL]: identityFunction,
  [APEX_TYPES.TERNARY_EXPRESSION]: identityFunction,
  [APEX_TYPES.VARIABLE_EXPRESSION]: identityFunction,
  [APEX_TYPES.INNER_CLASS_MEMBER]: identityFunction,
  [APEX_TYPES.INNER_INTERFACE_MEMBER]: identityFunction,
  [APEX_TYPES.INNER_ENUM_MEMBER]: identityFunction,
  [APEX_TYPES.METHOD_MEMBER]: identityFunction,
  [APEX_TYPES.IF_ELSE_BLOCK]: identityFunction,
  [APEX_TYPES.NAME_VALUE_PARAMETER]: identityFunction,
  [APEX_TYPES.VARIABLE_DECLARATION]: identityFunction,
  [APEX_TYPES.BINARY_EXPRESSION]: identityFunction,
  [APEX_TYPES.BOOLEAN_EXPRESSION]: identityFunction,
  [APEX_TYPES.ASSIGNMENT_EXPRESSION]: identityFunction,
  [APEX_TYPES.FIELD_MEMBER]: identityFunction,
  [APEX_TYPES.VALUE_WHEN]: identityFunction,
  [APEX_TYPES.ELSE_WHEN]: identityFunction,
  [APEX_TYPES.WHERE_COMPOUND_OPERATOR]: removeFunction,
  [APEX_TYPES.VARIABLE_DECLARATION_STATEMENT]: identityFunction,
  [APEX_TYPES.WHERE_COMPOUND_EXPRESSION]: identityFunction,
  [APEX_TYPES.WHERE_OPERATION_EXPRESSION]: identityFunction,
  [APEX_TYPES.SELECT_INNER_QUERY]: handleNodeSurroundedByCharacters("(", ")"),
  [APEX_TYPES.ANONYMOUS_BLOCK_UNIT]: handleAnonymousUnitLocation,
  [APEX_TYPES.NESTED_EXPRESSION]: handleNodeSurroundedByCharacters("(", ")"),
  [APEX_TYPES.PROPERTY_MEMBER]: handleNodeEndedWithCharacter("}"),
  [APEX_TYPES.SWITCH_STATEMENT]: handleNodeEndedWithCharacter("}"),
  [APEX_TYPES.NEW_LIST_LITERAL]: handleNodeEndedWithCharacter("}"),
  [APEX_TYPES.NEW_SET_LITERAL]: handleNodeEndedWithCharacter("}"),
  [APEX_TYPES.NEW_MAP_LITERAL]: handleNodeEndedWithCharacter("}"),
  [APEX_TYPES.NEW_STANDARD]: handleNodeEndedWithCharacter(")"),
  [APEX_TYPES.VARIABLE_DECLARATIONS]: handleNodeEndedWithCharacter(";"),
  [APEX_TYPES.NEW_KEY_VALUE]: handleNodeEndedWithCharacter(")"),
  [APEX_TYPES.METHOD_CALL_EXPRESSION]: handleNodeEndedWithCharacter(")"),
  [APEX_TYPES.ANNOTATION]: handleAnnotationLocation,
  [APEX_TYPES.METHOD_DECLARATION]: handleMethodDeclarationLocation,
};

type AnyNode = any;
type ApplyFn<AccumulatedResult, Context> = (
  node: AnyNode,
  accumulatedResult: AccumulatedResult,
  context: Context,
  childrenContext: Context,
) => AccumulatedResult;
type DfsVisitor<AccumulatedResult, Context> = {
  accumulator?: (
    entry: AccumulatedResult,
    accumulated: AccumulatedResult,
  ) => AccumulatedResult;
  apply: ApplyFn<AccumulatedResult, Context>;
  gatherChildrenContext?: (node: AnyNode, currentContext?: Context) => Context;
};
/*
 * Generic Depth-First Search algorithm that applies a list of functions to each
 * node in the tree.
 * Each function can hook into various parts of the DFS process:
 * - gatherChildrenContext: gathering contexts for children nodes. When the
 * children nodes are visited, they will be passed this context.
 * - accumulator: accumulating results from children nodes. This is run after
 * every individual child node is visited.
 * - apply: applying the function to the current node. This is run after all
 * children nodes have been visited.
 */
function dfsPostOrderApply(
  node: AnyNode,
  fns: DfsVisitor<any, any>[],
  currentContexts?: any,
): AnyNode {
  const finalChildrenResults = new Array(fns.length);
  const childrenContexts = new Array(fns.length);
  for (let i = 0; i < fns.length; i++) {
    childrenContexts[i] = fns[i]?.gatherChildrenContext?.(
      node,
      currentContexts ? currentContexts[i] : undefined,
    );
  }
  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as string;
    if (typeof node[key] === "object") {
      const childrenResults = dfsPostOrderApply(
        node[key],
        fns,
        childrenContexts,
      );
      for (let j = 0; j < fns.length; j++) {
        finalChildrenResults[j] = fns[j]?.accumulator?.(
          childrenResults[j],
          finalChildrenResults[j],
        );
      }
    }
  }
  const results = [];
  for (let i = 0; i < fns.length; i++) {
    results.push(
      fns[i]?.apply(
        node,
        finalChildrenResults[i],
        currentContexts ? currentContexts[i] : undefined,
        childrenContexts[i],
      ),
    );
  }
  return results;
}

/**
 * Generate and/or fix node locations, because jorje sometimes either provides
 * wrong location information or a node, or doesn't provide any information at
 * all.
 * We will fix it here by enforcing that a parent node start
 * index is always <= any child node start index, and a parent node end index
 * is always >= any child node end index.
 */
const nodeLocationVisitor: (
  sourceCode: string,
  commentNodes: GenericComment[],
) => DfsVisitor<MinimalLocation | null, undefined> = (
  sourceCode,
  commentNodes,
) => ({
  accumulator: (
    entry: MinimalLocation | null,
    accumulated: MinimalLocation | null,
  ) => {
    if (!accumulated) {
      return entry;
    }
    if (!entry) {
      return accumulated;
    }
    if (accumulated.startIndex > entry.startIndex) {
      accumulated.startIndex = entry.startIndex;
    }
    if (accumulated.endIndex < entry.endIndex) {
      accumulated.endIndex = entry.endIndex;
    }
    return accumulated;
  },
  apply: (node: AnyNode, currentLocation: MinimalLocation | null) => {
    const apexClass = node["@class"];
    let handlerFn;
    if (apexClass) {
      handlerFn = locationGenerationHandler[apexClass];
      if (!handlerFn) {
        const parentClass = getParentType(apexClass);
        if (parentClass) {
          handlerFn = locationGenerationHandler[parentClass];
        }
      }
    }

    if (handlerFn && currentLocation) {
      node.loc = handlerFn(currentLocation, sourceCode, commentNodes, node);
    } else if (handlerFn && node.loc) {
      node.loc = handlerFn(node.loc, sourceCode, commentNodes, node);
    }

    const nodeLoc = node.loc;
    if (!nodeLoc) {
      delete node.loc;
    } else if (nodeLoc && currentLocation) {
      if (nodeLoc.startIndex > currentLocation.startIndex) {
        nodeLoc.startIndex = currentLocation.startIndex;
      } else {
        currentLocation.startIndex = nodeLoc.startIndex;
      }
      if (nodeLoc.endIndex < currentLocation.endIndex) {
        nodeLoc.endIndex = currentLocation.endIndex;
      } else {
        currentLocation.endIndex = nodeLoc.endIndex;
      }
    }

    if (currentLocation) {
      return { ...currentLocation };
    }

    if (nodeLoc) {
      return {
        startIndex: nodeLoc.startIndex,
        endIndex: nodeLoc.endIndex,
      };
    }
    return null;
  },
});

export type EnrichedIfBlock = jorje.IfBlock & {
  ifBlockIndex: number;
};

/**
 * Generate extra metadata for nodes, e.g. trailing empty lines, forced hard lines.
 * ifBlockIndex, etc.
 * These metadata are helpful to clearly deliniate between the parsing and
 * printing phases, i.e. during the printing phase, we only need to worry about
 * how to format the code using the metadata generated here.
 */
type MetadataVisitorContext = {
  allowTrailingEmptyLine: boolean;
  arraySiblings?: any[];
  insideAssignment: boolean;
};
const metadataVisitor: (
  emptyLineLocations: number[],
) => DfsVisitor<undefined, MetadataVisitorContext> = (emptyLineLocations) => ({
  apply: (node: any, _accumulated, context, childrenContext) => {
    const apexClass = node["@class"];
    // #511 - If the user manually specify linebreaks in their original query,
    // we will use that as a heuristic to manually add hardlines to the result
    // query as well.
    if (apexClass === APEX_TYPES.SEARCH || apexClass === APEX_TYPES.QUERY) {
      node.forcedHardline = node.loc.startLine !== node.loc.endLine;
    }
    // jorje parses all `if` and `else if` blocks into `ifBlocks`, so we add
    // `ifBlockIndex` into the node for handling code to differentiate them.
    else if (apexClass === APEX_TYPES.IF_ELSE_BLOCK) {
      node.ifBlocks.forEach((ifBlock: jorje.IfBlock, index: number) => {
        (ifBlock as EnrichedIfBlock).ifBlockIndex = index;
      });
    }

    if ("inputParameters" in node && Array.isArray(node.inputParameters)) {
      node.inputParameters.forEach((inputParameter: any) => {
        inputParameter.insideParenthesis = true;
      });
    }

    const trailingEmptyLineAllowed =
      ALLOW_TRAILING_EMPTY_LINE.includes(apexClass);
    const nodeLoc = getNodeLocation(node);
    let isLastNodeInArray = false;

    // Here we flag the current node as the last node in the array, because
    // we don't want a trailing empty line after it.
    if (context?.arraySiblings) {
      isLastNodeInArray =
        context.arraySiblings.indexOf(node) ===
        context.arraySiblings.length - 1;
    }

    // Here we turn off trailing empty line for a child node when its next
    // sibling is on the same line.
    // The reasoning is that for a block of code like this:
    // ```
    // Integer a = 1; Integer c = 2; Integer c = 3;
    //
    // Integer d = 4;
    // ```
    // We don't want a trailing empty line after `Integer a = 1;`
    // so we need to mark it as a special node.
    // We are doing this at the parent node level, because when we run the
    // Depth-First search, we don't have enough context at the child node level
    // to determine if its next sibling is on the same line or not.
    if (childrenContext.arraySiblings) {
      for (let i = 0; i < childrenContext.arraySiblings.length; i++) {
        const currentChild = childrenContext.arraySiblings[i];
        const nextChildIndex = i + 1;
        if (nextChildIndex < childrenContext.arraySiblings.length) {
          const nextChild = childrenContext.arraySiblings[nextChildIndex];
          if (
            currentChild.trailingEmptyLine &&
            currentChild.loc &&
            nextChild.loc &&
            currentChild.loc.endLine === nextChild.loc.startLine
          ) {
            currentChild.trailingEmptyLine = false;
          }
        }
      }
    }
    if (
      apexClass &&
      nodeLoc &&
      context.allowTrailingEmptyLine &&
      trailingEmptyLineAllowed &&
      !isLastNodeInArray
    ) {
      const nextLine = nodeLoc.endLine + 1;
      const nextEmptyLine = emptyLineLocations.indexOf(nextLine);
      if (nextEmptyLine !== -1) {
        node.trailingEmptyLine = true;
      }
    }
    if (
      context?.insideAssignment &&
      (apexClass === APEX_TYPES.SOQL_EXPRESSION ||
        apexClass === APEX_TYPES.SOSL_EXPRESSION)
    ) {
      // handleDottedExpr uses this property to know whether to dedent a SOQL/SOSL
      // expression
      node.insideAssignment = true;
    }
  },
  gatherChildrenContext: (node, currentContext) => {
    const apexClass = node["@class"];
    let allowTrailingEmptyLineWithin: boolean;
    const isSpecialClass =
      TRAILING_EMPTY_LINE_AFTER_LAST_NODE.includes(apexClass);
    const trailingEmptyLineAllowed =
      ALLOW_TRAILING_EMPTY_LINE.includes(apexClass);
    if (isSpecialClass) {
      allowTrailingEmptyLineWithin = false;
    } else if (trailingEmptyLineAllowed) {
      allowTrailingEmptyLineWithin = true;
    } else {
      // currentContext is undefined for the root node, we hardcode
      // allowTrailingEmptyLine to true for it
      allowTrailingEmptyLineWithin =
        currentContext?.allowTrailingEmptyLine ?? true;
    }
    let arraySiblings;
    if (Array.isArray(node) && node.length > 0) {
      arraySiblings = node;
    }
    const insideAssignment =
      currentContext?.insideAssignment ||
      apexClass === APEX_TYPES.ASSIGNMENT_EXPRESSION ||
      apexClass === APEX_TYPES.VARIABLE_DECLARATION;
    return {
      allowTrailingEmptyLine: allowTrailingEmptyLineWithin,
      arraySiblings,
      insideAssignment,
    };
  },
});

function getLineNumber(lineIndexes: number[], charIndex: number) {
  let low = 0;
  let high = lineIndexes.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midIndex = lineIndexes[mid] ?? 0;
    const beforeMidIndex = lineIndexes[mid - 1] ?? 0;

    if (midIndex >= charIndex && beforeMidIndex < charIndex) {
      return mid;
    }

    if (midIndex < charIndex) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return -1;
}

// For each node, the jorje compiler gives us its line and its index within
// that line; however we use this method to resolve that line index to a global
// index of that node within the source code. That allows us to use prettier
// utility methods.
const lineIndexVisitor: (
  lineIndexes: number[],
) => DfsVisitor<undefined, undefined> = (lineIndexes) => ({
  apply: (node: AnyNode) => {
    const nodeLoc = getNodeLocation(node);
    if (nodeLoc && !("startLine" in nodeLoc)) {
      // The location node that we manually generate do not contain startLine
      // information, so we will create them here.
      nodeLoc.startLine =
        nodeLoc.line ?? getLineNumber(lineIndexes, nodeLoc.startIndex);
    }

    if (nodeLoc && !("endLine" in nodeLoc)) {
      nodeLoc.endLine = getLineNumber(lineIndexes, nodeLoc.endIndex);

      // Edge case: root node
      if (nodeLoc.endLine < 0) {
        nodeLoc.endLine = lineIndexes.length - 1;
      }
    }

    if (nodeLoc && !("column" in nodeLoc)) {
      const nodeStartLineIndex =
        lineIndexes[
          nodeLoc.startLine ?? getLineNumber(lineIndexes, nodeLoc.startIndex)
        ];
      if (nodeStartLineIndex !== undefined) {
        nodeLoc.column = nodeLoc.startIndex - nodeStartLineIndex;
      }
    }
  },
});

// Get a map of line number to the index of its first character
function getLineIndexes(sourceCode: string) {
  // First line always start with index 0
  const lineIndexes = [0];
  let characterIndex = 0;
  let lineIndex = 1;
  while (characterIndex < sourceCode.length) {
    const eolIndex = sourceCode.indexOf("\n", characterIndex);
    if (eolIndex < 0) {
      break;
    }
    const lastLineIndex = lineIndexes[lineIndex - 1];
    /* v8 ignore next 3 */
    if (lastLineIndex === undefined) {
      return lineIndexes;
    }
    lineIndexes[lineIndex] = lastLineIndex + (eolIndex - characterIndex) + 1;
    characterIndex = eolIndex + 1;
    lineIndex += 1;
  }
  lineIndexes[lineIndex] = sourceCode.length;
  return lineIndexes;
}

function getEmptyLineLocations(sourceCode: string): number[] {
  const whiteSpaceRegEx = /^\s*$/;
  const lines = sourceCode.split("\n");
  return lines
    .map((line: string) => whiteSpaceRegEx.test(line))
    .reduce(
      (accumulator: number[], currentValue: boolean, currentIndex: number) => {
        if (currentValue) {
          accumulator.push(currentIndex + 1);
        }
        return accumulator;
      },
      [],
    );
}

export default async function parse(
  sourceCode: string,
  options: prettier.RequiredOptions,
): Promise<SerializedAst | Record<string, never>> {
  let serializedAst: string;
  let stderr: string = "";
  if (options.apexStandaloneParser === "built-in") {
    serializedAst = await parseTextWithHttp(
      sourceCode,
      options.apexStandaloneHost,
      options.apexStandalonePort,
      options.apexStandaloneProtocol,
      options.parser === "apex-anonymous",
    );
  } else if (options.apexStandaloneParser === "native") {
    const serializerBin = await getNativeExecutableWithFallback();
    const result = await parseTextWithSpawn(
      serializerBin,
      sourceCode,
      options.parser === "apex-anonymous",
    );
    serializedAst = result.stdout;
    stderr = result.stderr;
  } else {
    const result = await parseTextWithSpawn(
      path.join(
        await getSerializerBinDirectory(),
        `apex-ast-serializer${process.platform === "win32" ? ".bat" : ""}`,
      ),
      sourceCode,
      options.parser === "apex-anonymous",
    );
    serializedAst = result.stdout;
    stderr = result.stderr;
  }
  if (serializedAst) {
    const ast: SerializedAst = JSON.parse(serializedAst);
    if (
      ast[APEX_TYPES.PARSER_OUTPUT] &&
      ast[APEX_TYPES.PARSER_OUTPUT].parseErrors.length > 0
    ) {
      const errors = ast[APEX_TYPES.PARSER_OUTPUT].parseErrors.map(
        (err: jorje.ParseException) => `${err.message}.`,
      );
      throw new Error(errors.join("\r\n"));
    }
    ast.comments = ast[APEX_TYPES.PARSER_OUTPUT].hiddenTokenMap
      .map((item) => item[1])
      .filter(
        (node) =>
          node["@class"] === APEX_TYPES.BLOCK_COMMENT ||
          node["@class"] === APEX_TYPES.INLINE_COMMENT,
      );
    const lastComment = ast.comments.at(-1);
    if (lastComment) {
      // #1777 - We don't want a trailing empty line after the last comment in
      // the document, because that will be a duplicate of the final empty line.
      (lastComment as AnnotatedComment).trailingEmptyLine = false;
    }
    dfsPostOrderApply(ast, [
      nodeLocationVisitor(sourceCode, ast.comments),
      lineIndexVisitor(getLineIndexes(sourceCode)),
      metadataVisitor(getEmptyLineLocations(sourceCode)),
    ]);

    return ast;
  }
  throw new Error(`Failed to parse Apex code: ${stderr}`);
}
