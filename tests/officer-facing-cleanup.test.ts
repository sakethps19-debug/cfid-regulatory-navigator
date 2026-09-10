// Officer walkthrough cleanup pass — Home (Recent Orders), order gist
// posture/pipeline-language stripping, and application-wide removal of
// internal corpus-research-pipeline status from officer-facing screens
// (Parts 1, 2, 3, 9). Admin's own equivalents are asserted present, not
// deleted (Part 2/8: "move/retain in Admin", never destroy the data).
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { pickRecentOrders } from "@/lib/pickRecentOrders";
import { orderGist, stripPipelineLanguage } from "@/lib/orderGist";
import type { Order, ScenarioFinding } from "@/types/domain";

function makeOrder(overrides: Partial<Order> & { id: string }): Order {
  return {
    caseName: "Mock Case Limited",
    orderStage: "Interim order",
    orderDate: "2024-01-01",
    orderNumber: "WTM/AB/CFID/1/2024-25",
    authority: "SEBI",
    noticeesCount: 1,
    officialUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
    cfidVerified: true,
    cfidVerificationBasis: "cfid_tag_in_order_number",
    proceduralStatus: "Legally reviewed (deep-analyzed)",
    processingStage: "legally_reviewed",
    retrievalStatus: "retrieved",
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
    orderIds: ["order-1"],
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

describe("Home: Recent Orders — one entry per order, strict chronology", () => {
  it("an order that produced multiple scenario findings still appears exactly once (order, not finding, is the unit)", () => {
    // pickRecentOrders operates on Order[], not ScenarioFinding[] — the
    // Home page itself never fans an order out into one card per finding
    // it produced (Seacoast's 5 findings all point at 2 orders, not 5
    // separate order rows). This is the structural guarantee: however many
    // findings reference an order, that order contributes exactly one
    // element to the input array and exactly one row to the output.
    const orders = [makeOrder({ id: "seacoast-final", caseName: "Seacoast Shipping Services Limited", orderDate: "2025-09-24" })];
    const recent = pickRecentOrders(orders);
    expect(recent).toHaveLength(1);
    expect(recent.filter((o) => o.id === "seacoast-final")).toHaveLength(1);
  });

  it("sorts newest to oldest by orderDate, no status priority", () => {
    const orders = [
      makeOrder({ id: "old", orderDate: "2022-01-01", orderStage: "Final order" }),
      makeOrder({ id: "new", orderDate: "2026-01-01", orderStage: "Interim order" }),
      makeOrder({ id: "mid", orderDate: "2024-01-01" }),
    ];
    const recent = pickRecentOrders(orders);
    expect(recent.map((o) => o.id)).toEqual(["new", "mid", "old"]);
  });

  it("excludes orders with no orderDate and caps at 5", () => {
    const dated = Array.from({ length: 7 }, (_, i) => makeOrder({ id: `o${i}`, orderDate: `2024-01-0${i + 1}` }));
    const undated = makeOrder({ id: "undated", orderDate: null });
    const recent = pickRecentOrders([undated, ...dated]);
    expect(recent).toHaveLength(5);
    expect(recent.find((o) => o.id === "undated")).toBeUndefined();
  });

  it("procedural posture (orderStage) is unchanged by presentation logic — never rewritten to imply a different stage", () => {
    const interim = makeOrder({ id: "i1", orderStage: "Interim order cum show cause notice", orderDate: "2024-01-01" });
    const [recent] = pickRecentOrders([interim]);
    expect(recent.orderStage).toBe("Interim order cum show cause notice");
  });
});

describe("orderGist: pipeline-language stripping and posture", () => {
  it("strips a trailing 'AI-extracted...not yet reviewed by a CFID officer' sentence from scope_note", () => {
    const order = makeOrder({
      id: "o1",
      scopeNote: "Interim order alleging fund diversion via shell entities. AI-extracted; not yet reviewed by a CFID officer.",
    });
    const gist = orderGist(order, []);
    expect(gist).not.toMatch(/ai-extracted/i);
    expect(gist).not.toMatch(/cfid officer/i);
    expect(gist).toContain("Interim order alleging fund diversion via shell entities.");
  });

  it("strips a variant naming the raw human_legal_review_completed field", () => {
    const order = makeOrder({
      id: "o1",
      scopeNote: "Fund diversion findings. AI-extracted from the primary source document (human_legal_review_completed = false).",
    });
    const gist = orderGist(order, []);
    expect(gist).not.toMatch(/human_legal_review_completed/i);
  });

  it("falls back to the order's own findings' curated category labels when scope_note is absent", () => {
    const order = makeOrder({ id: "o1", scopeNote: null });
    const findings = [
      makeFinding({ recordId: "F-01", category: "Fictitious sales or assets" }),
      makeFinding({ recordId: "F-02", category: "Preferential allotment / conversion misuse" }),
      makeFinding({ recordId: "F-03", category: "Fictitious sales or assets" }), // duplicate, deduplicated
    ];
    const gist = orderGist(order, findings);
    expect(gist).toBe("Fictitious sales or assets; Preferential allotment / conversion misuse");
  });

  it("returns null (never invented text) when neither scope_note nor any finding category exists", () => {
    const order = makeOrder({ id: "o1", scopeNote: null });
    expect(orderGist(order, [])).toBeNull();
    expect(orderGist(order, [makeFinding({ recordId: "F-01", category: null })])).toBeNull();
  });

  it("stripPipelineLanguage is exported standalone for callers with only a raw string (e.g. Case Library rows without a findings join)", () => {
    expect(stripPipelineLanguage("Real content. AI-extracted; not yet reviewed by a CFID officer.")).toBe("Real content.");
    expect(stripPipelineLanguage("Real content only.")).toBe("Real content only.");
  });
});

describe("Application-wide removal of officer-facing corpus-verification/research-pipeline language", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf-8");

  it("Law Library landing (LawLibraryClient) no longer shows 'X of Y officially verified' or a per-provision verification badge", () => {
    const src = read("src/components/LawLibraryClient.tsx");
    expect(src).not.toMatch(/officially verified/i);
    expect(src).not.toContain("VERIFICATION_STATUS_SHORT_LABELS");
    expect(src).not.toContain("computeVerificationSummary");
  });

  it("Law Library landing copy no longer advertises the official-source-only rule as marketing copy", () => {
    const src = read("src/app/(app)/law-library/page.tsx");
    expect(src).not.toMatch(/law-firm articles/i);
  });

  it("Law Library instrument detail page no longer shows verification-status counts or per-card badges", () => {
    const src = read("src/app/(app)/law-library/[regulator]/[instrumentId]/page.tsx");
    expect(src).not.toMatch(/officially verified/i);
    expect(src).not.toContain("verifiedCount");
    expect(src).not.toMatch(/Requires verification/);
  });

  it("Provision detail page no longer shows a 'Current-text verification status' field or per-version verified/unverified badge", () => {
    const src = read("src/app/(app)/provisions/[id]/page.tsx");
    expect(src).not.toMatch(/Current-text verification status/);
    expect(src).not.toMatch(/Verified against official source/);
    expect(src).not.toMatch(/human.legal.review/i);
  });

  it("Scenario Analyzer no longer renders LegalReviewBadge or FindingMaturityBadge on any result card", () => {
    const src = read("src/components/analyzer/ScenarioAnalyzerClient.tsx");
    expect(src).not.toContain("LegalReviewBadge");
    expect(src).not.toContain("FindingMaturityBadge");
  });

  it("Case Library no longer shows a 'Research status' / 'Detailed research available' column", () => {
    const src = read("src/components/CaseLibraryClient.tsx");
    expect(src).not.toMatch(/Research status/);
    expect(src).not.toMatch(/Detailed research available/);
    expect(src).not.toMatch(/Research available/);
  });

  it("Order Detail page no longer shows the internal 'Procedural status' (processing-pipeline) field", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).not.toMatch(/Procedural status/);
    expect(src).not.toContain("proceduralStatus");
  });

  it("Admin Dashboard still computes and shows official-source verification, provision-verification, human-legal-review, and processing-stage metrics (data preserved, not deleted)", () => {
    const src = read("src/app/(app)/admin/page.tsx");
    expect(src).toMatch(/officially verified|officialLawTextsVerified/i);
    expect(src).toMatch(/human.?legal.?review|humanLegallyReviewed/i);
  });

  it("Admin's data-access layer still exposes the underlying verification fields on Order/ScenarioFinding/LegalProvision (nothing deleted from the domain model)", () => {
    const domain = read("src/types/domain.ts");
    expect(domain).toContain("humanLegalReviewCompleted");
    expect(domain).toContain("processingStage");
    expect(domain).toContain("currentTextVerificationStatus");
  });
});
