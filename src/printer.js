/* eslint no-underscore-dangle: 0 */

const docBuilders = require("prettier").doc.builders;

const {
  concat,
  join,
  hardline,
  line,
  softline,
  group,
  indent,
  dedent,
} = docBuilders;

const { isApexDocComment, printComments } = require("./comments");
const values = require("./values");

const apexNames = values.APEX_NAMES;

// Places we've looked into to make sure we're not forgetting to implement things:
// Stmnt.class, NewObject.class, Expr.class, BlockMember.class, CompilationUnit.class

// TODO make sure expression inside {} are consistent, right now Enum/List/Map/Set
// init does not have spaces around them, while everything else does.

// TODO right now there are spaces around field member and property member.
// Find a way to fix that.

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
      preDocs.forEach(preDoc => parts.push(preDoc));
    }
    parts.push(doc);
    if (postDocs) {
      postDocs.forEach(postDoc => parts.push(postDoc));
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
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
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
  const literalType = path.call(print, "type", "$");
  if (literalType === "NULL") {
    return "null";
  }
  let literalDoc = path.call(print, "literal", "$");
  let doc;
  if (literalType === "STRING") {
    doc = concat(["'", literalDoc, "'"]);
  } else if (literalType === "LONG") {
    doc = concat([literalDoc, "L"]);
  } else if (literalType === "DECIMAL" && literalDoc.indexOf(".") === -1) {
    // The serializer does not preserve trailing 0s for doubles,
    // however they are needed when printing,
    literalDoc += ".0";
  } else if (literalType === "DOUBLE") {
    if (literalDoc.indexOf(".") === -1) {
      // The serializer does not preserve trailing 0s for doubles,
      // however they are needed when printing,
      // e.g. 1.0D is valid while 1D is invalid
      literalDoc += ".0";
    }
    doc = concat([literalDoc, "d"]);
  }
  if (doc) {
    return doc;
  }
  return literalDoc;
}

function handleBinaryOperation(path) {
  const node = path.getValue();
  return values.BINARY[node.$];
}

function handleBooleanOperation(path) {
  const node = path.getValue();
  return values.BOOLEAN[node.$];
}

function handleAssignmentOperation(path) {
  const node = path.getValue();
  return values.ASSIGNMENT[node.$];
}

function handleTriggerDeclarationUnit(path, print) {
  const usageDocs = path.map(print, "usages");
  const targetDocs = path.map(print, "target");

  const parts = [];
  parts.push("trigger");
  parts.push(" ");
  parts.push(path.call(print, "name", "value"));
  parts.push(" ");
  parts.push("on");
  parts.push(" ");
  parts.push(join(",", targetDocs));
  parts.push("(");
  const usagePart = concat([softline, join(concat([",", line]), usageDocs)]);
  parts.push(indent(usagePart));
  parts.push(")");
  parts.push(" ");
  parts.push("{");
  const memberParts = path.map(print, "members").filter(member => member);

  const memberDocs = memberParts.map((memberDoc, index, allMemberDocs) => {
    if (index !== allMemberDocs.length - 1) {
      return concat([memberDoc, hardline]);
    }
    return memberDoc;
  });
  if (memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
    parts.push(dedent(concat([hardline, "}"])));
  } else {
    parts.push("}");
  }
  return concat(parts);
}

function handleInterfaceDeclaration(path, print) {
  const superInterface = path.call(print, "superInterface", "value");
  const modifierDocs = path.map(print, "modifiers");
  const memberParts = path.map(print, "members").filter(member => member);

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
  parts.push(path.call(print, "name", "value"));
  if (superInterface) {
    parts.push(" ");
    parts.push("extends");
    parts.push(" ");
    parts.push(superInterface);
  }
  parts.push(" ");
  parts.push("{");
  if (memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
    parts.push(concat([hardline, "}"]));
  } else {
    parts.push("}");
  }
  return concat(parts);
}

