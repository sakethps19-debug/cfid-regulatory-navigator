// CHECKPOINT CORRECTION B/C — dedicated regression suite.
//
// Part B: an UNGATED provision (no curated retrieval rule of its own) must
// never reach provisionResults (the "potentially relevant to my scenario"
// applicability surface) merely because a specific linked precedent's own
// conduct tags happen to overlap the entered facts — see engine.ts's
// `if (!rule) { ... }` branch, added right after the existing
// conductIdsMatched===0 governing branch.
//
// Part C: a provision whose own curated rule rides on the shared
// ANY_SUBSTANTIVE_VIOLATION_CONDUCT umbrella gate (ridesOnEstablishedSubstantiveViolation,
// provision-retrieval-rules.ts) — carrying an explanation stating it is
// "shown once some OTHER substantive violation is established" — must not
// read as a current-scenario applicability candidate unless a real
// primary_candidate is independently established elsewhere in the SAME
// result. See engine.ts's post-loop demotion pass.
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

describe("Checkpoint correction B: ungated provisions never leak into provisionResults via precedent-conduct overlap alone", () => {
  it("a genuinely ungated provision (LODR-2-zc, a bare RPT definition, no curated rule) does not appear in provisionResults despite real conduct-tag overlap", () => {
    const provision = makeProvision({ id: "LODR-2-zc", subject: "Related party definition" });
    const finding = makeFinding({
      recordId: "SYN-UNGATED-01",
      provisionIds: [provision.id],
      allegedConduct: ["related_party_misrepresentation"],
    });
    const result = analyzeScenario(
      { freeText: "There was a false RPT disclosure with the related-party transaction." },
      [finding],
      [provision],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === "LODR-2-zc")).toBe(false);
  });

  it("that same ungated provision instead appears in governingProvisionResults with polarityClass 'no_independent_retrieval_rule'", () => {
    const provision = makeProvision({ id: "LODR-2-zc", subject: "Related party definition" });
    const finding = makeFinding({
      recordId: "SYN-UNGATED-02",
      provisionIds: [provision.id],
      allegedConduct: ["related_party_misrepresentation"],
    });
    const result = analyzeScenario(
      { freeText: "There was a false RPT disclosure with the related-party transaction." },
      [finding],
      [provision],
      []
    );
    const gp = result.governingProvisionResults.find((g) => g.provision.id === "LODR-2-zc");
    expect(gp).toBeDefined();
    expect(gp?.polarityClass).toBe("no_independent_retrieval_rule");
    expect(gp?.note).toMatch(/no independently curated legal-retrieval rule/);
  });

  it("an ungated provision with NO conduct overlap at all still lands in governingProvisionResults (unaffected, pre-existing behavior)", () => {
    const provision = makeProvision({ id: "LODR-2-zc", subject: "Related party definition" });
    const finding = makeFinding({
      recordId: "SYN-UNGATED-03",
      provisionIds: [provision.id],
      transactionTypes: ["related_party_transaction"],
    });
    const result = analyzeScenario({ freeText: "There was a related-party transaction." }, [finding], [provision], []);
    expect(result.provisionResults.some((p) => p.provision.id === "LODR-2-zc")).toBe(false);
    expect(result.governingProvisionResults.some((g) => g.provision.id === "LODR-2-zc")).toBe(true);
  });

  it("the two real, now-gated Compliance-Officer/Audit-Committee provisions correctly appear as PRIMARY candidates once their own independent rule is satisfied (positive control — not a regression of the underlying fix)", () => {
    const co = makeProvision({ id: "LODR-6-gen", subject: "Compliance Officer appointment" });
    const finding = makeFinding({
      recordId: "SYN-CO-POSITIVE",
      provisionIds: [co.id],
      allegedConduct: ["compliance_officer_deficiency"],
      transactionTypes: ["compliance_officer_appointment"],
    });
    const result = analyzeScenario(
      { freeText: "There was a Compliance Officer vacancy for six months." },
      [finding],
      [co],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "LODR-6-gen");
    expect(pr).toBeDefined();
    expect(pr?.candidateTier).toBe("primary_candidate");
  });
});

describe("Checkpoint correction C: a provision riding on ANY_SUBSTANTIVE_VIOLATION_CONDUCT requires a real established primary_candidate elsewhere in the result", () => {
  it("SEBI-ACT-15HB alone, on a bare fund-diversion mention with no other provision in play, demotes to governingProvisionResults ('rides_on_unretrieved_primary_dependency'), not provisionResults", () => {
    const provision = makeProvision({ id: "SEBI-ACT-15HB", subject: "Residual penalty" });
    const finding = makeFinding({
      recordId: "SYN-15HB-ALONE",
      provisionIds: [provision.id],
      allegedConduct: ["fund_diversion"],
    });
    const result = analyzeScenario(
      { freeText: "Company funds were diverted to promoter-controlled entities." },
      [finding],
      [provision],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === "SEBI-ACT-15HB")).toBe(false);
    const gp = result.governingProvisionResults.find((g) => g.provision.id === "SEBI-ACT-15HB");
    expect(gp).toBeDefined();
    expect(gp?.polarityClass).toBe("rides_on_unretrieved_primary_dependency");
  });

  it("SEBI-ACT-15HB DOES appear in provisionResults (related_ancillary) once a genuine, independently gated primary_candidate is also established in the same result", () => {
    const penalty = makeProvision({ id: "SEBI-ACT-15HB", subject: "Residual penalty" });
    const co = makeProvision({ id: "LODR-6-gen", subject: "Compliance Officer appointment" });
    const penaltyFinding = makeFinding({
      recordId: "SYN-15HB-WITH-PRIMARY",
      provisionIds: [penalty.id],
      allegedConduct: ["fund_diversion"],
    });
    const coFinding = makeFinding({
      recordId: "SYN-CO-COMPANION",
      provisionIds: [co.id],
      allegedConduct: ["compliance_officer_deficiency"],
      transactionTypes: ["compliance_officer_appointment"],
    });
    const result = analyzeScenario(
      {
        freeText:
          "Company funds were diverted to promoter-controlled entities. Separately, there was a Compliance Officer vacancy for six months.",
      },
      [penaltyFinding, coFinding],
      [penalty, co],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === "LODR-6-gen" && p.candidateTier === "primary_candidate")).toBe(true);
    const penaltyResult = result.provisionResults.find((p) => p.provision.id === "SEBI-ACT-15HB");
    expect(penaltyResult).toBeDefined();
    expect(penaltyResult?.candidateTier).toBe("related_ancillary");
  });

  it("real-corpus regression: the 'Rights issue funds diverted' quick-start template (bare fund_diversion, no independently gated primary in the fixed-scenario corpus) now correctly returns zero applicability candidates rather than 15 unsupported general-principle/penalty results", () => {
    const provisions = [
      makeProvision({ id: "LODR-4-1", subject: "General principle" }),
      makeProvision({ id: "SEBI-ACT-15HB", subject: "Residual penalty" }),
    ];
    const finding = makeFinding({
      recordId: "SYN-RIGHTS-ISSUE",
      provisionIds: provisions.map((p) => p.id),
      allegedConduct: ["fund_diversion"],
      transactionTypes: ["rights_issue"],
    });
    const result = analyzeScenario(
      { freeText: "A listed company raised proceeds through a rights issue. The funds were subsequently diverted to promoter-controlled entities." },
      [finding],
      provisions,
      []
    );
    expect(result.provisionResults).toHaveLength(0);
    expect(result.hasResults).toBe(true);
  });
});
