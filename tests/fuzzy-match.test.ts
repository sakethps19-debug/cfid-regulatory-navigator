// The "safe" semantic-assist layer requested after live-demo feedback:
// "if I want to use AI or any other thing for better reading and
// understanding of the scenario... that would be very very very useful."
// The user separately chose the conservative option when asked how much
// risk this should carry into the demo — semantic assist alongside the
// existing deterministic engine, never a separate AI-driven scoring path.
// This corrects likely typos against the curated concept vocabulary before
// concept detection runs; it must never "correct" an already-valid word,
// never guess between two equally-plausible fixes, and never touch short
// words where a one-letter edit collides with ordinary English (see the
// "found"/"fund" case below).
import { describe, expect, it } from "vitest";
import { applySemanticAssist, levenshteinDistance, PROTECTED_TERMS } from "@/lib/matching/fuzzyMatch";
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
    id: "MOCK-PROV",
    instrument: "Mock Instrument",
    provisionNumber: "Reg 1",
    subject: "Mock subject",
    currentTextVerificationStatus: "Officially verified",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

describe("levenshteinDistance", () => {
  it("is 0 for identical strings", () => {
    expect(levenshteinDistance("preferential", "preferential")).toBe(0);
  });

  it("counts a single substitution", () => {
    expect(levenshteinDistance("circular", "circulai")).toBe(1);
  });

  it("counts a single deletion", () => {
    expect(levenshteinDistance("prefrential", "preferential")).toBe(1);
  });

  it("respects the cap for very different strings", () => {
    expect(levenshteinDistance("preferential", "xyz", 2)).toBeGreaterThan(2);
  });
});

describe("applySemanticAssist", () => {
  it("corrects a one-letter-missing typo of a long domain word", () => {
    const { correctedText, corrections } = applySemanticAssist("This looks like a prefrential allotment scheme.");
    expect(correctedText).toContain("preferential allotment");
    expect(corrections).toEqual([{ original: "prefrential", corrected: "preferential" }]);
  });

  it("leaves already-correct text completely unchanged, with no corrections reported", () => {
    const text = "There was a preferential allotment to promoter entities via circular fund movement.";
    const { correctedText, corrections } = applySemanticAssist(text);
    expect(correctedText).toBe(text);
    expect(corrections).toEqual([]);
  });

  it("preserves trailing punctuation and original spacing", () => {
    const { correctedText } = applySemanticAssist("Alleged fund diversion, with inadequate disclosur.  Also delayed.");
    expect(correctedText).toBe("Alleged fund diversion, with inadequate disclosure.  Also delayed.");
  });

  it("preserves capitalization of the corrected word", () => {
    const { correctedText } = applySemanticAssist("Prefrential allotment to a related party.");
    expect(correctedText.startsWith("Preferential allotment")).toBe(true);
  });

  it("does not touch ordinary short English words even when close to a domain word", () => {
    // "found" is one deletion away from "fund", but "fund" is only 4 letters
    // (below the correction floor) and "found" is common, unrelated English
    // — must never be silently rewritten.
    const { correctedText, corrections } = applySemanticAssist("The investigation found no evidence of wrongdoing.");
    expect(correctedText).toBe("The investigation found no evidence of wrongdoing.");
    expect(corrections).toEqual([]);
  });

  it("does not correct a genuinely unrelated word with no close vocabulary match", () => {
    const { correctedText, corrections } = applySemanticAssist("The parties discussed a landscaping contract.");
    expect(correctedText).toBe("The parties discussed a landscaping contract.");
    expect(corrections).toEqual([]);
  });

  it("returns no corrections for empty text", () => {
    expect(applySemanticAssist("")).toEqual({ correctedText: "", corrections: [] });
  });
});

// Pre-demo remediation finding (P0): a correctly-spelled "verification" was
// silently rewritten to "certification" because "verification" itself was
// never a literal curated concept-tag synonym word (so it fell through to
// the edit-distance search), while "certification" was (via the curated
// synonym "false certification") and sat within edit-distance tolerance.
// These are valid but legally DIFFERENT concepts and must never be
// auto-substituted for one another. See PROTECTED_TERMS in fuzzyMatch.ts.
describe("applySemanticAssist: protected vocabulary never normalizes one valid term into a different valid term", () => {
  it("verification is never normalized to certification -- the specific reported defect", () => {
    const text = "The order records independent verification of the transaction records by the compliance team.";
    const { correctedText, corrections } = applySemanticAssist(text);
    expect(correctedText).toBe(text);
    expect(correctedText).toContain("verification");
    expect(correctedText).not.toContain("certification");
    expect(corrections).toEqual([]);
  });

  it("certification is never normalized to verification (the reverse direction)", () => {
    const text = "The CEO/CFO certification under Regulation 17(8) was allegedly false.";
    const { correctedText, corrections } = applySemanticAssist(text);
    expect(correctedText).toBe(text);
    expect(corrections).toEqual([]);
  });

  it("every listed protected term, standing alone, is left untouched by applySemanticAssist when correctly spelled", () => {
    for (const term of PROTECTED_TERMS) {
      const { correctedText, corrections } = applySemanticAssist(term);
      expect(correctedText).toBe(term);
      expect(corrections.some((c) => c.original === term)).toBe(false);
    }
  });

  it("a genuine misspelling of a protected term still corrects back to that SAME term (a spelling fix, not a meaning change)", () => {
    const { correctedText, corrections } = applySemanticAssist("Independent verfication of the disclosur was not obtained.");
    expect(correctedText).toContain("verification");
    expect(correctedText).toContain("disclosure");
    expect(corrections).toEqual(
      expect.arrayContaining([
        { original: "verfication", corrected: "verification" },
        { original: "disclosur", corrected: "disclosure" },
      ])
    );
  });

  it("retains the pre-existing 'preferential' typo correction unaffected by the protected-vocabulary guard", () => {
    const { correctedText, corrections } = applySemanticAssist("An alleged prefrential allotment to related parties.");
    expect(correctedText).toContain("preferential allotment");
    expect(corrections).toEqual([{ original: "prefrential", corrected: "preferential" }]);
  });
});

describe("semantic assist integration with analyzeScenario", () => {
  const provision = makeProvision({ id: "MOCK-PREF", subject: "Preferential allotment safeguards." });
  // allegedConduct here must be a real concept-tag id ("preferential_allotment"
  // in concept-tags.ts) so detectConcepts's output actually overlaps with it.
  const findingWithRealTag = makeFinding({
    recordId: "MOCK-PREF-01",
    allegedConduct: ["preferential_allotment"],
    provisionIds: [provision.id],
  });

  it("still detects and surfaces a provision when the free text has a typo the engine can correct", () => {
    const result = analyzeScenario(
      { freeText: "There was a prefrential allotment of shares to a related party without proper disclosur." },
      [findingWithRealTag],
      [provision],
      []
    );
    expect(result.semanticAssist).toEqual(
      expect.arrayContaining([
        { original: "prefrential", corrected: "preferential" },
        { original: "disclosur", corrected: "disclosure" },
      ])
    );
    expect(result.detectedConceptLabels.length).toBeGreaterThan(0);
    expect(result.provisionResults.some((p) => p.provision.id === provision.id)).toBe(true);
  });

  it("leaves query.freeText exactly as entered, never rewriting what is shown back to the user", () => {
    const original = "There was a prefrential allotment of shares.";
    const result = analyzeScenario({ freeText: original }, [findingWithRealTag], [provision], []);
    expect(result.query.freeText).toBe(original);
  });
});
