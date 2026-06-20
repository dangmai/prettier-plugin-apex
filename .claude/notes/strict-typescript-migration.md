# Strict-TypeScript migration — handoff note

> **Living progress doc for a multi-session effort.** Branch: `strict-typescript`.
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

- [~] **M0 — Handoff note + codegen union.** Note: **done** (this file). Still
  todo: add the codegen extension emitting `ApexNode`, regenerate `jorje.d.ts`,
  verify the union appears and the package builds. Document the regen command.
- [ ] **M1 — Foundations, no flag flips.** Add `src/jorje-nodes.ts`
  (`ApexEnrichment`, `Enriched<>`, `EnrichedApexNode`), add `ApexParserOptions`,
  fold in `EnrichedIfBlock`/`AnnotatedComment`. Additive only. Lowest risk.
- [ ] **M2 — Cheap strict flags.** Flip `alwaysStrict`, `noImplicitThis`,
  `strictBindCallApply`, `strictFunctionTypes`, `useUnknownInCatchVariables`.
  Narrow the two `catch (e: any)` (parser.ts:108, util.ts:327).
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
  decisions above. Plan approved. Worktree `strict-typescript` created, this note
  written. **No code changed yet** — M0 codegen + M1 onward are next.
