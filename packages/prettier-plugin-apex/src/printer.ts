import type { AstPath, Doc } from "prettier";
import * as prettier from "prettier";

import * as jorje from "../vendor/apex-ast-serializer/typings/jorje.d.js";
import {
  getTrailingComments,
  printComment,
  printDanglingComment,
} from "./comments.js";
import {
  APEX_TYPES,
  ASSIGNMENT,
  BINARY,
  BOOLEAN,
  DATA_CATEGORY,
  MODIFIER,
  ORDER,
  ORDER_NULL,
  POSTFIX,
  PREFIX,
  QUERY,
  QUERY_WHERE,
  TRIGGER_USAGE,
} from "./constants.js";
import { EnrichedIfBlock } from "./parser.js";
import {
  AnnotatedComment,
  checkIfParentIsDottedExpression,
  getParentType,
  getPrecedence,
  isBinaryish,
} from "./util.js";

const docBuilders = prettier.doc.builders;
const { align, join, hardline, line, softline, group, indent, dedent } =
  docBuilders;

type PrintFn = (path: AstPath) => Doc;

function indentConcat(docs: Doc[]): Doc {
  return indent(docs);
}

function groupConcat(docs: Doc[]): Doc {
  return group(docs);
}

function groupIndentConcat(docs: Doc[]): Doc {
  return group(indent(docs));
}

function handlePassthroughCall(
  prop1: string,
  prop2?: string,
): (path: AstPath, print: PrintFn) => Doc {
  return (path: AstPath, print: PrintFn) =>
    prop2 ? path.call(print, prop1, prop2) : path.call(print, prop1);
}

function pushIfExist(
  parts: Doc[],
  doc: Doc,
  postDocs?: Doc[] | null,
  preDocs?: Doc[] | null,
): Doc[] {
  if (doc) {
    if (preDocs) {
      preDocs.forEach((preDoc: Doc) => parts.push(preDoc));
    }
    parts.push(doc);
    if (postDocs) {
      postDocs.forEach((postDoc: Doc) => parts.push(postDoc));
    }
  }
  return parts;
}

function escapeString(text: string): string {
  // Code from https://stackoverflow.com/a/11716317/477761
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\u0008/g, "\\b") // eslint-disable-line no-control-regex
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\f/g, "\\f")
    .replace(/\r/g, "\\r")
    .replace(/'/g, "\\'");
}

function handleReturnStatement(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const docs: Doc[] = [];
  docs.push("return");
  const childDocs: Doc = path.call(print, "expr", "value");
  if (childDocs) {
    docs.push(" ");
    docs.push(childDocs);
  }
  docs.push(";");
  if (node.expr.value && isBinaryish(node.expr.value)) {
    return groupIndentConcat(docs);
  }
  return groupConcat(docs);
}

function handleTriggerUsage(path: AstPath): Doc {
  const node: jorje.TriggerDeclUnit["usages"][number] = path.getNode();
  return TRIGGER_USAGE[node.$];
}

function getOperator(node: jorje.BinaryExpr | jorje.BooleanExpr): string {
  if (node.op["@class"] === APEX_TYPES.BOOLEAN_OPERATOR) {
    return BOOLEAN[node.op.$];
  }
  return BINARY[node.op.$];
}

function handleBinaryishExpression(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const nodeOp = getOperator(node);
  const nodePrecedence = getPrecedence(nodeOp);
  const parentNode = path.getParentNode();

  const isLeftNodeBinaryish = isBinaryish(node.left);
  const isRightNodeBinaryish = isBinaryish(node.right);
  const isNestedExpression = isBinaryish(parentNode);
  const isNestedRightExpression =
    isNestedExpression && node === parentNode.right;

  const isNodeSamePrecedenceAsLeftChild =
    isLeftNodeBinaryish &&
    nodePrecedence === getPrecedence(getOperator(node.left));
  const isNodeSamePrecedenceAsParent =
    isBinaryish(parentNode) &&
    nodePrecedence === getPrecedence(getOperator(parentNode));

  const docs: Doc[] = [];
  const leftDoc: Doc = path.call(print, "left");
  const operationDoc: Doc = path.call(print, "op");
  const rightDoc: Doc = path.call(print, "right");

  // This variable signifies that this node is a left child with the same
  // precedence as its parent, and thus should be laid out on the same indent
  // level as its parent, e.g:
  // a = b >
  //   c >  // -> the (b > c) node here
  //   d
  const isLeftChildNodeWithoutGrouping =
    (isNodeSamePrecedenceAsLeftChild || !isLeftNodeBinaryish) &&
    isNestedExpression &&
    isNodeSamePrecedenceAsParent &&
    !isNestedRightExpression;

  // #265 - This variable signifies that the right child of this node should
  // be laid out on the same indentation level, even though the left child node
  // should be in its own group, e.g:
  // a = b > c && d && e -> The node (d) here
  const hasRightChildNodeWithoutGrouping =
    !isLeftChildNodeWithoutGrouping &&
    isNestedExpression &&
    isNodeSamePrecedenceAsParent &&
    !isNestedRightExpression;

  // This variable signifies that the left node and right has the same
  // precedence, and thus they should be laid out on the same indent level, e.g.:
  // a = b > 1 &&
  //   c > 1
  const leftChildNodeSamePrecedenceAsRightChildNode =
    isLeftNodeBinaryish &&
    isRightNodeBinaryish &&
    getPrecedence(getOperator(node.left)) ===
      getPrecedence(getOperator(node.right));
  // This variable signifies that this node is the top most binaryish node,
  // and its left child node has the same precedence, e.g:
  // a = b >
  //   c >
  //   d  // -> the entire node (b > c > d) here
  const isTopMostParentNodeWithoutGrouping =
    isNodeSamePrecedenceAsLeftChild && !isNestedExpression;

  // If this expression is directly inside parentheses, we want to give it
  // an extra level indentation, i.e.:
  // ```
  // createObject(
  //   firstBoolean &&
  //      secondBoolean
  // );
  // ```
  // This is different behavior vs when the expression is in a variable
  // declaration, i.e.:
  // ```
  // firstBoolean =
  //   secondBoolean &&
  //   thirdBoolean;
  // ```
  // This behavior is consistent with how upstream formats Javascript
  const shouldIndentTopMostExpression = node.insideParenthesis;

  if (
    isLeftChildNodeWithoutGrouping ||
    leftChildNodeSamePrecedenceAsRightChildNode ||
    isTopMostParentNodeWithoutGrouping
  ) {
    docs.push(leftDoc);
    docs.push(" ");
    docs.push([operationDoc, line, rightDoc]);
    return shouldIndentTopMostExpression ? indentConcat(docs) : docs;
  }
  if (hasRightChildNodeWithoutGrouping) {
    docs.push(group(leftDoc));
    docs.push(" ");
    docs.push([operationDoc, line, rightDoc]);
    return docs;
  }
  // At this point we know that this node is not in a binaryish chain, so we
  // can safely group the left doc and right doc separately to have this effect:
  // a = b
  //  .c() > d
  docs.push(group(leftDoc));
  docs.push(" ");

  // If the left child of a binaryish expression has an end of line comment,
  // we want to make sure that comment is printed with the left child and
  // followed by a hardline. Otherwise, it will lead to unstable comments in
  // certain situation, because the EOL comment might become attached to the
  // entire binaryish expression after the first format.
  const leftChildHasEndOfLineComment =
    node.left.comments?.filter(
      (comment: AnnotatedComment) =>
        comment.trailing && comment.placement === "endOfLine",
    ).length > 0;

  if (leftChildHasEndOfLineComment) {
    docs.push(groupConcat([operationDoc, hardline, rightDoc]));
  } else {
    docs.push(groupConcat([operationDoc, line, rightDoc]));
  }
  return groupConcat(docs);
}

function handleAssignmentExpression(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const docs: Doc[] = [];

  const leftDoc: Doc = path.call(print, "left");
  const operationDoc: Doc = path.call(print, "op");
  const rightDoc: Doc = path.call(print, "right");
  docs.push(leftDoc);
  docs.push(" ");
  docs.push(operationDoc);

  const rightDocComments = node.right.comments;
  const rightDocHasLeadingComments =
    Array.isArray(rightDocComments) &&
    rightDocComments.some((comment) => comment.leading);

  if (isBinaryish(node.right) || rightDocHasLeadingComments) {
    docs.push(line);
    docs.push(rightDoc);
    return groupIndentConcat(docs);
  }
  docs.push(" ");
  docs.push(rightDoc);
  return groupConcat(docs);
}

function shouldDottedExpressionBreak(path: AstPath): boolean {
  const node = path.getNode();
  // #62 - `super` cannot  be followed any white spaces
  if (
    node.dottedExpr.value["@class"] === APEX_TYPES.SUPER_VARIABLE_EXPRESSION
  ) {
    return false;
  }
  // #98 - Even though `this` can synctactically be followed by whitespaces,
  // make the formatted output similar to `super` to provide consistency.
  if (node.dottedExpr.value["@class"] === APEX_TYPES.THIS_VARIABLE_EXPRESSION) {
    return false;
  }
  if (node["@class"] !== APEX_TYPES.METHOD_CALL_EXPRESSION) {
    return true;
  }
  if (checkIfParentIsDottedExpression(path)) {
    return true;
  }
  if (
    node.dottedExpr.value &&
    node.dottedExpr.value["@class"] === APEX_TYPES.METHOD_CALL_EXPRESSION
  ) {
    return true;
  }
  return node.dottedExpr.value;
}

function handleDottedExpression(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const dottedExpressionParts: Doc[] = [];
  const dottedExpressionDoc: Doc = path.call(print, "dottedExpr", "value");

  if (dottedExpressionDoc) {
    dottedExpressionParts.push(dottedExpressionDoc);
    if (shouldDottedExpressionBreak(path)) {
      dottedExpressionParts.push(softline);
    }
    if (node.isSafeNav) {
      dottedExpressionParts.push("?");
    }
    dottedExpressionParts.push(".");
    return dottedExpressionParts;
  }
  return "";
}

function handleArrayExpressionIndex(
  path: AstPath,
  print: PrintFn,
  withGroup = true,
): Doc {
  const node = path.getNode();
  let parts;
  if (node.index["@class"] === APEX_TYPES.LITERAL_EXPRESSION) {
    // For literal index, we will make sure it's always attached to the [],
    // because it's usually short and will look bad being broken up.
    parts = ["[", path.call(print, "index"), "]"];
  } else {
    parts = ["[", softline, path.call(print, "index"), dedent(softline), "]"];
  }
  return withGroup ? groupIndentConcat(parts) : parts;
}

function handleVariableExpression(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const parentNode = path.getParentNode();
  const nodeName = path.getName();
  const { dottedExpr } = node;
  const parts: Doc[] = [];
  const dottedExpressionDoc = handleDottedExpression(path, print);
  const isParentDottedExpression = checkIfParentIsDottedExpression(path);
  const isDottedExpressionSoqlExpression =
    dottedExpr &&
    dottedExpr.value &&
    (dottedExpr.value["@class"] === APEX_TYPES.SOQL_EXPRESSION ||
      (dottedExpr.value["@class"] === APEX_TYPES.ARRAY_EXPRESSION &&
        dottedExpr.value.expr &&
        dottedExpr.value.expr["@class"] === APEX_TYPES.SOQL_EXPRESSION));

  parts.push(dottedExpressionDoc);
  // Name chain
  const nameDocs: Doc[] = path.map(print, "names");
  parts.push(join(".", nameDocs));

  // Technically, in a typical array expression (e.g: a[b]),
  // the variable expression is a child of the array expression.
  // However, for certain situation we need to print the [] part as part of
  // the group from the variable expression. For example:
  // a
  //   .b
  //   .c[
  //     d.callMethod()
  //   ]
  // If we print the [] as part of the array expression, like we usually do,
  // the result will be:
  // a
  //   .b
  //   .c[
  //   d.callMethod()
  // ]
  // Hence why we are deferring the printing of the [] part from handleArrayExpression
  // to here.
  if (
    parentNode["@class"] === APEX_TYPES.ARRAY_EXPRESSION &&
    nodeName === "expr"
  ) {
    path.callParent((innerPath: AstPath) => {
      const withGroup = isParentDottedExpression || !!dottedExpressionDoc;

      parts.push(handleArrayExpressionIndex(innerPath, print, withGroup));
    });
  }
  if (isParentDottedExpression || isDottedExpressionSoqlExpression) {
    return parts;
  }
  return groupIndentConcat(parts);
}

function handleJavaVariableExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  return parts;
}

