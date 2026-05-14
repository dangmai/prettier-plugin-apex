# prettier-plugin-apex

A Prettier plugin for Salesforce Apex. It is a pnpm monorepo orchestrated with Nx. The plugin delegates parsing to a Java component (`apex-ast-serializer`) that wraps Salesforce's proprietary `jorje` parser, then uses Prettier's doc IR to format the resulting AST.

## Read these first

- [CONTRIBUTING.md](CONTRIBUTING.md) — full dev setup, quickstart, and workflow
- [packages/prettier-plugin-apex/README.md](packages/prettier-plugin-apex/README.md) — plugin usage and options
- [packages/apex-ast-serializer/README.md](packages/apex-ast-serializer/README.md) — Java parser, jorje dependency, type generation

## Monorepo structure

```
packages/
  prettier-plugin-apex/      # TypeScript plugin (parser.ts, printer.ts, comments.ts)
  apex-ast-serializer/       # Java/Gradle parser wrapping jorje
  playground/                # React/Vite web playground (deployed on Render)
  @prettier-apex/            # Platform-specific native binary packages
```

## Key commands

```bash
# Start HTTP parsing server (needed for built-in mode; VSCode task does this automatically)
pnpm nx run prettier-plugin-apex:start-server

# Run unit tests (built-in HTTP server mode — preferred for local dev)
pnpm nx run prettier-plugin-apex:test:parser --configuration built-in

# Run unit tests (native binary mode)
pnpm nx run prettier-plugin-apex:test:parser --configuration native

# Update snapshots
pnpm nx run prettier-plugin-apex:test:parser --configuration built-in -u

# Run with AST comparison (validates semantic equivalence after formatting)
AST_COMPARE=true pnpm nx run prettier-plugin-apex:test:parser --configuration built-in

# Lint
pnpm nx run prettier-plugin-apex:lint
```

## Agent workflow rules

- **Follow TDD.** For any change that touches the printer, parser, or comment-attachment logic, write a failing test fixture first (a `.cls` file under `packages/prettier-plugin-apex/tests/<feature>/` with a `jsfmt.spec.ts`), confirm it fails for the expected reason, then make the change. Snapshot-only PRs (test additions for already-working grammar) skip the red phase, but anything fixing or extending behavior must have a fixture that fails without the change.
- **Changelog entry required for any change that affects formatted output.** Add a bullet under `# Unreleased` in `CHANGELOG.md` describing the user-visible behavior change. Bug fixes, layout changes, comment-handling changes, and new grammar support all qualify. Pure test additions, build/CI tweaks, internal refactors, and dependency bumps don't.
- **Before pushing**: run `pnpm nx run prettier-plugin-apex:lint` and fix any issues, then run the unit tests (`test:parser --configuration built-in`). Both must pass. For changes touching the printer or comment logic, also run `AST_COMPARE=true …` to catch idempotency regressions.
- **After completing a major feature**: verify that CLAUDE.md and the relevant README files still accurately describe the project.
