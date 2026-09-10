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