function handleLiteralExpression(
  path: AstPath,
  print: PrintFn,
  options: prettier.ParserOptions,
): Doc {
  const node = path.getNode();
  const literalType: Doc = path.call(print, "type", "$");
  if (literalType === "NULL") {
    return "null";
  }
  const literalDoc: Doc = path.call(print, "literal", "$");
  let doc;
  if (literalType === "STRING") {
    // #165 - We have to use the original string because it might contain Unicode code points,
    // which gets converted to displayed characters automatically by Java after being parsed by jorje.
    doc = options.originalText.slice(node.loc.startIndex, node.loc.endIndex);
  } else if (
    literalType === "LONG" ||
    literalType === "DECIMAL" ||
    literalType === "DOUBLE"
  ) {
    const literal = options.originalText.slice(
      node.loc.startIndex,
      node.loc.endIndex,
    );
    let lastCharacter = literal[literal.length - 1];
    /* v8 ignore next 3 */
    if (lastCharacter === undefined) {
      lastCharacter = "";
    }
    const lowercasedLastCharacter = lastCharacter.toLowerCase();
    // We handle the letters d and l at the end of Decimal and Long manually:
    // ```
    // Decimal a = 1.0D
    // Long b = 4324234234l
    // ```
    // should be formatted to:
    // ```
    // Decimal a = 1.0d
    // Long b = 4324234234L
    // ```
    // In general we try to keep keywords lowercase, however uppercase L is better
    // the lowercase l because lowercase l can be mistaken for number 1
    if (lowercasedLastCharacter === "d") {
      doc = `${literal.substring(0, literal.length - 1)}d`;
    } else if (lowercasedLastCharacter === "l") {
      doc = `${literal.substring(0, literal.length - 1)}L`;
    } else {
      doc = literal;
    }
  }
  if (doc) {
    return doc;
  }
  return literalDoc;
}

function handleBinaryOperation(path: AstPath): Doc {
  const node: jorje.BinaryExpr["op"] = path.getNode();
  return BINARY[node.$];
}

function handleBooleanOperation(path: AstPath): Doc {
  const node: jorje.BooleanExpr["op"] = path.getNode();
  return BOOLEAN[node.$];
}

function handleAssignmentOperation(path: AstPath): Doc {
  const node: jorje.AssignmentExpr["op"] = path.getNode();
  return ASSIGNMENT[node.$];
}

function getDanglingCommentDocs(path: AstPath, _print: PrintFn, options: any) {
  const node = path.getNode();
  if (!node.comments) {
    return [];
  }
  node.danglingComments = node.comments.filter(
    (comment: AnnotatedComment) => !comment.leading && !comment.trailing,
  );
  const danglingCommentParts: Doc[] = [];
  path.each((commentPath: AstPath) => {
    danglingCommentParts.push(printDanglingComment(commentPath, options));
  }, "danglingComments");
  delete node.danglingComments;
  return danglingCommentParts;
}

function handleAnonymousBlockUnit(path: AstPath, print: PrintFn): Doc {
  // Unlike other compilation units, Anonymous Unit cannot have dangling comments,
  // so we don't have to handle them here.
  const parts: Doc[] = [];
  const memberParts = path
    .map(print, "members")
    .filter((member: Doc) => member);

  const memberDocs: Doc[] = memberParts.map(
    (memberDoc: Doc, index: number, allMemberDocs: Doc[]) => {
      if (index !== allMemberDocs.length - 1) {
        return [memberDoc, hardline];
      }
      return memberDoc;
    },
  );
  if (memberDocs.length > 0) {
    parts.push(...memberDocs);
  }
  return parts;
}

function handleTriggerDeclarationUnit(
  path: AstPath,
  print: PrintFn,
  options: any,
) {
  const usageDocs: Doc[] = path.map(print, "usages");
  const targetDocs: Doc[] = path.map(print, "target");
  const danglingCommentDocs: Doc[] = getDanglingCommentDocs(
    path,
    print,
    options,
  );

  const parts: Doc[] = [];
  const usageParts = [];
  parts.push("trigger");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("on");
  parts.push(" ");
  parts.push(join(",", targetDocs));
  parts.push("(");
  // Usage
  usageParts.push(softline);
  usageParts.push(join([",", line], usageDocs));
  usageParts.push(dedent(softline));
  parts.push(groupIndentConcat(usageParts));

  parts.push(")");
  parts.push(" ");
  parts.push("{");
  const memberParts = path
    .map(print, "members")
    .filter((member: Doc) => member);

  const memberDocs: Doc[] = memberParts.map(
    (memberDoc: Doc, index: number, allMemberDocs: Doc[]) => {
      if (index !== allMemberDocs.length - 1) {
        return [memberDoc, hardline];
      }
      return memberDoc;
    },
  );
  if (danglingCommentDocs.length > 0) {
    parts.push(indent([hardline, ...danglingCommentDocs]));
  } else if (memberDocs.length > 0) {
    parts.push(indent([hardline, ...memberDocs]));
  }
  parts.push(dedent([hardline, "}"]));
  return parts;
}

function handleInterfaceDeclaration(
  path: AstPath,
  print: PrintFn,
  options: any,
) {
  const node = path.getNode();

  const superInterface: Doc = path.call(print, "superInterface", "value");
  const modifierDocs: Doc[] = path.map(print, "modifiers");
  const memberParts = path
    .map(print, "members")
    .filter((member: Doc) => member);
  const danglingCommentDocs: Doc[] = getDanglingCommentDocs(
    path,
    print,
    options,
  );

  const memberDocs: Doc[] = memberParts.map(
    (memberDoc: Doc, index: number, allMemberDocs: Doc[]) => {
      if (index !== allMemberDocs.length - 1) {
        return [memberDoc, hardline];
      }
      return memberDoc;
    },
  );

  const parts: Doc[] = [];
  if (modifierDocs.length > 0) {
    parts.push(modifierDocs);
  }
  parts.push("interface");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  if (node.typeArguments.value) {
    const typeArgumentParts: Doc[] = path.map(print, "typeArguments", "value");
    parts.push("<");
    parts.push(join(", ", typeArgumentParts));
    parts.push(">");
  }
  if (superInterface) {
    parts.push(" ");
    parts.push("extends");
    parts.push(" ");
    parts.push(superInterface);
  }
  parts.push(" ");
  parts.push("{");
  if (danglingCommentDocs.length > 0) {
    parts.push(indent([hardline, ...danglingCommentDocs]));
  } else if (memberDocs.length > 0) {
    parts.push(indent([hardline, ...memberDocs]));
  }
  parts.push([hardline, "}"]);
  return parts;
}

function handleClassDeclaration(
  path: AstPath,
  print: PrintFn,
  options: any,
): Doc {
  const node = path.getNode();

  const superClass: Doc = path.call(print, "superClass", "value");
  const modifierDocs: Doc[] = path.map(print, "modifiers");
  const memberParts = path
    .map(print, "members")
    .filter((member: Doc) => member);
  const danglingCommentDocs: Doc[] = getDanglingCommentDocs(
    path,
    print,
    options,
  );

  const memberDocs: Doc[] = memberParts.map(
    (memberDoc: Doc, index: number, allMemberDocs: Doc[]) => {
      if (index !== allMemberDocs.length - 1) {
        return [memberDoc, hardline];
      }
      return memberDoc;
    },
  );

  const parts: Doc[] = [];
  if (modifierDocs.length > 0) {
    parts.push(modifierDocs);
  }
  parts.push("class");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  if (node.typeArguments.value) {
    const typeArgumentParts: Doc[] = path.map(print, "typeArguments", "value");
    parts.push("<");
    parts.push(join(", ", typeArgumentParts));
    parts.push(">");
  }
  if (superClass !== "") {
    parts.push(" ");
    parts.push("extends");
    parts.push(" ");
    parts.push(superClass);
  }
  const interfaces: Doc[] = path.map(print, "interfaces");
  if (interfaces.length > 0) {
    parts.push(" ");
    parts.push("implements");
    parts.push(" ");
    parts.push(join(", ", interfaces));
  }
  parts.push(" ");
  parts.push("{");
  if (danglingCommentDocs.length > 0) {
    parts.push(indent([hardline, ...danglingCommentDocs]));
  } else if (memberDocs.length > 0) {
    parts.push(indent([hardline, ...memberDocs]));
  }
  parts.push([hardline, "}"]);
  return parts;
}

function handleAnnotation(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const parts: Doc[] = [];
  const trailingParts: Doc[] = [];
  const parameterParts = [];
  const parameterDocs: Doc[] = path.map(print, "parameters");
  if (node.comments) {
    // We print the comments manually because this method adds a hardline
    // at the end of the annotation. If we left it to Prettier to print trailing
    // comments it can lead to unstable formatting like this:
    // ```
    // @isTest
    // // Trailing Comment
    // void method() {}
    // ```
    path.each((innerPath: AstPath) => {
      const commentNode = innerPath.getNode();
      // This can only be a trailing comment, because if it is a leading one,
      // it will be attached to the Annotation's parent node (e.g. MethodDecl)
      if (commentNode.trailing) {
        trailingParts.push(" ");
        trailingParts.push(printComment(innerPath));
      }
    }, "comments");
  }
  parts.push("@");
  parts.push(path.call(print, "name", "value"));
  if (parameterDocs.length > 0) {
    parameterParts.push("(");
    parameterParts.push(softline);
    parameterParts.push(join(line, parameterDocs));
    parameterParts.push(dedent(softline));
    parameterParts.push(")");
    parts.push(groupIndentConcat(parameterParts));
  }
  parts.push(...trailingParts);
  parts.push(hardline);
  return parts;
}

function handleAnnotationKeyValue(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "key", "value"));
  parts.push("=");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleAnnotationValue(
  childClass: string,
  path: AstPath,
  print: PrintFn,
): Doc {
  const parts: Doc[] = [];
  switch (childClass as jorje.AnnotationValue["@class"]) {
    case APEX_TYPES.TRUE_ANNOTATION_VALUE:
      parts.push("true");
      break;
    case APEX_TYPES.FALSE_ANNOTATION_VALUE:
      parts.push("false");
      break;
    case APEX_TYPES.STRING_ANNOTATION_VALUE:
      parts.push("'");
      parts.push(path.call(print, "value"));
      parts.push("'");
      break;
  }
  return parts;
}

function handleAnnotationString(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("'");
  parts.push(path.call(print, "value"));
  parts.push("'");
  return parts;
}

function handleClassTypeRef(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(join(".", path.map(print, "names")));
  const typeArgumentDocs: Doc[] = path.map(print, "typeArguments");
  if (typeArgumentDocs.length > 0) {
    parts.push("<");
    parts.push(join(", ", typeArgumentDocs));
    parts.push(">");
  }
  return parts;
}

function handleArrayTypeRef(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "heldType"));
  parts.push("[]");
  return parts;
}

function handleJavaTypeRef(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  return parts;
}

function handleStatementBlockMember(
  modifier?: string,
): (path: AstPath, print: PrintFn) => Doc {
  return (path: AstPath, print: PrintFn) => {
    const statementDoc: Doc = path.call(print, "stmnt");

    const parts: Doc[] = [];
    if (modifier) {
      parts.push(modifier);
      parts.push(" ");
    }
    pushIfExist(parts, statementDoc);
    return parts;
  };
}

function handlePropertyDeclaration(path: AstPath, print: PrintFn): Doc {
  const modifierDocs: Doc[] = path.map(print, "modifiers");
  const getterDoc: Doc = path.call(print, "getter", "value");
  const setterDoc: Doc = path.call(print, "setter", "value");

  const parts: Doc[] = [];
  const innerParts = [];
  parts.push(join("", modifierDocs));
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("{");
  if (getterDoc || setterDoc) {
    innerParts.push(line);
  }
  if (getterDoc) {
    innerParts.push(getterDoc);
    if (setterDoc) {
      innerParts.push(line);
    } else {
      innerParts.push(dedent(line));
    }
  }
  pushIfExist(innerParts, setterDoc, [dedent(line)]);
  parts.push(groupIndentConcat(innerParts));
  parts.push("}");
  return groupConcat(parts);
}

function handlePropertyGetterSetter(
  action: "get" | "set",
): (path: AstPath, print: PrintFn) => Doc {
  return (path: AstPath, print: PrintFn) => {
    const statementDoc: Doc = path.call(print, "stmnt", "value");

    const parts: Doc[] = [];
    parts.push(path.call(print, "modifier", "value"));
    parts.push(action);
    if (statementDoc) {
      parts.push(" ");
      parts.push(statementDoc);
    } else {
      parts.push(";");
    }
    return parts;
  };
}

