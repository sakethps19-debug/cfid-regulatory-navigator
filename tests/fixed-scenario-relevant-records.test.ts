// Part 6 correction: "Relevant CFID orders and scenarios" for Fixed
// Scenario Analysis (Part A). relevantScenarioRecords must show a record
// only when BOTH conditions hold: (1) the finding's own structured
// transactionTypes/allegedConduct intersect the scenario's curated
// keyConceptIds, AND (2) the finding has an exact finding_provisions link
// to one of the scenario's own curated provisionIds -- never an order
// shown merely because it cites the same provision elsewhere, and never a
// scenario 8/mis-selling-style catch-all (empty keyConceptIds) matching by
// accident.
import { describe, expect, it } from "vitest";
import { relevantScenarioRecords, groupRelevantScenarioRecords } from "@/lib/fixedScenarioRelevantRecords";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import type { LegalProvision, Order, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string }): ScenarioFinding {
  const provisionIds = overrides.provisionIds ?? [];
  const provisionLinks = overrides.provisionLinks ?? provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    caseName: "Mock Case Limited",
    orderIds: [],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    allegationText: null,
    provisionsConsideredRaw: null,
    provisionIds,
    provisionLinks,
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 10",
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

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "Mock Instrument",
    instrumentId: "mock-instrument",
    issuingAuthority: "SEBI",
    provisionNumber: "Reg 1",
    subject: "Mock subject",
    currentTextVerificationStatus: "Officially verified",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

// "related-party-transaction-irregularities" -- a real scenario with a
// real, non-empty keyConceptIds list, used throughout as the test subject.
const RPT_SCENARIO = FIXED_SCENARIOS.find((s) => s.id === "related-party-transaction-irregularities")!;
const RPT_CONCEPT = RPT_SCENARIO.keyConceptIds[0];
const RPT_PROVISION_ID = RPT_SCENARIO.provisionIds[0];

describe("relevantScenarioRecords: both conditions required", () => {
  it("shows a record when the finding's own tags match keyConceptIds AND it has an exact link to a scenario provision", () => {
    const provisions = [makeProvision({ id: RPT_PROVISION_ID })];
    const finding = makeFinding({
      recordId: "MOCK-01",
      transactionTypes: [RPT_CONCEPT],
      provisionIds: [RPT_PROVISION_ID],
    });
    const records = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(records).toHaveLength(1);
    expect(records[0].finding.recordId).toBe("MOCK-01");
    expect(records[0].provision.id).toBe(RPT_PROVISION_ID);
  });

  it("never shows a record for a finding with the right concept tag but NO link to any scenario provision (condition 2 fails)", () => {
    const provisions = [makeProvision({ id: RPT_PROVISION_ID }), makeProvision({ id: "UNRELATED-PROV" })];
    const finding = makeFinding({
      recordId: "MOCK-02",
      transactionTypes: [RPT_CONCEPT],
      provisionIds: ["UNRELATED-PROV"], // linked, but not to a scenario provision
    });
    const records = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(records).toHaveLength(0);
  });

  it("never shows a record for a finding linked to a scenario provision but with NO matching concept tag (condition 1 fails) -- never an order shown merely because it cites the same provision", () => {
    const provisions = [makeProvision({ id: RPT_PROVISION_ID })];
    const finding = makeFinding({
      recordId: "MOCK-03",
      transactionTypes: ["completely_unrelated_concept"],
      provisionIds: [RPT_PROVISION_ID],
    });
    const records = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(records).toHaveLength(0);
  });

  it("a scenario with empty keyConceptIds (the intentional broad catch-all / mis-selling sub-product) never matches anything, even a finding linked to its own provisions", () => {
    const broadScenario = FIXED_SCENARIOS.find((s) => s.keyConceptIds.length === 0)!;
    const provisionId = broadScenario.provisionIds[0];
    const provisions = [makeProvision({ id: provisionId })];
    const finding = makeFinding({ recordId: "MOCK-04", transactionTypes: ["anything"], provisionIds: [provisionId] });
    const records = relevantScenarioRecords(broadScenario.id, [finding], provisions, []);
    expect(records).toHaveLength(0);
  });

  it("an unknown scenario id returns no records rather than throwing", () => {
    expect(relevantScenarioRecords("not-a-real-scenario-id", [], [], [])).toEqual([]);
  });
});

describe("relevantScenarioRecords: per-link disposition bucketing", () => {
  const provisions = [makeProvision({ id: RPT_PROVISION_ID })];

  it("buckets a plain Confirmed-in-Final-Order finding as confirmed_final", () => {
    const finding = makeFinding({ recordId: "MOCK-CONFIRMED", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], findingStatus: "Confirmed in Final Order" });
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(record.bucket).toBe("confirmed_final");
    expect(record.effectiveStatus).toBe("Confirmed in Final Order");
  });

  it("buckets Partly Confirmed separately from fully Confirmed (never folded together)", () => {
    const finding = makeFinding({ recordId: "MOCK-PARTLY", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], findingStatus: "Partly Confirmed in Final Order" });
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(record.bucket).toBe("partly_confirmed");
  });

  it("buckets Not Confirmed as not_confirmed_contrary -- negative precedent stays first-class, its own bucket", () => {
    const finding = makeFinding({ recordId: "MOCK-NOTCONFIRMED", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], findingStatus: "Not Confirmed in Final Order" });
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(record.bucket).toBe("not_confirmed_contrary");
  });

  it("buckets Alleged/Prima facie/Confirmed at interim as interim_alleged_unresolved -- interim findings stay visibly interim", () => {
    for (const status of ["Alleged", "Prima facie", "Confirmed at interim", "Inconclusive", "Procedural observation"] as const) {
      const finding = makeFinding({ recordId: `MOCK-${status}`, transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], findingStatus: status });
      const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
      expect(record.bucket).toBe("interim_alleged_unresolved");
    }
  });

  it("a per-link 'not_upheld' relationship overrides an otherwise-positive overall findingStatus for THIS provision (Max Financial pattern: one finding, per-link disposition, never a positive read)", () => {
    const finding = makeFinding({
      recordId: "MOCK-MAXFIN-PATTERN",
      transactionTypes: [RPT_CONCEPT],
      findingStatus: "Confirmed in Final Order",
      provisionLinks: [{ provisionId: RPT_PROVISION_ID, justifyingTags: [], relationship: "not_upheld" }],
    });
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(record.effectiveStatus).toBe("Not Confirmed in Final Order");
    expect(record.bucket).toBe("not_confirmed_contrary");
  });
});

