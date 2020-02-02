# Apex AST Serializer ![CI/CD](https://github.com/dangmai/apex-ast-serializer/workflows/CI/CD/badge.svg)

This program serializes the Abstract Syntax Tree of an Apex Class/Trigger,
using the jorje Apex parser distributed by Salesforce.

It is mainly used by the [prettier-plugin-apex](https://github.com/dangmai/prettier-plugin-apex) project.

The result is printed out to `stdout` as either a JSON or XML object.

## Building

```bash
./gradlew distZip
```

A zip file will be created in `distributions` directory.
You can unzip that file to get to the executables under `apex-ast-serializer/bin`.

## Running

To get a list of supported options:

```bash
./apex-ast-serializer --help
```

## License

MIT
