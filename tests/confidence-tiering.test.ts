// Reported: a scenario describing pure fund diversion (no related-party
// transaction dimension at all) surfaced "Ind AS 24" (Related Party
// Disclosures) as a matched provision — because the finding that linked
// fund diversion to Ind AS 24 in the real precedent library *also*
// involved an undisclosed related-party transaction, and the engine
// bundled every provision that finding cites once the finding cleared the
// score threshold on conduct + actor overlap alone. The scenario's own
// facts never established the related-party dimension that actually
// justifies Ind AS 24's relevance.
//
// Confidence tiering is the only lever available without a data-model
// change to attribute *which* of a finding's tags justifies *which* of its
// linked provisions individually — so a finding that only matched on
// conduct plus a generic actor (no transaction type, no evidence) must not
// read as an equally solid "Medium confidence" match as one that matched
// on both transaction type and conduct together.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  return {
    recordId: "MOCK-01",
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    noticeeActors: [],
    findingStatus: "Upheld",
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

describe("Confidence tiering — ancillary provisions from a partially-matched finding", () => {
  const rptProvision = makeProvision({ id: "MOCK-RPT-DISCLOSURE", subject: "Related party disclosures" });
  const diversionFinding = makeFinding({
    recordId: "MOCK-DIVERSION-01",
    // Mirrors the real reported case: the underlying finding genuinely
    // combined fund diversion with an undisclosed related-party
    // transaction, so it legitimately links to an RPT-disclosure
    // provision — but a query that only supplies the diversion side
    // shouldn't inherit that provision at full confidence.
    transactionTypes: ["related_party_transaction"],
    actorRoles: ["promoter"],
    allegedConduct: ["fund_diversion"],
    provisionIds: [rptProvision.id],
  });

  it("downgrades to Low confidence when only conduct and a generic actor overlap, not the transaction type that actually justifies the provision", () => {
    const result = analyzeScenario(
      { freeText: "There was a diversion of funds by the promoter." },
      [diversionFinding],
      [rptProvision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === rptProvision.id);
    expect(pr).toBeDefined();
    expect(pr?.confidence).toBe("Low");
  });

  it("reaches at least Medium confidence once the scenario also establishes the transaction type the provision actually turns on", () => {
    const result = analyzeScenario(
      { freeText: "A related party transaction involving diversion of funds by the promoter was not disclosed." },
      [diversionFinding],
      [rptProvision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === rptProvision.id);
    expect(pr).toBeDefined();
    expect(pr?.confidence).not.toBe("Low");
  });

  it("still surfaces the provision (never silently drops it) — Low confidence, not exclusion, is the mechanism", () => {
    const result = analyzeScenario(
      { freeText: "There was a diversion of funds by the promoter." },
      [diversionFinding],
      [rptProvision],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === rptProvision.id)).toBe(true);
  });
});
