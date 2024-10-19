# Apex AST Serializer

[![codecov](https://codecov.io/gh/dangmai/prettier-plugin-apex/branch/master/graph/badge.svg?flag=apex-ast-serializer)](https://codecov.io/gh/dangmai/prettier-plugin-apex)

This program serializes the Abstract Syntax Tree of an Apex Class/Trigger,
using the jorje Apex parser distributed by Salesforce.

The result is printed out to `stdout` as either a JSON or XML object.

## Building

This project requires Java >= 11 to compile, and specifically [GraalVM](https://www.graalvm.org/) to build native images.
If you want to build native image, make sure you run `gu install native-image` first.

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