describe("groupRelevantScenarioRecords: display order and no frequency-based ordering", () => {
  it("returns groups in the required bucket order, omitting empty buckets", () => {
    const provisions = [makeProvision({ id: RPT_PROVISION_ID })];
    const confirmed = makeFinding({ recordId: "A", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], findingStatus: "Confirmed in Final Order" });
    const interim = makeFinding({ recordId: "B", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], findingStatus: "Alleged" });
    const records = relevantScenarioRecords(RPT_SCENARIO.id, [confirmed, interim], provisions, []);
    const groups = groupRelevantScenarioRecords(records);
    expect(groups.map((g) => g.bucket)).toEqual(["confirmed_final", "interim_alleged_unresolved"]);
  });

  it("sorts within a bucket by provision number then record id, never by any count/frequency signal", () => {
    const provisions = [makeProvision({ id: RPT_PROVISION_ID, provisionNumber: "Reg 1" })];
    const b = makeFinding({ recordId: "B-record", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID] });
    const a = makeFinding({ recordId: "A-record", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID] });
    const records = relevantScenarioRecords(RPT_SCENARIO.id, [b, a], provisions, []);
    const [group] = groupRelevantScenarioRecords(records);
    expect(group.records.map((r) => r.finding.recordId)).toEqual(["A-record", "B-record"]);
  });
});

describe("relevantScenarioRecords: order resolution", () => {
  it("resolves the finding's orderIds into full Order objects when present in the orders array", () => {
    const provisions = [makeProvision({ id: RPT_PROVISION_ID })];
    const order: Order = {
      id: "order-1",
      caseName: "Mock Case Limited",
      orderStage: "Final order",
      orderDate: "2025-01-01",
      orderNumber: "WTM/AB/1/2025",
      authority: "SEBI",
      noticeesCount: 1,
      officialUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
      cfidVerified: true,
      cfidVerificationBasis: "confirmed_by_authorised_cfid_officer",
      proceduralStatus: "Deep analyzed",
      processingStage: "citations_checked",
      retrievalStatus: "retrieved",
      retrievalFailureReason: null,
      scopeNote: null,
      matterId: null,
      officialOrderTitle: null,
      normalizedMatterName: null,
    };
    const finding = makeFinding({ recordId: "MOCK-ORDER", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], orderIds: ["order-1"] });
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, [order]);
    expect(record.orders).toHaveLength(1);
    expect(record.orders[0].orderNumber).toBe("WTM/AB/1/2025");
  });

  it("silently omits an orderId with no matching Order on file, rather than throwing", () => {
    const provisions = [makeProvision({ id: RPT_PROVISION_ID })];
    const finding = makeFinding({ recordId: "MOCK-NOORDER", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], orderIds: ["nonexistent-order"] });
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, []);
    expect(record.orders).toEqual([]);
  });
});

