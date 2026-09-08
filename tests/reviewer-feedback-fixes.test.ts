// Reported by the user's DC/CGM after a live demo: bare "fictitious sale"
// and "diversion of funds" queries surfaced provisions that looked
// unrelated (Ind AS 24 for fictitious sale; PFUTP 3(a)/(b) for pure fund
// diversion).
//
// Ind AS 24 (Related Party Disclosures): confirmed bug, same root cause as
// LODR-6 -- none of the findings actually linked to Ind AS 24 have a
// fictitious-sale element; one of them (REL-05-shaped) bundles fund
// diversion together with a related-party angle in one finding record, so
// any of its tags could surface Ind AS 24. Fixed via
// finding_provisions.justifying_tags, same mechanism as LODR-6/18/17(8).
//
// PFUTP 3(a)/(b) for pure fund diversion: originally investigated and
// treated as NOT a bug -- real SEBI orders (e.g. CDEL-01) genuinely cite
// these provisions for pure fund-diversion fact patterns, so the earlier
// fix was to EXPLAIN the fund-movement-to-securities-fraud connection in
// buildWhyRelevant rather than suppress the provision.
//
// REVERSED by the P0 provision-precision remediation pass. A 100-scenario
// CFID-officer stress test confirmed that "the source order also cites it"
// is not, by itself, a sufficient reason to present PFUTP 3(a)-(d)/4 as
// POTENTIALLY APPLICABLE to a scenario that states only fund movement and
// no securities dealing/issue fact: PFUTP 3(b), on its own text, requires a
// manipulative/deceptive device used "in connection with the issue,
// purchase or sale" of a security, which a bare fund-diversion allegation
// does not state. Explaining the connection in whyRelevant was a genuine
// improvement over silence, but a prima facie caveat sentence does not cure
// a provision that fails its own retrieval prerequisite. The
// provision-level retrieval gate (src/data/curated/
// provision-retrieval-rules.ts) now blocks PFUTP-3-b (and the rest of the
// PFUTP/SEBI-Act-12A family) for a pure fund-movement match; the
// underlying precedent is still surfaced, but as a "related factual
// precedent" under AnalysisResult.gateBlockedProvisionResults, never as a
// candidate provision. buildWhyRelevant's fund-movement explanation branch
// remains live for provision families this pass did not gate (e.g. SEBI
// Act Section 11(2)(e), SEBI's general power to prohibit unfair trade
// practices) -- see the second describe block below.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  const provisionIds = overrides.provisionIds ?? [];
  const provisionLinks =
    overrides.provisionLinks ?? provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    recordId: "MOCK-01",
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds,
    provisionLinks,
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: "Para 1",
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

function makeProvision(overrides: Partial<LegalProvision>): LegalProvision {
  return {
    id: "MOCK-PROVISION",
    instrument: "Mock Instrument",
    provisionNumber: "Mock 1",
    subject: null,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: ["Mock Case Limited"],
    treatmentInPilotOrders: "Cited in 1 finding.",
    lawLibraryNote: null,
    ...overrides,
  };
}

describe("Ind AS 24 narrow-scope fix", () => {
  const indAs24 = makeProvision({ id: "IND-AS-24", subject: "Related Party Disclosures" });
  const bundledFinding = makeFinding({
    recordId: "MOCK-REL-05",
    allegedConduct: ["fund_diversion", "related_party_misrepresentation"],
    provisionIds: [indAs24.id],
    provisionLinks: [{ provisionId: indAs24.id, justifyingTags: ["related_party_transaction", "related_party_misrepresentation"] }],
  });

  it("does not surface Ind AS 24 for a fund-diversion query with no related-party angle", () => {
    const result = analyzeScenario(
      { freeText: "There was a diversion of funds by the promoter to a personal account." },
      [bundledFinding],
      [indAs24],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === indAs24.id)).toBe(false);
  });

  it("still surfaces Ind AS 24 when the query actually raises a related-party angle", () => {
    const result = analyzeScenario(
      { freeText: "Related party transactions were diverted and misrepresented in the annual report." },
      [bundledFinding],
      [indAs24],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === indAs24.id)).toBe(true);
  });
});

