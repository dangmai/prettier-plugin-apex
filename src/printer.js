/* eslint no-underscore-dangle: 0 */

const prettier = require("prettier");

const docBuilders = prettier.doc.builders;

const { align, concat, join, hardline, line, softline, group, indent, dedent } =
  docBuilders;

const { willBreak } = prettier.doc.utils;

const {
  getTrailingComments,
  printComment,
  printDanglingComment,
} = require("./comments");
const {
  checkIfParentIsDottedExpression,
  getPrecedence,
  isBinaryish,
} = require("./util");
const constants = require("./constants");

const apexTypes = constants.APEX_TYPES;

function indentConcat(docs) {
  return indent(concat(docs));
}

function groupConcat(docs) {
  return group(concat(docs));
}

function groupIndentConcat(docs) {
  return group(indent(concat(docs)));
}

function _handlePassthroughCall(...names) {
  return (path, print) => path.call(print, ...names);
}

function _pushIfExist(parts, doc, postDocs, preDocs) {
  if (doc) {
    if (preDocs) {
      preDocs.forEach((preDoc) => parts.push(preDoc));
    }
    parts.push(doc);
    if (postDocs) {
      postDocs.forEach((postDoc) => parts.push(postDoc));
    }
  }
  return parts;
}

function _escapeString(text) {
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

function handleReturnStatement(path, print) {
  const node = path.getValue();
  const docs = [];
  docs.push("return");
  const childDocs = path.call(print, "expr", "value");
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

function getOperator(node) {
  if (node.op["@class"] === apexTypes.BOOLEAN_OPERATOR) {
    return constants.BOOLEAN[node.op.$];
  }
  return constants.BINARY[node.op.$];
}

function handleBinaryishExpression(path, print) {
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

  const docs = [];
  const leftDoc = path.call(print, "left");
  const operationDoc = path.call(print, "op");
  const rightDoc = path.call(print, "right");

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

  if (
    isLeftChildNodeWithoutGrouping ||
    leftChildNodeSamePrecedenceAsRightChildNode ||
    isTopMostParentNodeWithoutGrouping
  ) {
    docs.push(leftDoc);
    docs.push(" ");
    docs.push(concat([operationDoc, line, rightDoc]));
    return concat(docs);
  }
  if (hasRightChildNodeWithoutGrouping) {
    docs.push(group(leftDoc));
    docs.push(" ");
    docs.push(concat([operationDoc, line, rightDoc]));
    return concat(docs);
  }
  // At this point we know that this node is not in a binaryish chain, so we
  // can safely group the left doc and right doc separately to have this effect:
  // a = b
  //  .c() > d
  docs.push(group(leftDoc));
  docs.push(" ");
  docs.push(groupConcat([operationDoc, line, rightDoc]));
  return groupConcat(docs);
}

function handleAssignmentExpression(path, print) {
  const node = path.getValue();
  const docs = [];

  const leftDoc = path.call(print, "left");
  const operationDoc = path.call(print, "op");
  const rightDoc = path.call(print, "right");
  docs.push(leftDoc);
  docs.push(" ");
  docs.push(operationDoc);
  if (isBinaryish(node.right)) {
    docs.push(line);
    docs.push(rightDoc);
    return groupIndentConcat(docs);
  }
  docs.push(" ");
  docs.push(rightDoc);
  return groupConcat(docs);
}

function shouldDottedExpressionBreak(path) {
  const node = path.getValue();
  // #62 - `super` cannot  be followed any white spaces
  if (node.dottedExpr.value["@class"] === apexTypes.SUPER_VARIABLE_EXPRESSION) {
    return false;
  }
  // #98 - Even though `this` can synctactically be followed by whitespaces,
  // make the formatted output similar to `super` to provide consistency.
  if (node.dottedExpr.value["@class"] === apexTypes.THIS_VARIABLE_EXPRESSION) {
    return false;
  }
  if (node["@class"] !== apexTypes.METHOD_CALL_EXPRESSION) {
    return true;
  }
  if (checkIfParentIsDottedExpression(path)) {
    return true;
  }
  if (
    node.dottedExpr.value &&
    node.dottedExpr.value["@class"] === apexTypes.METHOD_CALL_EXPRESSION
  ) {
    return true;
  }
  return node.dottedExpr.value;
}

function handleDottedExpression(path, print) {
  const node = path.getValue();
  const dottedExpressionParts = [];
  const dottedExpressionDoc = path.call(print, "dottedExpr", "value");

  if (dottedExpressionDoc) {
    dottedExpressionParts.push(dottedExpressionDoc);
    if (shouldDottedExpressionBreak(path)) {
      dottedExpressionParts.push(softline);
    }
    if (node.isSafeNav) {
      dottedExpressionParts.push("?");
    }
    dottedExpressionParts.push(".");
    return concat(dottedExpressionParts);
  }
  return "";
}

function handleArrayExpressionIndex(path, print, withGroup = true) {
  const node = path.getValue();
  let parts;
  if (node.index["@class"] === apexTypes.LITERAL_EXPRESSION) {
    // For literal index, we will make sure it's always attached to the [],
    // because it's usually short and will look bad being broken up.
    parts = ["[", path.call(print, "index"), "]"];
  } else {
    parts = ["[", softline, path.call(print, "index"), dedent(softline), "]"];
  }
  return withGroup ? groupIndentConcat(parts) : concat(parts);
}

function handleVariableExpression(path, print) {
  const node = path.getValue();
  const parentNode = path.getParentNode();
  const nodeName = path.getName();
  const { dottedExpr } = node;
  const parts = [];
  const dottedExpressionDoc = handleDottedExpression(path, print);
  const isParentDottedExpression = checkIfParentIsDottedExpression(path);
  const isDottedExpressionSoqlExpression =
    dottedExpr &&
    dottedExpr.value &&
    (dottedExpr.value["@class"] === apexTypes.SOQL_EXPRESSION ||
      (dottedExpr.value["@class"] === apexTypes.ARRAY_EXPRESSION &&
        dottedExpr.value.expr &&
        dottedExpr.value.expr["@class"] === apexTypes.SOQL_EXPRESSION));

  parts.push(dottedExpressionDoc);
  // Name chain
  const nameDocs = path.map(print, "names");
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
    parentNode["@class"] === apexTypes.ARRAY_EXPRESSION &&
    nodeName === "expr"
  ) {
    path.callParent((innerPath) => {
      const withGroup = isParentDottedExpression || dottedExpressionDoc;

      parts.push(handleArrayExpressionIndex(innerPath, print, withGroup));
    });
  }
  if (isParentDottedExpression || isDottedExpressionSoqlExpression) {
    return concat(parts);
  }
  return groupIndentConcat(parts);
}

function handleJavaVariableExpression(path, print) {
  const parts = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  return concat(parts);
}

function handleLiteralExpression(path, print, options) {
  const node = path.getValue();
  const literalType = path.call(print, "type", "$");
  if (literalType === "NULL") {
    return "null";
  }
  const literalDoc = path.call(print, "literal", "$");
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
    const lastCharacter = literal[literal.length - 1].toLowerCase();
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

function handleBinaryOperation(path) {
  const node = path.getValue();
  return constants.BINARY[node.$];
}

function handleBooleanOperation(path) {
  const node = path.getValue();
  return constants.BOOLEAN[node.$];
}

function handleAssignmentOperation(path) {
  const node = path.getValue();
  return constants.ASSIGNMENT[node.$];
}

function _getDanglingCommentDocs(path, print, options) {
  const node = path.getValue();
  if (!node.comments) {
    return [];
  }
  node.danglingComments = node.comments.filter(
    (comment) => !comment.leading && !comment.trailing,
  );
  const danglingCommentParts = [];
  path.each((commentPath) => {
    danglingCommentParts.push(
      printDanglingComment(commentPath, options, print),
    );
  }, "danglingComments");
  delete node.danglingComments;
  return danglingCommentParts;
}

function handleAnonymousBlockUnit(path, print) {
  // Unlike other compilation units, Anonymous Unit cannot have dangling comments,
  // so we don't have to handle them here.
  const parts = [];
  const memberParts = path.map(print, "members").filter((member) => member);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline]);
    }
    return memberDoc;
  });
  if (memberDocs.length > 0) {
    parts.push(...memberDocs);
  }
  return concat(parts);
}

function handleTriggerDeclarationUnit(path, print, options) {
  const usageDocs = path.map(print, "usages");
  const targetDocs = path.map(print, "target");
  const danglingCommentDocs = _getDanglingCommentDocs(path, print, options);

  const parts = [];
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
  usageParts.push(join(concat([",", line]), usageDocs));
  usageParts.push(dedent(softline));
  parts.push(groupIndentConcat(usageParts));

  parts.push(")");
  parts.push(" ");
  parts.push("{");
  const memberParts = path.map(print, "members").filter((member) => member);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline]);
    }
    return memberDoc;
  });
  if (danglingCommentDocs.length > 0) {
    parts.push(indent(concat([hardline, ...danglingCommentDocs])));
  } else if (memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
  }
  parts.push(dedent(concat([hardline, "}"])));
  return concat(parts);
}

