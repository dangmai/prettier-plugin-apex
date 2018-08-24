"use strict";

const docBuilders = require("prettier").doc.builders;
const {concat, join, hardline, line, softline, literalline, group, indent, dedent, ifBreak, breakParent} = docBuilders;

const expressions = require("./expressions");
const classes = require("./classes");

function indentConcat(docs) {
  return indent(concat(docs));
}

function groupConcat(docs) {
  return group(concat(docs));
}

function handleReturnStatement(_, path, print) {
  const docs = [];
  docs.push("return");
  const childDocs = path.call(print, "expr", "value");
  if (childDocs) {
    docs.push(" ");
    docs.push(childDocs);
  }
  docs.push(";");
  return concat(docs);
}

function handleBinaryExpression(_, path, print) {
  const docs = [];
  const leftDoc = path.call(print, "left");
  const operationDoc = path.call(print, "op");
  const rightDoc = path.call(print, "right");
  docs.push(leftDoc);
  docs.push(" ");
  docs.push(operationDoc);
  docs.push(" ");
  docs.push(rightDoc);
  return concat(docs);
}

// TODO Fix cases with parentheses
function handleBooleanExpression(_, path, print) {
  const docs = [];
  const leftDoc = path.call(print, "left");
  const operationDoc = path.call(print, "op");
  const rightDoc = path.call(print, "right");
  docs.push(leftDoc);
  docs.push(" ");
  docs.push(operationDoc);
  docs.push(" ");
  docs.push(rightDoc);
  return concat(docs);
}

function handleVariableExpression(_, path, print) {
  const parts = [];
  const dottedExpressionDoc = path.call(print, "dottedExpr", "value");
  if (dottedExpressionDoc) {
    parts.push(dottedExpressionDoc);
    parts.push(".");
  }
  // Name chain
  const nameDocs = path.map(print, "names");
  parts.push(join(".", nameDocs));
  return concat(parts);
}

function handleLiteralExpression(node, path, print) {
  const literalDoc = path.call(print, "literal", "$");
  if (node.type["$"] === "STRING") {
    return concat(["'", literalDoc, "'"]);
  }
  return literalDoc;
}

function handleBinaryOperation(node) {
  return expressions.BINARY[node["$"]];
}

function handleBooleanOperation(node) {
  return expressions.BOOLEAN[node["$"]];
}

function printMethodCallExpression(node, children, path, print) {
  const docs = [];
  const dottedExpression = node.reference.dottedExpression;
  if (dottedExpression) {
    // 2 branches:
    // 1st: this expression
    if (dottedExpression["$"].class === classes.THIS_VARIABLE_EXPRESSION) {
      docs.push("this");
    } else {
      // 2nd: named expression
      const names = node.reference.names;
      if (names && names.elements && names.elements[classes.LOCATION_IDENTIFIER]) {
        docs.push(names.elements[classes.LOCATION_IDENTIFIER].value);
      }
    }
    docs.push(".");
  }
  docs.push(node.name.value);
  const params = [];
  params.push("(");
  params.push(join(", ", printChildNodes(children, path, print)));
  params.push(")");
  return concat([...docs, group(concat(params))]);
}

function handleClassDeclaration(_, path, print) {
  const parts = [];
  const modifierDocs = path.map(print, "modifiers");
  if (modifierDocs.length > 0) {
    parts.push(concat(modifierDocs));
  }
  parts.push("class");
  parts.push(" ");
  parts.push(path.call(print, "name", "value"));
  const superClass = path.call(print, "superClass", "value");
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
  const memberParts = path.map(print, "members").filter(member => member);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline, hardline])
    }
    return memberDoc;
  });
  if(memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
    parts.push(dedent(concat([hardline, "}"])));
  } else {
    parts.push("}");
  }
  return concat(parts);
}

function handleAnnotation(_, path, print) {
  const parts = [];
  parts.push("@");
  parts.push(path.call(print, "name", "value"));
  const parameterDocs = path.map(print, "parameters");
  if (parameterDocs.length > 0) {
    parts.push("(");
    parts.push(join(", ", parameterDocs));
    parts.push(")");
  }
  parts.push(hardline);
  return concat(parts);
}

