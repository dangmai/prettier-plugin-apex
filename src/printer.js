"use strict";

const docBuilders = require("prettier").doc.builders;
const {concat, join, hardline, line, softline, literalline, group, indent, dedent, ifBreak, breakParent} = docBuilders;

const USER_CLASS = "apex.jorje.semantic.ast.compilation.UserClass";
const METHOD = "apex.jorje.semantic.ast.member.Method";
const MODIFIER  = "apex.jorje.semantic.ast.modifier.Modifier";
const ANNOTATION = "apex.jorje.semantic.ast.modifier.Annotation";
const ANNOTATION_KEY_VALUE = "apex.jorje.data.ast.AnnotationParameter_-AnnotationKeyValue";
const ANNOTATION_TRUE_VALUE = "apex.jorje.data.ast.AnnotationValue$TrueAnnotationValue";
const ANNOTATION_FALSE_VALUE = "apex.jorje.data.ast.AnnotationValue$FalseAnnotationValue";
const LOCATION_IDENTIFIER = "apex.jorje.data.Identifiers_-LocationIdentifier";
const CLASS_TYPE_REF = "apex.jorje.data.ast.TypeRefs_-ClassTypeRef";
const PARAMETER = "apex.jorje.semantic.ast.member.Parameter";
const BLOCK_STATEMENT = "apex.jorje.semantic.ast.statement.BlockStatement";
const RETURN_STATEMENT = "apex.jorje.semantic.ast.statement.ReturnStatement";
const BINARY_EXPRESSION = "apex.jorje.semantic.ast.expression.BinaryExpression";
const VARIABLE_EXPRESSION = "apex.jorje.semantic.ast.expression.VariableExpression";
const LITERAL_EXPRESSION = "apex.jorje.semantic.ast.expression.LiteralExpression";
const BOOLEAN_EXPRESSION = "apex.jorje.semantic.ast.expression.BooleanExpression";
const METHOD_CALL_EXPRESSION = "apex.jorje.semantic.ast.expression.MethodCallExpression";
const THIS_VARIABLE_EXPRESSION = "apex.jorje.semantic.ast.expression.ThisVariableExpression";
const VARIABLE_DECLARATION_STATEMENTS = "apex.jorje.semantic.ast.statement.VariableDeclarationStatements";
const VARIABLE_DECLARATION = "apex.jorje.semantic.ast.statement.VariableDeclaration";

function printSuperReference(node) {
  const docs = [];
  const superTypeRef = node.modifiers.definingType.codeUnit.value.superTypeRef;
  if (superTypeRef.value && superTypeRef.value.names && superTypeRef.value.names[LOCATION_IDENTIFIER]) {
    docs.push(" ");
    docs.push("extends");
    docs.push(" ");
    docs.push(superTypeRef.value.names[LOCATION_IDENTIFIER].value);
  }
  if (docs.length > 0) {
    return concat(docs);
  }
  return "";
}

