"use strict";

const docBuilders = require("prettier").doc.builders;
const {concat, join, hardline, line, softline, literalline, group, indent, dedent, ifBreak, breakParent} = docBuilders;

const expressions = require("./expressions");
const classes = require("./classes");

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

const nodeHandler = {};
nodeHandler[classes.USER_CLASS] = printClassDeclaration;
nodeHandler[classes.METHOD] = printMethodDeclaration;
nodeHandler[classes.BLOCK_STATEMENT] = printBlockStatement;
nodeHandler[classes.RETURN_STATEMENT] = printReturnStatement;
nodeHandler[classes.BINARY_EXPRESSION] = printBinaryExpression;
nodeHandler[classes.VARIABLE_EXPRESSION] = printVariableExpression;
nodeHandler[classes.LITERAL_EXPRESSION] = printLiteralExpression;
nodeHandler[classes.BOOLEAN_EXPRESSION] = printBooleanExpression;
nodeHandler[classes.METHOD_CALL_EXPRESSION] = printMethodCallExpression;
nodeHandler[classes.THIS_VARIABLE_EXPRESSION] = printThisExpression;
nodeHandler[classes.VARIABLE_DECLARATION_STATEMENTS] = printVariableDeclarationStatements;
nodeHandler[classes.VARIABLE_DECLARATION] = printVariableDeclaration;

function genericPrint(path, options, print) {
  const n = path.getValue();
  const name = path.getName();
  if (!n || !n.node || !n.node["$"] || !n.node["$"].class || !nodeHandler[n.node["$"].class]) {
    return "";
  }
  const doc = nodeHandler[n.node["$"].class](n.node, n.children, path, print);
  if (path.stack.length === 1) {
    // Adding a hardline as the last thing in the document
    return concat([doc, hardline]);
  }
  return doc;
}

module.exports = genericPrint;
