// Pre-merge legal-verification pass: mandatory regression matrix (10
// numbered scenarios), run against the live-corpus-shaped engine using
// exact Demo A text as supplied for this pass. Confirms:
//   1. Demo A: Reg 23(2)/23(4) surface; Reg 27(2)(a)/31 do not surface as
//      candidates without their own subject-specific facts.
//   2. Loan-default nondisclosure: Reg 30 surfaces; Reg 27/31 do not.
//   3. Shareholding-pattern defect: Reg 31 can surface.
//   4. Corporate-governance compliance-report defect: Reg 27(2)(a) can
//      surface.
//   5. RPT accounting nondisclosure: Ind AS 24 behaves per its own
//      prerequisites (unaffected by this pass — still ungated, still
//      subject-matched since RPT genuinely IS its own subject).
//   6. Financial-results misstatement: Reg 33 family remains capable of
//      surfacing (unaffected by this pass).
//   7. Pure listed-company diversion: PFUTP 4(1) remains primary.
//   8. Unlisted diversion: PFUTP 4(1) remains excluded.
//   9. Pure RPT: no PFUTP contamination.
//   10. Clean controls remain clean.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: overrides.instrument ?? "Test Instrument",
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

let seq = 0;
function makeFinding(overrides: Partial<ScenarioFinding> & { provisionId: string; justifyingTags?: string[] }): ScenarioFinding {
  seq += 1;
  const { provisionId, justifyingTags = [], ...rest } = overrides;
  return {
    recordId: `PREMERGE-${seq}`,
    caseName: "Synthetic Pre-Merge Verification Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic finding",
    factualPattern: "Synthetic factual pattern for the pre-merge legal-verification pass.",
    provisionsConsideredRaw: null,
    provisionIds: [provisionId],
    provisionLinks: [{ provisionId, justifyingTags }],
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    transactionTypes: ["preferential_allotment", "related_party_transaction", "listed_company"],
    actorRoles: ["promoter"],
    evidenceTypes: [],
    allegedConduct: ["fund_diversion", "financial_statement_misstatement", "non_disclosure_of_information"],
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
    ...rest,
  };
}

const DEMO_A_TEXT =
  "A listed company entered into a material transaction with an entity controlled by a promoter-related person. The transaction was entered into without prior Audit Committee approval and the material related-party transaction was not placed before shareholders for approval. The transaction and outstanding balance were also omitted from the company's related-party disclosures in its financial statements.";

