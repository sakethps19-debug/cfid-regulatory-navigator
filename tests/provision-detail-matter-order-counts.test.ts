// Release-candidate correction: Provision Detail's "How this provision has
// been treated" summary (src/lib/data.ts's getProvisions()) previously
// deduplicated by finding.caseName and labelled the result "orders" -- a
// matter's interim and final orders share one case name, so the count was
// actually a MATTER count mislabelled as an order count, disagreeing with
// the page's own "Historical treatment in captured orders" section, which
// correctly groups by literal order id (groupProvisionFindingsByOrder,
// provisionOrderHistory.ts). Concretely: PFUTP Regulation 4(2)(e) showed
// "Cited in 23 scenario findings across 16 orders" against "across 20
// captured orders" for the very same findings, because 4 of those 16
// matters each contribute two order-stage records (interim + final).
//
// Fixed by resolveMatterKey (matterIdentity.ts), the same three-tier matter
// identity already audited for the Scenario Analyzer's historical-treatment
// view: orders.matter_id, then the linked order's own curated
// normalized_matter_name, then finding.case_name as the true last resort.
// getProvisions() now labels this count "matter(s)", never "order(s)"; the
// genuine per-order count in the historical-treatment section is untouched.
//
// This file tests the exact building block getProvisions() now calls
// (resolveMatterKey) directly, and cross-checks it against the real,
// unmodified per-order grouping function (groupProvisionFindingsByOrder)
// on shared fixtures -- the same two functions the live page's two
// sections are built from -- so a regression in either one, or a future
// drift between them, is caught here rather than only visually.
import { describe, expect, it } from "vitest";
import { resolveMatterKey } from "@/lib/matterIdentity";
import { groupProvisionFindingsByOrder } from "@/lib/provisionOrderHistory";
import type { Order, ScenarioFinding } from "@/types/domain";

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

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; orderIds: string[] }): ScenarioFinding {
  return {
    caseName: "Mock Case Limited",
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: ["PFUTP-4-2-e"],
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

/** Mirrors exactly the aggregation loop getProvisions() runs for one
 * provision id -- the same real, exported resolveMatterKey, on the same
 * findings/ordersById inputs the live page uses. */
function matterCountForProvision(findings: ScenarioFinding[], ordersById: Map<string, Order>, provisionId: string): { count: number; displayNames: string[] } {
  const relevant = findings.filter((f) => f.provisionIds.includes(provisionId));
  const matters = new Map<string, string>();
  for (const finding of relevant) {
    const { key, displayName } = resolveMatterKey(finding, ordersById);
    if (!matters.has(key)) matters.set(key, displayName);
  }
  return { count: matters.size, displayNames: [...matters.values()] };
}

describe("resolveMatterKey: three-tier matter identity", () => {
  it("prefers orders.matter_id when present", () => {
    const order = makeOrder({ id: "o1", matterId: "matter-uuid-1", normalizedMatterName: "Curated Name", caseName: "Raw Case Name" });
    const ordersById = new Map([["o1", order]]);
    const finding = makeFinding({ recordId: "F-01", orderIds: ["o1"], caseName: "Different Raw Name" });
    const resolved = resolveMatterKey(finding, ordersById);
    expect(resolved.basis).toBe("matter_id");
    expect(resolved.key).toBe("matter:matter-uuid-1");
    expect(resolved.displayName).toBe("Curated Name");
  });

  it("falls back to the linked order's own normalized_matter_name when matter_id is absent", () => {
    const order = makeOrder({ id: "o1", matterId: null, normalizedMatterName: "Curated Fallback Name" });
    const ordersById = new Map([["o1", order]]);
    const finding = makeFinding({ recordId: "F-01", orderIds: ["o1"], caseName: "Some Other Text" });
    const resolved = resolveMatterKey(finding, ordersById);
    expect(resolved.basis).toBe("order_metadata_fallback");
    expect(resolved.key).toBe("ordername:curated fallback name");
    expect(resolved.displayName).toBe("Curated Fallback Name");
  });

  it("falls back all the way to finding.case_name when the order has neither matter_id nor normalized_matter_name (an order lacking matter_id)", () => {
    const order = makeOrder({ id: "o1", matterId: null, normalizedMatterName: null });
    const ordersById = new Map([["o1", order]]);
    const finding = makeFinding({ recordId: "F-01", orderIds: ["o1"], caseName: "Last Resort Case Name" });
    const resolved = resolveMatterKey(finding, ordersById);
    expect(resolved.basis).toBe("case_name_fallback");
    expect(resolved.key).toBe("casename:last resort case name");
    expect(resolved.displayName).toBe("Last Resort Case Name");
  });

  it("falls back to case_name when a finding's orderIds reference no order present in the supplied map at all (never silently dropped)", () => {
    const ordersById = new Map<string, Order>();
    const finding = makeFinding({ recordId: "F-01", orderIds: ["unknown-order-id"], caseName: "Orphaned Finding Case Name" });
    const resolved = resolveMatterKey(finding, ordersById);
    expect(resolved.basis).toBe("case_name_fallback");
    expect(resolved.displayName).toBe("Orphaned Finding Case Name");
  });

  it("a finding whose orderIds span an interim and final order of the SAME matter_id resolves to one identical key", () => {
    const interim = makeOrder({ id: "interim", matterId: "matter-x", orderStage: "Interim order" });
    const final = makeOrder({ id: "final", matterId: "matter-x", orderStage: "Final order" });
    const ordersById = new Map([
      ["interim", interim],
      ["final", final],
    ]);
    const finding = makeFinding({ recordId: "F-01", orderIds: ["interim", "final"] });
    const resolved = resolveMatterKey(finding, ordersById);
    expect(resolved.key).toBe("matter:matter-x");
  });
});

describe("Provision Detail matter count vs order count: PFUTP 4(2)(e)-shaped fixture", () => {
  // 3 matters, 4 orders, 5 findings citing PFUTP-4-2-e:
  //  - Matter A (matter_id "matter-a"): interim + final order, 2 findings
  //    (one per order stage) -- the "one matter with multiple order
  //    stages" case.
  //  - Matter B (matter_id "matter-b"): a single final order, 2 findings
  //    on the same order -- "multiple unrelated matters" partner.
  //  - Matter C: no matter_id and no normalized_matter_name at all (an
  //    order lacking matter_id), 1 finding -- exercises the case_name
  //    fallback tier end-to-end.
  const orderAInterim = makeOrder({ id: "a-interim", matterId: "matter-a", orderStage: "Interim order", caseName: "Matter A Limited" });
  const orderAFinal = makeOrder({ id: "a-final", matterId: "matter-a", orderStage: "Final order", caseName: "Matter A Limited" });
  const orderB = makeOrder({ id: "b-final", matterId: "matter-b", orderStage: "Final order", caseName: "Matter B Limited" });
  const orderC = makeOrder({ id: "c-final", matterId: null, normalizedMatterName: null, orderStage: "Final order", caseName: "Matter C Limited" });
  const ordersById = new Map([
    ["a-interim", orderAInterim],
    ["a-final", orderAFinal],
    ["b-final", orderB],
    ["c-final", orderC],
  ]);

  const findings: ScenarioFinding[] = [
    makeFinding({ recordId: "A-INT-01", orderIds: ["a-interim"], caseName: "Matter A Limited" }),
    makeFinding({ recordId: "A-FIN-01", orderIds: ["a-final"], caseName: "Matter A Limited" }),
    makeFinding({ recordId: "B-01", orderIds: ["b-final"], caseName: "Matter B Limited" }),
    makeFinding({ recordId: "B-02", orderIds: ["b-final"], caseName: "Matter B Limited" }),
    makeFinding({ recordId: "C-01", orderIds: ["c-final"], caseName: "Matter C Limited" }),
    // A finding that does NOT cite this provision -- must not be counted
    // by either section.
    makeFinding({ recordId: "UNRELATED-01", orderIds: ["b-final"], provisionIds: ["LODR-23-2"], caseName: "Matter B Limited" }),
  ];

  it("one matter with multiple order stages: Matter A collapses to exactly 1 matter across its interim and final orders", () => {
    const { count, displayNames } = matterCountForProvision(findings, ordersById, "PFUTP-4-2-e");
    expect(displayNames.filter((n) => n === "Matter A Limited")).toHaveLength(1);
    expect(count).toBe(3); // Matter A, Matter B, Matter C -- never 4 (which would double-count Matter A's two order stages)
  });

  it("multiple unrelated matters are each counted once, never merged", () => {
    const { displayNames } = matterCountForProvision(findings, ordersById, "PFUTP-4-2-e");
    expect(new Set(displayNames).size).toBe(displayNames.length); // no duplicate matter entries
    expect(displayNames).toEqual(expect.arrayContaining(["Matter A Limited", "Matter B Limited", "Matter C Limited"]));
  });

  it("an order lacking matter_id (Matter C) still resolves to its own distinct matter via the case_name fallback, not dropped and not merged into another matter", () => {
    const { count, displayNames } = matterCountForProvision(findings, ordersById, "PFUTP-4-2-e");
    expect(displayNames).toContain("Matter C Limited");
    expect(count).toBe(3);
  });

  it("the unrelated finding (different provision) is excluded from both the matter count and the order count", () => {
    const relevantFindings = findings.filter((f) => f.provisionIds.includes("PFUTP-4-2-e"));
    expect(relevantFindings.map((f) => f.recordId)).not.toContain("UNRELATED-01");
    const orderHistory = groupProvisionFindingsByOrder(relevantFindings, ordersById);
    expect(orderHistory.flatMap((e) => e.findings.map((f) => f.finding.recordId))).not.toContain("UNRELATED-01");
  });

  it("consistency between the summary (matter count) and historical-treatment (order count) sections: same 5 findings, matter count < order count exactly because Matter A has two order stages", () => {
    const relevantFindings = findings.filter((f) => f.provisionIds.includes("PFUTP-4-2-e"));
    expect(relevantFindings).toHaveLength(5); // "Cited in 5 scenario findings" -- identical basis for both sections

    const { count: matterCount } = matterCountForProvision(findings, ordersById, "PFUTP-4-2-e");
    const orderHistory = groupProvisionFindingsByOrder(relevantFindings, ordersById);

    expect(matterCount).toBe(3); // matters: A, B, C
    expect(orderHistory).toHaveLength(4); // orders: a-interim, a-final, b-final, c-final
    expect(orderHistory.length).toBeGreaterThan(matterCount);
    expect(orderHistory.length - matterCount).toBe(1); // exactly one matter (A) contributes an extra order stage
  });
});
