import type { OrderNoticee, ScenarioFinding } from "@/types/domain";

export interface ResolvedNoticee {
  fullName: string;
  role: string | null;
}

export interface ResolvedOrderNoticees {
  /** "structured" — this order's own order_noticees rows (the confirmed,
   * curated respondent list). "fallback" — no structured data exists yet
   * for this order, so the names below are drawn from findings'
   * noticeeActors and are explicitly unverified. "none" — nothing on
   * file. */
  source: "structured" | "fallback" | "none";
  noticees: ResolvedNoticee[];
}

/** Case/Order Detail's "Noticees" section (live-officer-review correction —
 * Rajesh Exports Limited: Siddharth Mehta was rendered as a noticee of the
 * 03-Jun-2026 interim order despite the order's own cause title naming only
 * Rajesh Exports Limited and Rajesh Mehta as noticees; he is discussed in
 * REL-05's facts as a counterparty to undisclosed fund transfers, which is
 * not the same as being a noticee).
 *
 * HARD RULE: a person/entity may appear here only where the captured
 * order's own structured order_noticees data identifies them as a noticee.
 * Never inferred from a finding's free-text actor list (noticeeActors),
 * factual discussion, related-party status, bank-account ownership,
 * transaction involvement, promoter-family relationship, investigation
 * references, or another order in the same matter.
 *
 * Structured order_noticees data, when present for this order, is used IN
 * FULL and NEVER topped up with names from findings.noticeeActors — merging
 * even one additional name onto an already-structured list would
 * reintroduce exactly this defect (a counterparty merely discussed in a
 * finding's facts being presented as if the order itself named them a
 * respondent). The unstructured fallback is used ONLY when no structured
 * data exists at all for this order, and its "fallback" source is meant to
 * be surfaced to the officer as unverified — see the caller's own UI
 * treatment of that distinction. */
export function resolveOrderNoticees(
  orderId: string,
  allOrderNoticees: OrderNoticee[],
  findingsForOrder: ScenarioFinding[]
): ResolvedOrderNoticees {
  const structured = allOrderNoticees.filter((n) => n.orderId === orderId);
  if (structured.length > 0) {
    return { source: "structured", noticees: structured.map((n) => ({ fullName: n.fullName, role: n.role })) };
  }
  const fallbackNames = [...new Set(findingsForOrder.flatMap((f) => f.noticeeActors))];
  if (fallbackNames.length > 0) {
    return { source: "fallback", noticees: fallbackNames.map((fullName) => ({ fullName, role: null })) };
  }
  return { source: "none", noticees: [] };
}
