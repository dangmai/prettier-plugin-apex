import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { NODE_HANDLER_CLASSES } from "../../src/printer.js";
import { getParentType } from "../../src/util.js";

/**
 * Concrete jorje nodes that appear in the generated `ApexNode` union but that
 * the printer's `@class` dispatch (`genericPrint`) does not cover. Every entry
 * must be genuinely undispatched; the test below also fails if a denylisted
 * class becomes handled or disappears from the union, so the list can't rot.
 *
 * The codegen union is deliberately complete (see `ApexNodeUnionExtension.java`),
 * so it carries nodes that are handled by other means or never formatted.
 */
const UNHANDLED_CLASSES = new Set<string>([
  // Handled outside genericPrint's @class dispatch:
  //  - comments go through the comment-attachment machinery (`comments.ts`)
  "apex.jorje.parser.impl.HiddenTokens",
  "apex.jorje.parser.impl.HiddenTokens$BlockComment",
  "apex.jorje.parser.impl.HiddenTokens$InlineComment",
  //  - the parser output is the root, handled by the `path.stack.length === 1`
  //    special case
  "apex.jorje.semantic.compiler.parser.ParserOutput",
  //  - locations are positional metadata (locStart/locEnd), never printed
  "apex.jorje.data.IndexLocation",
  "apex.jorje.data.PositionLocation",

  // jorje-internal builder/factory/tester types and synthetic nodes that never
  // appear in a serialized AST that gets formatted:
  "apex.jorje.data.CompilationUnitBuilder",
  "apex.jorje.data.TypeRefBuilder",
  "apex.jorje.data.JadtTester",
  "apex.jorje.data.SwitchTester",
  "apex.jorje.data.Identifiers",
  "apex.jorje.data.Identifiers$SyntheticIdentifier",
  "apex.jorje.data.Locatables",
  "apex.jorje.data.Locations",
  "apex.jorje.data.LocationBlocks",
  "apex.jorje.data.ast.ParameterRefs",
  "apex.jorje.data.ast.TypeRefs",
  "apex.jorje.data.ast.PrinterBlocks",
  "apex.jorje.data.sosl.SoslValues",
  // Intentionally unsupported — invalid compilation units can't be reformatted.
  "apex.jorje.data.ast.CompilationUnit$InvalidDeclUnit",

  // Parse-error nodes — only present when parsing fails, never formatted:
  "apex.jorje.data.errors.LexicalError$InvalidControlChar",
  "apex.jorje.data.errors.LexicalError$InvalidDate",
  "apex.jorje.data.errors.LexicalError$InvalidDateTime",
  "apex.jorje.data.errors.LexicalError$InvalidIdentifier",
  "apex.jorje.data.errors.LexicalError$InvalidSymbol",
  "apex.jorje.data.errors.LexicalError$InvalidTime",
  "apex.jorje.data.errors.LexicalError$SymbolInUnexpectedSet",
  "apex.jorje.data.errors.LexicalError$SymbolNotInExpectedSet",
  "apex.jorje.data.errors.LexicalError$SymbolNotInRange",
  "apex.jorje.data.errors.LexicalError$UnexpectedLexicalError",
  "apex.jorje.data.errors.LexicalError$UnexpectedSymbol",
  "apex.jorje.data.errors.LexicalError$UnrecognizedSymbol",
  "apex.jorje.data.errors.LexicalError$UnterminatedComment",
  "apex.jorje.data.errors.LexicalError$UnterminatedString",
  "apex.jorje.data.errors.SyntaxError$IllegalDecimalLiteral",
  "apex.jorje.data.errors.SyntaxError$IllegalDoubleLiteral",
  "apex.jorje.data.errors.SyntaxError$IllegalIntegerLiteral",
  "apex.jorje.data.errors.SyntaxError$IllegalLongLiteral",
  "apex.jorje.data.errors.SyntaxError$IllegalStringLiteral",
  "apex.jorje.data.errors.SyntaxError$MismatchedSyntax",
  "apex.jorje.data.errors.SyntaxError$MissingSyntax",
  "apex.jorje.data.errors.SyntaxError$UnexpectedEof",
  "apex.jorje.data.errors.SyntaxError$UnexpectedSyntaxError",
  "apex.jorje.data.errors.SyntaxError$UnexpectedToken",
  "apex.jorje.data.errors.SyntaxError$UnmatchedSyntax",
  "apex.jorje.data.errors.UserError$Lexical",
  "apex.jorje.data.errors.UserError$Syntax",

  // PRE-EXISTING GAP (not introduced by this refactor), tracked in #2423: the
  // SOQL `WITH` tuple form. `genericPrint` would throw "No handler found" if a
  // query used it. No fixture exercises it today. Remove from this list when a
  // handler + fixtures are added.
  "apex.jorje.data.soql.WithIdentifierClause$WithIdentifierTuple",
  "apex.jorje.data.soql.WithKeyValue$BooleanKeyValue",
  "apex.jorje.data.soql.WithKeyValue$NumberKeyValue",
  "apex.jorje.data.soql.WithKeyValue$StringKeyValue",
]);

