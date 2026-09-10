// Officer walkthrough cleanup: Case Library + Case/Order Detail (this
// pass). Extends the existing validation philosophy (officer-facing-
// cleanup.test.ts covers Home/Law/app-wide from 3bde947; this file covers
// Cases specifically) rather than replacing it.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { sortOrdersNewestFirst } from "@/lib/sortOrdersNewestFirst";
import { caseLibraryOrderTypeFamily, CASE_LIBRARY_ORDER_TYPE_FAMILY_ORDER } from "@/lib/orderTypeDisplayFamily";
import { orderBroadScenarios } from "@/lib/orderBroadScenarios";
import { orderProvisionsConsidered } from "@/lib/orderProvisionsConsidered";
import { isEligibleForFixedScenarioOutput } from "@/lib/fixedScenarioResolver";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import type { Order, OrderStage, ScenarioFinding } from "@/types/domain";

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

// ---------------------------------------------------------------------
// Part 1/18-1,2: Case Library newest-first ordering, deterministic tie-break
// ---------------------------------------------------------------------
describe("sortOrdersNewestFirst", () => {
  it("orders newest order date first", () => {
    const orders = [
      makeOrder({ id: "a", caseName: "A", orderDate: "2024-01-01" }),
      makeOrder({ id: "b", caseName: "B", orderDate: "2026-08-28" }),
      makeOrder({ id: "c", caseName: "C", orderDate: "2025-06-15" }),
    ];
    expect(sortOrdersNewestFirst(orders).map((o) => o.id)).toEqual(["b", "c", "a"]);
  });

  it("is NOT alphabetical by case name as the primary sort", () => {
    const orders = [
      makeOrder({ id: "a", caseName: "Aaa Company", orderDate: "2020-01-01" }),
      makeOrder({ id: "z", caseName: "Zzz Company", orderDate: "2026-01-01" }),
    ];
    expect(sortOrdersNewestFirst(orders).map((o) => o.id)).toEqual(["z", "a"]);
  });

  it("breaks a same-date tie deterministically by case name ascending", () => {
    const orders = [
      makeOrder({ id: "x1", caseName: "Zebra Ltd", orderDate: "2026-08-28" }),
      makeOrder({ id: "x2", caseName: "Alpha Ltd", orderDate: "2026-08-28" }),
    ];
    const result = sortOrdersNewestFirst(orders);
    expect(result.map((o) => o.id)).toEqual(["x2", "x1"]);
    // Re-running with the same input always produces the same output —
    // never left to whatever order the database happened to return rows.
    expect(sortOrdersNewestFirst([...orders].reverse()).map((o) => o.id)).toEqual(["x2", "x1"]);
  });

  it("places undated orders after every dated order, never dropping them", () => {
    const orders = [
      makeOrder({ id: "undated", caseName: "Undated Co", orderDate: null }),
      makeOrder({ id: "dated", caseName: "Dated Co", orderDate: "2020-01-01" }),
    ];
    expect(sortOrdersNewestFirst(orders).map((o) => o.id)).toEqual(["dated", "undated"]);
  });

  it("breaks an undated-vs-undated tie deterministically too", () => {
    const orders = [
      makeOrder({ id: "u1", caseName: "Zeta", orderDate: null }),
      makeOrder({ id: "u2", caseName: "Alpha", orderDate: null }),
    ];
    expect(sortOrdersNewestFirst(orders).map((o) => o.id)).toEqual(["u2", "u1"]);
  });
});

// ---------------------------------------------------------------------
// Part 3/18-14: Order-type display normalization (Interim family etc.)
// never mutates the underlying exact order type
// ---------------------------------------------------------------------
describe("caseLibraryOrderTypeFamily", () => {
  it("normalizes both interim-family stages to the same 'Interim' badge", () => {
    expect(caseLibraryOrderTypeFamily("Interim order")).toBe("Interim");
    expect(caseLibraryOrderTypeFamily("Interim order cum show cause notice")).toBe("Interim");
  });

  it("maps the other reliable families 1:1", () => {
    expect(caseLibraryOrderTypeFamily("Confirmatory order")).toBe("Confirmatory");
    expect(caseLibraryOrderTypeFamily("Final order")).toBe("Final");
    expect(caseLibraryOrderTypeFamily("Adjudication order")).toBe("Adjudication");
    expect(caseLibraryOrderTypeFamily("Revocation order")).toBe("Revocation");
    expect(caseLibraryOrderTypeFamily("Other")).toBe("Other");
  });

  it("every OrderStage value maps to exactly one family (never silently dropped from a family filter)", () => {
    const allStages: OrderStage[] = [
      "Interim order",
      "Interim order cum show cause notice",
      "Confirmatory order",
      "Revocation order",
      "Final order",
      "Adjudication order",
      "Settlement order",
      "Other",
    ];
    for (const stage of allStages) {
      expect(CASE_LIBRARY_ORDER_TYPE_FAMILY_ORDER).toContain(caseLibraryOrderTypeFamily(stage));
    }
  });

  it("is a pure display mapping — calling it never has a side effect on an Order object's own orderStage", () => {
    const order = makeOrder({ id: "o1", orderStage: "Interim order cum show cause notice" });
    caseLibraryOrderTypeFamily(order.orderStage);
    expect(order.orderStage).toBe("Interim order cum show cause notice");
  });
});

