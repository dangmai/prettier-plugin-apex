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
