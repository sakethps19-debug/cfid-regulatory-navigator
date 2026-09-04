// Generic "other orders in the same matter" logic for the Order Detail
// page. Works identically for any matter/order — nothing here is specific
// to any one case. A sibling order is any other order that either (a)
// shares this order's matter_id (a grouping only ever populated from
// order_relationships rows already known to be correct — see
// supabase/migrations/0006_matter_order_model.sql), or (b) is directly
// connected to this order by an order_relationships row, even before the
// formal matters grouping has caught up.
//
// The relationship label shown for a sibling comes only from a directly
// stored order_relationships row between that specific pair of orders —
// never inferred from order dates or order types. A sibling reached only
// through shared matter membership, with no direct relationship row
// recorded between the two specific orders, is labelled generically:
// "Order in the same matter."
import type { Order, OrderRelationship, OrderRelationshipType } from "@/types/domain";

export interface SiblingOrderRef {
  order: Order;
  relationshipLabel: string;
}

const GENERIC_SAME_MATTER_LABEL = "Order in the same matter";

/** For each relationship_type, the label to show describing the SIBLING
 * order's relationship to the CURRENT order, depending on which side of
 * the stored row the current order is on. Symmetric types (same matter,
 * same investigation, different noticee group) use the same label on both
 * sides; directional types (precedes/confirms/modifies/revokes/finalises/
 * adjudication_arising_from, plus the legacy interim/confirmatory/
 * revocation/corrigendum types) use the direction-correct label so an
 * earlier order is never described as "finalising" a later one or vice
 * versa. */
const RELATIONSHIP_LABELS: Record<OrderRelationshipType, { whenCurrentIsFrom: string; whenCurrentIsTo: string }> = {
  interim_to_final: { whenCurrentIsFrom: "Finalises", whenCurrentIsTo: "Precedes" },
  interim_to_confirmatory: { whenCurrentIsFrom: "Confirms", whenCurrentIsTo: "Precedes" },
  confirmatory_to_revocation: { whenCurrentIsFrom: "Revokes", whenCurrentIsTo: "Precedes" },
  corrigendum_to: { whenCurrentIsFrom: "Precedes", whenCurrentIsTo: "Modifies" },
  related_matter: { whenCurrentIsFrom: "Same matter", whenCurrentIsTo: "Same matter" },
  same_matter: { whenCurrentIsFrom: "Same matter", whenCurrentIsTo: "Same matter" },
  precedes: { whenCurrentIsFrom: "Follows", whenCurrentIsTo: "Precedes" },
  confirms: { whenCurrentIsFrom: "Precedes", whenCurrentIsTo: "Confirms" },
  modifies: { whenCurrentIsFrom: "Precedes", whenCurrentIsTo: "Modifies" },
  revokes: { whenCurrentIsFrom: "Precedes", whenCurrentIsTo: "Revokes" },
  finalises: { whenCurrentIsFrom: "Precedes", whenCurrentIsTo: "Finalises" },
  adjudication_arising_from: { whenCurrentIsFrom: "Precedes", whenCurrentIsTo: "Adjudication arising from" },
  same_investigation: { whenCurrentIsFrom: "Same investigation", whenCurrentIsTo: "Same investigation" },
  different_noticee_group: { whenCurrentIsFrom: "Different noticee group", whenCurrentIsTo: "Different noticee group" },
};

function labelForRelationship(r: OrderRelationship, currentOrderId: string): string | undefined {
  const table = RELATIONSHIP_LABELS[r.relationshipType];
  if (!table) return undefined;
  return r.fromOrderId === currentOrderId ? table.whenCurrentIsFrom : table.whenCurrentIsTo;
}

/** Every other order that belongs to the current order's matter, or is
 * directly linked to it by a recorded order_relationships row. Never
 * includes the current order itself. Purely a function of the data passed
 * in — no database access, no hardcoded order/matter/case identity, so it
 * works identically as more matters and relationships are added. */
export function siblingOrdersInMatter(
  currentOrder: Order,
  allOrders: Order[],
  relationships: OrderRelationship[]
): SiblingOrderRef[] {
  const ordersById = new Map(allOrders.map((o) => [o.id, o]));
  const siblingIds = new Set<string>();

  if (currentOrder.matterId) {
    for (const o of allOrders) {
      if (o.id !== currentOrder.id && o.matterId === currentOrder.matterId) {
        siblingIds.add(o.id);
      }
    }
  }

  const directRelationshipsBySiblingId = new Map<string, OrderRelationship[]>();
  for (const r of relationships) {
    let siblingId: string | null = null;
    if (r.fromOrderId === currentOrder.id) siblingId = r.toOrderId;
    else if (r.toOrderId === currentOrder.id) siblingId = r.fromOrderId;
    if (!siblingId || siblingId === currentOrder.id) continue;

    siblingIds.add(siblingId);
    const list = directRelationshipsBySiblingId.get(siblingId) ?? [];
    list.push(r);
    directRelationshipsBySiblingId.set(siblingId, list);
  }

  const siblings: SiblingOrderRef[] = [];
  for (const id of siblingIds) {
    const order = ordersById.get(id);
    if (!order) continue; // referenced order not in the provided set — skip rather than guess

    const directRels = directRelationshipsBySiblingId.get(id) ?? [];
    const labels = [
      ...new Set(
        directRels
          .map((r) => labelForRelationship(r, currentOrder.id))
          .filter((l): l is string => Boolean(l))
      ),
    ];

    siblings.push({
      order,
      relationshipLabel: labels.length > 0 ? labels.join(", ") : GENERIC_SAME_MATTER_LABEL,
    });
  }

  return siblings.sort((a, b) => {
    const dateCompare = (a.order.orderDate ?? "").localeCompare(b.order.orderDate ?? "");
    return dateCompare !== 0 ? dateCompare : a.order.caseName.localeCompare(b.order.caseName);
  });
}
