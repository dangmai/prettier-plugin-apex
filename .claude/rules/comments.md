---
description: >-
  How comments are attached to and printed within the Apex AST. comments.ts is
  the trickiest subsystem — jorje returns comments as hidden tokens and Prettier
  must decide which node each one belongs to. Read this before touching comment
  placement.
paths:
  - packages/prettier-plugin-apex/src/comments.ts
---

# Comment attachment

`src/comments.ts` implements Prettier's comment-handler contract plus a pile of
Apex-specific special cases. Comments are the most regression-prone area: a
misplacement often only shows up as a comment drifting across format passes.

- Prettier hook contract: `handleOwnLineComment`, `handleEndOfLineComment`,
  `handleRemainingComment` each return `true` once they've placed a comment
  (and `false` to let the default logic run). Supporting hooks: `canAttachComment`,
  `willPrintOwnComments`, `isBlockComment`, `printComment`, `printDanglingComment`.
- `isPrettierIgnore` recognizes `// prettier-ignore` / `/* prettier-ignore */`;
  ignored nodes print their original source verbatim.
- Special cases live here for dangling comments, WHERE-expression clauses,
  block-statement leading comments, binaryish right-child trailing comments,
  long method-call chains, `continue`/`break`/`return` dangling comments, and
  modifier prettier-ignore. When adding a case, find the nearest existing
  handler rather than adding a new top-level branch.
- ApexDoc (`/** ... */`) has its own handling.

Comment changes affect output and are easy to get subtly wrong: follow the TDD
fixture workflow and **always run `AST_COMPARE=true`** to catch cross-pass
drift — see `testing.md`.
