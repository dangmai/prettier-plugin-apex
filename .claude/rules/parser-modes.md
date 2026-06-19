---
description: >-
  How the plugin obtains the AST from the Java serializer — the three parser
  modes, the HTTP server lifecycle, and the post-parse enrichment pass. Read
  this before changing parser.ts, the server wiring, or the server bins.
paths:
  - packages/prettier-plugin-apex/src/parser.ts
  - packages/prettier-plugin-apex/src/http-server.ts
  - packages/prettier-plugin-apex/bin/*
---

# Parser modes & enrichment

`src/parser.ts` gets the jorje AST from the Java `apex-ast-serializer`
(`java-serializer.md`), `JSON.parse`s it, then runs a DFS **enrichment pass**
that fixes/derives node locations and attaches layout metadata the printer
relies on (`forcedHardline`, `EnrichedIfBlock`, trailing-empty-line flags).

## The `apexStandaloneParser` option (three modes)

- `native` (**default**) — spawn the prebuilt native binary per file, resolved
  from the `@prettier-apex/*` package for the platform; falls back to the JVM
  CLI if the binary is missing.
- `built-in` — POST to a long-running HTTP server (`apexStandaloneHost` /
  `apexStandalonePort` / `apexStandaloneProtocol`, default `localhost:2117`).
  Fastest for repeated formats; needs the server up.
- `none` — spawn the JVM CLI (`vendor/apex-ast-serializer/bin/...`) per file.

## Server lifecycle

```bash
pnpm nx run prettier-plugin-apex:start-server   # start (backgrounds itself)
pnpm nx run prettier-plugin-apex:wait-server    # block until reachable
pnpm nx run prettier-plugin-apex:stop-server    # shut down via endpoint
```

Bins: `bin/start-apex-server.ts`, `bin/stop-apex-server.ts`. Tests pick the mode
via the `APEX_PARSER` env var (the `built-in` vs `native` test configurations).

Notes: spawns set `DEBUG=""` to dodge the Gradle Windows-wrapper verbose-log bug
(#1513). The perf instrumentation seams in this file are covered by
`performance-harness.md`.