function handleAnnotationKeyValue(_, path, print) {
  const parts = [];
  parts.push(path.call(print, "key", "value"));
  parts.push("=");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleClassTypeRef(_, path, print) {
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

function handleArrayTypeRef(_, path, print) {
  const parts = [];
  parts.push(path.call(print, "heldType"));
  parts.push("[]");
  return concat(parts);
}

function handleLocationIdentifier(_, path, print) {
  return path.call(print, "value");
}

function handleInnerClassMember(_, path, print) {
  return path.call(print, "body");
}

function handleMethodMember(_, path, print) {
  return path.call(print, "methodDecl");
}

function handleMethodDeclaration(_, path, print) {
  const parts = [];
  // Modifiers
  const modifierDocs = path.map(print, "modifiers");
  if (modifierDocs.length > 0) {
    parts.push(concat(modifierDocs));
  }
  // Return type
  parts.push(path.call(print, "type", "value"));
  parts.push(" ");
  // Method name
  parts.push(path.call(print, "name"));
  // Params
  parts.push("(");
  const parameterDocs = path.map(print, "parameters");
  parts.push(join(", ", parameterDocs));
  parts.push(")");
  parts.push(" ");
  // Body
  parts.push("{");
  parts.push(path.call(print, "stmnt", "value"));
  parts.push("}");
  return concat(parts);
}

function handleEmptyModifierParameterRef(_, path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  // Value
  parts.push(path.call(print, "name"));
  return concat(parts);
}

function handleBlockStatement(_, path, print) {
  const statementDocs = path.map(print, "stmnts");
  if (statementDocs.length > 0) {
    return indentConcat(
      [
        hardline,
        join(
          hardline,
          statementDocs
        ),
        dedent(hardline),
      ]
    );
  }
  return "";
}

function handleVariableDeclarationStatement(_, path, print) {
  return path.call(print, "variableDecls");
}

function handleVariableDeclarations(_, path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "type"));
  parts.push(" ");
  // Variable declarations
  const declarationDocs = path.map(print, "decls");
  if (declarationDocs.length > 1) {
    parts.push(indentConcat(
      [
        join(
          concat([",", line]),
          declarationDocs,
        ),
      ]
    ));
    parts.push(";");
  } else if (declarationDocs.length === 1) {
    parts.push(concat([declarationDocs[0], ";"]));
  }
  return groupConcat(parts);
}

function handleVariableDeclaration(_, path, print) {
  const parts = [];
  parts.push(path.call(print, "name"));
  const assignmentDocs = path.call(print, "assignment", "value");
  if (assignmentDocs) {
    parts.push(" ");
    parts.push("=");
    parts.push(" ");
    parts.push(assignmentDocs);
  }
  return concat(parts);
}

function handleNewStandard(_, path, print) {
  const parts = [];
  parts.push("new");
  parts.push(" ");
  // Type
  parts.push(path.call(print, "type"));
  // Params
  parts.push("(");
  const paramDocs = path.call(print, "inputParameters");
  parts.push(join(", ", paramDocs));
  parts.push(")");
  return concat(parts);
}

function handleMethodCallExpression(_, path, print) {
  const parts = [];
  // Dotted expression
  const dottedExpressionDoc = path.call(print, "dottedExpr", "value");
  if (dottedExpressionDoc) {
    parts.push(dottedExpressionDoc);
    parts.push(".");
  }
  // Method call chain
  const nameDocs = path.map(print, "names");
  parts.push(join(".", nameDocs));
  // Params
  parts.push("(");
  const paramDocs = path.map(print, "inputParameters");
  parts.push(join(", ", paramDocs));
  parts.push(")");
  return concat(parts);
}

function handleNestedExpression(_, path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  return concat(parts);
}

function handleNewListInit(_, path, print) {
  // TODO is there a way to preserve the user choice of List<> or []?
  const parts = [];
  parts.push("new");
  parts.push(" ");
  // Type
  parts.push(join(".", path.map(print, "types")));
  // Param
  parts.push("[");
  parts.push(path.call(print, "expr", "value"));
  parts.push("]");
  return concat(parts);
}

function handleNewListLiteral(_, path, print) {
  const parts = [];
  parts.push("new");
  parts.push(" ");
  // Type
  parts.push(join(".", path.map(print, "types")));
  // Param
  parts.push("[]");
  // Values
  parts.push("{");
  const valueDocs = path.map(print, "values");
  parts.push(join(", ", valueDocs));
  parts.push("}");
  return concat(parts);
}

function _handlePassthroughCall(...names) {
  return function(_, path, print) {
    return path.call(print, ...names);
  }
}

