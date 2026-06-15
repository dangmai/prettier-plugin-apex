import childProcess from "node:child_process";
import path from "node:path";
import process from "node:process";
import prettier from "prettier";

import type * as jorje from "../vendor/apex-ast-serializer/typings/jorje.d.js";
import {
  ALLOW_TRAILING_EMPTY_LINE,
  APEX_TYPES,
  TRAILING_EMPTY_LINE_AFTER_LAST_NODE,
} from "./constants.js";
import {
  type AnnotatedComment,
  type GenericComment,
  type SerializedAst,
  findNextUncommentedCharacter,
  getNativeExecutableWithFallback,
  getParentType,
  getSerializerBinDirectory,
} from "./util.js";

const { getNextNonSpaceNonCommentCharacterIndex } = prettier.util;

// Set-based copies of the type tables: metadataVisitor consults these for
// every AST node, where Array#includes would be a linear scan.
const ALLOW_TRAILING_EMPTY_LINE_SET: Set<string> = new Set(
  ALLOW_TRAILING_EMPTY_LINE,
);
const TRAILING_EMPTY_LINE_AFTER_LAST_NODE_SET: Set<string> = new Set(
  TRAILING_EMPTY_LINE_AFTER_LAST_NODE,
);

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
        location.endIndex,
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

function handleWithIdentifierLocation(
  location: MinimalLocation,
  sourceCode: string,
): MinimalLocation {
  // jorje gives us the location of the inner identifier only (e.g.
  // `SECURITY_ENFORCED`), not the `WITH` keyword in front of it. Without
  // extending the start back to cover `WITH`, comments that sit between the
  // previous clause and the `WITH` keyword have nowhere to land:
  // Prettier sees them as preceding the inner identifier, attaches them as
  // a leading comment, and the printer emits them between `WITH` and the
  // identifier on subsequent format passes. We perform a case-insensitive
  // backwards scan for `WITH` to anchor the start of the node. A
  // `WithIdentifier` AST node is only ever produced when the source contains
  // a `WITH` keyword before the identifier, so `lastIndexOf` will always
  // find a match here.
  const upToStart = sourceCode.slice(0, location.startIndex).toLowerCase();
  const withIndex = upToStart.lastIndexOf("with");
  return {
    startIndex: withIndex,
    endIndex: location.endIndex,
  };
}

