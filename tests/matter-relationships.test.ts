// Tests for the generic "other orders in the same matter" logic. All
// fixtures here are synthetic (invented order/matter ids, generic case
// names) — deliberately not modelled on Seacoast or any real order — to
// prove the feature is data-driven and works for any matter.
import { describe, expect, it } from "vitest";
import { orderRelationshipSentence, siblingOrdersInMatter } from "@/lib/matterRelationships";
import type { Order, OrderRelationship, OrderRelationshipType } from "@/types/domain";

function makeOrder(overrides: Partial<Order> & { id: string }): Order {
  return {
    caseName: "Test Company Limited",
    orderStage: "Interim order",
    orderDate: "2025-01-01",
    orderNumber: "WTM/CFID/TEST/001/2025",
    authority: "SEBI",
    noticeesCount: 1,
    officialUrl: "https://www.sebi.gov.in/example.html",
    cfidVerified: true,
    cfidVerificationBasis: "cfid_tag_in_order_number",
    proceduralStatus: "Prima facie; investigation continuing",
    processingStage: "legally_reviewed",
    retrievalStatus: "success",
    retrievalFailureReason: null,
    scopeNote: null,
    matterId: null,
    officialOrderTitle: null,
    normalizedMatterName: "Test Company Limited",
    ...overrides,
  };
}

function makeRelationship(
  fromOrderId: string,
  toOrderId: string,
  relationshipType: OrderRelationshipType,
  overrides: Partial<OrderRelationship> = {}
): OrderRelationship {
  return {
    id: `${fromOrderId}->${toOrderId}:${relationshipType}`,
    fromOrderId,
    fromCaseName: "Test Company Limited",
    toOrderId,
    toCaseName: "Test Company Limited",
    relationshipType,
    note: null,
    ...overrides,
  };
}

