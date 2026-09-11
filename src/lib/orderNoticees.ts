import type { OrderNoticee } from "@/types/domain";

export interface ResolvedNoticee {
  fullName: string;
  role: string | null;
}

export interface ResolvedOrderNoticees {
  /** "structured" — this order's own order_noticees rows (the confirmed,
   * curated respondent list). "none" — no structured noticee data exists
   * yet for this order. There is no third state: a finding's free-text
   * actor list is never used as a noticee source, not even as a labelled,
   * caveated fallback — see the hard rule below. */
  source: "structured" | "none";
  noticees: ResolvedNoticee[];
}

/** Case/Order Detail's "Noticees" section (live-officer-review correction —
 * Rajesh Exports Limited: Siddharth Mehta was rendered as a noticee of the
 * 03-Jun-2026 interim order despite the order's own cause title naming only
 * Rajesh Exports Limited and Rajesh Mehta as noticees; he is discussed in
 * REL-05's facts as a counterparty to undisclosed fund transfers, which is
 * not the same as being a noticee. A follow-up independent audit then found
 * that even after that fix, this function still had a "fallback" path that
 * could display finding actor names — with a caveat — when structured data
 * was absent. That path is now removed entirely, per the explicit
 * instruction: PERSON MENTIONED IN FINDINGS != NOTICEE, full stop. Prefer
 * incomplete-but-honest data over a potentially wrong noticee list.)
 *
 * HARD RULE: a person/entity may appear here only where the captured
 * order's own structured order_noticees data identifies them as a noticee.
 * Never inferred from a finding's free-text actor list (noticeeActors),
 * factual discussion, related-party status, bank-account ownership,
 * transaction involvement, promoter-family relationship, investigation
 * references, or another order in the same matter — not even as a
 * caveated fallback. Structured order_noticees data, when present for this
 * order, is used IN FULL and NEVER topped up with names from
 * findings.noticeeActors. When no structured data exists for this order,
 * the caller must show an honest "not yet captured" state and point to the
 * official order, never a name sourced from finding actors — see the
 * caller's UI treatment. Finding actor data itself is not deleted or
 * touched by this function; it remains available and useful elsewhere
 * (e.g. each finding's own record) — it is simply never used as a source
 * for this specific field. */
export function resolveOrderNoticees(orderId: string, allOrderNoticees: OrderNoticee[]): ResolvedOrderNoticees {
  const structured = allOrderNoticees.filter((n) => n.orderId === orderId);
  if (structured.length > 0) {
    return { source: "structured", noticees: structured.map((n) => ({ fullName: n.fullName, role: n.role })) };
  }
  return { source: "none", noticees: [] };
}
