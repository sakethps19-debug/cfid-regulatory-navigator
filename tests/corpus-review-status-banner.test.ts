// CorpusReviewStatusBanner: pre-demo remediation P0 (Section 4) -- a
// corpus-level "how much has actually been legally reviewed / officially
// verified" warning shown on Analyzer, Cases, Compare Scenarios and Law
// wherever unreviewed curated material is surfaced, so "published to
// search" is never left implicitly read as "legally approved."
import { describe, expect, it } from "vitest";
import { corpusReviewStatusCounts } from "@/components/CorpusReviewStatusBanner";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string }): ScenarioFinding {
  return {
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
    noticeeActors: [],
    findingStatus: "Prima facie",
    interimParagraphReferences: null,
    finalParagraphReferences: null,
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

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "Mock Instrument",
    provisionNumber: "Reg 1",
    subject: "Mock subject",
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

describe("corpusReviewStatusCounts", () => {
  it("counts human-legally-reviewed only among SEARCHABLE findings, never Draft/Quarantined/Withdrawn", () => {
    const findings = [
      makeFinding({ recordId: "A", publicationStatus: "Published to search", humanLegalReviewCompleted: true }),
      makeFinding({ recordId: "B", publicationStatus: "Published to search", humanLegalReviewCompleted: false }),
      makeFinding({ recordId: "C", publicationStatus: "Draft", humanLegalReviewCompleted: true }),
      makeFinding({ recordId: "D", publicationStatus: "Quarantined", humanLegalReviewCompleted: false }),
    ];
    const counts = corpusReviewStatusCounts(findings);
    expect(counts.searchableCount).toBe(2);
    expect(counts.reviewedCount).toBe(1);
  });

  it("reflects zero reviewed findings honestly when none have completed human legal review", () => {
    const findings = [
      makeFinding({ recordId: "A", humanLegalReviewCompleted: false }),
      makeFinding({ recordId: "B", humanLegalReviewCompleted: false }),
    ];
    const counts = corpusReviewStatusCounts(findings);
    expect(counts.reviewedCount).toBe(0);
    expect(counts.searchableCount).toBe(2);
  });

  it("counts officially-verified provisions only when the exact 'Officially verified' status is set", () => {
    const provisions = [
      makeProvision({ id: "P1", currentTextVerificationStatus: "Officially verified" }),
      makeProvision({ id: "P2", currentTextVerificationStatus: "Order-cited text only" }),
      makeProvision({ id: "P3", currentTextVerificationStatus: "Requires verification" }),
    ];
    const counts = corpusReviewStatusCounts([], provisions);
    expect(counts.officiallyVerifiedCount).toBe(1);
    expect(counts.provisionsTotal).toBe(3);
  });

  it("returns zero provision counts when provisions is omitted (Compare Scenarios doesn't pass any)", () => {
    const counts = corpusReviewStatusCounts([makeFinding({ recordId: "A" })]);
    expect(counts.provisionsTotal).toBe(0);
    expect(counts.officiallyVerifiedCount).toBe(0);
  });
});
