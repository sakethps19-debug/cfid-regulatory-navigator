// Guards P1-8/P1-9:
// (8) supportCategory() correctly subdivides the "Supporting precedent(s)"
//     section into Final merits support / Interim-prima facie /
//     Contextual-unresolved, so a bare "Alleged" finding is never
//     visually indistinguishable from a "Confirmed at interim" one.
// (9) a provision whose ONLY materially-relevant matches are contrary
//     (not-confirmed/withdrawn) findings is no longer silently dropped -
//     it must surface in AnalysisResult.contraryOnlyProvisionResults as a
//     "warranting caution" signal, and hasResults must reflect that.
import { describe, expect, it } from "vitest";
import { analyzeScenario, supportCategory } from "@/lib/matching/engine";
import { resultToCsv, resultToText } from "@/components/analyzer/ScenarioAnalyzerClient";
import type { FindingStatus, LegalProvision, ScenarioFinding } from "@/types/domain";

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

describe("supportCategory", () => {
  const expected: Record<FindingStatus, string> = {
    Alleged: "Contextual / unresolved",
    "Prima facie": "Interim / prima facie",
    "Confirmed at interim": "Interim / prima facie",
    "Confirmed in Final Order": "Final merits support",
    "Partly Confirmed in Final Order": "Final merits support",
    "Not Confirmed in Final Order": "Interim / prima facie", // never called with this in practice, see doc comment
    Withdrawn: "Interim / prima facie", // never called with this in practice, see doc comment
    Inconclusive: "Contextual / unresolved",
    "Procedural observation": "Contextual / unresolved",
  };
  for (const [status, category] of Object.entries(expected)) {
    it(`classifies "${status}" as "${category}"`, () => {
      expect(supportCategory(status as FindingStatus)).toBe(category);
    });
  }
});

describe("contrary-only provisions are surfaced, never silently dropped", () => {
  it("a provision matching only a materially-relevant contrary finding appears in contraryOnlyProvisionResults", () => {
    const provision = makeProvision({ id: "TEST-PROV-CONTRARY-ONLY" });
    const contraryFinding = makeFinding({
      recordId: "SYN-CONTRARY-ONLY",
      provisionIds: ["TEST-PROV-CONTRARY-ONLY"],
      findingStatus: "Not Confirmed in Final Order",
      allegedConduct: ["fund_diversion"],
      qualification: "No evidence of diversion was found on these specific facts.",
    });
    const result = analyzeScenario({ freeText: "Company funds were diverted." }, [contraryFinding], [provision], []);

    // Must NOT appear in the ordinary "potentially relevant" results.
    expect(result.provisionResults.find((p) => p.provision.id === "TEST-PROV-CONTRARY-ONLY")).toBeUndefined();

    // Must appear in the dedicated contrary-only bucket instead.
    const cp = result.contraryOnlyProvisionResults.find((p) => p.provision.id === "TEST-PROV-CONTRARY-ONLY");
    expect(cp).toBeDefined();
    expect(cp!.contraryPrecedents.map((c) => c.finding.recordId)).toContain("SYN-CONTRARY-ONLY");
    expect(cp!.note).toContain("NOT confirmed");

    // hasResults must be true - this is a real, actionable result, not "no results".
    expect(result.hasResults).toBe(true);
  });

  it("a provision with only a weak (non-substantive) contrary finding appears in neither bucket", () => {
    const provision = makeProvision({ id: "TEST-PROV-WEAK-CONTRARY-ONLY" });
    const weakContrary = makeFinding({
      recordId: "SYN-WEAK-CONTRARY-ONLY",
      provisionIds: ["TEST-PROV-WEAK-CONTRARY-ONLY"],
      findingStatus: "Not Confirmed in Final Order",
      // Only an actor-role overlap (weight 2, not substantive) - the
      // material-relevance bar (substantiveCategoriesMatched >= 1)
      // requires a transaction-type or conduct overlap, which this
      // deliberately lacks.
      actorRoles: ["promoter"],
    });
    const result = analyzeScenario(
      { freeText: "The promoter was involved.", actorSignal: "promoter" },
      [weakContrary],
      [provision],
      []
    );
    expect(result.provisionResults.find((p) => p.provision.id === "TEST-PROV-WEAK-CONTRARY-ONLY")).toBeUndefined();
    expect(result.contraryOnlyProvisionResults.find((p) => p.provision.id === "TEST-PROV-WEAK-CONTRARY-ONLY")).toBeUndefined();
  });

  it("resultToText and resultToCsv both surface the contrary-only provision", () => {
    const provision = makeProvision({ id: "TEST-PROV-CONTRARY-EXPORT" });
    const contraryFinding = makeFinding({
      recordId: "SYN-CONTRARY-EXPORT",
      provisionIds: ["TEST-PROV-CONTRARY-EXPORT"],
      findingStatus: "Not Confirmed in Final Order",
      allegedConduct: ["fund_diversion"],
    });
    const result = analyzeScenario({ freeText: "Company funds were diverted." }, [contraryFinding], [provision], []);
    const text = resultToText(result);
    expect(text).toContain("Provisions warranting caution");
    expect(text).toContain("SYN-CONTRARY-EXPORT");

    const csv = resultToCsv(result);
    expect(csv).toContain("Warranting caution");
    expect(csv).toContain("SYN-CONTRARY-EXPORT");
  });
});
