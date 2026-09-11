// Production correction: Case Journey stage-specific outcome attribution.
//
// Defect: a finding whose orderIds spans both an interim/SCN order and a
// later, controlling order (getScenarioFindings/searchScenarioFindingsFullText
// in data.ts build orderIds as EXACTLY [order_id, final_order_id].filter(Boolean),
// never reordered) had its single, overall findingStatus rendered as the
// "Outcome / disposition" under EVERY stage it touched -- so Seacoast's
// interim order cum show cause notice (30-Sep-2024) displayed the same
// "Contravention established"/"Contravention not established" entries as
// its final order (24-Sep-2025), directly contradicting the app's own
// controlling-order convention (an interim finding is prima facie; the
// final order controls).
//
// Fix: attributedOrderIdForDisposition (caseJourney.ts) attributes a
// final-adjudicatory status (established/not established/partly
// established, or a genuine disposal -- Withdrawn/Inconclusive) to
// orderIds[1] only, when a second order is linked; every other status
// (Confirmed at interim, Procedural observation, Alleged, Prima facie) to
// orderIds[0], the finding's own originating order. buildCaseJourney now
// precomputes stage.dispositions (only findings genuinely attributable to
// THAT stage) and stage.hasNonAttributableDispositions (so the UI shows one
// neutral note instead of a duplicated or fabricated stage-specific
// outcome) -- see CaseJourneyStageCard.tsx.
//
// Fixture IDs/dates mirror the real production Seacoast/Rajesh matters
// already used in tests/case-journey.test.ts, so this is the same
// regression case the defect report itself names, not a synthetic stand-in.
import { describe, expect, it } from "vitest";
import { attributedOrderIdForDisposition, buildCaseJourney } from "@/lib/caseJourney";
import { findingStatusLabel } from "@/lib/findingStatusDisplay";
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

const NO_DIRECTIONS: DirectionOutcome[] = [];
const NO_RELATIONSHIPS: OrderRelationship[] = [];

// ---------------------------------------------------------------------
// attributedOrderIdForDisposition: pure unit coverage
// ---------------------------------------------------------------------
describe("attributedOrderIdForDisposition", () => {
  it("a single-order finding is trivially attributed to its one order, regardless of status", () => {
    const f = makeFinding({ recordId: "X-01", orderIds: ["only-order"], findingStatus: "Confirmed in Final Order" });
    expect(attributedOrderIdForDisposition(f)).toBe("only-order");
  });

  it("a final-adjudicatory status on a two-order finding is attributed to orderIds[1] (the controlling order), never orderIds[0]", () => {
    for (const status of ["Confirmed in Final Order", "Partly Confirmed in Final Order", "Not Confirmed in Final Order", "Withdrawn", "Inconclusive"] as const) {
      const f = makeFinding({ recordId: "X-01", orderIds: ["interim", "final"], findingStatus: status });
      expect(attributedOrderIdForDisposition(f)).toBe("final");
    }
  });

  it("a non-final-adjudicatory status on a two-order finding is attributed to orderIds[0] (the originating order)", () => {
    for (const status of ["Confirmed at interim", "Procedural observation", "Alleged", "Prima facie"] as const) {
      const f = makeFinding({ recordId: "X-01", orderIds: ["interim", "final"], findingStatus: status });
      expect(attributedOrderIdForDisposition(f)).toBe("interim");
    }
  });
});