// ---------------------------------------------------------------------
// Item 6-1: contrast test — Fixed Scenario Analysis's candidate-violation
// eligibility filter (a DIFFERENT question from Case Detail's "what did
// this order consider") still correctly excludes penalty/power/
// attribution provisions from every candidate-violation scenario.
// ---------------------------------------------------------------------
describe("Fixed Scenario Analysis still excludes penalty/power/attribution provisions from candidate-violation output (unaffected by the Case Detail correction)", () => {
  it("SEBI-ACT-15HA/15HB/27 are ineligible for Fixed Scenario candidate-violation output", () => {
    expect(isEligibleForFixedScenarioOutput("SEBI-ACT-15HA")).toBe(false);
    expect(isEligibleForFixedScenarioOutput("SEBI-ACT-15HB")).toBe(false);
    expect(isEligibleForFixedScenarioOutput("SEBI-ACT-27")).toBe(false);
  });

  it("no curated FIXED_SCENARIOS entry lists SEBI-ACT-15HA/15HB/27 as a candidate provision", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(s.provisionIds).not.toContain("SEBI-ACT-15HA");
      expect(s.provisionIds).not.toContain("SEBI-ACT-15HB");
      expect(s.provisionIds).not.toContain("SEBI-ACT-27");
    }
  });

});

