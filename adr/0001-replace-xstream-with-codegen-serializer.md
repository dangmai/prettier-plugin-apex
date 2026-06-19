# 1. Replace XStream with a build-time code-generated JSON serializer

Date: 2026-06-18

## Status

Accepted — implemented on branch `xstream-codegen-serializer`.

## Context

`apex-ast-serializer` parses an Apex source file with Salesforce's proprietary
`jorje` parser and serializes the resulting AST to JSON on stdout (or over HTTP
in the long-running server). The `prettier-plugin-apex` plugin `JSON.parse`s that
output, enriches it, and formats it with Prettier's doc IR.

Historically the serialization step used [XStream](https://x-stream.github.io/)
with a JSON driver and a handful of custom converters (Optional, TreeMap, enums,
BigDecimal-as-string). XStream walks the object graph via **runtime reflection**.

A performance harness merged earlier (`tests_perf/`, see
`.claude/rules/performance-harness.md`) attributed end-to-end formatting time to
buckets. It showed the Java-side **serialize** step was the single largest cost —
larger than `jorje` parsing itself. On a representative native build:

| file | java-serialize (XStream) | total format time |
|---|---|---|
| Comments | 62 ms | 96 ms |
| SOQLClass | 42 ms | 98 ms |
| ExpressionClass | 62 ms | 91 ms |
| PerfBenchmarkLarge (~4k lines) | 294 ms | 446 ms |

Reflection also imposed secondary costs unrelated to raw speed:

- The GraalVM **native image** had to register every `jorje` class and field for
  reflection (`RuntimeReflectionRegistrationFeature`, driven by ClassGraph) so
  XStream could reach them in the closed world.
- The launcher needed XStream-only `--add-opens` JVM args to open `java.base`
  internals to XStream's `Optional` converter.
- Runtime reflection is the primary blocker for a future **WebAssembly** build.

So the dominant cost and several structural complications all traced back to one
root cause: serializing via reflection.

## Decision

Replace XStream with a **build-time, code-generated, reflection-free
serializer**.

A new `serializer-generator` Gradle subproject scans the `jorje` AST classes with
ClassGraph at build time and emits `GeneratedAstSerializer` — plain Java that
reads each node through compiled public field/getter access and writes JSON
through Jackson Core's **streaming** API (`JsonGenerator` only; *not*
`jackson-databind`, which is itself reflection-based). A thin `AstSink` interface
(`JsonAstSink` is the only implementation today) separates traversal from
encoding, leaving room for a binary backend later without touching the generator.

Supporting decisions, settled before implementation:

1. **The wire format stays JSON, structurally identical to XStream's output.**
   The JS consumer only does `JSON.parse`, so only *structural* equivalence
   matters — same keys, values, nesting, and `@class` tags. Key order and
   whitespace are irrelevant. This keeps the plugin's `parser.ts`/`printer.ts`
   completely unchanged.
2. **Discovery config is shared** (`jorje-discovery.gradle`) between the
   serializer-generator and the existing `typescript-generator`, so the runtime
   byte shape and the generated `jorje.d.ts` typings cannot drift on a `jorje`
   bump.
3. **Migrate via a dual path plus a structural-diff oracle.** Build the generated
   serializer alongside XStream; a temporary `SerializerParityTest` serialized
   the entire test corpus both ways and asserted structural JSON equality. Keep
   XStream as the default until the diff was clean and the full JS suite passed
   in built-in, native, and `AST_COMPARE` modes; then flip the default; then
   delete XStream.
4. **After cutover, remove everything that existed only for XStream**: the
   reflection-registration feature, the `--add-opens`, the XStream dependency,
   and the dual-path/oracle scaffolding.

## Alternatives considered

- **Keep XStream, just accept the cost.** Rejected: serialize is the dominant
  bucket; leaving it reflective also keeps the native-image and WASM friction.
