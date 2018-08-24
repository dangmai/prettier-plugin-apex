"use strict";

const docBuilders = require("prettier").doc.builders;
const {concat, join, hardline, line, softline, literalline, group, indent, dedent, ifBreak, breakParent} = docBuilders;

const expressions = require("./expressions");
const classes = require("./classes");

function indentConcat(docs) {
  return indent(concat(docs));
}

function printSuperReference(node) {
  const docs = [];
  const superTypeRef = node.modifiers.definingType.codeUnit.value.superTypeRef;
  if (superTypeRef.value && superTypeRef.value.names && superTypeRef.value.names[classes.LOCATION_IDENTIFIER]) {
    docs.push(" ");
    docs.push("extends");
    docs.push(" ");
    docs.push(superTypeRef.value.names[classes.LOCATION_IDENTIFIER].value);
  }
  if (docs.length > 0) {
    return concat(docs);
  }
  return "";
}

function printInterfaceReference(node) {
  const docs = [];
  const interfaceTypeRef = node.modifiers.definingType.codeUnit.value.interfaceTypeRefs;
  if (!interfaceTypeRef[classes.CLASS_TYPE_REF]) {
    return "";
  }
  let classTypeRefs = interfaceTypeRef[classes.CLASS_TYPE_REF];
  if (!Array.isArray(classTypeRefs)) {
    classTypeRefs = [classTypeRefs];
  }
  docs.push(" ");
  docs.push("implements");
  docs.push(" ");
  docs.push(classTypeRefs.map(ref => ref.names[classes.LOCATION_IDENTIFIER].value).join(", "));
  if (docs.length > 0) {
    return concat(docs);
  }
  return "";
}

function printModifiers(node) {
  const modifierNameMap = {
    withSharing: "with sharing",
    withoutSharing: "without sharing",
  };
  const docs = [];
  const modifiers = node.modifiers.modifiers.modifiers;
  if (modifiers[classes.MODIFIER] && Array.isArray(modifiers[classes.MODIFIER])) {
    modifiers[classes.MODIFIER]
      .filter(modifier => modifier.type[0].apexName !== "explicitStatementExecuted")
      .forEach(modifier => {
        const apexName = modifier.type[0].apexName;
        if (apexName in modifierNameMap) {
          docs.push(modifierNameMap[apexName]);
        } else {
          docs.push(apexName);
        }
        docs.push(" ");
      });
  }
  return concat(docs);
}

function printAnnotations(node) {
  const docs = [];
  const annotations = node.modifiers.modifiers.annotations;
  if (annotations[classes.ANNOTATION]) {
    docs.push(`@${annotations[classes.ANNOTATION].astAnnotation.name.value}`);
    if (annotations[classes.ANNOTATION].astAnnotation.parameters[classes.ANNOTATION_KEY_VALUE]) {
      docs.push("(");
      docs.push(annotations[classes.ANNOTATION].astAnnotation.parameters[classes.ANNOTATION_KEY_VALUE].key.value);
      docs.push("=");
      switch (annotations[classes.ANNOTATION].astAnnotation.parameters[classes.ANNOTATION_KEY_VALUE].value["$"].class) {
        case classes.ANNOTATION_TRUE_VALUE:
          docs.push("true");
          break;
        case classes.ANNOTATION_FALSE_VALUE:
          docs.push("false");
          break;
        default:
          docs.push("'");
          docs.push(annotations[classes.ANNOTATION].astAnnotation.parameters[classes.ANNOTATION_KEY_VALUE].value.value);
      }
      docs.push(")");
    }
    docs.push(hardline);
  }
  return concat(docs);
}

// Unlike other methods, this one returns a list of Docs instead of just 1 Doc.
// This is so that the calling code has flexibility on how to display the children.
function printChildNodes(children, path, print) {
  if (!children) {
    return [];
  }
  let childDocs = [];
  const childNodeKeys = Object.keys(children).filter(key => key !== "$");
  childNodeKeys.forEach(key => {
    if (Array.isArray(children[key])) {
      childDocs.push(...path.map(print, "children", key));
    } else {
      childDocs.push(path.call(print, "children", key));
    }
  });
  childDocs = childDocs.filter(childDoc => childDoc !== "");
  return childDocs;
}

function printClassDeclaration(node, children, path, print) {
  const docs = [];
  docs.push(printAnnotations(node));
  docs.push(printModifiers(node));
  docs.push("class");
  docs.push(" ");
  docs.push(node.name.value);
  docs.push(printSuperReference(node));
  docs.push(printInterfaceReference(node));
  docs.push(" ");

  docs.push("{");
  // Get all the child nodes, then add 2 hardlines at the end of each one, except for the very last one.
  // That last one will be handled later on as a special case, since it is used to dedent the closing bracket.
  const childDocs = printChildNodes(children, path, print).map((childDoc, index, allChildDocs) => {
    if (index !== allChildDocs.length - 1) {
      return concat([childDoc, hardline, hardline])
    }
    return childDoc;
  });
  if(childDocs.length > 0) {
    docs.push(indent(concat([hardline, ...childDocs])));
    docs.push(dedent(concat([hardline, "}"])));
  } else {
    docs.push("}");
  }

  return concat(docs);
}

function printReturnType(node) {
  return concat([node.methodInfo.returnType.apexName, " "]);
}

function printMethodParams(node) {
  if (!node || !node.methodInfo || !node.methodInfo.parameters || !node.methodInfo.parameters.list) {
    return "";
  }
  let parameters = node.methodInfo.parameters.list[classes.PARAMETER];
  if (!Array.isArray(parameters)) {
    parameters = [parameters];
  }
  const docs = parameters.map(parameter => `${parameter.type.type.apexName} ${parameter.name.value}`).join(", ");
  return concat([docs]);
}

