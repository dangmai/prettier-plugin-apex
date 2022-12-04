import prettier, { AstPath, Doc } from "prettier";
import {
  getTrailingComments,
  printComment,
  printDanglingComment,
} from "./comments";
import {
  AnnotatedComment,
  checkIfParentIsDottedExpression,
  getPrecedence,
  isBinaryish,
} from "./util";
import {
  ASSIGNMENT,
  APEX_TYPES,
  BINARY,
  BOOLEAN,
  DATA_CATEGORY,
  MODIFIER,
  ORDER,
  ORDER_NULL,
  POSTFIX,
  PREFIX,
  TRIGGER_USAGE,
  QUERY,
  QUERY_WHERE,
} from "./constants";
import jorje from "../vendor/apex-ast-serializer/typings/jorje";
import { EnrichedIfBlock } from "./parser";

const docBuilders = prettier.doc.builders;
const { align, join, hardline, line, softline, group, indent, dedent } =
  docBuilders;

type printFn = (path: AstPath) => Doc;

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
): (path: AstPath, print: printFn) => Doc {
  return (path: AstPath, print: printFn) =>
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

function handleReturnStatement(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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
  const node: jorje.TriggerDeclUnit["usages"][number] = path.getValue();
  return TRIGGER_USAGE[node.$];
}

function getOperator(node: jorje.BinaryExpr | jorje.BooleanExpr): string {
  if (node.op["@class"] === APEX_TYPES.BOOLEAN_OPERATOR) {
    return BOOLEAN[node.op.$];
  }
  return BINARY[node.op.$];
}

function handleBinaryishExpression(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleAssignmentExpression(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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
  const node = path.getValue();
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

function handleDottedExpression(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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
  print: printFn,
  withGroup = true,
): Doc {
  const node = path.getValue();
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

function handleVariableExpression(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleJavaVariableExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  return parts;
}

function handleLiteralExpression(
  path: AstPath,
  print: printFn,
  options: prettier.ParserOptions,
): Doc {
  const node = path.getValue();
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
    const lastCharacter = literal[literal.length - 1]!.toLowerCase();
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
    if (lastCharacter === "d") {
      doc = `${literal.substring(0, literal.length - 1)}d`;
    } else if (lastCharacter === "l") {
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
  const node: jorje.BinaryExpr["op"] = path.getValue();
  return BINARY[node.$];
}

function handleBooleanOperation(path: AstPath): Doc {
  const node: jorje.BooleanExpr["op"] = path.getValue();
  return BOOLEAN[node.$];
}

function handleAssignmentOperation(path: AstPath): Doc {
  const node: jorje.AssignmentExpr["op"] = path.getValue();
  return ASSIGNMENT[node.$];
}

function getDanglingCommentDocs(path: AstPath, _print: printFn, options: any) {
  const node = path.getValue();
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

function handleAnonymousBlockUnit(path: AstPath, print: printFn): Doc {
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
  print: printFn,
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
  print: printFn,
  options: any,
) {
  const node = path.getValue();

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
  print: printFn,
  options: any,
): Doc {
  const node = path.getValue();

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

function handleAnnotation(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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
      const commentNode = innerPath.getValue();
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

function handleAnnotationKeyValue(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "key", "value"));
  parts.push("=");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleAnnotationValue(
  childClass: string,
  path: AstPath,
  print: printFn,
): Doc {
  const parts: Doc[] = [];
  switch (childClass as jorje.AnnotationValue["@class"]) {
    case "apex.jorje.data.ast.AnnotationValue$TrueAnnotationValue":
      parts.push("true");
      break;
    case "apex.jorje.data.ast.AnnotationValue$FalseAnnotationValue":
      parts.push("false");
      break;
    case "apex.jorje.data.ast.AnnotationValue$StringAnnotationValue":
      parts.push("'");
      parts.push(path.call(print, "value"));
      parts.push("'");
      break;
  }
  return parts;
}

function handleAnnotationString(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("'");
  parts.push(path.call(print, "value"));
  parts.push("'");
  return parts;
}

function handleClassTypeRef(path: AstPath, print: printFn): Doc {
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

function handleArrayTypeRef(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "heldType"));
  parts.push("[]");
  return parts;
}

function handleJavaTypeRef(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  return parts;
}

function handleStatementBlockMember(
  modifier?: string,
): (path: AstPath, print: printFn) => Doc {
  return (path: AstPath, print: printFn) => {
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

function handlePropertyDeclaration(path: AstPath, print: printFn): Doc {
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
): (path: AstPath, print: printFn) => Doc {
  return (path: AstPath, print: printFn) => {
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

function handleMethodDeclaration(path: AstPath, print: printFn): Doc {
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

function handleModifierParameterRef(path: AstPath, print: printFn): Doc {
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

function handleEmptyModifierParameterRef(path: AstPath, print: printFn): Doc {
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
  print: printFn,
): Doc {
  let doc;
  switch (childClass as jorje.Stmnt["@class"]) {
    case "apex.jorje.data.ast.Stmnt$DmlInsertStmnt":
      doc = "insert";
      break;
    case "apex.jorje.data.ast.Stmnt$DmlUpdateStmnt":
      doc = "update";
      break;
    case "apex.jorje.data.ast.Stmnt$DmlUpsertStmnt":
      doc = "upsert";
      break;
    case "apex.jorje.data.ast.Stmnt$DmlDeleteStmnt":
      doc = "delete";
      break;
    case "apex.jorje.data.ast.Stmnt$DmlUndeleteStmnt":
      doc = "undelete";
      break;
    default:
      throw new Error(
        `Statement ${childClass} is not supported. Please file a bug report.`,
      );
  }
  const node = path.getValue();
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

function handleDmlMergeStatement(path: AstPath, print: printFn): Doc {
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
  print: printFn,
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

function handleSwitchStatement(path: AstPath, print: printFn): Doc {
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

function handleValueWhen(path: AstPath, print: printFn): Doc {
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

function handleElseWhen(path: AstPath, print: printFn): Doc {
  const statementDoc: Doc = path.call(print, "stmnt");

  const parts: Doc[] = [];
  parts.push("when");
  parts.push(" ");
  parts.push("else");
  parts.push(" ");
  pushIfExist(parts, statementDoc);
  return parts;
}

function handleTypeWhen(path: AstPath, print: printFn): Doc {
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

function handleEnumCase(path: AstPath, print: printFn): Doc {
  return join(".", path.map(print, "identifiers"));
}

function handleInputParameters(path: AstPath, print: printFn): Doc[] {
  // In most cases, the descendant nodes inside `inputParameters` will create
  // their own groups. However, in certain circumstances (i.e. with binaryish
  // behavior), they rely on groups created by their parents. That's why we
  // wrap each inputParameter in a group here. See #693 for an example case.
  return path.map(print, "inputParameters").map((paramDoc) => group(paramDoc));
}

function handleRunAsBlock(path: AstPath, print: printFn): Doc {
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
  print: printFn,
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

function handleTryCatchFinallyBlock(path: AstPath, print: printFn): Doc {
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

function handleCatchBlock(path: AstPath, print: printFn): Doc {
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

function handleFinallyBlock(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("finally");
  parts.push(" ");
  pushIfExist(parts, path.call(print, "stmnt"));
  return parts;
}

function handleVariableDeclarations(path: AstPath, print: printFn): Doc {
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

function handleVariableDeclaration(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleNewStandard(path: AstPath, print: printFn): Doc {
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

function handleNewKeyValue(path: AstPath, print: printFn): Doc {
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

function handleNameValueParameter(path: AstPath, print: printFn): Doc {
  const node = path.getValue();

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

function handleThisMethodCallExpression(path: AstPath, print: printFn): Doc {
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

function handleSuperMethodCallExpression(path: AstPath, print: printFn): Doc {
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

function handleMethodCallExpression(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleJavaMethodCallExpression(path: AstPath, print: printFn): Doc {
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

function handleNestedExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  return parts;
}

function handleNewSetInit(path: AstPath, print: printFn): Doc {
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

function handleNewSetLiteral(path: AstPath, print: printFn): Doc {
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

function handleNewListInit(path: AstPath, print: printFn): Doc {
  // We can declare lists in the following ways:
  // new Object[size];
  // new Object[] { value, ... };
  // new List<Object>(); // Provides AST consistency.
  // new List<Object>(size);

  // #262 - We use Object[size] if a literal number is provided.
  // We use List<Object>(param) otherwise.
  // This should provide compatibility for all known types without knowing
  // if the parameter is a variable (copy constructor) or literal size.
  const node = path.getValue();
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

function handleNewMapInit(path: AstPath, print: printFn): Doc {
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

function handleNewMapLiteral(path: AstPath, print: printFn): Doc {
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

function handleMapLiteralKeyValue(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "key"));
  parts.push(" ");
  parts.push("=>");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleNewListLiteral(path: AstPath, print: printFn): Doc {
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

function handleNewExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("new");
  parts.push(" ");
  parts.push(path.call(print, "creator"));
  return parts;
}

function handleIfElseBlock(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleIfBlock(path: AstPath, print: printFn): Doc {
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

function handleElseBlock(path: AstPath, print: printFn): Doc {
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

function handleTernaryExpression(path: AstPath, print: printFn): Doc {
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

function handleInstanceOfExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push("instanceof");
  parts.push(" ");
  parts.push(path.call(print, "type"));
  return parts;
}

function handlePackageVersionExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("Package.Version.");
  parts.push(path.call(print, "version"));
  return parts;
}

function handleStructuredVersion(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "major"));
  parts.push(".");
  parts.push(path.call(print, "minor"));
  return parts;
}

function handleArrayExpression(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleCastExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("(");
  parts.push(path.call(print, "type"));
  parts.push(")");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return parts;
}

function handleExpressionStatement(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(";");
  return parts;
}

// SOSL
function handleSoslExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "search"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleFindClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(indentConcat(["FIND", line, path.call(print, "search")]));
  return groupConcat(parts);
}

function handleFindValue(
  childClass: string,
  path: AstPath,
  print: printFn,
): Doc {
  let doc: Doc;
  switch (childClass as jorje.FindValue["@class"]) {
    case "apex.jorje.data.sosl.FindValue$FindString":
      doc = ["'", path.call(print, "value"), "'"];
      break;
    case "apex.jorje.data.sosl.FindValue$FindExpr":
      doc = path.call(print, "expr");
      break;
  }
  return doc;
}

function handleInClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("IN");
  parts.push(" ");
  parts.push((path.call(print, "scope") as string).toUpperCase());
  parts.push(" ");
  parts.push("FIELDS");
  return parts;
}

function handleDivisionClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("WITH DIVISION = ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleDivisionValue(
  childClass: string,
  path: AstPath,
  print: printFn,
): Doc {
  let doc: Doc;
  switch (childClass as jorje.DivisionValue["@class"]) {
    case "apex.jorje.data.sosl.DivisionValue$DivisionLiteral":
      doc = ["'", path.call(print, "literal"), "'"];
      break;
    case "apex.jorje.data.sosl.DivisionValue$DivisionExpr":
      doc = path.call(print, "expr");
      break;
  }
  return doc;
}

function handleSearchWithClause(path: AstPath, print: printFn): Doc {
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
  print: printFn,
): Doc {
  const parts: Doc[] = [];
  let valueDocs: Doc[];
  switch (childClass as jorje.SearchWithClauseValue["@class"]) {
    case "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithStringValue":
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
    case "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithTargetValue":
      parts.push("(");
      parts.push(path.call(print, "target"));
      parts.push(" = ");
      parts.push(path.call(print, "value"));
      parts.push(")");
      break;
    case "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithTrueValue":
      parts.push(" = ");
      parts.push("true");
      break;
    case "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithFalseValue":
      parts.push(" = ");
      parts.push("false");
      break;
  }
  return groupIndentConcat(parts);
}

function handleReturningClause(path: AstPath, print: printFn): Doc {
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

function handleReturningExpression(path: AstPath, print: printFn): Doc {
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

function handleReturningSelectExpression(path: AstPath, print: printFn): Doc {
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

function handleSearch(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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
function handleSoqlExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "query"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleSelectInnerQuery(path: AstPath, print: printFn): Doc {
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

function handleWhereInnerExpression(path: AstPath, print: printFn): Doc {
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

function handleQuery(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleBindClause(path: AstPath, print: printFn): Doc {
  const expressionDocs: Doc[] = path.map(print, "exprs");
  const parts: Doc[] = [];
  parts.push("BIND");
  parts.push(" ");
  parts.push(join(", ", expressionDocs));
  return parts;
}

function handleBindExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleCaseExpression(path: AstPath, print: printFn): Doc {
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

function handleWhenExpression(path: AstPath, print: printFn): Doc {
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

function handleElseExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("ELSE");
  parts.push(" ");
  const identifierDocs: Doc[] = path.map(print, "identifiers");
  parts.push(join([",", line], identifierDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleColumnClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(
    indentConcat(["SELECT", line, join([",", line], path.map(print, "exprs"))]),
  );
  return groupConcat(parts);
}

function handleColumnExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  pushIfExist(parts, path.call(print, "alias", "value"), null, [" "]);
  return groupConcat(parts);
}

function handleFieldIdentifier(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  const entity: Doc = path.call(print, "entity", "value");
  if (entity) {
    parts.push(entity);
    parts.push(".");
  }
  parts.push(path.call(print, "field"));
  return parts;
}

function handleField(path: AstPath, print: printFn): Doc {
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

function handleFromClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(
    indentConcat(["FROM", line, join(", ", path.map(print, "exprs"))]),
  );
  return groupConcat(parts);
}

function handleFromExpression(path: AstPath, print: printFn): Doc {
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

function handleWhereClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(indentConcat(["WHERE", line, path.call(print, "expr")]));
  return groupConcat(parts);
}

function handleSelectDistanceExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push(path.call(print, "alias", "value"));
  return groupConcat(parts);
}

function handleWhereDistanceExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "distance"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleDistanceFunctionExpression(path: AstPath, print: printFn): Doc {
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

function handleGeolocationLiteral(path: AstPath, print: printFn): Doc {
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

function handleWithValue(path: AstPath, print: printFn): Doc {
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

function handleWithDataCategories(path: AstPath, print: printFn): Doc {
  const categoryDocs: Doc[] = path.map(print, "categories");

  // Only AND logical operator is supported
  // https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_with_datacategory.htm
  return groupIndentConcat([
    "WITH DATA CATEGORY",
    line,
    join([line, "AND", " "], categoryDocs),
  ]);
}

function handleDataCategory(path: AstPath, print: printFn): Doc {
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

function handleWhereCalcExpression(path: AstPath, print: printFn): Doc {
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

function handleWhereOperationExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleWhereOperationExpressions(path: AstPath, print: printFn): Doc {
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

function escapeSoqlString(text: string, isInLikeExpression: boolean) {
  let escapedText = text;
  if (!isInLikeExpression) {
    // #340 - In a LIKE expression, the string emitted by jorje is already quoted,
    // so we don't need this step.
    escapedText = escapedText.replace(/\\/g, "\\\\");
  }
  escapedText = escapedText
    .replace(/\u0008/g, "\\b") // eslint-disable-line no-control-regex
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\f/g, "\\f")
    .replace(/\r/g, "\\r")
    .replace(/'/g, "\\'");
  return escapedText;
}

function handleWhereQueryLiteral(
  childClass: string,
  path: AstPath,
  print: printFn,
  options: any,
): Doc {
  const node = path.getValue();
  const grandParentNode = path.getParentNode(1);

  let doc: Doc;
  const isInLikeExpression =
    grandParentNode &&
    grandParentNode.op &&
    grandParentNode.op["@class"] === APEX_TYPES.QUERY_OPERATOR_LIKE;
  switch (childClass as jorje.QueryLiteral["@class"]) {
    case "apex.jorje.data.soql.QueryLiteral$QueryString":
      // #340 - Query Strings have different properties than normal Apex strings,
      // so we have to handle them separately. They also behave differently
      // depending on whether they are in a LIKE expression vs other expressions.
      doc = ["'", escapeSoqlString(node.literal, isInLikeExpression), "'"];
      break;
    case "apex.jorje.data.soql.QueryLiteral$QueryNull":
      doc = "NULL";
      break;
    case "apex.jorje.data.soql.QueryLiteral$QueryTrue":
      doc = "TRUE";
      break;
    case "apex.jorje.data.soql.QueryLiteral$QueryFalse":
      doc = "FALSE";
      break;
    case "apex.jorje.data.soql.QueryLiteral$QueryNumber":
      doc = path.call(print, "literal", "$");
      break;
    case "apex.jorje.data.soql.QueryLiteral$QueryDateTime":
    case "apex.jorje.data.soql.QueryLiteral$QueryTime":
      doc = options.originalText.slice(node.loc.startIndex, node.loc.endIndex);
      break;
    case "apex.jorje.data.soql.QueryLiteral$QueryDateFormula":
      doc = path.call(print, "dateFormula");
      break;
    case "apex.jorje.data.soql.QueryLiteral$QueryDate":
    case "apex.jorje.data.soql.QueryLiteral$QueryMultiCurrency":
      doc = path.call(print, "literal");
      break;
  }
  if (doc) {
    return doc;
  }
  return "";
}

function handleWhereCompoundExpression(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleWhereUnaryExpression(path: AstPath, print: printFn): Doc {
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

function handleColonExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(":");
  parts.push(path.call(print, "expr"));
  return parts;
}

function handleOrderByClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("ORDER BY");
  parts.push(indentConcat([line, join([",", line], path.map(print, "exprs"))]));
  return groupConcat(parts);
}

function handleOrderByExpression(
  childClass: string,
  path: AstPath,
  print: printFn,
): Doc {
  const parts: Doc[] = [];
  let expressionField;
  switch (childClass as jorje.OrderByExpr["@class"]) {
    case "apex.jorje.data.soql.OrderByExpr$OrderByDistance":
      expressionField = "distance";
      break;
    case "apex.jorje.data.soql.OrderByExpr$OrderByValue":
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
  _print: printFn,
  opts: prettier.ParserOptions,
): Doc {
  const loc = opts.locStart(path.getValue());
  if (loc) {
    return ORDER[childClass as jorje.Order["@class"]];
  }
  return "";
}

function handleNullOrderOperation(
  childClass: string,
  path: AstPath,
  _print: printFn,
  opts: prettier.ParserOptions,
): Doc {
  const loc = opts.locStart(path.getValue());
  if (loc) {
    return ORDER_NULL[childClass as jorje.OrderNull["@class"]];
  }
  return "";
}

function handleGroupByClause(path: AstPath, print: printFn): Doc {
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
    case "apex.jorje.data.soql.GroupByType$GroupByRollUp":
      doc = "ROLLUP";
      break;
    case "apex.jorje.data.soql.GroupByType$GroupByCube":
      doc = "CUBE";
      break;
  }
  return doc;
}

function handleHavingClause(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push("HAVING");
  parts.push(line);
  parts.push(path.call(print, "expr"));
  return groupIndentConcat(parts);
}

function handleQueryUsingClause(path: AstPath, print: printFn): Doc {
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
  print: printFn,
): Doc {
  let doc;
  switch (childClass as jorje.UsingExpr["@class"]) {
    case "apex.jorje.data.soql.UsingExpr$Using":
      doc = [
        path.call(print, "name", "value"),
        " ",
        path.call(print, "field", "value"),
      ];
      break;
    case "apex.jorje.data.soql.UsingExpr$UsingEquals":
      doc = [
        path.call(print, "name", "value"),
        " = ",
        path.call(print, "field", "value"),
      ];
      break;
    case "apex.jorje.data.soql.UsingExpr$UsingId":
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
    case "apex.jorje.data.soql.TrackingType$ForView":
      doc = "FOR VIEW";
      break;
    case "apex.jorje.data.soql.TrackingType$ForReference":
      doc = "FOR REFERENCE";
      break;
  }
  return doc;
}

function handleQueryOption(childClass: string): Doc {
  let doc;
  switch (childClass as jorje.QueryOption["@class"]) {
    case "apex.jorje.data.soql.QueryOption$LockRows":
      doc = "FOR UPDATE";
      break;
    case "apex.jorje.data.soql.QueryOption$IncludeDeleted":
      doc = "ALL ROWS";
      break;
  }
  return doc;
}

function handleUpdateStatsClause(path: AstPath, print: printFn): Doc {
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
    case "apex.jorje.data.soql.UpdateStatsOption$UpdateTracking":
      doc = "TRACKING";
      break;
    case "apex.jorje.data.soql.UpdateStatsOption$UpdateViewStat":
      doc = "VIEWSTAT";
      break;
  }
  return doc;
}

function handleUsingType(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "filter"));
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return parts;
}

function handleModifier(childClass: string): Doc {
  const modifierValue = MODIFIER[childClass as jorje.Modifier["@class"]] || "";
  if (!modifierValue) {
    throw new Error(
      `Modifier ${childClass} is not supported. Please file a bug report.`,
    );
  }
  return [modifierValue, " "];
}

function handlePostfixExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "expr"));
  parts.push(path.call(print, "op"));
  return parts;
}

function handlePrefixExpression(path: AstPath, print: printFn): Doc {
  const parts: Doc[] = [];
  parts.push(path.call(print, "op"));
  parts.push(path.call(print, "expr"));
  return parts;
}

function handlePostfixOperator(path: AstPath): Doc {
  const node: jorje.PostfixExpr["op"] = path.getValue();
  return POSTFIX[node.$];
}

function handlePrefixOperator(path: AstPath): Doc {
  const node: jorje.PrefixExpr["op"] = path.getValue();
  return PREFIX[node.$];
}

function handleWhileLoop(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleDoLoop(path: AstPath, print: printFn): Doc {
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

function handleForLoop(path: AstPath, print: printFn): Doc {
  const node = path.getValue();
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

function handleForEnhancedControl(path: AstPath, print: printFn): Doc {
  // See the note in handleForInit to see why we have to do this
  const initDocParts: Doc = path.call(print, "init");
  const initDoc = join([" ", ":", " "], initDocParts as Doc[]);

  const parts: Doc[] = [];
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(initDoc);
  return parts;
}

function handleForCStyleControl(path: AstPath, print: printFn): Doc {
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

function handleForInits(path: AstPath, print: printFn): Doc {
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

function handleForInit(path: AstPath, print: printFn): Doc[] {
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

type singleNodeHandler = (
  path: AstPath,
  print: printFn,
  options: prettier.ParserOptions,
) => Doc;
type childNodeHandler = (
  childClass: string,
  path: AstPath,
  print: printFn,
  options: prettier.ParserOptions,
) => Doc;

const nodeHandler: { [key: string]: childNodeHandler | singleNodeHandler } = {};
nodeHandler[APEX_TYPES.IF_ELSE_BLOCK] = handleIfElseBlock;
nodeHandler[APEX_TYPES.IF_BLOCK] = handleIfBlock;
nodeHandler[APEX_TYPES.ELSE_BLOCK] = handleElseBlock;
nodeHandler[APEX_TYPES.EXPRESSION_STATEMENT] = handleExpressionStatement;
nodeHandler[APEX_TYPES.RETURN_STATEMENT] = handleReturnStatement;
nodeHandler[APEX_TYPES.TRIGGER_USAGE] = handleTriggerUsage;
nodeHandler[APEX_TYPES.JAVA_TYPE_REF] = handleJavaTypeRef;
nodeHandler[APEX_TYPES.CLASS_TYPE_REF] = handleClassTypeRef;
nodeHandler[APEX_TYPES.ARRAY_TYPE_REF] = handleArrayTypeRef;
nodeHandler[APEX_TYPES.LOCATION_IDENTIFIER] = handlePassthroughCall("value");
nodeHandler[APEX_TYPES.MODIFIER_PARAMETER_REF] = handleModifierParameterRef;
nodeHandler[APEX_TYPES.EMPTY_MODIFIER_PARAMETER_REF] =
  handleEmptyModifierParameterRef;
nodeHandler[APEX_TYPES.BLOCK_STATEMENT] = handleBlockStatement;
nodeHandler[APEX_TYPES.VARIABLE_DECLARATION_STATEMENT] =
  handlePassthroughCall("variableDecls");
nodeHandler[APEX_TYPES.VARIABLE_DECLARATIONS] = handleVariableDeclarations;
nodeHandler[APEX_TYPES.NAME_VALUE_PARAMETER] = handleNameValueParameter;
nodeHandler[APEX_TYPES.ANNOTATION] = handleAnnotation;
nodeHandler[APEX_TYPES.ANNOTATION_KEY_VALUE] = handleAnnotationKeyValue;
nodeHandler[APEX_TYPES.ANNOTATION_VALUE] = handleAnnotationValue;
nodeHandler[APEX_TYPES.ANNOTATION_STRING] = handleAnnotationString;
nodeHandler[APEX_TYPES.MODIFIER] = handleModifier;
nodeHandler[APEX_TYPES.RUN_AS_BLOCK] = handleRunAsBlock;
nodeHandler[APEX_TYPES.DO_LOOP] = handleDoLoop;
nodeHandler[APEX_TYPES.WHILE_LOOP] = handleWhileLoop;
nodeHandler[APEX_TYPES.FOR_LOOP] = handleForLoop;
nodeHandler[APEX_TYPES.FOR_C_STYLE_CONTROL] = handleForCStyleControl;
nodeHandler[APEX_TYPES.FOR_ENHANCED_CONTROL] = handleForEnhancedControl;
nodeHandler[APEX_TYPES.FOR_INITS] = handleForInits;
nodeHandler[APEX_TYPES.FOR_INIT] = handleForInit;
nodeHandler[APEX_TYPES.BREAK_STATEMENT] = () => "break;";
nodeHandler[APEX_TYPES.CONTINUE_STATEMENT] = () => "continue;";
nodeHandler[APEX_TYPES.THROW_STATEMENT] = (path: AstPath, print: printFn) => [
  "throw",
  " ",
  path.call(print, "expr"),
  ";",
];
nodeHandler[APEX_TYPES.TRY_CATCH_FINALLY_BLOCK] = handleTryCatchFinallyBlock;
nodeHandler[APEX_TYPES.CATCH_BLOCK] = handleCatchBlock;
nodeHandler[APEX_TYPES.FINALLY_BLOCK] = handleFinallyBlock;
nodeHandler[APEX_TYPES.STATEMENT] = handleStatement;
nodeHandler[APEX_TYPES.DML_MERGE_STATEMENT] = handleDmlMergeStatement;
nodeHandler[APEX_TYPES.SWITCH_STATEMENT] = handleSwitchStatement;
nodeHandler[APEX_TYPES.VALUE_WHEN] = handleValueWhen;
nodeHandler[APEX_TYPES.ELSE_WHEN] = handleElseWhen;
nodeHandler[APEX_TYPES.TYPE_WHEN] = handleTypeWhen;
nodeHandler[APEX_TYPES.ENUM_CASE] = handleEnumCase;
nodeHandler[APEX_TYPES.LITERAL_CASE] = handlePassthroughCall("expr");
nodeHandler[APEX_TYPES.PROPERTY_DECLATION] = handlePropertyDeclaration;
nodeHandler[APEX_TYPES.PROPERTY_GETTER] = handlePropertyGetterSetter("get");
nodeHandler[APEX_TYPES.PROPERTY_SETTER] = handlePropertyGetterSetter("set");
nodeHandler[APEX_TYPES.STRUCTURED_VERSION] = handleStructuredVersion;
nodeHandler[APEX_TYPES.REQUEST_VERSION] = () => "Request";
nodeHandler["int"] = (path: AstPath, print: printFn) => path.call(print, "$");
nodeHandler["string"] = (path: AstPath, print: printFn) => [
  "'",
  path.call(print, "$"),
  "'",
];

// Operator
nodeHandler[APEX_TYPES.ASSIGNMENT_OPERATOR] = handleAssignmentOperation;
nodeHandler[APEX_TYPES.BINARY_OPERATOR] = handleBinaryOperation;
nodeHandler[APEX_TYPES.BOOLEAN_OPERATOR] = handleBooleanOperation;
nodeHandler[APEX_TYPES.POSTFIX_OPERATOR] = handlePostfixOperator;
nodeHandler[APEX_TYPES.PREFIX_OPERATOR] = handlePrefixOperator;

// Declaration
nodeHandler[APEX_TYPES.CLASS_DECLARATION] = handleClassDeclaration;
nodeHandler[APEX_TYPES.INTERFACE_DECLARATION] = handleInterfaceDeclaration;
nodeHandler[APEX_TYPES.METHOD_DECLARATION] = handleMethodDeclaration;
nodeHandler[APEX_TYPES.VARIABLE_DECLARATION] = handleVariableDeclaration;
nodeHandler[APEX_TYPES.ENUM_DECLARATION] = handleEnumDeclaration;

// Compilation Unit: we're not handling  InvalidDeclUnit
nodeHandler[APEX_TYPES.TRIGGER_DECLARATION_UNIT] = handleTriggerDeclarationUnit;
nodeHandler[APEX_TYPES.CLASS_DECLARATION_UNIT] = handlePassthroughCall("body");
nodeHandler[APEX_TYPES.ENUM_DECLARATION_UNIT] = handlePassthroughCall("body");
nodeHandler[APEX_TYPES.INTERFACE_DECLARATION_UNIT] =
  handlePassthroughCall("body");
nodeHandler[APEX_TYPES.ANONYMOUS_BLOCK_UNIT] = handleAnonymousBlockUnit;

// Block Member
nodeHandler[APEX_TYPES.PROPERTY_MEMBER] = handlePassthroughCall("propertyDecl");
nodeHandler[APEX_TYPES.FIELD_MEMBER] = handlePassthroughCall("variableDecls");
nodeHandler[APEX_TYPES.STATEMENT_BLOCK_MEMBER] = handleStatementBlockMember();
nodeHandler[APEX_TYPES.STATIC_STATEMENT_BLOCK_MEMBER] =
  handleStatementBlockMember("static");
nodeHandler[APEX_TYPES.METHOD_MEMBER] = handlePassthroughCall("methodDecl");
nodeHandler[APEX_TYPES.INNER_CLASS_MEMBER] = handlePassthroughCall("body");
nodeHandler[APEX_TYPES.INNER_ENUM_MEMBER] = handlePassthroughCall("body");
nodeHandler[APEX_TYPES.INNER_INTERFACE_MEMBER] = handlePassthroughCall("body");

// Expression
nodeHandler[APEX_TYPES.TERNARY_EXPRESSION] = handleTernaryExpression;
nodeHandler[APEX_TYPES.BOOLEAN_EXPRESSION] = handleBinaryishExpression;
nodeHandler[APEX_TYPES.ASSIGNMENT_EXPRESSION] = handleAssignmentExpression;
nodeHandler[APEX_TYPES.NESTED_EXPRESSION] = handleNestedExpression;
nodeHandler[APEX_TYPES.VARIABLE_EXPRESSION] = handleVariableExpression;
nodeHandler[APEX_TYPES.JAVA_VARIABLE_EXPRESSION] = handleJavaVariableExpression;
nodeHandler[APEX_TYPES.LITERAL_EXPRESSION] = handleLiteralExpression;
nodeHandler[APEX_TYPES.BINARY_EXPRESSION] = handleBinaryishExpression;
nodeHandler[APEX_TYPES.TRIGGER_VARIABLE_EXPRESSION] = (
  path: AstPath,
  print: printFn,
) => ["Trigger", ".", path.call(print, "variable")];
nodeHandler[APEX_TYPES.NEW_EXPRESSION] = handleNewExpression;
nodeHandler[APEX_TYPES.METHOD_CALL_EXPRESSION] = handleMethodCallExpression;
nodeHandler[APEX_TYPES.JAVA_METHOD_CALL_EXPRESSION] =
  handleJavaMethodCallExpression;
nodeHandler[APEX_TYPES.THIS_VARIABLE_EXPRESSION] = () => "this";
nodeHandler[APEX_TYPES.SUPER_VARIABLE_EXPRESSION] = () => "super";
nodeHandler[APEX_TYPES.POSTFIX_EXPRESSION] = handlePostfixExpression;
nodeHandler[APEX_TYPES.PREFIX_EXPRESSION] = handlePrefixExpression;
nodeHandler[APEX_TYPES.CAST_EXPRESSION] = handleCastExpression;
nodeHandler[APEX_TYPES.INSTANCE_OF_EXPRESSION] = handleInstanceOfExpression;
nodeHandler[APEX_TYPES.PACKAGE_VERSION_EXPRESSION] =
  handlePackageVersionExpression;
nodeHandler[APEX_TYPES.ARRAY_EXPRESSION] = handleArrayExpression;
nodeHandler[APEX_TYPES.CLASS_REF_EXPRESSION] = (
  path: AstPath,
  print: printFn,
) => [path.call(print, "type"), ".", "class"];
nodeHandler[APEX_TYPES.THIS_METHOD_CALL_EXPRESSION] =
  handleThisMethodCallExpression;
nodeHandler[APEX_TYPES.SUPER_METHOD_CALL_EXPRESSION] =
  handleSuperMethodCallExpression;
nodeHandler[APEX_TYPES.SOQL_EXPRESSION] = handleSoqlExpression;
nodeHandler[APEX_TYPES.SOSL_EXPRESSION] = handleSoslExpression;

// New Object Init
nodeHandler[APEX_TYPES.NEW_SET_INIT] = handleNewSetInit;
nodeHandler[APEX_TYPES.NEW_SET_LITERAL] = handleNewSetLiteral;
nodeHandler[APEX_TYPES.NEW_LIST_INIT] = handleNewListInit;
nodeHandler[APEX_TYPES.NEW_MAP_INIT] = handleNewMapInit;
nodeHandler[APEX_TYPES.NEW_MAP_LITERAL] = handleNewMapLiteral;
nodeHandler[APEX_TYPES.MAP_LITERAL_KEY_VALUE] = handleMapLiteralKeyValue;
nodeHandler[APEX_TYPES.NEW_LIST_LITERAL] = handleNewListLiteral;
nodeHandler[APEX_TYPES.NEW_STANDARD] = handleNewStandard;
nodeHandler[APEX_TYPES.NEW_KEY_VALUE] = handleNewKeyValue;

// SOSL
nodeHandler[APEX_TYPES.SEARCH] = handleSearch;
nodeHandler[APEX_TYPES.FIND_CLAUSE] = handleFindClause;
nodeHandler[APEX_TYPES.FIND_VALUE] = handleFindValue;
nodeHandler[APEX_TYPES.IN_CLAUSE] = handleInClause;
nodeHandler[APEX_TYPES.WITH_DIVISION_CLAUSE] = handleDivisionClause;
nodeHandler[APEX_TYPES.DIVISION_VALUE] = handleDivisionValue;
nodeHandler[APEX_TYPES.WITH_DATA_CATEGORY_CLAUSE] = handleWithDataCategories;
nodeHandler[APEX_TYPES.SEARCH_WITH_CLAUSE] = handleSearchWithClause;
nodeHandler[APEX_TYPES.SEARCH_WITH_CLAUSE_VALUE] = handleSearchWithClauseValue;
nodeHandler[APEX_TYPES.RETURNING_CLAUSE] = handleReturningClause;
nodeHandler[APEX_TYPES.RETURNING_EXPRESSION] = handleReturningExpression;
nodeHandler[APEX_TYPES.RETURNING_SELECT_EXPRESSION] =
  handleReturningSelectExpression;

// SOQL
nodeHandler[APEX_TYPES.QUERY] = handleQuery;
nodeHandler[APEX_TYPES.SELECT_COLUMN_CLAUSE] = handleColumnClause;
nodeHandler[APEX_TYPES.SELECT_COUNT_CLAUSE] = () => ["SELECT", " ", "COUNT()"];
nodeHandler[APEX_TYPES.SELECT_COLUMN_EXPRESSION] = handleColumnExpression;
nodeHandler[APEX_TYPES.SELECT_INNER_QUERY] = handleSelectInnerQuery;
nodeHandler[APEX_TYPES.SELECT_CASE_EXPRESSION] = handlePassthroughCall("expr");
nodeHandler[APEX_TYPES.CASE_EXPRESSION] = handleCaseExpression;
nodeHandler[APEX_TYPES.WHEN_OPERATOR] = handlePassthroughCall("identifier");
nodeHandler[APEX_TYPES.WHEN_EXPRESSION] = handleWhenExpression;
nodeHandler[APEX_TYPES.CASE_OPERATOR] = handlePassthroughCall("identifier");
nodeHandler[APEX_TYPES.ELSE_EXPRESSION] = handleElseExpression;
nodeHandler[APEX_TYPES.FIELD] = handleField;
nodeHandler[APEX_TYPES.FIELD_IDENTIFIER] = handleFieldIdentifier;
nodeHandler[APEX_TYPES.FROM_CLAUSE] = handleFromClause;
nodeHandler[APEX_TYPES.FROM_EXPRESSION] = handleFromExpression;
nodeHandler[APEX_TYPES.GROUP_BY_CLAUSE] = handleGroupByClause;
nodeHandler[APEX_TYPES.GROUP_BY_EXPRESSION] = handlePassthroughCall("field");
nodeHandler[APEX_TYPES.GROUP_BY_TYPE] = handleGroupByType;
nodeHandler[APEX_TYPES.HAVING_CLAUSE] = handleHavingClause;
nodeHandler[APEX_TYPES.WHERE_CLAUSE] = handleWhereClause;
nodeHandler[APEX_TYPES.WHERE_INNER_EXPRESSION] = handleWhereInnerExpression;
nodeHandler[APEX_TYPES.WHERE_OPERATION_EXPRESSION] =
  handleWhereOperationExpression;
nodeHandler[APEX_TYPES.WHERE_OPERATION_EXPRESSIONS] =
  handleWhereOperationExpressions;
nodeHandler[APEX_TYPES.WHERE_COMPOUND_EXPRESSION] =
  handleWhereCompoundExpression;
nodeHandler[APEX_TYPES.WHERE_UNARY_EXPRESSION] = handleWhereUnaryExpression;
nodeHandler[APEX_TYPES.WHERE_UNARY_OPERATOR] = () => "NOT";
nodeHandler[APEX_TYPES.SELECT_DISTANCE_EXPRESSION] =
  handleSelectDistanceExpression;
nodeHandler[APEX_TYPES.WHERE_DISTANCE_EXPRESSION] =
  handleWhereDistanceExpression;
nodeHandler[APEX_TYPES.DISTANCE_FUNCTION_EXPRESSION] =
  handleDistanceFunctionExpression;
nodeHandler[APEX_TYPES.GEOLOCATION_LITERAL] = handleGeolocationLiteral;
nodeHandler[APEX_TYPES.GEOLOCATION_EXPRESSION] = handlePassthroughCall("expr");
nodeHandler[APEX_TYPES.NUMBER_LITERAL] = handlePassthroughCall("number", "$");
nodeHandler[APEX_TYPES.NUMBER_EXPRESSION] = handlePassthroughCall("expr");
nodeHandler[APEX_TYPES.QUERY_LITERAL_EXPRESSION] =
  handlePassthroughCall("literal");
nodeHandler[APEX_TYPES.QUERY_LITERAL] = handleWhereQueryLiteral;
nodeHandler[APEX_TYPES.APEX_EXPRESSION] = handlePassthroughCall("expr");
nodeHandler[APEX_TYPES.COLON_EXPRESSION] = handleColonExpression;
nodeHandler[APEX_TYPES.ORDER_BY_CLAUSE] = handleOrderByClause;
nodeHandler[APEX_TYPES.ORDER_BY_EXPRESSION] = handleOrderByExpression;
nodeHandler[APEX_TYPES.WITH_VALUE] = handleWithValue;
nodeHandler[APEX_TYPES.WITH_DATA_CATEGORIES] = handleWithDataCategories;
nodeHandler[APEX_TYPES.DATA_CATEGORY] = handleDataCategory;
nodeHandler[APEX_TYPES.DATA_CATEGORY_OPERATOR] = handleDataCategoryOperator;
nodeHandler[APEX_TYPES.LIMIT_VALUE] = (path: AstPath, print: printFn) => [
  "LIMIT",
  " ",
  path.call(print, "i"),
];
nodeHandler[APEX_TYPES.LIMIT_EXPRESSION] = (path: AstPath, print: printFn) => [
  "LIMIT",
  " ",
  path.call(print, "expr"),
];
nodeHandler[APEX_TYPES.OFFSET_VALUE] = (path: AstPath, print: printFn) => [
  "OFFSET",
  " ",
  path.call(print, "i"),
];
nodeHandler[APEX_TYPES.OFFSET_EXPRESSION] = (path: AstPath, print: printFn) => [
  "OFFSET",
  " ",
  path.call(print, "expr"),
];
nodeHandler[APEX_TYPES.QUERY_OPERATOR] = (childClass: string) =>
  QUERY[childClass as jorje.QueryOp["@class"]];
nodeHandler[APEX_TYPES.SOQL_ORDER] = handleOrderOperation;
nodeHandler[APEX_TYPES.SOQL_ORDER_NULL] = handleNullOrderOperation;
nodeHandler[APEX_TYPES.TRACKING_TYPE] = handleTrackingType;
nodeHandler[APEX_TYPES.QUERY_OPTION] = handleQueryOption;
nodeHandler[APEX_TYPES.QUERY_USING_CLAUSE] = handleQueryUsingClause;
nodeHandler[APEX_TYPES.USING_EXPRESSION] = handleUsingExpression;
nodeHandler[APEX_TYPES.UPDATE_STATS_CLAUSE] = handleUpdateStatsClause;
nodeHandler[APEX_TYPES.UPDATE_STATS_OPTION] = handleUpdateStatsOption;
nodeHandler[APEX_TYPES.WHERE_CALC_EXPRESSION] = handleWhereCalcExpression;
nodeHandler[APEX_TYPES.WHERE_CALC_OPERATOR_PLUS] = () => "+";
nodeHandler[APEX_TYPES.WHERE_CALC_OPERATOR_MINUS] = () => "-";
nodeHandler[APEX_TYPES.WHERE_COMPOUND_OPERATOR] = (childClass: string) =>
  QUERY_WHERE[childClass as jorje.WhereCompoundOp["@class"]];
nodeHandler[APEX_TYPES.SEARCH_USING_CLAUSE] = (
  path: AstPath,
  print: printFn,
) => ["USING", " ", path.call(print, "type")];
nodeHandler[APEX_TYPES.USING_TYPE] = handleUsingType;
nodeHandler[APEX_TYPES.BIND_CLAUSE] = handleBindClause;
nodeHandler[APEX_TYPES.BIND_EXPRESSION] = handleBindExpression;
nodeHandler[APEX_TYPES.WITH_IDENTIFIER] = (path: AstPath, print: printFn) => [
  "WITH",
  " ",
  path.call(print, "identifier"),
];

function handleTrailingEmptyLines(doc: Doc, node: any): Doc {
  let insertNewLine = false;
  if (node && node.trailingEmptyLine) {
    if (node.comments) {
      const trailingComments = getTrailingComments(node);
      if (trailingComments.length === 0) {
        insertNewLine = true;
      } else {
        const lastComment = trailingComments[trailingComments.length - 1];
        if (lastComment) {
          lastComment.trailingEmptyLine = true;
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
  print: printFn,
) {
  const n = path.getValue();
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
    return (nodeHandler[apexClass] as singleNodeHandler)(path, print, options);
  }
  const separatorIndex = apexClass.indexOf("$");
  if (separatorIndex !== -1) {
    const parentClass = apexClass.substring(0, separatorIndex);
    if (parentClass in nodeHandler) {
      return (nodeHandler[parentClass] as childNodeHandler)(
        apexClass,
        path,
        print,
        options,
      );
    }
  }
  throw new Error(
    `No handler found for ${apexClass}. Please file a bug report.`,
  );
}

let options: prettier.ParserOptions;
export default function printGenerically(
  path: AstPath,
  opts: prettier.ParserOptions,
  print: printFn,
): Doc {
  if (typeof opts === "object") {
    options = opts;
  }
  const node = path.getValue();
  const doc = genericPrint(path, options, print);
  return handleTrailingEmptyLines(doc, node);
}
