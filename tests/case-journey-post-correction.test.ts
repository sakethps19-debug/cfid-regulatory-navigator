// Case Journey regression after the order-stage metadata correction pass
// (migration 0024_order_type_governing_classification_corrections.sql).
// Extends tests/case-journey.test.ts's fixture-based approach (Seacoast/
// Rajesh Exports/Max Financial there are untouched by migration 0024 and
// remain valid as-is) with the four specific regression points named for
// this pass: Par Drugs (Interim -> Confirmatory, same matter_id, a REAL
// order_relationships row), Tarapur (now Final, not Other), Future Retail
// (already-correct Final, untouched, control), and Suzlon 29-05-2026 (now
// "Other" with its exact special statutory title, never "Adjudication").
import { describe, expect, it } from "vitest";
import { buildCaseJourney } from "@/lib/caseJourney";
import type { Matter, Order, OrderRelationship } from "@/types/domain";

function makeMatter(overrides: Partial<Matter> & { id: string }): Matter {
  return { normalizedMatterName: "Mock Matter", description: null, ...overrides };
}

function makeOrder(overrides: Partial<Order> & { id: string }): Order {
  return {
    caseName: "Mock Case Limited",
    orderStage: "Final order",
    orderDate: null,
    orderNumber: null,
    authority: null,
    noticeesCount: 0,
    officialUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
    cfidVerified: true,
    cfidVerificationBasis: "cfid_tag_in_order_number",
    proceduralStatus: "",
    processingStage: "citations_checked",
    retrievalStatus: "",
    retrievalFailureReason: null,
    scopeNote: null,
    matterId: null,
    officialOrderTitle: null,
    normalizedMatterName: null,
    ...overrides,
  };
}