// Checkpoint correction A: a finding_provisions link is established at
// finding level, never per-order. A multi-order finding (finding.orderIds
// with more than one entry) must never be presented as if the linked
// provision were independently proven considered in each listed order --
// only that the finding (which may synthesize facts across the matter's
// stages) is linked to it and those orders genuinely belong to it. Same
// conservative `orderSpecific` pattern already used by
// scenarioComparison.ts / orderProvisionsConsidered.ts (Compare Scenarios
// and Case Detail), reused here rather than a third rule.
function makeOrder(overrides: Partial<Order> & { id: string }): Order {
  return {
    caseName: "Mock Case Limited",
    orderStage: "Final order",
    orderDate: "2025-01-01",
    orderNumber: "WTM/AB/1/2025",
    authority: "SEBI",
    noticeesCount: 1,
    officialUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
    cfidVerified: true,
    cfidVerificationBasis: "confirmed_by_authorised_cfid_officer",
    proceduralStatus: "Deep analyzed",
    processingStage: "citations_checked",
    retrievalStatus: "retrieved",
    retrievalFailureReason: null,
    scopeNote: null,
    matterId: null,
    officialOrderTitle: null,
    normalizedMatterName: null,
    ...overrides,
  };
}

describe("relevantScenarioRecords: order-specific provenance (checkpoint correction A)", () => {
  const provisions = [makeProvision({ id: RPT_PROVISION_ID })];

  it("a finding linked to exactly one captured order is orderSpecific=true", () => {
    const finding = makeFinding({
      recordId: "MOCK-SINGLE-ORDER",
      transactionTypes: [RPT_CONCEPT],
      provisionIds: [RPT_PROVISION_ID],
      orderIds: ["order-1"],
    });
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, [makeOrder({ id: "order-1" })]);
    expect(record.orderSpecific).toBe(true);
  });

  it("a finding linked to two captured orders is orderSpecific=false, even though both orders are still shown", () => {
    const finding = makeFinding({
      recordId: "MOCK-MULTI-ORDER",
      transactionTypes: [RPT_CONCEPT],
      provisionIds: [RPT_PROVISION_ID],
      orderIds: ["order-interim", "order-final"],
    });
    const orders = [
      makeOrder({ id: "order-interim", orderStage: "Interim order", orderDate: "2024-01-01" }),
      makeOrder({ id: "order-final", orderStage: "Final order", orderDate: "2025-01-01" }),
    ];
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, orders);
    expect(record.orderSpecific).toBe(false);
    expect(record.orders).toHaveLength(2);
  });

  // Real corpus pattern (Seacoast Shipping Services Limited): every one of
  // its scenario findings (SSSL-01..05) is linked to BOTH an interim and a
  // final order (finding.order_id and finding.final_order_id both set) --
  // a genuine multi-order finding, not a synthetic edge case.
  it("Seacoast-pattern regression: a finding spanning an interim and a final order is never presented as order-specific provenance", () => {
    const finding = makeFinding({
      recordId: "SSSL-02",
      caseName: "Seacoast Shipping Services Limited",
      transactionTypes: [RPT_CONCEPT],
      provisionIds: [RPT_PROVISION_ID],
      findingStatus: "Confirmed in Final Order",
      orderIds: ["sssl-interim-order", "sssl-final-order"],
    });
    const orders = [
      makeOrder({ id: "sssl-interim-order", caseName: "Seacoast Shipping Services Limited", orderStage: "Interim order", orderDate: "2024-06-01" }),
      makeOrder({ id: "sssl-final-order", caseName: "Seacoast Shipping Services Limited", orderStage: "Final order", orderDate: "2025-09-24" }),
    ];
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, orders);
    expect(record.orderSpecific).toBe(false);
    expect(record.bucket).toBe("confirmed_final");
    expect(record.orders.map((o) => o.orderStage)).toEqual(["Interim order", "Final order"]);
  });

  // Real corpus pattern (Par Drugs and Chemicals Limited, PDCL-01): linked
  // to both an interim order and a later confirmatory order, disposition
  // "confirmed_at_interim" -- an Interim-to-Confirmatory matter, another
  // genuine multi-order finding.
  it("Par Drugs-pattern regression: an interim finding spanning an interim and a confirmatory order is never presented as order-specific provenance", () => {
    const finding = makeFinding({
      recordId: "PDCL-01",
      caseName: "Par Drugs and Chemicals Limited",
      transactionTypes: [RPT_CONCEPT],
      provisionIds: [RPT_PROVISION_ID],
      findingStatus: "Confirmed at interim",
      orderIds: ["pdcl-interim-order", "pdcl-confirmatory-order"],
    });
    const orders = [
      makeOrder({ id: "pdcl-interim-order", caseName: "Par Drugs and Chemicals Limited", orderStage: "Interim order", orderDate: "2023-03-01" }),
      makeOrder({ id: "pdcl-confirmatory-order", caseName: "Par Drugs and Chemicals Limited", orderStage: "Confirmatory order", orderDate: "2023-11-01" }),
    ];
    const [record] = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, orders);
    expect(record.orderSpecific).toBe(false);
    expect(record.bucket).toBe("interim_alleged_unresolved");
    expect(record.orders.map((o) => o.orderStage)).toEqual(["Interim order", "Confirmatory order"]);
  });
});

