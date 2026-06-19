---
description: >-
  The Java component that parses Apex (via Salesforce's jorje) and serializes the
  AST to JSON for the plugin. Covers the pinned jorje dependency, the build-time
  code-generated serializer, generated typings, and the GraalVM native-image
  build. Read this before changing anything under apex-ast-serializer.
paths:
  - packages/apex-ast-serializer/**/*
---

# apex-ast-serializer (Java)

Parses an Apex class/trigger with jorje and serializes the AST to JSON on
`stdout` (`parser/src/main/java/.../Apex.java`). Serialization is **reflection-
free and code-generated at build time**: the `serializer-generator` subproject
scans jorje (ClassGraph) and emits `GeneratedAstSerializer`, which reads each
node via public fields/getters and writes through Jackson's streaming API
(`sink/AstSink` + `JsonAstSink`). A long-running HTTP server (`server/...`) is
the backend for the plugin's `built-in` mode. (The original XStream pipeline was
replaced for performance — see `adr/` — and the JSON shape is unchanged.)

## jorje is proprietary and pinned — do not upgrade casually

- `libs/apex-jorje-lsp.jar` is Salesforce's internal parser (minimized). A daily
  CI workflow (`update-jorje.yml`) opens version-bump PRs; to update manually run
  `tools/create-jorje-jar.sh`.
- An AST-shape change ripples into the plugin's `printer.ts` and the generated
  typings, so treat jorje bumps as potentially breaking.

## Generated typings — never hand-edit

`packages/prettier-plugin-apex/vendor/typings/jorje.d.ts` is **fully generated**
by the Gradle `typescript-generator` plugin during `installDist`. Edit the
generator config (`server/.../types/Custom*Extension.java`), not the output.

## Native image & reflection

- The generated serializer uses no runtime reflection, so the GraalVM native
  image needs no jorje reflection registration (the old
  `RuntimeReflectionRegistrationFeature` and the XStream-only `--add-opens` were
  removed). The native build still relies on the native-image-agent metadata
  under `parser/build/native/agent-output/` for proxies/resources.
- Requires Java >= 17; native images require GraalVM.

## Build / test

```bash
./gradlew installDist                                # JVM dist -> plugin vendor/
pnpm nx run apex-ast-serializer:build                # same, via Nx
pnpm nx run apex-ast-serializer:build:native         # GraalVM native image
pnpm nx run apex-ast-serializer:test                 # JUnit + JaCoCo
```

See `packages/apex-ast-serializer/README.md` for the full story.