function handleClassDeclaration(path, print) {
  const superClass = path.call(print, "superClass", "value");
  const modifierDocs = path.map(print, "modifiers");
  const memberParts = path.map(print, "members").filter(member => member);

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
  parts.push(path.call(print, "name", "value"));
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
  if (memberDocs.length > 0) {
    parts.push(indent(concat([hardline, ...memberDocs])));
    parts.push(concat([hardline, "}"]));
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
    parts.push(join(" ", parameterDocs));
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
      parts.push("");
  }
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
  parts.push(join("", modifierDocs));
  parts.push(path.call(print, "type"));
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("{");
  if (getterDoc || setterDoc) {
    parts.push(line);
  }
  if (getterDoc) {
    parts.push(getterDoc);
    if (setterDoc) {
      parts.push(line);
    } else {
      parts.push(dedent(line));
    }
  }
  _pushIfExist(parts, setterDoc, [dedent(line)]);
  parts.push("}");
  return groupIndentConcat(parts);
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
  parts.push(join(", ", parameterDocs));
  parts.push(")");
  // Body
  _pushIfExist(parts, statementDoc, null, [" "]);
  if (!statementDoc) {
    parts.push(";");
  }
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
      doc = "";
  }
  const node = path.getValue();
  const parts = [];
  parts.push(doc);
  parts.push(" ");
  parts.push(path.call(print, "expr"));
  // upsert statement has an extra param that can be tacked on at the end
  if (node.id) {
    _pushIfExist(parts, path.call(print, "id", "value"), null, [line]);
  }
  parts.push(";");
  return groupIndentConcat(parts);
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

function handleEnumDeclaration(path, print) {
  const modifierDocs = path.map(print, "modifiers");
  const memberDocs = path.map(print, "members");

  const parts = [];
  _pushIfExist(parts, join(" ", modifierDocs));
  parts.push("enum");
  parts.push(" ");
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("{");
  parts.push(softline);
  parts.push(join(concat([",", line]), memberDocs));
  parts.push(dedent(softline));
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleSwitchStatement(path, print) {
  const whenBlocks = path.map(print, "whenBlocks");

  const parts = [];
  parts.push("switch on");
  parts.push(" ");
  parts.push(path.call(print, "expr"));
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
  return join(",", path.map(print, "identifiers"));
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

function handleBlockStatement(path, print) {
  const parts = [];
  parts.push("{");
  const statementDocs = path.map(print, "stmnts");
  if (statementDocs.length > 0) {
    parts.push(hardline);
    parts.push(join(hardline, statementDocs));
    parts.push(dedent(hardline));
  }
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
  const parts = [];
  parts.push(path.call(print, "name"));
  parts.push(" ");
  parts.push("=");
  parts.push(" ");
  parts.push(path.call(print, "value"));
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
  const dottedExpressionDoc = path.call(print, "dottedExpr", "value");
  const nameDocs = path.map(print, "names");
  const paramDocs = path.map(print, "inputParameters");

  const parts = [];
  const dottedExpressionParts = [];
  if (dottedExpressionDoc) {
    dottedExpressionParts.push(dottedExpressionDoc);
    dottedExpressionParts.push(".");
  }
  parts.push(
    groupConcat([
      ...dottedExpressionParts,
      groupConcat([
        // Method call chain
        join(".", nameDocs),
        "(",
        paramDocs.length > 0
          ? groupIndentConcat([
              softline,
              join(concat([",", line]), paramDocs),
              dedent(softline),
            ])
          : "",
        ")",
      ]),
    ]),
  );
  return groupConcat(parts);
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
  // Type
  parts.push("Set");
  parts.push("<");
  parts.push(join(concat([",", " "]), path.map(print, "types")));
  parts.push(">");
  // Param
  parts.push("(");
  parts.push(path.call(print, "expr", "value"));
  parts.push(")");
  return concat(parts);
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
    parts.push(softline);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(softline));
  }
  parts.push("}");
  return groupIndentConcat(parts);
}

function handleNewListInit(path, print) {
  // Technically there are 2 ways to declare new list:
  // - new String[]{};
  // - new List<String>{};
  // We use the 2nd format because it can handle any type of new list, e.g.
  // This is correct:
  // List<List<String>> data = new List<List<String>>{};
  // But this is not:
  // List<List<String>> data = new List<String>[]{};

  // Other quirks:
  // All of these are correct:
  // Id[] ids = new Id[]{};
  // Id[] ids = new Id[1];
  // Id[] ids = new Id[anotherIds];
  // But this is not correct:
  // Id[] ids = new Id[1]{};
  const expressionDoc = path.call(print, "expr", "value");
  const parts = [];
  // Type
  parts.push("List<");
  parts.push(join(".", path.map(print, "types")));
  parts.push(">");
  // Param
  parts.push("(");
  _pushIfExist(parts, expressionDoc);
  parts.push(")");
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
  parts.push("(");
  parts.push(path.call(print, "expr", "value"));
  parts.push(")");
  return concat(parts);
}