function handleMethodDeclaration(path: AstPath, print: PrintFn): Doc {
  const statementDoc: Doc = path.call(print, "stmnt", "value");
  const modifierDocs: Doc[] = path.map(print, "modifiers");
  const parameterDocs: Doc[] = path.map(print, "parameters");

  const parts: Doc[] = [];
  const parameterParts = [];
  // Modifiers
  if (modifierDocs.length > 0) {
    parts.push(modifierDocs);
  }
  // Return type
  pushIfExist(parts, path.call(print, "type", "value"), [" "]);
  // Method name
  parts.push(path.call(print, "name"));
  // Params
  parts.push("(");
  if (parameterDocs.length > 0) {
    parameterParts.push(softline);
    parameterParts.push(join([",", line], parameterDocs));
    parameterParts.push(dedent(softline));
    parts.push(groupIndentConcat(parameterParts));
  }
  parts.push(")");
  // Body
  pushIfExist(parts, statementDoc, null, [" "]);
  if (!statementDoc) {
    parts.push(";");
  }
  return parts;
}

function handleModifierParameterRef(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  // Modifiers
  parts.push(join("", path.map(print, "modifiers")));
  // Type
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  // Value
  parts.push(path.call(print, "name"));
  return parts;
}

function handleEmptyModifierParameterRef(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  // Type
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  // Value
  parts.push(path.call(print, "name"));
  return parts;
}

function handleStatement(
  childClass: string,
  path: AstPath,
  print: PrintFn,
): Doc {
  let doc;
  switch (childClass as jorje.Stmnt["@class"]) {
    case APEX_TYPES.DML_INSERT_STATEMENT:
      doc = "insert";
      break;
    case APEX_TYPES.DML_UPDATE_STATEMENT:
      doc = "update";
      break;
    case APEX_TYPES.DML_UPSERT_STATEMENT:
      doc = "upsert";
      break;
    case APEX_TYPES.DML_DELETE_STATEMENT:
      doc = "delete";
      break;
    case APEX_TYPES.DML_UNDELETE_STATEMENT:
      doc = "undelete";
      break;
    /* v8 ignore start */
    default:
      throw new Error(
        `Statement ${childClass} is not supported. Please file a bug report.`,
      );
    /* v8 ignore stop */
  }
  const node = path.getNode();
  const parts: Doc[] = [];
  parts.push(doc);
  parts.push(" ");
  pushIfExist(parts, path.call(print, "runAsMode", "value"), [" "], ["as "]);
  parts.push(path.call(print, "expr"));
  // upsert statement has an extra param that can be tacked on at the end
  if (node.id) {
    pushIfExist(parts, path.call(print, "id", "value"), null, [indent(line)]);
  }
  parts.push(";");
  return groupConcat(parts);
}

function handleDmlMergeStatement(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("merge");
  parts.push(" ");
  pushIfExist(parts, path.call(print, "runAsMode", "value"), [" "], ["as "]);
  parts.push(path.call(print, "expr1"));
  parts.push(line);
  parts.push(path.call(print, "expr2"));
  parts.push(";");
  return groupIndentConcat(parts);
}

function handleEnumDeclaration(
  path: AstPath,
  print: PrintFn,
  options: any,
): Doc {
  const modifierDocs: Doc[] = path.map(print, "modifiers");
  const memberDocs: Doc[] = path.map(print, "members");
  const danglingCommentDocs = getDanglingCommentDocs(path, print, options);

  const parts: Doc[] = [];
  pushIfExist(parts, join("", modifierDocs));
  parts.push("enum");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("{");
  if (danglingCommentDocs.length > 0) {
    parts.push(indent([hardline, ...danglingCommentDocs]));
  } else if (memberDocs.length > 0) {
    parts.push(indent([hardline, join([",", hardline], memberDocs)]));
  }
  parts.push([hardline, "}"]);
  return parts;
}

