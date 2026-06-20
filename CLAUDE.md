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

## Universal workflow rules

- **Before pushing**: run `pnpm nx run prettier-plugin-apex:lint` and the unit tests (`pnpm nx run prettier-plugin-apex:test:parser --configuration built-in`). Both must pass.
- **Before merging a non-trivial PR**: the integration suite runs only on manual dispatch (`gh workflow run tests-deployments.yml --ref <branch>`), not regular PR CI — dispatch it and confirm green first.
- **Changelog entry required for any change that affects formatted output.** Add a bullet under `# Unreleased` in `CHANGELOG.md`. Bug fixes, layout changes, comment-handling changes, and new grammar support all qualify. Pure test additions, build/CI tweaks, internal refactors, and dependency bumps don't — though a notable internal-only improvement (e.g. a type-safety pass) still warrants a one-line `## Internal Changes` bullet.
- **For changes that could affect performance** (printer, parser/prep walk, comment attachment, or the Java serializer), add the `benchmark` label to the PR and read the bot's comparison comment to confirm the real measured impact — don't reason about perf only in the abstract. See `performance-harness.md`.
- **After completing a major feature**: verify CLAUDE.md and the relevant README files still accurately describe the project.
- **Big feature work needs an ADR** in `adr/` at the repo root, recording the decision and its rationale.

## Scoped rules

Topic-specific guidance lives in `.claude/rules/` and auto-loads when you open matching files:

- `printer.md` — the doc-IR printer and node handlers
- `comments.md` — comment attachment
- `testing.md` — the TDD fixture workflow and test commands
- `parser-modes.md` — native / built-in HTTP / CLI parser modes and the server
- `java-serializer.md` — the Java / jorje / code-generated serializer / native-image component
- `playground.md` — the web playground
- `performance-harness.md` — performance benchmarking