const nodeHandler = {};
nodeHandler[classes.BOOLEAN_EXPRESSION] = handleBooleanExpression;
nodeHandler[classes.NESTED_EXPRESSION] = handleNestedExpression;
nodeHandler[classes.VARIABLE_EXPRESSION] = handleVariableExpression;
nodeHandler[classes.LITERAL_EXPRESSION] = handleLiteralExpression;
nodeHandler[classes.BINARY_EXPRESSION] = handleBinaryExpression;
nodeHandler[classes.BINARY_OPERATION] = handleBinaryOperation;
nodeHandler[classes.BOOLEAN_OPERATION] = handleBooleanOperation;
nodeHandler[classes.RETURN_STATEMENT] = handleReturnStatement;
nodeHandler[classes.CLASS_DECLARATION] = handleClassDeclaration;
nodeHandler[classes.CLASS_TYPE_REF] = handleClassTypeRef;
nodeHandler[classes.ARRAY_TYPE_REF] = handleArrayTypeRef;
nodeHandler[classes.LOCATION_IDENTIFIER] = handleLocationIdentifier;
nodeHandler[classes.INNER_CLASS_MEMBER] = handleInnerClassMember;
nodeHandler[classes.METHOD_MEMBER] = handleMethodMember;
nodeHandler[classes.METHOD_DECLARATION] = handleMethodDeclaration;
nodeHandler[classes.EMPTY_MODIFIER_PARAMETER_REF] = handleEmptyModifierParameterRef;
nodeHandler[classes.BLOCK_STATEMENT] = handleBlockStatement;
nodeHandler[classes.VARIABLE_DECLARATION_STATEMENT] = handleVariableDeclarationStatement;
nodeHandler[classes.VARIABLE_DECLARATIONS] = handleVariableDeclarations;
nodeHandler[classes.VARIABLE_DECLARATION] = handleVariableDeclaration;
nodeHandler[classes.NEW_EXPRESSION] = _handlePassthroughCall("creator");
nodeHandler[classes.NEW_LIST_INIT] = handleNewListInit;
nodeHandler[classes.NEW_LIST_LITERAL] = handleNewListLiteral;
nodeHandler[classes.NEW_STANDARD] = handleNewStandard;
nodeHandler[classes.METHOD_CALL_EXPRESSION] = handleMethodCallExpression;
nodeHandler[classes.ANNOTATION] = handleAnnotation;
nodeHandler[classes.ANNOTATION_KEY_VALUE] = handleAnnotationKeyValue;
nodeHandler[classes.ANNOTATION_TRUE_VALUE] = () => "true";
nodeHandler[classes.ANNOTATION_FALSE_VALUE] = () => "false";
nodeHandler[classes.PUBLIC_MODIFIER] = () => concat(["public", " "]);
nodeHandler[classes.PRIVATE_MODIFIER] = () => concat(["private", " "]);
nodeHandler[classes.ABSTRACT_MODIFIER] = () => concat(["abstract", " "]);
nodeHandler[classes.FINAL_MODIFIER] = () => concat(["final", " "]);
nodeHandler[classes.HIDDEN_MODIFIER] = () => concat(["hidden", " "]);
nodeHandler[classes.PROTECTED_MODIFIER] = () => concat(["protected", " "]);
nodeHandler[classes.STATIC_MODIFIER] = () => concat(["static", " "]);
nodeHandler[classes.TEST_METHOD_MODIFIER] = () => concat(["testMethod", " "]);
nodeHandler[classes.TRANSIENT_MODIFIER] = () => concat(["transient", " "]);
nodeHandler[classes.WEB_SERVICE_MODIFIER] = () => concat(["webService", " "]);
nodeHandler[classes.VIRTUAL_MODIFIER] = () => concat(["virtual", " "]);
nodeHandler[classes.GLOBAL_MODIFIER] = () => concat(["global", " "]);
nodeHandler[classes.WITH_SHARING_MODIFIER] = () => concat(["with sharing", " "]);
nodeHandler[classes.WITHOUT_SHARING_MODIFIER] = () => concat(["without sharing", " "]);
nodeHandler[classes.THIS_VARIABLE_EXPRESSION] = () => "this";

function genericPrint(path, options, print) {
  const n = path.getValue();
  if (typeof n !== "boolean" && !n) {
    return "";
  }
  if (typeof n === "string" || typeof n === "number" || typeof n === "boolean") {
    return n.toString();
  }
  const docs = [];
  if (path.stack.length === 1) {
    // Hard code how to handle the root node here
    docs.push(path.call(print, classes.PARSER_OUTPUT, "unit", "body"));
    // Adding a hardline as the last thing in the document
    docs.push(hardline);
  } else {
    if (n["@class"] && n["@class"] in nodeHandler) {
      docs.push(nodeHandler[n["@class"]](n, path, print));
    } else {
      docs.push("");
    }
  }
  return concat(docs);
}

module.exports = genericPrint;
