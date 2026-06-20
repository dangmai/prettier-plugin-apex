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

  > **Finding for M3 — phantom union members.** The simple
  > `discriminantLiteral != null` filter is intentionally complete (never drops a
  > real node), so the union also includes ~14 jorje-internal classes that the
  > printer never formats. M3's `UnhandledClass` denylist must cover these
  > alongside `InvalidDeclUnit`: `Identifiers`, `Locatables`, `Locations`,
  > `LocationBlocks`, `ParameterRefs`, `TypeRefs`, `SoslValues`, `PrinterBlocks`,
  > `HiddenTokens`, `InternalException`, `CompilationUnitBuilder`,
  > `TypeRefBuilder`, `JadtTester`, `SwitchTester`. (They're the concrete
  > single-`@class` beans that are never referenced as a field type — verified
  > via grep. Filtering them in Java codegen was rejected: graph-reachability is
  > fragile and its failure mode silently drops real nodes. The denylist is the
  > explicit, reviewable, TS-side place for this.) Note `ParserOutput` (the root)
  > IS in the union and IS handled — keep it. Re-derive the exact denylist at M3
  > by diffing registry keys against `ApexNode["@class"]`.
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
- [ ] **M3 — Typed registry + dispatch.** Convert `nodeHandler` to the typed
  registry + `satisfies`, replace dispatch casts with the `kind` branch,
  parameterize handlers `path: AstPath<Enriched<T>>`. Largest, mechanical; may
  split M3a/M3b (statements/expressions vs SOQL/SOSL). Add exhaustiveness
  assertion. Run `AST_COMPARE`.
- [ ] **M4 — `noImplicitAny`.** Type remaining `options: any`,
  `handleTrailingEmptyLines(node)`, `comments.ts` `canAttachComment`/
  `getTrailingComments`, parser location handlers (~203/220/267/442),
  `util.ts massageAstNode`.
- [ ] **M5 — Parser DFS-walk typing.** Type the enrichment visitor (`AnyNode`,
  `dfsPostOrderApply`, `arraySiblings`, `MetadataVisitorContext`) generic over
  `<Accumulated, Context>` with `node: EnrichedApexNode`. Watch the `value[key]`
  recursion under `noUncheckedIndexedAccess`.
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
  `catch` clauses. All green. Next: **M3** (typed registry + dispatch — the big
  mechanical one; remember the M0 phantom-class denylist).