function handleSwitchStatement(path: AstPath, print: PrintFn): Doc {
  const whenBlocks: Doc[] = path.map(print, "whenBlocks");

  const parts: Doc[] = [];
  parts.push("switch on");
  parts.push(groupConcat([line, path.call(print, "expr")]));
  parts.push(" ");
  parts.push("{");
  parts.push(hardline);
  parts.push(join(hardline, whenBlocks));
  parts.push(dedent(hardline));
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleValueWhen(path: AstPath, print: PrintFn): Doc {
  const whenCaseDocs: Doc[] = path.map(print, "whenCases");
  const statementDoc: Doc = path.call(print, "stmnt");

  const parts: Doc[] = [];
  parts.push("when");
  parts.push(" ");
  const whenCaseGroup = group(indent(join([",", line], whenCaseDocs)));
  parts.push(whenCaseGroup);
  parts.push(" ");
  pushIfExist(parts, statementDoc);
  return parts;
}

function handleElseWhen(path: AstPath, print: PrintFn): Doc {
  const statementDoc: Doc = path.call(print, "stmnt");

  const parts: Doc[] = [];
  parts.push("when");
  parts.push(" ");
  parts.push("else");
  parts.push(" ");
  pushIfExist(parts, statementDoc);
  return parts;
}

function handleTypeWhen(path: AstPath, print: PrintFn): Doc {
  const statementDoc: Doc = path.call(print, "stmnt");

  const parts: Doc[] = [];
  parts.push("when");
  parts.push(" ");
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  pushIfExist(parts, statementDoc);
  return parts;
}

function handleEnumCase(path: AstPath, print: PrintFn): Doc {
  return join(".", path.map(print, "identifiers"));
}

function handleInputParameters(path: AstPath, print: PrintFn): Doc[] {
  // In most cases, the descendant nodes inside `inputParameters` will create
  // their own groups. However, in certain circumstances (i.e. with binaryish
  // behavior), they rely on groups created by their parents. That's why we
  // wrap each inputParameter in a group here. See #693 for an example case.
  return path.map(print, "inputParameters").map((paramDoc) => group(paramDoc));
}

function handleRunAsBlock(path: AstPath, print: PrintFn): Doc {
  const paramDocs: Doc[] = handleInputParameters(path, print);
  const statementDoc: Doc = path.call(print, "stmnt");

  const parts: Doc[] = [];
  parts.push("System.runAs");
  parts.push("(");
  parts.push(join([",", line], paramDocs));
  parts.push(")");
  parts.push(" ");
  pushIfExist(parts, statementDoc);
  return parts;
}

function handleBlockStatement(
  path: AstPath,
  print: PrintFn,
  options: any,
): Doc {
  const parts: Doc[] = [];
  const danglingCommentDocs = getDanglingCommentDocs(path, print, options);
  const statementDocs: Doc[] = path.map(print, "stmnts");

  parts.push("{");
  if (danglingCommentDocs.length > 0) {
    parts.push([hardline, ...danglingCommentDocs]);
  } else if (statementDocs.length > 0) {
    parts.push(hardline);
    parts.push(join(hardline, statementDocs));
  }
  parts.push(dedent(hardline));
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleTryCatchFinallyBlock(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const tryStatementDoc: Doc = path.call(print, "tryBlock");
  const catchBlockDocs: Doc[] = path.map(print, "catchBlocks");
  const finallyBlockDoc: Doc = path.call(print, "finallyBlock", "value");

  const parts: Doc[] = [];
  parts.push("try");
  parts.push(" ");
  pushIfExist(parts, tryStatementDoc);

  const tryBlockContainsTrailingComments: boolean =
    node.tryBlock.comments?.some(
      (comment: AnnotatedComment) => comment.trailing,
    );

  let catchBlockContainsLeadingOwnLineComments: boolean[] = [];
  let catchBlockContainsTrailingComments: boolean[] = [];
  if (catchBlockDocs.length > 0) {
    catchBlockContainsLeadingOwnLineComments = node.catchBlocks.map(
      (catchBlock: jorje.CatchBlock & { comments?: AnnotatedComment[] }) =>
        catchBlock.comments?.some(
          (comment: AnnotatedComment) =>
            comment.leading && comment.placement === "ownLine",
        ),
    );
    catchBlockContainsTrailingComments = node.catchBlocks.map(
      (catchBlock: jorje.CatchBlock & { comments?: AnnotatedComment[] }) =>
        catchBlock.comments?.some(
          (comment: AnnotatedComment) => comment.trailing,
        ),
    );
    catchBlockDocs.forEach((catchBlockDoc: Doc, index: number) => {
      const shouldAddHardLineBeforeCatch =
        catchBlockContainsLeadingOwnLineComments[index] ||
        catchBlockContainsTrailingComments[index - 1] ||
        (index === 0 && tryBlockContainsTrailingComments);
      if (shouldAddHardLineBeforeCatch) {
        parts.push(hardline);
      } else {
        parts.push(" ");
      }
      parts.push(catchBlockDoc);
    });
  }
  const finallyBlockContainsLeadingOwnLineComments =
    node.finallyBlock?.value?.comments?.some(
      (comment: AnnotatedComment) =>
        comment.leading && comment.placement === "ownLine",
    );
  const shouldAddHardLineBeforeFinally =
    finallyBlockContainsLeadingOwnLineComments ||
    (catchBlockContainsTrailingComments.length > 0 &&
      catchBlockContainsTrailingComments[
        catchBlockContainsTrailingComments.length - 1
      ]) ||
    (catchBlockContainsTrailingComments.length === 0 &&
      tryBlockContainsTrailingComments);
  pushIfExist(parts, finallyBlockDoc, null, [
    shouldAddHardLineBeforeFinally ? hardline : " ",
  ]);
  return parts;
}

function handleCatchBlock(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("catch");
  parts.push(" ");
  parts.push("(");
  parts.push(path.call(print, "parameter"));
  parts.push(")");
  parts.push(" ");
  pushIfExist(parts, path.call(print, "stmnt"));
  return parts;
}

function handleFinallyBlock(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("finally");
  parts.push(" ");
  pushIfExist(parts, path.call(print, "stmnt"));
  return parts;
}

function handleVariableDeclarations(path: AstPath, print: PrintFn): Doc {
  const modifierDocs: Doc[] = path.map(print, "modifiers");

  const parts: Doc[] = [];
  // Modifiers
  parts.push(join("", modifierDocs));

  // Type
  parts.push(path.call(print, "type"));
  parts.push(" ");
  // Variable declarations
  const declarationDocs: Doc[] = path.map(print, "decls");
  if (declarationDocs.length > 1) {
    parts.push(indentConcat([join([",", line], declarationDocs)]));
    parts.push(";");
  } else if (declarationDocs.length === 1 && declarationDocs[0] !== undefined) {
    parts.push([declarationDocs[0], ";"]);
  }
  return groupConcat(parts);
}

function handleVariableDeclaration(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const parts: Doc[] = [];
  let resultDoc;

  parts.push(path.call(print, "name"));
  const assignmentDocs: Doc = path.call(print, "assignment", "value");
  const assignmentComments = node.assignment?.value?.comments;
  const assignmentHasLeadingComment =
    Array.isArray(assignmentComments) &&
    assignmentComments.some((comment) => comment.leading);

  if (
    assignmentDocs &&
    (isBinaryish(node.assignment.value) || assignmentHasLeadingComment)
  ) {
    parts.push(" ");
    parts.push("=");
    parts.push(line);
    parts.push(assignmentDocs);
    resultDoc = groupIndentConcat(parts);
  } else if (assignmentDocs) {
    parts.push(" ");
    parts.push("=");
    parts.push(" ");
    parts.push(assignmentDocs);
    resultDoc = groupConcat(parts);
  } else {
    resultDoc = groupConcat(parts);
  }
  return resultDoc;
}

function handleNewStandard(path: AstPath, print: PrintFn): Doc {
  const paramDocs: Doc[] = handleInputParameters(path, print);
  const parts: Doc[] = [];
  // Type
  parts.push(path.call(print, "type"));
  // Params
  parts.push("(");
  if (paramDocs.length > 0) {
    parts.push(softline);
    parts.push(join([",", line], paramDocs));
    parts.push(dedent(softline));
  }
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNewKeyValue(path: AstPath, print: PrintFn): Doc {
  const keyValueDocs: Doc[] = path.map(print, "keyValues");

  const parts: Doc[] = [];
  parts.push(path.call(print, "type"));
  parts.push("(");
  if (keyValueDocs.length > 0) {
    parts.push(softline);
    parts.push(join([",", line], keyValueDocs));
    parts.push(dedent(softline));
  }
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNameValueParameter(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();

  const parts: Doc[] = [];
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  if (isBinaryish(node.value)) {
    // Binaryish expressions require their parents to the indentation level,
    // instead of setting it themselves like other expressions.
    parts.push(group(indent(path.call(print, "value"))));
  } else {
    parts.push(path.call(print, "value"));
  }
  return parts;
}

function handleThisMethodCallExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("this");
  parts.push("(");
  parts.push(softline);
  const paramDocs: Doc[] = handleInputParameters(path, print);
  parts.push(join([",", line], paramDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleSuperMethodCallExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("super");
  parts.push("(");
  parts.push(softline);
  const paramDocs: Doc[] = handleInputParameters(path, print);
  parts.push(join([",", line], paramDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleMethodCallExpression(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const parentNode = path.getParentNode();
  const nodeName = path.getName();
  const { dottedExpr } = node;
  const isParentDottedExpression = checkIfParentIsDottedExpression(path);
  const isDottedExpressionSoqlExpression =
    dottedExpr &&
    dottedExpr.value &&
    (dottedExpr.value["@class"] === APEX_TYPES.SOQL_EXPRESSION ||
      (dottedExpr.value["@class"] === APEX_TYPES.ARRAY_EXPRESSION &&
        dottedExpr.value.expr &&
        dottedExpr.value.expr["@class"] === APEX_TYPES.SOQL_EXPRESSION));
  const isDottedExpressionThisVariableExpression =
    dottedExpr &&
    dottedExpr.value &&
    dottedExpr.value["@class"] === APEX_TYPES.THIS_VARIABLE_EXPRESSION;
  const isDottedExpressionSuperVariableExpression =
    dottedExpr &&
    dottedExpr.value &&
    dottedExpr.value["@class"] === APEX_TYPES.SUPER_VARIABLE_EXPRESSION;

  const dottedExpressionDoc = handleDottedExpression(path, print);
  const nameDocs: Doc[] = path.map(print, "names");
  const paramDocs: Doc[] = handleInputParameters(path, print);

  const resultParamDoc =
    paramDocs.length > 0
      ? [softline, join([",", line], paramDocs), dedent(softline)]
      : "";

  const methodCallChainDoc = join(".", nameDocs);

  // Handling the array expression index.
  // Technically, in this statement: a()[b],
  // the method call expression is a child of the array expression.
  // However, for certain situation we need to print the [] part as part of
  // the group from the method call expression. For example:
  // a
  //   .b
  //   .c()[
  //     d.callMethod()
  //   ]
  // If we print the [] as part of the array expression, like we usually do,
  // the result will be:
  // a
  //   .b
  //   .c()[
  //   d.callMethod()
  // ]
  // Hence why we are deferring the printing of the [] part from handleArrayExpression
  // to here.
  let arrayIndexDoc: Doc = "";
  if (
    parentNode["@class"] === APEX_TYPES.ARRAY_EXPRESSION &&
    nodeName === "expr"
  ) {
    path.callParent((innerPath: AstPath) => {
      const withGroup = isParentDottedExpression || !!dottedExpressionDoc;

      arrayIndexDoc = handleArrayExpressionIndex(innerPath, print, withGroup);
    });
  }
  let resultDoc;
  const noGroup =
    // If this is a nested dotted expression, we do not want to group it,
    // since we want it to be part of the method call chain group, e.g:
    // a
    //   .b()  // <- this node here
    //   .c()  // <- this node here
    //   .d()
    isParentDottedExpression ||
    // If dotted expression is SOQL and this in inside a binaryish expression,
    // we shouldn't group it, otherwise there will be extraneous indentations,
    // for example:
    // Boolean a =
    //   [
    //     SELECT Id FROM Contact
    //   ].size() > 0
    (isDottedExpressionSoqlExpression && isBinaryish(parentNode)) ||
    // If dotted expression is a `super` or `this` variable expression, we
    // know that this is only one level deep and there's no need to group, e.g:
    // `this.simpleMethod();` or `super.simpleMethod();`
    isDottedExpressionThisVariableExpression ||
    isDottedExpressionSuperVariableExpression;
  if (noGroup) {
    resultDoc = [
      dottedExpressionDoc,
      methodCallChainDoc,
      "(",
      group(indent(resultParamDoc)),
      ")",
      arrayIndexDoc,
    ];
  } else {
    // This means it is the highest level method call expression,
    // and we do need to group and indent the expressions in it, e.g:
    // a
    //   .b()
    //   .c()
    //   .d()  // <- this node here
    resultDoc = group(
      indent([
        dottedExpressionDoc,
        // If there is no dottedExpr, we should group the method call chain
        // to have this effect:
        // a.callMethod(  // <- 2 names (a and callMethod)
        //   'a',
        //   'b'
        // )
        // Otherwise we don't want to group them, so that they're part of the
        // parent group. It will format this code:
        // a.b().c().callMethod('a', 'b') // <- 4 names (a, b, c, callMethod)
        // into this:
        // a.b()
        //   .c()
        //   .callMethod('a', 'b')
        dottedExpressionDoc ? methodCallChainDoc : group(methodCallChainDoc),
        "(",
        dottedExpressionDoc
          ? group(indent(resultParamDoc))
          : group(resultParamDoc),
        ")",
        arrayIndexDoc,
      ]),
    );
  }
  return resultDoc;
}

function handleJavaMethodCallExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  parts.push("(");
  parts.push(softline);
  parts.push(join([",", line], handleInputParameters(path, print)));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNestedExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  return parts;
}

function handleNewSetInit(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  const expressionDoc: Doc = path.call(print, "expr", "value");

  // Type
  parts.push("Set");
  parts.push("<");
  parts.push(join([",", " "], path.map(print, "types")));
  parts.push(">");
  // Param
  parts.push("(");
  pushIfExist(parts, expressionDoc, [dedent(softline)], [softline]);
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNewSetLiteral(path: AstPath, print: PrintFn): Doc {
  const valueDocs: Doc[] = path.map(print, "values");

  const parts: Doc[] = [];
  // Type
  parts.push("Set");
  parts.push("<");
  parts.push(join([",", " "], path.map(print, "types")));
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(line);
    parts.push(join([",", line], valueDocs));
    parts.push(dedent(line));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleNewListInit(path: AstPath, print: PrintFn): Doc {
  // We can declare lists in the following ways:
  // new Object[size];
  // new Object[] { value, ... };
  // new List<Object>(); // Provides AST consistency.
  // new List<Object>(size);

  // #262 - We use Object[size] if a literal number is provided.
  // We use List<Object>(param) otherwise.
  // This should provide compatibility for all known types without knowing
  // if the parameter is a variable (copy constructor) or literal size.
  const node = path.getNode();
  const expressionDoc: Doc = path.call(print, "expr", "value");
  const parts: Doc[] = [];
  const typeParts = path.map(print, "types");
  const hasLiteralNumberInitializer =
    typeParts.length &&
    typeParts[0] !== undefined &&
    typeof typeParts[0] !== "string" &&
    "length" in typeParts[0] &&
    typeParts[0].length < 4 &&
    node.expr?.value?.type?.$ === "INTEGER";

  // Type
  if (!hasLiteralNumberInitializer) {
    parts.push("List<");
  }
  parts.push(join(".", typeParts));
  if (!hasLiteralNumberInitializer) {
    parts.push(">");
  }
  // Param
  parts.push(hasLiteralNumberInitializer ? "[" : "(");
  pushIfExist(parts, expressionDoc, [dedent(softline)], [softline]);
  parts.push(hasLiteralNumberInitializer ? "]" : ")");
  return groupIndentConcat(parts);
}

function handleNewMapInit(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  const expressionDoc: Doc = path.call(print, "expr", "value");

  parts.push("Map");
  // Type
  parts.push("<");
  const typeDocs: Doc[] = path.map(print, "types");
  parts.push(join(", ", typeDocs));
  parts.push(">");
  parts.push("(");
  pushIfExist(parts, expressionDoc, [dedent(softline)], [softline]);
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNewMapLiteral(path: AstPath, print: PrintFn): Doc {
  const valueDocs: Doc[] = path.map(print, "pairs");

  const parts: Doc[] = [];
  // Type
  parts.push("Map");
  parts.push("<");
  parts.push(join(", ", path.map(print, "types")));
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(line);
    parts.push(join([",", line], valueDocs));
    parts.push(dedent(line));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleMapLiteralKeyValue(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "key"));
  parts.push(" ");
  parts.push("=>");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleNewListLiteral(path: AstPath, print: PrintFn): Doc {
  const valueDocs: Doc[] = path.map(print, "values");

  const parts: Doc[] = [];
  // Type
  parts.push("List<");
  parts.push(join(".", path.map(print, "types")));
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(line);
    parts.push(join([",", line], valueDocs));
    parts.push(dedent(line));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleNewExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("new");
  parts.push(" ");
  parts.push(path.call(print, "creator"));
  return parts;
}

function handleIfElseBlock(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const parts: Doc[] = [];
  const ifBlockDocs: Doc[] = path.map(print, "ifBlocks");
  const elseBlockDoc: Doc = path.call(print, "elseBlock", "value");
  // There are differences when we handle block vs expression statements in
  // if bodies and else body. For expression statement, we need to add a
  // hardline after a statement vs a space for block statement. For example:
  // if (a)
  //   b = 1;
  // else if (c) {
  //   b = 2;
  // }
  const ifBlockContainsBlockStatement: boolean[] = node.ifBlocks.map(
    (ifBlock: jorje.IfBlock) =>
      ifBlock.stmnt["@class"] === APEX_TYPES.BLOCK_STATEMENT,
  );
  const ifBlockContainsLeadingOwnLineComments: boolean[] = node.ifBlocks.map(
    (ifBlock: jorje.IfBlock & { comments?: AnnotatedComment[] }) =>
      ifBlock.comments?.some(
        (comment) => comment.leading && comment.placement === "ownLine",
      ),
  );
  const ifBlockContainsTrailingComments: boolean[] = node.ifBlocks.map(
    (ifBlock: jorje.IfBlock & { comments?: AnnotatedComment[] }) =>
      ifBlock.comments?.some((comment) => comment.trailing),
  );

  let lastIfBlockHardLineInserted = false;
  ifBlockDocs.forEach((ifBlockDoc: Doc, index: number) => {
    if (index > 0) {
      const shouldAddHardLineBeforeElseIf =
        !ifBlockContainsBlockStatement[index - 1] ||
        ifBlockContainsLeadingOwnLineComments[index] ||
        ifBlockContainsTrailingComments[index - 1];
      if (shouldAddHardLineBeforeElseIf) {
        parts.push(hardline);
      } else {
        parts.push(" ");
      }
    }
    parts.push(ifBlockDoc);
    // We also need to handle the last if block, since it might need to add
    // either a space or a hardline before the else block
    if (index === ifBlockDocs.length - 1 && elseBlockDoc) {
      if (ifBlockContainsBlockStatement[index]) {
        parts.push(" ");
      } else {
        parts.push(hardline);
        lastIfBlockHardLineInserted = true;
      }
    }
  });
  if (elseBlockDoc) {
    const elseBlockContainsLeadingOwnLineComments =
      node.elseBlock?.value?.comments?.some(
        (comment: AnnotatedComment) =>
          comment.leading && comment.placement === "ownLine",
      );
    const lastIfBlockContainsTrailingComments =
      ifBlockContainsTrailingComments[
        ifBlockContainsTrailingComments.length - 1
      ];
    const shouldAddHardLineBeforeElse =
      !lastIfBlockHardLineInserted &&
      (elseBlockContainsLeadingOwnLineComments ||
        lastIfBlockContainsTrailingComments);
    if (shouldAddHardLineBeforeElse) {
      parts.push(hardline);
    }
    parts.push(elseBlockDoc);
  }
  return groupConcat(parts);
}

function handleIfBlock(path: AstPath, print: PrintFn): Doc {
  const node: EnrichedIfBlock = path.getNode();
  const statementType: Doc = path.call(print, "stmnt", "@class");
  const statementDoc: Doc = path.call(print, "stmnt");

  const parts: Doc[] = [];
  const conditionParts = [];
  if (node.ifBlockIndex > 0) {
    parts.push("else");
    parts.push(" ");
  }
  parts.push("if");
  parts.push(" ");
  // Condition expression
  conditionParts.push("(");
  conditionParts.push(softline);
  conditionParts.push(path.call(print, "expr"));
  conditionParts.push(dedent(softline));
  conditionParts.push(")");
  parts.push(groupIndentConcat(conditionParts));
  // Body block
  if (statementType === APEX_TYPES.BLOCK_STATEMENT) {
    parts.push(" ");
    pushIfExist(parts, statementDoc);
  } else {
    pushIfExist(parts, group(indent([hardline, statementDoc])));
  }
  return parts;
}

function handleElseBlock(path: AstPath, print: PrintFn): Doc {
  const statementType: Doc = path.call(print, "stmnt", "@class");
  const statementDoc: Doc = path.call(print, "stmnt");

  const parts: Doc[] = [];
  parts.push("else");
  // Body block
  if (statementType === APEX_TYPES.BLOCK_STATEMENT) {
    parts.push(" ");
    pushIfExist(parts, statementDoc);
  } else {
    pushIfExist(parts, group(indent([hardline, statementDoc])));
  }
  return parts;
}

function handleTernaryExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "condition"));

  parts.push(line);
  parts.push("?");
  parts.push(" ");
  // Here we align the true and false expressions by 2 characters,
  // because the ? and : characters already take up some space,
  // and without adding the alignment, it is difficult to tell
  // the correct nesting level, for example:
  // a == 1
  //   ? someVariable
  //     .callMethod()
  //   : anotherVariable
  //     .anotherMethod()
  // Instead, formatting this way makes it easier to read:
  // a == 1
  //   ? someVariable
  //       .callMethod()
  //   : anotherVariable
  //       .anotherMethod()
  parts.push(group(align(2, path.call(print, "trueExpr"))));
  parts.push(line);
  parts.push(":");
  parts.push(" ");
  parts.push(group(align(2, path.call(print, "falseExpr"))));
  return groupIndentConcat(parts);
}

function handleInstanceOfExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push("instanceof");
  parts.push(" ");
  parts.push(path.call(print, "type"));
  return parts;
}

function handlePackageVersionExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("Package.Version.");
  parts.push(path.call(print, "version"));
  return parts;
}

function handleStructuredVersion(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "major"));
  parts.push(".");
  parts.push(path.call(print, "minor"));
  return parts;
}

function handleArrayExpression(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const parts: Doc[] = [];
  const expressionDoc: Doc = path.call(print, "expr");
  // In certain situations we need to defer printing the [] part to be part of
  // the `expr` printing. Take a look at handleVariableExpression or
  // handleMethodCallExpression for example.
  if (
    node.expr &&
    (node.expr["@class"] === APEX_TYPES.VARIABLE_EXPRESSION ||
      node.expr["@class"] === APEX_TYPES.METHOD_CALL_EXPRESSION)
  ) {
    return expressionDoc;
  }
  // For the rest of the situations we can safely print the [index] as part
  // of the array expression group.
  parts.push(expressionDoc);
  parts.push(handleArrayExpressionIndex(path, print, /* withGroup */ true));
  return groupConcat(parts);
}

function handleCastExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("(");
  parts.push(path.call(print, "type"));
  parts.push(")");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return parts;
}

function handleNullCoalescingExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "left"));
  parts.push(" ");
  parts.push("??");
  parts.push(groupIndentConcat([line, path.call(print, "right")]));
  return parts;
}