function handleNewMapLiteral(path, print) {
  const valueDocs = path.map(print, "pairs");

  const parts = [];
  // Type
  parts.push("Map");
  parts.push("<");
  const typeGroup = groupConcat([
    softline,
    join(concat([",", line]), path.map(print, "types")),
    softline,
  ]);
  parts.push(typeGroup);
  parts.push(">");
  // Values
  parts.push("{");
  if (valueDocs.length > 0) {
    parts.push(softline);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(softline));
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
    parts.push(softline);
    parts.push(join(concat([",", line]), valueDocs));
    parts.push(dedent(softline));
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
    ifBlock => ifBlock.stmnt["@class"] === apexNames.BLOCK_STATEMENT,
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
  parts.push("if");
  parts.push(" ");
  // Condition expression
  parts.push("(");
  parts.push(path.call(print, "expr"));
  parts.push(")");
  // Body block
  if (statementType === apexNames.BLOCK_STATEMENT) {
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
  if (statementType === apexNames.BLOCK_STATEMENT) {
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

function handleInstanceOfExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push(" ");
  parts.push("instanceof");
  parts.push(" ");
  parts.push(path.call(print, "type"));
  return concat(parts);
}

function handleArrayExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "expr"));
  parts.push("[");
  parts.push(softline);
  parts.push(path.call(print, "index"));
  parts.push(dedent(softline));
  parts.push("]");
  return groupIndentConcat(parts);
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
      throw new Error(`FindValue ${childClass} is not supported`);
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
      throw new Error(`DivisionValue ${childClass} is not supported`);
  }
  return doc;
}

function handleWithSnippetClause(path, print) {
  const maxLengthDoc = path.call(print, "maxLength", "value");

  const parts = [];
  parts.push("WITH SNIPPET");
  _pushIfExist(parts, maxLengthDoc, [")"], ["(target_length = "]);
  return concat(parts);
}

function handleWithNetworkClause(path, print) {
  const networkDocs = path.map(print, "networks");

  const parts = [];
  parts.push("WITH NETWORK ");

  if (networkDocs.length === 1) {
    parts.push("=");
    parts.push(" ");
    parts.push(networkDocs[0]);
  } else {
    parts.push("IN");
    parts.push(" ");
    parts.push("(");
    parts.push(softline);
    parts.push(join(concat([",", line]), networkDocs));
    parts.push(dedent(softline));
    parts.push(")");
  }
  return groupIndentConcat(parts);
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
    case "SearchWithTrueValue":
      parts.push(" = ");
      parts.push("true");
      break;
    case "SearchWithFalseValue":
      parts.push(" = ");
      parts.push("false");
      break;
    default:
      throw new Error(`SearchWithClauseValue ${childClass} is not supported`);
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
  // TODO bind (apex.jorje.data.soql.BindClause/BindExpr) - not sure how this is used ASKSF
  return groupIndentConcat([softline, join(line, parts)]);
}

function handleSearch(path, print) {
  const withDocs = path.map(print, "withs");

  const parts = [];
  parts.push(path.call(print, "find"));
  _pushIfExist(parts, path.call(print, "in", "value"));
  _pushIfExist(parts, path.call(print, "division", "value"));
  _pushIfExist(parts, path.call(print, "dataCategory", "value"));
  _pushIfExist(parts, path.call(print, "snippet", "value"));
  _pushIfExist(parts, path.call(print, "network", "value"));
  _pushIfExist(parts, path.call(print, "returning", "value"));
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
  const parts = [];
  parts.push(path.call(print, "select"));
  parts.push(path.call(print, "from"));
  _pushIfExist(parts, path.call(print, "where", "value"));
  _pushIfExist(parts, path.call(print, "with", "value"));
  _pushIfExist(parts, path.call(print, "groupBy", "value"));
  _pushIfExist(parts, path.call(print, "orderBy", "value"));
  _pushIfExist(parts, path.call(print, "limit", "value"));
  _pushIfExist(parts, path.call(print, "offset", "value"));
  _pushIfExist(parts, path.call(print, "tracking", "value"));
  _pushIfExist(parts, path.call(print, "updateStats", "value"));
  _pushIfExist(parts, path.call(print, "options", "value"));
  return join(line, parts);
}

function handleCaseExpression(path, print) {
  const parts = [];
  const whenBranchDocs = path.map(print, "whenBranches");
  const elseBranchDoc = path.call(print, "elseBranch", "value");
  parts.push("TYPEOF");
  parts.push(" ");
  parts.push(path.call(print, "op"));
  parts.push(line);
  parts.push(join(line, whenBranchDocs));
  parts.push(line);
  parts.push(elseBranchDoc);
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
  return groupIndentConcat(parts);
}

