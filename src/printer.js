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

function handleReturnStatement(path, print) {
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

function handleBinaryExpression(path, print) {
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

function handleGenericExpression(path, print) {
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

function handleVariableExpression(path, print) {
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

function handleLiteralExpression(path, print) {
  const node = path.getValue();
  console.log(path.getValue);
  const literalDoc = path.call(print, "literal", "$");
  if (node.type["$"] === "STRING") {
    return concat(["'", literalDoc, "'"]);
  }
  return literalDoc;
}

function handleBinaryOperation(path) {
  const node = path.getValue();
  return expressions.BINARY[node["$"]];
}

function handleBooleanOperation(path) {
  const node = path.getValue();
  return expressions.BOOLEAN[node["$"]];
}

function handleAssignmentOperation(path) {
  const node = path.getValue();
  return expressions.ASSIGNMENT[node["$"]];
}

function handleClassDeclaration(path, print) {
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

function handleAnnotation(path, print) {
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

function handleAnnotationKeyValue(path, print) {
  const parts = [];
  parts.push(path.call(print, "key", "value"));
  parts.push("=");
  parts.push(path.call(print, "value"));
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

function handleMethodDeclaration(path, print) {
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

function handleEmptyModifierParameterRef(path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "typeRef"));
  parts.push(" ");
  // Value
  parts.push(path.call(print, "name"));
  return concat(parts);
}

function handleBlockStatement(path, print) {
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

function handleVariableDeclarations(path, print) {
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

function handleVariableDeclaration(path, print) {
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

function handleNewStandard(path, print) {
  const parts = [];
  // Type
  parts.push(path.call(print, "type"));
  // Params
  parts.push("(");
  const paramDocs = path.call(print, "inputParameters");
  parts.push(join(", ", paramDocs));
  parts.push(")");
  return concat(parts);
}

function handleMethodCallExpression(path, print) {
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

function handleNestedExpression(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  return concat(parts);
}

function handleNewListInit(path, print) {
  // TODO is there a way to preserve the user choice of List<> or []?
  const parts = [];
  // Type
  parts.push(join(".", path.map(print, "types")));
  // Param
  parts.push("[");
  parts.push(path.call(print, "expr", "value"));
  parts.push("]");
  return concat(parts);
}

function handleNewMapInit(path, print) {
  const parts = [];
  parts.push("Map");
  // Type
  parts.push("<");
  const typeDocs = path.map(print, "types");
  parts.push(join(", ", typeDocs));
  parts.push(">");
  parts.push("()");
  return concat(parts);
}

function handleNewListLiteral(path, print) {
  const parts = [];
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

function handleNewExpression(path, print) {
  const parts = [];
  parts.push("new");
  parts.push(" ");
  parts.push(path.call(print, "creator"));
  return concat(parts);
}

function handleIfElseBlock(path, print) {
  const parts = [];
  const ifBlockDocs = path.map(print, "ifBlocks");
  parts.push(join(" else ", ifBlockDocs));
  const elseBlockDoc = path.call(print, "elseBlock", "value");
  parts.push(" ");
  parts.push(elseBlockDoc);
  return groupConcat(parts);
}

function handleIfBlock(path, print) {
  const parts = [];
  parts.push("if");
  parts.push(" ");
  // Condition expression
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  parts.push(" ");
  // Body block
  parts.push("{");
  parts.push(path.call(print, "stmnt"));
  parts.push("}");
  return groupConcat(parts);
}

function handleElseBlock(path, print) {
  const parts = [];
  parts.push("else");
  parts.push(" ");
  // Body block
  parts.push("{");
  parts.push(path.call(print, "stmnt"));
  parts.push("}");
  return groupConcat(parts);
}

function handleTernaryExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "condition"));
  parts.push(" ");
  parts.push("?");
  parts.push(" ");
  parts.push(path.call(print, "trueExpr"));
  parts.push(" ");
  parts.push(":");
  parts.push(" ");
  parts.push(path.call(print, "falseExpr"));
  return groupConcat(parts);
}

function handleExpressionStatement(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(";");
  return concat(parts);
}

function handleQuery(path, print) {
  const parts = [];
  parts.push(softline);
  const childParts = [];
  childParts.push(path.call(print, "select"));
  childParts.push(path.call(print, "from"));
  _pushIfExist(childParts, path.call(print, "where", "value"));
  _pushIfExist(childParts, path.call(print, "with"));
  _pushIfExist(childParts, path.call(print, "groupBy"));
  _pushIfExist(childParts, path.call(print, "orderBy", "value"));
  _pushIfExist(childParts, path.call(print, "limit", "value"));
  _pushIfExist(childParts, path.call(print, "offset", "value"));
  _pushIfExist(childParts, path.call(print, "tracking"));
  parts.push(join(line, childParts));
  parts.push(dedent(softline));
  return groupConcat(["[", indentConcat(parts), "]"]);
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
  const parts = [];
  parts.push(path.call(print, "field"));
  return concat(parts);
}

function handleFromClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat([
      "FROM",
      line,
      ...path.map(print, "exprs"),
    ]),
  );
  return groupConcat(parts);
}

function handleFromExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "table"));
  parts.push(path.call(print, "using"));
  return groupConcat(parts);
}

function handleWhereClause(path, print) {
  const parts = [];
  parts.push(
    indentConcat([
      "WHERE",
      line,
      path.call(print, "expr"),
    ])
  );
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
      join(
        concat([",", line]), path.map(print, "expr")
      ),
      dedent(softline),
    ])
  );
  parts.push(")");
  return groupConcat(parts);
}

