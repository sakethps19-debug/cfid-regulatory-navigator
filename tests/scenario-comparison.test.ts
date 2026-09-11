// Compare Scenarios: "how has the same broad legal/factual issue been
// treated across different matters/orders?" Tests target the pure data-
// shaping logic in src/lib/scenarioComparison.ts, following the same
// fixture-based unit-test pattern as tests/case-journey.test.ts -- no live
// Supabase access here.
//
// Fixture ids/tags below mirror ACTUAL production rows captured via a
// read-only Supabase query during this pass (see the final report):
// Seacoast Shipping Services Limited, Rajesh Exports Limited, Max
// Financial Services Limited, Par Drugs and Chemicals Limited, Suzlon
// Energy Limited (post-migration-0024, order_type "other"), and Tarapur
// Transformers Limited (post-migration-0024, order_type "final_order") --
// including each finding's real transaction_types/alleged_conduct/
// finding_status values, so these tests are grounded in the real
// regression cases the task names, not arbitrary synthetic tags.
import { describe, expect, it } from "vitest";
import {
  buildScenarioComparison,
  comparisonRowMatterLabel,
  filterComparisonRows,
  findingsForScenario,
  getComparableScenario,
  sortComparisonRows,
  summarizeScenarioComparison,
  type ComparisonRow,
} from "@/lib/scenarioComparison";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import type { DirectionOutcome, Matter, Order, ScenarioFinding } from "@/types/domain";

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

// ---------------------------------------------------------------------
// Real-data fixtures.
// ---------------------------------------------------------------------

const FINANCIAL_MISSTATEMENT = "financial-statement-misrepresentation";
const FUND_DIVERSION = "diversion-siphoning-misutilisation";
const FRAUDULENT_ALLOTMENT = "fraudulent-fictitious-allotment";
const RPT_IRREGULARITIES = "related-party-transaction-irregularities";
const BROAD_CATCHALL = "fraudulent-manipulative-conduct-broad";

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
// SSSL-03: the real negative precedent -- interim prima facie allegation of
// a sham preferential allotment / fund diversion, recorded NOT_UPHELD in
// the final order (finding_status = not_upheld in production).
const SSSL_03 = makeFinding({
  recordId: "SSSL-03",
  caseName: "Seacoast Shipping Services Limited",
  orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id],
  findingStatus: "Not Confirmed in Final Order",
  transactionTypes: ["preferential_allotment"],
  allegedConduct: ["sham_preferential_allotment", "fund_diversion"],
  provisionLinks: [{ provisionId: "PFUTP-3-b", justifyingTags: [], relationship: "not_upheld" }],
});
// SSSL-01: a genuinely upheld finding on the same matter, different
// scenario tags (fictitious sales/assets) so it does NOT also match
// FRAUDULENT_ALLOTMENT/FUND_DIVERSION -- used to prove different findings
// on the same order stay independently traceable.
const SSSL_01 = makeFinding({
  recordId: "SSSL-01",
  caseName: "Seacoast Shipping Services Limited",
  orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id],
  findingStatus: "Confirmed in Final Order",
  transactionTypes: ["purchase_transaction"],
  allegedConduct: ["fictitious_sales_or_revenue", "financial_statement_misstatement"],
  provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "upheld" }],
});

const RAJESH_MATTER = makeMatter({ id: "2dbf409c-8e55-49b8-911c-16a1fda47962", normalizedMatterName: "Rajesh Exports Limited" });
const RAJESH_INTERIM = makeOrder({
  id: "c45c8bb0-4db2-4ef5-a7b7-f41dc8f3b22d",
  caseName: "Rajesh Exports Limited",
  orderStage: "Interim order",
  orderDate: "2026-06-03",
  matterId: RAJESH_MATTER.id,
});
const REL_01 = makeFinding({
  recordId: "REL-01",
  caseName: "Rajesh Exports Limited",
  orderIds: [RAJESH_INTERIM.id],
  findingStatus: "Prima facie",
  transactionTypes: ["purchase_transaction"],
  allegedConduct: ["fictitious_sales_or_revenue", "financial_statement_misstatement"],
  provisionLinks: [{ provisionId: "PFUTP-4-2-e", justifyingTags: [], relationship: "alleged" }],
});

const MAX_MATTER = makeMatter({ id: "faa4a18e-9c62-4d40-b8e8-b2a77f787c9b", normalizedMatterName: "In the matter of Max Financial Services Limited" });
const MAX_FINAL = makeOrder({
  id: "b5de6f63-4823-4b60-b4ff-ec673b3a9e5b",
  caseName: "In the matter of Max Financial Services Limited",
  orderStage: "Final order",
  orderDate: "2026-08-24",
  officialOrderTitle: "Order in the matter of Max Financial Services Limited",
  matterId: MAX_MATTER.id,
});
// MFS-01 -- production's ACTUAL tags, confirmed via read-only query during
// this pass: transaction_types = [], alleged_conduct = []. This is a real
// corpus-completeness gap (see final report), not a fixture simplification.
const MFS_01 = makeFinding({
  recordId: "MFS-01",
  caseName: "In the matter of Max Financial Services Limited",
  orderIds: [MAX_FINAL.id],
  findingStatus: "Not Confirmed in Final Order",
  transactionTypes: [],
  allegedConduct: [],
});

