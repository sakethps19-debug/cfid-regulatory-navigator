// Case Journey: "what happened across the different orders/stages in THIS
// SAME MATTER?" — a matter-lifecycle research view, not a cross-case
// comparison tool, not a company-event chronology, and not a scenario
// comparison tool.
//
// The ONLY grouping unit is orders.matter_id (via the already-populated
// Matter/Order.matterId relationship — see matters/order_relationships in
// data.ts). Never company name, case_name text, fuzzy title match, shared
// issuer, or shared noticee. A matter with zero currently-captured orders
// contributes nothing; this module never invents a matter, an order, or a
// relationship between two orders that isn't already recorded.
import type { DirectionOutcome, Matter, Order, OrderRelationship, ScenarioFinding } from "@/types/domain";
import { currentOrderRelationLabel } from "@/lib/matterRelationships";
import { orderBroadScenarios, type OrderBroadScenarioSummary } from "@/lib/orderBroadScenarios";
import { orderGist } from "@/lib/orderGist";

export interface MatterWithOrderCount {
  matter: Matter;
  orderCount: number;
}

/** Case Journey landing list: only matters that currently have at least one
 * captured order (Case Journey spec, Part 3B) — a matters row with zero
 * orders currently linked to it (via orders.matter_id) has nothing to open
 * and is excluded, never shown as an empty/placeholder journey. */
export function mattersWithAtLeastOneOrder(matters: Matter[], orders: Order[]): MatterWithOrderCount[] {
  const countByMatterId = new Map<string, number>();
  for (const o of orders) {
    if (!o.matterId) continue;
    countByMatterId.set(o.matterId, (countByMatterId.get(o.matterId) ?? 0) + 1);
  }
  return matters
    .map((matter) => ({ matter, orderCount: countByMatterId.get(matter.id) ?? 0 }))
    .filter((m) => m.orderCount > 0);
}

/** A relationship note shown on a stage card, derived ONLY from an actual
 * order_relationships row directly connecting this stage's order to another
 * order already in the same journey. Never derived from date ordering or
 * order-type inference alone — see buildCaseJourney. */
export interface JourneyStageRelationshipNote {
  otherOrderId: string;
  otherOrderStage: Order["orderStage"];
  otherOrderDate: string | null;
  /** Reuses the exact same direction-aware label vocabulary
   * (Finalises/Precedes/Confirms/Revokes/Same matter/etc.) Order Detail's
   * own narrative sentences already use — see currentOrderRelationLabel in
   * matterRelationships.ts (the CURRENT order's own relationship to the
   * other order, e.g. "this interim order Precedes the final order below").
   * Never a bespoke second relationship vocabulary. */
  label: string;
}

export interface JourneyStage {
  order: Order;
  /** This order's own scenario findings only (matched by orderIds, the same
   * order_id/final_order_id linkage getScenarioFindings already resolves —
   * never by case name or stage-based guessing). */
  findings: ScenarioFinding[];
  /** This exact order_id's own order_directions rows only — never a
   * stage-based or case-name lookup (Part 15 of the spec). */
  directions: DirectionOutcome[];
  /** Reuses orderBroadScenarios verbatim — the same mechanism Order Detail
   * and Provision Detail already use. No second scenario taxonomy. */
  broadScenarios: OrderBroadScenarioSummary[];
  issuesExamined: string[];
  gist: string | null;
  relationshipNotes: JourneyStageRelationshipNote[];
}

export interface CaseJourney {
  matter: Matter;
  /** Chronological (orderDate ascending, then caseName — the same tie-break
   * convention already used by siblingOrdersInMatter), never a claimed
   * "ideal" procedural path: whatever order types this matter's orders
   * actually are, in whatever sequence they actually occurred, is what is
   * shown. */
  stages: JourneyStage[];
  /** True when exactly one order is currently captured for this matter —
   * the caller must show an explicit "only one order is currently
   * captured" note rather than a bare single card that could read as the
   * whole lifecycle having concluded after one stage, or as later stages
   * merely not having loaded. */
  singleOrder: boolean;
}

/** Builds one matter's Case Journey. matterOrders must already be filtered
 * to exactly this matter's id (e.g. via ordersForMatter/data.ts) — this
 * function performs no name-based or fuzzy matching of its own. findings/
 * relationships may be passed as the full corpus-wide lists; both are
 * filtered here strictly by order id membership within matterOrders, so an
 * order_relationships row connecting a matter order to some OTHER matter's
 * order is correctly excluded from relationshipNotes (Part 2: only orders
 * already linked through the same matter_id belong in one journey) — it
 * never pulls in an extra stage or an out-of-matter relationship note.
 * directions must already be scoped to matterOrders' ids (e.g. via
 * directionsForOrderIds), matching Part 15's "exact order_id, never
 * stage-based lookup" requirement at the call site. */
export function buildCaseJourney(
  matter: Matter,
  matterOrders: Order[],
  allFindings: ScenarioFinding[],
  directions: DirectionOutcome[],
  relationships: OrderRelationship[]
): CaseJourney {
  const matterOrderIds = new Set(matterOrders.map((o) => o.id));
  const orderById = new Map(matterOrders.map((o) => [o.id, o]));

  const sorted = [...matterOrders].sort((a, b) => {
    const dateCompare = (a.orderDate ?? "").localeCompare(b.orderDate ?? "");
    return dateCompare !== 0 ? dateCompare : a.caseName.localeCompare(b.caseName);
  });

  const stages: JourneyStage[] = sorted.map((order) => {
    const findings = allFindings.filter((f) => f.orderIds.includes(order.id));
    const orderDirections = directions.filter((d) => d.orderId === order.id);
    const issuesExamined = [...new Set(findings.map((f) => f.category).filter((c): c is string => !!c))];

    const relationshipNotes: JourneyStageRelationshipNote[] = [];
    for (const r of relationships) {
      if (r.fromOrderId !== order.id && r.toOrderId !== order.id) continue;
      const otherId = r.fromOrderId === order.id ? r.toOrderId : r.fromOrderId;
      if (otherId === order.id || !matterOrderIds.has(otherId)) continue; // never a cross-matter relationship
      const label = currentOrderRelationLabel(r, order.id);
      if (!label) continue; // no invented note when the stored type has no display label
      const other = orderById.get(otherId);
      if (!other) continue;
      relationshipNotes.push({ otherOrderId: otherId, otherOrderStage: other.orderStage, otherOrderDate: other.orderDate, label });
    }

    return {
      order,
      findings,
      directions: orderDirections,
      broadScenarios: orderBroadScenarios(findings),
      issuesExamined,
      gist: orderGist(order, findings),
      relationshipNotes,
    };
  });

  return { matter, stages, singleOrder: stages.length === 1 };
}