function handleWhereQueryLiteral(childClass, path, print) {
  let doc;
  switch (childClass) {
    case "QueryString":
      doc = concat(["'", path.call(print, "literal"), "'"]);
      break;
    case "QueryNull":
      doc = "null";
      break;
    case "QueryTrue":
      doc = "true";
      break;
    case "QueryFalse":
      doc = "false";
      break;
    case "QueryNumber":
      doc = path.call(print, "literal", "$");
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
  const parts = [];
  parts.push("(");
  const operatorDoc = path.call(print, "op");
  const expressionDocs = path.map(print, "expr");
  parts.push(join(concat([line, operatorDoc, " "]), expressionDocs));
  parts.push(")");
  return concat(parts);
}

function handleWhereUnaryExpression(path, print) {
  const parts = [];
  parts.push("(");
  parts.push(path.call(print, "op"));
  parts.push(path.call(print, "expr"));
  parts.push(")");
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
  parts.push(indentConcat([
    line,
    join(concat([",", line]), path.map(print, "exprs")),
  ]));
  return groupConcat(parts);
}

function handleOrderByValue(path, print) {
  const parts = [];
  parts.push(path.call(print, "field"));

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

function handleOrderOperation(op) {
  return function(path, print, opts) {
    const loc = opts.locStart(path.getValue());
    if (loc.line !== -1 && loc.column !== -1) {
      return expressions.ORDER[op];
    }
    return "";
  }
}

function handleNullOrderOperation(op) {
  return function(path, print, opts) {
    const loc = opts.locStart(path.getValue());
    if (loc.line !== -1 && loc.column !== -1) {
      return expressions.ORDER_NULL[op];
    }
    return "";
  }
}

function _handlePassthroughCall(...names) {
  return function(path, print) {
    return path.call(print, ...names);
  }
}

function _pushIfExist(parts, doc, otherDocs) {
  if (doc) {
    parts.push(doc);
    if (otherDocs) {
      otherDocs.forEach(otherDoc => parts.push(otherDoc));
    }
  }
  return parts;
}

const nodeHandler = {};
nodeHandler[classes.IF_ELSE_BLOCK] = handleIfElseBlock;
nodeHandler[classes.IF_BLOCK] = handleIfBlock;
nodeHandler[classes.ELSE_BLOCK] = handleElseBlock;
nodeHandler[classes.TERNARY_EXPRESSION] = handleTernaryExpression;
nodeHandler[classes.EXPRESSION_STATEMENT] = handleExpressionStatement;
nodeHandler[classes.BOOLEAN_EXPRESSION] = handleGenericExpression;
nodeHandler[classes.ASSIGNMENT_EXPRESSION] = handleGenericExpression;
nodeHandler[classes.ASSIGNMENT_OPERATION] = handleAssignmentOperation;
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
nodeHandler[classes.LOCATION_IDENTIFIER] = _handlePassthroughCall("value");
nodeHandler[classes.INNER_CLASS_MEMBER] = _handlePassthroughCall("body");
nodeHandler[classes.METHOD_MEMBER] = _handlePassthroughCall("methodDecl");
nodeHandler[classes.METHOD_DECLARATION] = handleMethodDeclaration;
nodeHandler[classes.EMPTY_MODIFIER_PARAMETER_REF] = handleEmptyModifierParameterRef;
nodeHandler[classes.BLOCK_STATEMENT] = handleBlockStatement;
nodeHandler[classes.VARIABLE_DECLARATION_STATEMENT] = _handlePassthroughCall("variableDecls");
nodeHandler[classes.VARIABLE_DECLARATIONS] = handleVariableDeclarations;
nodeHandler[classes.VARIABLE_DECLARATION] = handleVariableDeclaration;
nodeHandler[classes.NEW_EXPRESSION] = handleNewExpression;
nodeHandler[classes.NEW_LIST_INIT] = handleNewListInit;
nodeHandler[classes.NEW_MAP_INIT] = handleNewMapInit;
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

nodeHandler[classes.SOQL_EXPRESSION] = _handlePassthroughCall("query");
nodeHandler[classes.QUERY] = handleQuery;
nodeHandler[classes.SELECT_COLUMN_CLAUSE] = handleColumnClause;
nodeHandler[classes.SELECT_COLUMN_EXPRESSION] = handleColumnExpression;
nodeHandler[classes.FIELD] = handleField;
nodeHandler[classes.FIELD_IDENTIFIER] = handleFieldIdentifier;
nodeHandler[classes.FROM_CLAUSE] = handleFromClause;
nodeHandler[classes.FROM_EXPRESSION] = handleFromExpression;
nodeHandler[classes.WHERE_CLAUSE] = handleWhereClause;
nodeHandler[classes.WHERE_OPERATION_EXPRESSION] = handleWhereOperationExpression;
nodeHandler[classes.WHERE_OPERATION_EXPRESSIONS] = handleWhereOperationExpressions;
nodeHandler[classes.WHERE_COMPOUND_EXPRESSION] = handleWhereCompoundExpression;
nodeHandler[classes.WHERE_UNARY_EXPRESSION] = handleWhereUnaryExpression;
nodeHandler[classes.WHERE_UNARY_OPERATOR] = () => "NOT";
nodeHandler[classes.QUERY_LITERAL_EXPRESSION] = _handlePassthroughCall("literal");
nodeHandler[classes.QUERY_LITERAL] = handleWhereQueryLiteral;
nodeHandler[classes.APEX_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[classes.COLON_EXPRESSION] = handleColonExpression;
nodeHandler[classes.ORDER_BY_CLAUSE] = handleOrderByClause;
nodeHandler[classes.ORDER_BY_VALUE] = handleOrderByValue;
nodeHandler[classes.LIMIT_VALUE] = (path, print) => concat(["LIMIT", " ", path.call(print, "i")]);
nodeHandler[classes.OFFSET_VALUE] = (path, print) => concat(["OFFSET", " ", path.call(print, "i")]);
Object.keys(expressions.QUERY_WHERE).forEach(op => nodeHandler[op] = () => expressions.QUERY_WHERE[op]);
Object.keys(expressions.QUERY).forEach(op => nodeHandler[op] = () => expressions.QUERY[op]);
Object.keys(expressions.ORDER).forEach(op => nodeHandler[op] = handleOrderOperation(op));
Object.keys(expressions.ORDER_NULL).forEach(op => nodeHandler[op] = handleNullOrderOperation(op));

function genericPrint(path, options, print) {
  const n = path.getValue();
  if (typeof n === "string" || typeof n === "number" || typeof n === "boolean") {
    return n.toString();
  }
  if (!n) {
    return "";
  }
  const apexClass = n["@class"];
  if (path.stack.length === 1) {
    // Hard code how to handle the root node here
    const docs = [];
    docs.push(path.call(print, classes.PARSER_OUTPUT, "unit", "body"));
    // Adding a hardline as the last thing in the document
    docs.push(hardline);
    return concat(docs);
  }
  if (!apexClass) {
    return "";
  }
  if (apexClass in nodeHandler) {
    return nodeHandler[apexClass](path, print, options);
  }
  const separatorIndex = apexClass.indexOf("$");
  if (separatorIndex != -1) {
    const parentClass = apexClass.substring(0, separatorIndex);
    const childClass = apexClass.substring(separatorIndex + 1);
    if (parentClass in nodeHandler) {
      return nodeHandler[parentClass](childClass, path, print, options);
    }
  }

  return "";
}

module.exports = genericPrint;