/**
 * Read the generated typings and resolve every member of the `ApexNode` union
 * to its concrete `@class` literal. Parsing the generated file (rather than a
 * hand-maintained list) is what makes this test catch a newly generated jorje
 * node that nobody wrote a handler for.
 */
function readApexNodeClasses(): string[] {
  const typingsPath = fileURLToPath(
    new URL(
      "../../vendor/apex-ast-serializer/typings/jorje.d.ts",
      import.meta.url,
    ),
  );
  const dts = fs.readFileSync(typingsPath, "utf8");

  const unionMatch = dts.match(/export type ApexNode = ([^;]+);/);
  if (!unionMatch) {
    throw new Error(
      "Could not find `export type ApexNode` in the generated typings — has the codegen extension changed?",
    );
  }
  const memberNames = unionMatch[1]!.split("|").map((name) => name.trim());

  // interface name -> its own `@class` literal (the first one listed, which is
  // the bean's own class even for the rare concrete-with-subclasses node).
  const classByInterface = new Map<string, string>();
  for (const match of dts.matchAll(
    /export interface (\w+)[^{]*\{[^}]*?"@class":\s*"([^"]+)"/g,
  )) {
    classByInterface.set(match[1]!, match[2]!);
  }

  return memberNames.map((name) => {
    const apexClass = classByInterface.get(name);
    if (!apexClass) {
      throw new Error(`No @class found for ApexNode member \`${name}\``);
    }
    return apexClass;
  });
}

function isHandled(apexClass: string): boolean {
  if (NODE_HANDLER_CLASSES.has(apexClass)) {
    return true;
  }
  const parentClass = getParentType(apexClass);
  return parentClass !== undefined && NODE_HANDLER_CLASSES.has(parentClass);
}

describe("Printer dispatch exhaustiveness", () => {
  const apexNodeClasses = readApexNodeClasses();

  it("sanity-checks that the ApexNode union was parsed", () => {
    expect(apexNodeClasses.length).toBeGreaterThan(250);
  });

  it("has a handler (or an explicit denylist entry) for every concrete jorje node", () => {
    const uncovered = apexNodeClasses.filter(
      (apexClass) => !isHandled(apexClass) && !UNHANDLED_CLASSES.has(apexClass),
    );
    expect(uncovered).toEqual([]);
  });

  it("keeps the unhandled denylist honest (no stale or now-handled entries)", () => {
    const unionClasses = new Set(apexNodeClasses);
    const stale = [...UNHANDLED_CLASSES].filter(
      (apexClass) => !unionClasses.has(apexClass) || isHandled(apexClass),
    );
    expect(stale).toEqual([]);
  });
});
