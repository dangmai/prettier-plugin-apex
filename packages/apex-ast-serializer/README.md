# Apex AST Serializer

[![codecov](https://codecov.io/gh/dangmai/prettier-plugin-apex/branch/master/graph/badge.svg?flag=apex-ast-serializer)](https://codecov.io/gh/dangmai/prettier-plugin-apex)

This program serializes the Abstract Syntax Tree of an Apex Class/Trigger,
using the jorje Apex parser distributed by Salesforce.

The result is printed out to `stdout` as either a JSON or XML object.

## The jorje Dependency

This project depends on `apex-jorje-lsp.jar`, Salesforce's proprietary internal Apex parser (distributed as part of the [Salesforce VSCode extension](https://github.com/forcedotcom/salesforcedx-vscode)). It was reverse-engineered to expose a full AST suitable for formatting.

The JAR is stored (minimized) at `libs/apex-jorje-lsp.jar`. A daily CI workflow (`update-jorje.yml`) checks for new versions and opens a PR automatically. To manually update it, run `tools/create-jorje-jar.sh`.

The TypeScript type definitions for the Apex AST (`packages/prettier-plugin-apex/vendor/typings/jorje.d.ts`) are **fully generated** by the Gradle `typescript-generator` plugin — they are produced automatically as part of the `installDist` build step and should not be edited by hand.

Do not replace or upgrade `apex-jorje-lsp.jar` casually — changes may affect the AST structure and require updates to `printer.ts` and the generated typings.

## Building

This project requires Java >= 17 to compile, and specifically [GraalVM](https://www.graalvm.org/) to build native images.

To get the distributable package (without the native image), run:

```bash
./gradlew installDist
```

The package will be built and installed directly under `packages/prettier-plugin-apex/vendor`.

For native image, run:

```bash
pnpm nx run apex-ast-serializer:build:native
```

## Running

To get a list of supported options:

```bash
./apex-ast-serializer --help
```

## License

MIT