// ---------------------------------------------------------------------
// Seacoast-shaped fixture: the real regression case named in the defect
// report. Mirrors tests/case-journey.test.ts's own SEACOAST_* fixtures.
// ---------------------------------------------------------------------
const SEACOAST_MATTER = makeMatter({ id: "60bbd426-879c-47e7-bd4d-038c148b416c", normalizedMatterName: "Seacoast Shipping Services Limited" });
const SEACOAST_INTERIM = makeOrder({
  id: "ad32246b-0593-45b3-bd53-14c590161145",
  caseName: "Seacoast Shipping Services Limited",
  orderStage: "Interim order cum show cause notice",
  orderDate: "2024-09-30",
  matterId: SEACOAST_MATTER.id,
});
const SEACOAST_FINAL = makeOrder({
  id: "cbe246c9-02d5-482f-966a-c140860b7af5",
  caseName: "Seacoast Shipping Services Limited",
  orderStage: "Final order",
  orderDate: "2025-09-24",
  matterId: SEACOAST_MATTER.id,
});
const SEACOAST_FINDINGS: ScenarioFinding[] = [
  makeFinding({ recordId: "SSSL-01", findingStatus: "Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-02", findingStatus: "Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-03", findingStatus: "Not Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-04", findingStatus: "Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
  makeFinding({ recordId: "SSSL-05", findingStatus: "Partly Confirmed in Final Order", orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id] }),
];

describe("Seacoast-shaped fixture: Stage 1 (interim) and Stage 2 (final) no longer display identical disposition lists", () => {
  const journey = buildCaseJourney(SEACOAST_MATTER, [SEACOAST_INTERIM, SEACOAST_FINAL], SEACOAST_FINDINGS, NO_DIRECTIONS, NO_RELATIONSHIPS);
  const stage1 = journey.stages.find((s) => s.order.id === SEACOAST_INTERIM.id)!;
  const stage2 = journey.stages.find((s) => s.order.id === SEACOAST_FINAL.id)!;

  it("Stage 1 (interim order cum SCN) shows zero final-adjudicatory dispositions, even though all 5 findings link to it", () => {
    expect(stage1.findings.map((f) => f.recordId).sort()).toEqual(["SSSL-01", "SSSL-02", "SSSL-03", "SSSL-04", "SSSL-05"]);
    expect(stage1.dispositions).toEqual([]);
    expect(stage1.hasNonAttributableDispositions).toBe(true);
  });

  it("Stage 2 (final order) shows all 5 findings' real dispositions -- established, not established, and partly established -- correctly attributed", () => {
    expect(stage2.hasNonAttributableDispositions).toBe(false);
    const byRecord = Object.fromEntries(stage2.dispositions.map((d) => [d.recordId, d.label]));
    expect(byRecord["SSSL-01"]).toBe("Contravention established");
    expect(byRecord["SSSL-02"]).toBe("Contravention established");
    expect(byRecord["SSSL-03"]).toBe("Contravention not established");
    expect(byRecord["SSSL-04"]).toBe("Contravention established");
    expect(byRecord["SSSL-05"]).toBe("Partly established");
  });

  it("Stage 1 and Stage 2 never display the same disposition list (the exact reported defect)", () => {
    expect(stage1.dispositions).not.toEqual(stage2.dispositions);
    expect(stage1.dispositions.length).toBe(0);
    expect(stage2.dispositions.length).toBe(5);
  });

  it("a definitive final disposition never appears under the earlier stage solely because the finding references both order IDs", () => {
    for (const finalDisposition of stage2.dispositions) {
      expect(stage1.dispositions.map((d) => d.recordId)).not.toContain(finalDisposition.recordId);
    }
  });
});

// ---------------------------------------------------------------------
// An interim stage WITH a genuine stage-specific prima facie finding
// (single-order matter, Rajesh-shaped).
// ---------------------------------------------------------------------
describe("An interim stage with a genuine stage-specific prima facie finding", () => {
  const matter = makeMatter({ id: "2dbf409c-8e55-49b8-911c-16a1fda47962", normalizedMatterName: "Rajesh Exports Limited" });
  const interim = makeOrder({ id: "c45c8bb0-4db2-4ef5-a7b7-f41dc8f3b22d", orderStage: "Interim order", orderDate: "2026-06-03", matterId: matter.id });
  const findings = [makeFinding({ recordId: "REL-01", findingStatus: "Prima facie", orderIds: [interim.id] })];
  const journey = buildCaseJourney(matter, [interim], findings, NO_DIRECTIONS, NO_RELATIONSHIPS);

  it("shows a source-supported interim formulation, never a bare 'Prima facie' label and never hidden entirely", () => {
    const stage = journey.stages[0];
    expect(stage.dispositions).toEqual([{ recordId: "REL-01", label: "Prima facie view recorded in an interim order" }]);
    expect(stage.hasNonAttributableDispositions).toBe(false);
    expect(findingStatusLabel("Prima facie")).toBe(stage.dispositions[0].label);
  });
});

// ---------------------------------------------------------------------
// A single-order matter: nothing to disambiguate, disposition shows
// normally under its one and only stage.
// ---------------------------------------------------------------------
describe("A single-order matter", () => {
  const matter = makeMatter({ id: "faa4a18e-9c62-4d40-b8e8-b2a77f787c9b", normalizedMatterName: "In the matter of Max Financial Services Limited" });
  const finalOrder = makeOrder({ id: "b5de6f63-4823-4b60-b4ff-ec673b3a9e5b", orderStage: "Final order", orderDate: "2026-08-24", matterId: matter.id });
  const findings = [makeFinding({ recordId: "MFS-01", findingStatus: "Not Confirmed in Final Order", orderIds: [finalOrder.id] })];
  const journey = buildCaseJourney(matter, [finalOrder], findings, NO_DIRECTIONS, NO_RELATIONSHIPS);

  it("the finding's disposition shows normally under the one stage present, with no non-attributable note", () => {
    const stage = journey.stages[0];
    expect(journey.singleOrder).toBe(true);
    expect(stage.dispositions).toEqual([{ recordId: "MFS-01", label: "Contravention not established" }]);
    expect(stage.hasNonAttributableDispositions).toBe(false);
  });
});

// ---------------------------------------------------------------------
// Confirmatory-order sequence: the fix is not keyed to the literal
// OrderStage string "Final order" -- it generalises to whichever order is
// recorded as the finding's own controlling (second) order, whatever its
// stage label actually is.
// ---------------------------------------------------------------------
describe("Confirmatory-order sequence (non-standard order stage, not literally 'Final order')", () => {
  const matter = makeMatter({ id: "confirmatory-matter" });
  const interim = makeOrder({ id: "confirmatory-interim", orderStage: "Interim order", orderDate: "2024-01-01", matterId: matter.id });
  const confirmatory = makeOrder({ id: "confirmatory-order", orderStage: "Confirmatory order", orderDate: "2024-06-01", matterId: matter.id });
  const findings = [makeFinding({ recordId: "CONF-01", findingStatus: "Confirmed in Final Order", orderIds: [interim.id, confirmatory.id] })];
  const journey = buildCaseJourney(matter, [interim, confirmatory], findings, NO_DIRECTIONS, NO_RELATIONSHIPS);

  it("the final-adjudicatory disposition is attributed to the confirmatory order (the finding's controlling order), not the interim order, purely from order_id/final_order_id linkage", () => {
    const interimStage = journey.stages.find((s) => s.order.id === interim.id)!;
    const confirmatoryStage = journey.stages.find((s) => s.order.id === confirmatory.id)!;
    expect(interimStage.dispositions).toEqual([]);
    expect(interimStage.hasNonAttributableDispositions).toBe(true);
    expect(confirmatoryStage.dispositions).toEqual([{ recordId: "CONF-01", label: "Contravention established" }]);
  });
});

// ---------------------------------------------------------------------
// Revocation-order sequence, and an SCN-stage finding with no disposition
// at all (Alleged), further generalising beyond the two matters named
// above.
// ---------------------------------------------------------------------
describe("Revocation-order sequence", () => {
  const matter = makeMatter({ id: "revocation-matter" });
  const original = makeOrder({ id: "revocation-original", orderStage: "Final order", orderDate: "2024-01-01", matterId: matter.id });
  const revocation = makeOrder({ id: "revocation-order", orderStage: "Revocation order", orderDate: "2024-06-01", matterId: matter.id });
  const findings = [makeFinding({ recordId: "REV-01", findingStatus: "Withdrawn", orderIds: [original.id, revocation.id] })];
  const journey = buildCaseJourney(matter, [original, revocation], findings, NO_DIRECTIONS, NO_RELATIONSHIPS);

  it("a disposal-type disposition (Withdrawn) is attributed to the later, controlling (revocation) order", () => {
    const originalStage = journey.stages.find((s) => s.order.id === original.id)!;
    const revocationStage = journey.stages.find((s) => s.order.id === revocation.id)!;
    expect(originalStage.dispositions).toEqual([]);
    expect(originalStage.hasNonAttributableDispositions).toBe(true);
    expect(revocationStage.dispositions).toEqual([{ recordId: "REV-01", label: "Withdrawn" }]);
  });
});

describe("An interim/SCN stage without structured stage-specific outcome data", () => {
  const matter = makeMatter({ id: "scn-matter" });
  const scn = makeOrder({ id: "scn-order", orderStage: "Interim order cum show cause notice", orderDate: "2024-01-01", matterId: matter.id });
  const finalOrder = makeOrder({ id: "scn-final", orderStage: "Final order", orderDate: "2024-12-01", matterId: matter.id });
  const findings = [makeFinding({ recordId: "SCN-01", findingStatus: "Confirmed in Final Order", orderIds: [scn.id, finalOrder.id] })];
  const journey = buildCaseJourney(matter, [scn, finalOrder], findings, NO_DIRECTIONS, NO_RELATIONSHIPS);

  it("displays the neutral fallback rather than inferring or fabricating a stage-specific outcome", () => {
    const scnStage = journey.stages.find((s) => s.order.id === scn.id)!;
    expect(scnStage.dispositions).toEqual([]);
    expect(scnStage.hasNonAttributableDispositions).toBe(true);
  });
});
