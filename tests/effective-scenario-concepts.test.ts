// Guards buildEffectiveScenarioConcepts, the single canonical representation
// that unifies free-text-detected concepts with the officer's dropdown
// selections (actor role / scenario type / evidence indicator). Before this,
// a dropdown selection added an ad hoc score bonus via a separate code path
// and was invisible in "matched factual ingredients"/"why relevant" unless
// the same fact was ALSO independently free-text-detected - these tests
// guard that the unification actually closed that transparency gap, not
// merely that the score arithmetic still comes out the same.
import { describe, expect, it } from "vitest";
import { analyzeScenario, buildEffectiveScenarioConcepts } from "@/lib/matching/engine";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
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

describe("buildEffectiveScenarioConcepts", () => {
  it("adds a selected signal id as its own concept, carrying the CONCEPT_TAGS label and kind", () => {
    const merged = buildEffectiveScenarioConcepts([], "promoter", null, null);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "promoter", kind: "actor", label: "Promoter" });
  });

  it("does not duplicate a signal id already present from free-text detection", () => {
    const detected = detectConcepts("There was a false certification by the promoter.");
    expect(detected.some((c) => c.id === "promoter")).toBe(true);
    const merged = buildEffectiveScenarioConcepts(detected, "promoter", null, null);
    expect(merged.filter((c) => c.id === "promoter")).toHaveLength(1);
  });

  it("silently ignores a signal id that is not in the curated vocabulary rather than fabricating a concept", () => {
    const merged = buildEffectiveScenarioConcepts([], "not_a_real_tag_id", null, null);
    expect(merged.some((c) => c.id === "not_a_real_tag_id")).toBe(false);
  });

  it("merges all three signal kinds independently of each other", () => {
    const merged = buildEffectiveScenarioConcepts([], "promoter", "fund_diversion", "bank_statements_flow");
    expect(merged.map((c) => c.id).sort()).toEqual(["bank_statements_flow", "fund_diversion", "promoter"].sort());
  });
});

describe("dropdown-selected concepts are visible in matched-ingredient output, not just the score", () => {
  it("shows an actor selected only via the dropdown (never mentioned in free text) inside matchedFactualIngredients and matchedByCategory", () => {
    const provision = makeProvision({ id: "TEST-PROV-SIGNAL-VISIBILITY" });
    const finding = makeFinding({
      recordId: "SYN-SIGNAL-01",
      provisionIds: ["TEST-PROV-SIGNAL-VISIBILITY"],
      allegedConduct: ["false_compliance_certification"],
      actorRoles: ["promoter"],
    });
    // Free text mentions the conduct but deliberately never says "promoter"
    // or any actor-role synonym - only the dropdown selection asserts it.
    const result = analyzeScenario(
      { freeText: "There was a false certification.", actorSignal: "promoter" },
      [finding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-SIGNAL-VISIBILITY");
    expect(pr).toBeDefined();
    expect(pr!.matchedFactualIngredients).toContain("Promoter");
    expect(pr!.matchedByCategory.actorRoles).toContain("Promoter");
  });

  it("produces the identical score whether an actor fact is stated in free text or selected via the equivalent dropdown", () => {
    const provision = makeProvision({ id: "TEST-PROV-SIGNAL-PARITY" });
    const finding = makeFinding({
      recordId: "SYN-PARITY-01",
      provisionIds: ["TEST-PROV-SIGNAL-PARITY"],
      allegedConduct: ["false_compliance_certification"],
      actorRoles: ["promoter"],
    });
    const viaFreeText = analyzeScenario(
      { freeText: "There was a false certification by the promoter." },
      [finding],
      [provision],
      []
    );
    const viaSignal = analyzeScenario(
      { freeText: "There was a false certification.", actorSignal: "promoter" },
      [finding],
      [provision],
      []
    );
    const prText = viaFreeText.provisionResults.find((p) => p.provision.id === "TEST-PROV-SIGNAL-PARITY");
    const prSignal = viaSignal.provisionResults.find((p) => p.provision.id === "TEST-PROV-SIGNAL-PARITY");
    expect(prText).toBeDefined();
    expect(prSignal).toBeDefined();
    expect(prSignal!.supportingPrecedents[0].score).toBe(prText!.supportingPrecedents[0].score);
  });

  it("does not double-count when the same fact is both free-text-detected and separately selected via the dropdown", () => {
    const provision = makeProvision({ id: "TEST-PROV-NO-DOUBLE-COUNT" });
    const finding = makeFinding({
      recordId: "SYN-NO-DOUBLE-01",
      provisionIds: ["TEST-PROV-NO-DOUBLE-COUNT"],
      allegedConduct: ["false_compliance_certification"],
      actorRoles: ["promoter"],
    });
    const redundant = analyzeScenario(
      { freeText: "There was a false certification by the promoter.", actorSignal: "promoter" },
      [finding],
      [provision],
      []
    );
    const freeTextOnly = analyzeScenario(
      { freeText: "There was a false certification by the promoter." },
      [finding],
      [provision],
      []
    );
    const prRedundant = redundant.provisionResults.find((p) => p.provision.id === "TEST-PROV-NO-DOUBLE-COUNT");
    const prFreeTextOnly = freeTextOnly.provisionResults.find((p) => p.provision.id === "TEST-PROV-NO-DOUBLE-COUNT");
    expect(prRedundant!.supportingPrecedents[0].score).toBe(prFreeTextOnly!.supportingPrecedents[0].score);
  });

  it("folds a dropdown-selected fact into justifyingTags gating on a per-provision link, same as a free-text one would", () => {
    const provision = makeProvision({ id: "TEST-PROV-NARROW" });
    const finding = makeFinding({
      recordId: "SYN-NARROW-01",
      provisionIds: ["TEST-PROV-NARROW"],
      allegedConduct: ["false_compliance_certification"],
      evidenceTypes: ["bank_statements_flow"],
      provisionLinks: [{ provisionId: "TEST-PROV-NARROW", justifyingTags: ["bank_statements_flow"] }],
    });
    // Free text alone never mentions the evidence type, so the narrowed
    // link should not surface without the dropdown selection.
    const withoutSignal = analyzeScenario({ freeText: "There was a false certification." }, [finding], [provision], []);
    expect(withoutSignal.provisionResults.find((p) => p.provision.id === "TEST-PROV-NARROW")).toBeUndefined();

    const withSignal = analyzeScenario(
      { freeText: "There was a false certification.", evidenceSignal: "bank_statements_flow" },
      [finding],
      [provision],
      []
    );
    expect(withSignal.provisionResults.find((p) => p.provision.id === "TEST-PROV-NARROW")).toBeDefined();
  });
});
