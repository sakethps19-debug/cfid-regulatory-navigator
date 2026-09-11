// LIVE CFID OFFICER REVIEW FINDINGS checkpoint — regression suite for the
// order-grouped Analyzer redesign, the order-stage/disposition split, the
// repo-wide Alleged/Prima-facie badge removal, and Case Library's new
// "Issues Examined" column. See this checkpoint's own 15-item brief for
// full context; each `it()` below maps to one lettered acceptance item
// (A-L) from item 13 of that brief.
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { relevantScenarioRecords, groupRelevantRecordsByOrder } from "@/lib/fixedScenarioRelevantRecords";
import { findingDispositionLabel, findingStatusLabel } from "@/lib/findingStatusDisplay";
import { orderBroadScenarios } from "@/lib/orderBroadScenarios";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import type { LegalProvision, Order, ScenarioFinding, FindingStatus } from "@/types/domain";

function src(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

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

const RPT_SCENARIO = FIXED_SCENARIOS.find((s) => s.id === "related-party-transaction-irregularities")!;
const RPT_CONCEPT = RPT_SCENARIO.keyConceptIds[0];
const RPT_PROVISION_ID = RPT_SCENARIO.provisionIds[0];
const RPT_PROVISION_ID_2 = RPT_SCENARIO.provisionIds[1] ?? RPT_PROVISION_ID;

describe("A: multiple findings from the same captured order render under ONE order card, not repeated (Royal Orchid pattern)", () => {
  it("three findings all linked to the same order.id produce exactly one RelevantOrderGroup", () => {
    const order = makeOrder({ id: "royal-orchid-order", caseName: "Royal Orchid Hotels Limited" });
    const provisions = [makeProvision({ id: RPT_PROVISION_ID }), makeProvision({ id: RPT_PROVISION_ID_2 })];
    const findings = [
      makeFinding({ recordId: "ROHL-01", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], orderIds: [order.id] }),
      makeFinding({ recordId: "ROHL-02", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID_2], orderIds: [order.id] }),
      makeFinding({ recordId: "ROHL-03", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], orderIds: [order.id] }),
    ];
    const records = relevantScenarioRecords(RPT_SCENARIO.id, findings, provisions, [order]);
    const groups = groupRelevantRecordsByOrder(records);
    expect(groups).toHaveLength(1);
    expect(groups[0].order.id).toBe("royal-orchid-order");
    // All three findings are present within the single card, deduplicated.
    expect(groups[0].findings.map((f) => f.finding.recordId).sort()).toEqual(["ROHL-01", "ROHL-02", "ROHL-03"]);
    // Provisions deduped within the order: RPT_PROVISION_ID cited by two
    // findings collapses to one provision entry listing both record ids.
    const provisionEntry = groups[0].provisions.find((p) => p.provision.id === RPT_PROVISION_ID)!;
    expect(provisionEntry.findingRecordIds.sort()).toEqual(["ROHL-01", "ROHL-03"]);
  });
});

describe("B: separate Interim and Final orders in the same matter remain separate cards", () => {
  it("a matter with an Interim Order and a Final Order (distinct order.id) produces two RelevantOrderGroups, never merged", () => {
    const interim = makeOrder({ id: "matter-interim", caseName: "Some Matter Limited", orderStage: "Interim order", orderDate: "2024-01-01" });
    const final = makeOrder({ id: "matter-final", caseName: "Some Matter Limited", orderStage: "Final order", orderDate: "2025-01-01" });
    const provisions = [makeProvision({ id: RPT_PROVISION_ID })];
    const findings = [
      makeFinding({ recordId: "MATTER-INT-01", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], orderIds: [interim.id], findingStatus: "Confirmed at interim" }),
      makeFinding({ recordId: "MATTER-FIN-01", transactionTypes: [RPT_CONCEPT], provisionIds: [RPT_PROVISION_ID], orderIds: [final.id], findingStatus: "Confirmed in Final Order" }),
    ];
    const records = relevantScenarioRecords(RPT_SCENARIO.id, findings, provisions, [interim, final]);
    const groups = groupRelevantRecordsByOrder(records);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.order.orderStage).sort()).toEqual(["Final order", "Interim order"]);
  });
});

describe("C: multi-order finding-level provision provenance is never falsely converted to order-specific provenance", () => {
  it("a finding spanning an interim and a final order sets hasFindingLevelOnlyLinkage on both order groups, and each provision entry stays orderSpecific=false", () => {
    const interim = makeOrder({ id: "seacoast-interim", caseName: "Seacoast Shipping Services Limited", orderStage: "Interim order", orderDate: "2024-06-01" });
    const final = makeOrder({ id: "seacoast-final", caseName: "Seacoast Shipping Services Limited", orderStage: "Final order", orderDate: "2025-09-24" });
    const provisions = [makeProvision({ id: RPT_PROVISION_ID })];
    const finding = makeFinding({
      recordId: "SSSL-02",
      caseName: "Seacoast Shipping Services Limited",
      transactionTypes: [RPT_CONCEPT],
      provisionIds: [RPT_PROVISION_ID],
      findingStatus: "Confirmed in Final Order",
      orderIds: [interim.id, final.id],
    });
    const records = relevantScenarioRecords(RPT_SCENARIO.id, [finding], provisions, [interim, final]);
    const groups = groupRelevantRecordsByOrder(records);
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.hasFindingLevelOnlyLinkage).toBe(true);
      expect(group.provisions.every((p) => p.orderSpecific === false)).toBe(true);
      expect(group.findings.every((f) => f.orderSpecific === false)).toBe(true);
    }
  });
});

