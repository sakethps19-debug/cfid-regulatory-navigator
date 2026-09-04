// Guards the Scenario Analyzer evidence-checklist correction: a cited
// precedent's own historical outcome ("None outstanding — this allegation
// was resolved in the final order.") must never be mixed into the
// present-scenario missing-facts/evidence checklist, and must never
// disappear entirely — it stays available as a separate, clearly-labelled
// fact about that specific precedent. Fixtures are entirely synthetic
// (not modelled on any real order) to prove the separation is structural,
// not a special case for one precedent.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

const RESOLVED_TEXT = "None outstanding — this allegation was resolved in the final order.";

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

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionIds: string[] }): ScenarioFinding {
  return {
    caseName: "Synthetic Test Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic finding",
    factualPattern: "Synthetic factual pattern for testing.",
    provisionsConsideredRaw: null,
    noticeeActors: [],
    findingStatus: "Upheld",
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
    ...overrides,
  };
}

describe("Scenario Analyzer: precedent outcome vs. present-scenario missing facts", () => {
  const provision = makeProvision({ id: "TEST-PROV-1" });

  const genuineGapFinding = makeFinding({
    recordId: "SYN-GAP",
    provisionIds: ["TEST-PROV-1"],
    transactionTypes: ["synthetic_test_transaction"],
    evidentiaryGaps: ["Genuine outstanding evidence: independent verification of the transaction."],
    precedentOutcomeNote: null,
  });

  const resolvedFinding = makeFinding({
    recordId: "SYN-RESOLVED",
    provisionIds: ["TEST-PROV-1"],
    transactionTypes: ["synthetic_test_transaction"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_TEXT,
  });

  function run(findings: ScenarioFinding[]) {
    return analyzeScenario(
      { freeText: "irrelevant free text", transactionTypeFilter: "synthetic_test_transaction" },
      findings,
      [provision],
      []
    );
  }

  it("keeps genuine missing-facts and a precedent's own resolution separate when both are present", () => {
    const result = run([genuineGapFinding, resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    expect(pr).toBeDefined();
    expect(pr!.missingFacts).toEqual(["Genuine outstanding evidence: independent verification of the transaction."]);
  });

  it('never shows "None outstanding" text inside the missing-facts checklist, even when another finding under the same provision has a genuine gap', () => {
    const result = run([genuineGapFinding, resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    const hasResolvedTextInMissingFacts = pr!.missingFacts.some((m) => m.toLowerCase().startsWith("none outstanding"));
    expect(hasResolvedTextInMissingFacts).toBe(false);
  });

  it("does not present the resolved precedent's historical outcome as a missing-evidence conclusion about the present scenario", () => {
    const result = run([resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    expect(pr).toBeDefined();
    // No genuine gap exists for this provision — the checklist must be empty,
    // not populated with the precedent's own outcome note.
    expect(pr!.missingFacts).toEqual([]);
    // The outcome note is still available, but attached to the specific
    // precedent it describes, not folded into the scenario-level checklist.
    const withNote = pr!.supportingPrecedents.find((p) => p.finding.recordId === "SYN-RESOLVED");
    expect(withNote?.finding.precedentOutcomeNote).toBe(RESOLVED_TEXT);
  });

  it("defends against a mis-entered resolution note landing directly in evidentiaryGaps (regression guard)", () => {
    const misEntered = makeFinding({
      recordId: "SYN-MISENTERED",
      provisionIds: ["TEST-PROV-1"],
      transactionTypes: ["synthetic_test_transaction"],
      evidentiaryGaps: [RESOLVED_TEXT], // simulates the original bug's data shape
      precedentOutcomeNote: null,
    });
    const result = run([genuineGapFinding, misEntered]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    expect(pr!.missingFacts).toEqual(["Genuine outstanding evidence: independent verification of the transaction."]);
    expect(pr!.missingFacts.some((m) => m.toLowerCase().startsWith("none outstanding"))).toBe(false);
  });

  it("'None outstanding' can never coexist with an outstanding missing-evidence item in the same checklist", () => {
    const result = run([genuineGapFinding, resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    const containsResolvedSentinel = pr!.missingFacts.some((m) => m.toLowerCase().startsWith("none outstanding"));
    const containsGenuineGap = pr!.missingFacts.length > 0;
    // The two must never both be true for the same checklist.
    expect(containsResolvedSentinel && containsGenuineGap).toBe(false);
  });
});