describe("Pre-merge legal-verification pass: mandatory regression matrix", () => {
  it("1. Demo A: Reg 23(2)/23(4) surface as primary candidates; Reg 27(2)(a)/31 do not surface as candidates on these facts", () => {
    const reg232 = makeProvision({ id: "LODR-23-2", provisionNumber: "Regulation 23(2)", instrument: "LODR Regulations, 2015" });
    const reg234 = makeProvision({ id: "LODR-23-4", provisionNumber: "Regulation 23(4)", instrument: "LODR Regulations, 2015" });
    const reg27 = makeProvision({ id: "LODR-27-2-a", provisionNumber: "Regulation 27(2)(a)", instrument: "LODR Regulations, 2015" });
    const reg31 = makeProvision({ id: "LODR-31-statement", provisionNumber: "Regulation 31", instrument: "LODR Regulations, 2015" });
    const f232 = makeFinding({ provisionId: reg232.id, allegedConduct: ["rpt_approval_lapse"], transactionTypes: ["related_party_transaction"] });
    const f234 = makeFinding({ provisionId: reg234.id, allegedConduct: ["rpt_approval_lapse"], transactionTypes: ["related_party_transaction"] });
    const f27 = makeFinding({ provisionId: reg27.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const f31 = makeFinding({ provisionId: reg31.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const result = analyzeScenario({ freeText: DEMO_A_TEXT }, [f232, f234, f27, f31], [reg232, reg234, reg27, reg31], []);
    const breachIds = result.provisionResults.map((p) => p.provision.id);
    expect(breachIds).toContain("LODR-23-2");
    expect(breachIds).toContain("LODR-23-4");
    expect(breachIds).not.toContain("LODR-27-2-a");
    expect(breachIds).not.toContain("LODR-31-statement");
  });

  it("2. loan-default nondisclosure: Reg 30 surfaces; Reg 27(2)(a)/31 do not", () => {
    const reg30 = makeProvision({ id: "LODR-30", provisionNumber: "Regulation 30", instrument: "LODR Regulations, 2015" });
    const reg27 = makeProvision({ id: "LODR-27-2-a", provisionNumber: "Regulation 27(2)(a)", instrument: "LODR Regulations, 2015" });
    const reg31 = makeProvision({ id: "LODR-31-statement", provisionNumber: "Regulation 31", instrument: "LODR Regulations, 2015" });
    const f30 = makeFinding({ provisionId: reg30.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["material_event_disclosure"] });
    const f27 = makeFinding({ provisionId: reg27.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const f31 = makeFinding({ provisionId: reg31.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const result = analyzeScenario(
      { freeText: "A listed company failed to disclose a material default in repayment of a loan from a bank to the stock exchanges within the applicable disclosure framework." },
      [f30, f27, f31],
      [reg30, reg27, reg31],
      []
    );
    const breachIds = result.provisionResults.map((p) => p.provision.id);
    expect(breachIds).toContain("LODR-30");
    expect(breachIds).not.toContain("LODR-27-2-a");
    expect(breachIds).not.toContain("LODR-31-statement");
  });

  it("3. shareholding-pattern defect: Reg 31 can surface on its own genuine subject", () => {
    const reg31 = makeProvision({ id: "LODR-31-statement", provisionNumber: "Regulation 31", instrument: "LODR Regulations, 2015" });
    const f31 = makeFinding({ provisionId: reg31.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["shareholding_pattern_statement"] });
    const result = analyzeScenario(
      { freeText: "The listed company's shareholding pattern statement was not disclosed to the stock exchanges within the applicable timeline." },
      [f31],
      [reg31],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("LODR-31-statement");
  });

  it("4. corporate-governance compliance-report defect: Reg 27(2)(a) can surface on its own genuine subject", () => {
    const reg27 = makeProvision({ id: "LODR-27-2-a", provisionNumber: "Regulation 27(2)(a)", instrument: "LODR Regulations, 2015" });
    const f27 = makeFinding({ provisionId: reg27.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["governance_compliance_report"] });
    const result = analyzeScenario(
      { freeText: "The listed company's quarterly compliance report on corporate governance was not disclosed to the stock exchanges within the applicable timeline." },
      [f27],
      [reg27],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("LODR-27-2-a");
  });

  it("5. RPT accounting nondisclosure: Ind AS 24 behaves according to its own prerequisites (unaffected by this pass)", () => {
    const indAs24 = makeProvision({ id: "IND-AS-24", provisionNumber: "Ind AS 24", instrument: "Indian Accounting Standards" });
    const finding = makeFinding({ provisionId: indAs24.id, allegedConduct: ["related_party_misrepresentation"], transactionTypes: ["related_party_transaction"] });
    const result = analyzeScenario(
      { freeText: "There was a misrepresented related party dealing recorded as a false RPT disclosure in the annual report." },
      [finding],
      [indAs24],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("IND-AS-24");
  });

  it("6. financial-results misstatement: Reg 33 family remains capable of surfacing (unaffected by this pass)", () => {
    const reg33 = makeProvision({ id: "LODR-33-1-a", provisionNumber: "Regulation 33(1)(a)", instrument: "LODR Regulations, 2015" });
    const finding = makeFinding({ provisionId: reg33.id, allegedConduct: ["financial_statement_misstatement"], transactionTypes: ["financial_statement_disclosure"] });
    const result = analyzeScenario(
      { freeText: "The company's financial results submitted to the stock exchange contained a misstatement." },
      [finding],
      [reg33],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("LODR-33-1-a");
  });

  it("7. pure listed-company diversion: PFUTP 4(1) remains primary", () => {
    const pfutp41 = makeProvision({ id: "PFUTP-4-1", provisionNumber: "Regulation 4(1)", instrument: "PFUTP Regulations, 2003" });
    const finding = makeFinding({ provisionId: pfutp41.id, allegedConduct: ["fund_diversion"] });
    const result = analyzeScenario(
      {
        freeText:
          "A listed company transferred substantial funds to entities controlled by its promoter. The funds were not used for the stated business purpose and were subsequently routed through several connected entities.",
      },
      [finding],
      [pfutp41],
      []
    );
    expect(result.provisionResults.filter((p) => p.candidateTier === "primary_candidate").map((p) => p.provision.id)).toContain("PFUTP-4-1");
  });

  it("8. unlisted diversion: PFUTP 4(1) remains excluded", () => {
    const pfutp41 = makeProvision({ id: "PFUTP-4-1", provisionNumber: "Regulation 4(1)", instrument: "PFUTP Regulations, 2003" });
    const finding = makeFinding({ provisionId: pfutp41.id, allegedConduct: ["fund_diversion"] });
    const result = analyzeScenario(
      {
        freeText:
          "A private company that is not listed transferred substantial funds to entities controlled by its promoter for purposes unrelated to any securities transaction, and the funds were not used for the stated business purpose.",
      },
      [finding],
      [pfutp41],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
  });

  it("9. pure RPT: no PFUTP contamination", () => {
    const reg232 = makeProvision({ id: "LODR-23-2", provisionNumber: "Regulation 23(2)", instrument: "LODR Regulations, 2015" });
    const pfutp41 = makeProvision({ id: "PFUTP-4-1", provisionNumber: "Regulation 4(1)", instrument: "PFUTP Regulations, 2003" });
    const finding = makeFinding({ provisionId: reg232.id, allegedConduct: ["rpt_approval_lapse"], transactionTypes: ["related_party_transaction"] });
    const result = analyzeScenario(
      { freeText: "The company entered into a related party transaction with an entity controlled by its promoter without prior Audit Committee approval." },
      [finding],
      [reg232, pfutp41],
      []
    );
    const breachIds = result.provisionResults.map((p) => p.provision.id);
    expect(breachIds).toContain("LODR-23-2");
    expect(breachIds).not.toContain("PFUTP-4-1");
  });

  it("10. clean controls remain clean", () => {
    const reg232 = makeProvision({ id: "LODR-23-2", provisionNumber: "Regulation 23(2)", instrument: "LODR Regulations, 2015" });
    const finding = makeFinding({ provisionId: reg232.id, allegedConduct: ["rpt_approval_lapse"], transactionTypes: ["related_party_transaction"] });
    const result = analyzeScenario(
      { freeText: "The listed company disclosed all related party transactions in full, obtained audit committee and shareholder approval where required, and its financial statements were accurate with no irregularities found." },
      [finding],
      [reg232],
      []
    );
    expect(result.provisionResults).toHaveLength(0);
  });
});
