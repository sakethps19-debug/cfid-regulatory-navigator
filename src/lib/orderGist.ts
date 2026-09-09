import type { Order, ScenarioFinding } from "@/types/domain";

/** scope_note is curated corpus content, but a handful of entries also
 * carry a trailing internal-pipeline annotation (e.g. "AI-extracted; not
 * yet reviewed by a CFID officer.", or one that names the raw DB field
 * "human_legal_review_completed = false" outright) — exactly the kind of
 * research-pipeline status this pass moves out of officer-facing screens
 * application-wide (see Part 2). The annotation is never stripped from the
 * stored data (Admin/researchers still see the raw field), only from what
 * this function returns for officer-facing display: every sentence
 * mentioning "AI-extracted" is dropped, since that string reliably marks
 * this annotation in every variant seen in the corpus, without touching
 * the substantive case narrative around it. */
export function stripPipelineLanguage(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/ai-extracted/i.test(sentence))
    .join(" ")
    .trim();
}

/** The single, application-wide rule for showing a short officer-facing
 * gist of an order — used by the Home "Recent Orders" feed and anywhere
 * else an order-level summary is shown, so the same order never reads
 * differently in two places.
 *
 * Prefers the order's own curated orders.scope_note (Order.scopeNote) —
 * workbook/analyst-curated, never LLM-generated at write time (see
 * scripts/lib/parsePrecedentWorkbook.ts) — when present, with the
 * pipeline-language filter above applied. Falls back, when scope_note is
 * not populated, to the DISTINCT category labels already curated on that
 * order's own scenario_findings (e.g. "Fictitious sales or assets",
 * "Preferential allotment / conversion misuse") — existing, curated,
 * fact-pattern labels, never freshly generated prose, and never a claim
 * about outcome or posture (a category label describes a topic, not a
 * finding). Returns null, never invented text, when neither is available
 * (an order not yet analysed into scenario findings, no gist to show). */
export function orderGist(order: Order, findingsForOrder: ScenarioFinding[]): string | null {
  if (order.scopeNote) {
    const cleaned = stripPipelineLanguage(order.scopeNote);
    return cleaned.length > 0 ? cleaned : null;
  }
  const categories = [...new Set(findingsForOrder.map((f) => f.category).filter((c): c is string => !!c))];
  if (categories.length === 0) return null;
  return categories.slice(0, 3).join("; ");
}
