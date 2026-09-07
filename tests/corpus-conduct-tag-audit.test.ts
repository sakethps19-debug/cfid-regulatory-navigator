// Following the SSSL-02 correction, the user asked for a full audit of
// conduct tagging across all 91 scenario_findings records, since an
// over-broad conduct tag causes the matching engine to surface a finding
// (and hence its provisions) for queries that have nothing to do with what
// actually happened in that finding. Reading every factual_pattern against
// its alleged_conduct tags in the production database turned up 8 further
// mistagged records, corrected directly in the database:
//
// - LSIL-01 (confirmed_at_interim): a pure synchronized-trading pump-and-dump
//   plus a fabricated "AI Tech" pivot announcement -- no fictitious sale and
//   no circular fund movement anywhere in the facts. Was tagged
//   fictitious_sales_or_assets + circular_fund_movement; corrected to
//   price_manipulation_nexus + false_business_or_corporate_announcement
//   (mirroring the near-identical DAIL-01 fact pattern already tagged that
//   way in the corpus).
// - ROHL-01 (upheld): a pure consolidation-classification dispute (associate
//   vs. subsidiary) -- no allegation any sale or asset was fabricated. Was
//   tagged fictitious_sales_or_assets; corrected to just
//   financial_statement_misstatement + price_manipulation_nexus.
// - FRL-01 (partly_upheld): the order's own text says "core fraud and
//   diversion charges not established" -- only LODR disclosure lapses were
//   confirmed. Was tagged fund_diversion; corrected to
//   non_disclosure_of_information only.
// - BHSL-PROC-01 (finding_status "procedural_observation", which the engine
//   does not treat as a negative status): the finding is entirely about a
//   jurisdictional/limitation defense being rejected -- no merits
//   determination was made on the underlying fund-diversion/RPT allegation
//   at all. Was tagged fund_diversion + related_party_misrepresentation;
//   corrected to no conduct tags, since nothing about the conduct itself
//   was decided in this finding.
// - ZEE-PLEDGE-01 (upheld): an unauthorized pledge of ZEEL's own land as
//   third-party loan security, accompanied by a false declaration that
//   corporate approvals had been obtained -- no company funds/cash actually
//   moved. Was tagged fund_diversion; corrected to drop that and add
//   false_compliance_certification for the false approvals declaration.
// - BGL-AC-02 (upheld): profits were inflated because inadequate books made
//   an impairment figure unverifiable -- the order never asserts a specific
//   asset was fabricated, only that it couldn't be verified. Was tagged
//   fictitious_sales_or_assets; corrected to drop that, keeping
//   financial_statement_misstatement + false_compliance_certification.
// - NAGL-01 (confirmed_at_interim): IPO proceeds diverted through
//   non-existent shell vendors used purely as a diversion conduit, with no
//   independent allegation that any sale/purchase was separately booked as
//   fictitious in NAGL's own P&L. Was tagged fictitious_sales_or_assets;
//   corrected to drop that, keeping fund_diversion +
//   false_business_or_corporate_announcement.
// - BGDL-02 (not_upheld): purely an order revoking restraint against 30
//   noticees after finding their role unwarranted -- describes no conduct
//   at all. Was tagged fictitious_sales_or_assets; corrected to no conduct
//   tags.
//
// This test locks in representative before/after matching behavior for the
// two most consequential corrections (LSIL-01 and FRL-01, both
// positive-status findings that were wrongly surfacing as SUPPORTING
// precedents for queries unrelated to their actual facts) so they cannot
// silently regress.
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

describe("Corpus conduct-tag audit corrections", () => {
  it("LSIL-01 (corrected): no longer matches a 'fictitious sales' query, since it has no sales element", () => {
    const fraudProvision = makeProvision({ id: "PFUTP-3-a" });
    const lsil01 = makeFinding({
      recordId: "LSIL-01",
      findingStatus: "Upheld",
      allegedConduct: ["price_manipulation_nexus", "false_business_or_corporate_announcement"],
      provisionIds: [fraudProvision.id],
    });
    const result = analyzeScenario({ freeText: "The company recorded fictitious sales." }, [lsil01], [fraudProvision], []);
    const pr = result.provisionResults.find((p) => p.provision.id === fraudProvision.id);
    expect(pr?.supportingPrecedents.some((s) => s.finding.recordId === "LSIL-01")).not.toBe(true);
  });

  it("LSIL-01 (corrected): still matches a synchronized-trading price-manipulation query", () => {
    const fraudProvision = makeProvision({ id: "PFUTP-3-a" });
    const lsil01 = makeFinding({
      recordId: "LSIL-01",
      findingStatus: "Upheld",
      allegedConduct: ["price_manipulation_nexus", "false_business_or_corporate_announcement"],
      provisionIds: [fraudProvision.id],
    });
    const result = analyzeScenario(
      { freeText: "A group of connected trading accounts engaged in synchronized trading to pump the price." },
      [lsil01],
      [fraudProvision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === fraudProvision.id);
    expect(pr?.supportingPrecedents.some((s) => s.finding.recordId === "LSIL-01")).toBe(true);
  });

  it("FRL-01 (corrected): does not surface as a SUPPORTING precedent for a 'diversion of funds' query, since that charge was explicitly not established", () => {
    const fundProvision = makeProvision({ id: "SEBI-ACT-12A-b" });
    const frl01 = makeFinding({
      recordId: "FRL-01",
      findingStatus: "Partly upheld",
      allegedConduct: ["non_disclosure_of_information"],
      provisionIds: [fundProvision.id],
    });
    const result = analyzeScenario({ freeText: "There was a diversion of funds by the promoter." }, [frl01], [fundProvision], []);
    const pr = result.provisionResults.find((p) => p.provision.id === fundProvision.id);
    expect(pr?.supportingPrecedents.some((s) => s.finding.recordId === "FRL-01")).not.toBe(true);
  });
});