function printMethodDeclaration(node, children, path, print) {
  if (node.methodInfo.generated !== "USER") {
    return '';
  }
  const docs = [];
  docs.push(printAnnotations(node));
  docs.push(printModifiers(node));
  docs.push(printReturnType(node));
  docs.push(node.methodInfo.canonicalName);
  docs.push("(");
  docs.push(printMethodParams(node));
  docs.push(")");
  docs.push(" ");

  docs.push("{");
  const childDocs = printChildNodes(children, path, print);
  if(childDocs.length > 0) {
    docs.push(indent(concat([hardline, ...childDocs])));
    docs.push(concat([hardline, "}"]));
  } else {
    docs.push("}");
  }
  return concat(docs);
}

function printBlockStatement(node, children, path, print) {
  const childDocs = printChildNodes(children, path, print);
  if (childDocs.length > 0) {
    return concat([...childDocs, ";"]);
  }
  return "";
}

function printReturnStatement(node, children, path, print) {
  const docs = [];
  docs.push("return");
  const childDocs = printChildNodes(children, path, print);
  if (childDocs.length > 0) {
    docs.push(" ");
    docs.push(concat(childDocs));
  }
  return concat(docs);
}

function printBinaryExpression(node, children, path, print) {
  const docs = [];
  const childDocs = printChildNodes(children, path, print);
  docs.push(childDocs[0]);
  docs.push(" ");
  docs.push(expressions.BINARY[node.op]);
  docs.push(" ");
  docs.push(childDocs[1]);
  return concat(docs);
}

// TODO Fix cases with parentheses
function printBooleanExpression(node, children, path, print) {
  const docs = [];
  const childDocs = printChildNodes(children, path, print);
  docs.push(childDocs[0]);
  docs.push(" ");
  docs.push(expressions.BOOLEAN[node.op]);
  docs.push(" ");
  docs.push(childDocs[1]);
  return concat(docs);
}

function printVariableExpression(node, children, path, print) {
  return concat([node.name.value]);
}

function printLiteralExpression(node, children, path, print) {
  // TODO Fix cases where String literal is just white spaces, in which cases node.literal["_"] is undefined
  if (node.literalType === "STRING") {
    return concat(["'", node.literal["_"] ? node.literal["_"]: '', "'"]);
  }
  return concat([node.literal["_"]]);
}

function printThisExpression(node, children, path, print) {
  return "this";
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

function printVariableDeclarationStatements(node, children, path, print) {
  const docs = [];
  const childDocs = printChildNodes(children, path, print);
  docs.push(group(join(concat([",", line]), childDocs)));
  docs.push(";");
  docs.push(hardline);
  return concat(docs);
}

function printVariableDeclaration(node, children, path, print) {
  const docs = [];
  const typeRef = node.declarations.typeRef;
  if (typeRef && typeRef.names && typeRef.names[classes.LOCATION_IDENTIFIER]) {
    docs.push(typeRef.names[classes.LOCATION_IDENTIFIER].value);
    docs.push(" ");
  }
  docs.push(node.localInfo.name.value);
  docs.push(" ");
  docs.push("=");
  docs.push(" ");
  // Now we expand the right side of the declaration by going down the child nodes,
  // except for the variable expression since it has already been handled above.
  if (classes.VARIABLE_EXPRESSION in children) {
    delete children[classes.VARIABLE_EXPRESSION];
  }
  const childDocs = printChildNodes(children, path, print);
  docs.push(concat(childDocs));
  return concat(docs);
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
  const docs = path.map(print, "names");
  return join(", ", docs);
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
  // Variable name
  const declarationDocs = path.map(print, "decls");
  if (declarationDocs.length > 1) {
    parts.push(join(", ", declarationDocs));
    parts.push(";");
  } else if (declarationDocs.length === 1) {
    parts.push(concat([declarationDocs[0], ";"]));
  }
  return concat(parts);
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

function _handlePassthroughCall(...names) {
  return function(_, path, print) {
    return path.call(print, ...names);
  }
}

const nodeHandler = {};
nodeHandler[classes.USER_CLASS] = printClassDeclaration;
nodeHandler[classes.METHOD] = printMethodDeclaration;
nodeHandler[classes.BLOCK_STATEMENT] = printBlockStatement;
// nodeHandler[classes.RETURN_STATEMENT] = printReturnStatement;
nodeHandler[classes.BINARY_EXPRESSION] = printBinaryExpression;
nodeHandler[classes.VARIABLE_EXPRESSION] = printVariableExpression;
nodeHandler[classes.LITERAL_EXPRESSION] = printLiteralExpression;
nodeHandler[classes.BOOLEAN_EXPRESSION] = printBooleanExpression;
nodeHandler[classes.METHOD_CALL_EXPRESSION] = printMethodCallExpression;
nodeHandler[classes.THIS_VARIABLE_EXPRESSION] = printThisExpression;
nodeHandler[classes.VARIABLE_DECLARATION] = printVariableDeclaration;

nodeHandler[classes.CLASS_DECLARATION] = handleClassDeclaration;
nodeHandler[classes.CLASS_TYPE_REF] = handleClassTypeRef;
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

function genericPrint(path, options, print) {
  const n = path.getValue();
  if (!n) {
    return "";
  }
  if (typeof n === "string") {
    return n;
  }
  if (Array.isArray(n)) {
    // simply map the print function over the values
    return path.map(print);
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