function makeRelationship(overrides: Partial<OrderRelationship> & { id: string; fromOrderId: string; toOrderId: string }): OrderRelationship {
  return {
    fromCaseName: "Mock Case Limited",
    toCaseName: "Mock Case Limited",
    relationshipType: "interim_to_final",
    note: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// Par Drugs and Chemicals Limited -- post-correction: Interim (15-09-2025,
// id 39d66f9f-14b2-4441-9fa4-b76d9bcd75d9, now order_type interim_order)
// -> Confirmatory (25-03-2026, id ce0b50a9-8052-4247-ac11-2f7914dea82d,
// already confirmatory_order, untouched), both matter_id
// 0d84d491-0dff-4b34-8900-f8319f3edccf. A REAL interim_to_confirmatory
// order_relationships row (id 1ddc8b58-8786-4636-b00a-271846965c52) already
// connects them -- confirmed via read-only Supabase query during this pass.
// ---------------------------------------------------------------------
describe("Par Drugs and Chemicals Limited: Interim -> Confirmatory (post-correction)", () => {
  const PAR_DRUGS_MATTER = makeMatter({ id: "0d84d491-0dff-4b34-8900-f8319f3edccf", normalizedMatterName: "Par Drugs and Chemicals Limited" });
  const PAR_DRUGS_INTERIM = makeOrder({
    id: "39d66f9f-14b2-4441-9fa4-b76d9bcd75d9",
    caseName: "PAR DRUGS AND CHEMICALS LIMITED",
    orderStage: "Interim order",
    orderDate: "2025-09-15",
    orderNumber: "WTM/KV/CFID/CFID-SEC4/31660/2025-26",
    matterId: PAR_DRUGS_MATTER.id,
  });
  const PAR_DRUGS_CONFIRMATORY = makeOrder({
    id: "ce0b50a9-8052-4247-ac11-2f7914dea82d",
    caseName: "PAR DRUGS AND CHEMICALS LIMITED",
    orderStage: "Confirmatory order",
    orderDate: "2026-03-25",
    orderNumber: "WTM/KV/CFID/CFID-SEC4/32246/2025-26",
    matterId: PAR_DRUGS_MATTER.id,
  });
  const REAL_RELATIONSHIP = makeRelationship({
    id: "1ddc8b58-8786-4636-b00a-271846965c52",
    fromOrderId: PAR_DRUGS_INTERIM.id,
    toOrderId: PAR_DRUGS_CONFIRMATORY.id,
    relationshipType: "interim_to_confirmatory",
    note: "Sep 15, 2025 interim order confirmed (Mar 25, 2026); Noticee's request to defer the confirmatory order pending the independent valuation report rejected; independent valuation/investigation still ongoing.",
  });

  const journey = buildCaseJourney(PAR_DRUGS_MATTER, [PAR_DRUGS_CONFIRMATORY, PAR_DRUGS_INTERIM], [], [], [REAL_RELATIONSHIP]);

  it("shows both orders, Interim before Confirmatory, chronologically", () => {
    expect(journey.stages).toHaveLength(2);
    expect(journey.stages[0].order.id).toBe(PAR_DRUGS_INTERIM.id);
    expect(journey.stages[0].order.orderStage).toBe("Interim order");
    expect(journey.stages[1].order.id).toBe(PAR_DRUGS_CONFIRMATORY.id);
    expect(journey.stages[1].order.orderStage).toBe("Confirmatory order");
    expect(journey.singleOrder).toBe(false);
  });

  it("surfaces the REAL interim_to_confirmatory relationship, never an invented one, because both orders share the same matter_id AND a stored order_relationships row connects them", () => {
    expect(journey.stages[0].relationshipNotes).toEqual([
      { otherOrderId: PAR_DRUGS_CONFIRMATORY.id, otherOrderStage: "Confirmatory order", otherOrderDate: "2026-03-25", label: "Precedes" },
    ]);
    expect(journey.stages[1].relationshipNotes).toEqual([
      { otherOrderId: PAR_DRUGS_INTERIM.id, otherOrderStage: "Interim order", otherOrderDate: "2025-09-15", label: "Confirms" },
    ]);
  });

  it("would show no relationship note at all if the order_relationships row didn't exist (grouping by matter_id alone never invents a relationship)", () => {
    const journeyWithoutRelationship = buildCaseJourney(PAR_DRUGS_MATTER, [PAR_DRUGS_CONFIRMATORY, PAR_DRUGS_INTERIM], [], [], []);
    expect(journeyWithoutRelationship.stages[0].relationshipNotes).toEqual([]);
    expect(journeyWithoutRelationship.stages[1].relationshipNotes).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// Tarapur Transformers Limited -- post-correction: now final_order (was
// "other" before migration 0024), single order captured for this matter.
// ---------------------------------------------------------------------
describe("Tarapur Transformers Limited: displays Final, not Other (post-correction)", () => {
  const TARAPUR_MATTER = makeMatter({ id: "05c86b8b-6d0a-4079-853a-7aadab99d608", normalizedMatterName: "Tarapur Transformers Limited" });
  const TARAPUR_ORDER = makeOrder({
    id: "fdf46fec-831a-411e-ba10-0f382cd51e40",
    caseName: "Tarapur Transformers Limited",
    orderStage: "Final order",
    orderDate: "2026-08-31",
    orderNumber: "QJA/SS/CFID/CFID-SEC6/32688/2026-27",
    officialOrderTitle: "Order in the matter of Tarapur Transformers Limited",
    matterId: TARAPUR_MATTER.id,
  });

  const journey = buildCaseJourney(TARAPUR_MATTER, [TARAPUR_ORDER], [], [], []);

  it("shows exactly one stage, and it is Final order (not Other)", () => {
    expect(journey.stages).toHaveLength(1);
    expect(journey.stages[0].order.orderStage).toBe("Final order");
    expect(journey.stages[0].order.orderStage).not.toBe("Other");
    expect(journey.singleOrder).toBe(true);
  });

  it("carries the migration-populated official title", () => {
    expect(journey.stages[0].order.officialOrderTitle).toBe("Order in the matter of Tarapur Transformers Limited");
  });
});

// ---------------------------------------------------------------------
// Future Retail Limited -- control: already-correct Final order, entirely
// untouched by migration 0024. Confirms the correction pass didn't
// regress an already-correct row.
// ---------------------------------------------------------------------
describe("Future Retail Limited: remains Final (unchanged control)", () => {
  const FUTURE_RETAIL_MATTER = makeMatter({ id: "fa2885af-2636-4964-b8f1-ede113728d68", normalizedMatterName: "Future Retail Limited" });
  const FUTURE_RETAIL_ORDER = makeOrder({
    id: "225695fa-1b33-40a2-8248-bff2aee99154",
    caseName: "Future Retail limited investigation Report",
    orderStage: "Final order",
    orderDate: "2026-05-12",
    orderNumber: "QJA/SS/CFID/CFID-CORD/32404/2026-27",
    matterId: FUTURE_RETAIL_MATTER.id,
  });

  const journey = buildCaseJourney(FUTURE_RETAIL_MATTER, [FUTURE_RETAIL_ORDER], [], [], []);

  it("remains a single Final order stage", () => {
    expect(journey.stages).toHaveLength(1);
    expect(journey.stages[0].order.orderStage).toBe("Final order");
    expect(journey.singleOrder).toBe(true);
  });
});

// ---------------------------------------------------------------------
// Suzlon Energy Limited 29-05-2026 -- post-correction: now "Other" (was
// adjudication_order before migration 0024), with its exact special
// statutory title populated, never displayed as an Adjudication Order.
// ---------------------------------------------------------------------
describe("Suzlon Energy Limited 29-05-2026: displays Other with its exact special title, never Adjudication (post-correction)", () => {
  const SUZLON_MATTER = makeMatter({ id: "95f2b716-0aaf-46bc-acec-e130f9ccbb7d", normalizedMatterName: "Investigation in the matter of Suzlon Energy Limited" });
  const SUZLON_ORDER = makeOrder({
    id: "3824c4b9-ae67-4e1b-9d59-dcfbe02120d9",
    caseName: "Investigation in the matter of Suzlon Energy Limited",
    orderStage: "Other",
    orderDate: "2026-05-29",
    orderNumber: "WTM/SP/CFID/CFID_4/32427/2026-27",
    officialOrderTitle: "Order under Section 15I(3) of the SEBI Act and Section 23I(3) of the SCRA in the matter of Suzlon Energy Limited",
    matterId: SUZLON_MATTER.id,
  });

  const journey = buildCaseJourney(SUZLON_MATTER, [SUZLON_ORDER], [], [], []);

  it("displays broad family Other, never Adjudication order", () => {
    expect(journey.stages).toHaveLength(1);
    expect(journey.stages[0].order.orderStage).toBe("Other");
    expect(journey.stages[0].order.orderStage).not.toBe("Adjudication order");
  });

  it("carries its exact special statutory title, never a generic 'Adjudication Order' label", () => {
    expect(journey.stages[0].order.officialOrderTitle).toBe(
      "Order under Section 15I(3) of the SEBI Act and Section 23I(3) of the SCRA in the matter of Suzlon Energy Limited"
    );
  });

  it("is a single-order matter -- no separate genuine Adjudication Order for Suzlon exists in this fixture, matching the current corpus", () => {
    expect(journey.singleOrder).toBe(true);
  });
});