- **A binary / zero-copy wire format (e.g. FlatBuffers).** Rejected. Prettier
  core *mutates* the AST nodes it is handed (comment attachment writes
  `node.comments`, `comment.leading/trailing/placement`, `printed`; the DFS
  relies on `Object.keys(node)`, `delete node.loc`, and reference identity via
  `indexOf`). An immutable zero-copy accessor would force a mutable proxy layer,
  reintroducing the allocation it was meant to avoid. The achievable ceiling is
  decode-to-POJO, whose only remaining benefit (a smaller payload) attacks the
  already-tiny JS-deserialize bucket (1.8–19 ms) and might even lose to V8's
  native `JSON.parse`. Meanwhile the ~600 ms cost is the Java serializer, which a
  reflection-free generator kills regardless of wire format. JSON + codegen
  captures the whole win at the lowest risk; the `AstSink` seam keeps a binary
  backend open if profiling ever justifies it.
- **Hand-write the serializer.** Rejected: ~300 jorje types, and a `jorje` bump
  would silently desync a hand-written serializer. Generating from the same
  discovery config the typings use keeps them locked together.
- **Intern `@class` FQCNs in a header table** to shrink the payload. Deferred
  (see Follow-ups): it attacks bytes, not the critical-path serialize cost, and
  it would break structural equivalence with XStream (so it can't be a drop-in,
  and the oracle couldn't validate it).

## Consequences

### Positive

- **Serialize cost collapses.** A same-binary A/B (the generated serializer vs.
  XStream forced back on via a flag, on the PGO native image) measured
  java-serialize dropping **94–98%** and total format time **44–69%**:

  | file | java-serialize | total |
  |---|---|---|
  | Comments | 62 → 1.4 ms (−97.8%) | 96 → 32 ms (−66%) |
  | SOQLClass | 42 → 1.5 ms (−96.4%) | 98 → 55 ms (−44%) |
  | ExpressionClass | 62 → 1.2 ms (−98.1%) | 91 → 28 ms (−69%) |
  | PerfBenchmarkLarge | 294 → 16 ms (−94.5%) | 446 → 161 ms (−64%) |

  Smaller secondary wins followed from the more compact payload (spawn-ipc
  −23–27%, deserialize −6–8%).
- **No runtime reflection.** The native image builds and passes the full suite
  with the reflection-registration feature *and* all `--add-opens` removed —
  `jorje` parsing and the generated serializer need neither. The native build is
  simpler and a future WASM build is de-risked.
- **Typings can't drift** from the runtime shape (shared discovery config).

### Negative / trade-offs

- **More build-time machinery.** A new Gradle subproject runs as a `compileJava`
  dependency and generates sources into the build. A `jorje` bump now requires a
  rebuild to regenerate the serializer (it already required regenerating the
  typings, so this is a parallel, not new, obligation).
- **Closed-world dispatch.** The generated dispatcher throws on any runtime type
  it doesn't recognize, instead of reflecting over whatever it's given. This is
  deliberate (a `jorje` change fails loudly rather than silently emitting a wrong
  shape), but it means new runtime-reachable types must be added to the shared
  discovery config. The corpus oracle surfaced the few such types during
  migration (jorje exception types, `java.time` SOQL literals).
- **The parity oracle is gone.** It compared against XStream and could not
  outlive it. Regression protection now comes from the JS suite (including
  `AST_COMPARE`) and a small smoke test, not a byte-for-byte cross-check.

### Neutral

- A couple of structural quirks are reproduced deliberately and documented in the
  generator/sink source: `@class` on every node and collection element, enums as
  `{"@class":C,"$":"NAME"}`, BigDecimal as a JSON string, `Map` as `[[k,v],…]`
  tuples, `Optional` as `{"value":…}`/`{}`, and omission of null fields.

## Follow-ups (deferred, numbers-gated)

- **Wire-level `@class` interning.** Emitting each FQCN once in a header table and
  referencing it by index could cut payload size meaningfully, but it attacks the
  already-small transport/deserialize buckets rather than the serialize cost this
  ADR targeted, and it breaks structural equivalence (so it needs its own
  validation, not the oracle). Revisit only if a native baseline shows those
  buckets are worth attacking; the `AstSink` seam is the right home for it.
- **Binary backend.** Same seam; same gate — only if profiling justifies it.

## References

- Performance harness: `.claude/rules/performance-harness.md`
- Java component overview: `.claude/rules/java-serializer.md`
- Generated serializer & generator: `packages/apex-ast-serializer/serializer-generator/`,
  `packages/apex-ast-serializer/parser/src/main/java/net/dangmai/serializer/sink/`
