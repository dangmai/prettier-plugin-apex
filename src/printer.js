"use strict";

const docBuilders = require("prettier").doc.builders;
const {concat, join, hardline, line, softline, literalline, group, indent, ifBreak, breakParent} = docBuilders;

// const concat = docBuilders.concat;
// const join = docBuilders.join;
// const hardline = docBuilders.hardline;
// const line = docBuilders.line;
// const softline = docBuilders.softline;
// const literalline = docBuilders.literalline;
// const group = docBuilders.group;
// const indent = docBuilders.indent;
// const ifBreak = docBuilders.ifBreak;
// const breakParent = docBuilders.breakParent;

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
  return docs;
}

function printInterfaceReference(node) {
  const docs = [];
  const interfaceTypeRef = node.modifiers.definingType.codeUnit.value.interfaceTypeRefs;
  if (!interfaceTypeRef[CLASS_TYPE_REF]) {
    return docs;
  }
  let classTypeRefs = interfaceTypeRef[CLASS_TYPE_REF];
  if (!Array.isArray(classTypeRefs)) {
    classTypeRefs = [classTypeRefs];
  }
  docs.push(" ");
  docs.push("implements");
  docs.push(" ");
  docs.push(classTypeRefs.map(ref => ref.names[LOCATION_IDENTIFIER].value).join(", "));
  return docs;
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
  return docs;
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
  return docs;
}

function printClassDeclaration(node, children, path, print) {
  const docs = [];
  docs.push(...printAnnotations(node));
  docs.push(...printModifiers(node));
  docs.push("class");
  docs.push(" ");
  docs.push(node.name.value);
  docs.push(...printSuperReference(node));
  docs.push(...printInterfaceReference(node));
  docs.push(" ");

  docs.push("{");
  const childNodeKeys = Object.keys(children).filter(key => key !== "$");
  if(childNodeKeys.length > 0) {
    docs.push(hardline);
  }
  childNodeKeys.forEach(key => {
    if (Array.isArray(children[key])) {
      docs.push(...path.map(print, "children", key));
    } else {
      docs.push(path.call(print, "children", key));
    }
  });

  docs.push("}");
  docs.push(hardline);
  return concat(docs);
}

function printReturnType(node) {
  return [node.methodInfo.returnType.apexName, " "];
}

function printMethodParams(node) {
  let parameters = node.methodInfo.parameters.list[PARAMETER];
  if (!Array.isArray(parameters)) {
    parameters = [parameters];
  }
  const docs = parameters.map(parameter => `${parameter.type.type.apexName} ${parameter.name.value}`).join(", ");
  return docs;
}

function printMethodDeclaration(node, children, path, print) {
  if (node.methodInfo.generated !== "USER") {
    return '';
  }
  const docs = [];
  docs.push(...printAnnotations(node));
  docs.push(...printModifiers(node));
  docs.push(...printReturnType(node));
  docs.push(node.methodInfo.canonicalName);
  docs.push("(");
  docs.push(...printMethodParams(node));
  docs.push(")");
  docs.push(" ");

  docs.push("{");
  const childNodeKeys = Object.keys(children).filter(key => key !== "$");
  if(childNodeKeys.length > 0) {
    docs.push(hardline);
  }
  childNodeKeys.forEach(key => {
    docs.push(path.call(print, "children", key));
  });

  docs.push("}");
  docs.push(hardline);
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
  return nodeHandler[n.node["$"].class](n.node, n.children, path, print);
}

module.exports = genericPrint;