function handleLimitValueLocation(
  location: MinimalLocation,
  sourceCode: string,
  commentNodes: GenericComment[],
  node: any,
): MinimalLocation {
  // #1891 - the LIMIT node returned by jorje always gives us the location of
  // the world LIMIT itself (i.e. 5 character long), but that leads to wrong
  // format if the LIMIT (or the surrounding QUERY) is prettier ignored.
  // Because of that, we will need to generate the location of the LIMIT value
  // manually.
  const valueString = node.i.toString();
  return {
    startIndex: location.startIndex,

    endIndex:
      findNextUncommentedCharacter(
        sourceCode,
        valueString,
        location.endIndex,
        commentNodes,
        /* backwards */ false,
      ) + valueString.length,
  };
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

function handleWhereCompoundExpressionLocation(
  location: MinimalLocation,
  sourceCode: string,
  commentNodes: GenericComment[],
): MinimalLocation {
  // #1891 - the WHERE COMPOUND node returned by jorje doesn't give us the
  // location of the full node, so we have to construct it manually based on
  // the locations of its children. This works fine when the compound does not
  // include opening and closing parenthesis, but when it does, we need to
  // make sure that we take those into account. Otherwise, when the node is
  // prettier ignored, we will end up not printing the correct parenthesis pair.
  const previousParenthesisCharacterIndex = findNextUncommentedCharacter(
    sourceCode,
    "(",
    location.startIndex,
    commentNodes,
    /* backwards */ true,
  );
  // There's no utility from Prettier that looks backwards to find the last
  // non-commented, non-spaced character, so we have to use this workaround
  // to check that the previous opening parenthesis applies to the current node.
  const nextCharacterAfterParenthesisIndex =
    getNextNonSpaceNonCommentCharacterIndex(
      sourceCode,
      previousParenthesisCharacterIndex + 1,
    );
  if (nextCharacterAfterParenthesisIndex === location.startIndex) {
    return handleNodeSurroundedByCharacters("(", ")")(
      location,
      sourceCode,
      commentNodes,
    );
  }
  return identityFunction(location);
}

function handleWhereOperationExpressionLocation(
  location: MinimalLocation,
  sourceCode: string,
  commentNodes: GenericComment[],
): MinimalLocation {
  // #1891 - jorje does not give us the full location of this node, so we have
  // to build it manually. There are 2 cases:
  // 1. The node is not surrounded by parenthesis, in which case we can use the
  //    identity function, e.g.:
  //    Id = '123
  // 2. The node is surrounded by parenthesis, in which case we need to use the
  //    position of the parenthesis to build the location, e.g.:
  //    (Id = '123')
  // It is important to make this distinction, because the WHERE COMPOUND
  // algorithm above this relies on correct location from this node to build up
  // the correct location for the WHERE COMPOUND node.
  // If not handled correctly, ignored code can lead to invalid Apex.
  const previousParenthesisCharacterIndex = findNextUncommentedCharacter(
    sourceCode,
    "(",
    location.startIndex,
    commentNodes,
    /* backwards */ true,
  );
  // There's no utility from Prettier that looks backwards to find the last
  // non-commented, non-spaced character, so we have to use this workaround
  // to check that the previous opening parenthesis applies to the current node.
  const nextCharacterAfterParenthesisIndex =
    getNextNonSpaceNonCommentCharacterIndex(
      sourceCode,
      previousParenthesisCharacterIndex + 1,
    );
  const nextCharacter = getNextNonSpaceNonCommentCharacterIndex(
    sourceCode,
    location.endIndex,
  );

  if (
    nextCharacterAfterParenthesisIndex === location.startIndex &&
    nextCharacter &&
    sourceCode[nextCharacter] === ")"
  ) {
    return handleNodeSurroundedByCharacters("(", ")")(
      location,
      sourceCode,
      commentNodes,
    );
  }
  return identityFunction(location);
}

function handleWhereUnaryExpressionLocation(
  location: MinimalLocation,
  sourceCode: string,
  commentNodes: GenericComment[],
): MinimalLocation {
  // #1891 - jorje does not give us the full location of this node, so we have
  // to build it manually. There are 2 cases:
  // 1. The node is not surrounded by parenthesis, in which case we can use the
  //    identity function, e.g.:
  //    NOT Id = '123
  // 2. The node is surrounded by parenthesis, in which case we need to use the
  //    position of the parenthesis to build the location, e.g.:
  //    (NOT Id = '123')
  // It is important to make this distinction, because the WHERE COMPOUND
  // algorithm above this relies on correct location from this node to build up
  // the correct location for the WHERE COMPOUND node.
  const previousParenthesisCharacterIndex = findNextUncommentedCharacter(
    sourceCode,
    "(",
    location.startIndex,
    commentNodes,
    /* backwards */ true,
  );
  const nextCharacterAfterParenthesisIndex =
    getNextNonSpaceNonCommentCharacterIndex(
      sourceCode,
      previousParenthesisCharacterIndex + 1,
    );
  const nextCharacter = getNextNonSpaceNonCommentCharacterIndex(
    sourceCode,
    location.endIndex,
  );

  if (
    nextCharacterAfterParenthesisIndex === location.startIndex &&
    nextCharacter &&
    sourceCode[nextCharacter] === ")"
  ) {
    return handleNodeSurroundedByCharacters("(", ")")(
      location,
      sourceCode,
      commentNodes,
    );
  }
  return identityFunction(location);
}

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
  [APEX_TYPES.WHERE_COMPOUND_EXPRESSION]: handleWhereCompoundExpressionLocation,
  [APEX_TYPES.WHERE_OPERATION_EXPRESSION]:
    handleWhereOperationExpressionLocation,
  [APEX_TYPES.WHERE_UNARY_EXPRESSION]: handleWhereUnaryExpressionLocation,
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
  [APEX_TYPES.LIMIT_VALUE]: handleLimitValueLocation,
  [APEX_TYPES.WITH_IDENTIFIER]: handleWithIdentifierLocation,
};

