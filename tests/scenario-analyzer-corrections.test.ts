// Guards the Scenario Analyzer evidence-checklist correction: a cited
// precedent's own historical outcome ("None outstanding — this allegation
// was resolved in the final order.") must never be mixed into the
// present-scenario missing-facts/evidence checklist, and must never
// disappear entirely — it stays available as a separate, clearly-labelled
// fact about that specific precedent. Fixtures are entirely synthetic
// (not modelled on any real order) to prove the separation is structural,
// not a special case for one precedent. The conduct tag used
// (false_compliance_certification) is drawn from the real curated
// vocabulary rather than an arbitrary made-up id, since scenarioTypeSignal
// is now resolved against that same vocabulary (see
// buildEffectiveScenarioConcepts in engine.ts) and a fabricated id would
// simply be ignored. (Not fund_diversion, which is now subjectAgnostic —
// see ConceptTag.subjectAgnostic — and requires a connected topic before it
// can promote an ungated provision; these synthetic findings deliberately
// carry no transactionTypes at all.)
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

describe("Scenario Analyzer: precedent outcome vs. present-scenario missing facts", () => {
  const provision = makeProvision({ id: "TEST-PROV-1" });

  const genuineGapFinding = makeFinding({
    recordId: "SYN-GAP",
    provisionIds: ["TEST-PROV-1"],
    allegedConduct: ["false_compliance_certification"],
    evidentiaryGaps: ["Genuine outstanding evidence: independent verification of the transaction."],
    precedentOutcomeNote: null,
  });

  const resolvedFinding = makeFinding({
    recordId: "SYN-RESOLVED",
    provisionIds: ["TEST-PROV-1"],
    allegedConduct: ["false_compliance_certification"],
    evidentiaryGaps: [],
    precedentOutcomeNote: RESOLVED_TEXT,
  });

  function run(findings: ScenarioFinding[]) {
    return analyzeScenario(
      { freeText: "irrelevant free text", scenarioTypeSignal: "false_compliance_certification" },
      findings,
      [provision],
      []
    );
  }

  it("keeps genuine missing-facts and a precedent's own resolution separate when both are present, attributed to the precedent that recorded them", () => {
    const result = run([genuineGapFinding, resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    expect(pr).toBeDefined();
    // Only SYN-GAP has a genuine gap - SYN-RESOLVED must not appear as a
    // group at all (its only evidentiaryGaps entry, if any, is filtered by
    // isGenuineEvidentiaryGap), and the gap must stay attributed to SYN-GAP.
    expect(pr!.missingFacts).toEqual([
      { recordId: "SYN-GAP", scenarioTitle: "Synthetic finding", gaps: ["Genuine outstanding evidence: independent verification of the transaction."] },
    ]);
  });

  it('never shows "None outstanding" text inside any precedent\'s missing-facts group, even when another finding under the same provision has a genuine gap', () => {
    const result = run([genuineGapFinding, resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    const allGaps = pr!.missingFacts.flatMap((g) => g.gaps);
    const hasResolvedTextInMissingFacts = allGaps.some((m) => m.toLowerCase().startsWith("none outstanding"));
    expect(hasResolvedTextInMissingFacts).toBe(false);
  });

  it("does not present the resolved precedent's historical outcome as a missing-evidence conclusion about the present scenario", () => {
    const result = run([resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    expect(pr).toBeDefined();
    // No genuine gap exists for this provision — the checklist must have no
    // groups at all, not a group populated with the precedent's own outcome
    // note.
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
    // SYN-MISENTERED's own group must not appear at all (its sole gap is
    // filtered out as the resolved-sentinel text), leaving only SYN-GAP's.
    expect(pr!.missingFacts).toEqual([
      { recordId: "SYN-GAP", scenarioTitle: "Synthetic finding", gaps: ["Genuine outstanding evidence: independent verification of the transaction."] },
    ]);
    const allGaps = pr!.missingFacts.flatMap((g) => g.gaps);
    expect(allGaps.some((m) => m.toLowerCase().startsWith("none outstanding"))).toBe(false);
  });

  it("'None outstanding' can never coexist with an outstanding missing-evidence item in the same precedent's group", () => {
    const result = run([genuineGapFinding, resolvedFinding]);
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-1");
    for (const group of pr!.missingFacts) {
      const containsResolvedSentinel = group.gaps.some((m) => m.toLowerCase().startsWith("none outstanding"));
      const containsGenuineGap = group.gaps.length > 0;
      // The two must never both be true for the same precedent's group.
      expect(containsResolvedSentinel && containsGenuineGap).toBe(false);
    }
  });
});
