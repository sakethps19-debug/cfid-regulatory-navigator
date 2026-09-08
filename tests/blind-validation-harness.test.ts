// P1-16: guards the blind-validation-harness SCAFFOLD - both that the
// metrics computation (precision/recall/F1) is arithmetically correct, and
// that the real scenario set ships genuinely empty, so this scaffold can
// never be mistaken for a completed validation study. Populating
// BLIND_VALIDATION_SCENARIOS with real data is explicitly out of scope for
// this pass (see the module's own doc comment for why) - this test exists
// to keep that boundary honest, not to claim a study occurred.
import { describe, expect, it } from "vitest";
import { BLIND_VALIDATION_SCENARIOS, runBlindValidation, type BlindValidationScenario } from "@/lib/validation/blindHarness";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

describe("BLIND_VALIDATION_SCENARIOS ships empty", () => {
  it("is genuinely empty, never fabricated or partially populated by an engineer", () => {
    expect(BLIND_VALIDATION_SCENARIOS).toEqual([]);
  });

  it("running the harness against zero scenarios reports scenarioCount 0 and null metrics, never a false '100% score'", () => {
    const summary = runBlindValidation([], [], [], []);
    expect(summary.scenarioCount).toBe(0);
    expect(summary.results).toEqual([]);
    expect(summary.microPrecision).toBeNull();
    expect(summary.microRecall).toBeNull();
    expect(summary.microF1).toBeNull();
  });
});

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

describe("runBlindValidation: metrics arithmetic on synthetic scenarios", () => {
  const provisionA = makeProvision({ id: "TEST-PROV-A" });
  const provisionB = makeProvision({ id: "TEST-PROV-B" });
  const finding = makeFinding({
    recordId: "SYN-01",
    provisionIds: [provisionA.id],
    allegedConduct: ["fund_diversion"],
  });

  it("scores a perfect scenario (expected provision returned, nothing extra) with precision and recall both 1", () => {
    const scenario: BlindValidationScenario = {
      id: "BV-TEST-1",
      freeText: "Company funds were diverted.",
      mustAppearProvisionIds: [provisionA.id],
      mustNotAppearProvisionIds: [provisionB.id],
      reviewedBy: "Test Reviewer",
      reviewedOn: "2026-01-01",
      rationale: "Synthetic test fixture.",
    };
    const summary = runBlindValidation([scenario], [finding], [provisionA, provisionB], []);
    expect(summary.results).toHaveLength(1);
    expect(summary.results[0].precision).toBe(1);
    expect(summary.results[0].recall).toBe(1);
    expect(summary.results[0].falseNegatives).toEqual([]);
    expect(summary.results[0].falsePositives).toEqual([]);
    expect(summary.microPrecision).toBe(1);
    expect(summary.microRecall).toBe(1);
    expect(summary.microF1).toBe(1);
  });

  it("scores a scenario where the expected provision is missing entirely (recall 0)", () => {
    const scenario: BlindValidationScenario = {
      id: "BV-TEST-2",
      freeText: "The office canteen menu changed for next week.",
      mustAppearProvisionIds: [provisionA.id],
      mustNotAppearProvisionIds: [],
      reviewedBy: "Test Reviewer",
      reviewedOn: "2026-01-01",
      rationale: "Deliberately unrelated text - the provision cannot be returned.",
    };
    const summary = runBlindValidation([scenario], [finding], [provisionA, provisionB], []);
    expect(summary.results[0].recall).toBe(0);
    expect(summary.results[0].falseNegatives).toEqual([provisionA.id]);
    // precision is null here since nothing was returned at all (0/0 is
    // undefined, not a false "perfect" 1 or a false "zero" 0).
    expect(summary.results[0].precision).toBeNull();
  });

  it("computes micro-averaging correctly across scenarios of different sizes rather than a naive per-scenario mean", () => {
    const bigScenario: BlindValidationScenario = {
      id: "BV-TEST-3",
      freeText: "Company funds were diverted.",
      mustAppearProvisionIds: [provisionA.id, "TEST-PROV-NONEXISTENT-1", "TEST-PROV-NONEXISTENT-2"],
      mustNotAppearProvisionIds: [],
      reviewedBy: "Test Reviewer",
      reviewedOn: "2026-01-01",
      rationale: "3 expected, only 1 returnable - recall 1/3.",
    };
    const smallScenario: BlindValidationScenario = {
      id: "BV-TEST-4",
      freeText: "Company funds were diverted.",
      mustAppearProvisionIds: [provisionA.id],
      mustNotAppearProvisionIds: [],
      reviewedBy: "Test Reviewer",
      reviewedOn: "2026-01-01",
      rationale: "1 expected, 1 returned - recall 1/1.",
    };
    const summary = runBlindValidation([bigScenario, smallScenario], [finding], [provisionA, provisionB], []);
    // Micro recall = total true positives / total expected = (1+1) / (3+1) = 0.5,
    // distinct from a naive mean of per-scenario recalls ((1/3 + 1) / 2 ≈ 0.667).
    expect(summary.microRecall).toBeCloseTo(0.5);
  });
});
