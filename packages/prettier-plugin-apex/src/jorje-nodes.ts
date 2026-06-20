import type * as jorje from "../vendor/apex-ast-serializer/typings/jorje.d.js";
import type { AnnotatedComment } from "./util.js";

/**
 * Fields the parser's enrichment pass (see `parser.ts`) attaches to jorje nodes
 * after parsing but before printing. They don't exist in the generated
 * `jorje.d.ts`, so any node the printer touches is really an {@link Enriched}
 * variant. Modelling them here once is what lets handlers read e.g.
 * `node.insideParenthesis` or `node.comments` without per-handler casts.
 */
export interface ApexEnrichment {
  comments?: AnnotatedComment[];
  danglingComments?: AnnotatedComment[];
  trailingEmptyLine?: boolean;
  forcedHardline?: boolean;
  insideParenthesis?: boolean;
}

/** A jorje node (or any subtree) plus the parser's enrichment fields. */
export type Enriched<T> = T & ApexEnrichment;

/**
 * Assert that a jorje node carries the parser's enrichment fields. Every node
 * the printer walks has been through the enrichment pass, but jorje's generated
 * types don't declare those fields and Prettier's path navigation
 * (`path.call`/`path.map`) hands back the raw, un-enriched child type. Reading
 * e.g. `.trailingEmptyLine` off a navigated child therefore needs this single,
 * centralized assertion rather than a cast scattered at each call site.
 */
export function asEnriched<T>(node: T): Enriched<T> {
  return node as Enriched<T>;
}

/**
 * The concrete, enrichable union of every jorje node whose `@class` is one of
 * `T`'s. typescript-generator emits abstract parents (`Expr`, `Stmnt`,
 * `ForControl`, …) as a base interface that carries only the `@class` literal
 * union — not a discriminated union of the concrete subtypes — so a field typed
 * as the parent can't be narrowed to a subtype by `@class`. Re-viewing it as
 * `Concrete<T>` (drawn from the generated {@link jorje.ApexNode} union, which is
 * a real discriminated union) restores narrowing.
 */
export type Concrete<T extends { "@class": string }> = Enriched<
  Extract<jorje.ApexNode, { "@class": T["@class"] }>
>;

/**
 * Re-view an abstract-parent-typed node as its {@link Concrete} subtype union so
 * the printer can narrow it by `@class`. Centralizes that single justified
 * assertion (the runtime value is always one of the concrete subtypes; the
 * abstract base is only how the generator models the type hierarchy).
 */
export function asConcrete<T extends { "@class": string }>(
  node: T,
): Concrete<T> {
  return node as unknown as Concrete<T>;
}

/**
 * The discriminated union of every concrete jorje node (emitted into
 * `jorje.d.ts` by `ApexNodeUnionExtension`), enriched with the parser's
 * metadata. This is the type the printer's `@class` -> handler dispatch is built
 * around in later milestones.
 */
export type EnrichedApexNode = Enriched<jorje.ApexNode>;

/**
 * An `IfBlock` carrying the index assigned during enrichment so the printer can
 * tell `if` from `else if`.
 */
export type EnrichedIfBlock = Enriched<jorje.IfBlock> & {
  ifBlockIndex: number;
};
