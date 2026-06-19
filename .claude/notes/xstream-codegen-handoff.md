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
- ☐ **M1 not started** — next action.

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
| M1 | Scaffold `serializer-generator` subproject; scan jorje, print type count | ☐ |
| M2 | Extract shared `jorje-discovery.gradle`; `jorje.d.ts` regenerates identical | ☐ |
| M3 | `AstSink` + `JsonAstSink`, unit-tested in isolation | ☐ |
| M4 | Generator emits `GeneratedAstSerializer`; wire into parser compile; smoke test | ☐ |
| M5 | Dual-path + `SerializerParityTest` over full corpus; iterate until diff clean | ☐ |
| M6 | Flip default to generated; full JS suite built-in+native+AST_COMPARE; native build | ☐ |
| M7 | Cleanup: delete XStream/Feature/parity-test/`--add-opens` incrementally | ☐ |

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

## Gotchas / risks

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
