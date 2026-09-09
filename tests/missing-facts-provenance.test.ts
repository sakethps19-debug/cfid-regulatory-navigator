// Guards P0-7: ProvisionResult.missingFacts must keep each supporting
// precedent's own evidentiary gaps attributed to that precedent, never
// flattened into one shared, deduplicated, unattributed list. Before this,
// two different precedents' gaps for the same provision were merged with
// Array.flatMap + a Set-based dedupe, which silently presented precedent
// B's own outstanding evidence as if it were a universal requirement of
// the provision itself (or, worse, of precedent A's own facts).
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

describe("missingFacts provenance", () => {
  it("keeps two supporting precedents' distinct evidentiary gaps in separate, per-precedent groups", () => {
    const provision = makeProvision({ id: "TEST-PROV-PROVENANCE" });
    const findingA = makeFinding({
      recordId: "SYN-A",
      provisionIds: ["TEST-PROV-PROVENANCE"],
      allegedConduct: ["false_compliance_certification"],
      evidentiaryGaps: ["Bank statement trail for the specific transaction."],
    });
    const findingB = makeFinding({
      recordId: "SYN-B",
      provisionIds: ["TEST-PROV-PROVENANCE"],
      allegedConduct: ["false_compliance_certification"],
      evidentiaryGaps: ["Board resolution authorizing the transaction."],
    });
    const result = analyzeScenario(
      { freeText: "There was a false certification." },
      [findingA, findingB],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-PROVENANCE");
    expect(pr).toBeDefined();
    expect(pr!.missingFacts).toHaveLength(2);
    const byRecordId = new Map(pr!.missingFacts.map((g) => [g.recordId, g.gaps]));
    expect(byRecordId.get("SYN-A")).toEqual(["Bank statement trail for the specific transaction."]);
    expect(byRecordId.get("SYN-B")).toEqual(["Board resolution authorizing the transaction."]);
    // Neither precedent's group should contain the other's gap - a flat
    // merge would have made both groups (or a single merged list) contain
    // both items.
    expect(byRecordId.get("SYN-A")).not.toContain("Board resolution authorizing the transaction.");
    expect(byRecordId.get("SYN-B")).not.toContain("Bank statement trail for the specific transaction.");
  });

  it("omits a precedent entirely from missingFacts when it has no genuine gaps, rather than including an empty group", () => {
    const provision = makeProvision({ id: "TEST-PROV-EMPTY-GROUP" });
    const findingWithGap = makeFinding({
      recordId: "SYN-WITH-GAP",
      provisionIds: ["TEST-PROV-EMPTY-GROUP"],
      allegedConduct: ["false_compliance_certification"],
      evidentiaryGaps: ["Independent verification of the transaction."],
    });
    const findingNoGap = makeFinding({
      recordId: "SYN-NO-GAP",
      provisionIds: ["TEST-PROV-EMPTY-GROUP"],
      allegedConduct: ["false_compliance_certification"],
      evidentiaryGaps: [],
    });
    const result = analyzeScenario(
      { freeText: "There was a false certification." },
      [findingWithGap, findingNoGap],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "TEST-PROV-EMPTY-GROUP");
    expect(pr!.missingFacts).toEqual([
      { recordId: "SYN-WITH-GAP", scenarioTitle: "Synthetic finding", gaps: ["Independent verification of the transaction."] },
    ]);
  });
});
