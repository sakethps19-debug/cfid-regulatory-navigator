// Guards the "Why was this result retrieved?" panel's categorized
// breakdown (matchedByCategory on PrecedentRef/ProvisionResult): a matched
// ingredient must be filed under the category it actually matched on
// (transaction type / actor role / alleged conduct / evidence type), not
// just dumped into one flat list, and must never appear in a category it
// did not match.
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

describe("matchedByCategory", () => {
  const provision = makeProvision({ id: "TEST-PROV-CAT" });
  const finding = makeFinding({
    recordId: "SYN-CAT-01",
    provisionIds: ["TEST-PROV-CAT"],
    transactionTypes: ["preferential_allotment"],
    actorRoles: ["promoter"],
    allegedConduct: ["fund_diversion"],
    evidenceTypes: ["bank_statements_flow"],
  });

  it("files each matched ingredient under the category it actually matched, on both the precedent ref and the provision result", () => {
    const result = analyzeScenario(
      {
        freeText:
          "A preferential allotment was made to the promoter. Company funds were diverted, traced through bank statements showing the flow.",
      },
      [finding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-CAT");
    expect(pr).toBeDefined();

    for (const bucket of [pr!.matchedByCategory, pr!.supportingPrecedents[0].matchedByCategory]) {
      expect(bucket.transactionTypes.length).toBeGreaterThan(0);
      expect(bucket.actorRoles.length).toBeGreaterThan(0);
      expect(bucket.allegedConduct.length).toBeGreaterThan(0);
      expect(bucket.evidenceTypes.length).toBeGreaterThan(0);
      // Never cross-filed: an actor-role match must not also appear as a
      // transaction-type match, etc.
      expect(bucket.transactionTypes).not.toEqual(expect.arrayContaining(bucket.actorRoles));
    }
  });

  it("leaves every category empty when nothing in that category matched", () => {
    const noMatchFinding = makeFinding({
      recordId: "SYN-CAT-02",
      provisionIds: ["TEST-PROV-CAT"],
      transactionTypes: ["preferential_allotment"],
      actorRoles: ["promoter"],
      allegedConduct: ["fund_diversion"],
      evidenceTypes: ["bank_statements_flow"],
    });
    // Question-A polarity correction pass: a provision now requires at
    // least one ADVERSE (conduct-kind) concept tag to be positively matched
    // to remain a provisionResults candidate at all (see
    // deriveCandidateTier's own header comment in engine.ts) — a
    // topic-only match (transaction/actor alone, as this test originally
    // used) is correctly reclassified to governingProvisionResults, which
    // does not carry matchedByCategory. The entered text below states the
    // diversion fact too, so allegedConduct genuinely matches and this
    // provision remains a candidate; evidenceTypes stays deliberately
    // unmentioned, preserving this test's own purpose (an unmatched
    // category is left empty, never spuriously populated).
    const result = analyzeScenario(
      { freeText: "A preferential allotment was made to the promoter. Company funds were diverted." },
      [noMatchFinding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-CAT");
    expect(pr).toBeDefined();
    expect(pr!.matchedByCategory.allegedConduct.length).toBeGreaterThan(0);
    expect(pr!.matchedByCategory.evidenceTypes).toEqual([]);
  });
});
