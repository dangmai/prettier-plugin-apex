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
- ☑ M4 review fixes (commit a3394cd1) — null-field omission/NPE, deterministic field order.
- ☑ M5 done (commit 956a52c5) — `SerializerParityTest` structurally clean over the full
  corpus (307 types). Dual path added (`APEX_SERIALIZER=generated`, default still XStream).
  Benchmark: **~7x faster serialize** (174ms→24ms warm, ~2400-line class).
- ☑ M5 review fixes (commit 6edc4428) — getter return-type validation (ParseException
  `error`→getUserError, was wrongly getError); oracle date-time tolerance scoped to
  `.literal`. **CI fix**: `generateAstSerializer` was being instrumented by the GraalVM
  agent (broke CI test+CodeQL jobs since M4); excluded it from the agent predicate.
- ☑ M6 done — flipped default to generated (`useGeneratedSerializer()` now defaults true;
  opt back into XStream with `APEX_SERIALIZER=xstream`/`-DapexSerializer=xstream`). Full JS
  suite green with generated as default: built-in 95, AST_COMPARE 273, native 95. Native
  image still has the Feature (M6 isolates the swap from dep removal). Jackson Core survives
  the closed-world analysis. Native end-to-end A/B (same binary, flag-switched): **total
  format time −44% to −69%, java-serialize −94% to −98%** (numbers below).
- ☑ M7 done — XStream fully removed in three verified commits: (1) `Default to the
  generated serializer` (M6); (2) `Remove XStream now that the generated serializer is the
  only path` — Apex cutover, deleted `RuntimeReflectionRegistrationFeature` + `--features` +
  graalvm source set + ClassGraph dep + xstream dep + parity/benchmark tests; (3) `Drop the
  XStream-only --add-opens JVM args` (parser CLI, native buildArgs, and the Jetty/Jersey
  server — none needed them). Native image builds & passes **without** the reflection
  Feature and **without** any `--add-opens`. All modes green: built-in 95, AST_COMPARE 273,
  native 95. Stale docs updated (`.claude/rules/java-serializer.md`, perf comments).
- ☐ **M8 next** — write the repo's first ADR in `adr/` documenting the decision + rationale
  (perf lever, codegen approach, JSON parity, dual-path migration, reflection/opens removal).

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
| M5 | Dual-path + `SerializerParityTest` over full corpus; iterate until diff clean | ☑ |
| M6 | Flip default to generated; full JS suite built-in+native+AST_COMPARE; native build | ☑ |
| M7 | Cleanup: delete XStream/Feature/parity-test/`--add-opens` incrementally | ☑ |
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

### Latest — M5 warm serialize micro-benchmark (in-JVM, isolates serialize step)

`SerializerBenchmark` (run with `RUN_BENCHMARK=true`), ~2400-line class, ~5MB JSON:
XStream **174ms** → generated **24ms** median = **~7.3x**. This is the serialize step
alone (parse done once up front), so cleaner than the harness's startup-inflated numbers.
A real `--mode native` end-to-end delta is still TODO at M6.

### M6 — native end-to-end A/B (the real adopter delta), 2026-06-18

True same-binary A/B on the PGO native image: head = generated (default), base = forced
XStream via `APEX_SERIALIZER=xstream`. Both labelled `14204c2d` (source edits uncommitted
at measure time). `pnpm run benchmark -- --mode native --obtain existing`, median ms:

| file | java-serialize base→head | total base→head |
|---|---|---|
| Comments | 62.0 → 1.4 (−97.8%) | 95.9 → 32.4 (−66.2%) |
| SOQLClass | 42.3 → 1.5 (−96.4%) | 97.7 → 54.6 (−44.1%) |
| ExpressionClass | 61.6 → 1.2 (−98.1%) | 90.5 → 27.7 (−69.4%) |
| PerfBenchmarkLarge (4k) | 293.7 → 16.1 (−94.5%) | 446.3 → 161.3 (−63.9%) |

java-serialize is now a rounding error on small files and ~16ms on the 4k-line class
(was the single largest bucket). Secondary wins observed: spawn-ipc −23% to −27% and
deserialize −6% to −8% (smaller compact payload, no inter-token spaces). Saved:
`/tmp/baseline-xstream-native.json` (XStream) and `/tmp/head-m6.json` (generated).

> Local native-build gotcha (this dev box, not CI): `build:musl` produced a broken
> toolchain — zlib 1.3.2 failed on musl (`errno`/`EWOULDBLOCK` undeclared; configure
> mis-probe) so `libz.a` was missing, and GCC 16's specs emit a `-latomic_asneeded`
> pseudo-token musl-gcc can't rewrite, breaking every static link. Fixes applied by hand
> into `musl-toolchain/`: built `libz.a` with `CFLAGS="-O2 -include errno.h"` and dropped
> an empty `libatomic_asneeded.a` stub (x86_64 atomics inline). Both live in the gitignored
> `musl-toolchain/`, so a fresh checkout will hit this again until `build-musl-toolchain.sh`
> is patched. CI is unaffected (older toolchain image).

### M5 oracle outcome (parity gaps found & resolved)

Only 3 of 87 corpus files differed, all from XStream reflecting beyond the typed AST:
- `ParseException` (InvalidClass.cls, parse errors) and `ZonedDateTime`/`LocalDate`
  (SOQLClass.cls, SOQL date literals) hit the dispatcher's throw.
- Fixes: java.time → bare string (toString); exception types generated with jorje fields
  only (walk stops at Throwable boundary), `message` via `getError()`, added as
  serializer-only discovery extras (`apex.jorje.services.exception.**`,
  `apex.jorje.data.errors.**`) so jorje.d.ts is untouched.
- Oracle relaxations (documented in the test, behaviorally safe): under
  parseErrors/internalErrors compare only `message` (plugin reads only that; printer
  never runs on error files); tolerate java.time **date-time** value format diffs
  (printer reprints those from source via originalText.slice). LocalDate round-trips
  exactly so it's checked normally.

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
  oracle; how `Object`-typed fields holding String/primitives wrap; whether anonymous
  `*Blocks$N` Location impls ever appear at runtime (dispatcher would throw); the
  `typeRef` override coverage.
- **Null fields are omitted** (decided M4, post-review): the generator reads each
  reference field once and skips it when null, matching XStream's omit-null behavior (and
  fixing an unboxing NPE on null boxed-wrapper fields). Primitives are always emitted.
  Confirm via the oracle that XStream truly omits (vs. `null`) — if not, revisit.
- **Generated source is deterministic** (fields sorted by name per hierarchy level);
  generated method names are asserted unique. Reviewer (M1–M4) found no other material
  issues — design cleared pending the M5 oracle.
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
