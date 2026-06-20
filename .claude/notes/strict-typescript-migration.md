# Strict-TypeScript migration — handoff note

> **Living progress doc for a multi-session effort.** Branch: `strict-typescript`.
> Draft PR: **#2422** (https://github.com/dangmai/prettier-plugin-apex/pull/2422).
> Session scaffolding — **delete before the final merge** (per global CLAUDE.md).
> The full approved plan lives at
> `~/.claude/plans/this-repo-does-use-scalable-lighthouse.md`; this note tracks
> status and carries context across sessions.

## Goal

Get `packages/prettier-plugin-apex` to the strictest practical TypeScript:
`strict: true` across the whole package (src, bin, tests, config scripts), Biome
`noExplicitAny` as an error, and — the headline fix — a **typed `@class`→handler
dispatch** in the printer so each `handle*` function is checked against the exact
node type it formats, with build-time exhaustiveness.

This is a **pure type-safety refactor. Formatter output must not change.** The
safety net every milestone: snapshots pass **without** `-u`, and `AST_COMPARE`
stays green.

## Why (the problem)

- `strict` is off in `tsconfig.prod.json` (`strict`, `noImplicitAny`,
  `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`,
  `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict` all commented
  out). Biome `noExplicitAny` is off. ~26 `any` sites remain.
- **Core weakness:** `genericPrint` (printer.ts ~3308-3369) dispatches on the
  runtime string `n["@class"]` to ~166 `handle*` functions in a flat
  `nodeHandler: { [key: string]: ChildNodeHandler | SingleNodeHandler }` map
  (~3026-3269). Inside handlers `path.getNode()` is `any`, so `node.left`,
  `node.expr.value`, etc. are unchecked. No compile-time link between the
  `@class` key and the node type; dispatch casts via `as SingleNodeHandler` /
  `as ChildNodeHandler` without validation.

## The lever

`vendor/apex-ast-serializer/typings/jorje.d.ts` is **generated** by Gradle
`typescript-generator` and is already a near-perfect discriminated union: 347
interfaces, each concrete node has a single string-literal `"@class"`; abstract
parents carry a `@class` union. A few handlers already type their node
(`handleTriggerUsage`, `getOperator`) — the pattern works, it's just not applied
broadly.

## Confirmed decisions

- **Union source:** extend the Gradle codegen to **emit** an `ApexNode` union
  into `jorje.d.ts` (not hand-maintained) — stays in sync on every regen. Add a
  custom extension next to `CustomEnumExtension` / `UnionTypeExtension` /
  `GenericNodeExtension` in `packages/apex-ast-serializer/server/build.gradle`
  (~186-208).
- **Bar:** `strict: true`. **`exactOptionalPropertyTypes` is out of scope** —
  deferred stretch goal (see bottom).
- **Scope:** whole package incl. `tests/` and config scripts (the wider
  `tsconfig.json`, which extends `tsconfig.prod.json`).

## Core design (see plan for full type sigs)

1. **Codegen-emitted `ApexNode`** = union of every concrete node interface.
2. **`Enriched<>` layer** — new `src/jorje-nodes.ts`. Parser adds fields jorje
   doesn't have: `comments`, `trailingEmptyLine`, `forcedHardline`,
   `insideParenthesis`, `danglingComments`, `ifBlockIndex` (if-blocks). `loc` is
   in jorje but `delete`d for some WhereCompoundOp nodes. Fold in existing
   `EnrichedIfBlock` (parser.ts) and `AnnotatedComment` (util.ts); retype the
   comment's `enclosingNode`/`precedingNode`/`followingNode` from `any` to
   `EnrichedApexNode | undefined`.
3. **Typed registry** keyed on `@class`: `{ [K in jorje.ApexNode["@class"]]?:
   SingleNodeHandler<Extract<jorje.ApexNode, {"@class": K}>> }`, applied with
   `satisfies`. Tagged `{ kind: "single" | "child", fn }` value so dispatch
   branches on `kind` instead of casting. Exhaustiveness: assert the registry
   covers `jorje.ApexNode["@class"]` minus an explicit `UnhandledClass` denylist
   (e.g. `InvalidDeclUnit`).