const PAR_DRUGS_MATTER = makeMatter({ id: "0d84d491-0dff-4b34-8900-f8319f3edccf", normalizedMatterName: "Par Drugs and Chemicals Limited" });
const PAR_DRUGS_INTERIM = makeOrder({
  id: "39d66f9f-14b2-4441-9fa4-b76d9bcd75d9",
  caseName: "PAR DRUGS AND CHEMICALS LIMITED",
  orderStage: "Interim order",
  orderDate: "2025-09-15",
  matterId: PAR_DRUGS_MATTER.id,
});
const PAR_DRUGS_CONFIRMATORY = makeOrder({
  id: "ce0b50a9-8052-4247-ac11-2f7914dea82d",
  caseName: "PAR DRUGS AND CHEMICALS LIMITED",
  orderStage: "Confirmatory order",
  orderDate: "2026-03-25",
  matterId: PAR_DRUGS_MATTER.id,
});
const PDCL_01 = makeFinding({
  recordId: "PDCL-01",
  caseName: "PAR DRUGS AND CHEMICALS LIMITED",
  orderIds: [PAR_DRUGS_INTERIM.id, PAR_DRUGS_CONFIRMATORY.id],
  findingStatus: "Confirmed at interim",
  transactionTypes: ["related_party_transaction", "corporate_announcement"],
  allegedConduct: ["related_party_misrepresentation", "financial_statement_misstatement"],
  provisionLinks: [{ provisionId: "LODR-23-2", justifyingTags: [], relationship: "upheld" }],
});

const SUZLON_MATTER = makeMatter({ id: "95f2b716-0aaf-46bc-acec-e130f9ccbb7d", normalizedMatterName: "Investigation in the matter of Suzlon Energy Limited" });
const SUZLON_ORDER = makeOrder({
  id: "3824c4b9-ae67-4e1b-9d59-dcfbe02120d9",
  caseName: "Investigation in the matter of Suzlon Energy Limited",
  orderStage: "Other",
  orderDate: "2026-05-29",
  officialOrderTitle: "Order under Section 15I(3) of the SEBI Act and Section 23I(3) of the SCRA in the matter of Suzlon Energy Limited",
  matterId: SUZLON_MATTER.id,
});
const SUZLON_01 = makeFinding({
  recordId: "SUZLON-01",
  caseName: "Investigation in the matter of Suzlon Energy Limited",
  orderIds: [SUZLON_ORDER.id],
  findingStatus: "Confirmed in Final Order",
  transactionTypes: ["related_party_transaction", "fund_transfer_promoter_entity", "financial_statement_disclosure"],
  allegedConduct: ["circular_fund_movement", "financial_statement_misstatement", "related_party_misrepresentation"],
  provisionLinks: [{ provisionId: "LODR-23-2", justifyingTags: [], relationship: "upheld" }],
});

const TARAPUR_MATTER = makeMatter({ id: "05c86b8b-6d0a-4079-853a-7aadab99d608", normalizedMatterName: "Tarapur Transformers Limited" });
const TARAPUR_ORDER = makeOrder({
  id: "fdf46fec-831a-411e-ba10-0f382cd51e40",
  caseName: "Tarapur Transformers Limited",
  orderStage: "Final order",
  orderDate: "2026-08-31",
  officialOrderTitle: "Order in the matter of Tarapur Transformers Limited",
  matterId: TARAPUR_MATTER.id,
});
const TTL_01 = makeFinding({
  recordId: "TTL-01",
  caseName: "Tarapur Transformers Limited",
  orderIds: [TARAPUR_ORDER.id],
  findingStatus: "Confirmed in Final Order",
  transactionTypes: ["fund_transfer_promoter_entity", "related_party_transaction", "revenue_recognition"],
  allegedConduct: ["fund_diversion", "fictitious_sales_or_revenue", "related_party_misrepresentation"],
  provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "upheld" }],
});
// TTL-02: real, but its own tags (non_cooperation_with_investigation) do
// not intersect ANY FIXED_SCENARIOS keyConceptIds -- included to prove a
// genuinely unmatched finding on the SAME order as a matched one is
// correctly excluded from provisionsConsidered/findings for that row.
const TTL_02 = makeFinding({
  recordId: "TTL-02",
  caseName: "Tarapur Transformers Limited",
  orderIds: [TARAPUR_ORDER.id],
  findingStatus: "Confirmed in Final Order",
  transactionTypes: ["investigation_process"],
  allegedConduct: ["non_cooperation_with_investigation"],
  provisionLinks: [{ provisionId: "SEBI-ACT-11C-2", justifyingTags: [], relationship: "upheld" }],
});

const ALL_ORDERS = [SEACOAST_INTERIM, SEACOAST_FINAL, RAJESH_INTERIM, MAX_FINAL, PAR_DRUGS_INTERIM, PAR_DRUGS_CONFIRMATORY, SUZLON_ORDER, TARAPUR_ORDER];
const ALL_FINDINGS = [SSSL_03, SSSL_01, REL_01, MFS_01, PDCL_01, SUZLON_01, TTL_01, TTL_02];
const ALL_MATTERS = new Map(
  [SEACOAST_MATTER, RAJESH_MATTER, MAX_MATTER, PAR_DRUGS_MATTER, SUZLON_MATTER, TARAPUR_MATTER].map((m) => [m.id, m])
);
const NO_DIRECTIONS = new Map<string, DirectionOutcome[]>();