function handleFromClause(path, print) {
  const parts = [];
  parts.push(indentConcat(["FROM", line, ...path.map(print, "exprs")]));
  return groupConcat(parts);
}

function handleFromExpression(path, print) {
  const parts = [];
  parts.push(path.call(print, "table"));
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
  childParts.push(path.call(print, "latitude", "number", "$"));
  childParts.push(path.call(print, "longitude", "number", "$"));
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
  const categoryDocs = path.map(print, "categories").filter(doc => doc);
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
  return values.DATA_CATEGORY[childClass];
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

function handleWhereQueryLiteral(childClass, path, print, options) {
  const node = path.getValue();
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
      expressionField = "";
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
  if (havingDoc) {
    parts.push(concat([line, havingDoc]));
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
      doc = "";
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
      throw new Error(`UsingExpr ${childClass} is not supported!`);
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

function handleUsingType(path, print) {
  const parts = [];
  parts.push(path.call(print, "filter"));
  parts.push(" ");
  parts.push(path.call(print, "value"));
  return concat(parts);
}

function handleModifier(childClass) {
  const modifierValue = values.MODIFIER[childClass] || "";
  if (!modifierValue) {
    console.warn(`Modifier ${childClass} is not supported!`); // eslint-disable-line no-console
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
  return values.POSTFIX[path.call(print, "$")];
}

function handlePrefixOperator(path, print) {
  return values.PREFIX[path.call(print, "$")];
}

function handleWhileLoop(path, print) {
  const statementDoc = path.call(print, "stmnt", "value");
  const statementType = path.call(print, "stmnt", "value", "@class");

  const parts = [];
  parts.push("while");
  parts.push(" ");
  parts.push("(");
  // Condition
  parts.push(path.call(print, "condition"));
  parts.push(")");
  // Body
  if (statementType === apexNames.BLOCK_STATEMENT) {
    parts.push(" ");
    _pushIfExist(parts, statementDoc);
  } else {
    _pushIfExist(parts, group(indent(concat([hardline, statementDoc]))));
  }
  return concat(parts);
}

function handleDoLoop(path, print) {
  const statementDoc = path.call(print, "stmnt");

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
  parts.push(path.call(print, "condition"));
  parts.push(")");
  parts.push(";");
  return concat(parts);
}

function handleForLoop(path, print) {
  const forControlDoc = path.call(print, "forControl");
  const statementType = path.call(print, "stmnt", "value", "@class");
  const statementDoc = path.call(print, "stmnt", "value");

  const parts = [];
  parts.push("for");
  parts.push(" ");
  parts.push("(");
  // For Control
  parts.push(forControlDoc);
  parts.push(")");
  // Body
  if (statementType === apexNames.BLOCK_STATEMENT) {
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
  const initDoc = join(concat([":", " "]), initDocParts);

  const parts = [];
  parts.push(path.call(print, "type", "value"));
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
  return groupIndentConcat(parts);
}

function handleForInits(path, print) {
  const typeDoc = path.call(print, "type", "value");
  const initDocsParts = path.map(print, "inits");

  // See the note in handleForInit to see why we have to do this
  const initDocs = initDocsParts.map(initDocParts =>
    join(concat([" ", "=", " "]), initDocParts),
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

/**
 * Print ApexDoc comment. This is straight from prettier handling of JSDoc
 * @param comment the comment to print.
 */
function handleApexDocComment(comment) {
  const lines = comment.value.split("\n");
  return concat([
    join(
      hardline,
      lines.map(
        (commentLine, index) =>
          (index > 0 ? " " : "") +
          (index < lines.length - 1
            ? commentLine.trim()
            : commentLine.trimLeft()),
      ),
    ),
  ]);
}

function handleComment(path) {
  // This handles both Inline and Block Comments.
  // We don't just pass through the value because unlike other string literals,
  // this should not be escaped
  // TODO indentation after line ending is not correct
  const node = path.getValue();
  if (isApexDocComment(node)) {
    return handleApexDocComment(node);
  }
  return node.value;
}

const nodeHandler = {};
nodeHandler[apexNames.IF_ELSE_BLOCK] = handleIfElseBlock;
nodeHandler[apexNames.IF_BLOCK] = handleIfBlock;
nodeHandler[apexNames.ELSE_BLOCK] = handleElseBlock;
nodeHandler[apexNames.EXPRESSION_STATEMENT] = handleExpressionStatement;
nodeHandler[apexNames.RETURN_STATEMENT] = handleReturnStatement;
nodeHandler[apexNames.TRIGGER_USAGE] = (path, print) =>
  values.TRIGGER_USAGE[path.call(print, "$")];
nodeHandler[apexNames.CLASS_TYPE_REF] = handleClassTypeRef;
nodeHandler[apexNames.ARRAY_TYPE_REF] = handleArrayTypeRef;
nodeHandler[apexNames.LOCATION_IDENTIFIER] = _handlePassthroughCall("value");
nodeHandler[
  apexNames.EMPTY_MODIFIER_PARAMETER_REF
] = handleEmptyModifierParameterRef;
nodeHandler[apexNames.BLOCK_STATEMENT] = handleBlockStatement;
nodeHandler[apexNames.VARIABLE_DECLARATION_STATEMENT] = _handlePassthroughCall(
  "variableDecls",
);
nodeHandler[apexNames.VARIABLE_DECLARATIONS] = handleVariableDeclarations;
nodeHandler[apexNames.NAME_VALUE_PARAMETER] = handleNameValueParameter;
nodeHandler[apexNames.ANNOTATION] = handleAnnotation;
nodeHandler[apexNames.ANNOTATION_KEY_VALUE] = handleAnnotationKeyValue;
nodeHandler[apexNames.ANNOTATION_VALUE] = handleAnnotationValue;
nodeHandler[apexNames.MODIFIER] = handleModifier;
nodeHandler[apexNames.RUN_AS_BLOCK] = handleRunAsBlock;
nodeHandler[apexNames.DO_LOOP] = handleDoLoop;
nodeHandler[apexNames.WHILE_LOOP] = handleWhileLoop;
nodeHandler[apexNames.FOR_LOOP] = handleForLoop;
nodeHandler[apexNames.FOR_C_STYLE_CONTROL] = handleForCStyleControl;
nodeHandler[apexNames.FOR_ENHANCED_CONTROL] = handleForEnhancedControl;
nodeHandler[apexNames.FOR_INITS] = handleForInits;
nodeHandler[apexNames.FOR_INIT] = handleForInit;
nodeHandler[apexNames.BREAK_STATEMENT] = () => "break;";
nodeHandler[apexNames.CONTINUE_STATEMENT] = () => "continue;";
nodeHandler[apexNames.THROW_STATEMENT] = (path, print) =>
  concat(["throw", " ", path.call(print, "expr"), ";"]);
nodeHandler[apexNames.TRY_CATCH_FINALLY_BLOCK] = handleTryCatchFinallyBlock;
nodeHandler[apexNames.CATCH_BLOCK] = handleCatchBlock;
nodeHandler[apexNames.FINALLY_BLOCK] = handleFinallyBlock;
nodeHandler[apexNames.STATEMENT] = handleStatement;
nodeHandler[apexNames.DML_MERGE_STATEMENT] = handleDmlMergeStatement;
nodeHandler[apexNames.SWITCH_STATEMENT] = handleSwitchStatement;
nodeHandler[apexNames.VALUE_WHEN] = handleValueWhen;
nodeHandler[apexNames.ELSE_WHEN] = handleElseWhen;
nodeHandler[apexNames.TYPE_WHEN] = handleTypeWhen;
nodeHandler[apexNames.ENUM_CASE] = handleEnumCase;
nodeHandler[apexNames.LITERAL_CASE] = _handlePassthroughCall("expr");
nodeHandler[apexNames.PROPERTY_DECLATION] = handlePropertyDeclaration;
nodeHandler[apexNames.PROPERTY_GETTER] = _handlePropertyGetterSetter("get");
nodeHandler[apexNames.PROPERTY_SETTER] = _handlePropertyGetterSetter("set");
nodeHandler[apexNames.BLOCK_COMMENT] = handleComment;
nodeHandler[apexNames.INLINE_COMMENT] = handleComment;
nodeHandler.int = (path, print) => path.call(print, "$");
nodeHandler.string = (path, print) => concat(["'", path.call(print, "$"), "'"]);

// Operator
nodeHandler[apexNames.ASSIGNMENT_OPERATOR] = handleAssignmentOperation;
nodeHandler[apexNames.BINARY_OPERATOR] = handleBinaryOperation;
nodeHandler[apexNames.BOOLEAN_OPERATOR] = handleBooleanOperation;
nodeHandler[apexNames.POSTFIX_OPERATOR] = handlePostfixOperator;
nodeHandler[apexNames.PREFIX_OPERATOR] = handlePrefixOperator;

// Declaration
nodeHandler[apexNames.CLASS_DECLARATION] = handleClassDeclaration;
nodeHandler[apexNames.INTERFACE_DECLARATION] = handleInterfaceDeclaration;
nodeHandler[apexNames.METHOD_DECLARATION] = handleMethodDeclaration;
nodeHandler[apexNames.VARIABLE_DECLARATION] = handleVariableDeclaration;
nodeHandler[apexNames.ENUM_DECLARATION] = handleEnumDeclaration;

// Compilation Unit: we're not handling AnonymousBlockUnit and InvalidDeclUnit
nodeHandler[apexNames.TRIGGER_DECLARATION_UNIT] = handleTriggerDeclarationUnit;
nodeHandler[apexNames.CLASS_DECLARATION_UNIT] = _handlePassthroughCall("body");
nodeHandler[apexNames.ENUM_DECLARATION_UNIT] = _handlePassthroughCall("body");
nodeHandler[apexNames.INTERFACE_DECLARATION_UNIT] = _handlePassthroughCall(
  "body",
);

// Block Member
nodeHandler[apexNames.PROPERTY_MEMBER] = _handlePassthroughCall("propertyDecl");
nodeHandler[apexNames.FIELD_MEMBER] = _handlePassthroughCall("variableDecls");
nodeHandler[apexNames.STATEMENT_BLOCK_MEMBER] = _handleStatementBlockMember();
nodeHandler[
  apexNames.STATIC_STATEMENT_BLOCK_MEMBER
] = _handleStatementBlockMember("static");
nodeHandler[apexNames.METHOD_MEMBER] = _handlePassthroughCall("methodDecl");
nodeHandler[apexNames.INNER_CLASS_MEMBER] = _handlePassthroughCall("body");
nodeHandler[apexNames.INNER_ENUM_MEMBER] = _handlePassthroughCall("body");
nodeHandler[apexNames.INNER_INTERFACE_MEMBER] = _handlePassthroughCall("body");

// Expression
nodeHandler[apexNames.TERNARY_EXPRESSION] = handleTernaryExpression;
nodeHandler[apexNames.BOOLEAN_EXPRESSION] = handleGenericExpression;
nodeHandler[apexNames.ASSIGNMENT_EXPRESSION] = handleGenericExpression;
nodeHandler[apexNames.NESTED_EXPRESSION] = handleNestedExpression;
nodeHandler[apexNames.VARIABLE_EXPRESSION] = handleVariableExpression;
nodeHandler[apexNames.LITERAL_EXPRESSION] = handleLiteralExpression;
nodeHandler[apexNames.BINARY_EXPRESSION] = handleBinaryExpression;
nodeHandler[apexNames.TRIGGER_VARIABLE_EXPRESSION] = (path, print) =>
  concat(["Trigger", ".", path.call(print, "variable")]);
nodeHandler[apexNames.NEW_EXPRESSION] = handleNewExpression;
nodeHandler[apexNames.METHOD_CALL_EXPRESSION] = handleMethodCallExpression;
nodeHandler[apexNames.THIS_VARIABLE_EXPRESSION] = () => "this";
nodeHandler[apexNames.SUPER_VARIABLE_EXPRESSION] = () => "super";
nodeHandler[apexNames.POSTFIX_EXPRESSION] = handlePostfixExpression;
nodeHandler[apexNames.PREFIX_EXPRESSION] = handlePrefixExpression;
nodeHandler[apexNames.CAST_EXPRESSION] = handleCastExpression;
nodeHandler[apexNames.INSTANCE_OF_EXPRESSION] = handleInstanceOfExpression;
nodeHandler[apexNames.PACKAGE_VERSION_EXPRESSION] = () =>
  "Package.Version.Request"; // Not sure what this is
nodeHandler[apexNames.ARRAY_EXPRESSION] = handleArrayExpression;
nodeHandler[apexNames.CLASS_REF_EXPRESSION] = (path, print) =>
  concat([path.call(print, "type"), ".", "class"]);
nodeHandler[
  apexNames.THIS_METHOD_CALL_EXPRESSION
] = handleThisMethodCallExpression;
nodeHandler[
  apexNames.SUPER_METHOD_CALL_EXPRESSION
] = handleSuperMethodCallExpression;
nodeHandler[apexNames.SOQL_EXPRESSION] = handleSoqlExpression;
nodeHandler[apexNames.SOSL_EXPRESSION] = handleSoslExpression;

// New Object Init
nodeHandler[apexNames.NEW_SET_INIT] = handleNewSetInit;
nodeHandler[apexNames.NEW_SET_LITERAL] = handleNewSetLiteral;
nodeHandler[apexNames.NEW_LIST_INIT] = handleNewListInit;
nodeHandler[apexNames.NEW_MAP_INIT] = handleNewMapInit;
nodeHandler[apexNames.NEW_MAP_LITERAL] = handleNewMapLiteral;
nodeHandler[apexNames.MAP_LITERAL_KEY_VALUE] = handleMapLiteralKeyValue;
nodeHandler[apexNames.NEW_LIST_LITERAL] = handleNewListLiteral;
nodeHandler[apexNames.NEW_STANDARD] = handleNewStandard;
nodeHandler[apexNames.NEW_KEY_VALUE] = handleNewKeyValue;

// SOSL
nodeHandler[apexNames.SEARCH] = handleSearch;
nodeHandler[apexNames.FIND_CLAUSE] = handleFindClause;
nodeHandler[apexNames.FIND_VALUE] = handleFindValue;
nodeHandler[apexNames.IN_CLAUSE] = handleInClause;
nodeHandler[apexNames.WITH_DIVISION_CLAUSE] = handleDivisionClause;
nodeHandler[apexNames.DIVISION_VALUE] = handleDivisionValue;
nodeHandler[apexNames.WITH_DATA_CATEGORY_CLAUSE] = handleWithDataCategories;
nodeHandler[apexNames.WITH_SNIPPET_CLAUSE] = handleWithSnippetClause;
nodeHandler[apexNames.WITH_NETWORK_CLAUSE] = handleWithNetworkClause;
nodeHandler[apexNames.SEARCH_WITH_CLAUSE] = handleSearchWithClause;
nodeHandler[apexNames.SEARCH_WITH_CLAUSE_VALUE] = handleSearchWithClauseValue;
nodeHandler[apexNames.RETURNING_CLAUSE] = handleReturningClause;
nodeHandler[apexNames.RETURNING_EXPRESSION] = handleReturningExpression;
nodeHandler[
  apexNames.RETURNING_SELECT_EXPRESSION
] = handleReturningSelectExpression;

// SOQL
nodeHandler[apexNames.QUERY] = handleQuery;
nodeHandler[apexNames.SELECT_COLUMN_CLAUSE] = handleColumnClause;
nodeHandler[apexNames.SELECT_COUNT_CLAUSE] = () =>
  concat(["SELECT", " ", "COUNT()"]);
nodeHandler[apexNames.SELECT_COLUMN_EXPRESSION] = handleColumnExpression;
nodeHandler[apexNames.SELECT_INNER_QUERY] = handleSelectInnerQuery;
nodeHandler[apexNames.SELECT_CASE_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexNames.CASE_EXPRESSION] = handleCaseExpression;
nodeHandler[apexNames.WHEN_OPERATOR] = _handlePassthroughCall("identifier");
nodeHandler[apexNames.WHEN_EXPRESSION] = handleWhenExpression;
nodeHandler[apexNames.CASE_OPERATOR] = _handlePassthroughCall("identifier");
nodeHandler[apexNames.ELSE_EXPRESSION] = handleElseExpression;
nodeHandler[apexNames.FIELD] = handleField;
nodeHandler[apexNames.FIELD_IDENTIFIER] = handleFieldIdentifier;
nodeHandler[apexNames.FROM_CLAUSE] = handleFromClause;
nodeHandler[apexNames.FROM_EXPRESSION] = handleFromExpression;
nodeHandler[apexNames.GROUP_BY_CLAUSE] = handleGroupByClause;
nodeHandler[apexNames.GROUP_BY_EXPRESSION] = _handlePassthroughCall("field");
nodeHandler[apexNames.GROUP_BY_TYPE] = handleGroupByType;
nodeHandler[apexNames.HAVING_CLAUSE] = handleHavingClause;
nodeHandler[apexNames.WHERE_CLAUSE] = handleWhereClause;
nodeHandler[apexNames.WHERE_INNER_EXPRESSION] = handleWhereInnerExpression;
nodeHandler[
  apexNames.WHERE_OPERATION_EXPRESSION
] = handleWhereOperationExpression;
nodeHandler[
  apexNames.WHERE_OPERATION_EXPRESSIONS
] = handleWhereOperationExpressions;
nodeHandler[
  apexNames.WHERE_COMPOUND_EXPRESSION
] = handleWhereCompoundExpression;
nodeHandler[apexNames.WHERE_UNARY_EXPRESSION] = handleWhereUnaryExpression;
nodeHandler[apexNames.WHERE_UNARY_OPERATOR] = () => "NOT";
nodeHandler[
  apexNames.WHERE_DISTANCE_EXPRESSION
] = handleWhereDistanceExpression;
nodeHandler[
  apexNames.DISTANCE_FUNCTION_EXPRESSION
] = handleDistanceFunctionExpression;
nodeHandler[apexNames.GEOLOCATION_LITERAL] = handleGeolocationLiteral;
nodeHandler[apexNames.QUERY_LITERAL_EXPRESSION] = _handlePassthroughCall(
  "literal",
);
nodeHandler[apexNames.QUERY_LITERAL] = handleWhereQueryLiteral;
nodeHandler[apexNames.APEX_EXPRESSION] = _handlePassthroughCall("expr");
nodeHandler[apexNames.COLON_EXPRESSION] = handleColonExpression;
nodeHandler[apexNames.ORDER_BY_CLAUSE] = handleOrderByClause;
nodeHandler[apexNames.ORDER_BY_EXPRESSION] = handleOrderByExpression;
nodeHandler[apexNames.WITH_VALUE] = handleWithValue;
nodeHandler[apexNames.WITH_DATA_CATEGORIES] = handleWithDataCategories;
nodeHandler[apexNames.DATA_CATEGORY] = handleDataCategory;
nodeHandler[apexNames.DATA_CATEGORY_OPERATOR] = handleDataCategoryOperator;
nodeHandler[apexNames.LIMIT_VALUE] = (path, print) =>
  concat(["LIMIT", " ", path.call(print, "i")]);
nodeHandler[apexNames.LIMIT_EXPRESSION] = (path, print) =>
  concat(["LIMIT", " ", path.call(print, "expr")]);
nodeHandler[apexNames.OFFSET_VALUE] = (path, print) =>
  concat(["OFFSET", " ", path.call(print, "i")]);
nodeHandler[apexNames.OFFSET_EXPRESSION] = (path, print) =>
  concat(["OFFSET", " ", path.call(print, "expr")]);
nodeHandler[apexNames.QUERY_OPERATOR] = childClass => values.QUERY[childClass];
nodeHandler[apexNames.SOQL_ORDER] = handleOrderOperation;
nodeHandler[apexNames.SOQL_ORDER_NULL] = handleNullOrderOperation;
nodeHandler[apexNames.TRACKING_TYPE] = handleTrackingType;
nodeHandler[apexNames.QUERY_OPTION] = handleQueryOption;
nodeHandler[apexNames.QUERY_USING_CLAUSE] = handleQueryUsingClause;
nodeHandler[apexNames.USING_EXPRESSION] = handleUsingExpression;
nodeHandler[apexNames.UPDATE_STATS_CLAUSE] = handleUpdateStatsClause;
nodeHandler[apexNames.UPDATE_STATS_OPTION] = handleUpdateStatsOption;
nodeHandler[apexNames.WHERE_COMPOUND_OPERATOR] = childClass =>
  values.QUERY_WHERE[childClass];
nodeHandler[apexNames.SEARCH_USING_CLAUSE] = (path, print) =>
  concat(["USING", " ", path.call(print, "type")]);
nodeHandler[apexNames.USING_TYPE] = handleUsingType;

function handleTrailingEmptyLines(doc, node) {
  if (node.trailingEmptyLine) {
    doc = concat([doc, hardline]); // eslint-disable-line no-param-reassign
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
    docs.push(path.call(print, apexNames.PARSER_OUTPUT, "unit"));
    // Adding a hardline as the last thing in the document
    docs.push(hardline);
    return concat(docs);
  }
  if (!apexClass) {
    return "";
  }
  if (apexClass in nodeHandler) {
    const doc = nodeHandler[apexClass](path, print, options);
    return handleTrailingEmptyLines(doc, n);
  }
  const separatorIndex = apexClass.indexOf("$");
  if (separatorIndex !== -1) {
    const parentClass = apexClass.substring(0, separatorIndex);
    const childClass = apexClass.substring(separatorIndex + 1);
    if (parentClass in nodeHandler) {
      const doc = nodeHandler[parentClass](childClass, path, print, options);
      return handleTrailingEmptyLines(doc, n);
    }
  }
  console.warn(`No handler found for ${apexClass}`); // eslint-disable-line no-console

  return "";
}

let options;
module.exports = function printGenerically(path, opts) {
  if (typeof opts === "object") {
    options = opts;
  }
  return printComments(path, options, innerPath =>
    genericPrint(innerPath, options, printGenerically),
  );
};