type AnyNode = any;
type ApplyFn<AccumulatedResult, Context> = (
  node: AnyNode,
  accumulatedResult: AccumulatedResult,
  context?: Context,
  childrenContext?: Context,
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
 * Depth-First Search that applies the three post-processing visitors to every
 * node in the tree, post-order (children before the node itself).
 * This is specialized for its only call site instead of taking a generic
 * visitor list: only the location visitor accumulates results up the tree,
 * and only the metadata visitor uses a context, so generic bookkeeping
 * (per-visitor context/result arrays allocated for every node) would be pure
 * overhead on the hottest loop in the plugin.
 */
function dfsPostOrderApply(
  root: AnyNode,
  locationVisitor: DfsVisitor<MinimalLocation | null, undefined>,
  lineVisitor: DfsVisitor<undefined, undefined>,
  metadataVisitorInstance: DfsVisitor<undefined, MetadataVisitorContext>,
): void {
  const accumulateLocation = locationVisitor.accumulator;
  const applyLocation = locationVisitor.apply;
  const applyLineIndexes = lineVisitor.apply;
  const gatherMetadataContext = metadataVisitorInstance.gatherChildrenContext;
  const applyMetadata = metadataVisitorInstance.apply;
  /* v8 ignore next 3 */
  if (!accumulateLocation || !gatherMetadataContext) {
    throw new Error("Post-processing visitors are missing expected hooks");
  }
  const walk = (
    node: AnyNode,
    metadataContext: MetadataVisitorContext | undefined,
  ): MinimalLocation | null => {
    const childrenMetadataContext = gatherMetadataContext(
      node,
      metadataContext,
    );
    let accumulatedLocation: MinimalLocation | null = null;
    // for...in instead of Object.keys: the nodes come from JSON.parse, so
    // there are no inherited enumerable properties, and this avoids
    // allocating a key array for every node in the tree.
    for (const key in node) {
      const value = node[key];
      if (value !== null && typeof value === "object") {
        // Location objects are leaves with only scalar fields; all visitor
        // work on them happens through their parent node (getNodeLocation),
        // so recursing into them is pure overhead. They make up a large share
        // of all objects in the AST.
        if (
          (key === "loc" || key === "location") &&
          typeof value.startIndex === "number" &&
          typeof value.endIndex === "number"
        ) {
          continue;
        }
        accumulatedLocation = accumulateLocation(
          walk(value, childrenMetadataContext),
          accumulatedLocation,
        );
      }
    }
    const nodeLocation = applyLocation(node, accumulatedLocation);
    applyLineIndexes(node, undefined);
    applyMetadata(node, undefined, metadataContext, childrenMetadataContext);
    return nodeLocation;
  };
  walk(root, undefined);
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
    const apexClass: string = node["@class"];
    let handlerFn: (typeof locationGenerationHandler)[string] | undefined;
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
      // A location handler may have nulled an existing location (e.g.
      // WhereCompoundOp); normalize it to undefined. Assignment is used
      // instead of `delete`, which would force a hidden-class transition.
      if (node.loc !== undefined) {
        node.loc = undefined;
      }
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
};
const metadataVisitor: (
  emptyLineLocations: Set<number>,
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
      const ifBlocks: jorje.IfBlock[] = node.ifBlocks;
      for (let i = 0, length = ifBlocks.length; i < length; i++) {
        (ifBlocks[i] as EnrichedIfBlock).ifBlockIndex = i;
      }
    }

    const inputParameters = node.inputParameters;
    if (Array.isArray(inputParameters)) {
      for (let i = 0, length = inputParameters.length; i < length; i++) {
        inputParameters[i].insideParenthesis = true;
      }
    }

    const trailingEmptyLineAllowed =
      ALLOW_TRAILING_EMPTY_LINE_SET.has(apexClass);
    const nodeLoc = getNodeLocation(node);
    let isLastNodeInArray = false;

    // Here we flag the current node as the last node in the array, because
    // we don't want a trailing empty line after it.
    const currentSiblings = context?.arraySiblings;
    if (currentSiblings) {
      isLastNodeInArray = node === currentSiblings[currentSiblings.length - 1];
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
    const childrenSiblings = childrenContext?.arraySiblings;
    if (childrenSiblings) {
      for (let i = 0, length = childrenSiblings.length - 1; i < length; i++) {
        const currentChild = childrenSiblings[i];
        if (!currentChild.trailingEmptyLine) {
          continue;
        }
        const currentChildLoc = currentChild.loc;
        const nextChildLoc = childrenSiblings[i + 1].loc;
        if (
          currentChildLoc &&
          nextChildLoc &&
          currentChildLoc.endLine === nextChildLoc.startLine
        ) {
          currentChild.trailingEmptyLine = false;
        }
      }
    }
    if (
      apexClass &&
      nodeLoc &&
      context?.allowTrailingEmptyLine &&
      trailingEmptyLineAllowed &&
      !isLastNodeInArray
    ) {
      const nextLine = nodeLoc.endLine + 1;
      if (emptyLineLocations.has(nextLine)) {
        node.trailingEmptyLine = true;
      }
    }
  },
  gatherChildrenContext: (node, currentContext) => {
    const apexClass = node["@class"];
    let allowTrailingEmptyLineWithin: boolean;
    const isSpecialClass =
      TRAILING_EMPTY_LINE_AFTER_LAST_NODE_SET.has(apexClass);
    const trailingEmptyLineAllowed =
      ALLOW_TRAILING_EMPTY_LINE_SET.has(apexClass);
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
    let arraySiblings: any[] | undefined;
    if (Array.isArray(node) && node.length > 0) {
      arraySiblings = node;
    }
    return {
      allowTrailingEmptyLine: allowTrailingEmptyLineWithin,
      arraySiblings,
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
    if (!nodeLoc) {
      return;
    }
    if (!("startLine" in nodeLoc)) {
      // The location node that we manually generate do not contain startLine
      // information, so we will create them here.
      nodeLoc.startLine =
        nodeLoc.line ?? getLineNumber(lineIndexes, nodeLoc.startIndex);
    }

    if (!("endLine" in nodeLoc)) {
      nodeLoc.endLine = getLineNumber(lineIndexes, nodeLoc.endIndex);

      // Edge case: root node
      if (nodeLoc.endLine < 0) {
        nodeLoc.endLine = lineIndexes.length - 1;
      }
    }

    if (!("column" in nodeLoc)) {
      // startLine is guaranteed to be present by the first branch.
      const nodeStartLineIndex = lineIndexes[nodeLoc.startLine];
      if (nodeStartLineIndex !== undefined) {
        nodeLoc.column = nodeLoc.startIndex - nodeStartLineIndex;
      }
    }
  },
});

