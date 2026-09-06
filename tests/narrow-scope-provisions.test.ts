// Reported live by a user: querying "fictitious sales" surfaced LODR
// Regulation 6 (Compliance Officer appointment) and its sub-regulations as
// "potentially relevant" provisions. Regulation 6 has nothing to do with
// fictitious sales — it governs a listed entity's obligation to appoint a
// company secretary as Compliance Officer. The cause: the real precedent
// finding this matched on (e.g. FCEL-01) is a genuinely multi-issue
// finding whose order found BOTH fictitious sales AND a Compliance
// Officer vacancy, and ScenarioFinding.provisionIds is a flat, undifferentiated
// list of every provision the order cited for that finding — with no record
// of which specific alleged conduct justifies which specific provision. The
// confidence-tiering mechanism (see confidence-tiering.test.ts) downgrades
// this to "Low" but does not stop it from being suggested at all, because
// the match is via a genuinely substantive conduct tag (fictitious sales),
// not merely a generic actor/evidence overlap.
//
// The fix: NARROW_SCOPE_PROVISION_TAGS (src/data/curated/concept-tags.ts)
// marks provisions whose entire subject is one specific, narrow topic
// (Compliance Officer duties, Audit Committee composition, CEO/CFO
// certification) and analyzeScenario only surfaces one of these provisions
// when the query itself actually detected that specific concept — never
// merely because some other, unrelated conduct bundled into the same
// finding happened to match. Broad anti-fraud provisions (PFUTP 3(a)-(d),
// SEBI Act 12A, etc.) are deliberately NOT in this list and must keep
// surfacing for fictitious-sales-style queries, since they are genuinely
// applicable to that conduct.
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

describe("Narrow-scope provisions — Regulation 6 / Compliance Officer bundling", () => {
  const complianceOfficerProvision = makeProvision({
    id: "LODR-6-gen",
    instrument: "LODR Regulations, 2015",
    provisionNumber: "Regulation 6",
    subject: "Requires every listed entity to appoint a company secretary as Compliance Officer.",
  });
  const fraudProvision = makeProvision({
    id: "PFUTP-3-a",
    instrument: "PFUTP Regulations, 2003",
    provisionNumber: "Regulation 3(a)",
    subject: "Prohibits buying, selling or otherwise dealing in securities in a fraudulent manner.",
  });
  // Mirrors the real reported case (FCEL-01): one finding genuinely bundles
  // fictitious sales together with an unrelated Compliance Officer vacancy.
  const multiIssueFinding = makeFinding({
    recordId: "MOCK-MULTI-01",
    allegedConduct: ["fictitious_sales_or_assets", "compliance_officer_deficiency"],
    provisionIds: [complianceOfficerProvision.id, fraudProvision.id],
  });

  it("does not surface a Compliance-Officer-only provision for a query that only matched on fictitious sales", () => {
    const result = analyzeScenario(
      { freeText: "The company recorded fictitious sales for several years." },
      [multiIssueFinding],
      [complianceOfficerProvision, fraudProvision],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === complianceOfficerProvision.id)).toBe(false);
  });

  it("still surfaces the genuinely applicable fraud provision for the same query", () => {
    const result = analyzeScenario(
      { freeText: "The company recorded fictitious sales for several years." },
      [multiIssueFinding],
      [complianceOfficerProvision, fraudProvision],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === fraudProvision.id)).toBe(true);
  });

  it("does surface the Compliance-Officer provision when the query actually raises that concept", () => {
    const result = analyzeScenario(
      { freeText: "The Compliance Officer position was vacant for several months with no qualified replacement appointed." },
      [multiIssueFinding],
      [complianceOfficerProvision, fraudProvision],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === complianceOfficerProvision.id)).toBe(true);
  });
});
