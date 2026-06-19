---
description: >-
  How the Apex printer turns the jorje AST into formatted output. printer.ts is
  the heart of formatting: it maps each jorje node type to Prettier doc-IR
  builders. Read this before changing how any construct is laid out.
paths:
  - packages/prettier-plugin-apex/src/printer.ts
  - packages/prettier-plugin-apex/src/constants.ts
---

# Printer (doc-IR formatting)

`src/printer.ts` (~3.3k lines) is where formatting decisions live. The parser
hands it an enriched jorje AST; the printer walks it and emits Prettier's
**doc IR**, which Prettier then prints to a width-aware string.

- Each jorje node type is identified by its `@class` string (catalogued as
  `APEX_TYPES` in `src/constants.ts`). The printer dispatches on that class to a
  dedicated `handle*` function (~166 of them) that builds the doc for that node.
- Build docs with Prettier's doc builders: `group`, `indent`, `line`,
  `softline`, `hardline`, `fill`, `join`, `conditionalGroup`. Local helpers
  wrap common shapes: `indentConcat`, `groupConcat`, `groupIndentConcat`.
- Layout heuristics that mirror the source (e.g. forcing hardlines in a SOQL
  query the user wrote multi-line) are driven by metadata the parser attaches
  during its enrichment pass — see `parser-modes.md`. The printer should rely on
  that metadata rather than re-deriving layout from raw locations.
- Background: Prettier's doc model (the `group`/`line`/`indent` algebra) and
  Wadler-style pretty-printing. CONTRIBUTING.md links the canonical references.

Any change here affects formatted output, so it needs the TDD fixture workflow
and the changelog entry — see `testing.md`.