// A single pass over the source that produces both the line-boundary map
// consumed by getLineNumber (same array layout as the previous
// getLineIndexes: entry 0 is 0 and entry k is the start index of line k+1,
// with the final entry holding the source length) and the set of
// empty/whitespace-only line numbers.
function getLineInfo(sourceCode: string): {
  lineIndexes: number[];
  emptyLineLocations: Set<number>;
} {
  // A line is empty when its next non-whitespace character sits at or beyond
  // the end of the line. The probe result is cached so consecutive empty
  // lines don't re-scan, and no per-line substring is allocated.
  const nonWhitespace = /\S/g;
  let nextContentIndex = -1;
  const isEmptyLine = (lineStart: number, lineEnd: number): boolean => {
    if (nextContentIndex < lineStart) {
      nonWhitespace.lastIndex = lineStart;
      const match = nonWhitespace.exec(sourceCode);
      nextContentIndex = match ? match.index : Number.POSITIVE_INFINITY;
    }
    return nextContentIndex >= lineEnd;
  };
  // First line always start with index 0
  const lineIndexes = [0];
  const emptyLineLocations = new Set<number>();
  let characterIndex = 0;
  let lineIndex = 1;
  while (characterIndex < sourceCode.length) {
    const eolIndex = sourceCode.indexOf("\n", characterIndex);
    if (eolIndex < 0) {
      break;
    }
    if (isEmptyLine(characterIndex, eolIndex)) {
      emptyLineLocations.add(lineIndex);
    }
    const lastLineIndex = lineIndexes[lineIndex - 1];
    /* v8 ignore next 3 */
    if (lastLineIndex === undefined) {
      return { lineIndexes, emptyLineLocations };
    }
    lineIndexes[lineIndex] = lastLineIndex + (eolIndex - characterIndex) + 1;
    characterIndex = eolIndex + 1;
    lineIndex += 1;
  }
  // The text after the final newline (or the entire source when it contains
  // no newline) forms the last line; a source ending in a newline yields an
  // empty trailing line, matching the previous per-line scan.
  if (isEmptyLine(characterIndex, sourceCode.length)) {
    emptyLineLocations.add(lineIndex);
  }
  lineIndexes[lineIndex] = sourceCode.length;
  return { lineIndexes, emptyLineLocations };
}

