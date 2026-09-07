// Guards two Round-H additions to the matching engine: (1) the new
// "Evidence indicator" dropdown (evidenceFilter) boosts a finding's score
// exactly like the existing actor/scenario-type filters, and (2) the
// scenario-completeness summary correctly reports which of the four
// fact-element categories were touched (by free text OR an explicit filter)
// versus not mentioned at all — never treating "not stated" as "absent".
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionIds: string[] }): ScenarioFinding {
  const provisionLinks =
    overrides.provisionLinks ?? overrides.provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    caseName: "Synthetic Test Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic finding",
    factualPattern: "Synthetic factual pattern for testing.",
    provisionsConsideredRaw: null,
    provisionLinks,
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
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
    humanLegalReviewCompleted: true,
    publicationStatus: "Published to search",
    ...overrides,
  };
}

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

describe("evidenceFilter", () => {
  it("boosts a finding whose evidenceTypes includes the selected filter, even with no free-text evidence mention", () => {
    const provision = makeProvision({ id: "TEST-PROV-EVID" });
    const withEvidence = makeFinding({
      recordId: "SYN-EVID-01",
      provisionIds: ["TEST-PROV-EVID"],
      allegedConduct: ["fund_diversion"],
      evidenceTypes: ["bank_statements_flow"],
    });
    const withoutEvidence = makeFinding({
      recordId: "SYN-EVID-02",
      provisionIds: ["TEST-PROV-EVID"],
      allegedConduct: ["fund_diversion"],
      evidenceTypes: [],
    });

    const result = analyzeScenario(
      { freeText: "Company funds were diverted.", evidenceFilter: "bank_statements_flow" },
      [withEvidence, withoutEvidence],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-EVID");
    expect(pr).toBeDefined();
    // The finding carrying the selected evidence tag should score higher and
    // therefore be listed first among supporting precedents.
    expect(pr!.supportingPrecedents[0].finding.recordId).toBe("SYN-EVID-01");
  });
});

describe("scenario completeness", () => {
  const provision = makeProvision({ id: "TEST-PROV-COMPLETE" });
  const finding = makeFinding({
    recordId: "SYN-COMPLETE-01",
    provisionIds: ["TEST-PROV-COMPLETE"],
    allegedConduct: ["fund_diversion"],
  });

  it("reports a category as detected from free text and the rest as not stated", () => {
    const result = analyzeScenario(
      { freeText: "Company funds were diverted." },
      [finding],
      [provision],
      []
    );
    expect(result.completeness.detected).toContain("conduct");
    expect(result.completeness.notStated).toEqual(expect.arrayContaining(["transaction", "actor", "evidence"]));
    expect(result.completeness.detected).not.toEqual(expect.arrayContaining(result.completeness.notStated));
  });

  it("counts an explicitly selected filter as detected even absent from free text", () => {
    const result = analyzeScenario(
      { freeText: "Company funds were diverted.", actorFilter: "promoter" },
      [finding],
      [provision],
      []
    );
    expect(result.completeness.detected).toContain("actor");
    expect(result.completeness.notStated).not.toContain("actor");
  });
});
