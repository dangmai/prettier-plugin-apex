---
description: >-
  The test-driven workflow and commands for changing the plugin's formatting
  (printer, parser, or comment-attachment logic). Read this before editing those
  files or adding test fixtures.
paths:
  - packages/prettier-plugin-apex/src/printer.ts
  - packages/prettier-plugin-apex/src/parser.ts
  - packages/prettier-plugin-apex/src/comments.ts
  - packages/prettier-plugin-apex/tests/**/*
  - packages/prettier-plugin-apex/tests_config/**/*
---

# Testing & TDD workflow

**Follow TDD for any change to the printer, parser, or comment-attachment
logic.** Write a failing fixture first, confirm it fails for the expected
reason, then implement.

- A fixture is a `.cls`/`.trigger`/`.apex` file under
  `packages/prettier-plugin-apex/tests/<feature>/` next to a `jsfmt.spec.ts`:

  ```ts
  import { fileURLToPath } from "url";
  runSpec(fileURLToPath(new URL(".", import.meta.url)), ["apex"]);
  ```

  Pass a third options argument to `runSpec` to exercise specific Prettier
  options. Anonymous Apex uses the `apex-anonymous` parser.
- Snapshot-only additions (tests for already-correct grammar) skip the red
  phase; anything fixing or extending behavior must have a fixture that fails
  without the change.

## Commands

```bash
# Run unit tests (built-in HTTP server mode — preferred for local dev)
pnpm nx run prettier-plugin-apex:test:parser --configuration built-in
# Native binary mode
pnpm nx run prettier-plugin-apex:test:parser --configuration native
# Update snapshots (always do this before opening a PR)
pnpm nx run prettier-plugin-apex:test:parser --configuration built-in -u
# AST comparison — validates the formatted output is semantically equivalent
AST_COMPARE=true pnpm nx run prettier-plugin-apex:test:parser --configuration built-in
```

Built-in mode needs the parser server running (`parser-modes.md`).

**Before pushing** a formatting change: lint + built-in tests must pass, and for
printer/comment changes also run `AST_COMPARE=true …` to catch idempotency /
cross-pass regressions. Output-affecting changes also need a `CHANGELOG.md`
entry (see root `CLAUDE.md`).
