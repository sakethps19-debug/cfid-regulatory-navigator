// Extends the pilot-era fixtures (tests/fixtures.ts, limited to Rajesh
// Exports Limited and Seacoast Shipping Services Limited) with one
// additional, hand-transcribed record sourced faithfully from the live
// database (Arvind Remedies Limited, record ARL-AUD-01) for Mandatory
// scenario 12 ("Auditor negligence") in the 13-named-scenario audit - see
// docs/mandatory-scenario-audit.md. The pilot fixture set has no
// statutory-auditor-actor record at all, so scenario 12 cannot be tested
// against tests/fixtures.ts alone.
//
// provisionIds intentionally cites the legacy bundled "SEBI-ACT-12A" id
// (not the live database's split "SEBI-ACT-12A-a/b/c"), matching how this
// same bundled id already appears in src/data/generated/provisions.json -
// that generated file predates the provision-splitting work (see git
// history) and is not re-synced here, consistent with how tests/fixtures.ts
// already documents bridging older shapes rather than editing the
// generated JSON by hand.
import type { ScenarioFinding } from "@/types/domain";
import { scenarioFindings } from "./fixtures";

export const auditorNegligenceFinding: ScenarioFinding = {
  recordId: "ARL-AUD-01",
  caseName: "Arvind Remedies Limited",
  orderIds: ["ARL-AUD-01-ORDER"],
  category: "Fictitious sales or assets",
  scenarioTitle:
    "Statutory auditor's PFUTP fraud liability not established despite proven gross negligence, connivance/collusion with management is a separate, unmet element",
  factualPattern:
    "A PNB-commissioned forensic audit (May 2015) found ARL had inflated sales and profits via circular fund transactions with \"Controlled/Connected Entities\" incorporated solely to simulate purchase/sale transactions with no actual movement of goods. ARL's statutory auditor, Doshi Chatterjee Bagri & Co. LLP (DCB), and its signing partner R.K. Bagri, certified these accounts for FY2010-11 through FY2013-14 without detecting the circular transactions, despite the volume and nature of the transactions with connected parties.",
  provisionsConsideredRaw:
    "Section 12A(a),(b),(c), SEBI Act, 1992; PFUTP Regulations, 2003 (no specific sub-regulation identified as the operative charge against the auditor in this order's text)",
  provisionIds: ["SEBI-ACT-12A"],
  provisionLinks: [{ provisionId: "SEBI-ACT-12A", justifyingTags: [] }],
  noticeeActors: ["Doshi Chatterjee Bagri & Co. LLP", "R K Bagri"],
  findingStatus: "Not Confirmed in Final Order",
  interimParagraphReferences: "Interim order (Feb 16, 2017), not itself in this register; recited at paras 3-4 of this order",
  finalParagraphReferences:
    "Final order paras 38-42, gross negligence established; connivance/collusion with management not established for want of evidence; PFUTP fraud finding against the auditor not sustained; referred to ICAI/NFRA instead",
  qualification:
    "This order decides only the statutory auditor's liability. The underlying fraud findings against ARL itself and its Managing Director are not themselves in this register and are treated by this order as established background, not re-litigated here.",
  officialSourceUrl:
    "https://www.sebi.gov.in/enforcement/orders/jun-2023/final-order-in-the-matter-of-falsification-misstatement-in-financial-statements-of-arvind-remedies-limited_72779.html",
  transactionTypes: ["purchase_transaction", "consolidated_financials"],
  actorRoles: ["related_party_counterparty", "statutory_auditor"],
  evidenceTypes: ["forensic_audit_report", "bank_statements_flow", "audited_financial_statements"],
  allegedConduct: ["financial_statement_misstatement", "fictitious_sales_or_revenue", "audit_committee_deficiency"],
  evidentiaryGaps: [],
  precedentOutcomeNote: null,
  ingredientsNotEstablished: [
    "Connivance/collusion between the auditor and ARL's management - the order found the evidence on record insufficient to establish this, despite gross negligence being clearly established",
  ],
  sourceDocumentVerified: true,
  paragraphCitationVerified: true,
  findingStatusVerified: true,
  provisionMappingVerified: false,
  noticeeMappingVerified: true,
  humanLegalReviewCompleted: false,
  publicationStatus: "Published to search",
};

export const extendedScenarioFindings: ScenarioFinding[] = [...scenarioFindings, auditorNegligenceFinding];
