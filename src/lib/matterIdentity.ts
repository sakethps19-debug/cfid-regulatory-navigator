import type { Order, ScenarioFinding } from "@/types/domain";

/** How a finding's matter identity was resolved — see resolveMatterKey.
 * Mirrors the same three-tier strategy already audited and in production
 * use for the Scenario Analyzer's historical-treatment view
 * (src/lib/matching/historicalTreatment.ts's own resolveMatterKey), kept
 * as an independent copy here rather than an import from the matching
 * engine so this presentational fix carries zero risk of changing
 * Analyzer/retrieval behaviour. */
export type MatterIdentityBasis = "matter_id" | "order_metadata_fallback" | "case_name_fallback";

export interface ResolvedMatterKey {
  /** Stable dedup key. The three key spaces are disjoint by construction
   * (distinct prefixes), so a weaker-tier key can never collide with, or
   * be mistaken for, a stronger one. */
  key: string;
  basis: MatterIdentityBasis;
  /** A human-readable name for this matter, for display alongside the
   * dedup key -- prefers the linked order's own curated
   * normalizedMatterName, then the finding's own case_name. */
  displayName: string;
}

/** Resolves a finding's matter identity via the strongest available basis,
 * in order: (1) the real matter model, orders.matter_id (an order lacking
 * matter_id is never assumed to share a matter with any other order); (2)
 * the linked order's own curated orders.normalized_matter_name; (3) the
 * finding's own case_name, the true last resort. A finding whose orderIds
 * resolve to no known order at all (e.g. a referenced order not present in
 * the supplied ordersById map) falls through the same way as one with no
 * matter_id -- straight to the case_name tier -- rather than being
 * silently dropped. */
export function resolveMatterKey(finding: ScenarioFinding, ordersById: Map<string, Order>): ResolvedMatterKey {
  for (const orderId of finding.orderIds) {
    const order = ordersById.get(orderId);
    if (order?.matterId) return { key: `matter:${order.matterId}`, basis: "matter_id", displayName: order.normalizedMatterName ?? order.caseName };
  }
  for (const orderId of finding.orderIds) {
    const order = ordersById.get(orderId);
    if (order?.normalizedMatterName) {
      return { key: `ordername:${order.normalizedMatterName.trim().toLowerCase()}`, basis: "order_metadata_fallback", displayName: order.normalizedMatterName };
    }
  }
  return { key: `casename:${finding.caseName.trim().toLowerCase()}`, basis: "case_name_fallback", displayName: finding.caseName };
}
