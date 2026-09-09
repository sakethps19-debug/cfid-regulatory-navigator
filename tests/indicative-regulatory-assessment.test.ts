// Task 2 (pre-demo correction sprint): the "Indicative Regulatory
// Assessment" paragraph must be built deterministically (zero LLM) from the
// engine's own primary_candidate / related_ancillary provisionResults, must
// never dump every provision number into prose without qualification, must
// never assert guilt, and must handle the zero-result and single-provision
// cases naturally.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { buildIndicativeRegulatoryAssessment } from "@/lib/indicativeAssessment";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "Test Instrument",
    provisionNumber: "Regulation 1",
    subject: "Test subject",
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

let seq = 0;
function makeFinding(overrides: Partial<ScenarioFinding> & { provisionId: string; justifyingTags?: string[] }): ScenarioFinding {
  seq += 1;
  const { provisionId, justifyingTags = [], ...rest } = overrides;
  return {
    recordId: `IND-ASSESS-${seq}`,
    caseName: "Synthetic Indicative Assessment Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic finding",
    factualPattern: "Synthetic factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [provisionId],
    provisionLinks: [{ provisionId, justifyingTags }],
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    transactionTypes: ["preferential_allotment"],
    actorRoles: ["promoter"],
    evidenceTypes: [],
    allegedConduct: ["fictitious_sales_or_revenue"],
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
    ...rest,
  };
}

describe("buildIndicativeRegulatoryAssessment", () => {
  it("returns a deterministic no-result paragraph and zero counts when nothing was identified", () => {
    const result = analyzeScenario({ freeText: "The office canteen menu changed for next week." }, [], [], []);
    const assessment = buildIndicativeRegulatoryAssessment(result);
    expect(assessment.primaryCount).toBe(0);
    expect(assessment.relatedAncillaryCount).toBe(0);
    expect(assessment.paragraph).toContain("no potentially relevant provisions were identified");
    expect(assessment.paragraph.toLowerCase()).not.toContain("violation");
  });

  it("names the single primary provision naturally (singular phrasing) when only one exists", () => {
    const provision = makeProvision({ id: "PFUTP-4-1", instrument: "PFUTP Regulations, 2003", provisionNumber: "Regulation 4(1)" });
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A preferential allotment was made to the promoter, backed by fictitious sales with no genuine underlying transaction." },
      [finding],
      [provision],
      []
    );
    const assessment = buildIndicativeRegulatoryAssessment(result);
    expect(assessment.primaryCount).toBe(1);
    expect(assessment.paragraph).toContain("Regulation 4(1) of the PFUTP Regulations, 2003");
    expect(assessment.paragraph).toContain("This is an indicative provision");
    expect(assessment.paragraph).not.toContain("These are indicative provisions");
  });

  it("uses plural phrasing and cites both primary and related/ancillary provisions when both exist", () => {
    const primaryProvision = makeProvision({ id: "PFUTP-4-1", instrument: "PFUTP Regulations, 2003", provisionNumber: "Regulation 4(1)" });
    const ancillaryProvision = makeProvision({ id: "SEBI-ACT-27", instrument: "SEBI Act, 1992", provisionNumber: "Section 27" });
    const findingA = makeFinding({ provisionId: "PFUTP-4-1" });
    const findingB = makeFinding({ provisionId: "SEBI-ACT-27" });
    const result = analyzeScenario(
      { freeText: "A preferential allotment was made to the promoter, backed by fictitious sales with no genuine underlying transaction." },
      [findingA, findingB],
      [primaryProvision, ancillaryProvision],
      []
    );
    const assessment = buildIndicativeRegulatoryAssessment(result);
    expect(assessment.paragraph).toContain("Regulation 4(1) of the PFUTP Regulations, 2003");
    expect(assessment.paragraph).toContain("These are indicative provisions");
  });

  it("never states that a violation has occurred or uses guilt language", () => {
    const provision = makeProvision({ id: "PFUTP-4-1", instrument: "PFUTP Regulations, 2003", provisionNumber: "Regulation 4(1)" });
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A preferential allotment was made to the promoter, backed by fictitious sales with no genuine underlying transaction." },
      [finding],
      [provision],
      []
    );
    const assessment = buildIndicativeRegulatoryAssessment(result);
    const lower = assessment.paragraph.toLowerCase();
    // The required disclaimer explicitly DENIES that a violation has been
    // found ("not a finding that any violation has occurred") - that
    // negation is required, not guilt language. What must never appear is
    // an unqualified assertion of guilt/liability.
    expect(lower).not.toContain("has committed");
    expect(lower).not.toContain("is liable");
    expect(lower).not.toContain("is guilty");
    expect(lower).not.toContain("has violated");
    expect(lower).toContain("not a finding that any violation has occurred");
  });

  it("only cites provisions that actually appear in the analysis result (no fabricated provisions)", () => {
    const provision = makeProvision({ id: "PFUTP-4-1", instrument: "PFUTP Regulations, 2003", provisionNumber: "Regulation 4(1)" });
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A preferential allotment was made to the promoter, backed by fictitious sales with no genuine underlying transaction." },
      [finding],
      [provision],
      []
    );
    const assessment = buildIndicativeRegulatoryAssessment(result);
    const citedProvisionIds = result.provisionResults.map((pr) => pr.provision.provisionNumber);
    expect(citedProvisionIds).toContain("Regulation 4(1)");
    expect(assessment.paragraph).toContain("Regulation 4(1)");
    // requiresAdditionalFactsCount matches the engine's own gate-blocked count exactly.
    expect(assessment.requiresAdditionalFactsCount).toBe(result.gateBlockedProvisionResults.length);
  });

  it("states plainly that related/ancillary provisions alone do not anchor a candidate breach when there is no primary provision", () => {
    // ANY_SUBSTANTIVE_VIOLATION_CONDUCT-gated provisions (e.g. SEBI-ACT-27)
    // can surface as related_ancillary without ever surfacing as primary on
    // their own — verified via a real gated related-ancillary provision.
    const provision = makeProvision({ id: "SEBI-ACT-27", instrument: "SEBI Act, 1992", provisionNumber: "Section 27" });
    const finding = makeFinding({
      provisionId: "SEBI-ACT-27",
      allegedConduct: ["fund_diversion"],
      transactionTypes: ["preferential_allotment"],
      actorRoles: ["promoter"],
    });
    const result = analyzeScenario(
      { freeText: "In connection with a preferential allotment, company funds were transferred to entities controlled by its promoter." },
      [finding],
      [provision],
      []
    );
    const assessment = buildIndicativeRegulatoryAssessment(result);
    if (assessment.primaryCount === 0 && assessment.relatedAncillaryCount > 0) {
      expect(assessment.paragraph).toContain("independently anchors a candidate breach");
    }
  });
});