function handleInterfaceDeclaration(path, print, options) {
  const node = path.getValue();

  const superInterface = path.call(print, "superInterface", "value");
  const modifierDocs = path.map(print, "modifiers");
  const memberParts = path.map(print, "members").filter((member) => member);
  const danglingCommentDocs = _getDanglingCommentDocs(path, print, options);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline]);
    }
    return memberDoc;
  });

  const parts = [];
  if (modifierDocs.length > 0) {
    parts.push(concat(modifierDocs));
  }
  parts.push("interface");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  if (node.typeArguments.value) {
    const typeArgumentParts = path.map(print, "typeArguments", "value");
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
    parts.push(indent(concat([hardline, ...danglingCommentDocs])));
  } else if (memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
  }
  parts.push(concat([hardline, "}"]));
  return concat(parts);
}

function handleClassDeclaration(path, print, options) {
  const node = path.getValue();

  const superClass = path.call(print, "superClass", "value");
  const modifierDocs = path.map(print, "modifiers");
  const memberParts = path.map(print, "members").filter((member) => member);
  const danglingCommentDocs = _getDanglingCommentDocs(path, print, options);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline]);
    }
    return memberDoc;
  });

  const parts = [];
  if (modifierDocs.length > 0) {
    parts.push(concat(modifierDocs));
  }
  parts.push("class");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  if (node.typeArguments.value) {
    const typeArgumentParts = path.map(print, "typeArguments", "value");
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
  const interfaces = path.map(print, "interfaces");
  if (interfaces.length > 0) {
    parts.push(" ");
    parts.push("implements");
    parts.push(" ");
    parts.push(join(", ", interfaces));
  }
  parts.push(" ");
  parts.push("{");
  if (danglingCommentDocs.length > 0) {
    parts.push(indent(concat([hardline, ...danglingCommentDocs])));
  } else if (memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
  }
  parts.push(concat([hardline, "}"]));
  return concat(parts);
}