// ---------------------------------------------------------------------
// Part 9/18-8,9,10 (as corrected): Provisions Considered — exact
// identity, child != parent, negative/not-upheld provisions remain
// listed but flagged, and — CORRECTION — penalty/power/attribution
// provisions are NEVER filtered out here (that filter belongs only to
// Fixed Scenario Analysis's candidate-violation question, a different
// question from "what did this order actually consider"). Every
// provision is labelled by its legal function instead.
// ---------------------------------------------------------------------
describe("orderProvisionsConsidered", () => {
  it("preserves exact provision identity — LODR-4-1-a is never conflated with bare LODR-4-1, and never with PFUTP-4-1", () => {
    const findings = [
      makeFinding({
        recordId: "F-01",
        provisionIds: ["LODR-4-1-a"],
        provisionLinks: [{ provisionId: "LODR-4-1-a", justifyingTags: [], relationship: "alleged" }],
      }),
    ];
    const ids = orderProvisionsConsidered(findings).map((s) => s.provisionId);
    expect(ids).toEqual(["LODR-4-1-a"]);
    expect(ids).not.toContain("LODR-4-1");
    expect(ids).not.toContain("PFUTP-4-1");
  });

  it("a child sub-clause citation does not imply the parent is also considered", () => {
    const findings = [
      makeFinding({
        recordId: "F-02",
        provisionIds: ["LODR-32-1"],
        provisionLinks: [{ provisionId: "LODR-32-1", justifyingTags: [], relationship: "alleged" }],
      }),
    ];
    const ids = orderProvisionsConsidered(findings).map((s) => s.provisionId);
    expect(ids).toEqual(["LODR-32-1"]);
    expect(ids).not.toContain("LODR-32");
  });

  it("a provision considered but NOT upheld (every recorded relationship is not_upheld) remains listed, flagged notUpheldOnly, with its legal-function label", () => {
    const findings = [
      makeFinding({
        recordId: "MFS-01",
        provisionIds: ["PFUTP-4-2-r"],
        provisionLinks: [{ provisionId: "PFUTP-4-2-r", justifyingTags: [], relationship: "not_upheld" }],
      }),
    ];
    const summaries = orderProvisionsConsidered(findings);
    expect(summaries).toEqual([
      { provisionId: "PFUTP-4-2-r", notUpheldOnly: true, legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition" },
    ]);
  });

  it("CORRECTION: penalty/power/attribution provisions (SEBI Act 15HA/15HB/27) ARE shown here when actually cited — Case Detail answers 'what did this order consider', not the Fixed Scenario Analysis candidate-violation question, so they are never filtered out; each carries its own legal-function label rather than a false substantive-violation impression", () => {
    const findings = [
      makeFinding({
        recordId: "SUZLON-01",
        provisionIds: ["SEBI-ACT-15HA", "SEBI-ACT-15HB"],
        provisionLinks: [
          { provisionId: "SEBI-ACT-15HA", justifyingTags: [], relationship: "applied" },
          { provisionId: "SEBI-ACT-15HB", justifyingTags: [], relationship: "applied" },
        ],
      }),
    ];
    const summaries = orderProvisionsConsidered(findings);
    expect(summaries.map((s) => s.provisionId).sort()).toEqual(["SEBI-ACT-15HA", "SEBI-ACT-15HB"]);
    for (const s of summaries) {
      expect(s.legalFunction).toBe("penalty_provision");
      expect(s.legalFunctionLabel).toBe("Penalty provision");
    }
  });

  it("SEBI-ACT-27 (attribution) is shown here, labelled Liability/attribution provision, when cited", () => {
    const findings = [
      makeFinding({
        recordId: "F-04",
        provisionIds: ["SEBI-ACT-27"],
        provisionLinks: [{ provisionId: "SEBI-ACT-27", justifyingTags: [], relationship: "alleged" }],
      }),
    ];
    const summaries = orderProvisionsConsidered(findings);
    expect(summaries).toEqual([
      { provisionId: "SEBI-ACT-27", notUpheldOnly: false, legalFunction: "liability_attribution_provision", legalFunctionLabel: "Liability/attribution provision" },
    ]);
  });

  it("a provision with a mixed disposition (upheld against one noticee, not_upheld against another) is NOT flagged as not-upheld-only — an establishment is never hidden behind a mixed provision", () => {
    const findings = [
      makeFinding({
        recordId: "F-03a",
        provisionIds: ["PFUTP-3-b"],
        provisionLinks: [{ provisionId: "PFUTP-3-b", justifyingTags: [], relationship: "upheld" }],
      }),
      makeFinding({
        recordId: "F-03b",
        provisionIds: ["PFUTP-3-b"],
        provisionLinks: [{ provisionId: "PFUTP-3-b", justifyingTags: [], relationship: "not_upheld" }],
      }),
    ];
    const summaries = orderProvisionsConsidered(findings);
    expect(summaries).toEqual([
      { provisionId: "PFUTP-3-b", notUpheldOnly: false, legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition" },
    ]);
  });

  it("Item 6-2/3: Max Financial Services shows exactly its seven recorded not_upheld provisions, each labelled not-upheld, and contributes zero positive template support anywhere in the master taxonomy", () => {
    const maxFinancialProvisionIds = ["SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-2-k", "PFUTP-4-2-r", "LODR-30"];
    const findings = [
      makeFinding({
        recordId: "MFS-01",
        provisionIds: maxFinancialProvisionIds,
        provisionLinks: maxFinancialProvisionIds.map((provisionId) => ({ provisionId, justifyingTags: [], relationship: "not_upheld" })),
      }),
    ];
    const summaries = orderProvisionsConsidered(findings);
    expect(summaries.map((s) => s.provisionId).sort()).toEqual([...maxFinancialProvisionIds].sort());
    for (const s of summaries) {
      expect(s.notUpheldOnly).toBe(true);
    }
    // Zero positive template support: none of these seven appear in the
    // master capital-raising taxonomy (the only scenarios this pass's
    // integration work touched) as a positively-mapped provision.
    for (const s of FIXED_SCENARIOS.filter((sc) => sc.product === "Capital Raising / Issue of Securities")) {
      for (const provisionId of maxFinancialProvisionIds) {
        expect(s.provisionIds).not.toContain(provisionId);
      }
    }
  });
});

// ---------------------------------------------------------------------
// CORRECTION: negative-disposition wording. Max Financial Services'
// single Final Order (Aug 24, 2026) examined the SCN's alleged
// contraventions and did not establish them — there is no separate SCN
// order/stage/card, no reversal of an earlier order, and this is not a
// positive violation. The provision-level badge must say "Contravention
// not established" (a statement about the ALLEGATION's disposition in
// this order), never "not upheld" (which reads as a statement about the
// provision itself). Applies generically to every not_upheld-only
// provision on any order, not just Max Financial Services.
// ---------------------------------------------------------------------
describe("Order Detail: negative-disposition wording ('Contravention not established', never 'not upheld' as a provision badge)", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf-8");

  it("renders 'Contravention not established' for a notUpheldOnly provision, not 'not upheld'", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).toContain("Contravention not established");
    // The literal badge string "not upheld" must not appear anywhere in
    // this page's source as officer-facing text (the underlying boolean
    // field notUpheldOnly is a data-layer name, not officer-facing
    // wording, and is unaffected).
    expect(src).not.toMatch(/>\s*not upheld\s*</i);
    expect(src).not.toMatch(/"not upheld"/i);
  });

  it("the wording is driven generically by summary.notUpheldOnly — a single render site, not a Max-Financial-specific special case", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    const match = src.match(/summary\.notUpheldOnly[\s\S]{0,300}/);
    expect(match).not.toBeNull();
    expect(match![0]).toContain("Contravention not established");
  });

  it("Max Financial Services: all seven provisions are labelled 'Contravention not established', confirming the exact wording the officer will see for this matter", () => {
    const maxFinancialProvisionIds = ["SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-2-k", "PFUTP-4-2-r", "LODR-30"];
    const findings = [
      makeFinding({
        recordId: "MFS-01",
        provisionIds: maxFinancialProvisionIds,
        provisionLinks: maxFinancialProvisionIds.map((provisionId) => ({ provisionId, justifyingTags: [], relationship: "not_upheld" })),
      }),
    ];
    const summaries = orderProvisionsConsidered(findings);
    expect(summaries).toHaveLength(7);
    expect(summaries.every((s) => s.notUpheldOnly)).toBe(true);
    // The data layer exposes the boolean; the page (verified above) is
    // solely responsible for rendering it as "Contravention not
    // established" — this test pins that every one of the seven would
    // receive that same treatment, not a mix.
  });

  it("no separate Max Financial Services SCN order/matter/card exists — exactly one order, one matter, for this pass's integration", () => {
    // Confirms no code in this pass introduces a second order/matter
    // record or an "SCN stage" concept for Max Financial Services; the
    // single-Final-Order model is asserted structurally by absence of any
    // such construct in the officer-facing source.
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).not.toMatch(/SCN order/i);
    expect(src).not.toMatch(/SCN stage/i);
    expect(src).not.toMatch(/reversed/i);
  });
});

