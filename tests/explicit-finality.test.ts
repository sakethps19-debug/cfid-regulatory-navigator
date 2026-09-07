// Guards the fix for a real bug found during the Round-I architecture
// review: finality was being inferred from whether
// ScenarioFinding.finalParagraphReferences was non-null, a citation string
// that can be populated even when the finding's own explicit findingStatus
// is NOT a final-order disposition (confirmed live against the database:
// BGDL-01, GENSOL-01/02/03, RHFL-01, LINDE-01/02 and others all carry a
// final_paragraph_references value while finding_status is
// confirmed_at_interim/inconclusive/procedural_observation). Finality must
// instead come from the finding's own curated findingStatus.
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
    finalParagraphReferences: null,
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    transactionTypes: [],
    actorRoles: [],
    evidenceTypes: [],
    allegedConduct: ["fund_diversion"],
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

describe("explicit finality (findingStatus, not finalParagraphReferences presence)", () => {
  it("does NOT treat a Confirmed-at-interim finding as final, even though it carries a final paragraph reference", () => {
    const provision = makeProvision({ id: "TEST-PROV-INTERIM-WITH-REF" });
    const interimWithFinalRef = makeFinding({
      recordId: "SYN-INTERIM-01",
      provisionIds: ["TEST-PROV-INTERIM-WITH-REF"],
      findingStatus: "Confirmed at interim",
      finalParagraphReferences: "Para 200", // present, but status is NOT final -- must not count as final
      interimParagraphReferences: "Para 50",
    });
    const result = analyzeScenario(
      { freeText: "Company funds were diverted." },
      [interimWithFinalRef],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-INTERIM-WITH-REF");
    expect(pr).toBeDefined();
    // The confidence-basis text must say finality was NOT established from this status.
    expect(pr!.confidenceReasons.join(" ")).toContain('"Confirmed at interim") does not reflect a final-order determination');
  });

  it("DOES treat a Confirmed in Final Order finding as final, even without a populated final paragraph reference", () => {
    const provision = makeProvision({ id: "TEST-PROV-FINAL-NO-REF" });
    const finalNoRef = makeFinding({
      recordId: "SYN-FINAL-01",
      provisionIds: ["TEST-PROV-FINAL-NO-REF"],
      findingStatus: "Confirmed in Final Order",
      finalParagraphReferences: null,
      interimParagraphReferences: "Para 12",
    });
    const result = analyzeScenario(
      { freeText: "Company funds were diverted." },
      [finalNoRef],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-FINAL-NO-REF");
    expect(pr).toBeDefined();
    expect(pr!.confidenceReasons.join(" ")).toContain('"Confirmed in Final Order") reflects a final-order determination');
  });

  it("treats a Not Confirmed in Final Order finding as final too (a final order rejecting the allegation is still a final-order determination)", () => {
    const provision = makeProvision({ id: "TEST-PROV-REJECTED-FINAL" });
    const supporting = makeFinding({
      recordId: "SYN-SUPPORT-01",
      provisionIds: ["TEST-PROV-REJECTED-FINAL"],
      findingStatus: "Confirmed in Final Order",
    });
    const rejected = makeFinding({
      recordId: "SYN-REJECTED-01",
      provisionIds: ["TEST-PROV-REJECTED-FINAL"],
      findingStatus: "Not Confirmed in Final Order",
      finalParagraphReferences: null,
      interimParagraphReferences: "Para 9",
      qualification: "Distinguished on its own facts.",
    });
    const result = analyzeScenario(
      { freeText: "Company funds were diverted." },
      [supporting, rejected],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-REJECTED-FINAL");
    expect(pr).toBeDefined();
    // No supporting precedent here is "interim only" (the only supporting
    // finding is itself a final-order confirmation), so the interim
    // guardrail must not fire for this provision's own supporting set.
    const stillInterim = pr!.supportingPrecedents.every((s) => s.finding.findingStatus === "Confirmed in Final Order");
    expect(stillInterim).toBe(true);
  });
});
