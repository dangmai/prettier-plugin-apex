## Unreleased
- Update dependency requirement for Prettier.
- Fix incorrect format for SOQL query with multiple types in FROM clause ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/76)).

## 1.0.0-rc.2
- Remove references to deleted vendor file `apex-ast-serializer-ng`.

## 1.0.0-rc.1
- CLI/Option change:
  - Remove `apex-verify-ast` option. Please use `--debug-check` instead.
- Implement comments using Prettier's API.
- Add support for `prettier-ignore` directive ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/3)).
- Add support for `--require-pragma` and `--insert-pragma` CLI directives.
- Use internal HTTP server instead of Nailgun for built in parser.
- Fix unstable comments in between If/Else blocks.
- Fix unstable comments in between Try/Catch/Finally blocks.
- Fix unstable comments in WhereCompoundExpr.
- Fix unstable comments for NestedExpr.
- Fix unstable formatting for Method Declaration with no body.
- Fix unstable comments for Annotations.
- Fix unstable leading comments to ValueWhen and ElseWhen blocks.
- Throw errors when encountering unknown node types.

## 1.0.0-beta.2
- Fix long static method calls producing undeployable code ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/69)).

## 1.0.0-beta.1
- Add support for Anonymous Code block with `--apex-anonymous` option.
- CLI/Option change:
  - `use-standalone-server` option is now `apex-standalone-parser`,
  and it is now a choice between `none` and `built-in`.
  - `server-port` option is now `apex-standalone-port`.
  - Add `apex-verify-ast` option.
- Fix dangling comments being printed incorrectly for Triggers ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/13)).
Thanks to @praksb, @ntotten and @vazexqi for their help on getting jorje fixed.
- Fix SOQL unary expression not generating space before next expression.
- Add support for SOQL WHERE Calculation Expression ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/34)).
- Add support for parameter modifiers ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/37)).
- Add support for `while` loop without body ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/33)).
- Add support for `for` loop without body ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/36)).
- Add support for Java expressions/typerefs ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/35)).
- Fix Package Version Expression.
- Fix Unicode characters being printed incorrectly ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/51)).
- Workaround for certain cases of AST verification failing ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/38)).
- Fix overlapping node with comment when comment contains special characters.
- Fix awkward breaks for long method call chain ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/53)),
- Remove breaks in Map types ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/57)).
- Fix binary/boolean expressions breaking after operation despite available space ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/40)).
- Fix leading comment to SOQL inner query being misindentified as trailing comment to previous column clause ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/58)).
- Fix awkward breaks for multiline binaryish expressions ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/21)).
- Fix formatting for Apex types containing expressions but do not add groups and/or breaks.
- Fix SOQL/SOSL boolean expressions having extra parentheses ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/56)).
- Fix ternary expressions not breaking correctly ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/29)).
- Fix comments not being indented in binaryish expressions ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/14)).
- Fix array index indentation surrounding variable expressions and method call expressions.
- Fix unstable IfBlock trailing comments.
- Fix unstable NameValueParameter trailing comments.
- Fix unstable WhereOpExpr trailing comments.

## 1.0.0-alpha.9
- Fix trailing comments after class names not being printed ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/20)).
- Add new lines in empty blocks for Enum.
- Add new lines to long list of annotation parameters.
- Add new lines to long list of method declaration parameters.
- Add new line after last usage parameter in long list for triggers.
- Add new lines to long list of conditions in loops.
- Fix missing alias in FROM expression ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/25)).
- Fix double quotes being escaped unnecessarily ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/24)).
- Fix inline comments in blocks being attached to wrong node ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/23)).
- Fix comments being pushed to next lines because of node's trailing empty line ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/26)).

## 1.0.0-alpha.8
- Fix comments not being printed if they appear before the root node ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/17)).
- Fix dangling comments not being printed for Class, Interface, Enum and Block Statement ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/13)).
- Add new lines in empty blocks ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/15)).
- Fix trailing comment being mistaken as leading comment in certain situations,
because `jorje` provides wrong start and end indexes for some node types ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/19)).

## 1.0.0-alpha.7
- Fix Annotated Declaration being indented too far ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/18)).
- Getter and setter will no longer break if they can fit on the same line.
- Add documentation for configuration options.

## 1.0.0-alpha.6
- Fix formatting for trailing comments at the end of block statements ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/12)).
- Fix issue in which comments right before semi colon are not printed ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/11)).
- Assert that all comments have been printed out in the formatted code.
- Fix long expressions not breaking into multi lines ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/16)).

## 1.0.0-alpha.5

- Fix `apex-ast-serializer` executables not having their execute bits set on *nix ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/10)).

## 1.0.0-alpha.4

- Support `WITH SECURITY_ENFORCED` in SOQL ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/9)).
- Fix `npm scripts` pointing to old files.

## 1.0.0-alpha.3

- Fix DML operation having double indents ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/8)).
- Rename scripts to start and stop Apex Parser Server.

## 1.0.0-alpha.2

- Use Prettier's default options for `tabWidth` and `printWidth`.
- Invoke `apex-ast-serializer` directly by default,
with option to use Nailgun server.

## 1.0.0-alpha.1

- Initial release.
