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

function printChildNodes(children, path, print) {
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
  const childDocs = printChildNodes(children, path, print);
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
    docs.push(dedent(concat([hardline, "}"])));
  } else {
    docs.push("}");
  }
  return concat(docs);
}

const nodeHandler = {};
nodeHandler[USER_CLASS] = printClassDeclaration;
nodeHandler[METHOD] = printMethodDeclaration;

function genericPrint(path, options, print) {
  const n = path.getValue();
  const name = path.getName();
  if (name && nodeHandler[name]) {
    nodeHandler[name](n.node, n.children, path, print);
  }
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