function handleAnnotation(path, print) {
  const node = path.getValue();
  const parts = [];
  const trailingParts = [];
  const parameterParts = [];
  const parameterDocs = path.map(print, "parameters");
  if (node.comments) {
    // We print the comments manually because this method adds a hardline
    // at the end of the annotation. If we left it to Prettier to print trailing
    // comments it can lead to unstable formatting like this:
    // ```
    // @isTest
    // // Trailing Comment
    // void method() {}
    // ```
    path.each((innerPath) => {
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
  return concat(parts);
}

function handleAnnotationKeyValue(path, print) {
  const parts = [];
  parts.push(path.call(print, "key", "value"));
  parts.push("=");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleAnnotationValue(childClass, path, print) {
  const parts = [];
  switch (childClass) {
    case "TrueAnnotationValue":
      parts.push("true");
      break;
    case "FalseAnnotationValue":
      parts.push("false");
      break;
    case "StringAnnotationValue":
      parts.push("'");
      parts.push(path.call(print, "value"));
      parts.push("'");
      break;
    default:
      throw new Error(
        `AnnotationValue ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return concat(parts);
}

function handleAnnotationString(path, print) {
  const parts = [];
  parts.push("'");
  parts.push(path.call(print, "value"));
  parts.push("'");
  return concat(parts);
}

function handleClassTypeRef(path, print) {
  const parts = [];
  parts.push(join(".", path.map(print, "names")));
  const typeArgumentDocs = path.map(print, "typeArguments");
  if (typeArgumentDocs.length > 0) {
    parts.push("<");
    parts.push(join(", ", typeArgumentDocs));
    parts.push(">");
  }
  return concat(parts);
}

function handleArrayTypeRef(path, print) {
  const parts = [];
  parts.push(path.call(print, "heldType"));
  parts.push("[]");
  return concat(parts);
}

function handleJavaTypeRef(path, print) {
  const parts = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  return concat(parts);
}

function _handleStatementBlockMember(modifier) {
  return (path, print) => {
    const statementDoc = path.call(print, "stmnt");

    const parts = [];
    if (modifier) {
      parts.push(modifier);
      parts.push(" ");
    }
    _pushIfExist(parts, statementDoc);
    return concat(parts);
  };
}

function handlePropertyDeclaration(path, print) {
  const modifierDocs = path.map(print, "modifiers");
  const getterDoc = path.call(print, "getter", "value");
  const setterDoc = path.call(print, "setter", "value");

  const parts = [];
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
  _pushIfExist(innerParts, setterDoc, [dedent(line)]);
  parts.push(groupIndentConcat(innerParts));
  parts.push("}");
  return groupConcat(parts);
}

function _handlePropertyGetterSetter(action) {
  return (path, print) => {
    const statementDoc = path.call(print, "stmnt", "value");

    const parts = [];
    parts.push(path.call(print, "modifier", "value"));
    parts.push(action);
    if (statementDoc) {
      parts.push(" ");
      parts.push(statementDoc);
    } else {
      parts.push(";");
    }
    return concat(parts);
  };
}

function handleMethodDeclaration(path, print) {
  const statementDoc = path.call(print, "stmnt", "value");
  const modifierDocs = path.map(print, "modifiers");
  const parameterDocs = path.map(print, "parameters");

  const parts = [];
  const parameterParts = [];
  // Modifiers
  if (modifierDocs.length > 0) {
    parts.push(concat(modifierDocs));
  }
  // Return type
  _pushIfExist(parts, path.call(print, "type", "value"), [" "]);
  // Method name
  parts.push(path.call(print, "name"));
  // Params
  parts.push("(");
  if (parameterDocs.length > 0) {
    parameterParts.push(softline);
    parameterParts.push(join(concat([",", line]), parameterDocs));
    parameterParts.push(dedent(softline));
    parts.push(groupIndentConcat(parameterParts));
  }
  parts.push(")");
  // Body
  _pushIfExist(parts, statementDoc, null, [" "]);
  if (!statementDoc) {
    parts.push(";");
  }
  return concat(parts);
}

function handleModifierParameterRef(path, print) {
  const parts = [];
  // Modifiers
  parts.push(join("", path.map(print, "modifiers")));
  // Type
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  // Value
  parts.push(path.call(print, "name"));
  return concat(parts);
}

function handleEmptyModifierParameterRef(path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  // Value
  parts.push(path.call(print, "name"));
  return concat(parts);
}

function handleStatement(childClass, path, print) {
  let doc;
  switch (childClass) {
    case "DmlInsertStmnt":
      doc = "insert";
      break;
    case "DmlUpdateStmnt":
      doc = "update";
      break;
    case "DmlUpsertStmnt":
      doc = "upsert";
      break;
    case "DmlDeleteStmnt":
      doc = "delete";
      break;
    case "DmlUndeleteStmnt":
      doc = "undelete";
      break;
    default:
      throw new Error(
        `Statement ${childClass} is not supported. Please file a bug report.`,
      );
  }
  const node = path.getValue();
  const parts = [];
  parts.push(doc);
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  // upsert statement has an extra param that can be tacked on at the end
  if (node.id) {
    _pushIfExist(parts, path.call(print, "id", "value"), null, [indent(line)]);
  }
  parts.push(";");
  return groupConcat(parts);
}

function handleDmlMergeStatement(path, print) {
  const parts = [];
  parts.push("merge");
  parts.push(" ");
  parts.push(path.call(print, "expr1"));
  parts.push(line);
  parts.push(path.call(print, "expr2"));
  parts.push(";");
  return groupIndentConcat(parts);
}

function handleEnumDeclaration(path, print, options) {
  const modifierDocs = path.map(print, "modifiers");
  const memberDocs = path.map(print, "members");
  const danglingCommentDocs = _getDanglingCommentDocs(path, print, options);

  const parts = [];
  _pushIfExist(parts, join("", modifierDocs));
  parts.push("enum");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("{");
  if (danglingCommentDocs.length > 0) {
    parts.push(indent(concat([hardline, ...danglingCommentDocs])));
  } else if (memberDocs.length > 0) {
    parts.push(
      indent(concat([hardline, join(concat([",", hardline]), memberDocs)])),
    );
  }
  parts.push(concat([hardline, "}"]));
  return concat(parts);
}

function handleSwitchStatement(path, print) {
  const whenBlocks = path.map(print, "whenBlocks");

  const parts = [];
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

function handleValueWhen(path, print) {
  const whenCaseDocs = path.map(print, "whenCases");
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("when");
  parts.push(" ");
  const whenCaseGroup = group(indent(join(concat([",", line]), whenCaseDocs)));
  parts.push(whenCaseGroup);
  parts.push(" ");
  _pushIfExist(parts, statementDoc);
  return concat(parts);
}

function handleElseWhen(path, print) {
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("when");
  parts.push(" ");
  parts.push("else");
  parts.push(" ");
  _pushIfExist(parts, statementDoc);
  return concat(parts);
}

function handleTypeWhen(path, print) {
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("when");
  parts.push(" ");
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  _pushIfExist(parts, statementDoc);
  return concat(parts);
}

function handleEnumCase(path, print) {
  return join(".", path.map(print, "identifiers"));
}

function handleRunAsBlock(path, print) {
  const paramDocs = path.map(print, "inputParameters");
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("System.runAs");
  parts.push("(");
  parts.push(join(concat([",", line]), paramDocs));
  parts.push(")");
  parts.push(" ");
  _pushIfExist(parts, statementDoc);
  return concat(parts);
}

function handleBlockStatement(path, print, options) {
  const parts = [];
  const danglingCommentDocs = _getDanglingCommentDocs(path, print, options);
  const statementDocs = path.map(print, "stmnts");

  parts.push("{");
  if (danglingCommentDocs.length > 0) {
    parts.push(concat([hardline, ...danglingCommentDocs]));
  } else if (statementDocs.length > 0) {
    parts.push(hardline);
    parts.push(join(hardline, statementDocs));
  }
  parts.push(dedent(hardline));
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleTryCatchFinallyBlock(path, print) {
  const tryStatementDoc = path.call(print, "tryBlock");
  const catchBlockDocs = path.map(print, "catchBlocks");
  const finallyBlockDoc = path.call(print, "finallyBlock", "value");

  const parts = [];
  parts.push("try");
  parts.push(" ");
  _pushIfExist(parts, tryStatementDoc);
  if (catchBlockDocs.length > 0) {
    // Can't use _pushIfExist here because it doesn't check for Array type
    parts.push(" ");
    parts.push(join(" ", catchBlockDocs));
  }
  _pushIfExist(parts, finallyBlockDoc, null, [" "]);
  return concat(parts);
}

function handleCatchBlock(path, print) {
  const parts = [];
  parts.push("catch");
  parts.push(" ");
  parts.push("(");
  parts.push(path.call(print, "parameter"));
  parts.push(")");
  parts.push(" ");
  _pushIfExist(parts, path.call(print, "stmnt"));
  return concat(parts);
}

function handleFinallyBlock(path, print) {
  const parts = [];
  parts.push("finally");
  parts.push(" ");
  _pushIfExist(parts, path.call(print, "stmnt"));
  return concat(parts);
}

function handleVariableDeclarations(path, print) {
  const modifierDocs = path.map(print, "modifiers");

  const parts = [];
  // Modifiers
  parts.push(join("", modifierDocs));

  // Type
  parts.push(path.call(print, "type"));
  parts.push(" ");
  // Variable declarations
  const declarationDocs = path.map(print, "decls");
  if (declarationDocs.length > 1) {
    parts.push(indentConcat([join(concat([",", line]), declarationDocs)]));
    parts.push(";");
  } else if (declarationDocs.length === 1) {
    parts.push(concat([declarationDocs[0], ";"]));
  }
  return groupConcat(parts);
}

function handleVariableDeclaration(path, print) {
  const node = path.getValue();
  const parts = [];
  let resultDoc;

  parts.push(path.call(print, "name"));
  const assignmentDocs = path.call(print, "assignment", "value");
  if (assignmentDocs && isBinaryish(node.assignment.value)) {
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

function handleNewStandard(path, print) {
  const paramDocs = path.map(print, "inputParameters");
  const parts = [];
  // Type
  parts.push(path.call(print, "type"));
  // Params
  parts.push("(");
  if (paramDocs.length > 0) {
    parts.push(softline);
    parts.push(join(concat([",", line]), paramDocs));
    parts.push(dedent(softline));
  }
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNewKeyValue(path, print) {
  const keyValueDocs = path.map(print, "keyValues");

  const parts = [];
  parts.push(path.call(print, "type"));
  parts.push("(");
  if (keyValueDocs.length > 0) {
    parts.push(softline);
    parts.push(join(concat([",", line]), keyValueDocs));
    parts.push(dedent(softline));
  }
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNameValueParameter(path, print) {
  const node = path.getValue();

  const parts = [];
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
  return concat(parts);
}

function handleThisMethodCallExpression(path, print) {
  const parts = [];
  parts.push("this");
  parts.push("(");
  parts.push(softline);
  const paramDocs = path.map(print, "inputParameters");
  parts.push(join(concat([",", line]), paramDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleSuperMethodCallExpression(path, print) {
  const parts = [];
  parts.push("super");
  parts.push("(");
  parts.push(softline);
  const paramDocs = path.map(print, "inputParameters");
  parts.push(join(concat([",", line]), paramDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleMethodCallExpression(path, print) {
  const node = path.getValue();
  const parentNode = path.getParentNode();
  const nodeName = path.getName();
  const { dottedExpr } = node;
  const isParentDottedExpression = checkIfParentIsDottedExpression(path);
  const isDottedExpressionSoqlExpression =
    dottedExpr &&
    dottedExpr.value &&
    (dottedExpr.value["@class"] === apexTypes.SOQL_EXPRESSION ||
      (dottedExpr.value["@class"] === apexTypes.ARRAY_EXPRESSION &&
        dottedExpr.value.expr &&
        dottedExpr.value.expr["@class"] === apexTypes.SOQL_EXPRESSION));
  const isDottedExpressionThisVariableExpression =
    dottedExpr &&
    dottedExpr.value &&
    dottedExpr.value["@class"] === apexTypes.THIS_VARIABLE_EXPRESSION;
  const isDottedExpressionSuperVariableExpression =
    dottedExpr &&
    dottedExpr.value &&
    dottedExpr.value["@class"] === apexTypes.SUPER_VARIABLE_EXPRESSION;

  const dottedExpressionDoc = handleDottedExpression(path, print);
  const nameDocs = path.map(print, "names");
  const paramDocs = path.map(print, "inputParameters");

  const resultParamDoc =
    paramDocs.length > 0
      ? concat([
          softline,
          join(concat([",", line]), paramDocs),
          dedent(softline),
        ])
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
  let arrayIndexDoc = "";
  if (
    parentNode["@class"] === apexTypes.ARRAY_EXPRESSION &&
    nodeName === "expr"
  ) {
    path.callParent((innerPath) => {
      const withGroup = isParentDottedExpression || dottedExpressionDoc;

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
    resultDoc = concat([
      dottedExpressionDoc,
      methodCallChainDoc,
      "(",
      group(indent(resultParamDoc)),
      ")",
      arrayIndexDoc,
    ]);
  } else {
    // This means it is the highest level method call expression,
    // and we do need to group and indent the expressions in it, e.g:
    // a
    //   .b()
    //   .c()
    //   .d()  // <- this node here
    resultDoc = group(
      indent(
        concat([
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
      ),
    );
  }
  return resultDoc;
}

function handleJavaMethodCallExpression(path, print) {
  const parts = [];
  parts.push("java:");
  parts.push(join(".", path.map(print, "names")));
  parts.push("(");
  parts.push(softline);
  parts.push(join(concat([",", line]), path.map(print, "inputParameters")));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNestedExpression(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  return concat(parts);
}

function handleNewSetInit(path, print) {
  const parts = [];
  const expressionDoc = path.call(print, "expr", "value");

  // Type
  parts.push("Set");
  parts.push("<");
  parts.push(join(concat([",", " "]), path.map(print, "types")));
  parts.push(">");
  // Param
  parts.push("(");
  _pushIfExist(parts, expressionDoc, [dedent(softline)], [softline]);
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNewSetLiteral(path, print) {
  const valueDocs = path.map(print, "values");

  const parts = [];
  // Type
  parts.push("Set");
  parts.push("<");
  parts.push(join(concat([",", " "]), path.map(print, "types")));
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(line);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(line));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleNewListInit(path, print) {
  // We can declare lists in the following ways:
  // new Object[size];
  // new Object[] { value, ... };
  // new List<Object>(); // Provides AST consistency.
  // new List<Object>(size);

  // #262 - We use Object[size] if a literal number is provided.
  // We use List<Object>(param) otherwise.
  // This should provide compatibility for all known types without knowing
  // if the parameter is a variable (copy constructor) or literal size.

  const expressionDoc = path.call(print, "expr", "value");
  const parts = [];
  const typePart = path.map(print, "types");
  const hasLiteralNumberInitializer =
    (typePart.group || (typePart.length && typePart[0].parts.length < 4)) &&
    !Number.isNaN(parseInt(expressionDoc, 10));

  // Type
  if (!hasLiteralNumberInitializer) {
    parts.push("List<");
  }
  parts.push(join(".", typePart));
  if (!hasLiteralNumberInitializer) {
    parts.push(">");
  }
  // Param
  parts.push(hasLiteralNumberInitializer ? "[" : "(");
  _pushIfExist(parts, expressionDoc, [dedent(softline)], [softline]);
  parts.push(hasLiteralNumberInitializer ? "]" : ")");
  return groupIndentConcat(parts);
}

function handleNewMapInit(path, print) {
  const parts = [];
  const expressionDoc = path.call(print, "expr", "value");

  parts.push("Map");
  // Type
  parts.push("<");
  const typeDocs = path.map(print, "types");
  parts.push(join(", ", typeDocs));
  parts.push(">");
  parts.push("(");
  _pushIfExist(parts, expressionDoc, [dedent(softline)], [softline]);
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleNewMapLiteral(path, print) {
  const valueDocs = path.map(print, "pairs");

  const parts = [];
  // Type
  parts.push("Map");
  parts.push("<");
  parts.push(join(", ", path.map(print, "types")));
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(line);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(line));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleMapLiteralKeyValue(path, print) {
  const parts = [];
  parts.push(path.call(print, "key"));
  parts.push(" ");
  parts.push("=>");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleNewListLiteral(path, print) {
  const valueDocs = path.map(print, "values");

  const parts = [];
  // Type
  parts.push("List<");
  parts.push(join(".", path.map(print, "types")));
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(line);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(line));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleNewExpression(path, print) {
  const parts = [];
  parts.push("new");
  parts.push(" ");
  parts.push(path.call(print, "creator"));
  return concat(parts);
}

function handleIfElseBlock(path, print) {
  const node = path.getValue();
  const parts = [];
  const ifBlockDocs = path.map(print, "ifBlocks");
  const elseBlockDoc = path.call(print, "elseBlock", "value");
  // There are differences when we handle block vs expression statements in
  // if bodies and else body. For expression statement, we need to add a
  // hardline after a statement vs a space for block statement. For example:
  // if (a)
  //   b = 1;
  // else if (c) {
  //   b = 2;
  // }
  const ifBlockContainsBlockStatement = node.ifBlocks.map(
    (ifBlock) => ifBlock.stmnt["@class"] === apexTypes.BLOCK_STATEMENT,
  );

  ifBlockDocs.forEach((ifBlockDoc, index) => {
    if (index > 0) {
      parts.push(
        concat([
          ifBlockContainsBlockStatement[index - 1] ? " " : hardline,
          "else ",
        ]),
      );
    }
    parts.push(ifBlockDoc);
    // We also need to handle the last if block, since it might need to add
    // either a space or a hardline before the else block
    if (index === ifBlockDocs.length - 1 && elseBlockDoc) {
      parts.push(ifBlockContainsBlockStatement[index] ? " " : hardline);
    }
  });
  if (elseBlockDoc) {
    parts.push(elseBlockDoc);
  }
  return groupConcat(parts);
}

function handleIfBlock(path, print) {
  const statementType = path.call(print, "stmnt", "@class");
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  const conditionParts = [];
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
  if (statementType === apexTypes.BLOCK_STATEMENT) {
    parts.push(" ");
    _pushIfExist(parts, statementDoc);
  } else {
    _pushIfExist(parts, group(indent(concat([hardline, statementDoc]))));
  }
  return concat(parts);
}

function handleElseBlock(path, print) {
  const statementType = path.call(print, "stmnt", "@class");
  const statementDoc = path.call(print, "stmnt");

  const parts = [];
  parts.push("else");
  // Body block
  if (statementType === apexTypes.BLOCK_STATEMENT) {
    parts.push(" ");
    _pushIfExist(parts, statementDoc);
  } else {
    _pushIfExist(parts, group(indent(concat([hardline, statementDoc]))));
  }
  return concat(parts);
}

function handleTernaryExpression(path, print) {
  const parts = [];
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

function handleInstanceOfExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push("instanceof");
  parts.push(" ");
  parts.push(path.call(print, "type"));
  return concat(parts);
}

function handlePackageVersionExpression(path, print) {
  const parts = [];
  parts.push("Package.Version.");
  parts.push(path.call(print, "version"));
  return concat(parts);
}

function handleStructuredVersion(path, print) {
  const parts = [];
  parts.push(path.call(print, "major"));
  parts.push(".");
  parts.push(path.call(print, "minor"));
  return concat(parts);
}

function handleArrayExpression(path, print) {
  const node = path.getValue();
  const parts = [];
  const expressionDoc = path.call(print, "expr");
  // In certain situations we need to defer printing the [] part to be part of
  // the `expr` printing. Take a look at handleVariableExpression or
  // handleMethodCallExpression for example.
  if (
    node.expr &&
    (node.expr["@class"] === apexTypes.VARIABLE_EXPRESSION ||
      node.expr["@class"] === apexTypes.METHOD_CALL_EXPRESSION)
  ) {
    return expressionDoc;
  }
  // For the rest of the situations we can safely print the [index] as part
  // of the array expression group.
  parts.push(expressionDoc);
  parts.push(handleArrayExpressionIndex(path, print, /* withGroup */ true));
  return groupConcat(parts);
}

function handleCastExpression(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "type"));
  parts.push(")");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handleExpressionStatement(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(";");
  return concat(parts);
}

// SOSL
function handleSoslExpression(path, print) {
  const parts = [];
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "search"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleFindClause(path, print) {
  const parts = [];
  parts.push(indentConcat(["FIND", line, path.call(print, "search")]));
  return groupConcat(parts);
}

function handleFindValue(childClass, path, print) {
  let doc;
  switch (childClass) {
    case "FindString":
      doc = concat(["'", path.call(print, "value"), "'"]);
      break;
    case "FindExpr":
      doc = path.call(print, "expr");
      break;
    default:
      throw new Error(
        `FindValue ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return doc;
}

function handleInClause(path, print) {
  const parts = [];
  parts.push("IN");
  parts.push(" ");
  parts.push(path.call(print, "scope").toUpperCase());
  parts.push(" ");
  parts.push("FIELDS");
  return concat(parts);
}

function handleDivisionClause(path, print) {
  const parts = [];
  parts.push("WITH DIVISION = ");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleDivisionValue(childClass, path, print) {
  let doc;
  switch (childClass) {
    case "DivisionLiteral":
      doc = concat(["'", path.call(print, "literal"), "'"]);
      break;
    case "DivisionExpr":
      doc = path.call(print, "expr");
      break;
    default:
      throw new Error(
        `DivisionValue ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return doc;
}

function handleSearchWithClause(path, print) {
  const parts = [];
  parts.push("WITH");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(path.call(print, "value", "value"));
  return concat(parts);
}

function handleSearchWithClauseValue(childClass, path, print) {
  const parts = [];
  let valueDocs;
  switch (childClass) {
    case "SearchWithStringValue":
      valueDocs = path.map(print, "values");
      if (valueDocs.length === 1) {
        parts.push(" = ");
        parts.push(valueDocs[0]);
      } else {
        parts.push(" IN ");
        parts.push("(");
        parts.push(softline);
        parts.push(join(concat([",", line]), valueDocs));
        parts.push(dedent(softline));
        parts.push(")");
      }
      break;
    case "SearchWithTargetValue":
      parts.push("(");
      parts.push(path.call(print, "target"));
      parts.push(" = ");
      parts.push(path.call(print, "value"));
      parts.push(")");
      break;
    case "SearchWithTrueValue":
      parts.push(" = ");
      parts.push("true");
      break;
    case "SearchWithFalseValue":
      parts.push(" = ");
      parts.push("false");
      break;
    default:
      throw new Error(
        `SearchWithClauseValue ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return groupIndentConcat(parts);
}

function handleReturningClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat([
      "RETURNING",
      line,
      join(concat([",", line]), path.map(print, "exprs")),
    ]),
  );
  return groupConcat(parts);
}

function handleReturningExpression(path, print) {
  const selectDoc = path.call(print, "select", "value");

  const parts = [];
  parts.push(path.call(print, "name"));
  if (selectDoc) {
    parts.push("(");
    parts.push(path.call(print, "select", "value"));
    parts.push(")");
  }
  return groupConcat(parts);
}

function handleReturningSelectExpression(path, print) {
  const fieldDocs = path.map(print, "fields");

  const parts = [];
  parts.push(join(concat([",", line]), fieldDocs));

  _pushIfExist(parts, path.call(print, "where", "value"));
  _pushIfExist(parts, path.call(print, "using", "value"));
  _pushIfExist(parts, path.call(print, "orderBy", "value"));
  _pushIfExist(parts, path.call(print, "limit", "value"));
  _pushIfExist(parts, path.call(print, "offset", "value"));
  _pushIfExist(parts, path.call(print, "bind", "value"));
  return groupIndentConcat([softline, join(line, parts)]);
}

function handleSearch(path, print) {
  const withDocs = path.map(print, "withs");

  const parts = [];
  parts.push(path.call(print, "find"));
  _pushIfExist(parts, path.call(print, "in", "value"));
  _pushIfExist(parts, path.call(print, "returning", "value"));
  _pushIfExist(parts, path.call(print, "division", "value"));
  _pushIfExist(parts, path.call(print, "dataCategory", "value"));
  _pushIfExist(parts, path.call(print, "limit", "value"));
  _pushIfExist(parts, path.call(print, "updateStats", "value"));
  _pushIfExist(parts, path.call(print, "using", "value"));
  if (withDocs.length > 0) {
    parts.push(join(line, withDocs));
  }

  return join(line, parts);
}

// SOQL
function handleSoqlExpression(path, print) {
  const parts = [];
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "query"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
}

function handleSelectInnerQuery(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(softline);
  parts.push(path.call(print, "query"));
  parts.push(dedent(softline));
  parts.push(")");
  const aliasDoc = path.call(print, "alias", "value");
  _pushIfExist(parts, aliasDoc, null, [" "]);

  return groupIndentConcat(parts);
}

function handleWhereInnerExpression(path, print) {
  const parts = [];
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

function handleQuery(path, print) {
  const withIdentifierDocs = path.map(print, "withIdentifiers");
  const parts = [];
  parts.push(path.call(print, "select"));
  parts.push(path.call(print, "from"));
  _pushIfExist(parts, path.call(print, "where", "value"));
  _pushIfExist(parts, path.call(print, "with", "value"));
  if (withIdentifierDocs.length > 0) {
    parts.push(join(" ", withIdentifierDocs));
  }
  _pushIfExist(parts, path.call(print, "groupBy", "value"));
  _pushIfExist(parts, path.call(print, "orderBy", "value"));
  _pushIfExist(parts, path.call(print, "limit", "value"));
  _pushIfExist(parts, path.call(print, "offset", "value"));
  _pushIfExist(parts, path.call(print, "bind", "value"));
  _pushIfExist(parts, path.call(print, "tracking", "value"));
  _pushIfExist(parts, path.call(print, "updateStats", "value"));
  _pushIfExist(parts, path.call(print, "options", "value"));
  return join(line, parts);
}

function handleBindClause(path, print) {
  const expressionDocs = path.map(print, "exprs");
  const parts = [];
  parts.push("BIND");
  parts.push(" ");
  parts.push(join(", ", expressionDocs));
  return concat(parts);
}

function handleBindExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleCaseExpression(path, print) {
  const parts = [];
  const whenBranchDocs = path.map(print, "whenBranches");
  const elseBranchDoc = path.call(print, "elseBranch", "value");
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

function handleWhenExpression(path, print) {
  const parts = [];
  parts.push("WHEN");
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("THEN");
  parts.push(line);
  const identifierDocs = path.map(print, "identifiers");
  parts.push(join(concat([",", line]), identifierDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleElseExpression(path, print) {
  const parts = [];
  parts.push("ELSE");
  parts.push(" ");
  const identifierDocs = path.map(print, "identifiers");
  parts.push(join(concat([",", line]), identifierDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleColumnClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat([
      "SELECT",
      line,
      join(concat([",", line]), path.map(print, "exprs")),
    ]),
  );
  return groupConcat(parts);
}

function handleColumnExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  _pushIfExist(parts, path.call(print, "alias", "value"), null, [" "]);
  return groupConcat(parts);
}

function handleFieldIdentifier(path, print) {
  const parts = [];
  const entity = path.call(print, "entity", "value");
  if (entity) {
    parts.push(entity);
    parts.push(".");
  }
  parts.push(path.call(print, "field"));
  return concat(parts);
}

function handleField(path, print) {
  const functionOneDoc = path.call(print, "function1", "value");
  const functionTwoDoc = path.call(print, "function2", "value");

  const parts = [];
  _pushIfExist(parts, functionOneDoc, ["(", softline]);
  _pushIfExist(parts, functionTwoDoc, ["(", softline]);
  parts.push(path.call(print, "field"));
  if (functionOneDoc) {
    parts.push(dedent(softline));
    parts.push(")");
  }
  if (functionTwoDoc) {
    parts.push(dedent(softline));
    parts.push(")");
  }
  return groupConcat(parts);
}

function handleFromClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat(["FROM", line, join(", ", path.map(print, "exprs"))]),
  );
  return groupConcat(parts);
}

function handleFromExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "table"));
  _pushIfExist(parts, path.call(print, "alias", "value"), null, [" "]);
  _pushIfExist(
    parts,
    path.call(print, "using", "value"),
    [dedent(softline)],
    [line],
  );
  return groupIndentConcat(parts);
}

function handleWhereClause(path, print) {
  const parts = [];
  parts.push(indentConcat(["WHERE", line, path.call(print, "expr")]));
  return groupConcat(parts);
}

function handleSelectDistanceExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push(path.call(print, "alias", "value"));
  return groupConcat(parts);
}

function handleWhereDistanceExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "distance"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleDistanceFunctionExpression(path, print) {
  const parts = [];
  const distanceDocs = [];
  parts.push("DISTANCE");
  parts.push("(");
  parts.push(softline);
  distanceDocs.push(path.call(print, "field"));
  distanceDocs.push(path.call(print, "location"));
  distanceDocs.push(`'${path.call(print, "unit")}'`);
  parts.push(join(concat([",", line]), distanceDocs));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleGeolocationLiteral(path, print) {
  const parts = [];
  const childParts = [];
  parts.push("GEOLOCATION");
  parts.push("(");
  childParts.push(path.call(print, "latitude"));
  childParts.push(path.call(print, "longitude"));
  parts.push(join(concat([",", line]), childParts));
  parts.push(dedent(softline));
  parts.push(")");
  return groupIndentConcat(parts);
}

function handleWithValue(path, print) {
  const parts = [];
  parts.push("WITH");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handleWithDataCategories(path, print) {
  const parts = [];
  const categoryDocs = path.map(print, "categories");
  parts.push("WITH DATA CATEGORY");
  parts.push(line);
  parts.push(join(concat([line, "AND", " "]), categoryDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleDataCategory(path, print) {
  const parts = [];
  const categoryDocs = path.map(print, "categories").filter((doc) => doc);
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  if (categoryDocs.length > 1) {
    parts.push("(");
  }
  parts.push(softline);
  parts.push(join(concat([",", line]), categoryDocs));
  parts.push(dedent(softline));
  if (categoryDocs.length > 1) {
    parts.push(")");
  }
  return groupIndentConcat(parts);
}

function handleDataCategoryOperator(childClass) {
  return constants.DATA_CATEGORY[childClass];
}

function handleWhereCalcExpression(path, print) {
  const parts = [];
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

function handleWhereOperationExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  return groupConcat(parts);
}

function handleWhereOperationExpressions(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push("(");
  parts.push(
    indentConcat([
      softline,
      join(concat([",", line]), path.map(print, "expr")),
      dedent(softline),
    ]),
  );
  parts.push(")");
  return groupConcat(parts);
}

function escapeSoqlString(text, isInLikeExpression) {
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

function handleWhereQueryLiteral(childClass, path, print, options) {
  const node = path.getValue();
  const grandParentNode = path.getParentNode(1);

  let doc;
  const isInLikeExpression =
    grandParentNode &&
    grandParentNode.op &&
    grandParentNode.op["@class"] === constants.APEX_TYPES.QUERY_OPERATOR_LIKE;
  switch (childClass) {
    case "QueryString":
      // #340 - Query Strings have different properties than normal Apex strings,
      // so we have to handle them separately. They also behave differently
      // depending on whether they are in a LIKE expression vs other expressions.
      doc = concat([
        "'",
        escapeSoqlString(node.literal, isInLikeExpression),
        "'",
      ]);
      break;
    case "QueryNull":
      doc = "NULL";
      break;
    case "QueryTrue":
      doc = "TRUE";
      break;
    case "QueryFalse":
      doc = "FALSE";
      break;
    case "QueryNumber":
      doc = path.call(print, "literal", "$");
      break;
    case "QueryDateTime":
      doc = options.originalText.slice(node.loc.startIndex, node.loc.endIndex);
      break;
    case "QueryDateFormula":
      doc = path.call(print, "dateFormula");
      break;
    default:
      doc = path.call(print, "literal");
  }
  if (doc) {
    return doc;
  }
  return "";
}

function handleWhereCompoundExpression(path, print) {
  const node = path.getValue();
  const parentNode = path.getParentNode();
  const isNestedExpression =
    parentNode["@class"] === apexTypes.WHERE_COMPOUND_EXPRESSION ||
    parentNode["@class"] === apexTypes.WHERE_UNARY_EXPRESSION;
  const nodeOp = node.op["@class"];
  const isSamePrecedenceWithParent =
    parentNode.op && nodeOp === parentNode.op["@class"];

  const parts = [];

  if (isNestedExpression && !isSamePrecedenceWithParent) {
    parts.push("(");
  }
  const operatorDoc = path.call(print, "op");
  const expressionDocs = path.map(print, "expr");
  parts.push(join(concat([line, operatorDoc, " "]), expressionDocs));
  if (isNestedExpression && !isSamePrecedenceWithParent) {
    parts.push(")");
  }
  return concat(parts);
}

function handleWhereUnaryExpression(path, print) {
  const parentNode = path.getParentNode();
  const isNestedExpression =
    parentNode["@class"] === apexTypes.WHERE_COMPOUND_EXPRESSION ||
    parentNode["@class"] === apexTypes.WHERE_UNARY_EXPRESSION;
  const parts = [];
  if (isNestedExpression) {
    parts.push("(");
  }
  parts.push(path.call(print, "op"));
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  if (isNestedExpression) {
    parts.push(")");
  }
  return concat(parts);
}

function handleColonExpression(path, print) {
  const parts = [];
  parts.push(":");
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handleOrderByClause(path, print) {
  const parts = [];
  parts.push("ORDER BY");
  parts.push(
    indentConcat([line, join(concat([",", line]), path.map(print, "exprs"))]),
  );
  return groupConcat(parts);
}

function handleOrderByExpression(childClass, path, print) {
  const parts = [];
  let expressionField;
  switch (childClass) {
    case "OrderByDistance":
      expressionField = "distance";
      break;
    case "OrderByValue":
      expressionField = "field";
      break;
    default:
      throw new Error(
        `OrderBy ${childClass} is not supported. Please file a bug report.`,
      );
  }
  parts.push(path.call(print, expressionField));

  const orderDoc = path.call(print, "order");
  if (orderDoc) {
    parts.push(" ");
    parts.push(orderDoc);
  }
  const nullOrderDoc = path.call(print, "nullOrder");
  if (nullOrderDoc) {
    parts.push(" ");
    parts.push(nullOrderDoc);
  }
  return concat(parts);
}

function handleOrderOperation(childClass, path, print, opts) {
  const loc = opts.locStart(path.getValue());
  if (loc) {
    return constants.ORDER[childClass];
  }
  return "";
}

function handleNullOrderOperation(childClass, path, print, opts) {
  const loc = opts.locStart(path.getValue());
  if (loc) {
    return constants.ORDER_NULL[childClass];
  }
  return "";
}

function handleGroupByClause(path, print) {
  const expressionDocs = path.map(print, "exprs");
  const typeDoc = path.call(print, "type", "value");
  const havingDoc = path.call(print, "having", "value");

  const parts = [];
  parts.push("GROUP BY");
  if (typeDoc) {
    parts.push(" ");
    parts.push(typeDoc);
    parts.push("(");
    parts.push(softline);
  } else {
    parts.push(line);
  }
  parts.push(join(concat([",", line]), expressionDocs));
  parts.push(dedent(softline));
  if (typeDoc) {
    parts.push(")");
  }
  // #286 - HAVING is part of the GROUP BY node, however we want them to behave
  // like part a query node, because it makes sense to have it on the same
  // indentation as the GROUP BY node.
  if (havingDoc) {
    return concat([groupIndentConcat(parts), line, group(havingDoc)]);
  }
  return groupIndentConcat(parts);
}

function handleGroupByType(childClass) {
  let doc;
  switch (childClass) {
    case "GroupByRollUp":
      doc = "ROLLUP";
      break;
    case "GroupByCube":
      doc = "CUBE";
      break;
    default:
      throw new Error(
        `GroupByType ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return doc;
}

function handleHavingClause(path, print) {
  const parts = [];
  parts.push("HAVING");
  parts.push(line);
  parts.push(path.call(print, "expr"));
  return groupIndentConcat(parts);
}

function handleQueryUsingClause(path, print) {
  const expressionDocs = path.map(print, "exprs");
  const parts = [];
  parts.push("USING");
  parts.push(line);
  parts.push(join(concat([",", line]), expressionDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleUsingExpression(childClass, path, print) {
  let doc;
  switch (childClass) {
    case "Using":
      doc = concat([
        path.call(print, "name", "value"),
        " ",
        path.call(print, "field", "value"),
      ]);
      break;
    case "UsingEquals":
      doc = concat([
        path.call(print, "name", "value"),
        " = ",
        path.call(print, "field", "value"),
      ]);
      break;
    case "UsingId":
      doc = concat([
        path.call(print, "name"),
        "(",
        path.call(print, "id"),
        " = ",
        path.call(print, "field"),
        ")",
      ]);
      break;
    default:
      throw new Error(
        `UsingExpr ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return doc;
}

function handleTrackingType(childClass) {
  let doc;
  switch (childClass) {
    case "ForView":
      doc = "FOR VIEW";
      break;
    case "ForReference":
      doc = "FOR REFERENCE";
      break;
    default:
      throw new Error(
        `TrackingType ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return doc;
}

function handleQueryOption(childClass) {
  let doc;
  switch (childClass) {
    case "LockRows":
      doc = "FOR UPDATE";
      break;
    case "IncludeDeleted":
      doc = "ALL ROWS";
      break;
    default:
      throw new Error(
        `QueryOption ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return doc;
}

function handleUpdateStatsClause(path, print) {
  const optionDocs = path.map(print, "options");
  const parts = [];
  parts.push("UPDATE");
  parts.push(line);
  parts.push(join(concat([",", line]), optionDocs));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
}

function handleUpdateStatsOption(childClass) {
  let doc;
  switch (childClass) {
    case "UpdateTracking":
      doc = "TRACKING";
      break;
    case "UpdateViewStat":
      doc = "VIEWSTAT";
      break;
    default:
      throw new Error(
        `UpdateStatsOption ${childClass} is not supported. Please file a bug report.`,
      );
  }
  return doc;
}

function handleUsingType(path, print) {
  const parts = [];
  parts.push(path.call(print, "filter"));
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleModifier(childClass) {
  const modifierValue = constants.MODIFIER[childClass] || "";
  if (!modifierValue) {
    throw new Error(
      `Modifier ${childClass} is not supported. Please file a bug report.`,
    );
  }
  return concat([modifierValue, " "]);
}

function handlePostfixExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(path.call(print, "op"));
  return concat(parts);
}

function handlePrefixExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "op"));
  parts.push(path.call(print, "expr"));
  return concat(parts);
}

function handlePostfixOperator(path, print) {
  return constants.POSTFIX[path.call(print, "$")];
}

function handlePrefixOperator(path, print) {
  return constants.PREFIX[path.call(print, "$")];
}

function handleWhileLoop(path, print) {
  const node = path.getValue();
  const conditionDoc = path.call(print, "condition");

  const parts = [];
  parts.push("while");
  parts.push(" ");
  parts.push("(");
  // Condition
  parts.push(groupIndentConcat([softline, conditionDoc, dedent(softline)]));
  parts.push(")");
  if (!node.stmnt.value) {
    parts.push(";");
    return concat(parts);
  }
  // Body
  const statementDoc = path.call(print, "stmnt", "value");
  const statementType = path.call(print, "stmnt", "value", "@class");
  if (statementType === apexTypes.BLOCK_STATEMENT) {
    parts.push(" ");
    _pushIfExist(parts, statementDoc);
  } else {
    _pushIfExist(parts, group(indent(concat([hardline, statementDoc]))));
  }
  return concat(parts);
}

function handleDoLoop(path, print) {
  const statementDoc = path.call(print, "stmnt");
  const conditionDoc = path.call(print, "condition");

  const parts = [];
  parts.push("do");
  parts.push(" ");
  // Body
  _pushIfExist(parts, statementDoc);
  parts.push(" ");
  parts.push("while");
  parts.push(" ");
  parts.push("(");
  // Condition
  parts.push(groupIndentConcat([softline, conditionDoc, dedent(softline)]));
  parts.push(")");
  parts.push(";");
  return concat(parts);
}

function handleForLoop(path, print) {
  const node = path.getValue();
  const forControlDoc = path.call(print, "forControl");

  const parts = [];
  parts.push("for");
  parts.push(" ");
  parts.push("(");
  // For Control
  if (
    node.forControl &&
    node.forControl.init &&
    node.forControl.init.expr &&
    node.forControl.init.expr.value &&
    node.forControl.init.expr.value["@class"] === apexTypes.SOQL_EXPRESSION &&
    !willBreak(forControlDoc) // if there are breaks, e.g. comments, we need to be conservative and group them
  ) {
    parts.push(forControlDoc);
  } else {
    parts.push(groupIndentConcat([softline, forControlDoc, dedent(softline)]));
  }
  parts.push(")");
  if (!node.stmnt.value) {
    parts.push(";");
    return concat(parts);
  }
  // Body
  const statementType = path.call(print, "stmnt", "value", "@class");
  const statementDoc = path.call(print, "stmnt", "value");
  if (statementType === apexTypes.BLOCK_STATEMENT) {
    parts.push(" ");
    _pushIfExist(parts, statementDoc);
  } else {
    _pushIfExist(parts, group(indent(concat([hardline, statementDoc]))));
  }
  return concat(parts);
}

function handleForEnhancedControl(path, print) {
  // See the note in handleForInit to see why we have to do this
  const initDocParts = path.call(print, "init");
  const initDoc = join(concat([" ", ":", " "]), initDocParts);

  const parts = [];
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(initDoc);
  return concat(parts);
}

function handleForCStyleControl(path, print) {
  const initsDoc = path.call(print, "inits", "value");
  const conditionDoc = path.call(print, "condition", "value");
  const controlDoc = path.call(print, "control", "value");

  const parts = [];
  _pushIfExist(parts, initsDoc);
  parts.push(";");
  _pushIfExist(parts, conditionDoc, null, [line]);
  parts.push(";");
  _pushIfExist(parts, controlDoc, null, [line]);
  return groupConcat(parts);
}

function handleForInits(path, print) {
  const typeDoc = path.call(print, "type", "value");
  const initDocsParts = path.map(print, "inits");

  // See the note in handleForInit to see why we have to do this
  // In this situation:
  // for (Integer i; i < 4; i++) {}
  // the second element of initDocParts is null, and so we do not want to add the initialization in
  const initDocs = initDocsParts.map((initDocParts) =>
    initDocParts[1]
      ? join(concat([" ", "=", " "]), initDocParts)
      : initDocParts[0],
  );

  const parts = [];
  _pushIfExist(parts, typeDoc, [" "]);
  parts.push(join(concat([",", line]), initDocs));
  return groupIndentConcat(parts);
}

function handleForInit(path, print) {
  // This is one of the weird cases that does not really match the way that we print things.
  // ForInit is used by both C style for loop and enhanced for loop, and there's no way to tell
  // which operator we should use for init in this context, for example:
  // for (Integer i = [SELECT COUNT() FROM Contact; i++; i < 10)
  // and
  // for (Contact a: [SELECT Id FROM Contact])
  // have very little differentiation from the POV of the ForInit handler.
  // Therefore, we'll return 2 docs here so the parent can decide what operator to insert between them.
  const nameDocs = path.map(print, "name");

  const parts = [];
  parts.push(join(".", nameDocs));
  parts.push(path.call(print, "expr", "value"));
  return parts;
}

const nodeHandler = {};
nodeHandler[apexTypes.IF_ELSE_BLOCK] = handleIfElseBlock;
nodeHandler[apexTypes.IF_BLOCK] = handleIfBlock;
nodeHandler[apexTypes.ELSE_BLOCK] = handleElseBlock;
nodeHandler[apexTypes.EXPRESSION_STATEMENT] = handleExpressionStatement;
nodeHandler[apexTypes.RETURN_STATEMENT] = handleReturnStatement;
nodeHandler[apexTypes.TRIGGER_USAGE] = (path, print) =>
  constants.TRIGGER_USAGE[path.call(print, "$")];
nodeHandler[apexTypes.JAVA_TYPE_REF] = handleJavaTypeRef;
nodeHandler[apexTypes.CLASS_TYPE_REF] = handleClassTypeRef;
nodeHandler[apexTypes.ARRAY_TYPE_REF] = handleArrayTypeRef;
nodeHandler[apexTypes.LOCATION_IDENTIFIER] = _handlePassthroughCall("value");
nodeHandler[apexTypes.MODIFIER_PARAMETER_REF] = handleModifierParameterRef;
nodeHandler[apexTypes.EMPTY_MODIFIER_PARAMETER_REF] =
  handleEmptyModifierParameterRef;
nodeHandler[apexTypes.BLOCK_STATEMENT] = handleBlockStatement;
nodeHandler[apexTypes.VARIABLE_DECLARATION_STATEMENT] =
  _handlePassthroughCall("variableDecls");
nodeHandler[apexTypes.VARIABLE_DECLARATIONS] = handleVariableDeclarations;
nodeHandler[apexTypes.NAME_VALUE_PARAMETER] = handleNameValueParameter;
nodeHandler[apexTypes.ANNOTATION] = handleAnnotation;
nodeHandler[apexTypes.ANNOTATION_KEY_VALUE] = handleAnnotationKeyValue;
nodeHandler[apexTypes.ANNOTATION_VALUE] = handleAnnotationValue;
nodeHandler[apexTypes.ANNOTATION_STRING] = handleAnnotationString;
nodeHandler[apexTypes.MODIFIER] = handleModifier;
nodeHandler[apexTypes.RUN_AS_BLOCK] = handleRunAsBlock;
nodeHandler[apexTypes.DO_LOOP] = handleDoLoop;
nodeHandler[apexTypes.WHILE_LOOP] = handleWhileLoop;
nodeHandler[apexTypes.FOR_LOOP] = handleForLoop;
nodeHandler[apexTypes.FOR_C_STYLE_CONTROL] = handleForCStyleControl;
nodeHandler[apexTypes.FOR_ENHANCED_CONTROL] = handleForEnhancedControl;
nodeHandler[apexTypes.FOR_INITS] = handleForInits;
nodeHandler[apexTypes.FOR_INIT] = handleForInit;
nodeHandler[apexTypes.BREAK_STATEMENT] = () => "break;";
nodeHandler[apexTypes.CONTINUE_STATEMENT] = () => "continue;";
nodeHandler[apexTypes.THROW_STATEMENT] = (path, print) =>
  concat(["throw", " ", path.call(print, "expr"), ";"]);
nodeHandler[apexTypes.TRY_CATCH_FINALLY_BLOCK] = handleTryCatchFinallyBlock;
nodeHandler[apexTypes.CATCH_BLOCK] = handleCatchBlock;
nodeHandler[apexTypes.FINALLY_BLOCK] = handleFinallyBlock;
nodeHandler[apexTypes.STATEMENT] = handleStatement;
nodeHandler[apexTypes.DML_MERGE_STATEMENT] = handleDmlMergeStatement;
nodeHandler[apexTypes.SWITCH_STATEMENT] = handleSwitchStatement;
nodeHandler[apexTypes.VALUE_WHEN] = handleValueWhen;
nodeHandler[apexTypes.ELSE_WHEN] = handleElseWhen;
nodeHandler[apexTypes.TYPE_WHEN] = handleTypeWhen;
nodeHandler[apexTypes.ENUM_CASE] = handleEnumCase;
nodeHandler[apexTypes.LITERAL_CASE] = _handlePassthroughCall("expr");
nodeHandler[apexTypes.PROPERTY_DECLATION] = handlePropertyDeclaration;
nodeHandler[apexTypes.PROPERTY_GETTER] = _handlePropertyGetterSetter("get");
nodeHandler[apexTypes.PROPERTY_SETTER] = _handlePropertyGetterSetter("set");
nodeHandler[apexTypes.STRUCTURED_VERSION] = handleStructuredVersion;
nodeHandler[apexTypes.REQUEST_VERSION] = () => "Request";
nodeHandler.int = (path, print) => path.call(print, "$");
nodeHandler.string = (path, print) => concat(["'", path.call(print, "$"), "'"]);

// Operator
nodeHandler[apexTypes.ASSIGNMENT_OPERATOR] = handleAssignmentOperation;
nodeHandler[apexTypes.BINARY_OPERATOR] = handleBinaryOperation;
nodeHandler[apexTypes.BOOLEAN_OPERATOR] = handleBooleanOperation;
nodeHandler[apexTypes.POSTFIX_OPERATOR] = handlePostfixOperator;
nodeHandler[apexTypes.PREFIX_OPERATOR] = handlePrefixOperator;

// Declaration
nodeHandler[apexTypes.CLASS_DECLARATION] = handleClassDeclaration;
nodeHandler[apexTypes.INTERFACE_DECLARATION] = handleInterfaceDeclaration;
nodeHandler[apexTypes.METHOD_DECLARATION] = handleMethodDeclaration;
nodeHandler[apexTypes.VARIABLE_DECLARATION] = handleVariableDeclaration;
nodeHandler[apexTypes.ENUM_DECLARATION] = handleEnumDeclaration;

// Compilation Unit: we're not handling  InvalidDeclUnit
nodeHandler[apexTypes.TRIGGER_DECLARATION_UNIT] = handleTriggerDeclarationUnit;
nodeHandler[apexTypes.CLASS_DECLARATION_UNIT] = _handlePassthroughCall("body");
nodeHandler[apexTypes.ENUM_DECLARATION_UNIT] = _handlePassthroughCall("body");
nodeHandler[apexTypes.INTERFACE_DECLARATION_UNIT] =
  _handlePassthroughCall("body");
nodeHandler[apexTypes.ANONYMOUS_BLOCK_UNIT] = handleAnonymousBlockUnit;

// Block Member
nodeHandler[apexTypes.PROPERTY_MEMBER] = _handlePassthroughCall("propertyDecl");
nodeHandler[apexTypes.FIELD_MEMBER] = _handlePassthroughCall("variableDecls");
nodeHandler[apexTypes.STATEMENT_BLOCK_MEMBER] = _handleStatementBlockMember();
nodeHandler[apexTypes.STATIC_STATEMENT_BLOCK_MEMBER] =
  _handleStatementBlockMember("static");
nodeHandler[apexTypes.METHOD_MEMBER] = _handlePassthroughCall("methodDecl");
nodeHandler[apexTypes.INNER_CLASS_MEMBER] = _handlePassthroughCall("body");
nodeHandler[apexTypes.INNER_ENUM_MEMBER] = _handlePassthroughCall("body");
nodeHandler[apexTypes.INNER_INTERFACE_MEMBER] = _handlePassthroughCall("body");

// Expression
nodeHandler[apexTypes.TERNARY_EXPRESSION] = handleTernaryExpression;
nodeHandler[apexTypes.BOOLEAN_EXPRESSION] = handleBinaryishExpression;
nodeHandler[apexTypes.ASSIGNMENT_EXPRESSION] = handleAssignmentExpression;
nodeHandler[apexTypes.NESTED_EXPRESSION] = handleNestedExpression;
nodeHandler[apexTypes.VARIABLE_EXPRESSION] = handleVariableExpression;
nodeHandler[apexTypes.JAVA_VARIABLE_EXPRESSION] = handleJavaVariableExpression;
nodeHandler[apexTypes.LITERAL_EXPRESSION] = handleLiteralExpression;
nodeHandler[apexTypes.BINARY_EXPRESSION] = handleBinaryishExpression;
nodeHandler[apexTypes.TRIGGER_VARIABLE_EXPRESSION] = (path, print) =>
  concat(["Trigger", ".", path.call(print, "variable")]);
nodeHandler[apexTypes.NEW_EXPRESSION] = handleNewExpression;
nodeHandler[apexTypes.METHOD_CALL_EXPRESSION] = handleMethodCallExpression;
nodeHandler[apexTypes.JAVA_METHOD_CALL_EXPRESSION] =
  handleJavaMethodCallExpression;
nodeHandler[apexTypes.THIS_VARIABLE_EXPRESSION] = () => "this";
nodeHandler[apexTypes.SUPER_VARIABLE_EXPRESSION] = () => "super";
nodeHandler[apexTypes.POSTFIX_EXPRESSION] = handlePostfixExpression;
nodeHandler[apexTypes.PREFIX_EXPRESSION] = handlePrefixExpression;
nodeHandler[apexTypes.CAST_EXPRESSION] = handleCastExpression;
nodeHandler[apexTypes.INSTANCE_OF_EXPRESSION] = handleInstanceOfExpression;
nodeHandler[apexTypes.PACKAGE_VERSION_EXPRESSION] =
  handlePackageVersionExpression;
nodeHandler[apexTypes.ARRAY_EXPRESSION] = handleArrayExpression;
nodeHandler[apexTypes.CLASS_REF_EXPRESSION] = (path, print) =>
  concat([path.call(print, "type"), ".", "class"]);
nodeHandler[apexTypes.THIS_METHOD_CALL_EXPRESSION] =
  handleThisMethodCallExpression;
nodeHandler[apexTypes.SUPER_METHOD_CALL_EXPRESSION] =
  handleSuperMethodCallExpression;
nodeHandler[apexTypes.SOQL_EXPRESSION] = handleSoqlExpression;
nodeHandler[apexTypes.SOSL_EXPRESSION] = handleSoslExpression;

// New Object Init
nodeHandler[apexTypes.NEW_SET_INIT] = handleNewSetInit;
nodeHandler[apexTypes.NEW_SET_LITERAL] = handleNewSetLiteral;
nodeHandler[apexTypes.NEW_LIST_INIT] = handleNewListInit;
nodeHandler[apexTypes.NEW_MAP_INIT] = handleNewMapInit;
nodeHandler[apexTypes.NEW_MAP_LITERAL] = handleNewMapLiteral;
nodeHandler[apexTypes.MAP_LITERAL_KEY_VALUE] = handleMapLiteralKeyValue;
nodeHandler[apexTypes.NEW_LIST_LITERAL] = handleNewListLiteral;
nodeHandler[apexTypes.NEW_STANDARD] = handleNewStandard;
nodeHandler[apexTypes.NEW_KEY_VALUE] = handleNewKeyValue;

// SOSL
nodeHandler[apexTypes.SEARCH] = handleSearch;
nodeHandler[apexTypes.FIND_CLAUSE] = handleFindClause;
nodeHandler[apexTypes.FIND_VALUE] = handleFindValue;
nodeHandler[apexTypes.IN_CLAUSE] = handleInClause;
nodeHandler[apexTypes.WITH_DIVISION_CLAUSE] = handleDivisionClause;
nodeHandler[apexTypes.DIVISION_VALUE] = handleDivisionValue;
nodeHandler[apexTypes.WITH_DATA_CATEGORY_CLAUSE] = handleWithDataCategories;
nodeHandler[apexTypes.SEARCH_WITH_CLAUSE] = handleSearchWithClause;
nodeHandler[apexTypes.SEARCH_WITH_CLAUSE_VALUE] = handleSearchWithClauseValue;
nodeHandler[apexTypes.RETURNING_CLAUSE] = handleReturningClause;
nodeHandler[apexTypes.RETURNING_EXPRESSION] = handleReturningExpression;
nodeHandler[apexTypes.RETURNING_SELECT_EXPRESSION] =
  handleReturningSelectExpression;

// SOQL
nodeHandler[apexTypes.QUERY] = handleQuery;
nodeHandler[apexTypes.SELECT_COLUMN_CLAUSE] = handleColumnClause;
nodeHandler[apexTypes.SELECT_COUNT_CLAUSE] = () =>
  concat(["SELECT", " ", "COUNT()"]);
nodeHandler[apexTypes.SELECT_COLUMN_EXPRESSION] = handleColumnExpression;
nodeHandler[apexTypes.SELECT_INNER_QUERY] = handleSelectInnerQuery;
nodeHandler[apexTypes.SELECT_CASE_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexTypes.CASE_EXPRESSION] = handleCaseExpression;
nodeHandler[apexTypes.WHEN_OPERATOR] = _handlePassthroughCall("identifier");
nodeHandler[apexTypes.WHEN_EXPRESSION] = handleWhenExpression;
nodeHandler[apexTypes.CASE_OPERATOR] = _handlePassthroughCall("identifier");
nodeHandler[apexTypes.ELSE_EXPRESSION] = handleElseExpression;
nodeHandler[apexTypes.FIELD] = handleField;
nodeHandler[apexTypes.FIELD_IDENTIFIER] = handleFieldIdentifier;
nodeHandler[apexTypes.FROM_CLAUSE] = handleFromClause;
nodeHandler[apexTypes.FROM_EXPRESSION] = handleFromExpression;
nodeHandler[apexTypes.GROUP_BY_CLAUSE] = handleGroupByClause;
nodeHandler[apexTypes.GROUP_BY_EXPRESSION] = _handlePassthroughCall("field");
nodeHandler[apexTypes.GROUP_BY_TYPE] = handleGroupByType;
nodeHandler[apexTypes.HAVING_CLAUSE] = handleHavingClause;
nodeHandler[apexTypes.WHERE_CLAUSE] = handleWhereClause;
nodeHandler[apexTypes.WHERE_INNER_EXPRESSION] = handleWhereInnerExpression;
nodeHandler[apexTypes.WHERE_OPERATION_EXPRESSION] =
  handleWhereOperationExpression;
nodeHandler[apexTypes.WHERE_OPERATION_EXPRESSIONS] =
  handleWhereOperationExpressions;
nodeHandler[apexTypes.WHERE_COMPOUND_EXPRESSION] =
  handleWhereCompoundExpression;
nodeHandler[apexTypes.WHERE_UNARY_EXPRESSION] = handleWhereUnaryExpression;
nodeHandler[apexTypes.WHERE_UNARY_OPERATOR] = () => "NOT";
nodeHandler[apexTypes.SELECT_DISTANCE_EXPRESSION] =
  handleSelectDistanceExpression;
nodeHandler[apexTypes.WHERE_DISTANCE_EXPRESSION] =
  handleWhereDistanceExpression;
nodeHandler[apexTypes.DISTANCE_FUNCTION_EXPRESSION] =
  handleDistanceFunctionExpression;
nodeHandler[apexTypes.GEOLOCATION_LITERAL] = handleGeolocationLiteral;
nodeHandler[apexTypes.NUMBER_LITERAL] = _handlePassthroughCall("number", "$");
nodeHandler[apexTypes.NUMBER_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexTypes.QUERY_LITERAL_EXPRESSION] =
  _handlePassthroughCall("literal");
nodeHandler[apexTypes.QUERY_LITERAL] = handleWhereQueryLiteral;
nodeHandler[apexTypes.APEX_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexTypes.COLON_EXPRESSION] = handleColonExpression;
nodeHandler[apexTypes.ORDER_BY_CLAUSE] = handleOrderByClause;
nodeHandler[apexTypes.ORDER_BY_EXPRESSION] = handleOrderByExpression;
nodeHandler[apexTypes.WITH_VALUE] = handleWithValue;
nodeHandler[apexTypes.WITH_DATA_CATEGORIES] = handleWithDataCategories;
nodeHandler[apexTypes.DATA_CATEGORY] = handleDataCategory;
nodeHandler[apexTypes.DATA_CATEGORY_OPERATOR] = handleDataCategoryOperator;
nodeHandler[apexTypes.LIMIT_VALUE] = (path, print) =>
  concat(["LIMIT", " ", path.call(print, "i")]);
nodeHandler[apexTypes.LIMIT_EXPRESSION] = (path, print) =>
  concat(["LIMIT", " ", path.call(print, "expr")]);
nodeHandler[apexTypes.OFFSET_VALUE] = (path, print) =>
  concat(["OFFSET", " ", path.call(print, "i")]);
nodeHandler[apexTypes.OFFSET_EXPRESSION] = (path, print) =>
  concat(["OFFSET", " ", path.call(print, "expr")]);
nodeHandler[apexTypes.QUERY_OPERATOR] = (childClass) =>
  constants.QUERY[childClass];
nodeHandler[apexTypes.SOQL_ORDER] = handleOrderOperation;
nodeHandler[apexTypes.SOQL_ORDER_NULL] = handleNullOrderOperation;
nodeHandler[apexTypes.TRACKING_TYPE] = handleTrackingType;
nodeHandler[apexTypes.QUERY_OPTION] = handleQueryOption;
nodeHandler[apexTypes.QUERY_USING_CLAUSE] = handleQueryUsingClause;
nodeHandler[apexTypes.USING_EXPRESSION] = handleUsingExpression;
nodeHandler[apexTypes.UPDATE_STATS_CLAUSE] = handleUpdateStatsClause;
nodeHandler[apexTypes.UPDATE_STATS_OPTION] = handleUpdateStatsOption;
nodeHandler[apexTypes.WHERE_CALC_EXPRESSION] = handleWhereCalcExpression;
nodeHandler[apexTypes.WHERE_CALC_OPERATOR_PLUS] = () => "+";
nodeHandler[apexTypes.WHERE_CALC_OPERATOR_MINUS] = () => "-";
nodeHandler[apexTypes.WHERE_COMPOUND_OPERATOR] = (childClass) =>
  constants.QUERY_WHERE[childClass];
nodeHandler[apexTypes.SEARCH_USING_CLAUSE] = (path, print) =>
  concat(["USING", " ", path.call(print, "type")]);
nodeHandler[apexTypes.USING_TYPE] = handleUsingType;
nodeHandler[apexTypes.BIND_CLAUSE] = handleBindClause;
nodeHandler[apexTypes.BIND_EXPRESSION] = handleBindExpression;
nodeHandler[apexTypes.WITH_IDENTIFIER] = (path, print) =>
  concat(["WITH", " ", path.call(print, "identifier")]);

function handleTrailingEmptyLines(doc, node) {
  let insertNewLine = false;
  if (node && node.trailingEmptyLine) {
    if (node.comments) {
      const trailingComments = getTrailingComments(node);
      if (trailingComments.length === 0) {
        insertNewLine = true;
      } else {
        trailingComments[trailingComments.length - 1].trailingEmptyLine = true;
      }
    } else {
      insertNewLine = true;
    }
  }
  if (insertNewLine) {
    return concat([doc, hardline]);
  }
  return doc;
}

function genericPrint(path, options, print) {
  const n = path.getValue();
  if (typeof n === "number" || typeof n === "boolean") {
    return n.toString();
  }
  if (typeof n === "string") {
    return _escapeString(n);
  }
  if (!n) {
    return "";
  }
  const apexClass = n["@class"];
  if (path.stack.length === 1) {
    // Hard code how to handle the root node here
    const docs = [];
    docs.push(path.call(print, apexTypes.PARSER_OUTPUT, "unit"));
    // Optionally, adding a hardline as the last thing in the document
    if (options.apexInsertFinalNewline) {
      docs.push(hardline);
    }

    return concat(docs);
  }
  if (!apexClass) {
    return "";
  }
  if (apexClass in nodeHandler) {
    return nodeHandler[apexClass](path, print, options);
  }
  const separatorIndex = apexClass.indexOf("$");
  if (separatorIndex !== -1) {
    const parentClass = apexClass.substring(0, separatorIndex);
    const childClass = apexClass.substring(separatorIndex + 1);
    if (parentClass in nodeHandler) {
      return nodeHandler[parentClass](childClass, path, print, options);
    }
  }
  throw new Error(
    `No handler found for ${apexClass}. Please file a bug report.`,
  );
}

let options;
module.exports = function printGenerically(path, opts, print) {
  if (typeof opts === "object") {
    options = opts;
  }
  const node = path.getValue();
  const doc = genericPrint(path, options, print);
  return handleTrailingEmptyLines(doc, node);
};