describe("siblingOrdersInMatter", () => {
  it("returns sibling orders when a valid matter relationship exists", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: "MATTER-1" });
    const sibling = makeOrder({ id: "ORDER-B", matterId: "MATTER-1" });
    const result = siblingOrdersInMatter(current, [current, sibling], []);
    expect(result).toHaveLength(1);
    expect(result[0].order.id).toBe("ORDER-B");
  });

  it("excludes the current order from its own sibling list", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: "MATTER-1" });
    const result = siblingOrdersInMatter(current, [current], []);
    expect(result).toHaveLength(0);
  });

  it("does not return unrelated orders", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: "MATTER-1" });
    const unrelated = makeOrder({ id: "ORDER-Z", matterId: "MATTER-9" });
    const result = siblingOrdersInMatter(current, [current, unrelated], []);
    expect(result).toHaveLength(0);
  });

  it("returns an empty array (no section to render) for an order with no siblings", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: null });
    const other = makeOrder({ id: "ORDER-B", matterId: null });
    const result = siblingOrdersInMatter(current, [current, other], []);
    expect(result).toEqual([]);
  });

  it("supports multiple sibling orders in the same matter", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: "MATTER-1" });
    const siblingB = makeOrder({ id: "ORDER-B", matterId: "MATTER-1" });
    const siblingC = makeOrder({ id: "ORDER-C", matterId: "MATTER-1" });
    const siblingD = makeOrder({ id: "ORDER-D", matterId: "MATTER-1" });
    const result = siblingOrdersInMatter(current, [current, siblingB, siblingC, siblingD], []);
    expect(result.map((s) => s.order.id).sort()).toEqual(["ORDER-B", "ORDER-C", "ORDER-D"]);
  });

  it("labels a sibling with only common-matter membership generically", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: "MATTER-1" });
    const sibling = makeOrder({ id: "ORDER-B", matterId: "MATTER-1" });
    const result = siblingOrdersInMatter(current, [current, sibling], []);
    expect(result[0].relationshipLabel).toBe("Order in the same matter");
  });

  it("derives the relationship label from a stored order_relationships row, direction-aware", () => {
    const interim = makeOrder({ id: "ORDER-INTERIM", matterId: "MATTER-1", orderStage: "Interim order" });
    const final = makeOrder({ id: "ORDER-FINAL", matterId: "MATTER-1", orderStage: "Final order" });
    const relationships = [makeRelationship("ORDER-INTERIM", "ORDER-FINAL", "interim_to_final")];

    const fromInterim = siblingOrdersInMatter(interim, [interim, final], relationships);
    expect(fromInterim[0].relationshipLabel).toBe("Finalises");

    const fromFinal = siblingOrdersInMatter(final, [interim, final], relationships);
    expect(fromFinal[0].relationshipLabel).toBe("Precedes");
  });

  it("uses a direct relationship row's label even when it differs from the generic same-matter label", () => {
    const original = makeOrder({ id: "ORDER-ORIG", matterId: "MATTER-1" });
    const revocation = makeOrder({ id: "ORDER-REVOKE", matterId: "MATTER-1" });
    // from = the confirmatory order (ORDER-ORIG), to = the revocation order that revokes it.
    const relationships = [makeRelationship("ORDER-ORIG", "ORDER-REVOKE", "confirmatory_to_revocation")];

    const result = siblingOrdersInMatter(original, [original, revocation], relationships);
    expect(result[0].relationshipLabel).toBe("Revokes");
  });

  it("connects orders via a direct relationship row even without shared matter_id", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: null });
    const sibling = makeOrder({ id: "ORDER-B", matterId: null });
    const relationships = [makeRelationship("ORDER-A", "ORDER-B", "same_investigation")];

    const result = siblingOrdersInMatter(current, [current, sibling], relationships);
    expect(result).toHaveLength(1);
    expect(result[0].order.id).toBe("ORDER-B");
    expect(result[0].relationshipLabel).toBe("Same investigation");
  });

  it("never fabricates a relationship type — an unrecorded pair only gets the generic label, never a guessed one", () => {
    const current = makeOrder({ id: "ORDER-A", matterId: "MATTER-1", orderDate: "2025-01-01" });
    const sibling = makeOrder({ id: "ORDER-B", matterId: "MATTER-1", orderDate: "2026-06-01" });
    // No order_relationships row exists between A and B, even though B's date is later —
    // the label must not be inferred as "Finalises"/"Precedes"/etc from the dates.
    const result = siblingOrdersInMatter(current, [current, sibling], []);
    expect(result[0].relationshipLabel).toBe("Order in the same matter");
  });

  it("keeps interim and final procedural statuses distinct on sibling orders", () => {
    const interim = makeOrder({
      id: "ORDER-INTERIM",
      matterId: "MATTER-1",
      orderStage: "Interim order",
      proceduralStatus: "Prima facie; investigation continuing",
    });
    const final = makeOrder({
      id: "ORDER-FINAL",
      matterId: "MATTER-1",
      orderStage: "Final order",
      proceduralStatus: "Final findings, penalties, disgorgement and directions",
    });
    const relationships = [makeRelationship("ORDER-INTERIM", "ORDER-FINAL", "interim_to_final")];

    const result = siblingOrdersInMatter(interim, [interim, final], relationships);
    expect(result[0].order.orderStage).toBe("Final order");
    expect(result[0].order.proceduralStatus).toBe("Final findings, penalties, disgorgement and directions");
    expect(result[0].order.proceduralStatus).not.toBe(interim.proceduralStatus);
  });

  it("works correctly with entirely generic, non-case-specific data (no Seacoast-specific logic)", () => {
    const alpha = makeOrder({ id: "ALPHA-1", caseName: "Alpha Industries Limited", matterId: "M-ALPHA" });
    const beta = makeOrder({ id: "ALPHA-2", caseName: "Alpha Industries Limited", matterId: "M-ALPHA" });
    const gamma = makeOrder({ id: "GAMMA-1", caseName: "Gamma Traders Limited", matterId: "M-GAMMA" });
    const relationships = [makeRelationship("ALPHA-1", "ALPHA-2", "modifies")];

    const result = siblingOrdersInMatter(alpha, [alpha, beta, gamma], relationships);
    expect(result.map((s) => s.order.id)).toEqual(["ALPHA-2"]);
    expect(result[0].relationshipLabel).toBe("Precedes");
  });
});