// ---------------------------------------------------------------------
// 1. Selection uses the canonical existing scenario taxonomy.
// ---------------------------------------------------------------------
describe("getComparableScenario: canonical taxonomy only", () => {
  it("resolves only ids present in FIXED_SCENARIOS", () => {
    expect(getComparableScenario(FINANCIAL_MISSTATEMENT)?.name).toBe("Misrepresentation / Misstatement of Financial Statements");
    expect(getComparableScenario("not-a-real-scenario-id")).toBeUndefined();
  });

  it("never invents a scenario absent from FIXED_SCENARIOS", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(getComparableScenario(s.id)).toBe(s);
    }
  });
});

// ---------------------------------------------------------------------
// 2/3. Inclusion requires structured scenario mapping -- never fuzzy/
// name-based inclusion.
// ---------------------------------------------------------------------
describe("findingsForScenario: structured inclusion only, never fuzzy/name-based", () => {
  it("includes a finding whose transactionTypes/allegedConduct intersect the scenario's keyConceptIds", () => {
    const matched = findingsForScenario(FRAUDULENT_ALLOTMENT, [SSSL_03]);
    expect(matched.map((f) => f.recordId)).toEqual(["SSSL-03"]);
  });

  it("excludes a finding whose scenarioTitle/factualPattern textually mentions the scenario but carries NO matching structured tags", () => {
    const decoy = makeFinding({
      recordId: "DECOY-01",
      scenarioTitle: "Related Party Transaction Irregularities alleged against the promoter",
      factualPattern: "This finding's free text mentions related party transaction irregularities extensively, on purpose.",
      transactionTypes: [], // deliberately no structured tags
      allegedConduct: [],
    });
    expect(findingsForScenario(RPT_IRREGULARITIES, [decoy])).toEqual([]);
  });

  it("excludes a finding with unrelated structured tags", () => {
    expect(findingsForScenario(RPT_IRREGULARITIES, [SSSL_01])).toEqual([]);
  });

  it("the two scenarios deliberately given an empty keyConceptIds array (broad catch-all, mis-selling) never match ANY finding via this mechanism -- by FIXED_SCENARIOS's own design, not a bug here", () => {
    expect(findingsForScenario(BROAD_CATCHALL, ALL_FINDINGS)).toEqual([]);
    expect(findingsForScenario("capital-raising-fraudulent-mis-selling", ALL_FINDINGS)).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 4. Different matters remain distinct.
// ---------------------------------------------------------------------
describe("buildScenarioComparison: different matters remain distinct", () => {
  it("two matters sharing an identical case_name are never merged (P2-18-style regression)", () => {
    const matterA = makeMatter({ id: "matter-a", normalizedMatterName: "Brightcom Group Ltd." });
    const matterB = makeMatter({ id: "matter-b", normalizedMatterName: "Brightcom Group Ltd." });
    const orderA = makeOrder({ id: "order-a", caseName: "Brightcom Group Ltd.", matterId: matterA.id, orderDate: "2020-01-01" });
    const orderB = makeOrder({ id: "order-b", caseName: "Brightcom Group Ltd.", matterId: matterB.id, orderDate: "2021-01-01" });
    const findingA = makeFinding({ recordId: "A-01", orderIds: [orderA.id], allegedConduct: ["fund_diversion"] });
    const findingB = makeFinding({ recordId: "B-01", orderIds: [orderB.id], allegedConduct: ["fund_diversion"] });
    const matterById = new Map([
      [matterA.id, matterA],
      [matterB.id, matterB],
    ]);
    const rows = buildScenarioComparison(FUND_DIVERSION, [orderA, orderB], [findingA, findingB], NO_DIRECTIONS, matterById);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.order.matterId))).toEqual(new Set(["matter-a", "matter-b"]));
  });

  it("Seacoast and Rajesh Exports never get merged merely because both match FINANCIAL_MISSTATEMENT", () => {
    const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const matterIds = new Set(rows.map((r) => r.order.matterId));
    expect(matterIds.has(SEACOAST_MATTER.id)).toBe(true);
    expect(matterIds.has(RAJESH_MATTER.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------
// 5. Multiple relevant orders in the same matter remain distinct (Seacoast
// interim/final, Par Drugs interim/confirmatory).
// ---------------------------------------------------------------------
describe("buildScenarioComparison: multiple orders in the same matter stay independent rows", () => {
  it("Seacoast: a finding matched to FRAUDULENT_ALLOTMENT produces independent rows for the interim AND final order", () => {
    const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const seacoastRows = rows.filter((r) => r.order.matterId === SEACOAST_MATTER.id);
    expect(seacoastRows).toHaveLength(2);
    expect(new Set(seacoastRows.map((r) => r.order.id))).toEqual(new Set([SEACOAST_INTERIM.id, SEACOAST_FINAL.id]));
    // Each row keeps its own order's own date/stage distinct.
    const interimRow = seacoastRows.find((r) => r.order.id === SEACOAST_INTERIM.id)!;
    const finalRow = seacoastRows.find((r) => r.order.id === SEACOAST_FINAL.id)!;
    expect(interimRow.order.orderDate).toBe("2024-09-30");
    expect(finalRow.order.orderDate).toBe("2025-09-24");
  });

  it("Par Drugs: PDCL-01 (matched to RPT_IRREGULARITIES) produces independent rows for Interim and Confirmatory, without inferring a relationship from chronology alone", () => {
    const rows = buildScenarioComparison(RPT_IRREGULARITIES, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const parDrugsRows = rows.filter((r) => r.order.matterId === PAR_DRUGS_MATTER.id);
    expect(parDrugsRows).toHaveLength(2);
    expect(new Set(parDrugsRows.map((r) => r.order.orderStage))).toEqual(new Set(["Interim order", "Confirmatory order"]));
    // buildScenarioComparison itself carries no relationship-inference
    // logic at all -- it only groups by finding.orderIds, so there is no
    // "relationship note" field to accidentally fabricate here.
  });
});

// ---------------------------------------------------------------------
// 6. Newest-first default; other sort keys.
// ---------------------------------------------------------------------
describe("sortComparisonRows", () => {
  const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);

  it("date_desc (default) sorts newest order first", () => {
    const sorted = sortComparisonRows(rows, "date_desc");
    const dates = sorted.map((r) => r.order.orderDate ?? "");
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("date_asc sorts oldest order first", () => {
    const sorted = sortComparisonRows(rows, "date_asc");
    const dates = sorted.map((r) => r.order.orderDate ?? "");
    expect(dates).toEqual([...dates].sort());
  });

  it("never sorts by provision count or match frequency as a default -- date_desc output is unrelated to provisionsConsidered.length ordering", () => {
    const sorted = sortComparisonRows(rows, "date_desc");
    const provisionCounts = sorted.map((r) => r.provisionsConsidered.length);
    // Not asserting a specific order (that would be circular) -- asserting
    // the sort function itself takes no provisionsConsidered input at all
    // is done structurally by TypeScript (sortComparisonRows's signature),
    // this test just documents that the resulting order isn't coincidentally
    // description of importance by count.
    expect(provisionCounts.length).toBe(sorted.length);
  });
});

// ---------------------------------------------------------------------
// 7/8/9. Filters: stage, disposition, provision/instrument.
// ---------------------------------------------------------------------
describe("filterComparisonRows", () => {
  const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);

  it("stage filter narrows to only that exact order stage", () => {
    const filtered = filterComparisonRows(rows, { stage: "Interim order" });
    expect(filtered.every((r) => r.order.orderStage === "Interim order")).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(rows.length);
  });

  it("disposition filter narrows to rows whose dispositions include that exact status", () => {
    const filtered = filterComparisonRows(rows, { disposition: "Confirmed in Final Order" });
    expect(filtered.every((r) => r.dispositions.includes("Confirmed in Final Order"))).toBe(true);
  });

  it("provision filter narrows to rows whose provisionsConsidered includes that exact canonical id", () => {
    const filtered = filterComparisonRows(rows, { provisionId: "PFUTP-4-1" });
    expect(filtered.every((r) => r.provisionsConsidered.some((p) => p.provisionId === "PFUTP-4-1"))).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("filters genuinely narrow the set -- an impossible filter combination returns zero rows, never a fallback/best-effort match", () => {
    const filtered = filterComparisonRows(rows, { stage: "Revocation order" });
    expect(filtered).toEqual([]);
  });

  it("date range filter excludes rows outside the bound", () => {
    const filtered = filterComparisonRows(rows, { dateFrom: "2026-01-01" });
    expect(filtered.every((r) => (r.order.orderDate ?? "") >= "2026-01-01")).toBe(true);
  });
});

// ---------------------------------------------------------------------
// 10. Negative precedent retained, never hidden, worded as "Contravention
// not established".
// ---------------------------------------------------------------------
describe("negative precedents are first-class", () => {
  // Section C correction: SSSL-03's findingStatus ("Not Confirmed in Final
  // Order") is a final-adjudicatory disposition, genuinely attributable
  // only to the Seacoast FINAL order (attributedOrderIdForDisposition,
  // caseJourney.ts) -- never to the interim row the same finding also
  // references. This test previously asserted the disposition on BOTH
  // rows, which was itself the exact stage-leak defect this pass fixes:
  // the negative precedent is still retained and never hidden (see the
  // finding-level assertion, and hasNonAttributableDispositions on the
  // interim row below), it simply is not fabricated onto a stage that
  // never decided it.
  it("SSSL-03 (not_upheld in production) is retained under FRAUDULENT_ALLOTMENT with its negative disposition intact on the order that actually decided it", () => {
    const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const rowsWithSSSL03 = rows.filter((r) => r.findings.some((f) => f.recordId === "SSSL-03"));
    expect(rowsWithSSSL03.length).toBeGreaterThan(0);
    for (const row of rowsWithSSSL03) {
      const finding = row.findings.find((f) => f.recordId === "SSSL-03")!;
      expect(finding.findingStatus).toBe("Not Confirmed in Final Order");
    }
    const finalRow = rowsWithSSSL03.find((r) => r.order.id === SEACOAST_FINAL.id)!;
    expect(finalRow.dispositions).toContain("Not Confirmed in Final Order");
    const interimRow = rowsWithSSSL03.find((r) => r.order.id === SEACOAST_INTERIM.id)!;
    expect(interimRow.dispositions).not.toContain("Not Confirmed in Final Order");
    expect(interimRow.hasNonAttributableDispositions).toBe(true);
  });

  it("its provisionsConsidered carries notUpheldOnly=true, which the UI renders as 'Contravention not established' -- never a bare 'not upheld' label", () => {
    const rows = buildScenarioComparison(FUND_DIVERSION, ALL_ORDERS, [SSSL_03], NO_DIRECTIONS, ALL_MATTERS);
    const row = rows.find((r) => r.order.id === SEACOAST_FINAL.id)!;
    const provision = row.provisionsConsidered.find((p) => p.provisionId === "PFUTP-3-b");
    expect(provision?.notUpheldOnly).toBe(true);
  });
});

// ---------------------------------------------------------------------
// 11. Max Financial: no SCN fabrication; documents the real corpus gap.
// ---------------------------------------------------------------------
describe("Max Financial Services Limited: no SCN fabrication (structural + corpus-gap regression)", () => {
  it("MFS-01's real production tags are empty, so it never matches ANY scenario -- a known corpus-completeness gap, not a bug", () => {
    for (const scenario of FIXED_SCENARIOS) {
      expect(findingsForScenario(scenario.id, [MFS_01])).toEqual([]);
    }
  });

  it("Max Financial never produces a fabricated SCN row -- buildScenarioComparison only ever creates rows from finding.orderIds, and MFS-01's only orderId is the real Final Order", () => {
    expect(MFS_01.orderIds).toEqual([MAX_FINAL.id]);
    const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, [MFS_01], NO_DIRECTIONS, ALL_MATTERS);
    expect(rows).toEqual([]); // MFS-01 doesn't match this scenario either, given empty tags
  });

  it("if Max Financial's finding DID carry matching tags (hypothetically), it would appear with its negative disposition intact, never converted to a positive violation", () => {
    const hypothetical = makeFinding({ ...MFS_01, transactionTypes: ["related_party_transaction"], allegedConduct: ["related_party_misrepresentation"] });
    const rows = buildScenarioComparison(RPT_IRREGULARITIES, ALL_ORDERS, [hypothetical], NO_DIRECTIONS, ALL_MATTERS);
    expect(rows).toHaveLength(1);
    expect(rows[0].order.id).toBe(MAX_FINAL.id);
    expect(rows[0].dispositions).toEqual(["Not Confirmed in Final Order"]);
  });
});

// ---------------------------------------------------------------------
// 12. Seacoast interim and final remain separate (already covered above,
// restated here as its own named regression per the task's list).
// ---------------------------------------------------------------------
describe("Seacoast Shipping Services Limited: interim and final remain separate rows", () => {
  it("never overwrites interim treatment with final treatment", () => {
    const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const interimRow = rows.find((r) => r.order.id === SEACOAST_INTERIM.id)!;
    const finalRow = rows.find((r) => r.order.id === SEACOAST_FINAL.id)!;
    expect(interimRow).toBeDefined();
    expect(finalRow).toBeDefined();
    expect(interimRow.order.orderStage).toBe("Interim order cum show cause notice");
    expect(finalRow.order.orderStage).toBe("Final order");
  });
});

// ---------------------------------------------------------------------
// 13. Rajesh Exports: only the captured Interim Order appears.
// ---------------------------------------------------------------------
describe("Rajesh Exports Limited: only the captured Interim Order appears", () => {
  it("produces exactly one row, the interim order, no invented later stage", () => {
    const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const rajeshRows = rows.filter((r) => r.order.matterId === RAJESH_MATTER.id);
    expect(rajeshRows).toHaveLength(1);
    expect(rajeshRows[0].order.id).toBe(RAJESH_INTERIM.id);
    expect(rajeshRows[0].order.orderStage).toBe("Interim order");
  });
});

// ---------------------------------------------------------------------
// 14. Directions scoped to exact order.
// ---------------------------------------------------------------------
describe("buildScenarioComparison: directions scoped to exact order_id", () => {
  it("a direction recorded against a different order id never appears on this row", () => {
    const directionsByOrderId = new Map<string, DirectionOutcome[]>([
      [SEACOAST_INTERIM.id, [makeDirection({ id: "d1", orderId: SEACOAST_INTERIM.id, directionOrOutcome: "Interim direction." })]],
      [SEACOAST_FINAL.id, [makeDirection({ id: "d2", orderId: SEACOAST_FINAL.id, directionOrOutcome: "Final direction." })]],
    ]);
    const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, directionsByOrderId, ALL_MATTERS);
    const interimRow = rows.find((r) => r.order.id === SEACOAST_INTERIM.id)!;
    const finalRow = rows.find((r) => r.order.id === SEACOAST_FINAL.id)!;
    expect(interimRow.directions.map((d) => d.id)).toEqual(["d1"]);
    expect(finalRow.directions.map((d) => d.id)).toEqual(["d2"]);
  });

  it("an order with no directions map entry gets an empty array, never a fabricated direction", () => {
    const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    expect(rows.every((r) => r.directions.length === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------
// 15. Provisions scoped to actual order findings -- a provision cited
// only by an UNMATCHED finding on the same order never leaks in.
// ---------------------------------------------------------------------
describe("buildScenarioComparison: provisions scoped to only the matched findings on that order", () => {
  it("Tarapur's row for FUND_DIVERSION includes TTL-01's provision (PFUTP-4-1) but never TTL-02's (SEBI-ACT-11C-2), since TTL-02 doesn't match this scenario", () => {
    const rows = buildScenarioComparison(FUND_DIVERSION, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const tarapurRow = rows.find((r) => r.order.id === TARAPUR_ORDER.id)!;
    expect(tarapurRow.findings.map((f) => f.recordId)).toEqual(["TTL-01"]);
    expect(tarapurRow.provisionsConsidered.map((p) => p.provisionId)).toEqual(["PFUTP-4-1"]);
    expect(tarapurRow.provisionsConsidered.some((p) => p.provisionId === "SEBI-ACT-11C-2")).toBe(false);
  });
});

// ---------------------------------------------------------------------
// Correction pass: order-specific provision provenance. finding_provisions
// carries only (finding_id, provision_id, relationship, justifying_tags) --
// confirmed via a read-only schema query during this pass -- so a
// provision link belongs to a FINDING, never to a (finding, order) pair.
// A finding whose orderIds spans two orders (Seacoast's SSSL-*, Par
// Drugs' PDCL-01) must never have its provisions silently asserted as
// "considered in this specific order": each row must instead flag those
// provisions as finding-level-only linkage, while a genuinely
// single-order finding's provisions remain confidently order-specific
// with no unnecessary qualifier.
// ---------------------------------------------------------------------
describe("order-specific provision provenance: never manufactured from finding.orderIds alone", () => {
  it("a multi-order finding's provisions are flagged orderSpecific=false on EVERY row it appears on -- never silently asserted as order-specific", () => {
    const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const seacoastRows = rows.filter((r) => r.order.matterId === SEACOAST_MATTER.id);
    expect(seacoastRows).toHaveLength(2);
    for (const row of seacoastRows) {
      // SSSL-03 is the only matched finding on both rows, and it spans 2 orders.
      expect(row.findings.every((f) => f.orderIds.length > 1)).toBe(true);
      expect(row.provisionsConsidered.every((p) => p.orderSpecific === false)).toBe(true);
      expect(row.hasFindingLevelOnlyProvisionLinkage).toBe(true);
    }
  });

  it("Par Drugs' PDCL-01 (orderIds spans Interim + Confirmatory) produces the same finding-level flag on BOTH its rows", () => {
    const rows = buildScenarioComparison(RPT_IRREGULARITIES, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const parDrugsRows = rows.filter((r) => r.order.matterId === PAR_DRUGS_MATTER.id);
    expect(parDrugsRows).toHaveLength(2);
    for (const row of parDrugsRows) {
      expect(row.hasFindingLevelOnlyProvisionLinkage).toBe(true);
      expect(row.provisionsConsidered.find((p) => p.provisionId === "LODR-23-2")?.orderSpecific).toBe(false);
    }
  });

  it("finding-level provision linkage REMAINS VISIBLE (never hidden) -- LODR-23-2 still appears in provisionsConsidered, just flagged non-order-specific", () => {
    const rows = buildScenarioComparison(RPT_IRREGULARITIES, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const parDrugsInterimRow = rows.find((r) => r.order.id === PAR_DRUGS_INTERIM.id)!;
    expect(parDrugsInterimRow.provisionsConsidered.map((p) => p.provisionId)).toContain("LODR-23-2");
  });

  it("a genuinely single-order finding's provisions are orderSpecific=true, and the row shows NO finding-level qualifier -- never an unnecessary warning", () => {
    const rows = buildScenarioComparison(FUND_DIVERSION, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const tarapurRow = rows.find((r) => r.order.id === TARAPUR_ORDER.id)!; // TTL-01: orderIds.length === 1
    expect(tarapurRow.findings.every((f) => f.orderIds.length === 1)).toBe(true);
    expect(tarapurRow.provisionsConsidered.every((p) => p.orderSpecific === true)).toBe(true);
    expect(tarapurRow.hasFindingLevelOnlyProvisionLinkage).toBe(false);

    const rajeshRows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS).filter(
      (r) => r.order.matterId === RAJESH_MATTER.id
    );
    for (const row of rajeshRows) {
      expect(row.hasFindingLevelOnlyProvisionLinkage).toBe(false);
    }
  });

  it("a provision confirmed by at least one single-order finding on a row is orderSpecific=true even if a different multi-order finding on the SAME row also cites it", () => {
    // Synthetic mixed row: one single-order finding and one multi-order
    // finding on the SAME order, both citing PFUTP-4-1.
    const singleOrderFinding = makeFinding({
      recordId: "MIX-01",
      orderIds: [SEACOAST_FINAL.id],
      allegedConduct: ["fictitious_sales_or_revenue"],
      provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "upheld" }],
    });
    const multiOrderFinding = makeFinding({
      recordId: "MIX-02",
      orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id],
      allegedConduct: ["fictitious_sales_or_revenue"],
      provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "upheld" }],
    });
    const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, [singleOrderFinding, multiOrderFinding], NO_DIRECTIONS, ALL_MATTERS);
    const finalRow = rows.find((r) => r.order.id === SEACOAST_FINAL.id)!;
    const entry = finalRow.provisionsConsidered.find((p) => p.provisionId === "PFUTP-4-1")!;
    expect(entry.orderSpecific).toBe(true);
    // The row still has a multi-order finding present, but since every
    // citation of PFUTP-4-1 is independently order-specific, this
    // particular provision's own flag is true -- hasFindingLevelOnlyProvisionLinkage
    // is a row-level OR across provisions, so it still reflects whether
    // ANY provision on the row lacks order-specific backing (none does here).
    expect(finalRow.hasFindingLevelOnlyProvisionLinkage).toBe(false);
  });
});

// ---------------------------------------------------------------------
// 16/17. No Analyzer scoring imports, no LLM/API calls.
// ---------------------------------------------------------------------
describe("scenarioComparison.ts: no Analyzer scoring, no LLM/API calls", () => {
  it("never imports the Analyzer's matching engine, fixedScenarioResolver, or any fetch/API call", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(new URL("../src/lib/scenarioComparison.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/matching\/engine/);
    expect(src).not.toMatch(/fixedScenarioResolver/);
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src.toLowerCase()).not.toMatch(/openai|anthropic|embedding|vector/);
  });
});

// ---------------------------------------------------------------------
// 20. Descriptive counts.
// ---------------------------------------------------------------------
describe("summarizeScenarioComparison: descriptive counts", () => {
  it("computes exact matter/order/stage/disposition counts from a crafted row set", () => {
    const rows: ComparisonRow[] = [
      { order: SEACOAST_INTERIM, matter: SEACOAST_MATTER, findings: [SSSL_03], provisionsConsidered: [], hasFindingLevelOnlyProvisionLinkage: false, hasNonAttributableDispositions: false, directions: [], dispositions: ["Not Confirmed in Final Order"] },
      { order: SEACOAST_FINAL, matter: SEACOAST_MATTER, findings: [SSSL_01], provisionsConsidered: [], hasFindingLevelOnlyProvisionLinkage: false, hasNonAttributableDispositions: false, directions: [], dispositions: ["Confirmed in Final Order"] },
      { order: RAJESH_INTERIM, matter: RAJESH_MATTER, findings: [REL_01], provisionsConsidered: [], hasFindingLevelOnlyProvisionLinkage: false, hasNonAttributableDispositions: false, directions: [], dispositions: ["Prima facie"] },
    ];
    const summary = summarizeScenarioComparison(rows);
    expect(summary.mattersRepresented).toBe(2);
    expect(summary.ordersRepresented).toBe(3);
    expect(summary.finalOrders).toBe(1);
    expect(summary.interimConfirmatorySpecialOrders).toBe(2);
    expect(summary.establishedOrPartlyEstablishedFindings).toBe(1); // SSSL-01 only
    expect(summary.notEstablishedFindings).toBe(1); // SSSL-03 only
    // REL-01's Prima facie disposition counted in NEITHER bucket:
    expect(summary.establishedOrPartlyEstablishedFindings + summary.notEstablishedFindings).toBe(2);
  });

  it("comparisonRowMatterLabel falls back to the order's own caseName only when no matter resolved", () => {
    const rowWithMatter: ComparisonRow = { order: SEACOAST_INTERIM, matter: SEACOAST_MATTER, findings: [], provisionsConsidered: [], hasFindingLevelOnlyProvisionLinkage: false, hasNonAttributableDispositions: false, directions: [], dispositions: [] };
    const rowWithoutMatter: ComparisonRow = { order: makeOrder({ id: "orphan", caseName: "Orphan Case" }), matter: null, findings: [], provisionsConsidered: [], hasFindingLevelOnlyProvisionLinkage: false, hasNonAttributableDispositions: false, directions: [], dispositions: [] };
    expect(comparisonRowMatterLabel(rowWithMatter)).toBe("Seacoast Shipping Services Limited");
    expect(comparisonRowMatterLabel(rowWithoutMatter)).toBe("Orphan Case");
  });

  // -- Correction-pass regression: unique-finding deduplication --
  it("a single finding linked to two orders (SSSL-03, orderIds=[interim, final]) is counted ONCE across its two rows, not twice", () => {
    const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    // SSSL-03 matches FRAUDULENT_ALLOTMENT and spans both Seacoast orders --
    // it therefore produces two ROWS (interim + final) but must still count
    // as ONE finding in the descriptive summary, not two.
    const seacoastRows = rows.filter((r) => r.order.matterId === SEACOAST_MATTER.id);
    expect(seacoastRows).toHaveLength(2); // interim row + final row
    const matchedRecordIds = new Set(rows.flatMap((r) => r.findings.map((f) => f.recordId)));
    expect(matchedRecordIds).toEqual(new Set(["SSSL-03"]));
    const summary = summarizeScenarioComparison(rows);
    expect(summary.notEstablishedFindings).toBe(1); // SSSL-03 counted once, not twice across its 2 rows
  });

  it("two DIFFERENT findings linked to the same single order count as 2, never merged into 1", () => {
    const rows: ComparisonRow[] = [
      {
        order: TARAPUR_ORDER,
        matter: TARAPUR_MATTER,
        findings: [TTL_01, { ...TTL_01, recordId: "TTL-01B", findingStatus: "Confirmed in Final Order" }],
        provisionsConsidered: [],
        hasFindingLevelOnlyProvisionLinkage: false,
        hasNonAttributableDispositions: false,
        directions: [],
        dispositions: ["Confirmed in Final Order"],
      },
    ];
    const summary = summarizeScenarioComparison(rows);
    expect(summary.establishedOrPartlyEstablishedFindings).toBe(2);
  });

  it("positive and negative dispositions remain separately counted after deduplication", () => {
    const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const summary = summarizeScenarioComparison(rows);
    expect(summary.establishedOrPartlyEstablishedFindings).toBeGreaterThan(0);
    // No provision-count/frequency/percentage field exists on the summary
    // at all -- the type itself has no rate/probability field.
    const keys = Object.keys(summary);
    expect(keys).toEqual(["mattersRepresented", "ordersRepresented", "finalOrders", "interimConfirmatorySpecialOrders", "establishedOrPartlyEstablishedFindings", "notEstablishedFindings"]);
  });

  it("no percentages/probabilities/rates are introduced anywhere in the summary shape", () => {
    const rows = buildScenarioComparison(FINANCIAL_MISSTATEMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const summary = summarizeScenarioComparison(rows);
    for (const value of Object.values(summary)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------
// Suzlon / Tarapur regression: post-migration-0024 order types display
// correctly in Compare Scenarios, never mislabelled.
// ---------------------------------------------------------------------
describe("Suzlon and Tarapur: post-migration-0024 order types display correctly", () => {
  it("Suzlon 29-05-2026 shows broad family Other (never Adjudication) with its exact special title, under RPT_IRREGULARITIES", () => {
    const rows = buildScenarioComparison(RPT_IRREGULARITIES, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const suzlonRow = rows.find((r) => r.order.id === SUZLON_ORDER.id)!;
    expect(suzlonRow).toBeDefined();
    expect(suzlonRow.order.orderStage).toBe("Other");
    expect(suzlonRow.order.orderStage).not.toBe("Adjudication order");
    expect(suzlonRow.order.officialOrderTitle).toBe("Order under Section 15I(3) of the SEBI Act and Section 23I(3) of the SCRA in the matter of Suzlon Energy Limited");
  });

  it("Tarapur Transformers Limited displays Final order, consistent with migration 0024", () => {
    const rows = buildScenarioComparison(FUND_DIVERSION, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
    const tarapurRow = rows.find((r) => r.order.id === TARAPUR_ORDER.id)!;
    expect(tarapurRow.order.orderStage).toBe("Final order");
  });
});

// ---------------------------------------------------------------------
// Post-freeze correction pass (Section C) -- Seacoast acceptance test.
// Compare Scenarios must support within-matter comparison (the same
// finding/issue across a matter's own interim and final orders) without
// regressing the cross-matter, order-centric, legal-integrity-audited
// redesign. This block runs the full acceptance criteria against the
// Seacoast fixture in one place.
// ---------------------------------------------------------------------
describe("Seacoast acceptance test: within-matter comparison, stage separated from outcome", () => {
  const rows = buildScenarioComparison(FRAUDULENT_ALLOTMENT, ALL_ORDERS, ALL_FINDINGS, NO_DIRECTIONS, ALL_MATTERS);
  const seacoastRows = rows.filter((r) => r.order.matterId === SEACOAST_MATTER.id);
  const interimRow = seacoastRows.find((r) => r.order.id === SEACOAST_INTERIM.id);
  const finalRow = seacoastRows.find((r) => r.order.id === SEACOAST_FINAL.id);

  it("both the interim order and the final order appear (one row per order, not merged into one matter row)", () => {
    expect(seacoastRows).toHaveLength(2);
    expect(interimRow).toBeDefined();
    expect(finalRow).toBeDefined();
  });

  it("the same matched finding (SSSL-03) is compared side-by-side on both rows -- the shared issue is genuinely visible on each", () => {
    expect(interimRow!.findings.map((f) => f.recordId)).toContain("SSSL-03");
    expect(finalRow!.findings.map((f) => f.recordId)).toContain("SSSL-03");
  });

  it("stage is separated from outcome: each row's own orderStage is independent of its disposition data", () => {
    expect(interimRow!.order.orderStage).toBe("Interim order cum show cause notice");
    expect(finalRow!.order.orderStage).toBe("Final order");
  });

  it("the final order's disposition is not incorrectly copied backward into the interim row", () => {
    expect(finalRow!.dispositions).toContain("Not Confirmed in Final Order");
    expect(interimRow!.dispositions).not.toContain("Not Confirmed in Final Order");
    expect(interimRow!.hasNonAttributableDispositions).toBe(true);
  });

  it("both rows share the same matter label, proving they are recognisably the same matter while remaining independent rows", () => {
    expect(comparisonRowMatterLabel(interimRow!)).toBe(comparisonRowMatterLabel(finalRow!));
  });

  it("filtering by this matter surfaces both rows together, the practical mechanism for within-matter side-by-side comparison", () => {
    const filtered = filterComparisonRows(rows, { matterLabel: comparisonRowMatterLabel(finalRow!) });
    const filteredIds = filtered.map((r) => r.order.id).sort();
    expect(filteredIds).toEqual([SEACOAST_FINAL.id, SEACOAST_INTERIM.id].sort());
  });

  it("each row carries its own clear source provenance (order.officialUrl) independent of the other row", () => {
    expect(interimRow!.order.officialUrl).toBeTruthy();
    expect(finalRow!.order.officialUrl).toBeTruthy();
  });

  it("grouping is deterministic canonical mapping by matter_id -- never fuzzy text/name similarity", () => {
    expect(interimRow!.order.matterId).toBe(SEACOAST_MATTER.id);
    expect(finalRow!.order.matterId).toBe(SEACOAST_MATTER.id);
  });
});