export default async function parse(
  sourceCode: string,
  options: prettier.RequiredOptions,
): Promise<SerializedAst | Record<string, never>> {
  let serializedAst: string;
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
    serializedAst = (
      await parseTextWithSpawn(
        serializerBin,
        sourceCode,
        options.parser === "apex-anonymous",
      )
    ).stdout;
  } else {
    serializedAst = (
      await parseTextWithSpawn(
        path.join(
          await getSerializerBinDirectory(),
          `apex-ast-serializer${process.platform === "win32" ? ".bat" : ""}`,
        ),
        sourceCode,
        options.parser === "apex-anonymous",
      )
    ).stdout;
  }
  if (serializedAst) {
    const ast: SerializedAst = JSON.parse(serializedAst);

    const parserOutput = ast[APEX_TYPES.PARSER_OUTPUT];
    if (parserOutput && parserOutput.parseErrors.length > 0) {
      const errors = parserOutput.parseErrors.map(
        (err: jorje.ParseException) => `${err.message}.`,
      );
      throw new Error(errors.join("\r\n"));
    }
    const hiddenTokenMap = parserOutput.hiddenTokenMap;
    const comments = [];
    for (let i = 0, length = hiddenTokenMap.length; i < length; i++) {
      const token = (hiddenTokenMap[i] as any[])[1];
      const tokenClass = token["@class"];
      if (
        tokenClass === APEX_TYPES.BLOCK_COMMENT ||
        tokenClass === APEX_TYPES.INLINE_COMMENT
      ) {
        comments.push(token);
      }
    }
    ast.comments = comments;
    const lastComment = ast.comments.at(-1);
    if (lastComment) {
      const nextCharAfterLastCommentIndex =
        getNextNonSpaceNonCommentCharacterIndex(
          sourceCode,
          lastComment.location.endIndex,
        );
      if (nextCharAfterLastCommentIndex === sourceCode.length) {
        // #1777 - We don't want a trailing empty line after the last comment in
        // the document, because that will be a duplicate of the final empty line.
        (lastComment as AnnotatedComment).trailingEmptyLine = false;
      }
    }
    const { lineIndexes, emptyLineLocations } = getLineInfo(sourceCode);
    dfsPostOrderApply(
      ast,
      nodeLocationVisitor(sourceCode, ast.comments),
      lineIndexVisitor(lineIndexes),
      metadataVisitor(emptyLineLocations),
    );

    return ast;
  }
  throw new Error("Failed to parse Apex code: the parser returned no output");
}