function handleExpressionStatement(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(";");
  return parts;
}

// SOSL
function handleSoslExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "search"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleFindClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(indentConcat(["FIND", line, path.call(print, "search")]));
  return groupConcat(parts);
}

function handleFindValue(
  childClass: string,
  path: AstPath,
  print: PrintFn,
): Doc {
  let doc: Doc;
  switch (childClass as jorje.FindValue["@class"]) {
    case APEX_TYPES.FIND_VALUE_STRING:
      doc = ["'", path.call(print, "value"), "'"];
      break;
    case APEX_TYPES.FIND_VALUE_EXPRESSION:
      doc = path.call(print, "expr");
      break;
  }
  return doc;
}

function handleInClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("IN");
  parts.push(" ");
  parts.push((path.call(print, "scope") as string).toUpperCase());
  parts.push(" ");
  parts.push("FIELDS");
  return parts;
}

function handleDivisionClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("WITH DIVISION = ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleDivisionValue(
  childClass: string,
  path: AstPath,
  print: PrintFn,
): Doc {
  let doc: Doc;
  switch (childClass as jorje.DivisionValue["@class"]) {
    case APEX_TYPES.DIVISION_VALUE_LITERAL:
      doc = ["'", path.call(print, "literal"), "'"];
      break;
    case APEX_TYPES.DIVISION_VALUE_EXPRESSION:
      doc = path.call(print, "expr");
      break;
  }
  return doc;
}

function handleSearchWithClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("WITH");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(path.call(print, "value", "value"));
  return parts;
}

function handleSearchWithClauseValue(
  childClass: string,
  path: AstPath,
  print: PrintFn,
): Doc {
  const parts: Doc[] = [];
  let valueDocs: Doc[];
  switch (childClass as jorje.SearchWithClauseValue["@class"]) {
    case APEX_TYPES.SEARCH_WITH_CLAUSE_VALUE_STRING:
      valueDocs = path.map(print, "values");
      if (valueDocs.length === 1 && valueDocs[0] !== undefined) {
        parts.push(" = ");
        parts.push(valueDocs[0]);
      } else {
        parts.push(" IN ");
        parts.push("(");
        parts.push(softline);
        parts.push(join([",", line], valueDocs));
        parts.push(dedent(softline));
        parts.push(")");
      }
      break;
    case APEX_TYPES.SEARCH_WITH_CLAUSE_VALUE_TARGET:
      parts.push("(");
      parts.push(path.call(print, "target"));
      parts.push(" = ");
      parts.push(path.call(print, "value"));
      parts.push(")");
      break;
    case APEX_TYPES.SEARCH_WITH_CLAUSE_VALUE_TRUE:
      parts.push(" = ");
      parts.push("true");
      break;
    case APEX_TYPES.SEARCH_WITH_CLAUSE_VALUE_FALSE:
      parts.push(" = ");
      parts.push("false");
      break;
  }
  return groupIndentConcat(parts);
}

function handleReturningClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(
    indentConcat([
      "RETURNING",
      line,
      join([",", line], path.map(print, "exprs")),
    ]),
  );
  return groupConcat(parts);
}

function handleReturningExpression(path: AstPath, print: PrintFn): Doc {
  const selectDoc: Doc = path.call(print, "select", "value");

  const parts: Doc[] = [];
  parts.push(path.call(print, "name"));
  if (selectDoc) {
    parts.push("(");
    parts.push(path.call(print, "select", "value"));
    parts.push(")");
  }
  return groupConcat(parts);
}

function handleReturningSelectExpression(path: AstPath, print: PrintFn): Doc {
  const fieldDocs: Doc[] = path.map(print, "fields");

  const parts: Doc[] = [];
  parts.push(join([",", line], fieldDocs));

  pushIfExist(parts, path.call(print, "where", "value"));
  pushIfExist(parts, path.call(print, "using", "value"));
  pushIfExist(parts, path.call(print, "orderBy", "value"));
  pushIfExist(parts, path.call(print, "limit", "value"));
  pushIfExist(parts, path.call(print, "offset", "value"));
  pushIfExist(parts, path.call(print, "bind", "value"));
  return groupIndentConcat([softline, join(line, parts)]);
}

function handleSearch(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const withDocs: Doc[] = path.map(print, "withs");

  const parts: Doc[] = [];
  parts.push(path.call(print, "find"));
  pushIfExist(parts, path.call(print, "in", "value"));
  pushIfExist(parts, path.call(print, "returning", "value"));
  pushIfExist(parts, path.call(print, "division", "value"));
  pushIfExist(parts, path.call(print, "dataCategory", "value"));
  pushIfExist(parts, path.call(print, "limit", "value"));
  pushIfExist(parts, path.call(print, "updateStats", "value"));
  pushIfExist(parts, path.call(print, "using", "value"));
  if (withDocs.length > 0) {
    parts.push(join(line, withDocs));
  }

  return join(node.forcedHardline ? hardline : line, parts);
}

// SOQL
function handleSoqlExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "query"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleSelectInnerQuery(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("(");
  parts.push(softline);
  parts.push(path.call(print, "query"));
  parts.push(dedent(softline));
  parts.push(")");
  const aliasDoc: Doc = path.call(print, "alias", "value");
  pushIfExist(parts, aliasDoc, null, [" "]);

  return groupIndentConcat(parts);
}

function handleWhereInnerExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("(");
  parts.push(softline);
  parts.push(path.call(print, "inner"));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleQuery(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const withIdentifierDocs: Doc[] = path.map(print, "withIdentifiers");
  const parts: Doc[] = [];
  parts.push(path.call(print, "select"));
  parts.push(path.call(print, "from"));
  pushIfExist(parts, path.call(print, "where", "value"));
  pushIfExist(parts, path.call(print, "with", "value"));
  if (withIdentifierDocs.length > 0) {
    parts.push(join(" ", withIdentifierDocs));
  }
  pushIfExist(parts, path.call(print, "groupBy", "value"));
  pushIfExist(parts, path.call(print, "orderBy", "value"));
  pushIfExist(parts, path.call(print, "limit", "value"));
  pushIfExist(parts, path.call(print, "offset", "value"));
  pushIfExist(parts, path.call(print, "bind", "value"));
  pushIfExist(parts, path.call(print, "tracking", "value"));
  pushIfExist(parts, path.call(print, "updateStats", "value"));
  pushIfExist(parts, path.call(print, "options", "value"));
  return join(node.forcedHardline ? hardline : line, parts);
}

function handleBindClause(path: AstPath, print: PrintFn): Doc {
  const expressionDocs: Doc[] = path.map(print, "exprs");
  const parts: Doc[] = [];
  parts.push("BIND");
  parts.push(" ");
  parts.push(join(", ", expressionDocs));
  return parts;
}

function handleBindExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleCaseExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  const whenBranchDocs: Doc[] = path.map(print, "whenBranches");
  const elseBranchDoc: Doc = path.call(print, "elseBranch", "value");
  parts.push("TYPEOF");
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(hardline);
  parts.push(join(line, whenBranchDocs));
  if (elseBranchDoc) {
    parts.push(line);
    parts.push(elseBranchDoc);
  }
  parts.push(dedent(softline));
  parts.push("END");
  return groupIndentConcat(parts);
}

function handleWhenExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("WHEN");
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("THEN");
  parts.push(line);
  const identifierDocs: Doc[] = path.map(print, "identifiers");
  parts.push(join([",", line], identifierDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleElseExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("ELSE");
  parts.push(" ");
  const identifierDocs: Doc[] = path.map(print, "identifiers");
  parts.push(join([",", line], identifierDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleColumnClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(
    indentConcat(["SELECT", line, join([",", line], path.map(print, "exprs"))]),
  );
  return groupConcat(parts);
}

function handleColumnExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  pushIfExist(parts, path.call(print, "alias", "value"), null, [" "]);
  return groupConcat(parts);
}

function handleFieldIdentifier(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  const entity: Doc = path.call(print, "entity", "value");
  if (entity) {
    parts.push(entity);
    parts.push(".");
  }
  parts.push(path.call(print, "field"));
  return parts;
}

function handleField(path: AstPath, print: PrintFn): Doc {
  const functionOneDoc: Doc = path.call(print, "function1", "value");
  const functionTwoDoc: Doc = path.call(print, "function2", "value");
  const fieldDoc = path.call(print, "field");

  if (functionOneDoc && functionTwoDoc) {
    return [
      functionOneDoc,
      "(",
      groupIndentConcat([
        softline,
        functionTwoDoc,
        "(",
        groupIndentConcat([softline, fieldDoc, dedent(softline)]),
        ")",
        dedent(softline),
      ]),
      ")",
    ];
  }
  if (functionOneDoc && !functionTwoDoc) {
    return [
      functionOneDoc,
      "(",
      groupIndentConcat([softline, fieldDoc, dedent(softline)]),
      ")",
    ];
  }
  return fieldDoc;
}

function handleFromClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(
    indentConcat(["FROM", line, join(", ", path.map(print, "exprs"))]),
  );
  return groupConcat(parts);
}

function handleFromExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "table"));
  pushIfExist(parts, path.call(print, "alias", "value"), null, [" "]);
  pushIfExist(
    parts,
    path.call(print, "using", "value"),
    [dedent(softline)],
    [line],
  );
  return groupIndentConcat(parts);
}

function handleWhereClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(indentConcat(["WHERE", line, path.call(print, "expr")]));
  return groupConcat(parts);
}

function handleSelectDistanceExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push(path.call(print, "alias", "value"));
  return groupConcat(parts);
}

function handleWhereDistanceExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "distance"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleDistanceFunctionExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  const distanceDocs: Doc[] = [];
  parts.push("DISTANCE");
  parts.push("(");
  parts.push(softline);
  distanceDocs.push(path.call(print, "field"));
  distanceDocs.push(path.call(print, "location"));
  distanceDocs.push(`'${path.call(print, "unit")}'`);
  parts.push(join([",", line], distanceDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleGeolocationLiteral(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  const childParts: Doc[] = [];
  parts.push("GEOLOCATION");
  parts.push("(");
  childParts.push(path.call(print, "latitude"));
  childParts.push(path.call(print, "longitude"));
  parts.push(join([",", line], childParts));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleWithValue(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("WITH");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return parts;
}

function handleWithDataCategories(path: AstPath, print: PrintFn): Doc {
  const categoryDocs: Doc[] = path.map(print, "categories");

  // Only AND logical operator is supported
  // https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_with_datacategory.htm
  return groupIndentConcat([
    "WITH DATA CATEGORY",
    line,
    join([line, "AND", " "], categoryDocs),
  ]);
}

function handleDataCategory(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  let categoryDocs: Doc[] = path.map(print, "categories");
  categoryDocs = categoryDocs.filter((doc: Doc) => doc);
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  if (categoryDocs.length > 1) {
    parts.push("(");
  }
  parts.push(softline);
  parts.push(join([",", line], categoryDocs));
  parts.push(dedent(softline));
  if (categoryDocs.length > 1) {
    parts.push(")");
  }
  return groupIndentConcat(parts);
}

function handleDataCategoryOperator(childClass: string): Doc {
  return DATA_CATEGORY[childClass as jorje.DataCategoryOperator["@class"]];
}

function handleWhereCalcExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field1"));
  parts.push(" ");
  parts.push(path.call(print, "calc"));
  parts.push(" ");
  parts.push(path.call(print, "field2"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleWhereOperationExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleWhereOperationExpressions(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("(");
  parts.push(
    indentConcat([
      softline,
      join([",", line], path.map(print, "expr")),
      dedent(softline),
    ]),
  );
  parts.push(")");
  return groupConcat(parts);
}

function handleWhereQueryLiteral(
  childClass: string,
  path: AstPath,
  print: PrintFn,
  options: any,
): Doc {
  const node = path.getNode();

  let doc: Doc;
  switch (childClass as jorje.QueryLiteral["@class"]) {
    case APEX_TYPES.QUERY_LITERAL_STRING:
      doc = ["'", node.literal, "'"];
      break;
    case APEX_TYPES.QUERY_LITERAL_NULL:
      doc = "NULL";
      break;
    case APEX_TYPES.QUERY_LITERAL_TRUE:
      doc = "TRUE";
      break;
    case APEX_TYPES.QUERY_LITERAL_FALSE:
      doc = "FALSE";
      break;
    case APEX_TYPES.QUERY_LITERAL_NUMBER:
      doc = path.call(print, "literal", "$");
      break;
    case APEX_TYPES.QUERY_LITERAL_DATE_TIME:
    case APEX_TYPES.QUERY_LITERAL_TIME:
      doc = options.originalText.slice(node.loc.startIndex, node.loc.endIndex);
      break;
    case APEX_TYPES.QUERY_LITERAL_DATE_FORMULA:
      doc = path.call(print, "dateFormula");
      break;
    case APEX_TYPES.QUERY_LITERAL_DATE:
    case APEX_TYPES.QUERY_LITERAL_MULTI_CURRENCY:
      doc = path.call(print, "literal");
      break;
  }
  if (doc) {
    return doc;
  }
  /* v8 ignore next 1 */
  return "";
}

function handleWhereCompoundExpression(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const parentNode = path.getParentNode();
  const isNestedExpression =
    parentNode["@class"] === APEX_TYPES.WHERE_COMPOUND_EXPRESSION ||
    parentNode["@class"] === APEX_TYPES.WHERE_UNARY_EXPRESSION;
  const nodeOp = node.op["@class"];
  const isSamePrecedenceWithParent =
    parentNode.op && nodeOp === parentNode.op["@class"];

  const parts: Doc[] = [];

  if (isNestedExpression && !isSamePrecedenceWithParent) {
    parts.push("(");
  }
  const operatorDoc: Doc = path.call(print, "op");
  const expressionDocs: Doc[] = path.map(print, "expr");
  parts.push(join([line, operatorDoc, " "], expressionDocs));
  if (isNestedExpression && !isSamePrecedenceWithParent) {
    parts.push(")");
  }
  return parts;
}

function handleWhereUnaryExpression(path: AstPath, print: PrintFn): Doc {
  const parentNode = path.getParentNode();
  const isNestedExpression =
    parentNode["@class"] === APEX_TYPES.WHERE_COMPOUND_EXPRESSION ||
    parentNode["@class"] === APEX_TYPES.WHERE_UNARY_EXPRESSION;
  const parts: Doc[] = [];
  if (isNestedExpression) {
    parts.push("(");
  }
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  if (isNestedExpression) {
    parts.push(")");
  }
  return parts;
}

function handleColonExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(":");
  parts.push(path.call(print, "expr"));
  return parts;
}

function handleOrderByClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("ORDER BY");
  parts.push(indentConcat([line, join([",", line], path.map(print, "exprs"))]));
  return groupConcat(parts);
}

function handleOrderByExpression(
  childClass: string,
  path: AstPath,
  print: PrintFn,
): Doc {
  const parts: Doc[] = [];
  let expressionField;
  switch (childClass as jorje.OrderByExpr["@class"]) {
    case APEX_TYPES.ORDER_BY_EXPRESSION_DISTANCE:
      expressionField = "distance";
      break;
    case APEX_TYPES.ORDER_BY_EXPRESSION_VALUE:
      expressionField = "field";
      break;
  }
  parts.push(path.call(print, expressionField));

  const orderDoc: Doc = path.call(print, "order");
  if (orderDoc) {
    parts.push(" ");
    parts.push(orderDoc);
  }
  const nullOrderDoc: Doc = path.call(print, "nullOrder");
  if (nullOrderDoc) {
    parts.push(" ");
    parts.push(nullOrderDoc);
  }
  return parts;
}

function handleOrderOperation(
  childClass: string,
  path: AstPath,
  _print: PrintFn,
  opts: prettier.ParserOptions,
): Doc {
  const loc = opts.locStart(path.getNode());
  if (loc) {
    return ORDER[childClass as jorje.Order["@class"]];
  }
  return "";
}

function handleNullOrderOperation(
  childClass: string,
  path: AstPath,
  _print: PrintFn,
  opts: prettier.ParserOptions,
): Doc {
  const loc = opts.locStart(path.getNode());
  if (loc) {
    return ORDER_NULL[childClass as jorje.OrderNull["@class"]];
  }
  return "";
}

function handleGroupByClause(path: AstPath, print: PrintFn): Doc {
  const expressionDocs: Doc[] = path.map(print, "exprs");
  const typeDoc: Doc = path.call(print, "type", "value");
  const havingDoc: Doc = path.call(print, "having", "value");

  const parts: Doc[] = [];
  parts.push("GROUP BY");
  if (typeDoc) {
    parts.push(" ");
    parts.push(typeDoc);
    parts.push("(");
    parts.push(softline);
  } else {
    parts.push(line);
  }
  parts.push(join([",", line], expressionDocs));
  if (typeDoc) {
    parts.push(dedent(softline));
    parts.push(")");
  }
  // #286 - HAVING is part of the GROUP BY node, however we want them to behave
  // like part a query node, because it makes sense to have it on the same
  // indentation as the GROUP BY node.
  if (havingDoc) {
    return [groupIndentConcat(parts), line, group(havingDoc)];
  }
  return groupIndentConcat(parts);
}

function handleGroupByType(childClass: string): Doc {
  let doc;
  switch (childClass as jorje.GroupByType["@class"]) {
    case APEX_TYPES.GROUP_BY_TYPE_ROLL_UP:
      doc = "ROLLUP";
      break;
    case APEX_TYPES.GROUP_BY_TYPE_CUBE:
      doc = "CUBE";
      break;
  }
  return doc;
}

function handleHavingClause(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push("HAVING");
  parts.push(line);
  parts.push(path.call(print, "expr"));
  return groupIndentConcat(parts);
}

function handleQueryUsingClause(path: AstPath, print: PrintFn): Doc {
  const expressionDocs: Doc[] = path.map(print, "exprs");
  const parts: Doc[] = [];
  parts.push("USING");
  parts.push(line);
  parts.push(join([",", line], expressionDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleUsingExpression(
  childClass: string,
  path: AstPath,
  print: PrintFn,
): Doc {
  let doc;
  switch (childClass as jorje.UsingExpr["@class"]) {
    case APEX_TYPES.USING_EXPRESSION_USING:
      doc = [
        path.call(print, "name", "value"),
        " ",
        path.call(print, "field", "value"),
      ];
      break;
    case APEX_TYPES.USING_EXPRESSION_USING_EQUALS:
      doc = [
        path.call(print, "name", "value"),
        " = ",
        path.call(print, "field", "value"),
      ];
      break;
    case APEX_TYPES.USING_EXPRESSION_USING_ID:
      doc = [
        path.call(print, "name"),
        "(",
        path.call(print, "id"),
        " = ",
        path.call(print, "field"),
        ")",
      ];
      break;
  }
  return doc;
}

function handleTrackingType(childClass: string): Doc {
  let doc;
  switch (childClass as jorje.TrackingType["@class"]) {
    case APEX_TYPES.TRACKING_TYPE_FOR_VIEW:
      doc = "FOR VIEW";
      break;
    case APEX_TYPES.TRACKING_TYPE_FOR_REFERENCE:
      doc = "FOR REFERENCE";
      break;
  }
  return doc;
}

function handleQueryOption(childClass: string): Doc {
  let doc;
  switch (childClass as jorje.QueryOption["@class"]) {
    case APEX_TYPES.QUERY_OPTION_LOCK_ROWS:
      doc = "FOR UPDATE";
      break;
    case APEX_TYPES.QUERY_OPTION_INCLUDE_DELETED:
      doc = "ALL ROWS";
      break;
  }
  return doc;
}

function handleUpdateStatsClause(path: AstPath, print: PrintFn): Doc {
  const optionDocs: Doc[] = path.map(print, "options");
  const parts: Doc[] = [];
  parts.push("UPDATE");
  parts.push(line);
  parts.push(join([",", line], optionDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleUpdateStatsOption(childClass: string): Doc {
  let doc;
  switch (childClass as jorje.UpdateStatsOption["@class"]) {
    case APEX_TYPES.UPDATE_STATS_OPTION_TRACKING:
      doc = "TRACKING";
      break;
    case APEX_TYPES.UPDATE_STATS_OPTION_VIEW_STAT:
      doc = "VIEWSTAT";
      break;
  }
  return doc;
}

function handleUsingType(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "filter"));
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleModifier(childClass: string): Doc {
  /* v8 ignore start */
  if (!(childClass in MODIFIER)) {
    throw new Error(
      `Modifier ${childClass} is not supported. Please file a bug report.`,
    );
  }
  /* v8 ignore stop */
  const modifierValue = MODIFIER[childClass as jorje.Modifier["@class"]];
  return [modifierValue, " "];
}

function handlePostfixExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(path.call(print, "op"));
  return parts;
}

function handlePrefixExpression(path: AstPath, print: PrintFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "op"));
  parts.push(path.call(print, "expr"));
  return parts;
}

function handlePostfixOperator(path: AstPath): Doc {
  const node: jorje.PostfixExpr["op"] = path.getNode();
  return POSTFIX[node.$];
}

function handlePrefixOperator(path: AstPath): Doc {
  const node: jorje.PrefixExpr["op"] = path.getNode();
  return PREFIX[node.$];
}

function handleWhileLoop(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const conditionDoc: Doc = path.call(print, "condition");

  const parts: Doc[] = [];
  parts.push("while");
  parts.push(" ");
  parts.push("(");
  // Condition
  parts.push(groupIndentConcat([softline, conditionDoc, dedent(softline)]));
  parts.push(")");
  if (!node.stmnt.value) {
    parts.push(";");
    return parts;
  }
  // Body
  const statementDoc: Doc = path.call(print, "stmnt", "value");
  const statementType: Doc = path.call(print, "stmnt", "value", "@class");
  if (statementType === APEX_TYPES.BLOCK_STATEMENT) {
    parts.push(" ");
    pushIfExist(parts, statementDoc);
  } else {
    pushIfExist(parts, group(indent([hardline, statementDoc])));
  }
  return parts;
}

function handleDoLoop(path: AstPath, print: PrintFn): Doc {
  const statementDoc: Doc = path.call(print, "stmnt");
  const conditionDoc: Doc = path.call(print, "condition");

  const parts: Doc[] = [];
  parts.push("do");
  parts.push(" ");
  // Body
  pushIfExist(parts, statementDoc);
  parts.push(" ");
  parts.push("while");
  parts.push(" ");
  parts.push("(");
  // Condition
  parts.push(groupIndentConcat([softline, conditionDoc, dedent(softline)]));
  parts.push(")");
  parts.push(";");
  return parts;
}

function handleForLoop(path: AstPath, print: PrintFn): Doc {
  const node = path.getNode();
  const forControlDoc: Doc = path.call(print, "forControl");

  const parts: Doc[] = [];
  parts.push("for");
  parts.push(" ");
  parts.push("(");

  // For SOQL/SOSL query, we don't want to add unnecessary newlines before the
  // forControl doc, i.e. we don't want this:
  // ```
  // for (
  //   Contact c: [SELECT Id FROM Contact]
  // ) {
  // }
  // ```
  // Instead, we want this:
  // ```
  // for (Contact c: [SELECT Id FROM Contact]) {
  // }
  // ```
  const isQueryOrSearch =
    node.forControl?.init?.expr?.value["@class"] ===
      APEX_TYPES.SOQL_EXPRESSION ||
    node.forControl?.init?.expr?.value["@class"] === APEX_TYPES.SOSL_EXPRESSION;
  // #511 - For queries that the user opts in to manual breaks, we *don't* want
  // the leading newline either
  const hasForcedHardline =
    isQueryOrSearch &&
    (node.forControl?.init?.expr?.value?.query?.forcedHardline ||
      node.forControl?.init?.expr?.value?.search?.forcedHardline);

  // If there are own line comments in the forControl, we need to be conservative
  // and group the doc
  const hasOwnLineComments = node.forControl?.comments?.some(
    (comment: AnnotatedComment) => comment.placement === "ownLine",
  );
  if (
    isQueryOrSearch &&
    ((hasForcedHardline && !hasOwnLineComments) || !hasOwnLineComments)
  ) {
    parts.push(forControlDoc);
  } else {
    parts.push(groupIndentConcat([softline, forControlDoc, dedent(softline)]));
  }
  parts.push(")");
  if (!node.stmnt.value) {
    parts.push(";");
    return parts;
  }
  // Body
  const statementType: Doc = path.call(print, "stmnt", "value", "@class");
  const statementDoc: Doc = path.call(print, "stmnt", "value");
  if (statementType === APEX_TYPES.BLOCK_STATEMENT) {
    parts.push(" ");
    pushIfExist(parts, statementDoc);
  } else {
    pushIfExist(parts, group(indent([hardline, statementDoc])));
  }
  return parts;
}

function handleForEnhancedControl(path: AstPath, print: PrintFn): Doc {
  // See the note in handleForInit to see why we have to do this
  const initDocParts: Doc = path.call(print, "init");
  const initDoc = join([" ", ":", " "], initDocParts as Doc[]);

  const parts: Doc[] = [];
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(initDoc);
  return parts;
}

function handleForCStyleControl(path: AstPath, print: PrintFn): Doc {
  const initsDoc: Doc = path.call(print, "inits", "value");
  const conditionDoc: Doc = path.call(print, "condition", "value");
  const controlDoc: Doc = path.call(print, "control", "value");

  const parts: Doc[] = [];
  pushIfExist(parts, initsDoc);
  parts.push(";");
  pushIfExist(parts, conditionDoc, null, [line]);
  parts.push(";");
  pushIfExist(parts, controlDoc, null, [line]);
  return groupConcat(parts);
}

function handleForInits(path: AstPath, print: PrintFn): Doc {
  const typeDoc: Doc = path.call(print, "type", "value");
  const initDocsParts = path.map(print, "inits") as [Doc, Doc][];

  // See the note in handleForInit to see why we have to do this
  // In this situation:
  // for (Integer i; i < 4; i++) {}
  // the second element of initDocParts is null, and so we do not want to add the initialization in
  const initDocs = initDocsParts.map((initDocPart: [Doc, Doc]) =>
    initDocPart[1] ? join([" ", "=", " "], initDocPart) : initDocPart[0],
  );

  const parts: Doc[] = [];
  pushIfExist(parts, typeDoc, [" "]);
  parts.push(join([",", line], initDocs));
  return groupIndentConcat(parts);
}

function handleForInit(path: AstPath, print: PrintFn): Doc[] {
  // This is one of the weird cases that does not really match the way that we print things.
  // ForInit is used by both C style for loop and enhanced for loop, and there's no way to tell
  // which operator we should use for init in this context, for example:
  // for (Integer i = [SELECT COUNT() FROM Contact; i++; i < 10)
  // and
  // for (Contact a: [SELECT Id FROM Contact])
  // have very little differentiation from the POV of the ForInit handler.
  // Therefore, we'll return 2 docs here so the parent can decide what operator to insert between them.
  const nameDocs: Doc[] = path.map(print, "name");

  const parts: Doc[] = [];
  parts.push(join(".", nameDocs));
  parts.push(path.call(print, "expr", "value"));
  return parts;
}

type SingleNodeHandler = (
  path: AstPath,
  print: PrintFn,
  options: prettier.ParserOptions,
) => Doc;
type ChildNodeHandler = (
  childClass: string,
  path: AstPath,
  print: PrintFn,
  options: prettier.ParserOptions,
) => Doc;

const nodeHandler: { [key: string]: ChildNodeHandler | SingleNodeHandler } = {
  [APEX_TYPES.IF_ELSE_BLOCK]: handleIfElseBlock,
  [APEX_TYPES.IF_BLOCK]: handleIfBlock,
  [APEX_TYPES.ELSE_BLOCK]: handleElseBlock,
  [APEX_TYPES.EXPRESSION_STATEMENT]: handleExpressionStatement,
  [APEX_TYPES.RETURN_STATEMENT]: handleReturnStatement,
  [APEX_TYPES.TRIGGER_USAGE]: handleTriggerUsage,
  [APEX_TYPES.JAVA_TYPE_REF]: handleJavaTypeRef,
  [APEX_TYPES.CLASS_TYPE_REF]: handleClassTypeRef,
  [APEX_TYPES.ARRAY_TYPE_REF]: handleArrayTypeRef,
  [APEX_TYPES.LOCATION_IDENTIFIER]: handlePassthroughCall("value"),
  [APEX_TYPES.MODIFIER_PARAMETER_REF]: handleModifierParameterRef,
  [APEX_TYPES.EMPTY_MODIFIER_PARAMETER_REF]: handleEmptyModifierParameterRef,
  [APEX_TYPES.BLOCK_STATEMENT]: handleBlockStatement,
  [APEX_TYPES.VARIABLE_DECLARATION_STATEMENT]:
    handlePassthroughCall("variableDecls"),
  [APEX_TYPES.VARIABLE_DECLARATIONS]: handleVariableDeclarations,
  [APEX_TYPES.NAME_VALUE_PARAMETER]: handleNameValueParameter,
  [APEX_TYPES.ANNOTATION]: handleAnnotation,
  [APEX_TYPES.ANNOTATION_KEY_VALUE]: handleAnnotationKeyValue,
  [APEX_TYPES.ANNOTATION_VALUE]: handleAnnotationValue,
  [APEX_TYPES.ANNOTATION_STRING]: handleAnnotationString,
  [APEX_TYPES.MODIFIER]: handleModifier,
  [APEX_TYPES.RUN_AS_BLOCK]: handleRunAsBlock,
  [APEX_TYPES.DO_LOOP]: handleDoLoop,
  [APEX_TYPES.WHILE_LOOP]: handleWhileLoop,
  [APEX_TYPES.FOR_LOOP]: handleForLoop,
  [APEX_TYPES.FOR_C_STYLE_CONTROL]: handleForCStyleControl,
  [APEX_TYPES.FOR_ENHANCED_CONTROL]: handleForEnhancedControl,
  [APEX_TYPES.FOR_INITS]: handleForInits,
  [APEX_TYPES.FOR_INIT]: handleForInit,
  [APEX_TYPES.BREAK_STATEMENT]: () => "break;",
  [APEX_TYPES.CONTINUE_STATEMENT]: () => "continue;",
  [APEX_TYPES.THROW_STATEMENT]: (path: AstPath, print: PrintFn) => [
    "throw",
    " ",
    path.call(print, "expr"),
    ";",
  ],
  [APEX_TYPES.TRY_CATCH_FINALLY_BLOCK]: handleTryCatchFinallyBlock,
  [APEX_TYPES.CATCH_BLOCK]: handleCatchBlock,
  [APEX_TYPES.FINALLY_BLOCK]: handleFinallyBlock,
  [APEX_TYPES.STATEMENT]: handleStatement,
  [APEX_TYPES.DML_MERGE_STATEMENT]: handleDmlMergeStatement,
  [APEX_TYPES.SWITCH_STATEMENT]: handleSwitchStatement,
  [APEX_TYPES.VALUE_WHEN]: handleValueWhen,
  [APEX_TYPES.ELSE_WHEN]: handleElseWhen,
  [APEX_TYPES.TYPE_WHEN]: handleTypeWhen,
  [APEX_TYPES.ENUM_CASE]: handleEnumCase,
  [APEX_TYPES.LITERAL_CASE]: handlePassthroughCall("expr"),
  [APEX_TYPES.PROPERTY_DECLATION]: handlePropertyDeclaration,
  [APEX_TYPES.PROPERTY_GETTER]: handlePropertyGetterSetter("get"),
  [APEX_TYPES.PROPERTY_SETTER]: handlePropertyGetterSetter("set"),
  [APEX_TYPES.STRUCTURED_VERSION]: handleStructuredVersion,
  [APEX_TYPES.REQUEST_VERSION]: () => "Request",
  int: (path: AstPath, print: PrintFn) => path.call(print, "$"),
  string: (path: AstPath, print: PrintFn) => ["'", path.call(print, "$"), "'"],

  // Operator
  [APEX_TYPES.ASSIGNMENT_OPERATOR]: handleAssignmentOperation,
  [APEX_TYPES.BINARY_OPERATOR]: handleBinaryOperation,
  [APEX_TYPES.BOOLEAN_OPERATOR]: handleBooleanOperation,
  [APEX_TYPES.POSTFIX_OPERATOR]: handlePostfixOperator,
  [APEX_TYPES.PREFIX_OPERATOR]: handlePrefixOperator,

  // Declaration
  [APEX_TYPES.CLASS_DECLARATION]: handleClassDeclaration,
  [APEX_TYPES.INTERFACE_DECLARATION]: handleInterfaceDeclaration,
  [APEX_TYPES.METHOD_DECLARATION]: handleMethodDeclaration,
  [APEX_TYPES.VARIABLE_DECLARATION]: handleVariableDeclaration,
  [APEX_TYPES.ENUM_DECLARATION]: handleEnumDeclaration,

  // Compilation Unit: we're not handling InvalidDeclUnit
  [APEX_TYPES.TRIGGER_DECLARATION_UNIT]: handleTriggerDeclarationUnit,
  [APEX_TYPES.CLASS_DECLARATION_UNIT]: handlePassthroughCall("body"),
  [APEX_TYPES.ENUM_DECLARATION_UNIT]: handlePassthroughCall("body"),
  [APEX_TYPES.INTERFACE_DECLARATION_UNIT]: handlePassthroughCall("body"),
  [APEX_TYPES.ANONYMOUS_BLOCK_UNIT]: handleAnonymousBlockUnit,

  // Block Member
  [APEX_TYPES.PROPERTY_MEMBER]: handlePassthroughCall("propertyDecl"),
  [APEX_TYPES.FIELD_MEMBER]: handlePassthroughCall("variableDecls"),
  [APEX_TYPES.STATEMENT_BLOCK_MEMBER]: handleStatementBlockMember(),
  [APEX_TYPES.STATIC_STATEMENT_BLOCK_MEMBER]:
    handleStatementBlockMember("static"),
  [APEX_TYPES.METHOD_MEMBER]: handlePassthroughCall("methodDecl"),
  [APEX_TYPES.INNER_CLASS_MEMBER]: handlePassthroughCall("body"),
  [APEX_TYPES.INNER_ENUM_MEMBER]: handlePassthroughCall("body"),
  [APEX_TYPES.INNER_INTERFACE_MEMBER]: handlePassthroughCall("body"),

  // Expression
  [APEX_TYPES.TERNARY_EXPRESSION]: handleTernaryExpression,
  [APEX_TYPES.BOOLEAN_EXPRESSION]: handleBinaryishExpression,
  [APEX_TYPES.ASSIGNMENT_EXPRESSION]: handleAssignmentExpression,
  [APEX_TYPES.NESTED_EXPRESSION]: handleNestedExpression,
  [APEX_TYPES.VARIABLE_EXPRESSION]: handleVariableExpression,
  [APEX_TYPES.JAVA_VARIABLE_EXPRESSION]: handleJavaVariableExpression,
  [APEX_TYPES.LITERAL_EXPRESSION]: handleLiteralExpression,
  [APEX_TYPES.BINARY_EXPRESSION]: handleBinaryishExpression,
  [APEX_TYPES.TRIGGER_VARIABLE_EXPRESSION]: (path: AstPath, print: PrintFn) => [
    "Trigger",
    ".",
    path.call(print, "variable"),
  ],
  [APEX_TYPES.NEW_EXPRESSION]: handleNewExpression,
  [APEX_TYPES.METHOD_CALL_EXPRESSION]: handleMethodCallExpression,
  [APEX_TYPES.JAVA_METHOD_CALL_EXPRESSION]: handleJavaMethodCallExpression,
  [APEX_TYPES.THIS_VARIABLE_EXPRESSION]: () => "this",
  [APEX_TYPES.SUPER_VARIABLE_EXPRESSION]: () => "super",
  [APEX_TYPES.POSTFIX_EXPRESSION]: handlePostfixExpression,
  [APEX_TYPES.PREFIX_EXPRESSION]: handlePrefixExpression,
  [APEX_TYPES.CAST_EXPRESSION]: handleCastExpression,
  [APEX_TYPES.INSTANCE_OF_EXPRESSION]: handleInstanceOfExpression,
  [APEX_TYPES.PACKAGE_VERSION_EXPRESSION]: handlePackageVersionExpression,
  [APEX_TYPES.ARRAY_EXPRESSION]: handleArrayExpression,
  [APEX_TYPES.CLASS_REF_EXPRESSION]: (path: AstPath, print: PrintFn) => [
    path.call(print, "type"),
    ".",
    "class",
  ],
  [APEX_TYPES.THIS_METHOD_CALL_EXPRESSION]: handleThisMethodCallExpression,
  [APEX_TYPES.SUPER_METHOD_CALL_EXPRESSION]: handleSuperMethodCallExpression,
  [APEX_TYPES.SOQL_EXPRESSION]: handleSoqlExpression,
  [APEX_TYPES.SOSL_EXPRESSION]: handleSoslExpression,
  [APEX_TYPES.NULL_COALESCING_EXPRESSION]: handleNullCoalescingExpression,

  // New Object Init
  [APEX_TYPES.NEW_SET_INIT]: handleNewSetInit,
  [APEX_TYPES.NEW_SET_LITERAL]: handleNewSetLiteral,
  [APEX_TYPES.NEW_LIST_INIT]: handleNewListInit,
  [APEX_TYPES.NEW_MAP_INIT]: handleNewMapInit,
  [APEX_TYPES.NEW_MAP_LITERAL]: handleNewMapLiteral,
  [APEX_TYPES.MAP_LITERAL_KEY_VALUE]: handleMapLiteralKeyValue,
  [APEX_TYPES.NEW_LIST_LITERAL]: handleNewListLiteral,
  [APEX_TYPES.NEW_STANDARD]: handleNewStandard,
  [APEX_TYPES.NEW_KEY_VALUE]: handleNewKeyValue,

  // SOSL
  [APEX_TYPES.SEARCH]: handleSearch,
  [APEX_TYPES.FIND_CLAUSE]: handleFindClause,
  [APEX_TYPES.FIND_VALUE]: handleFindValue,
  [APEX_TYPES.IN_CLAUSE]: handleInClause,
  [APEX_TYPES.WITH_DIVISION_CLAUSE]: handleDivisionClause,
  [APEX_TYPES.DIVISION_VALUE]: handleDivisionValue,
  [APEX_TYPES.WITH_DATA_CATEGORY_CLAUSE]: handleWithDataCategories,
  [APEX_TYPES.SEARCH_WITH_CLAUSE]: handleSearchWithClause,
  [APEX_TYPES.SEARCH_WITH_CLAUSE_VALUE]: handleSearchWithClauseValue,
  [APEX_TYPES.RETURNING_CLAUSE]: handleReturningClause,
  [APEX_TYPES.RETURNING_EXPRESSION]: handleReturningExpression,
  [APEX_TYPES.RETURNING_SELECT_EXPRESSION]: handleReturningSelectExpression,

  // SOQL
  [APEX_TYPES.QUERY]: handleQuery,
  [APEX_TYPES.SELECT_COLUMN_CLAUSE]: handleColumnClause,
  [APEX_TYPES.SELECT_COUNT_CLAUSE]: () => ["SELECT", " ", "COUNT()"],
  [APEX_TYPES.SELECT_COLUMN_EXPRESSION]: handleColumnExpression,
  [APEX_TYPES.SELECT_INNER_QUERY]: handleSelectInnerQuery,
  [APEX_TYPES.SELECT_CASE_EXPRESSION]: handlePassthroughCall("expr"),
  [APEX_TYPES.CASE_EXPRESSION]: handleCaseExpression,
  [APEX_TYPES.WHEN_OPERATOR]: handlePassthroughCall("identifier"),
  [APEX_TYPES.WHEN_EXPRESSION]: handleWhenExpression,
  [APEX_TYPES.CASE_OPERATOR]: handlePassthroughCall("identifier"),
  [APEX_TYPES.ELSE_EXPRESSION]: handleElseExpression,
  [APEX_TYPES.FIELD]: handleField,
  [APEX_TYPES.FIELD_IDENTIFIER]: handleFieldIdentifier,
  [APEX_TYPES.FROM_CLAUSE]: handleFromClause,
  [APEX_TYPES.FROM_EXPRESSION]: handleFromExpression,
  [APEX_TYPES.GROUP_BY_CLAUSE]: handleGroupByClause,
  [APEX_TYPES.GROUP_BY_EXPRESSION]: handlePassthroughCall("field"),
  [APEX_TYPES.GROUP_BY_TYPE]: handleGroupByType,
  [APEX_TYPES.HAVING_CLAUSE]: handleHavingClause,
  [APEX_TYPES.WHERE_CLAUSE]: handleWhereClause,
  [APEX_TYPES.WHERE_INNER_EXPRESSION]: handleWhereInnerExpression,
  [APEX_TYPES.WHERE_OPERATION_EXPRESSION]: handleWhereOperationExpression,
  [APEX_TYPES.WHERE_OPERATION_EXPRESSIONS]: handleWhereOperationExpressions,
  [APEX_TYPES.WHERE_COMPOUND_EXPRESSION]: handleWhereCompoundExpression,
  [APEX_TYPES.WHERE_UNARY_EXPRESSION]: handleWhereUnaryExpression,
  [APEX_TYPES.WHERE_UNARY_OPERATOR]: () => "NOT",
  [APEX_TYPES.SELECT_DISTANCE_EXPRESSION]: handleSelectDistanceExpression,
  [APEX_TYPES.WHERE_DISTANCE_EXPRESSION]: handleWhereDistanceExpression,
  [APEX_TYPES.DISTANCE_FUNCTION_EXPRESSION]: handleDistanceFunctionExpression,
  [APEX_TYPES.GEOLOCATION_LITERAL]: handleGeolocationLiteral,
  [APEX_TYPES.GEOLOCATION_EXPRESSION]: handlePassthroughCall("expr"),
  [APEX_TYPES.NUMBER_LITERAL]: handlePassthroughCall("number", "$"),
  [APEX_TYPES.NUMBER_EXPRESSION]: handlePassthroughCall("expr"),
  [APEX_TYPES.QUERY_LITERAL_EXPRESSION]: handlePassthroughCall("literal"),
  [APEX_TYPES.QUERY_LITERAL]: handleWhereQueryLiteral,
  [APEX_TYPES.APEX_EXPRESSION]: handlePassthroughCall("expr"),
  [APEX_TYPES.COLON_EXPRESSION]: handleColonExpression,
  [APEX_TYPES.ORDER_BY_CLAUSE]: handleOrderByClause,
  [APEX_TYPES.ORDER_BY_EXPRESSION]: handleOrderByExpression,
  [APEX_TYPES.WITH_VALUE]: handleWithValue,
  [APEX_TYPES.WITH_DATA_CATEGORIES]: handleWithDataCategories,
  [APEX_TYPES.DATA_CATEGORY]: handleDataCategory,
  [APEX_TYPES.DATA_CATEGORY_OPERATOR]: handleDataCategoryOperator,
  [APEX_TYPES.LIMIT_VALUE]: (path: AstPath, print: PrintFn) => [
    "LIMIT",
    " ",
    path.call(print, "i"),
  ],
  [APEX_TYPES.LIMIT_EXPRESSION]: (path: AstPath, print: PrintFn) => [
    "LIMIT",
    " ",
    path.call(print, "expr"),
  ],
  [APEX_TYPES.OFFSET_VALUE]: (path: AstPath, print: PrintFn) => [
    "OFFSET",
    " ",
    path.call(print, "i"),
  ],
  [APEX_TYPES.OFFSET_EXPRESSION]: (path: AstPath, print: PrintFn) => [
    "OFFSET",
    " ",
    path.call(print, "expr"),
  ],
  [APEX_TYPES.QUERY_OPERATOR]: (childClass: string) =>
    QUERY[childClass as jorje.QueryOp["@class"]],
  [APEX_TYPES.SOQL_ORDER]: handleOrderOperation,
  [APEX_TYPES.SOQL_ORDER_NULL]: handleNullOrderOperation,
  [APEX_TYPES.TRACKING_TYPE]: handleTrackingType,
  [APEX_TYPES.QUERY_OPTION]: handleQueryOption,
  [APEX_TYPES.QUERY_USING_CLAUSE]: handleQueryUsingClause,
  [APEX_TYPES.USING_EXPRESSION]: handleUsingExpression,
  [APEX_TYPES.UPDATE_STATS_CLAUSE]: handleUpdateStatsClause,
  [APEX_TYPES.UPDATE_STATS_OPTION]: handleUpdateStatsOption,
  [APEX_TYPES.WHERE_CALC_EXPRESSION]: handleWhereCalcExpression,
  [APEX_TYPES.WHERE_CALC_OPERATOR_PLUS]: () => "+",
  [APEX_TYPES.WHERE_CALC_OPERATOR_MINUS]: () => "-",
  [APEX_TYPES.WHERE_COMPOUND_OPERATOR]: (childClass: string) =>
    QUERY_WHERE[childClass as jorje.WhereCompoundOp["@class"]],
  [APEX_TYPES.SEARCH_USING_CLAUSE]: (path: AstPath, print: PrintFn) => [
    "USING",
    " ",
    path.call(print, "type"),
  ],
  [APEX_TYPES.USING_TYPE]: handleUsingType,
  [APEX_TYPES.BIND_CLAUSE]: handleBindClause,
  [APEX_TYPES.BIND_EXPRESSION]: handleBindExpression,
  [APEX_TYPES.WITH_IDENTIFIER]: (path: AstPath, print: PrintFn) => [
    "WITH",
    " ",
    path.call(print, "identifier"),
  ],
};

function handleTrailingEmptyLines(doc: Doc, node: any): Doc {
  let insertNewLine = false;
  if (node && node.trailingEmptyLine) {
    // If the node has trailing comments, we have to defer the printing of the
    // trailing new line to the last trailing comment, because otherwise
    // there will be a new line before the trailing comments.
    // If the node doesn't have trailing comments, we can safefly print the
    // empty line directly after the node.
    if (node.comments) {
      const trailingComments = getTrailingComments(node);
      if (trailingComments.length === 0) {
        insertNewLine = true;
      } else {
        const lastTrailingCommentForThisNode =
          trailingComments[trailingComments.length - 1];
        if (
          lastTrailingCommentForThisNode &&
          // This trailingEmptyLine could have been explicitly set to false
          // in the parsing phase if this comment is the last one in the document,
          // in which case we'll respect it and not add a trailing empty line.
          lastTrailingCommentForThisNode.trailingEmptyLine !== false
        ) {
          lastTrailingCommentForThisNode.trailingEmptyLine = true;
        }
      }
    } else {
      insertNewLine = true;
    }
  }
  if (insertNewLine) {
    return [doc, hardline];
  }
  return doc;
}

function genericPrint(
  path: AstPath,
  options: prettier.ParserOptions,
  print: PrintFn,
) {
  const n = path.getNode();
  if (typeof n === "number" || typeof n === "boolean") {
    return n.toString();
  }
  if (typeof n === "string") {
    return escapeString(n);
  }
  if (!n) {
    return "";
  }
  const apexClass = n["@class"];
  if (path.stack.length === 1) {
    // Hard code how to handle the root node here
    const docs: Doc[] = [];
    docs.push(path.call(print, APEX_TYPES.PARSER_OUTPUT, "unit"));
    // Optionally, adding a hardline as the last thing in the document
    if (options.apexInsertFinalNewline) {
      docs.push(hardline);
    }

    return docs;
  }
  if (!apexClass) {
    return "";
  }
  if (apexClass in nodeHandler) {
    return (nodeHandler[apexClass] as SingleNodeHandler)(path, print, options);
  }
  const parentClass = getParentType(apexClass);
  if (parentClass && parentClass in nodeHandler) {
    return (nodeHandler[parentClass] as ChildNodeHandler)(
      apexClass,
      path,
      print,
      options,
    );
  }
  /* v8 ignore start */
  throw new Error(
    `No handler found for ${apexClass}. Please file a bug report.`,
  );
  /* v8 ignore stop */
}

let options: prettier.ParserOptions;
export default function printGenerically(
  path: AstPath,
  opts: prettier.ParserOptions,
  print: PrintFn,
): Doc {
  if (typeof opts === "object") {
    options = opts;
  }
  const node = path.getNode();
  const doc = genericPrint(path, options, print);
  return handleTrailingEmptyLines(doc, node);
}
