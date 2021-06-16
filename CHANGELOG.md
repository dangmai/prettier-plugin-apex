# 1.10.0

## Dependency Changes

- Drop support for NodeJS < 12.

## Formatting Changes

- Fix last comment inside New Expression turning into trailing comment ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/371)).
- Fix prettier-ignore comment getting attached to modifier node instead of surrounding expressions ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/383)).

# 1.9.1

- Fix Enum cases using wrong separator in `switch` statements ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/360)).

# 1.9.0

## Dependency Changes

- Drop support for Java < 11.
- Add support for Java 16.

## Formatting Changes

- Fix SOQL query string getting quoted incorrectly in LIKE expressions ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/340)).
- Prefer list init syntax `new Object[0]` in certain situations ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/262)) - thanks to @brianmfear.

# 1.8.0

- Remove extraneous indentation and blank line for HAVING clauses ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/286)).

## Internal changes

- Upgrade dependencies to fix security issues.
- Move CI/CD pipeline from Travis to Github Actions.

# 1.7.0

- Add support for Safe Navigation Operator ([doc](https://releasenotes.docs.salesforce.com/en-us/winter21/release-notes/rn_apex_SafeNavigationOperator.htm)).
- Always break up TYPEOF SOQL queries ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/244)).
- Remove extraneous grouping in certain binary-ish expressions ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/265)).

# 1.6.0

- Handle new jorje structure for types in enhanced for loops.
- Clearer error message when failing to connect to standalone Apex parser server ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/204)).
- Handle SOQL Select Distance Expression ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/237)).
- Use alignment instead of indentation to provide clarity for ternary expressions ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/223)).
- Use uppercase TRUE, FALSE, NULL in SOQL expressions ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/209)).

# 1.5.0

- Fix incorrect formatting of for loop inits without initialization ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/221)).

# 1.4.0

## Dependency Changes

- Support Prettier 2.0 ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/211)).
- NodeJS support limited to version >= 10.13.0 - driven by Prettier 2.0.

## Formatting Changes:

- Remove extraneous leading empty line in anonymous code blocks.

## Misc

- Sync parser name with Visual Studio Code language Id for Anonymous Apex ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/201)).

# 1.3.0

- Remove extraneous whitespaces between Enum modifiers ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/184)).

# 1.2.0

- Preserve code points from original source code ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/165)).

# 1.1.0

## Dependency Changes

- Prettier >= 1.19 is now required to be used with this plugin,
  in order to support new option type `string`.

## CLI Changes

- Add option `apexStandaloneHost`, default to `localhost`.

## Formatting Changes

- Fix last comment in Annotations being put in wrong location ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/142)).
- Fix Name Value Parameters using more newlines than necessary ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/136)).

# 1.0.0

## API Changes

- Remove `--apex-anonymous` option, use `apex-anonymous` parser instead ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/106)).

## Formatting Changes

- By default, add curly bracket spacing for maps, lists and sets ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/99)).
- Fix extraneous linebreaks being added after `this` variable expression ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/98)).
- Fix wrong comment position in a long method/variable chain ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/116)).
- Fix extraneous linebreaks for empty parameter list in long method declarations ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/124)).
- Fix SOQL query numbers losing negative value ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/122)).
- Fix method call expressions containing `this` and `super` having an extra indentation level.
- Fix trailing comment wrong location after last element in list/set/map init literals ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/126)).

# 1.0.0-rc.6

- Fix incorrect format for decimals/doubles ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/88)).
- Add support for Number Expression in SOQL Geolocation Literal ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/90)).
- Fix duplicated trailing empty lines for multiple expressions on the same line ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/91)).
- Fix expressions in Name Value Parameters not being indented ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/93)).
- Fix SOQL queries in binaryish expressions having extraneous indentations ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/96)).
- Fix SOQL query number being printed as different types (`big-decimal` to `int`) in certain situations.

# 1.0.0-rc.5

- CLI/Option change:
  - Add `apex-insert-final-newline` option ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/83)).
- Remove newline before SOQL expression in ForInit ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/28)).
- Add space before colon in ForEnhancedControl ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/86)).

# 1.0.0-rc.4

- Add support for AnnotationString ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/80)).

# 1.0.0-rc.3

- Update dependency requirement for Prettier.
- Fix incorrect format for SOQL query with multiple types in FROM clause ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/76)).
- Fix incorrect order of expressions in SOSL query ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/75)).
- Add support for class and interface generics ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/77)).

# 1.0.0-rc.2

- Remove references to deleted vendor file `apex-ast-serializer-ng`.

# 1.0.0-rc.1

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

# 1.0.0-beta.2

- Fix long static method calls producing undeployable code ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/69)).

# 1.0.0-beta.1

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

# 1.0.0-alpha.9

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

# 1.0.0-alpha.8

- Fix comments not being printed if they appear before the root node ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/17)).
- Fix dangling comments not being printed for Class, Interface, Enum and Block Statement ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/13)).
- Add new lines in empty blocks ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/15)).
- Fix trailing comment being mistaken as leading comment in certain situations,
  because `jorje` provides wrong start and end indexes for some node types ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/19)).

# 1.0.0-alpha.7

- Fix Annotated Declaration being indented too far ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/18)).
- Getter and setter will no longer break if they can fit on the same line.
- Add documentation for configuration options.

# 1.0.0-alpha.6

- Fix formatting for trailing comments at the end of block statements ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/12)).
- Fix issue in which comments right before semi colon are not printed ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/11)).
- Assert that all comments have been printed out in the formatted code.
- Fix long expressions not breaking into multi lines ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/16)).

# 1.0.0-alpha.5

- Fix `apex-ast-serializer` executables not having their execute bits set on \*nix ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/10)).

# 1.0.0-alpha.4

- Support `WITH SECURITY_ENFORCED` in SOQL ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/9)).
- Fix `npm scripts` pointing to old files.

# 1.0.0-alpha.3

- Fix DML operation having double indents ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/8)).
- Rename scripts to start and stop Apex Parser Server.

# 1.0.0-alpha.2

- Use Prettier's default options for `tabWidth` and `printWidth`.
- Invoke `apex-ast-serializer` directly by default,
  with option to use Nailgun server.

# 1.0.0-alpha.1

- Initial release.
