# XStream → codegen serializer: hand-off

**Goal:** Replace the reflection-based XStream JSON serialization in the Java
`apex-ast-serializer` with a faster, build-time **code-generated**, reflection-free
serializer. Highest-leverage perf lever found by the perf harness (Java-side
serialize is the single largest cost). Secondary wins: delete
`RuntimeReflectionRegistrationFeature` + XStream-only `--add-opens`; de-risk a future
WASM build.

**This is a long, multi-session effort. Any agent picking this up: read this file
first, then `/home/dangmai/.claude/plans/iridescent-crafting-quokka.md` for the full
plan, then `.claude/rules/{java-serializer,performance-harness}.md`.**

Branch: `xstream-codegen-serializer` (worktree). Personal repo → bare-slug branch.

---

## Current state

- ☑ Grilled the user; all approach/scope decisions settled (see below).
- ☑ Baseline measured (see numbers).
- ☑ Plan written (`~/.claude/plans/iridescent-crafting-quokka.md`).
- ☑ Worktree + this hand-off file created.
- ☑ M1 done (commit 75221992) — `serializer-generator` subproject scaffolded.
- ☑ M2 done (commit 9ae8cf88) — shared `jorje-discovery.gradle`; `jorje.d.ts` byte-identical.
- ☑ M3 done (commit 53192afa) — `AstSink` + `JsonAstSink` (Jackson Core), 12 unit tests.
- ☑ M4 done (commit 7d9e91c9) — generator emits `GeneratedAstSerializer` (304 types),
  wired into parser compile, smoke tests green. XStream still the only runtime path.
- ☐ **M5 next** — dual-path + `SerializerParityTest` over full corpus; iterate until clean.

## Decisions (settled, do not re-litigate)

1. Wire format stays **JSON**, structurally identical to XStream output (JS does
   `JSON.parse` → only structural equivalence matters, not bytes/whitespace/order).
2. **Build-time code generator** (ClassGraph scan of jorje) emits Java serializers. No
   runtime reflection.
3. **Traversal/encoding split** via an abstract `AstSink` streaming interface; JSON
   backend over **Jackson Core** streaming (`JsonGenerator`, NOT databind). Binary
   backend is a future drop-in (forward sink fits JSON + eager binary like protobuf;
   FlatBuffers would need a buffering adapter).
4. Serializer-generator **reuses the typescript-generator's discovery config** (shared
   `jorje-discovery.gradle`) so runtime bytes & `jorje.d.ts` can't drift.
5. Migration = **dual-path + structural-diff oracle**: build alongside XStream, diff
   over full corpus, keep XStream until clean + full JS suite green in
   built-in/native/`AST_COMPARE`, then delete.
6. In scope after cutover: delete `RuntimeReflectionRegistrationFeature`, XStream
   converters/dep, XStream-only `--add-opens`; confirm native image builds. **WASM out
   of scope.**

