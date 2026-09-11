// A finding with status "Alleged", "Inconclusive", or "Procedural
// observation" has had no determination made on the merits either way. It
// still shows in results (with its true status badge, per StatusBadge.tsx —
// never hidden).
//
// This file previously asserted that such a status hard-capped the
// factual-overlap ("confidence") tier at Low, regardless of how strong the
// actual category overlap was — e.g. a genuinely 4-category, full-overlap
// "Alleged" finding used to be forced to read as "Low confidence" purely
// because of its own disposition. That was itself an instance of the exact
// defect a later correctness pass (see engine.ts, deriveConfidence's
// docstring) identified and removed: procedural disposition contaminating
// the factual-overlap measure. Under the corrected architecture, factual
// overlap and disposition are two independent, separately-displayed
// dimensions (see StatusBadge for disposition, the factual-overlap badge
// for the overlap tier) — a strong factual match on an unresolved
// allegation now correctly reads as "strong factual overlap" AND
// separately, honestly, "Alleged" (untested), rather than one number
// silently blending the two and hiding which was which.
import { describe, expect, it } from "vitest";
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
    id: "LODR-6-gen",
    instrument: "Mock Instrument",
    provisionNumber: "Mock 1",
    subject: null,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: ["Mock Case Limited"],
    treatmentInPilotOrders: "Cited in 1 finding.",
    lawLibraryNote: null,
    ...overrides,
  };
}

describe("Factual-overlap tiering is independent of disposition (Alleged/Inconclusive/Procedural observation)", () => {
  it("a full 4-category overlap on an 'Alleged' finding reaches High factual overlap — its own status is reported separately, not blended into the tier", () => {
    const provision = makeProvision({ id: "LODR-6-gen" });
    const finding = makeFinding({
      findingStatus: "Alleged",
      transactionTypes: ["related_party_transaction"],
      actorRoles: ["company"],
      allegedConduct: ["compliance_officer_deficiency"],
      evidenceTypes: ["bank_statements_flow"],
      finalParagraphReferences: null,
      provisionIds: [provision.id],
    });
    const result = analyzeScenario(
      { freeText: "There was a Compliance Officer vacancy at the listed company. There was also a related party transaction, per bank statements." },
      [finding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === provision.id);
    expect(pr?.confidence).toBe("High");
    // The finding's own disposition is still visible — separately, not as
    // part of the tier computation — as a caveat in the reasons and as the
    // finding's own findingStatus (rendered via StatusBadge elsewhere).
    expect(pr?.confidenceReasons.join(" ")).toMatch(/Alleged/);
    expect(pr?.supportingPrecedents[0]?.finding.findingStatus).toBe("Alleged");
  });

  it("a 2-category overlap on an 'Inconclusive' finding reaches Medium factual overlap on its overlap alone, not Low by virtue of its status", () => {
    const provision = makeProvision({ id: "LODR-6-gen" });
    const finding = makeFinding({
      findingStatus: "Inconclusive",
      transactionTypes: ["related_party_transaction"],
      allegedConduct: ["compliance_officer_deficiency"],
      finalParagraphReferences: "Para 5",
      provisionIds: [provision.id],
    });
    const result = analyzeScenario(
      { freeText: "There was a Compliance Officer vacancy at the listed company. There was also a related party transaction." },
      [finding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === provision.id);
    expect(pr?.confidence).toBe("Medium");
  });

  it("prefers a genuinely resolved (Upheld) finding over a higher-scoring Alleged one as the confidence-reasoning anchor, and reports that resolved finding's own (here more modest) factual overlap honestly", () => {
    const provision = makeProvision({ id: "LODR-6-gen" });
    const allegedFinding = makeFinding({
      recordId: "MOCK-ALLEGED",
      findingStatus: "Alleged",
      transactionTypes: ["related_party_transaction"],
      actorRoles: ["company"],
      allegedConduct: ["compliance_officer_deficiency"],
      evidenceTypes: ["bank_statements_flow"],
      finalParagraphReferences: null,
      provisionIds: [provision.id],
    });
    const upheldFinding = makeFinding({
      recordId: "MOCK-UPHELD",
      findingStatus: "Confirmed in Final Order",
      transactionTypes: ["related_party_transaction"],
      actorRoles: ["company"],
      allegedConduct: ["compliance_officer_deficiency"],
      finalParagraphReferences: "Para 20",
      provisionIds: [provision.id],
    });
    const result = analyzeScenario(
      { freeText: "There was a Compliance Officer vacancy at the listed company. There was also a related party transaction, per bank statements." },
      [allegedFinding, upheldFinding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === provision.id);
    // The resolved finding is the anchor (its own 3-category, score-8
    // overlap — it has no evidenceTypes tag, unlike the alleged one — falls
    // short of the score>=9 threshold for High, so Medium is the honest
    // reading of ITS overlap, not a value borrowed from the higher-scoring
    // but unresolved alternative).
    expect(pr?.confidence).toBe("Medium");
    expect(pr?.supportingPrecedents.some((s) => s.finding.recordId === "MOCK-UPHELD")).toBe(true);
  });
});
