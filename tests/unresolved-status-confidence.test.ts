// A finding with status "Alleged", "Inconclusive", or "Procedural
// observation" has had no determination made on the merits either way. It
// still shows in results (with its true status badge, per StatusBadge.tsx —
// never hidden), but must not drive a provision to High confidence purely
// on keyword/category overlap, since that would read an untested allegation
// as settled precedent.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  return {
    recordId: "MOCK-01",
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    noticeeActors: [],
    findingStatus: "Upheld",
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
    ...overrides,
  };
}

function makeProvision(overrides: Partial<LegalProvision>): LegalProvision {
  return {
    id: "MOCK-PROVISION",
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

describe("Confidence tiering — unresolved finding statuses", () => {
  it("caps confidence at Low when the only supporting finding is 'Alleged', even with full category overlap", () => {
    const provision = makeProvision({ id: "MOCK-PROVISION" });
    const finding = makeFinding({
      findingStatus: "Alleged",
      transactionTypes: ["related_party_transaction"],
      actorRoles: ["promoter"],
      allegedConduct: ["fund_diversion"],
      evidenceTypes: ["bank_statements_flow"],
      finalParagraphReferences: null,
      provisionIds: [provision.id],
    });
    const result = analyzeScenario(
      { freeText: "The promoter diverted funds via a related party transaction, per bank statements." },
      [finding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === provision.id);
    expect(pr?.confidence).toBe("Low");
    expect(pr?.confidenceReasons.join(" ")).toMatch(/Alleged/);
  });

  it("caps confidence at Low when the only supporting finding is 'Inconclusive'", () => {
    const provision = makeProvision({ id: "MOCK-PROVISION" });
    const finding = makeFinding({
      findingStatus: "Inconclusive",
      transactionTypes: ["related_party_transaction"],
      allegedConduct: ["fund_diversion"],
      finalParagraphReferences: "Para 5",
      provisionIds: [provision.id],
    });
    const result = analyzeScenario(
      { freeText: "The promoter diverted funds via a related party transaction." },
      [finding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === provision.id);
    expect(pr?.confidence).toBe("Low");
  });

  it("still reaches High confidence when a genuinely resolved (Upheld) finding also supports the provision, even if a higher-scoring Alleged finding matches too", () => {
    const provision = makeProvision({ id: "MOCK-PROVISION" });
    const allegedFinding = makeFinding({
      recordId: "MOCK-ALLEGED",
      findingStatus: "Alleged",
      transactionTypes: ["related_party_transaction"],
      actorRoles: ["promoter"],
      allegedConduct: ["fund_diversion"],
      evidenceTypes: ["bank_statements_flow"],
      finalParagraphReferences: null,
      provisionIds: [provision.id],
    });
    const upheldFinding = makeFinding({
      recordId: "MOCK-UPHELD",
      findingStatus: "Upheld",
      transactionTypes: ["related_party_transaction"],
      actorRoles: ["promoter"],
      allegedConduct: ["fund_diversion"],
      finalParagraphReferences: "Para 20",
      provisionIds: [provision.id],
    });
    const result = analyzeScenario(
      { freeText: "The promoter diverted funds via a related party transaction, per bank statements." },
      [allegedFinding, upheldFinding],
      [provision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === provision.id);
    expect(pr?.confidence).toBe("High");
  });
});