describe("orderRelationshipSentence", () => {
  it("produces the exact required direction-aware sentence: final resolves interim, generic fixtures", () => {
    const interim = makeOrder({ id: "ORDER-INTERIM", orderStage: "Interim order cum show cause notice" });
    const final = makeOrder({ id: "ORDER-FINAL", orderStage: "Final order" });
    const relationship = makeRelationship("ORDER-INTERIM", "ORDER-FINAL", "interim_to_final");

    const sentence = orderRelationshipSentence(final, interim, relationship);
    expect(sentence).toBe(
      "This final order resolves the interim order cum show cause notice below; its outcome takes precedence over the earlier prima facie findings."
    );
  });

  it("never produces the old garbled text ('...resolves the final order the order below')", () => {
    const interim = makeOrder({ id: "ORDER-INTERIM", orderStage: "Interim order cum show cause notice" });
    const final = makeOrder({ id: "ORDER-FINAL", orderStage: "Final order" });
    const relationship = makeRelationship("ORDER-INTERIM", "ORDER-FINAL", "interim_to_final");

    const sentence = orderRelationshipSentence(final, interim, relationship);
    expect(sentence).not.toMatch(/the order below the order below/i);
    expect(sentence).not.toMatch(/resolves the final order the order below/i);
  });

  it("is direction-aware: the reverse (interim describing final) reads correctly and cautions against treating findings as final", () => {
    const interim = makeOrder({ id: "ORDER-INTERIM", orderStage: "Interim order cum show cause notice" });
    const final = makeOrder({ id: "ORDER-FINAL", orderStage: "Final order" });
    const relationship = makeRelationship("ORDER-INTERIM", "ORDER-FINAL", "interim_to_final");

    const sentence = orderRelationshipSentence(interim, final, relationship);
    expect(sentence).toContain("This interim order cum show cause notice precedes the final order below");
    expect(sentence).toContain("should not be treated as final");
    expect(sentence).not.toContain("takes precedence over the earlier"); // interim does not control the final
  });

  it("is grammatically correct and generic for a confirmatory/revocation pair (not hardcoded to interim/final)", () => {
    const confirmatory = makeOrder({ id: "ORDER-CONF", orderStage: "Confirmatory order" });
    const revocation = makeOrder({ id: "ORDER-REV", orderStage: "Revocation order" });
    const relationship = makeRelationship("ORDER-CONF", "ORDER-REV", "confirmatory_to_revocation");

    const sentence = orderRelationshipSentence(revocation, confirmatory, relationship);
    expect(sentence).toBe(
      "This revocation order revokes the confirmatory order below; its outcome takes precedence over the earlier confirmatory findings."
    );
  });

  it("does not add a false 'controls' clause for a purely symmetric relationship (same matter)", () => {
    const a = makeOrder({ id: "ORDER-A", orderStage: "Adjudication order" });
    const b = makeOrder({ id: "ORDER-B", orderStage: "Adjudication order" });
    const relationship = makeRelationship("ORDER-A", "ORDER-B", "same_matter");

    const sentence = orderRelationshipSentence(a, b, relationship);
    expect(sentence).not.toContain("controls");
    expect(sentence.toLowerCase()).toContain("same matter");
  });

  it("derives the sentence entirely from order type and relationship direction, not case identity (generic, non-Seacoast fixtures)", () => {
    const interim = makeOrder({ id: "GENERIC-1", caseName: "Generic Traders Limited", orderStage: "Interim order" });
    const final = makeOrder({ id: "GENERIC-2", caseName: "Generic Traders Limited", orderStage: "Final order" });
    const relationship = makeRelationship("GENERIC-1", "GENERIC-2", "interim_to_final");

    const sentence = orderRelationshipSentence(final, interim, relationship);
    expect(sentence).toBe(
      "This final order resolves the interim order below; its outcome takes precedence over the earlier prima facie findings."
    );
    expect(sentence).not.toContain("Generic Traders Limited");
  });
});
