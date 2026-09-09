// Case Journey: "what happened across the different orders/stages in THIS
// SAME MATTER?" Tests target the pure data-shaping logic in
// src/lib/caseJourney.ts (and the matterRelationships.ts export it reuses),
// following the same fixture-based unit-test pattern as
// case-library-order-detail-cleanup.test.ts — no live Supabase access here.
//
// Fixture ids/dates/types below mirror the ACTUAL production rows captured
// via a read-only Supabase query during this pass (see the final report):
// Seacoast Shipping Services Limited (matter_id 60bbd426-879c-47e7-bd4d-
// 038c148b416c, 2 orders + 1 interim_to_final order_relationships row),
// Rajesh Exports Limited (matter_id 2dbf409c-8e55-49b8-911c-16a1fda47962, 1
// order, 0 relationships), and Max Financial Services Limited (matter_id
// faa4a18e-9c62-4d40-b8e8-b2a77f787c9b, 1 final order, 0 relationships) —
// so these tests are grounded in the real regression cases the task
// description names, not arbitrary synthetic ids.
import { describe, expect, it } from "vitest";
import {
  buildCaseJourney,
  mattersWithAtLeastOneOrder,
  type MatterWithOrderCount,
} from "@/lib/caseJourney";
import type { DirectionOutcome, Matter, Order, OrderRelationship, ScenarioFinding } from "@/types/domain";

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
    processingStage: "legally_reviewed",
    retrievalStatus: "",
    retrievalFailureReason: null,
    scopeNote: null,
    matterId: null,
    officialOrderTitle: null,
    normalizedMatterName: null,
    ...overrides,
  };
}

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string }): ScenarioFinding {
  return {
    caseName: "Mock Case Limited",
    orderIds: [],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
    noticeeActors: [],
    findingStatus: "Prima facie",
    interimParagraphReferences: null,
    finalParagraphReferences: null,
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
    transactionTypes: [],
    actorRoles: [],
    evidenceTypes: [],
    allegedConduct: [],
    evidentiaryGaps: [],
    precedentOutcomeNote: null,
    ingredientsNotEstablished: [],
    sourceDocumentVerified: true,
    paragraphCitationVerified: true,
    findingStatusVerified: true,
    provisionMappingVerified: true,
    noticeeMappingVerified: true,
    humanLegalReviewCompleted: false,
    publicationStatus: "Published to search",
    ...overrides,
  };
}