Why not binary/zero-copy: Prettier core *mutates* AST nodes (comment attachment,
`Object.keys`/`delete`/`indexOf` identity in the DFS), so zero-copy is infeasible;
decode-to-POJO's only win (smaller payload) hits the tiny JS deser bucket and may lose
to V8 `JSON.parse`. The dominant ~600ms cost is the Java serializer, killed by any
reflection-free generator regardless of format.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Scaffold `serializer-generator` subproject; scan jorje, print type count | ☑ |
| M2 | Extract shared `jorje-discovery.gradle`; `jorje.d.ts` regenerates identical | ☑ |
| M3 | `AstSink` + `JsonAstSink`, unit-tested in isolation | ☑ |
| M4 | Generator emits `GeneratedAstSerializer`; wire into parser compile; smoke test | ☑ |
| M5 | Dual-path + `SerializerParityTest` over full corpus; iterate until diff clean | ☐ |
| M6 | Flip default to generated; full JS suite built-in+native+AST_COMPARE; native build | ☐ |
| M7 | Cleanup: delete XStream/Feature/parity-test/`--add-opens` incrementally | ☐ |
| M8 | Write the ADR in `adr/` documenting the decision + rationale (this is the repo's first ADR) | ☐ |

> The ADR is deliberately deferred until the work is essentially done (too many
> unknowns now). It's required by the project CLAUDE.md for big feature work and
> lives in `adr/` at the repo root.

## Harness numbers

Measure with `pnpm -C packages/prettier-plugin-apex run benchmark -- --mode native --out head.json`
(or `--mode none` for JVM). Sub-buckets java-parse / **java-serialize** / spawn-ipc.
⚠ Java sub-buckets are 0 unless the binary/dist was built from instrumented source —
a downloaded `main` CI artifact predates the instrumentation. Build from source first.

### Baseline — JVM mode (`--mode none`), instrumented dist, commit 08a00a68, 2026-06-18

| file | java-parse | **java-serialize** | spawn-ipc | deser | prep | print | total |
|---|---|---|---|---|---|---|---|
| Comments | 199 | **309** | 145 | 1.8 | 4.9 | 10.1 | 674 |
| SOQLClass | 322 | **208** | 141 | 1.8 | 4.1 | 5.2 | 682 |
| ExpressionClass | 196 | **287** | 142 | 1.5 | 3.3 | 5.2 | 643 |
| PerfBenchmarkLarge (4k) | 264 | **617** | 153 | 19 | 49 | 58 | 1171 |

(ms, median. JVM startup inflates absolutes; serialize ≈ 2.3× parse on the large file
is the signal. Saved: `/tmp/xstream-baseline-jvm.json`.) A native baseline built from
instrumented source is still TODO — capture it before/at M6 for the real adopter delta.

### Latest — (none yet; update per milestone)

## Wire format (verified empirically from XStream output, M3)

Captured by running `:parser:run` on `public class A { Integer x = 1; /* c */ }`:

- **Root**: `{"<root FQCN>": { ...fields... }}` — wrapper keyed by class name, the
  inner object has **no** `@class`. (`startDocument`/`endDocument`.)
- **Classed node** (field value / list item): `{"@class":"<FQCN>", ...fields}`.
- **`$` is just a field name.** Enum → `{"@class":C,"$":"NAME"}`. A *boxed scalar as a
  collection element* → `{"@class":"int","$":1}` (and map keys too). So no special
  sink method — `startObject(class); name("$"); value...; endObject()`.
- **Named scalar field** (primitive/String/BigDecimal): emitted inline, `"startIndex":0`
  — NOT wrapped. Only collection *elements* get the `@class`+`$` wrapping.
- **BigDecimal**: always a JSON string (`"1.0"`), as field or `$` value.
- **List**: `[item,...]`, empty `[]`. **Map** (TreeMap): `[[k,v],...]`, empty `[]`.
- **Optional**: present `{"value":<v>}`, empty `{}` (plain object, no `@class`).

Key-order/whitespace are irrelevant (JS `JSON.parse`); Jackson compact has no
space after `:` where XStream had one — structurally identical, fine.

## Gotchas / risks

- Discovery uses `ignoreClassVisibility()` (added M4) — without it, ClassGraph silently
  skips package-private types like `apex.jorje.data.IndexLocation`, which ARE serialized
  at runtime. With it: **306** concrete classes; generator emits **304** field writers
  (skips 2 `*Builder` types with no accessible fields — not reachable in a real AST).
- **M4 access model** (`TypeModel`): read each field via public field directly, else a
  getter cast to a public supertype (transitive interface search — e.g. `loc` via the
  public default `Locatable.getLoc()`). Generated casts use *canonical* (dotted) names;
  binary `$` names only appear as runtime strings (switch cases, `@class`). Anonymous
  classes (no canonical name) → field writer is empty or the type is skipped. Enums
  dispatch in `writeValue` via `getDeclaringClass()` (handles enum-constant bodies like
  `BinaryOp$1` → `@class` = `BinaryOp`). Field/getter name mismatches handled by a small
  `GETTER_OVERRIDES` map (currently `*ParameterRef#typeRef` → `getType`).
- **M5 must verify** (likely parity gaps): XStream primitive `@class` aliases
  (`"string"`, `"big-decimal"`, `"int"`, …) — guessed from XStream defaults, confirm via
  oracle; how `Object`-typed fields holding String/primitives wrap; null field rendering
  (none seen so far — jorje prefers `Optional`); whether anonymous `*Blocks$N` Location
  impls ever appear at runtime (dispatcher would throw); the `typeRef` override coverage.
- `ParserOutput` fields are private → use getters; generator must prefer public field,
  fall back to public getter, fail-fast otherwise.
- Format quirks to replicate structurally: `@class` everywhere, enum
  `{"$":name(),"@class":c}`, BigDecimal-as-string, Map→`[[k,v]]`, Optional→
  `{"value":..}`/`{}`, no `@id`/`@reference`.
- Closed-world generator: types reachable at runtime but outside the classPatterns
  (e.g. `apex.jorje.services.exception.*`, `com.google` collections) make the dispatcher
  `default` throw — add them to the shared config (oracle in M5 surfaces them).
- No cycle guard (NO_REFERENCES gone) — jorje ASTs are trees; add identity guard only
  if the oracle reveals a back-edge.
- Remove `--add-opens` one at a time (jetty/jersey/jaxb/jorje may need some).

## Future ideas (deferred, post-cutover, numbers-gated)

- **Wire-level `@class` interning.** A dictionary that emits each FQCN once in a
  header table and references it by a short index per node (`"@class":3`) would cut
  payload size meaningfully (FQCNs are 40–60 chars and the most-repeated token; ~30–50%
  smaller plausibly). BUT: (a) bytes aren't on our critical path — they attack the
  already-tiny `deser` (1.8–19ms) and the spawn-dominated `spawn-ipc` buckets, not the
  ~600ms java-serialize cost we're killing (same logic that rejected binary formats);
  (b) it **breaks structural equivalence** with XStream, so it's not a drop-in — every
  `node["@class"]` read in `parser.ts`/`printer.ts` would need an index→name pass and
  the M5 oracle couldn't diff. So it's a *separate* experiment AFTER cutover, gated on
  the native baseline (M6) showing the deser/transport buckets are worth attacking. The
  `AstSink` seam is the right home: a dictionary-encoding sink variant could do it
  without touching the generator. (Note: Java-side string interning is already free —
  generated code emits `@class` as string literals, which the JVM constant-pool interns.)