describe("PFUTP 3(b) on a pure fund-movement match: now gated, not merely explained", () => {
  const pfutp3b = makeProvision({ id: "PFUTP-3-b", subject: "Manipulative or deceptive device in connection with dealing in securities." });
  const pureFundMovementFinding = makeFinding({
    recordId: "MOCK-CDEL-01",
    allegedConduct: ["fund_diversion", "circular_fund_movement"],
    provisionIds: [pfutp3b.id],
  });

  it("does NOT surface the provision for a pure fund-movement match — no securities dealing/issue fact is stated", () => {
    const result = analyzeScenario({ freeText: "There was a diversion of funds by the promoter." }, [pureFundMovementFinding], [pfutp3b], []);
    expect(result.provisionResults.some((p) => p.provision.id === pfutp3b.id)).toBe(false);
    const blocked = result.gateBlockedProvisionResults.find((g) => g.provision.id === pfutp3b.id);
    expect(blocked).toBeDefined();
    expect(blocked?.relatedFactualPrecedents.some((p) => p.finding.recordId === "MOCK-CDEL-01")).toBe(true);
  });

  it("still does NOT surface the provision when only OTHER fraud conduct (no dealing/issue fact) also matched", () => {
    const richFinding = makeFinding({
      recordId: "MOCK-RICH",
      allegedConduct: ["fund_diversion", "fictitious_sales_or_revenue"],
      provisionIds: [pfutp3b.id],
    });
    const result = analyzeScenario(
      { freeText: "There was a diversion of funds and the company recorded fictitious sales." },
      [richFinding],
      [pfutp3b],
      []
    );
    // fictitious_sales_or_revenue is a FRAUD fact, not a securities
    // dealing/issue fact — PFUTP-3-b's own text requires both, so this is
    // correctly still blocked, not merely re-labelled as "genuinely
    // securities-flavored" the way the pre-remediation test assumed.
    expect(result.provisionResults.some((p) => p.provision.id === pfutp3b.id)).toBe(false);
  });

  it("DOES surface the provision once an actual securities dealing/issue fact is also stated", () => {
    const dealingFinding = makeFinding({
      recordId: "MOCK-DEALING",
      allegedConduct: ["fund_diversion", "fictitious_sales_or_revenue"],
      transactionTypes: ["preferential_allotment"],
      provisionIds: [pfutp3b.id],
    });
    const result = analyzeScenario(
      {
        freeText:
          "There was a diversion of funds and the company recorded fictitious sales, structured through a preferential allotment of shares.",
      },
      [dealingFinding],
      [pfutp3b],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === pfutp3b.id)).toBe(true);
  });
});

describe("SEBI Act 11(2)(e) (SEBI's general power to prohibit unfair trade practices): fund-movement explanation, not (yet) gated", () => {
  // Section 11(2)(e) is not part of the PFUTP/SEBI-Act-12A/ICDR family this
  // remediation pass gated (see docs/provision-gating-remediation.md,
  // "Remaining scope"); buildWhyRelevant's explanatory branch remains the
  // operative safeguard for it, exactly as originally designed.
  const sebiAct11 = makeProvision({ id: "SEBI-ACT-11-2-e", subject: "Power to prohibit fraudulent and unfair trade practices relating to securities markets." });
  const pureFundMovementFinding = makeFinding({
    recordId: "MOCK-CDEL-01",
    allegedConduct: ["fund_diversion", "circular_fund_movement"],
    provisionIds: [sebiAct11.id],
  });

  it("still surfaces the provision (not suppressed — it reflects a real order citation)", () => {
    const result = analyzeScenario({ freeText: "There was a diversion of funds by the promoter." }, [pureFundMovementFinding], [sebiAct11], []);
    expect(result.provisionResults.some((p) => p.provision.id === sebiAct11.id)).toBe(true);
  });

  it("explains the fund-movement-to-securities-fraud connection in whyRelevant when that's the only matched ingredient", () => {
    const result = analyzeScenario({ freeText: "There was a diversion of funds by the promoter." }, [pureFundMovementFinding], [sebiAct11], []);
    const pr = result.provisionResults.find((p) => p.provision.id === sebiAct11.id);
    expect(pr?.whyRelevant).toMatch(/general securities-fraud clause/i);
  });

  it("does not add the extra explanation when a genuinely securities-flavored ingredient also matched", () => {
    const richFinding = makeFinding({
      recordId: "MOCK-RICH",
      allegedConduct: ["fund_diversion", "fictitious_sales_or_revenue"],
      provisionIds: [sebiAct11.id],
    });
    const result = analyzeScenario(
      { freeText: "There was a diversion of funds and the company recorded fictitious sales." },
      [richFinding],
      [sebiAct11],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === sebiAct11.id);
    expect(pr?.whyRelevant).not.toMatch(/general securities-fraud clause/i);
  });
});
