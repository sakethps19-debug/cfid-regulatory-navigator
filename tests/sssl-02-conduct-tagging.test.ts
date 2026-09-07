// Reported live: a "fictitious sales" query surfaced SSSL-02 (Seacoast
// Shipping Services Limited) as a supporting precedent for PFUTP 3(a). The
// user correctly pointed out that SSSL-02 involves no fictitious sale (no
// revenue/goods transaction at all) and no fund diversion (Manish Shah
// admitted he paid no cash either way) — it is purely a sham/fictitious
// preferential allotment: the company issued free equity to its promoter
// against a claimed "business takeover" whose asset backing (a receivable)
// was never real and was quietly written down to near-zero with no
// accounting trail.
//
// The live database's scenario_findings.alleged_conduct for SSSL-02 had
// been curated as ["fictitious_sales_or_assets", "sham_preferential_allotment",
// "fund_diversion"] — over-tagged relative to the actual facts. Comparing
// against sibling precedents in the same corpus confirms the distinction:
// ARCOTECH-01 and PIFL-01 both involve a fictitious financial instrument
// used to prop up a preferential allotment (fictitious sales/purchases,
// and a fictitious Rs.850cr "loan," respectively) but only ARCOTECH-01 --
// which has a genuinely separate, freestanding fictitious-sales allegation
// with named counterparties -- is tagged fictitious_sales_or_assets;
// PIFL-01 is not, despite its allotment-backing instrument being fictitious
// too. SSSL-02 belongs with PIFL-01, not ARCOTECH-01: its "asset" was never
// an independent allegation, only the accounting device used to justify the
// sham allotment. The corrected tagging (sham_preferential_allotment only)
// was applied directly to the production database; this test locks in the
// resulting matching behavior so it cannot silently regress.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  const provisionIds = overrides.provisionIds ?? [];
  const provisionLinks =
    overrides.provisionLinks ?? provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    recordId: "SSSL-02",
    caseName: "Seacoast Shipping Services Limited",
    orderIds: ["order-1"],
    category: "Preferential allotment / conversion misuse",
    scenarioTitle: 'Promoter allotted 1.5 crore free shares against a "business takeover" whose claimed net assets never actually appeared in the company\'s books',
    factualPattern: "Mock factual pattern mirroring the real SSSL-02 finding.",
    provisionsConsideredRaw: null,
    provisionIds,
    provisionLinks,
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: "Para 1",
    finalParagraphReferences: "Para 238(b)",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/sep-2024/interim-order-in-the-matter-of-seacoast-shipping-services-limited_87152.html",
    transactionTypes: ["preferential_allotment"],
    actorRoles: ["chairman", "managing_director", "promoter"],
    evidenceTypes: ["deposition_testimony", "audited_financial_statements", "related_party_register"],
    allegedConduct: ["sham_preferential_allotment"],
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
    ordersConsidered: ["Seacoast Shipping Services Limited"],
    treatmentInPilotOrders: "Cited in 1 finding.",
    lawLibraryNote: null,
    ...overrides,
  };
}

describe("SSSL-02 conduct tagging — corrected to sham preferential allotment only", () => {
  const fraudProvision = makeProvision({ id: "PFUTP-3-a", subject: "Prohibits buying, selling or otherwise dealing in securities in a fraudulent manner." });
  const correctedFinding = makeFinding({ provisionIds: [fraudProvision.id] });

  it("does not surface SSSL-02 for a bare 'fictitious sales' query — it has no sales element", () => {
    const result = analyzeScenario(
      { freeText: "The company recorded fictitious sales for several years." },
      [correctedFinding],
      [fraudProvision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === fraudProvision.id);
    expect(pr?.supportingPrecedents.some((s) => s.finding.recordId === "SSSL-02")).not.toBe(true);
  });

  it("does not surface SSSL-02 for a bare 'diversion of funds' query — no cash moved either way", () => {
    const result = analyzeScenario(
      { freeText: "There was a diversion of funds by the promoter." },
      [correctedFinding],
      [fraudProvision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === fraudProvision.id);
    expect(pr?.supportingPrecedents.some((s) => s.finding.recordId === "SSSL-02")).not.toBe(true);
  });

  it("still surfaces SSSL-02 for a query that actually describes a sham/free preferential allotment", () => {
    const result = analyzeScenario(
      { freeText: "The promoter received a preferential allotment of free shares without paying any genuine consideration." },
      [correctedFinding],
      [fraudProvision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === fraudProvision.id);
    expect(pr?.supportingPrecedents.some((s) => s.finding.recordId === "SSSL-02")).toBe(true);
  });
});
