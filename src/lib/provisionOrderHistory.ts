import type { Order, ScenarioFinding } from "@/types/domain";
import { findingDispositionLabel } from "@/lib/findingStatusDisplay";

export interface ProvisionOrderHistoryFinding {
  finding: ScenarioFinding;
  dispositionLabel: string | null;
  /** false when this finding's provision citation is linked to more than
   * one captured order (e.g. an interim + its later final order) -- the
   * same conservative provenance flag used by groupRelevantRecordsByOrder
   * and orderProvisionsConsidered.ts, reused here rather than a fourth
   * variant of the same rule. */
  orderSpecific: boolean;
}

export interface ProvisionOrderHistoryEntry {
  order: Order;
  findings: ProvisionOrderHistoryFinding[];
  hasFindingLevelOnlyLinkage: boolean;
}

/** Provision Detail's "Historical treatment in captured orders" (P1-8
 * redesign, live-officer-review independent audit): replaces the old
 * "Track record" chip summary, which grouped findings by raw
 * FindingStatus via GROUP_ORDER/GROUP_INFO -- including "Alleged" and
 * "Prima facie" as group headings, exactly the officer-facing
 * status/tag/group-heading exposure the product rule prohibits. Order
 * stage now comes only from the actual captured Order (OrderStageBadge);
 * disposition, where one exists, comes only from findingDispositionLabel
 * (never a fabricated one for an unresolved SCN-stage allegation). Groups
 * by order.id, never by finding_status, so a matter's Interim and Final
 * orders always remain separate entries -- the same rule already applied
 * to the Scenario Analyzer's "Relevant CFID Orders" and Order Detail's
 * "Broad scenarios arising from this order". Frequency (how many findings
 * appear under one order) is display-only, never a proxy for legal
 * weight. */
export function groupProvisionFindingsByOrder(
  findings: ScenarioFinding[],
  ordersById: Map<string, Order>
): ProvisionOrderHistoryEntry[] {
  const byOrderId = new Map<string, ProvisionOrderHistoryEntry>();
  for (const finding of findings) {
    const orderSpecific = finding.orderIds.length <= 1;
    for (const orderId of finding.orderIds) {
      const order = ordersById.get(orderId);
      if (!order) continue; // referenced order not in the provided set — skip rather than guess
      let entry = byOrderId.get(orderId);
      if (!entry) {
        entry = { order, findings: [], hasFindingLevelOnlyLinkage: false };
        byOrderId.set(orderId, entry);
      }
      if (!entry.findings.some((f) => f.finding.recordId === finding.recordId)) {
        entry.findings.push({
          finding,
          dispositionLabel: findingDispositionLabel(finding.findingStatus),
          orderSpecific,
        });
      }
      if (!orderSpecific) entry.hasFindingLevelOnlyLinkage = true;
    }
  }
  return [...byOrderId.values()].sort((a, b) => {
    if (a.order.orderDate && b.order.orderDate && a.order.orderDate !== b.order.orderDate) {
      return b.order.orderDate.localeCompare(a.order.orderDate);
    }
    if (a.order.orderDate && !b.order.orderDate) return -1;
    if (!a.order.orderDate && b.order.orderDate) return 1;
    return a.order.caseName.localeCompare(b.order.caseName);
  });
}
