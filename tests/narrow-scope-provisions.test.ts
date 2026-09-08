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
// finding happened to match.
//
// UPDATED by the P0 provision-precision remediation pass: this file
// originally also asserted that broad anti-fraud provisions (PFUTP
// 3(a)-(d), SEBI Act 12A) must "keep surfacing for fictitious-sales-style
// queries... since they are genuinely applicable to that conduct". A
// 100-scenario CFID-officer stress test confirmed that assumption is
// exactly wrong: PFUTP 3(a), on its own text, requires buying, selling or
// dealing in securities in a fraudulent manner — bare "fictitious sales"
// states fraudulent accounting, not a securities dealing/issue fact. The
// provision-level retrieval gate (src/data/curated/
// provision-retrieval-rules.ts) now requires that nexus independently of
// the narrow-scope mechanism this file otherwise tests, and correctly
// blocks PFUTP-3-a for the bare fictitious-sales query below. The premise
// was wrong, not the code, so the assertion is corrected here rather than
// kept to force a false "must surface" result.
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
  // The Compliance-Officer link is narrowed via justifyingTags (mirroring
  // the real finding_provisions.justifying_tags data), the fraud provision
  // link is left universal (empty justifyingTags), matching how broad
  // anti-fraud provisions are never narrowed in the real data.
  const multiIssueFinding = makeFinding({
    recordId: "MOCK-MULTI-01",
    allegedConduct: ["fictitious_sales_or_revenue", "compliance_officer_deficiency"],
    provisionIds: [complianceOfficerProvision.id, fraudProvision.id],
    provisionLinks: [
      { provisionId: complianceOfficerProvision.id, justifyingTags: ["compliance_officer_deficiency"] },
      { provisionId: fraudProvision.id, justifyingTags: [] },
    ],
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

  it("does NOT surface PFUTP-3-a for bare fictitious sales — the query states no securities dealing/issue fact PFUTP-3-a requires", () => {
    const result = analyzeScenario(
      { freeText: "The company recorded fictitious sales for several years." },
      [multiIssueFinding],
      [complianceOfficerProvision, fraudProvision],
      []
    );
    expect(result.provisionResults.some((p) => p.provision.id === fraudProvision.id)).toBe(false);
    // Not silently dropped either: the provision-level gate surfaces it as
    // a "related factual precedent" instead, distinct from a candidate.
    expect(result.gateBlockedProvisionResults.some((g) => g.provision.id === fraudProvision.id)).toBe(true);
  });

  it("DOES surface PFUTP-3-a once the same query also states a securities dealing/issue fact", () => {
    const result = analyzeScenario(
      {
        freeText:
          "The company recorded fictitious sales for several years, structured through a preferential allotment of shares to promoter entities with no genuine consideration received.",
      },
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
