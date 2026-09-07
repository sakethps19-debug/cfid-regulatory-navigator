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
// PFUTP 3(a)/(b) for pure fund diversion: investigated and NOT a bug --
// real SEBI orders (e.g. CDEL-01) genuinely cite these provisions for pure
// fund-diversion fact patterns with no securities-trading element at all.
// Suppressing it would misrepresent what the source order actually says.
// Instead, buildWhyRelevant now explains the connection explicitly when the
// only matched ingredient is a pure fund-movement tag.
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

describe("PFUTP 3(b)-style broad securities-fraud provision on a pure fund-movement match", () => {
  const pfutp3b = makeProvision({ id: "PFUTP-3-b", subject: "Manipulative or deceptive device in connection with dealing in securities." });
  const pureFundMovementFinding = makeFinding({
    recordId: "MOCK-CDEL-01",
    allegedConduct: ["fund_diversion", "circular_fund_movement"],
    provisionIds: [pfutp3b.id],
  });

  it("still surfaces the provision (not suppressed — it reflects a real order citation)", () => {
    const result = analyzeScenario({ freeText: "There was a diversion of funds by the promoter." }, [pureFundMovementFinding], [pfutp3b], []);
    expect(result.provisionResults.some((p) => p.provision.id === pfutp3b.id)).toBe(true);
  });

  it("explains the fund-movement-to-securities-fraud connection in whyRelevant when that's the only matched ingredient", () => {
    const result = analyzeScenario({ freeText: "There was a diversion of funds by the promoter." }, [pureFundMovementFinding], [pfutp3b], []);
    const pr = result.provisionResults.find((p) => p.provision.id === pfutp3b.id);
    expect(pr?.whyRelevant).toMatch(/general securities-fraud clause/i);
  });

  it("does not add the extra explanation when a genuinely securities-flavored ingredient also matched", () => {
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
    const pr = result.provisionResults.find((p) => p.provision.id === pfutp3b.id);
    expect(pr?.whyRelevant).not.toMatch(/general securities-fraud clause/i);
  });
});