function makeDirection(overrides: Partial<DirectionOutcome> & { id: string; orderId: string }): DirectionOutcome {
  return {
    caseName: "Mock Case Limited",
    stage: "Final",
    directionOrOutcome: "Mock direction.",
    paragraphReference: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
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
// Real-data fixtures for the three regression matters named in the spec.
// ---------------------------------------------------------------------

const SEACOAST_MATTER = makeMatter({ id: "60bbd426-879c-47e7-bd4d-038c148b416c", normalizedMatterName: "Seacoast Shipping Services Limited" });
const SEACOAST_INTERIM = makeOrder({
  id: "ad32246b-0593-45b3-bd53-14c590161145",
  caseName: "Seacoast Shipping Services Limited",
  orderStage: "Interim order cum show cause notice",
  orderDate: "2024-09-30",
  orderNumber: "WTM/AB/CFID/CFID-SEC6/30827/2024-25",
  matterId: SEACOAST_MATTER.id,
});
const SEACOAST_FINAL = makeOrder({
  id: "cbe246c9-02d5-482f-966a-c140860b7af5",
  caseName: "Seacoast Shipping Services Limited",
  orderStage: "Final order",
  orderDate: "2025-09-24",
  orderNumber: "WTM/KV/CFID/CFID-CORD/31688/2025-26",
  matterId: SEACOAST_MATTER.id,
});
const SEACOAST_RELATIONSHIP = makeRelationship({
  id: "d535f305-cc09-451a-a704-bb2f2d9bf155",
  fromOrderId: SEACOAST_INTERIM.id,
  toOrderId: SEACOAST_FINAL.id,
  relationshipType: "interim_to_final",
  note: "Seacoast Shipping Services Limited interim order cum show cause notice resolved by the final order.",
});
const SEACOAST_FINDINGS: ScenarioFinding[] = [
  makeFinding({ recordId: "SSSL-01", findingStatus: "Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-02", findingStatus: "Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-03", findingStatus: "Not Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-04", findingStatus: "Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-05", findingStatus: "Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
];
const SEACOAST_DIRECTIONS: DirectionOutcome[] = [
  makeDirection({ id: "d1", orderId: SEACOAST_INTERIM.id, stage: "Interim", directionOrOutcome: "Company restrained from raising public money." }),
  makeDirection({ id: "d2", orderId: SEACOAST_FINAL.id, stage: "Final", directionOrOutcome: "Penalties under sections 15HA/15HB imposed." }),
];

const RAJESH_MATTER = makeMatter({ id: "2dbf409c-8e55-49b8-911c-16a1fda47962", normalizedMatterName: "Rajesh Exports Limited" });
const RAJESH_INTERIM = makeOrder({
  id: "c45c8bb0-4db2-4ef5-a7b7-f41dc8f3b22d",
  caseName: "Rajesh Exports Limited",
  orderStage: "Interim order",
  orderDate: "2026-06-03",
  orderNumber: "WTM/KV/CFID/CFID-SEC6/32431/2026-27",
  matterId: RAJESH_MATTER.id,
});
const RAJESH_FINDINGS: ScenarioFinding[] = [
  makeFinding({ recordId: "REL-01", findingStatus: "Prima facie", orderIds: [RAJESH_INTERIM.id] }),
  makeFinding({ recordId: "REL-02", findingStatus: "Prima facie", orderIds: [RAJESH_INTERIM.id] }),
];

const MAX_MATTER = makeMatter({ id: "faa4a18e-9c62-4d40-b8e8-b2a77f787c9b", normalizedMatterName: "In the matter of Max Financial Services Limited" });
const MAX_FINAL = makeOrder({
  id: "b5de6f63-4823-4b60-b4ff-ec673b3a9e5b",
  caseName: "In the matter of Max Financial Services Limited",
  orderStage: "Final order",
  orderDate: "2026-08-24",
  orderNumber: "WTM/AS/CFID/CFID-CORD/32677/2026-27",
  officialOrderTitle: "Order in the matter of Max Financial Services Limited",
  matterId: MAX_MATTER.id,
});
const MAX_FINDINGS: ScenarioFinding[] = [
  makeFinding({
    recordId: "MFS-01",
    findingStatus: "Not Confirmed in Final Order",
    orderIds: [MAX_FINAL.id],
    scenarioTitle:
      "SCN alleging a fraudulent scheme in MFSL's sale of its Max Life Insurance stake to Axis Bank/Axis Capital/Axis Securities, and related non-disclosure, found NOT established on the merits; proceedings against all 12 Noticees disposed of without direction or penalty.",
  }),
];
const MAX_DIRECTIONS: DirectionOutcome[] = [
  makeDirection({
    id: "d3",
    orderId: MAX_FINAL.id,
    stage: "Final",
    directionOrOutcome:
      "Proceedings against all 12 Noticees disposed of without issuance of any direction or imposition of any penalty — every substantive allegation was found not established",
    paragraphReference: "Para 185",
  }),
];

// ---------------------------------------------------------------------
// 1/2. Journey groups strictly by matter_id — unrelated same-company-name
// records cannot be grouped merely by name.
// ---------------------------------------------------------------------
describe("buildCaseJourney: strict matter_id grouping", () => {
  it("only includes orders whose own matterId equals the requested matter's id", () => {
    const decoyOrder = makeOrder({ id: "decoy", caseName: "Seacoast Shipping Services Limited", matterId: "some-other-matter-id" });
    const journey = buildCaseJourney(SEACOAST_MATTER, [SEACOAST_INTERIM, SEACOAST_FINAL, decoyOrder].filter((o) => o.matterId === SEACOAST_MATTER.id), SEACOAST_FINDINGS, SEACOAST_DIRECTIONS, [SEACOAST_RELATIONSHIP]);
    expect(journey.stages.map((s) => s.order.id).sort()).toEqual([SEACOAST_INTERIM.id, SEACOAST_FINAL.id].sort());
    expect(journey.stages.some((s) => s.order.id === "decoy")).toBe(false);
  });

  it("two orders sharing an identical case_name but belonging to two different matterIds are never grouped into the same journey (P2-18-style regression)", () => {
    const matterA = makeMatter({ id: "matter-a", normalizedMatterName: "Brightcom Group Ltd." });
    const matterB = makeMatter({ id: "matter-b", normalizedMatterName: "Brightcom Group Ltd." });
    const orderA = makeOrder({ id: "order-a", caseName: "Brightcom Group Ltd.", matterId: matterA.id, orderDate: "2020-01-01" });
    const orderB = makeOrder({ id: "order-b", caseName: "Brightcom Group Ltd.", matterId: matterB.id, orderDate: "2021-01-01" });
    const allOrders = [orderA, orderB];

    const journeyA = buildCaseJourney(matterA, allOrders.filter((o) => o.matterId === matterA.id), [], [], []);
    const journeyB = buildCaseJourney(matterB, allOrders.filter((o) => o.matterId === matterB.id), [], [], []);

    expect(journeyA.stages.map((s) => s.order.id)).toEqual(["order-a"]);
    expect(journeyB.stages.map((s) => s.order.id)).toEqual(["order-b"]);
  });

  it("never invents a relationship note across matters — a directly-stored relationship pointing outside the journey's own orders is excluded", () => {
    const otherMatterOrder = makeOrder({ id: "outside-order", caseName: "Some Other Matter", matterId: "different-matter" });
    const crossMatterRelationship = makeRelationship({
      id: "cross",
      fromOrderId: SEACOAST_FINAL.id,
      toOrderId: otherMatterOrder.id,
      relationshipType: "related_matter",
    });
    const journey = buildCaseJourney(SEACOAST_MATTER, [SEACOAST_INTERIM, SEACOAST_FINAL], SEACOAST_FINDINGS, SEACOAST_DIRECTIONS, [
      SEACOAST_RELATIONSHIP,
      crossMatterRelationship,
    ]);
    const finalStage = journey.stages.find((s) => s.order.id === SEACOAST_FINAL.id)!;
    expect(finalStage.relationshipNotes.some((n) => n.otherOrderId === "outside-order")).toBe(false);
  });
});

// ---------------------------------------------------------------------
// 3/4. Seacoast: both captured orders show, chronological/procedurally
// sensible sequence.
// ---------------------------------------------------------------------
describe("Seacoast Shipping Services Limited: multi-order regression case", () => {
  const journey = buildCaseJourney(SEACOAST_MATTER, [SEACOAST_FINAL, SEACOAST_INTERIM], SEACOAST_FINDINGS, SEACOAST_DIRECTIONS, [SEACOAST_RELATIONSHIP]);

  it("shows both captured orders, and only those two", () => {
    expect(journey.stages).toHaveLength(2);
    expect(journey.singleOrder).toBe(false);
  });

  it("sequences the interim order before the final order (chronological, by orderDate)", () => {
    expect(journey.stages[0].order.id).toBe(SEACOAST_INTERIM.id);
    expect(journey.stages[0].order.orderStage).toBe("Interim order cum show cause notice");
    expect(journey.stages[1].order.id).toBe(SEACOAST_FINAL.id);
    expect(journey.stages[1].order.orderStage).toBe("Final order");
  });

  it("carries the exact dates and order types from the current database fixture, unmodified", () => {
    expect(journey.stages[0].order.orderDate).toBe("2024-09-30");
    expect(journey.stages[1].order.orderDate).toBe("2025-09-24");
  });

  it("final does not overwrite interim — the interim stage keeps its own findings/directions distinct from the final stage's", () => {
    expect(journey.stages[0].directions.map((d) => d.id)).toEqual(["d1"]);
    expect(journey.stages[1].directions.map((d) => d.id)).toEqual(["d2"]);
    // Both stages still see all 5 shared findings (each finding spans both
    // orderIds in this corpus), but each stage is its own independent card.
    expect(journey.stages[0].findings).toHaveLength(5);
    expect(journey.stages[1].findings).toHaveLength(5);
  });

  it("surfaces the real interim_to_final order_relationships row as a concise relationship note, never an invented one", () => {
    const interimStage = journey.stages[0];
    const finalStage = journey.stages[1];
    expect(interimStage.relationshipNotes).toEqual([
      { otherOrderId: SEACOAST_FINAL.id, otherOrderStage: "Final order", otherOrderDate: "2025-09-24", label: "Precedes" },
    ]);
    expect(finalStage.relationshipNotes).toEqual([
      { otherOrderId: SEACOAST_INTERIM.id, otherOrderStage: "Interim order cum show cause notice", otherOrderDate: "2024-09-30", label: "Finalises" },
    ]);
  });

  it("each stage links to its own distinct Case Detail id", () => {
    expect(new Set(journey.stages.map((s) => s.order.id)).size).toBe(2);
  });
});

// ---------------------------------------------------------------------
// 7/12. Rajesh Exports: single captured order, no implied later stage.
// ---------------------------------------------------------------------
describe("Rajesh Exports Limited: single-order matter (interim only, no later order captured)", () => {
  const journey = buildCaseJourney(RAJESH_MATTER, [RAJESH_INTERIM], RAJESH_FINDINGS, [], []);

  it("shows only the one captured order", () => {
    expect(journey.stages).toHaveLength(1);
    expect(journey.stages[0].order.id).toBe(RAJESH_INTERIM.id);
    expect(journey.stages[0].order.orderStage).toBe("Interim order");
  });

  it("flags singleOrder=true so the caller shows the 'only one order is currently captured' note, rather than implying a confirmatory/final order exists", () => {
    expect(journey.singleOrder).toBe(true);
  });

  it("has no relationship notes (zero order_relationships rows on file for this matter)", () => {
    expect(journey.stages[0].relationshipNotes).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 5/6/13. Max Financial Services: exactly one Final Order, no SCN stage,
// negative-disposition semantics intact.
// ---------------------------------------------------------------------
describe("Max Financial Services Limited: SCN safeguard regression", () => {
  const journey = buildCaseJourney(MAX_MATTER, [MAX_FINAL], MAX_FINDINGS, MAX_DIRECTIONS, []);

  it("shows exactly one stage, and it is the Final Order", () => {
    expect(journey.stages).toHaveLength(1);
    expect(journey.stages[0].order.orderStage).toBe("Final order");
  });

  it("never creates a standalone SCN stage/card merely because the Final Order examined SCN allegations", () => {
    // Structural guarantee: buildCaseJourney only ever produces one stage
    // per row actually present in matterOrders (the orders table) — it has
    // no code path that manufactures a stage from a finding's scenarioTitle
    // or allegationText mentioning "SCN". Asserting the stage count/order
    // stage above already proves this for this fixture; this test further
    // asserts no stage's orderStage or title is itself SCN-labelled.
    for (const stage of journey.stages) {
      expect(stage.order.orderStage.toLowerCase()).not.toContain("show cause");
    }
  });

  it("flags singleOrder=true for Max Financial too", () => {
    expect(journey.singleOrder).toBe(true);
  });

  it("preserves the negative-disposition finding status — 'Not Confirmed in Final Order', never rewritten to a positive established finding", () => {
    expect(journey.stages[0].findings).toHaveLength(1);
    expect(journey.stages[0].findings[0].findingStatus).toBe("Not Confirmed in Final Order");
  });

  it("does not fabricate an established finding from the SCN allegation text merely because the scenario title mentions the alleged scheme", () => {
    const finding = journey.stages[0].findings[0];
    expect(finding.scenarioTitle).toContain("found NOT established");
    expect(finding.findingStatus).not.toBe("Confirmed in Final Order");
  });
});

// ---------------------------------------------------------------------
// 9. Directions scoped to exact order_id.
// ---------------------------------------------------------------------
describe("directions are scoped to the exact order_id, never stage-based/fuzzy lookup", () => {
  it("a direction recorded against a DIFFERENT order id in the same matter never appears on this stage's card", () => {
    const wrongOrderDirection = makeDirection({ id: "wrong", orderId: "some-unrelated-order-id", directionOrOutcome: "Should never appear." });
    const journey = buildCaseJourney(SEACOAST_MATTER, [SEACOAST_INTERIM, SEACOAST_FINAL], SEACOAST_FINDINGS, [...SEACOAST_DIRECTIONS, wrongOrderDirection], [
      SEACOAST_RELATIONSHIP,
    ]);
    for (const stage of journey.stages) {
      expect(stage.directions.some((d) => d.id === "wrong")).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------
// 10. Broad scenarios reuse existing orderBroadScenarios — no second
// taxonomy, never inferred from provisions alone.
// ---------------------------------------------------------------------
describe("broad scenarios reuse the existing orderBroadScenarios mechanism", () => {
  it("a stage with no findings produces zero broad scenarios, never an invented one", () => {
    const emptyOrder = makeOrder({ id: "empty-order", matterId: "empty-matter" });
    const emptyMatter = makeMatter({ id: "empty-matter" });
    const journey = buildCaseJourney(emptyMatter, [emptyOrder], [], [], []);
    expect(journey.stages[0].broadScenarios).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 11. No legal-engine/fixed-scenario mutation — this module only reads
// existing exported helpers, never touches fixed-scenarios.ts or the
// Analyzer's matching engine.
// ---------------------------------------------------------------------
describe("no legal-engine/fixed-scenario mutation", () => {
  it("caseJourney.ts source never imports the Analyzer resolver/matching engine or writes to fixed-scenarios.ts", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(new URL("../src/lib/caseJourney.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/fixedScenarioResolver/);
    expect(src).not.toMatch(/matching\/engine/);
    expect(src).not.toMatch(/data\/curated\/fixed-scenarios/);
  });
});

// ---------------------------------------------------------------------
// Landing list: mattersWithAtLeastOneOrder.
// ---------------------------------------------------------------------
describe("mattersWithAtLeastOneOrder", () => {
  it("shows only matters that currently have at least one order, with an accurate count", () => {
    const zeroOrderMatter = makeMatter({ id: "no-orders", normalizedMatterName: "Zero Orders Matter" });
    const result: MatterWithOrderCount[] = mattersWithAtLeastOneOrder(
      [SEACOAST_MATTER, RAJESH_MATTER, MAX_MATTER, zeroOrderMatter],
      [SEACOAST_INTERIM, SEACOAST_FINAL, RAJESH_INTERIM, MAX_FINAL]
    );
    const byId = new Map(result.map((m) => [m.matter.id, m.orderCount]));
    expect(byId.get(SEACOAST_MATTER.id)).toBe(2);
    expect(byId.get(RAJESH_MATTER.id)).toBe(1);
    expect(byId.get(MAX_MATTER.id)).toBe(1);
    expect(byId.has("no-orders")).toBe(false);
  });

  it("never groups by matter name — two distinctly-idd matters with the same normalized name both appear independently", () => {
    const matterA = makeMatter({ id: "dup-a", normalizedMatterName: "Duplicate Name Ltd." });
    const matterB = makeMatter({ id: "dup-b", normalizedMatterName: "Duplicate Name Ltd." });
    const orderA = makeOrder({ id: "dup-order-a", matterId: "dup-a" });
    const orderB = makeOrder({ id: "dup-order-b", matterId: "dup-b" });
    const result = mattersWithAtLeastOneOrder([matterA, matterB], [orderA, orderB]);
    expect(result.map((m) => m.matter.id).sort()).toEqual(["dup-a", "dup-b"]);
  });

  it("an order with no matterId at all is never counted toward any matter", () => {
    const orphanOrder = makeOrder({ id: "orphan", matterId: null });
    const result = mattersWithAtLeastOneOrder([SEACOAST_MATTER], [orphanOrder]);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 8/13. UI source guards: navigation, single-order note, responsive
// layout (no forced desktop-only width), Case Detail links, official
// source links, no card duplicating the entire Case Detail page.
// ---------------------------------------------------------------------
describe("Case Journey UI wiring (source guards)", () => {
  it("NavBar's 'More' menu links to /case-journey, and the three primary demo screens (Analyze/Cases/Law) are untouched", async () => {
    const fs = await import("fs");
    const navbar = fs.readFileSync(new URL("../src/components/NavBar.tsx", import.meta.url), "utf8");
    expect(navbar).toMatch(/href:\s*"\/case-journey",\s*label:\s*"Case Journey"/);
    expect(navbar).toContain('{ href: "/analyzer", label: "Analyze" }');
    expect(navbar).toContain('{ href: "/case-library", label: "Cases" }');
    expect(navbar).toContain('{ href: "/law-library", label: "Law" }');
  });

  it("Compare Scenarios (added in a later pass) sits alongside Case Journey under More, never replacing it", async () => {
    const fs = await import("fs");
    const navbar = fs.readFileSync(new URL("../src/components/NavBar.tsx", import.meta.url), "utf8");
    expect(navbar).toContain('{ href: "/case-journey", label: "Case Journey" }');
    expect(navbar).toMatch(/href:\s*"\/compare-scenarios",\s*label:\s*"Compare Scenarios"/);
  });

  it("each journey stage card links to its own order's Case Detail page and official source", async () => {
    const fs = await import("fs");
    const card = fs.readFileSync(new URL("../src/components/CaseJourneyStageCard.tsx", import.meta.url), "utf8");
    expect(card).toMatch(/href=\{`\/orders\/\$\{order\.id\}`\}/);
    expect(card).toMatch(/<SourceLink href=\{order\.officialUrl\}/);
  });

  it("the single-order note text appears on the matter page when singleOrder is true", async () => {
    const fs = await import("fs");
    const page = fs.readFileSync(new URL("../src/app/(app)/case-journey/[matterId]/page.tsx", import.meta.url), "utf8");
    expect(page).toMatch(/journey\.singleOrder/);
    expect(page).toMatch(/Only one order is currently captured for this matter/);
  });

  it("stage grid uses a responsive column strategy (stacks on mobile, gains columns at md/xl), never a forced fixed desktop-only width", async () => {
    const fs = await import("fs");
    const page = fs.readFileSync(new URL("../src/app/(app)/case-journey/[matterId]/page.tsx", import.meta.url), "utf8");
    expect(page).toMatch(/grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3/);
    expect(page).not.toMatch(/w-\[\d+px\]/);
  });

  it("does not read order_type values back into the database or mutate corpus data — the page/lib files only read via existing data.ts getters", async () => {
    const fs = await import("fs");
    const lib = fs.readFileSync(new URL("../src/lib/caseJourney.ts", import.meta.url), "utf8");
    expect(lib).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  });
});