4. **`ApexParserOptions extends prettier.ParserOptions`** with the plugin's
   custom options (`apexStandaloneParser`, `apexStandaloneHost/Port/Protocol`,
   `apexInsertFinalNewline`). Replace all `options: any`.

**Friction note:** `path.call(print, "expr", "value")` chains keep working
(Prettier types them loosely). Friction is only on direct property reads — solved
by `Enriched<>` + discriminant narrowing. **Do not** build a `callChild`/
`mapChild` helper.

## Milestones & status

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

- [x] **M0 — Handoff note + codegen union. DONE.** Repurposed the abandoned
  `GenericNodeExtension` stub (it emitted a stray empty `AstNode` interface) into
  `ApexNodeUnionExtension` (`packages/apex-ast-serializer/server/src/main/java/
  net/dangmai/serializer/types/ApexNodeUnionExtension.java`), registered in
  `server/build.gradle` `extensionClasses`. It runs a `TsModelTransformer` at
  `BeforeSymbolResolution` and emits `export type ApexNode = <union>;` of every
  bean with a non-null `getDiscriminantLiteral()` (i.e. a single-literal
  `@class`; abstract parents have a null literal and are excluded), sorted by
  name for stable output. Regenerate with **`pnpm nx run apex-ast-serializer:build`**
  (~3s; needs `libs/apex-jorje-lsp.jar`, present). Verified: `ApexNode` appears
  with 296 members, the `AstNode` stub is gone, and plugin `build` + `lint` +
  built-in `test:parser` (95 tests) all pass.

  > **Finding for M3 — phantom union members.** Codegen excludes Java stdlib
  > (`java.lang.*`) and jorje exception (`apex.jorje.services.exception.*`) types,
  > which removed `Exception`/`Throwable`/`RuntimeException`/`StackTraceElement`/
  > `InternalException`/`ParseException` (union 296→290; see the reviewer
  > follow-up commit). The filter is otherwise deliberately complete (never drops
  > a real node), so the union still includes ~13 jorje-internal builder/factory
  > phantoms that M3's `UnhandledClass` denylist must cover alongside
  > `InvalidDeclUnit`: `Identifiers`, `Locatables`, `Locations`, `LocationBlocks`,
  > `ParameterRefs`, `TypeRefs`, `SoslValues`, `PrinterBlocks`, `HiddenTokens`,
  > `CompilationUnitBuilder`, `TypeRefBuilder`, `JadtTester`, `SwitchTester`.
  > (Concrete single-`@class` beans never referenced as a field type. Filtering
  > these in codegen too was rejected: telling them from real nodes needs
  > reachability analysis whose failure mode silently drops a real node — whereas
  > a missed denylist entry FAILS the exhaustiveness check instead.) `ParserOutput`
  > (root) and `BlockComment`/`InlineComment`/`HiddenTokens` ARE in the union and
  > ARE handled — keep them. Re-derive the exact denylist at M3 by diffing
  > registry keys against `ApexNode["@class"]`.
- [x] **M1 — Foundations, no flag flips. DONE.** Added `src/jorje-nodes.ts`
  (`ApexEnrichment`, `Enriched<>`, `EnrichedApexNode`, and `EnrichedIfBlock`
  rebased onto `Enriched<>`) and `src/options.ts` (`ApexParserOptions extends
  ParserOptions`). Moved `EnrichedIfBlock` out of `parser.ts` into
  `jorje-nodes.ts`; `parser.ts` and `printer.ts` now import it from there.
  `options.ts` isn't consumed yet (M4 wires it in). Build (prod + wider tsc incl.
  tests) + lint + 95 built-in tests all green.

  > **Plan deviation (deliberate).** The plan's M1 bullet said to retype
  > `AnnotatedComment.enclosingNode/precedingNode/followingNode` from `any` to
  > `EnrichedApexNode | undefined`. Deferred to **M4**: those fields are read
  > with subtype-specific props (`enclosingNode.stmnts/.members/.dottedExpr/
  > .expr`, `followingNode.stmnts`, `precedingNode.loc/.right`), and accessing a
  > non-common property on a union errors *regardless* of `strictNullChecks` —
  > so the retype can't land until the narrowing work in M4. Keeping them `any`
  > kept M1 truly additive/green as the plan prioritizes.
