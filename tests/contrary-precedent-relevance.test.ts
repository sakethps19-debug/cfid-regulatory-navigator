// Guards the fix for a real bug found during the architecture review: the
// independent "global" contrary-precedent safeguard used to add EVERY
// published negative finding, with zero relevance scoring, whenever the
// scenario contained a broad trigger concept (preferential allotment,
// circular funding, fund diversion, etc. -- see
// CONTRARY_PRECEDENT_TRIGGER_TAGS). Every contrary precedent -- both in
// this independent search and in the ordinary per-provision list -- must
// now pass the same material-relevance bar a supporting precedent does: a
// real transaction-type or conduct overlap with the entered facts, not
// merely the bare presence of a trigger word.
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

const TRIGGER_SCENARIO_TEXT =
  "A preferential allotment of shares was made by the company to a group of allottees.";

describe("global contrary-precedent search: material relevance required", () => {
  it("excludes an unrelated negative finding even though the scenario contains a broad trigger concept", () => {
    // No provision surfaced for this finding at all (it isn't tagged to any
    // provision the scenario matches), and its own tags share NOTHING with
    // the entered facts -- exactly the case the old code got wrong, since it
    // added every negative finding once "preferential allotment" was
    // detected, with no per-finding check at all.
    const unrelated = makeFinding({
      recordId: "SYN-UNRELATED-NEG-01",
      provisionIds: [],
      provisionLinks: [],
      findingStatus: "Not Confirmed in Final Order",
      transactionTypes: [],
      allegedConduct: ["audit_committee_deficiency"], // shares nothing with the query
    });
    const result = analyzeScenario({ freeText: TRIGGER_SCENARIO_TEXT }, [unrelated], [], []);
    expect(result.globalContraryPrecedents.find((c) => c.finding.recordId === "SYN-UNRELATED-NEG-01")).toBeUndefined();
  });

  it("includes a materially comparable negative finding, with a human-readable relevance note", () => {
    const comparable = makeFinding({
      recordId: "SYN-COMPARABLE-NEG-01",
      provisionIds: [],
      provisionLinks: [],
      findingStatus: "Not Confirmed in Final Order",
      transactionTypes: ["preferential_allotment"], // genuinely overlaps the entered facts
    });
    const result = analyzeScenario({ freeText: TRIGGER_SCENARIO_TEXT }, [comparable], [], []);
    const ref = result.globalContraryPrecedents.find((c) => c.finding.recordId === "SYN-COMPARABLE-NEG-01");
    expect(ref).toBeDefined();
    expect(ref!.score).toBeGreaterThan(0);
    expect(ref!.materialRelevanceNote).toBeDefined();
    expect(ref!.materialRelevanceNote).toContain("Preferential allotment");
  });

  it('reports "no materially comparable contrary precedent" when the safeguard runs but nothing qualifies', () => {
    const unrelated = makeFinding({
      recordId: "SYN-UNRELATED-NEG-02",
      provisionIds: [],
      provisionLinks: [],
      findingStatus: "Not Confirmed in Final Order",
      allegedConduct: ["audit_committee_deficiency"],
    });
    const result = analyzeScenario({ freeText: TRIGGER_SCENARIO_TEXT }, [unrelated], [], []);
    expect(result.globalContraryPrecedents).toHaveLength(0);
    expect(result.contraryPrecedentSearchNote).toBe(
      "No materially comparable contrary precedent was identified in the currently structured corpus."
    );
  });

  it("leaves contraryPrecedentSearchNote null when the safeguard never triggers", () => {
    const result = analyzeScenario({ freeText: "The Audit Committee was not properly constituted." }, [], [], []);
    expect(result.contraryPrecedentSearchNote).toBeNull();
  });
});

describe("per-provision contrary precedents: material relevance required", () => {
  it("excludes a contrary precedent that only overlaps on a weak (actor/evidence-only) category", () => {
    const provision = makeProvision({ id: "IND-AS-1" });
    const supporting = makeFinding({
      recordId: "SYN-SUPPORT-WEAK-01",
      provisionIds: ["IND-AS-1"],
      findingStatus: "Confirmed in Final Order",
      allegedConduct: ["financial_statement_misstatement"],
      actorRoles: ["promoter"],
    });
    // This negative finding shares the SAME provision link and the same
    // actor tag ("promoter") as the query, but nothing substantive
    // (transaction type or conduct) -- must not appear as a contrary
    // precedent for this provision.
    const weakContrary = makeFinding({
      recordId: "SYN-WEAK-CONTRARY-01",
      provisionIds: ["IND-AS-1"],
      findingStatus: "Not Confirmed in Final Order",
      actorRoles: ["promoter"],
    });
    const result = analyzeScenario(
      { freeText: "There was a financial statement misstatement by the promoter.", actorSignal: "promoter" },
      [supporting, weakContrary],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "IND-AS-1");
    expect(pr).toBeDefined();
    expect(pr!.contraryPrecedents.find((c) => c.finding.recordId === "SYN-WEAK-CONTRARY-01")).toBeUndefined();
  });

  it("includes a contrary precedent that shares a substantive (conduct) category", () => {
    const provision = makeProvision({ id: "IND-AS-1" });
    const supporting = makeFinding({
      recordId: "SYN-SUPPORT-STRONG-01",
      provisionIds: ["IND-AS-1"],
      findingStatus: "Confirmed in Final Order",
      allegedConduct: ["financial_statement_misstatement"],
    });
    const strongContrary = makeFinding({
      recordId: "SYN-STRONG-CONTRARY-01",
      provisionIds: ["IND-AS-1"],
      findingStatus: "Not Confirmed in Final Order",
      allegedConduct: ["financial_statement_misstatement"],
    });
    const result = analyzeScenario(
      { freeText: "There was a financial statement misstatement." },
      [supporting, strongContrary],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "IND-AS-1");
    expect(pr).toBeDefined();
    expect(pr!.contraryPrecedents.find((c) => c.finding.recordId === "SYN-STRONG-CONTRARY-01")).toBeDefined();
  });
});
