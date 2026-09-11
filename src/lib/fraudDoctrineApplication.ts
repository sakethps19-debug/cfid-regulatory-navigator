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

export interface AppliedDoctrineOrderGroup {
  orderId: string;
  caseName: string;
  officialSourceUrl: string;
  findings: ScenarioFinding[];
}

export function groupAppliedFindingsByOrder(findings: ScenarioFinding[]): AppliedDoctrineOrderGroup[] {
  const byOrder = new Map<string, AppliedDoctrineOrderGroup>();
  for (const f of findings) {
    const orderId = f.orderIds[0];
    if (!orderId) continue; // a finding with no originating order has no order to group under -- never invented
    const existing = byOrder.get(orderId);
    if (existing) existing.findings.push(f);
    else byOrder.set(orderId, { orderId, caseName: f.caseName, officialSourceUrl: f.officialSourceUrl, findings: [f] });
  }
  return [...byOrder.values()];
}