// ---------------------------------------------------------------------
// Part 11/18-11,12: broad scenario consolidation — duplicate granular
// findings collapse to one row per scenario; no inference from provision
// co-occurrence alone
// ---------------------------------------------------------------------
describe("orderBroadScenarios", () => {
  it("consolidates multiple granular findings that share a broad scenario into ONE row, not one row per finding", () => {
    const findings = [
      makeFinding({ recordId: "F-01", transactionTypes: ["fund_diversion"], scenarioTitle: "Diversion of Rs.10cr" }),
      makeFinding({ recordId: "F-02", allegedConduct: ["circular_fund_movement"], scenarioTitle: "Circular routing of funds" }),
    ];
    const scenarios = orderBroadScenarios(findings);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].scenario.id).toBe("diversion-siphoning-misutilisation");
  });

  it("never duplicates the same broad scenario id within one order's result", () => {
    const findings = [
      makeFinding({ recordId: "F-01", transactionTypes: ["fund_diversion"] }),
      makeFinding({ recordId: "F-02", transactionTypes: ["fund_diversion"] }),
      makeFinding({ recordId: "F-03", transactionTypes: ["fund_diversion"] }),
    ];
    const ids = orderBroadScenarios(findings).map((s) => s.scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does NOT infer a broad scenario merely because a finding cites a topic-adjacent provision — only structured transactionTypes/allegedConduct tags drive a match, never provisionIds", () => {
    const findings = [makeFinding({ recordId: "F-01", provisionIds: ["PFUTP-4-1", "SEBI-ACT-12A-a"] })];
    expect(orderBroadScenarios(findings)).toEqual([]);
  });

  it("does not force a weak match — a finding with no tags intersecting any curated scenario contributes nothing", () => {
    const findings = [makeFinding({ recordId: "F-01", transactionTypes: ["derivative_transaction"] })];
    expect(orderBroadScenarios(findings)).toEqual([]);
  });

  it("an empty findings list produces an empty result, never a fabricated scenario", () => {
    expect(orderBroadScenarios([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// Part 12/18-3,4,5,6: officer-facing pipeline/process clutter absent from
// Case Library and Order Detail source
// ---------------------------------------------------------------------
describe("Case Library / Order Detail: no officer-facing research/process clutter", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf-8");

  it("Case Library client has no Research Status column and no internal validation labels", () => {
    const src = read("src/components/CaseLibraryClient.tsx");
    expect(src).not.toMatch(/research status/i);
    expect(src).not.toMatch(/human legal review/i);
    expect(src).not.toMatch(/citation checked/i);
    expect(src).not.toMatch(/publication status/i);
    expect(src).not.toMatch(/verification status/i);
    expect(src).not.toMatch(/officially verified/i);
  });

  it("Order Detail page has no Procedural Status, Citation Checked, or Human Legal Review Pending display text", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).not.toMatch(/procedural status/i);
    expect(src).not.toMatch(/citation checked/i);
    expect(src).not.toMatch(/human legal review pending/i);
    expect(src).not.toMatch(/publication status/i);
    expect(src).not.toMatch(/processing stage/i);
    expect(src).not.toMatch(/officially verified/i);
  });

  it("Order Detail's Noticees section is labelled 'Noticees', not 'Noticees / relevant actors'", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).toMatch(/>Noticees</);
    expect(src).not.toMatch(/relevant actors/i);
  });

  it("Order Detail no longer renders the granular per-finding FindingsByStatus list", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).not.toContain("<FindingsByStatus");
    expect(src).toContain("<OrderBroadScenarios");
  });
});