describe("RELEVANT_RECORD_BUCKET_LABELS: bucket wording describes the finding's disposition, never implies every listed order shares it", () => {
  it("every label is phrased as a claim about the finding, not about the order(s) shown beneath it", async () => {
    const { RELEVANT_RECORD_BUCKET_LABELS } = await import("@/lib/fixedScenarioRelevantRecords");
    expect(RELEVANT_RECORD_BUCKET_LABELS.confirmed_final).toBe("Findings confirmed at final stage");
    expect(RELEVANT_RECORD_BUCKET_LABELS.partly_confirmed).toBe("Findings partly confirmed at final stage");
    expect(RELEVANT_RECORD_BUCKET_LABELS.not_confirmed_contrary).toBe("Findings not confirmed / contrary treatment");
    expect(RELEVANT_RECORD_BUCKET_LABELS.interim_alleged_unresolved).toBe("Findings interim, alleged or otherwise unresolved");
    // None of the labels may read as "orders confirmed" / "final orders" in
    // a way that could imply every order listed under the bucket was
    // itself a final confirmation (a multi-order finding confirmed at
    // final stage may still list an interim order alongside the final one).
    for (const label of Object.values(RELEVANT_RECORD_BUCKET_LABELS)) {
      expect(label).not.toMatch(/^Confirmed in final orders?$/i);
    }
  });
});

// Live-officer-review overhaul: "Relevant CFID Scenarios" (a flat, per-
// finding/per-provision-link list, one <li> per link) was replaced by
// "Relevant CFID Orders" (one card per distinct captured order.id, findings
// and provisions deduplicated within it -- see groupRelevantRecordsByOrder
// in fixedScenarioRelevantRecords.ts). The finding-level provenance
// safeguard is preserved, just re-worded to describe the order-card
// grouping instead of a single flat list.
describe("FixedScenarioAnalyzer.tsx: groups relevant results by captured order, not by finding/provision-link", () => {
  it("renders one card per order (RelevantOrderCard/RelevantCfidOrders), not the old flat per-finding-link list", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync(new URL("../src/components/analyzer/FixedScenarioAnalyzer.tsx", import.meta.url), "utf8");
    expect(src).toContain("Relevant CFID Orders");
    expect(src).toContain("groupRelevantRecordsByOrder");
    expect(src).toContain("function RelevantOrderCard");
    expect(src).not.toContain("Relevant CFID Scenarios");
  });

  it("carries the finding-level provenance safeguard: a multi-order finding's provision linkage is never presented as order-specific", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync(new URL("../src/components/analyzer/FixedScenarioAnalyzer.tsx", import.meta.url), "utf8");
    expect(src).toContain("hasFindingLevelOnlyLinkage");
    expect(src).toMatch(/Finding-level provision linkage:.*linked to more than one captured order/);
  });

  it("each order card links to its official source and to Case Detail", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync(new URL("../src/components/analyzer/FixedScenarioAnalyzer.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/<SourceLink href=\{order\.officialUrl\}\s*\/>/);
    expect(src).toMatch(/href=\{`\/orders\/\$\{order\.id\}`\}/);
    expect(src).toContain("View Case");
  });

  it("order stage is rendered via the shared OrderStageBadge, never fused with finding disposition into one compound label", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync(new URL("../src/components/analyzer/FixedScenarioAnalyzer.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/<OrderStageBadge orderStage=\{order\.orderStage\}\s*\/>/);
  });
});
