// Pure grouping logic behind the Fraud Doctrine Analyser's "Orders applying
// this doctrine" card (src/app/(app)/fraud-test/page.tsx), extracted so it
// is independently unit-testable (this codebase's test suite is
// pure-logic-only; see vitest.config.ts).
//
// Post-freeze correction pass (Section B): one order = one authority card,
// with its relevant findings nested underneath -- never one card per
// finding, which previously let two findings from the same order (REL-01,
// REL-02) read as two separate authorities. Grouping is strictly by each
// finding's own originating order (orderIds[0], the same order_id linkage
// getScenarioFindings/data.ts already establishes), never by case name --
// two findings that merely share a case name but not an order id are never
// merged into one card.
import type { ScenarioFinding } from "@/types/domain";

// SPARC final surgical correction: the 29-May-2026 cutoff (Reliance
// Industries Ltd. & Ors. v. SEBI, 2026 INSC 585, decided this date) had
// previously existed only as prose/UI copy on the parent page -- nothing
// in code actually checked it, so a future accidental addition of a
// pre-cutoff finding id to the curated DOCTRINE_APPLIED_RECORD_IDS
// registry (fraud-test/page.tsx) would have rendered it with nothing to
// stop it. This is a DISPLAY/SELECTION safety guard only, applied here at
// the exact point findings become order groups: a curated record id
// remains the sole inclusion authority (this never discovers a doctrine
// order by date alone), but a group is now also rejected outright if its
// own order's date is missing or predates the judgment.
export const DOCTRINE_JUDGMENT_DATE = "2026-05-29";

export interface AppliedDoctrineOrderGroup {
  orderId: string;
  caseName: string;
  officialSourceUrl: string;
  findings: ScenarioFinding[];
}

/** orderDateById must carry every order id any finding here might reference
 * (e.g. built from getOrders()) -- an order id absent from the map is
 * treated the same as a missing date (excluded), never assumed eligible. */
export function groupAppliedFindingsByOrder(
  findings: ScenarioFinding[],
  orderDateById: Map<string, string | null>
): AppliedDoctrineOrderGroup[] {
  const byOrder = new Map<string, AppliedDoctrineOrderGroup>();
  for (const f of findings) {
    const orderId = f.orderIds[0];
    if (!orderId) continue; // a finding with no originating order has no order to group under -- never invented
    const orderDate = orderDateById.get(orderId);
    if (!orderDate || orderDate < DOCTRINE_JUDGMENT_DATE) continue; // temporal safety guard -- see module comment above
    const existing = byOrder.get(orderId);
    if (existing) existing.findings.push(f);
    else byOrder.set(orderId, { orderId, caseName: f.caseName, officialSourceUrl: f.officialSourceUrl, findings: [f] });
  }
  return [...byOrder.values()];
}
