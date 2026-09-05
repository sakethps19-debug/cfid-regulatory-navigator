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

/** The SIBLING order's relationship to the CURRENT order (used for the
 * sibling-list badge, e.g. "Finalises" shown next to a final-order sibling
 * when viewing the interim order's page). */
function labelForRelationship(r: OrderRelationship, currentOrderId: string): string | undefined {
  const table = RELATIONSHIP_LABELS[r.relationshipType];
  if (!table) return undefined;
  return r.fromOrderId === currentOrderId ? table.whenCurrentIsFrom : table.whenCurrentIsTo;
}

/** The CURRENT order's OWN relationship to the other order — the inverse
 * framing of labelForRelationship, used for self-referential sentences like
 * "This final order resolves the interim order below." Reuses the exact
 * same direction table so the sibling-list badges and the narrative
 * sentences below can never drift apart or disagree on direction. */
function currentOrderRelationLabel(r: OrderRelationship, currentOrderId: string): string | undefined {
  const table = RELATIONSHIP_LABELS[r.relationshipType];
  if (!table) return undefined;
  return r.fromOrderId === currentOrderId ? table.whenCurrentIsTo : table.whenCurrentIsFrom;
}

/** Sentence-phrasing for each of the short badge labels above. "supersedes"
 * marks the labels that imply the active side's outcome legally controls
 * the other side (finalises/confirms/revokes/modifies-style relationships)
 * — only then does the generated sentence add a "controls over the earlier
 * findings" clause; purely-linking relationships (same matter/investigation,
 * different noticee group, precedes/follows with no stated supersession)
 * never get that clause. */
const LABEL_TO_SENTENCE_VERB: Record<string, { verb: string; supersedes: boolean }> = {
  Finalises: { verb: "resolves", supersedes: true },
  Confirms: { verb: "confirms", supersedes: true },
  Revokes: { verb: "revokes", supersedes: true },
  Modifies: { verb: "modifies", supersedes: true },
  Precedes: { verb: "precedes", supersedes: false },
  Follows: { verb: "follows", supersedes: false },
  "Same matter": { verb: "is part of the same matter as", supersedes: false },
  "Same investigation": { verb: "shares the same investigation as", supersedes: false },
  "Different noticee group": { verb: "concerns a different noticee group within", supersedes: false },
  "Adjudication arising from": { verb: "is an adjudication arising from", supersedes: false },
};

/** Findings are characterised generically by the ORDER TYPE that produced
 * them — an interim order's findings are "prima facie" by definition, a
 * confirmatory order's are "confirmatory", and so on — never by case name
 * or facts, so this works identically for every order. */
function findingsAdjective(stage: Order["orderStage"]): string {
  switch (stage) {
    case "Interim order":
    case "Interim order cum show cause notice":
      return "prima facie";
    case "Confirmatory order":
      return "confirmatory";
    case "Adjudication order":
      return "adjudication";
    case "Settlement order":
      return "settlement";
    default:
      return "earlier";
  }
}

/** A grammatically correct, direction-aware sentence describing an
 * order_relationships row from the CURRENT order's own point of view —
 * e.g. "This final order resolves the interim order below; its outcome
 * takes precedence over the earlier prima facie findings." Derived entirely from
 * the stored relationship type/direction and each order's own orderStage —
 * never from case name, order id, or any hardcoded example, so the same
 * function produces the correct sentence for any pair of linked orders. */
export function orderRelationshipSentence(current: Order, other: Order, relationship: OrderRelationship): string {
  const currentStage = current.orderStage.toLowerCase();
  const otherStage = other.orderStage.toLowerCase();

  const currentLabel = currentOrderRelationLabel(relationship, current.id);
  const currentPhrase = currentLabel ? LABEL_TO_SENTENCE_VERB[currentLabel] : undefined;

  if (currentPhrase?.supersedes) {
    return `This ${currentStage} ${currentPhrase.verb} the ${otherStage} below; its outcome takes precedence over the earlier ${findingsAdjective(other.orderStage)} findings.`;
  }

  const otherLabel = labelForRelationship(relationship, current.id);
  const otherPhrase = otherLabel ? LABEL_TO_SENTENCE_VERB[otherLabel] : undefined;
  const currentVerb = currentPhrase?.verb ?? "is linked to";

  if (otherPhrase?.supersedes) {
    return `This ${currentStage} ${currentVerb} the ${otherStage} below; where they differ, the ${otherStage}'s outcome controls, and this order's ${findingsAdjective(current.orderStage)} findings should not be treated as final.`;
  }

  return `This ${currentStage} ${currentVerb} the ${otherStage} below.`;
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