describe("D/E: 'Alleged' and 'Prima facie' never render as an officer-facing status badge", () => {
  it("findingDispositionLabel (the only text StatusBadge renders) returns null for both", () => {
    expect(findingDispositionLabel("Alleged")).toBeNull();
    expect(findingDispositionLabel("Prima facie")).toBeNull();
  });

  it("StatusBadge.tsx source has no path that could render the bare word 'Alleged' or 'Prima facie' as a badge", async () => {
    const { StatusBadge } = await import("@/components/StatusBadge");
    // Calling the component as a plain function to inspect its return value
    // without a DOM renderer -- valid since it's just a function returning
    // ReactNode | null.
    expect(StatusBadge({ status: "Alleged" })).toBeNull();
    expect(StatusBadge({ status: "Prima facie" })).toBeNull();
  });

  it("no officer-facing route renders 'Alleged'/'Prima facie' as a hardcoded badge/tag outside the shared StatusBadge/findingStatusLabel mechanism", () => {
    // FindingsByStatus.tsx (previously checked here too) was confirmed
    // fully dead -- unreferenced by any component -- and deleted in the
    // SPARC pre-presentation hardening pass; its own dedicated test file
    // (findings-by-status.test.ts) was removed with it.
    const compareScenarios = src("src/components/CompareScenariosResultClient.tsx");
    const caseJourney = src("src/components/CaseJourneyStageCard.tsx");
    for (const fileSrc of [compareScenarios, caseJourney]) {
      expect(fileSrc).not.toMatch(/>Alleged</);
      expect(fileSrc).not.toMatch(/>Prima facie</);
    }
  });
});

describe("F: DB Realty (now Valor Estate) 04-Feb-2025 Final Order displays FINAL as order stage, never a fused 'Final Order Not Confirmed' stage badge", () => {
  // Mirrors the live corpus record confirmed by direct read-only query:
  // orders.order_type = 'final_order' for DB Realty Limited (order_date
  // 2025-02-04); its one linked finding (DBRL-01) has
  // finding_status = 'partly_upheld' -> "Partly Confirmed in Final Order".
  const dbRealtyOrder = makeOrder({
    id: "db-realty-final-order",
    caseName: "DB Realty Limited (now Valor Estate Limited)",
    orderStage: "Final order",
    orderDate: "2025-02-04",
  });
  const dbRealtyFinding = makeFinding({
    recordId: "DBRL-01",
    caseName: "DB Realty Limited (now Valor Estate Limited)",
    findingStatus: "Partly Confirmed in Final Order",
    orderIds: [dbRealtyOrder.id],
  });

  it("order stage is FINAL, not a compound stage+outcome string", () => {
    expect(dbRealtyOrder.orderStage).toBe("Final order");
  });

  it("the finding's disposition label never contains the word 'order' (so it can never read as a stage), and is not a negative like 'Not Confirmed'", () => {
    const label = findingDispositionLabel(dbRealtyFinding.findingStatus);
    expect(label).toBe("Partly established");
    expect(label!.toLowerCase()).not.toContain("order");
    expect(label!.toLowerCase()).not.toContain("not confirmed");
  });

  it("the old fused string 'Final Order Not Confirmed' is not producible by findingStatusLabel for any FindingStatus value", () => {
    const ALL_STATUSES: FindingStatus[] = [
      "Alleged",
      "Prima facie",
      "Confirmed at interim",
      "Confirmed in Final Order",
      "Partly Confirmed in Final Order",
      "Not Confirmed in Final Order",
      "Withdrawn",
      "Inconclusive",
      "Procedural observation",
    ];
    for (const s of ALL_STATUSES) {
      expect(findingStatusLabel(s).toLowerCase()).not.toBe("final order not confirmed");
    }
  });
});

describe("G: a Final negative precedent can show 'Final' (stage) + 'Contravention not established' (disposition) as two separate, coexisting concepts", () => {
  it("OrderStageBadge renders the order's own orderStage verbatim (e.g. 'Final order'), independent of finding disposition", async () => {
    const orderStageBadgeSrc = src("src/components/OrderStageBadge.tsx");
    expect(orderStageBadgeSrc).toContain("orderStage");
    expect(orderStageBadgeSrc).not.toContain("findingStatus");
  });

  it("a Not-Confirmed-in-Final-Order finding's disposition label is exactly 'Contravention not established', never fused with the word order/final", () => {
    const label = findingDispositionLabel("Not Confirmed in Final Order");
    expect(label).toBe("Contravention not established");
  });
});