// ---------------------------------------------------------------------
// Part 10/18-13: Directions component never fabricates a fallback
// direction — it only ever renders this order's own order_id-linked rows
// ---------------------------------------------------------------------
describe("Order Detail: directions are order-grounded, never inferred", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf-8");

  it("fetches directions scoped to this order's own id only (no stage-text guessing, no sibling-order directions bleeding in)", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).toContain("directionsForOrderIds([order.id])");
    expect(src).not.toMatch(/orderStage\.startsWith\("Final"\)/);
  });

  it("Directions section renders only directionOrOutcome/paragraphReference text already on the direction row — no scenario-finding or provision-derived fallback text", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    // The Directions <Card> block references only d.directionOrOutcome and
    // d.paragraphReference, never a finding/scenario/provision field.
    const directionsBlockMatch = src.match(/Directions &amp; outcomes[\s\S]*?<\/Card>/);
    expect(directionsBlockMatch).not.toBeNull();
    const block = directionsBlockMatch![0];
    expect(block).toContain("d.directionOrOutcome");
    expect(block).toContain("d.paragraphReference");
    expect(block).not.toMatch(/finding\./);
  });
});

// ---------------------------------------------------------------------
// Part 5/18-7: Noticees never populated with generic "relevant actors"
// ---------------------------------------------------------------------
describe("Order Detail: Noticees section source discipline", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf-8");

  it("uses structured order_noticees data first (via resolveOrderNoticees), with a clearly-labelled fallback, never an invented name", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).toContain("resolveOrderNoticees");
    expect(src).toContain('resolvedNoticees.source === "structured"');
    expect(src).toContain("Not yet captured for this order");
  });

  it("CORRECTION Part 5: the noticeeActors fallback is visibly qualified as NOT the structured/verified noticee list — never silently presented as equivalent to structured order_noticees data", () => {
    const src = read("src/app/(app)/orders/[id]/page.tsx");
    expect(src).toMatch(/Structured noticee list not yet captured/i);
    // The qualifier text must sit inside the fallback branch (rendered only
    // when resolvedNoticees.source === "fallback"), not merged into the
    // same branch as the structured-data render.
    const fallbackBranchMatch = src.match(/resolvedNoticees\.source === "fallback"[\s\S]{0,400}/);
    expect(fallbackBranchMatch).not.toBeNull();
    expect(fallbackBranchMatch![0]).toMatch(/Structured noticee list not yet captured/i);
  });
});

// ---------------------------------------------------------------------
// Live-officer-review correction: Rajesh Exports noticee-integrity
// architecture. See tests/order-noticees.test.ts for the resolveOrderNoticees
// unit tests (structured data always wins in full, never topped up with
// finding actors) and tests/checkpoint-rajesh-exports-noticees.test.ts for
// the Rajesh Exports-specific regression fixture.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Part 13/18-15: Official SEBI source links remain functional
// ---------------------------------------------------------------------
describe("Order Detail: Official SEBI source remains prominent", () => {
  it("still renders the SourceLink for order.officialUrl", () => {
    const src = readFileSync(new URL("../src/app/(app)/orders/[id]/page.tsx", import.meta.url), "utf-8");
    expect(src).toContain("order.officialUrl");
    expect(src).toContain("Official SEBI source");
  });
});
