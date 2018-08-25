"use strict";

const docBuilders = require("prettier").doc.builders;
const {concat, join, hardline, line, softline, literalline, group, indent, dedent, ifBreak, breakParent} = docBuilders;

const values = require("./values");
const apexNames = values.APEX_NAMES;

function indentConcat(docs) {
  return indent(concat(docs));
}

function groupConcat(docs) {
  return group(concat(docs));
}

function groupIndentConcat(docs) {
  return group(indent(concat(docs)));
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
  const literalDoc = path.call(print, "literal", "$");
  if (node.type["$"] === "STRING") {
    return concat(["'", literalDoc, "'"]);
  }
  return literalDoc;
}

function handleBinaryOperation(path) {
  const node = path.getValue();
  return values.BINARY[node["$"]];
}

function handleBooleanOperation(path) {
  const node = path.getValue();
  return values.BOOLEAN[node["$"]];
}

function handleAssignmentOperation(path) {
  const node = path.getValue();
  return values.ASSIGNMENT[node["$"]];
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
  const parts = [];
  parts.push(path.call(print, "select"));
  parts.push(path.call(print, "from"));
  _pushIfExist(parts, path.call(print, "where", "value"));
  _pushIfExist(parts, path.call(print, "with"));
  _pushIfExist(parts, path.call(print, "groupBy", "value"));
  _pushIfExist(parts, path.call(print, "orderBy", "value"));
  _pushIfExist(parts, path.call(print, "limit", "value"));
  _pushIfExist(parts, path.call(print, "offset", "value"));
  _pushIfExist(parts, path.call(print, "tracking", "value"));
  _pushIfExist(parts, path.call(print, "updateStats", "value"));
  _pushIfExist(parts, path.call(print, "options", "value"));
  return join(line, parts);
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
  return groupIndentConcat(parts);
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
  parts.push(line);
  parts.push(path.call(print, "using", "value"));
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
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
  // TODO Fix escaping special characters
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
    case "QueryDateTime":
      // TODO find a way to preserve user's input instead of converting to GMT
      doc = path.call(print, "literal").replace("[GMT]", "");
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

function handleOrderOperation(childClass, path, print, opts) {
  const loc = opts.locStart(path.getValue());
  if (loc.line !== -1 && loc.column !== -1) {
    return values.ORDER[childClass];
  }
  return "";
}

function handleNullOrderOperation(childClass, path, print, opts) {
  const loc = opts.locStart(path.getValue());
  if (loc.line !== -1 && loc.column !== -1) {
    return values.ORDER_NULL[childClass];
  }
  return "";
}

function handleGroupByClause(path, print) {
  const expressionDocs = path.map(print, "exprs");

  const parts = [];
  parts.push("GROUP BY");
  parts.push(line);
  parts.push(join(concat([",", line]), expressionDocs));
  _pushIfExist(parts, path.call(print, "having", "value"), null, [line]);
  parts.push(dedent(softline));
  return groupIndentConcat(parts);
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

function handleUsing(path, print) {
  return concat([
    path.call(print, "name", "value"),
    " ",
    path.call(print, "field", "value"),
  ]);
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
      doc = "";
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
      doc = "";
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
      doc = "";
  }
  return doc;
}

function handleModifier(childClass) {
  return concat([values.MODIFIER[childClass], " "]);
}

function _handlePassthroughCall(...names) {
  return function(path, print) {
    return path.call(print, ...names);
  }
}

function _pushIfExist(parts, doc, postDocs, preDocs) {
  if (doc) {
    if (preDocs) {
      preDocs.forEach(preDoc => parts.push(preDoc));
    }
    parts.push(doc);
    if (postDocs) {
      postDocs.forEach(postDoc => parts.push(postDoc));
    }
  }
  return parts;
}

const nodeHandler = {};
nodeHandler[apexNames.IF_ELSE_BLOCK] = handleIfElseBlock;
nodeHandler[apexNames.IF_BLOCK] = handleIfBlock;
nodeHandler[apexNames.ELSE_BLOCK] = handleElseBlock;
nodeHandler[apexNames.TERNARY_EXPRESSION] = handleTernaryExpression;
nodeHandler[apexNames.EXPRESSION_STATEMENT] = handleExpressionStatement;
nodeHandler[apexNames.BOOLEAN_EXPRESSION] = handleGenericExpression;
nodeHandler[apexNames.ASSIGNMENT_EXPRESSION] = handleGenericExpression;
nodeHandler[apexNames.ASSIGNMENT_OPERATION] = handleAssignmentOperation;
nodeHandler[apexNames.NESTED_EXPRESSION] = handleNestedExpression;
nodeHandler[apexNames.VARIABLE_EXPRESSION] = handleVariableExpression;
nodeHandler[apexNames.LITERAL_EXPRESSION] = handleLiteralExpression;
nodeHandler[apexNames.BINARY_EXPRESSION] = handleBinaryExpression;
nodeHandler[apexNames.BINARY_OPERATION] = handleBinaryOperation;
nodeHandler[apexNames.BOOLEAN_OPERATION] = handleBooleanOperation;
nodeHandler[apexNames.RETURN_STATEMENT] = handleReturnStatement;
nodeHandler[apexNames.CLASS_DECLARATION] = handleClassDeclaration;
nodeHandler[apexNames.CLASS_TYPE_REF] = handleClassTypeRef;
nodeHandler[apexNames.ARRAY_TYPE_REF] = handleArrayTypeRef;
nodeHandler[apexNames.LOCATION_IDENTIFIER] = _handlePassthroughCall("value");
nodeHandler[apexNames.INNER_CLASS_MEMBER] = _handlePassthroughCall("body");
nodeHandler[apexNames.METHOD_MEMBER] = _handlePassthroughCall("methodDecl");
nodeHandler[apexNames.METHOD_DECLARATION] = handleMethodDeclaration;
nodeHandler[apexNames.EMPTY_MODIFIER_PARAMETER_REF] = handleEmptyModifierParameterRef;
nodeHandler[apexNames.BLOCK_STATEMENT] = handleBlockStatement;
nodeHandler[apexNames.VARIABLE_DECLARATION_STATEMENT] = _handlePassthroughCall("variableDecls");
nodeHandler[apexNames.VARIABLE_DECLARATIONS] = handleVariableDeclarations;
nodeHandler[apexNames.VARIABLE_DECLARATION] = handleVariableDeclaration;
nodeHandler[apexNames.NEW_EXPRESSION] = handleNewExpression;
nodeHandler[apexNames.NEW_LIST_INIT] = handleNewListInit;
nodeHandler[apexNames.NEW_MAP_INIT] = handleNewMapInit;
nodeHandler[apexNames.NEW_LIST_LITERAL] = handleNewListLiteral;
nodeHandler[apexNames.NEW_STANDARD] = handleNewStandard;
nodeHandler[apexNames.METHOD_CALL_EXPRESSION] = handleMethodCallExpression;
nodeHandler[apexNames.ANNOTATION] = handleAnnotation;
nodeHandler[apexNames.ANNOTATION_KEY_VALUE] = handleAnnotationKeyValue;
nodeHandler[apexNames.ANNOTATION_VALUE] = (childClass) => values.ANNOTATION_VALUE[childClass];
nodeHandler[apexNames.MODIFIER] = handleModifier;
nodeHandler[apexNames.THIS_VARIABLE_EXPRESSION] = () => "this";

nodeHandler[apexNames.SOQL_EXPRESSION] = handleSoqlExpression;
nodeHandler[apexNames.QUERY] = handleQuery;
nodeHandler[apexNames.SELECT_COLUMN_CLAUSE] = handleColumnClause;
nodeHandler[apexNames.SELECT_COUNT_CLAUSE] = () => concat(["SELECT", " ", "COUNT()"]);
nodeHandler[apexNames.SELECT_COLUMN_EXPRESSION] = handleColumnExpression;
nodeHandler[apexNames.SELECT_INNER_QUERY] = handleSelectInnerQuery;
nodeHandler[apexNames.FIELD] = handleField;
nodeHandler[apexNames.FIELD_IDENTIFIER] = handleFieldIdentifier;
nodeHandler[apexNames.FROM_CLAUSE] = handleFromClause;
nodeHandler[apexNames.FROM_EXPRESSION] = handleFromExpression;
nodeHandler[apexNames.GROUP_BY_CLAUSE] = handleGroupByClause;
nodeHandler[apexNames.GROUP_BY_EXPRESSION] = _handlePassthroughCall("field");
nodeHandler[apexNames.HAVING_CLAUSE] = handleHavingClause;
nodeHandler[apexNames.WHERE_CLAUSE] = handleWhereClause;
nodeHandler[apexNames.WHERE_INNER_EXPRESSION] = handleWhereInnerExpression;
nodeHandler[apexNames.WHERE_OPERATION_EXPRESSION] = handleWhereOperationExpression;
nodeHandler[apexNames.WHERE_OPERATION_EXPRESSIONS] = handleWhereOperationExpressions;
nodeHandler[apexNames.WHERE_COMPOUND_EXPRESSION] = handleWhereCompoundExpression;
nodeHandler[apexNames.WHERE_UNARY_EXPRESSION] = handleWhereUnaryExpression;
nodeHandler[apexNames.WHERE_UNARY_OPERATOR] = () => "NOT";
nodeHandler[apexNames.QUERY_LITERAL_EXPRESSION] = _handlePassthroughCall("literal");
nodeHandler[apexNames.QUERY_LITERAL] = handleWhereQueryLiteral;
nodeHandler[apexNames.APEX_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexNames.COLON_EXPRESSION] = handleColonExpression;
nodeHandler[apexNames.ORDER_BY_CLAUSE] = handleOrderByClause;
nodeHandler[apexNames.ORDER_BY_VALUE] = handleOrderByValue;
nodeHandler[apexNames.LIMIT_VALUE] = (path, print) => concat(["LIMIT", " ", path.call(print, "i")]);
nodeHandler[apexNames.OFFSET_VALUE] = (path, print) => concat(["OFFSET", " ", path.call(print, "i")]);
nodeHandler[apexNames.QUERY_OPERATOR] = (childClass) => values.QUERY[childClass];
nodeHandler[apexNames.SOQL_ORDER] = handleOrderOperation;
nodeHandler[apexNames.SOQL_ORDER_NULL] = handleNullOrderOperation;
nodeHandler[apexNames.TRACKING_TYPE] = handleTrackingType;
nodeHandler[apexNames.QUERY_OPTION] = handleQueryOption;
nodeHandler[apexNames.QUERY_USING_CLAUSE] = handleQueryUsingClause;
nodeHandler[apexNames.USING] = handleUsing;
nodeHandler[apexNames.UPDATE_STATS_CLAUSE] = handleUpdateStatsClause;
nodeHandler[apexNames.UPDATE_STATS_OPTION] = handleUpdateStatsOption;
nodeHandler[apexNames.WHERE_COMPOUND_OPERATOR] = (childClass) => values.QUERY_WHERE[childClass];

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
    docs.push(path.call(print, apexNames.PARSER_OUTPUT, "unit", "body"));
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
  if (separatorIndex !== -1) {
    const parentClass = apexClass.substring(0, separatorIndex);
    const childClass = apexClass.substring(separatorIndex + 1);
    if (parentClass in nodeHandler) {
      return nodeHandler[parentClass](childClass, path, print, options);
    }
  }

  return "";
}

module.exports = genericPrint;