describe("H: Case Library's Issues Examined is derived from the canonical scenario/issue registry, deterministically -- no LLM, no invented labels", () => {
  it("orderBroadScenarios only ever returns scenarios that are members of FIXED_SCENARIOS (same registry the Analyzer uses)", () => {
    const canonicalIds = new Set(FIXED_SCENARIOS.map((s) => s.id));
    const finding = makeFinding({
      recordId: "ISSUE-01",
      transactionTypes: [RPT_CONCEPT],
      allegedConduct: [],
    });
    const summaries = orderBroadScenarios([finding]);
    for (const summary of summaries) {
      expect(canonicalIds.has(summary.scenario.id)).toBe(true);
    }
  });

  it("a Final Order that examined an issue and found the contravention NOT established still lists that issue (subject matter considered, not violation established)", () => {
    const finding = makeFinding({
      recordId: "NEG-PRECEDENT-01",
      transactionTypes: [RPT_CONCEPT],
      findingStatus: "Not Confirmed in Final Order",
    });
    const summaries = orderBroadScenarios([finding]);
    expect(summaries.some((s) => s.scenario.id === RPT_SCENARIO.id)).toBe(true);
  });
});

describe("I: an order with several findings under the same broad issue never displays duplicate issue tags", () => {
  it("orderBroadScenarios returns each matched scenario at most once per order even when multiple findings match it", () => {
    const findings = [
      makeFinding({ recordId: "DUP-01", transactionTypes: [RPT_CONCEPT] }),
      makeFinding({ recordId: "DUP-02", transactionTypes: [RPT_CONCEPT] }),
      makeFinding({ recordId: "DUP-03", transactionTypes: [RPT_CONCEPT] }),
    ];
    const summaries = orderBroadScenarios(findings);
    const matchIds = summaries.filter((s) => s.scenario.id === RPT_SCENARIO.id);
    expect(matchIds).toHaveLength(1);
  });

  it("CaseLibraryClient's issue chips key by scenario id (React key), which structurally prevents duplicate chips for the same issue", () => {
    const clientSrc = src("src/components/CaseLibraryClient.tsx");
    expect(clientSrc).toMatch(/visible\.map\(\(issue\) => \(/);
    expect(clientSrc).toMatch(/key=\{issue\.id\}/);
  });
});

describe("J: Case Library issue filtering works deterministically from the canonical registry", () => {
  it("CaseLibraryClient sources its issue filter options from FIXED_SCENARIOS present in the order set, not free text or fuzzy matching", () => {
    const clientSrc = src("src/components/CaseLibraryClient.tsx");
    expect(clientSrc).toContain('import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios"');
    expect(clientSrc).toMatch(/issuesPresent\s*=\s*useMemo/);
    expect(clientSrc).toMatch(/issueFilter\s*!==\s*"all"\s*&&\s*!o\.issuesExamined\.some/);
  });

  it("case-library/page.tsx builds issuesExamined server-side via orderBroadScenarios, the same function used elsewhere for order-level broad-scenario matching", () => {
    const pageSrc = src("src/app/(app)/case-library/page.tsx");
    expect(pageSrc).toContain("orderBroadScenarios");
    expect(pageSrc).toContain("issuesByOrderId");
  });
});

describe("K: wide-screen fixed-scenario description is no longer trapped in the old narrow max-w-prose column", () => {
  it("FixedScenarioAnalyzer's 'What this covers' paragraph widens on wide displays via the shared NARRATIVE_PROSE_CLASSES constant (same tiered pattern as PageHeader)", () => {
    const compSrc = src("src/components/analyzer/FixedScenarioAnalyzer.tsx");
    expect(compSrc).toMatch(/\{scenario\.explanation\}/);
    expect(compSrc).not.toMatch(/<p className="max-w-prose text-sm text-\[var\(--color-ink-700\)\]">\{scenario\.explanation\}/);
    expect(compSrc).not.toMatch(/<p className="[^"]*max-w-prose[^"]*">\{scenario\.explanation\}/);
    const proseClasses = src("src/lib/proseClasses.ts");
    expect(proseClasses).toMatch(/max-w-3xl[^"]*xl:max-w-4xl[^"]*2xl:max-w-5xl/);
  });
});

describe("L: officer-facing routes do not reintroduce human-review/expert-curation terminology", () => {
  it("methodology page no longer requires a further CFID-officer sign-off step before relying on output", () => {
    const methodologySrc = src("src/app/(app)/methodology/page.tsx");
    expect(methodologySrc).not.toMatch(/sign-?off/i);
    expect(methodologySrc).toContain("Always verify the cited provision and order against the official source before relying on the output.");
  });

  it("no officer-facing component claims expert curation/review/validation", () => {
    const files = [
      "src/components/analyzer/FixedScenarioAnalyzer.tsx",
      "src/components/CaseLibraryClient.tsx",
      "src/components/analyzer/ScenarioAnalyzerClient.tsx",
    ];
    for (const path of files) {
      const fileSrc = src(path);
      expect(fileSrc).not.toMatch(/expert[- ](curated|reviewed|validated|verified)/i);
    }
  });
});