function printInterfaceReference(node) {
  const docs = [];
  const interfaceTypeRef = node.modifiers.definingType.codeUnit.value.interfaceTypeRefs;
  if (!interfaceTypeRef[CLASS_TYPE_REF]) {
    return "";
  }
  let classTypeRefs = interfaceTypeRef[CLASS_TYPE_REF];
  if (!Array.isArray(classTypeRefs)) {
    classTypeRefs = [classTypeRefs];
  }
  docs.push(" ");
  docs.push("implements");
  docs.push(" ");
  docs.push(classTypeRefs.map(ref => ref.names[LOCATION_IDENTIFIER].value).join(", "));
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
  if (modifiers[MODIFIER] && Array.isArray(modifiers[MODIFIER])) {
    modifiers[MODIFIER]
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
  if (annotations[ANNOTATION]) {
    docs.push(`@${annotations[ANNOTATION].astAnnotation.name.value}`);
    if (annotations[ANNOTATION].astAnnotation.parameters[ANNOTATION_KEY_VALUE]) {
      docs.push("(");
      docs.push(annotations[ANNOTATION].astAnnotation.parameters[ANNOTATION_KEY_VALUE].key.value);
      docs.push("=");
      switch (annotations[ANNOTATION].astAnnotation.parameters[ANNOTATION_KEY_VALUE].value["$"].class) {
        case ANNOTATION_TRUE_VALUE:
          docs.push("true");
          break;
        case ANNOTATION_FALSE_VALUE:
          docs.push("false");
          break;
        default:
          docs.push("'");
          docs.push(annotations[ANNOTATION].astAnnotation.parameters[ANNOTATION_KEY_VALUE].value.value);
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
  let parameters = node.methodInfo.parameters.list[PARAMETER];
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

const binaryExpressions = {
  "ADDITION": "+",
  "SUBTRACTION": "-",
  "MULTIPLICATION": "*",
  "DIVISION": "/",
  "LEFT_SHIFT": "<<",
  "RIGHT_SHIFT": ">>",
  "UNSIGNED_RIGHT_SHIFT": ">>>",
  "XOR": "^",
  "AND": "&",
  "OR": "|",
};
function printBinaryExpression(node, children, path, print) {
  const docs = [];
  const childDocs = printChildNodes(children, path, print);
  docs.push(childDocs[0]);
  docs.push(" ");
  docs.push(binaryExpressions[node.op]);
  docs.push(" ");
  docs.push(childDocs[1]);
  return concat(docs);
}

const booleanExpressions = {
  "DOUBLE_EQUAL": "==",
  "TRIPLE_EQUAL": "===",
  "NOT_TRIPLE_EQUAL": "!==",
  "NOT_EQUAL": "!=",
  "ALT_NOT_EQUAL": "<>",
  "LESS_THAN": "<",
  "GREATER_THAN": ">",
  "LESS_THAN_EQUAL": "<=",
  "GREATER_THAN_EQUAL": ">=",
  "AND": "&&",
  "OR": "||",
};
// TODO Fix cases with parentheses
function printBooleanExpression(node, children, path, print) {
  const docs = [];
  const childDocs = printChildNodes(children, path, print);
  docs.push(childDocs[0]);
  docs.push(" ");
  docs.push(booleanExpressions[node.op]);
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
    if (dottedExpression["$"].class === THIS_VARIABLE_EXPRESSION) {
      docs.push("this");
    } else {
      // 2nd: named expression
      const names = node.reference.names;
      if (names && names.elements && names.elements[LOCATION_IDENTIFIER]) {
        docs.push(names.elements[LOCATION_IDENTIFIER].value);
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
  if (typeRef && typeRef.names && typeRef.names[LOCATION_IDENTIFIER]) {
    docs.push(typeRef.names[LOCATION_IDENTIFIER].value);
    docs.push(" ");
  }
  docs.push(node.localInfo.name.value);
  docs.push(" ");
  docs.push("=");
  docs.push(" ");
  // Now we expand the right side of the declaration by going down the child nodes,
  // except for the variable expression since it has already been handled above.
  if (VARIABLE_EXPRESSION in children) {
    delete children[VARIABLE_EXPRESSION];
  }
  const childDocs = printChildNodes(children, path, print);
  docs.push(concat(childDocs));
  return concat(docs);
}

const nodeHandler = {};
nodeHandler[USER_CLASS] = printClassDeclaration;
nodeHandler[METHOD] = printMethodDeclaration;
nodeHandler[BLOCK_STATEMENT] = printBlockStatement;
nodeHandler[RETURN_STATEMENT] = printReturnStatement;
nodeHandler[BINARY_EXPRESSION] = printBinaryExpression;
nodeHandler[VARIABLE_EXPRESSION] = printVariableExpression;
nodeHandler[LITERAL_EXPRESSION] = printLiteralExpression;
nodeHandler[BOOLEAN_EXPRESSION] = printBooleanExpression;
nodeHandler[METHOD_CALL_EXPRESSION] = printMethodCallExpression;
nodeHandler[THIS_VARIABLE_EXPRESSION] = printThisExpression;
nodeHandler[VARIABLE_DECLARATION_STATEMENTS] = printVariableDeclarationStatements;
nodeHandler[VARIABLE_DECLARATION] = printVariableDeclaration;

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