- [x] **M2 — Cheap strict flags. DONE.** Flipped `strictFunctionTypes`,
  `strictBindCallApply`, `noImplicitThis`, `alwaysStrict`,
  `useUnknownInCatchVariables` in `tsconfig.prod.json` (the wider `tsconfig.json`
  inherits them, so tests are covered too). Narrowed the two `catch` clauses:
  `util.ts` (`typeof e === "object" && e !== null && "code" in e`) and
  `parser.ts` (`String(err)` instead of `err.toString()`). Zero other fallout —
  no classes/`this`, little function-type variance. Build (prod + wider) + lint +
  95 built-in tests all green.
- **M3 — Typed dispatch.** Split per the dispatch findings below (the plan's
  single compile-time-exhaustiveness assumption didn't hold). Confirmed approach:
  exhaustiveness test FIRST (runtime), then the typed split, then handler bodies.
  - [x] **M3a — Runtime exhaustiveness test. DONE.** `tests/dispatch_exhaustiveness/
    dispatch.spec.ts` parses the generated `ApexNode` union, resolves each member's
    `@class`, and asserts every one is dispatched (own key in `NODE_HANDLER_CLASSES`,
    or parent via `getParentType`) or in an explicit `UNHANDLED_CLASSES` denylist.
    A second test keeps the denylist honest (fails on stale/now-handled entries).
    Exported `NODE_HANDLER_CLASSES` from `printer.ts`. 98 tests green. **It surfaced
    a pre-existing gap:** the SOQL `WITH` tuple form (`WithIdentifierTuple` +
    `WithKeyValue$*`) has no handler — `genericPrint` would throw on it; no fixture
    hits it. Denylisted + flagged as currently-unsupported grammar (not caused by
    this refactor). The denylist also documents comments/root/locations/errors/
    phantoms as non-dispatched.
  - [x] **M3b — Typed two-map split. DONE.** Split `nodeHandler` into typed
    `singleNodeHandlers` (`{[key]: SingleNodeHandler}`) and `childNodeHandlers`
    (`{[key]: ChildNodeHandler}`, the 18 child entries). Dispatch now indexes the
    two maps with no `as` casts (guarded by `noUncheckedIndexedAccess`). Threaded
    `ApexParserOptions` through `genericPrint`/`printGenerically` (cast once at the
    prettier boundary — `opts as ApexParserOptions` — since prettier's Printer
    interface hands a plain `ParserOptions` and `strictFunctionTypes` forbids
    narrowing the param). The handler types were the safety net: a mis-sorted
    child handler wouldn't fit `SingleNodeHandler`, so `tsc` would catch it.
    Verified: prod+wider tsc, lint, 98 plain + 276 `AST_COMPARE` tests — output
    unchanged.
  - [~] **M3c — Parameterize handler bodies** to `AstPath<Enriched<T>>` /
    typed `path.node` by category. **IN PROGRESS.**
    - [x] **Statements category DONE.** Typed ~26 single handlers
      (return/expression/block/run-as/dml-merge, switch + value/else/type-when +
      enum/literal-case, try/catch/finally, variable-decls, if/else-block, all
      loops + for-control/inits/init). prod+wider tsc, lint, 276 AST_COMPARE green;
      output unchanged. Added two centralized helpers in `jorje-nodes.ts`
      (see findings below): `asEnriched` and `asConcrete`/`Concrete<T>`.
    - [x] **Expressions category DONE.** Typed ~32 single handlers (binaryish,
      assignment, dotted/variable/method-call, literal, new-expression +
      new-object-init set, ternary/instanceof/cast/array/null-coalescing,
      this/super/java method calls, soql/sosl expr wrappers, the 5 operator
      handlers). Two infra additions: `isBinaryish` is now a **type guard**
      (`node is BinaryExpr | BooleanExpr`, widened param to `{"@class":string} |
      null`) so the existing `const isX = isBinaryish(localConst)` narrows via
      TS alias-narrowing (needs a simple-const ref, not a property access — hence
      `const { left, right } = node`); and a `getParentNode(path):
      EnrichedApexNode | null` helper (Prettier mistypes the parent as the same
      `T`). prod+wider tsc, lint, 276 AST_COMPARE green.
    - [x] **Declarations & members category DONE.** Typed class/interface/enum/
      method/variable declarations, the 5 compilation units, the 8 block members
      (incl. the `handleStatementBlockMember`/`handlePropertyGetterSetter`
      factories), property decl/getter/setter. New friction: deep `path.call(cb,
      "members", i, "stmnt")` navigation can't be key-checked because
      `members: BlockMember[]` is abstract — used a localized, commented
      `(path as AstPath).call(...)` escape (2 sites: anon-block + trigger units;
      the 2-level `"members", index` navs type fine). prod+wider tsc, lint, 276
      AST_COMPARE green.
    - [x] **SOQL & SOSL category DONE.** Typed ~53 single query handlers
      (search/find/in/division/returning/with clauses; query/select/column/field/
      from/where/group-by/having/order-by/limit/offset; case/when/else; bind/
      colon/geolocation/number/distance/formula). One extra sanctioned cast:
      `handleNumberLiteral` does `(path as AstPath).call(print, "number", "$")`
      because `NumberLiteral.number` is typed as a primitive `number` but jorje
      serializes it boxed as `{ "$": number }` (typings-vs-runtime mismatch, like
      JorjeOptional). prod+wider tsc, lint, 276 AST_COMPARE green.
    - [x] **Type-refs/annotations/misc category DONE.** Typed the last 11 single
      handlers (annotation/annotation-key-value/annotation-string, class/array/
      java type-refs, modifier/empty-modifier parameter-refs, location-identifier,
      name-value-parameter, structured-version). **ALL single handlers are now
      typed** — only the polymorphic `handleInputParameters` helper (shared across
      many caller node types, intentionally left `AstPath`) and the child
      handlers remain. Found a third typings-vs-runtime mismatch: `ParameterRef`'s
      type field is generated as `type` but the serializer emits `typeRef`
      (verified against the live AST) — handled with the localized `(path as
      AstPath)` escape in both parameter-ref handlers. **TODO (codegen follow-up,
      maybe M4+):** fix the `ParameterRef.type`→`typeRef` field name in the
      typescript-generator config so the cast can be removed; it's an actively
      wrong field NAME (not just a structural wrapper), so `node.type` would
      compile but be undefined at runtime. prod+wider tsc, lint, 287 AST_COMPARE
      green.
    - [x] **Child handlers DONE — M3c COMPLETE.** Their `path` stays the untyped
      `AstPath` *by design*: dispatched by the runtime `childClass`, they switch
      on it and navigate per concrete subtype, so one typed generic over the
      parent's subtype union can't express the per-case `path.call(...)` keys
      (not common across the union) — typing it would break navigation for zero
      node-read safety. Documented this on the `ChildNodeHandler` type. The only
      real `any` exposure was the two handlers that read node *props* directly:
      `handleStatement` (`node.id`) and `handleWhereQueryLiteral` (`node.literal`,
      `node.loc`) — both now narrow a typed node via `asConcrete<Parent>(
      path.getNode())` and switch on `node["@class"]` (identical to `childClass`).
      The lookup-only child handlers (`handleModifier`, `handleGroupByType`,
      `handleTrackingType`, `handleQueryOption`, `handleUpdateStatsOption`,
      `handleDataCategoryOperator`, the inline QUERY_OPERATOR/WHERE_COMPOUND_OPERATOR)
      take only `childClass: string` and were already fully typed. prod+wider tsc,
      lint, 287 AST_COMPARE green.

  > **MAJOR FINDING — `strict: true` is already ON via the base config.**
  > `tsconfig.prod.json` *comments out* `noImplicitAny`/`strictNullChecks`/etc.
  > (implying they're deferred to M4/M6), but it `extends @tsconfig/node22`, whose
  > `tsconfig.json` sets **`"strict": true`**. So the whole strict family —
  > including `strictNullChecks` and `noImplicitAny` — has been enforced the entire
  > time. The printer only compiles because pervasive `any` (untyped
  > `path.getNode()` → `any`, untyped handler params) MASKS it. Implications:
  > (a) the moment a handler's node is typed, `strictNullChecks` bites, so use
  > `path.node` (typed `T`, non-null) instead of `path.getNode()` (`T | null`);
  > (b) M4/M6 are reframed — they're not "flip the flag" (already on) but "remove
  > the remaining `any` that masks it" + flip the explicit/redundant lines for
  > clarity. No big-bang risk — strict is incrementally satisfied as `any` is
  > removed. Re-confirm with M7 that an explicit `strict: true` adds nothing.

  > **FINDING — abstract jorje parents aren't narrowable; `asConcrete` fixes it.**
  > typescript-generator emits abstract parents (`Expr`, `Stmnt`, `ForControl`,
  > `TypeRef`, …) as a base *interface* carrying only the `@class` literal union,
  > with concrete children `extends`-ing it — NOT as a discriminated union of the
  > subtypes. So a field typed as the parent (`forControl: ForControl`) can't be
  > narrowed to a subtype by `@class` (TS2339 on subtype props). The plan's
  > "friction note" (claiming `path.call` is loosely typed) was also wrong:
  > Prettier 3.8's `call`/`map`/`each` constrain keys to `keyof T`, so typing the
  > path param DOES type navigation — which is good (post-JorjeOptional,
  > `path.call(print,"expr","value")` resolves), but means abstract-field
  > narrowing must be solved. Fix: `Concrete<T> = Enriched<Extract<jorje.ApexNode,
  > {"@class": T["@class"]}>>` + `asConcrete(node)` re-view the node as the
  > concrete (and enriched) subtype union drawn from the codegen `ApexNode` union
  > (a real discriminated union). One centralized, justified assertion, same
  > pattern as `asEnriched`. **The M3c handler pattern:** param
  > `path: AstPath<Enriched<jorje.T>>`; `const node = path.node`; read child
  > enrichment via `asEnriched(child)`; narrow abstract-typed children via
  > `asConcrete(child)`; coerce `boolean | undefined` comment-check results with
  > `?? false`.

  > **BLOCKER discovered starting M3c — `Optional<T>` types are wrong.** jorje
  > serializes `Optional<T>` fields as a `{value?: T}` wrapper at runtime (verified:
  > `"expr": {"value": {…Expr…}}`, `"stmnt": {"value": {…}}`), and the printer
  > reads them that way (`node.expr.value`, `path.call(print, "expr", "value")` —
  > ~115 sites: 86 `"value"` navigations + 29 `.value` reads). But
  > `typescript-generator` mis-modeled `Optional<T>` as a bare optional property
  > `expr?: Expr` (no `value` wrapper). So typing a handler's node and reading
  > `.value` is a *false* type error everywhere. M3c can't proceed cleanly until
  > this is fixed.
  - [x] **M3c-pre — Model `Optional<T>` as `{value?: T}` in codegen. DONE.**
    Added `CustomTypeProcessor.OptionalProcessor` (maps `java.util.Optional<T>` →
    a `JorjeOptional<T>` reference) + `JorjeOptionalExtension` (emits
    `export type JorjeOptional<T> = { value?: T };`). They share one `Symbol`
    instance so the reference and declaration resolve identically (no rename).
    Registered in `server/build.gradle`. Regenerated: `expr?: Expr` →
    `expr: JorjeOptional<Expr>` (73 usages, field now required since the wrapper
    is always present — Java `Optional` is never null). Zero fallout in existing
    typed code; prod+wider tsc, lint, 276 `AST_COMPARE` tests all green (type-only,
    output unchanged). **M3c now unblocked.**

  > **Dispatch model (discovered in M3a — the plan underestimated this).** Two
  > dispatch paths: exact `@class` → single handler `(path, …)`; else parent via
  > `getParentType` (runtime `$`-split) → child handler `(childClass, path, …)`.
  > 18 child handlers (first param `childClass`): `handleStatement`,
  > `handleOrderOperation`, `handleNullOrderOperation`, `handleModifier`,
  > `handleAnnotationValue`, `handleFindValue`, `handleDivisionValue`,
  > `handleSearchWithClauseValue`, `handleGroupByType`, `handleWhereQueryLiteral`,
  > `handleOrderByExpression`, `handleDataCategoryOperator`, `handleTrackingType`,
  > `handleQueryOption`, `handleUpdateStatsOption`, `handleUsingExpression`, plus
  > inline `QUERY_OPERATOR`/`WHERE_COMPOUND_OPERATOR`. Also: 6 single-handler keys
  > are NOT union members — the enum-wrappers (`BINARY/BOOLEAN/ASSIGNMENT/POSTFIX/
  > PREFIX_OPERATOR`, `TRIGGER_USAGE`) whose node serializes its `@class` as an
  > abstract FQCN and carries the value in `$`; and `int`/`string` pseudo-keys.
  > These break a strict `[K in ApexNode["@class"]]` mapped type, so the typed
  > single map (M3b) must allow them explicitly. Full compile-time exhaustiveness
  > is impractical (parent reachability is runtime), hence the M3a runtime test.
- [x] **M4 — Remove residual `any`. DONE.** (Recall: `strict` is already on via
  the base, so this is "remove the masking `any`", not a flag flip.) Five logical
  commits: (1) **codegen fix** — `ParameterRef.type`→`typeRef` rename in
  `CustomFieldExtension` (a jorje getter/field-name divergence: getter `getType()`
  over field `typeRef`; confirmed it's the only such divergence affecting a handled
  node by diffing the serializer's `sink.name(...)` keys against the typings),
  dropped the two localized `(path as AstPath)` casts. (2) printer `options: any`
  (7 sites) → `ApexParserOptions`; `handleTrailingEmptyLines` node →
  `EnrichedApexNode | null`. (3) `comments.ts` `canAttachComment`/
  `getTrailingComments` + `AnnotatedComment`'s enclosing/preceding/followingNode
  (the M1-deferred retype) → `EnrichedApexNode`; narrowed read sites via `@class`
  discriminants and `"x" in node` checks (`canAttachComment` reorders its checks so
  the comment-class guards run on the full union before narrowing on `loc`).
  (4) `util.ts massageAstNode` → `(ast: EnrichedApexNode, newObj: Record<string,
  unknown>)`; Expr/WhereExpr abstract bases expose `@class` directly for branch
  conditions, `asConcrete` narrows only where a subtype field is read, newObj
  writes use bracket access (noPropertyAccessFromIndexSignature); the one test mock
  casts via `Parameters<typeof massageAstNode>[0]`. (5) parser
  `locationGenerationHandler` map signature + the three node-reading handlers
  (method-decl/annotation/limit-value) → `EnrichedApexNode`, each narrows by
  `@class` to its exact dispatched type. prod+wider tsc, lint, 287 AST_COMPARE green
  after each. `handleInputParameters` stays a polymorphic `AstPath` helper (not
  `any`; won't trip `noExplicitAny`). **All remaining `any` (6 sites) are the
  parser DFS-walk infra → M5.**
- [ ] **M5 — Parser DFS-walk typing.** Type the enrichment visitor (`AnyNode`,
  `dfsPostOrderApply`, `arraySiblings`, `MetadataVisitorContext`) generic over
  `<Accumulated, Context>` with `node: EnrichedApexNode`. Watch the `value[key]`
  recursion under `noUncheckedIndexedAccess`. **The 6 remaining `any` sites all
  live here:** `parser.ts:127` `getNodeLocation(node)`, `:504` `type AnyNode = any`,
  `:679` `arraySiblings?: any[]`, `:684` `metadataVisitor apply(node)`, `:781`
  `arraySiblings`, `:960` `(hiddenTokenMap[i] as any[])[1]`.
- [ ] **M6 — `strictNullChecks` (RISKIEST).** Add a typed non-null
  `getNode(path): Enriched<T>` helper (dispatch guarantees a current node).
  Handle `delete node.loc`/`delete node.danglingComments` (TS2790 → optional) and
  `node.loc.*` reads. Full `AST_COMPARE` + **both** `built-in` and `native`
  parser configs.
- [ ] **M7 — `strict: true` consolidation + lint.** Replace individual flags with
  `strict: true` (+ `noImplicitOverride`); verify zero new errors. Flip Biome
  `suspicious.noExplicitAny` → `error`; confirm no residual `any`.

**Riskiest: M6** — sequenced strictly after M1/M3/M4/M5 to de-risk. M3 is the
largest but is snapshot-guarded and mechanical.

## Verification (run every milestone)

```
pnpm nx run prettier-plugin-apex:build                                   # strict tsc passes
pnpm nx run prettier-plugin-apex:lint
pnpm nx run prettier-plugin-apex:test:parser --configuration built-in    # snapshots WITHOUT -u
AST_COMPARE=true pnpm nx run prettier-plugin-apex:test:parser --configuration built-in   # M3+
```
A moved snapshot = a behavioral bug → revert and narrow. **No CHANGELOG entry, no
new fixtures** (output unchanged). M6 also runs `--configuration native`. No
`benchmark` label unless a milestone unexpectedly alters runtime shape.

## Deferred / out of scope

- **`exactOptionalPropertyTypes`** — marginal lift is contained (mostly
  `massageAstNode` in util.ts + a parser scan for conditional optional-field
  writes); the heavy `loc`-guarding cost is already absorbed by M6's
  `strictNullChecks`. Low value for this codebase's set/delete-heavy enrichment
  model. Revisit after `strict: true` lands.
- **typescript-eslint** type-aware lint — strict tsc + Biome `noExplicitAny`
  cover the regression surface; a second type-checking linter isn't worth the
  infra cost.

## Session log

- **2026-06-19** — Exploration + plan. Confirmed jorje.d.ts is generated and
  union-ready; confirmed the printer-dispatch weakness; locked the three
  decisions above. Plan approved. Worktree `strict-typescript` created, note
  written.
- **2026-06-19** — **M0 done.** Added `ApexNodeUnionExtension` (repurposed the
  `GenericNodeExtension` stub), emitting `ApexNode` (296 members). Build + lint +
  built-in tests green. Recorded the phantom-member finding above for M3.
- **2026-06-19** — **M1 done.** Added `src/jorje-nodes.ts` + `src/options.ts`,
  moved `EnrichedIfBlock` into `jorje-nodes.ts`. All green (build/lint/95 tests).
  Deferred the `AnnotatedComment` node-ref retype to M4 (see deviation note).
- **2026-06-19** — **M2 done.** Flipped 5 cheap strict flags + narrowed the two
  `catch` clauses. All green.
- **2026-06-19** — Reviewer (M0–M2): clean; one LOW finding fixed (union
  excludes Java/exception infra types, 296→290). CI green (30/30).
- **2026-06-19** — **M3a done.** Runtime exhaustiveness test (98 tests green).
  Mapped the real dispatch model; chose test-first + runtime exhaustiveness per
  user. Surfaced a pre-existing SOQL `WITH`-tuple gap (denylisted, flagged).
  Tracking issue #2423 filed for the gap.
- **2026-06-19** — **M3b done.** Split dispatch into typed `singleNodeHandlers`/
  `childNodeHandlers`, threaded `ApexParserOptions`, removed the `as` casts. 98 +
  276 (`AST_COMPARE`) tests green, output unchanged.
- **2026-06-19** — Filed issue #2423 (SOQL WITH-tuple gap). Started **M3c**,
  hit a blocker: generated `Optional<T>` types are wrong (modeled `field?: T`,
  runtime is `{value?: T}`; ~115 access sites). Added **M3c-pre** (codegen fix)
  as prerequisite. Paused for direction.
- **2026-06-19** — **M3c statements category DONE.** Calibration surfaced two
  major findings (see M3c block): `strict: true` is already on via
  `@tsconfig/node22` (masked by `any`), and abstract jorje parents aren't
  `@class`-narrowable. Added `asEnriched` + `asConcrete`/`Concrete<T>` helpers and
  typed ~26 statement handlers. prod+wider tsc, lint, 276 AST_COMPARE green.
- **2026-06-19** — **M3c expressions category DONE.** Typed ~32 expression single
  handlers. Made `isBinaryish` a type guard and added the `getParentNode` helper
  (both reusable by later categories). prod+wider tsc, lint, 276 AST_COMPARE green.
- **2026-06-19** — **M3c declarations & members category DONE.** Typed ~22
  declaration/unit/member handlers. Localized `(path as AstPath)` cast for the
  abstract `BlockMember[]` deep navigation (2 sites). prod+wider tsc, lint, 276
  AST_COMPARE green.
- **2026-06-19** — **M3c SOQL & SOSL category DONE.** Typed ~53 query handlers
  (delegated to a subagent against the now-proven pattern, then reviewed +
  re-verified). One extra cast in `handleNumberLiteral` (boxed `{$}` vs primitive
  `number` typing mismatch). prod+wider tsc, lint, 276 AST_COMPARE green.
- **2026-06-19** — **Rebased onto origin/main** (15 commits incl. nx v23, perf
  optimizations, and the **#2423 fix** "Support the SOQL WITH tuple/key-value
  form"). Conflicts only in `printer.ts` (expressions + SOQL commits, both
  resolved keeping our typed versions; main had independently rewritten the same
  binaryish comment-check to `.some() ?? false`). Regenerated `jorje.d.ts` (Java
  codegen extensions intact on the new base). #2423 follow-up: dropped the 4
  WITH-tuple entries from the exhaustiveness denylist (now enforced), typed
  main's new `handleWithIdentifierTuple`, and moved `handleWithKeyValue` (a child
  handler) from `singleNodeHandlers` to `childNodeHandlers` (M3b's split replayed
  without knowing main had added it to the pre-split map). 287 tests green
  (AST_COMPARE), up from 276.
- **2026-06-19** — **M3c type-refs/annotations/misc category DONE — ALL single
  handlers typed.** Last 11 handlers. Found the `ParameterRef.type` vs runtime
  `typeRef` field-name typings bug (localized cast + codegen-follow-up TODO).
  Only `handleInputParameters` (polymorphic helper) + the 19 child handlers
  remain in M3c. prod+wider tsc, lint, 287 AST_COMPARE green.
- **2026-06-19** — **M4 DONE + codegen fix.** Fixed the `ParameterRef.type`→
  `typeRef` codegen divergence (`CustomFieldExtension` rename; verified it's the
  only getter/field name mismatch affecting a handled node) and dropped the two
  workaround casts. Then removed every residual `: any` in printer.ts/comments.ts/
  util.ts across four more commits (printer options + trailing line; comment node
  refs incl. the M1-deferred `AnnotatedComment` retype; `massageAstNode`; parser
  location handlers). prod+wider tsc, lint, 287 AST_COMPARE green throughout. Only
  the parser DFS-walk `any` (6 sites) remain → M5.
- **2026-06-19** — **M3c child handlers DONE → M3 COMPLETE.** Child-handler paths
  stay `AstPath` by design (dynamic `childClass` dispatch); typed the two node-
  prop readers (`handleStatement`, `handleWhereQueryLiteral`) via
  `asConcrete` + `node["@class"]` switch; documented the rationale on
  `ChildNodeHandler`. Every dispatch handler is now either typed against its node
  or a pure `childClass` lookup. prod+wider tsc, lint, 287 AST_COMPARE green.
  **Next: M4** (remove remaining `any`; recall strict is already enforced via the
  base — see the MAJOR FINDING above — so M4/M6 are "remove masking `any`", not
  flag flips). Also pending: the `ParameterRef.type`→`typeRef` codegen fix, and
  typing `handleInputParameters` if a clean union param presents itself.
