// P0 provision-precision remediation: the 100-scenario CFID-officer stress
// suite, committed as regression fixtures per the audit prompt's explicit
// instruction ("Build the 100-scenario corpus as committed regression
// fixtures"). Organized in the prompt's own ten groups of ten. Each
// scenario's expected MUST/MUST-NOT is reasoned independently from the
// provision-retrieval-rules.ts gate design and the underlying provisions'
// own official subject text (see docs/provision-gating-remediation.md) -
// not derived by running the engine and keeping whatever it returned.
//
// A single synthetic finding per group carries BOTH that group's realistic
// "home" provision(s) AND a link to the broad-fraud family (PFUTP-3-a,
// SEBI-ACT-12A-a) with empty justifyingTags - exactly mirroring the live
// data shape (100% of the 498 live PFUTP/SEBI-Act-12A finding_provisions
// links are empty-justifyingTags) - so every MUST-NOT-PFUTP assertion below
// is a genuine test of the gate, not a trivial pass from the absence of any
// risky link at all.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeProvision(id: string, provisionNumber: string, subject: string, instrument = "Test Instrument"): LegalProvision {
  return {
    id,
    instrument,
    provisionNumber,
    subject,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
  };
}

function link(provisionId: string, justifyingTags: string[] = []) {
  return { provisionId, justifyingTags };
}

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionLinks: { provisionId: string; justifyingTags: string[] }[] }): ScenarioFinding {
  return {
    caseName: "Synthetic Stress-Suite Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic stress-suite finding",
    factualPattern: "Synthetic factual pattern for the 100-scenario stress suite.",
    provisionsConsideredRaw: null,
    provisionIds: overrides.provisionLinks.map((l) => l.provisionId),
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
    humanLegalReviewCompleted: false,
    publicationStatus: "Published to search",
    ...overrides,
  };
}

// ----- Provisions -----
const PFUTP_3_A = makeProvision("PFUTP-3-a", "Regulation 3(a)", "Buying, selling or dealing in securities in a fraudulent manner.", "PFUTP Regulations, 2003");
const SEBI_12A_A = makeProvision("SEBI-ACT-12A-a", "Section 12A(a)", "Manipulative or deceptive device in connection with issue/dealing in securities.", "SEBI Act, 1992");
const PFUTP_4_2_A = makeProvision("PFUTP-4-2-a", "Regulation 4(2)(a)", "False or misleading appearance of trading.", "PFUTP Regulations, 2003");
const PFUTP_4_2_E = makeProvision("PFUTP-4-2-e", "Regulation 4(2)(e)", "Manipulation of security price.", "PFUTP Regulations, 2003");
const PFUTP_4_2_F = makeProvision("PFUTP-4-2-f", "Regulation 4(2)(f)", "Publishing untrue securities-related information.", "PFUTP Regulations, 2003");
const LODR_23_2 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
const LODR_23_4 = makeProvision("LODR-23-4", "Regulation 23(4)", "Mandatory shareholder approval for material RPTs.", "LODR Regulations, 2015");
const LODR_33 = makeProvision("LODR-33", "Regulation 33", "Financial results disclosure.", "LODR Regulations, 2015");
const LODR_4_1_A = makeProvision("LODR-4-1-a", "Regulation 4(1)(a)", "Information prepared per applicable accounting standards.", "LODR Regulations, 2015");
const SEBI_11C_2 = makeProvision("SEBI-ACT-11C-2", "Section 11C(2)", "Duty to preserve and produce records to the investigating authority.", "SEBI Act, 1992");
const ICDR_160 = makeProvision("ICDR-160", "Regulation 160", "Preferential-allotment shares fully paid up at allotment.", "SEBI (ICDR) Regulations, 2018");
const ICDR_167 = makeProvision("ICDR-167", "Regulation 167", "Lock-in period for preferential allottees.", "SEBI (ICDR) Regulations, 2018");
const LODR_18_3 = makeProvision("LODR-18-3-schedule-II", "Regulation 18(3) / Schedule II Part C", "Audit Committee role and responsibilities.", "LODR Regulations, 2015");
// Checkpoint correction 2, item 2: added — a meetings-not-conducted fact
// is now independently gated to Regulation 18(2), never to 18(3)/Schedule
// II (which now requires its own distinct role-failure predicate).
const LODR_18_2 = makeProvision("LODR-18-2", "Regulation 18(2)", "Audit Committee meeting frequency, quorum and powers.", "LODR Regulations, 2015");
const LODR_6_GEN = makeProvision("LODR-6-gen", "Regulation 6", "Compliance Officer appointment.", "LODR Regulations, 2015");
const LODR_17_8 = makeProvision("LODR-17-8", "Regulation 17(8)", "CEO/CFO compliance certification.", "LODR Regulations, 2015");

const ALL_PROVISIONS = [
  PFUTP_3_A, SEBI_12A_A, PFUTP_4_2_A, PFUTP_4_2_E, PFUTP_4_2_F,
  LODR_23_2, LODR_23_4, LODR_33, LODR_4_1_A, SEBI_11C_2,
  ICDR_160, ICDR_167, LODR_18_3, LODR_18_2, LODR_6_GEN, LODR_17_8,
];

// ----- Findings: one synthetic finding per group, each linking BOTH its
// realistic home provision(s) AND the broad-fraud family, mirroring the
// live empty-justifyingTags shape exactly. -----
const F1_RPT = makeFinding({
  recordId: "STRESS-RPT-01",
  transactionTypes: ["related_party_transaction"],
  actorRoles: ["promoter"],
  allegedConduct: ["non_disclosure_of_information", "related_party_misrepresentation"],
  provisionLinks: [link(LODR_23_2.id), link(LODR_23_4.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F2_DIVERSION = makeFinding({
  recordId: "STRESS-DIV-01",
  transactionTypes: ["fund_transfer_promoter_entity", "cash_credit_facility"],
  actorRoles: ["promoter"],
  allegedConduct: ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account"],
  provisionLinks: [link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F3_FICTITIOUS = makeFinding({
  recordId: "STRESS-FICT-01",
  transactionTypes: ["financial_statement_disclosure", "annual_report_disclosure", "revenue_recognition"],
  allegedConduct: ["fictitious_sales_or_revenue", "fictitious_or_nongenuine_assets", "financial_statement_misstatement", "false_appearance_of_trading", "actual_price_manipulation", "false_business_or_corporate_announcement"],
  provisionLinks: [link(LODR_33.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id), link(PFUTP_4_2_F.id)],
});
const F4_ACCOUNTING_ERROR = makeFinding({
  recordId: "STRESS-ACCT-01",
  transactionTypes: ["revenue_recognition", "receivables_payables_adjustment", "investment_valuation", "standalone_financials", "consolidated_financials", "derivative_transaction", "business_segment_disclosure"],
  allegedConduct: [],
  provisionLinks: [link(LODR_4_1_A.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F5_NONCOOP = makeFinding({
  recordId: "STRESS-NONCOOP-01",
  transactionTypes: ["investigation_process"],
  allegedConduct: ["non_cooperation_with_investigation"],
  provisionLinks: [link(SEBI_11C_2.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F6_MANIPULATION = makeFinding({
  recordId: "STRESS-MANIP-01",
  allegedConduct: ["false_appearance_of_trading", "non_genuine_dealing_or_ownership", "actual_price_manipulation", "investor_inducement_to_trade", "false_business_or_corporate_announcement"],
  provisionLinks: [link(PFUTP_4_2_A.id), link(PFUTP_4_2_E.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F7_ALLOTMENT = makeFinding({
  recordId: "STRESS-ALLOT-01",
  transactionTypes: ["preferential_allotment"],
  actorRoles: ["promoter"],
  allegedConduct: ["sham_preferential_allotment", "unsupported_share_allotment_consideration"],
  provisionLinks: [link(ICDR_160.id), link(ICDR_167.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F8_ISSUE = makeFinding({
  recordId: "STRESS-ISSUE-01",
  transactionTypes: ["rights_issue"],
  allegedConduct: ["fund_diversion", "fictitious_or_nongenuine_assets", "false_business_or_corporate_announcement"],
  evidenceTypes: ["utilisation_of_issue_proceeds_certificate"],
  provisionLinks: [link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F9_GOVERNANCE = makeFinding({
  recordId: "STRESS-GOV-01",
  transactionTypes: ["audit_committee_process", "compliance_officer_appointment", "certification_process", "board_director_duties"],
  allegedConduct: ["audit_committee_deficiency", "compliance_officer_deficiency", "false_compliance_certification", "director_governance_failure"],
  provisionLinks: [
    link(LODR_18_3.id, ["audit_committee_deficiency"]),
    link(LODR_18_2.id, ["audit_committee_deficiency"]),
    link(LODR_6_GEN.id, ["compliance_officer_deficiency"]),
    link(LODR_17_8.id, ["false_compliance_certification"]),
    link(PFUTP_3_A.id),
    link(SEBI_12A_A.id),
  ],
});

const ALL_FINDINGS = [F1_RPT, F2_DIVERSION, F3_FICTITIOUS, F4_ACCOUNTING_ERROR, F5_NONCOOP, F6_MANIPULATION, F7_ALLOTMENT, F8_ISSUE, F9_GOVERNANCE];

const FRAUD_PREFIXES = ["PFUTP-", "SEBI-ACT-12A"];

interface Scenario {
  n: number;
  group: string;
  freeText: string;
  mustNotFraud?: boolean;
  /** Finer-grained than mustNotFraud: specific provision ids that must not
   * appear, used where the scenario legitimately unlocks ONE narrow
   * fraud-family clause (e.g. PFUTP-4-2-f, publishing untrue information via
   * a stated communication channel) while the general dealing-requiring
   * clauses (PFUTP-3-a, SEBI-ACT-12A-a) must still be absent. */
  mustNotIncludeIds?: string[];
  mustIncludeIds?: string[];
  mustIncludeFraudFamily?: boolean;
  note: string;
}

function containsFraud(ids: string[]): boolean {
  return ids.some((id) => FRAUD_PREFIXES.some((p) => id.startsWith(p)));
}

const SCENARIOS: Scenario[] = [
  // 1-10: RPT / disclosure
  { n: 1, group: "RPT/disclosure", freeText: "A related-party transaction with a promoter-connected entity was not disclosed.", mustNotFraud: true, note: "RPT non-disclosure alone states no securities dealing/fraud nexus." },
  { n: 2, group: "RPT/disclosure", freeText: "An undisclosed related-party transaction was entered into with an entity controlled by the promoter.", mustNotFraud: true, note: "Same as #1, different phrasing." },
  { n: 3, group: "RPT/disclosure", freeText: "A material related-party transaction proceeded without prior Audit Committee approval, though correctly disclosed.", mustNotFraud: true, mustIncludeIds: ["LODR-23-2"], note: "MANDATORY PURE RPT APPROVAL TEST: LODR 23(2) if otherwise applicable, PFUTP/12A/ICDR none." },
  { n: 4, group: "RPT/disclosure", freeText: "A material related-party transaction was completed without the required shareholder approval, though correctly disclosed.", mustNotFraud: true, mustIncludeIds: ["LODR-23-4"], note: "MANDATORY PURE RPT MATERIAL SHAREHOLDER APPROVAL TEST: relevant LODR 23 provisions, PFUTP none absent additional fraud." },
  { n: 5, group: "RPT/disclosure", freeText: "Related party transactions were diverted and misrepresented in the annual report.", mustNotFraud: true, note: "Fund diversion + RPT misrepresentation states no securities dealing/issue fact." },
  { n: 6, group: "RPT/disclosure", freeText: "The related-party register omitted a transaction with a promoter-connected entity for one quarter.", mustNotFraud: true, note: "Omitted disclosure only." },
  { n: 7, group: "RPT/disclosure", freeText: "A counterparty that is a related party was not disclosed in statutory filings.", mustNotFraud: true, note: "Non-disclosure only." },
  { n: 8, group: "RPT/disclosure", freeText: "The company failed to identify a related party in its annual report disclosures.", mustNotFraud: true, note: "Non-disclosure only." },
  { n: 9, group: "RPT/disclosure", freeText: "A related-party transaction was misrepresented as an arm's-length dealing with no genuine disclosure made.", mustNotFraud: true, note: "Misrepresentation of RPT status, not a securities dealing/fraud nexus." },
  { n: 10, group: "RPT/disclosure", freeText: "Listed entity entered into an undisclosed related-party transaction with a promoter-connected entity. The underlying transaction was genuine. No diversion, fictitious accounting, price manipulation, securities trading or false announcement is alleged.", mustNotFraud: true, note: "The CONFIRMED FAILURE scenario from the audit prompt, verbatim in substance." },

  // 11-20: fund diversion without automatic securities nexus
  { n: 11, group: "Fund diversion", freeText: "Company funds were transferred to a promoter-controlled entity without proper authorization. No securities issue, securities trading, false market announcement or falsification of published financial statements is alleged.", mustNotFraud: true, note: "Verbatim FUND DIVERSION WITHOUT SECURITIES NEXUS scenario." },
  { n: 12, group: "Fund diversion", freeText: "There was a diversion of funds by the promoter to a personal account.", mustNotFraud: true, note: "Pure diversion." },
  { n: 13, group: "Fund diversion", freeText: "Company funds were routed through a promoter's personal bank account with no genuine business purpose.", mustNotFraud: true, note: "Pure diversion." },
  { n: 14, group: "Fund diversion", freeText: "A circular movement of funds among connected entities was identified. No securities-market conduct is alleged.", mustNotFraud: true, note: "Circular fund movement alone." },
  { n: 15, group: "Fund diversion", freeText: "Funds were diverted to a promoter-controlled entity and later returned in full. No securities dealing is alleged.", mustNotFraud: true, note: "Diversion later reversed, still no dealing nexus." },
  { n: 16, group: "Fund diversion", freeText: "The company's cash-credit facility was misutilised by diverting funds to a connected entity.", mustNotFraud: true, note: "Pure diversion via credit facility." },
  { n: 17, group: "Fund diversion", freeText: "A forensic audit found funds routed through personal accounts. No securities transaction is alleged.", mustNotFraud: true, note: "Pure diversion." },
  { n: 18, group: "Fund diversion", freeText: "Loans were extended to related entities without commercial justification. No securities fraud is alleged.", mustNotFraud: true, note: "Pure diversion via loans." },
  { n: 19, group: "Fund diversion", freeText: "Company funds were diverted through a chain of shell entities. No trading or price-manipulation fact is alleged.", mustNotFraud: true, note: "Layered diversion, still no dealing nexus." },
  { n: 20, group: "Fund diversion", freeText: "Fund diversion was investigated. No securities-market nexus is alleged in this scenario.", mustNotFraud: true, note: "Pure diversion." },

  // 21-30: fictitious sales / financial misstatement
  { n: 21, group: "Fictitious sales", freeText: "The listed entity booked fictitious sales and overstated revenue. No facts have been provided about artificial trading, price manipulation, securities dealing, investor inducement or false corporate announcements.", mustNotFraud: true, note: "FICTITIOUS SALES WITHOUT TRADING NEXUS scenario." },
  { n: 22, group: "Fictitious sales", freeText: "Fictitious sales and assets were disclosed through financial statements.", mustNotIncludeIds: ["PFUTP-3-a", "SEBI-ACT-12A-a", "PFUTP-4-1"], note: "No dealing/issue fact is stated, so the general fraud clauses are blocked; PFUTP-4(2)(f)'s own narrower gate (fraud + a stated investor-communication channel) is legitimately satisfied and is not asserted against here." },
  { n: 23, group: "Fictitious sales", freeText: "The company's financial statements misstated revenue through fictitious sales with no genuine underlying transaction.", mustNotIncludeIds: ["PFUTP-3-a", "SEBI-ACT-12A-a", "PFUTP-4-1"], note: "Same as #22: PFUTP-4(2)(f)'s narrower channel-based gate is legitimately satisfied; the general dealing-requiring clauses are not." },
  { n: 24, group: "Fictitious sales", freeText: "Fictitious assets were booked with no genuine existence. No securities dealing is alleged.", mustNotFraud: true, note: "Bare fictitious assets." },
  { n: 25, group: "Fictitious sales", freeText: "The company recorded fictitious purchases to inflate reported profits. No trading fact is alleged.", mustNotFraud: true, note: "Bare fictitious purchases." },
  { n: 26, group: "Fictitious sales", freeText: "Revenue was overstated through fictitious sales. No securities-market element is alleged.", mustNotFraud: true, note: "Bare fictitious sales." },
  { n: 27, group: "Fictitious sales", freeText: "Fictitious sales and assets were disclosed through financial statements, with synchronized trading among connected accounts creating an artificial price rise.", mustIncludeFraudFamily: true, note: "Fraud + genuine trading-manipulation nexus now stated." },
  { n: 28, group: "Fictitious sales", freeText: "The company's fictitious sales were used to inflate the valuation for a preferential allotment of shares to promoter entities.", mustIncludeFraudFamily: true, note: "Fraud + genuine securities-issue nexus now stated." },
  { n: 29, group: "Fictitious sales", freeText: "Fictitious revenue was booked and reported in the company's annual report to investors.", mustIncludeIds: ["PFUTP-4-2-f"], note: "Fraud + investor-facing communication channel satisfies 4(2)(f)'s specific gate." },
  { n: 30, group: "Fictitious sales", freeText: "Fictitious sales were booked with no genuine underlying transaction. The matter remains under internal review with no other facts stated.", mustNotFraud: true, note: "Bare fictitious sales." },

  // 31-40: accounting/reporting errors
  { n: 31, group: "Accounting errors", freeText: "The company incorrectly classified foreign exchange gain as revenue from operations. Total profit and cash flow are unchanged. No evidence presently suggests deliberate falsification or investor deception.", mustNotFraud: true, note: "Verbatim ACCOUNTING ERROR CONTROL scenario." },
  { n: 32, group: "Accounting errors", freeText: "Interest income was classified as operating revenue in error. No fraud is alleged.", mustNotFraud: true, note: "Classification error." },
  { n: 33, group: "Accounting errors", freeText: "A receivables and payables adjustment was made through netting without proper disclosure. No fraud is alleged.", mustNotFraud: true, note: "Disclosure/classification issue only." },
  { n: 34, group: "Accounting errors", freeText: "An investment was carried at an incorrect valuation due to a bona fide error. No fraud is alleged.", mustNotFraud: true, note: "Valuation error." },
  { n: 35, group: "Accounting errors", freeText: "Standalone financial statements contained a classification error corrected in the subsequent quarter. No fraud is alleged.", mustNotFraud: true, note: "Classification error." },
  { n: 36, group: "Accounting errors", freeText: "Consolidated financial statements omitted a subsidiary's segment disclosure due to an oversight. No fraud is alleged.", mustNotFraud: true, note: "Disclosure oversight." },
  { n: 37, group: "Accounting errors", freeText: "A derivative transaction was misclassified in the books due to a bona fide accounting error. No fraud is alleged.", mustNotFraud: true, note: "Classification error." },
  { n: 38, group: "Accounting errors", freeText: "The annual report's business segment disclosure was incomplete due to an administrative oversight. No fraud is alleged.", mustNotFraud: true, note: "Disclosure oversight." },
  { n: 39, group: "Accounting errors", freeText: "Trade receivables were written off following an ordinary bad-debt assessment. No fraud is alleged.", mustNotFraud: true, note: "Ordinary write-off." },
  { n: 40, group: "Accounting errors", freeText: "A consolidation workpaper contained an arithmetic error later corrected. No fraud is alleged.", mustNotFraud: true, note: "Arithmetic error." },

  // 41-50: investigation non-cooperation
  { n: 41, group: "Non-cooperation", freeText: "The company failed to furnish accounting records sought under a SEBI summons. No substantive securities fraud allegation is included in this scenario.", mustNotFraud: true, note: "Verbatim PURE NON-COOPERATION CONTROL scenario." },
  { n: 42, group: "Non-cooperation", freeText: "The promoter did not appear before the investigating authority despite repeated summons. No fraud allegation is stated.", mustNotFraud: true, note: "Non-appearance only." },
  { n: 43, group: "Non-cooperation", freeText: "The statutory auditor withheld workpapers requested by the investigating authority. No fraud allegation is stated.", mustNotFraud: true, note: "Withholding workpapers only." },
  { n: 44, group: "Non-cooperation", freeText: "The company's response to a SEBI summons was contradictory and incomplete. No fraud allegation is stated.", mustNotFraud: true, note: "Contradictory response only." },
  { n: 45, group: "Non-cooperation", freeText: "A forensic auditor was denied access to the company's ERP system during the investigation. No fraud allegation is stated.", mustNotFraud: true, note: "ERP access denial only." },
  { n: 46, group: "Non-cooperation", freeText: "Correspondence with the investigating authority was delayed for several months. No fraud allegation is stated.", mustNotFraud: true, note: "Delay only." },
  { n: 47, group: "Non-cooperation", freeText: "The company refused to hand over board minutes sought by the investigating authority. No fraud allegation is stated.", mustNotFraud: true, note: "Refusal to share minutes only." },
  { n: 48, group: "Non-cooperation", freeText: "An intermediary declined to produce records before the investigating authority. No fraud allegation is stated.", mustNotFraud: true, note: "Refusal to produce records only." },
  { n: 49, group: "Non-cooperation", freeText: "A witness gave a contradictory statement on oath during the investigation. No fraud allegation is stated.", mustNotFraud: true, note: "Contradictory testimony only." },
  { n: 50, group: "Non-cooperation", freeText: "The company did not respond to summons issued in connection with a routine compliance review. No fraud allegation is stated.", mustNotFraud: true, note: "Non-response only." },

  // 51-60: market manipulation
  { n: 51, group: "Market manipulation", freeText: "Synchronized trading among connected accounts created an artificial price rise with no genuine change in beneficial ownership.", mustIncludeFraudFamily: true, note: "Genuine trading/price nexus." },
  { n: 52, group: "Market manipulation", freeText: "A small group of connected trading accounts kept buying and selling the same stock back and forth among themselves right before a price jump.", mustIncludeFraudFamily: true, note: "Genuine trading/price nexus." },
  { n: 53, group: "Market manipulation", freeText: "Wash trades among connected entities artificially inflated the trading volume in the company's shares.", mustIncludeFraudFamily: true, note: "Genuine trading/price nexus." },
  { n: 54, group: "Market manipulation", freeText: "No genuine change in ownership occurred despite repeated trades among connected accounts that induced investors to trade.", mustIncludeFraudFamily: true, note: "Genuine trading/price nexus." },
  { n: 55, group: "Market manipulation", freeText: "The company's shares were artificially propped up through matched trades among connected accounts.", mustIncludeFraudFamily: true, note: "Genuine trading/price nexus." },
  { n: 56, group: "Market manipulation", freeText: "Connected trading accounts distorted price discovery in the company's shares ahead of a corporate announcement.", mustIncludeFraudFamily: true, note: "Genuine trading/price nexus." },
  { n: 57, group: "Market manipulation", freeText: "A synchronized trading scheme among connected accounts created a false or misleading appearance of trading activity in the company's shares.", mustIncludeIds: ["PFUTP-4-2-a"], note: "Directly satisfies 4(2)(a)'s own text." },
  { n: 58, group: "Market manipulation", freeText: "Artificial price rise was engineered through connected trading accounts, and a false announcement was circulated to induce trades.", mustIncludeFraudFamily: true, note: "Trading + false information nexus." },
  { n: 59, group: "Market manipulation", freeText: "Price manipulation through synchronized trading was combined with a fabricated corporate announcement about the company's prospects.", mustIncludeFraudFamily: true, note: "Trading + false information nexus." },
  { n: 60, group: "Market manipulation", freeText: "An artificial price rise was created through connected trading accounts in the days preceding a preferential allotment of shares.", mustIncludeFraudFamily: true, note: "Trading/price nexus plus a securities-issue fact." },

  // 61-70: preferential allotment
  { n: 61, group: "Preferential allotment", freeText: "Preferential allotment was fully paid and genuine and complied with the applicable lock-in requirements.", mustNotFraud: true, note: "Clean, compliant allotment." },
  { n: 62, group: "Preferential allotment", freeText: "The preferential allotment of shares to promoter entities was completed with full consideration received in cash, verified by the statutory auditor.", mustNotFraud: true, note: "Clean, compliant allotment." },
  { n: 63, group: "Preferential allotment", freeText: "Preferential allotment proceeds were correctly recorded and no discrepancy was found in the allotment register.", mustNotFraud: true, note: "Clean, compliant allotment." },
  { n: 64, group: "Preferential allotment", freeText: "The preferential allotment complied with the three-year lock-in requirement for promoter allottees.", mustNotFraud: true, note: "Clean, compliant allotment." },
  { n: 65, group: "Preferential allotment", freeText: "A preferential allotment of shares to promoter entities was made without paying any genuine consideration.", mustIncludeFraudFamily: true, note: "Allotment + no genuine consideration is a fraud fact." },
  { n: 66, group: "Preferential allotment", freeText: "The preferential allotment was structured through fabricated bank statements to simulate payment of consideration.", mustIncludeFraudFamily: true, note: "Allotment + fabricated evidence." },
  { n: 67, group: "Preferential allotment", freeText: "A preferential allotment was a sham allotment because the claimed underlying assets were never acquired.", mustIncludeFraudFamily: true, note: "Allotment + sham asset backing." },
  { n: 68, group: "Preferential allotment", freeText: "A preferential allotment was financed circularly through loans from connected entities, without paying any genuine consideration.", mustIncludeFraudFamily: true, note: "Allotment + no genuine consideration." },
  { n: 69, group: "Preferential allotment", freeText: "The preferential allotment lock-in period was circumvented through an off-market transfer shortly after allotment.", mustNotFraud: true, note: "Lock-in circumvention is a distinct compliance breach, not itself an allegation the allotment was fraudulent/sham." },
  { n: 70, group: "Preferential allotment", freeText: "A preferential allotment was made to a promoter entity at a price later found to be below the regulatory floor price. No non-payment or fraud is alleged.", mustNotFraud: true, note: "Pricing breach only." },

  // 71-80: public/rights issue proceeds
  { n: 71, group: "Issue proceeds", freeText: "Rights issue proceeds were used exactly for the disclosed objects and the utilisation was properly certified by the monitoring agency.", mustNotFraud: true, note: "Clean, compliant utilisation." },
  { n: 72, group: "Issue proceeds", freeText: "IPO proceeds were fully utilised as per the disclosed objects, confirmed by the utilisation certificate.", mustNotFraud: true, note: "Clean, compliant utilisation." },
  { n: 73, group: "Issue proceeds", freeText: "Public issue proceeds were diverted to a promoter-controlled entity instead of the disclosed objects. No securities trading or price manipulation is alleged.", mustNotFraud: true, note: "Diversion of issue proceeds alone is not itself a deceptive/fraudulent-conduct fact under the gate." },
  { n: 74, group: "Issue proceeds", freeText: "Rights issue proceeds meant for capacity expansion were instead used for unrelated purposes. No fraud is alleged in this scenario.", mustNotFraud: true, note: "Misuse of proceeds alone." },
  { n: 75, group: "Issue proceeds", freeText: "The utilisation of IPO proceeds was delayed by two quarters due to regulatory approvals. No fraud is alleged.", mustNotFraud: true, note: "Delay only." },
  { n: 76, group: "Issue proceeds", freeText: "A monitoring agency flagged a discrepancy in the rights issue proceeds utilisation. No fraud is alleged in this scenario.", mustNotFraud: true, note: "Discrepancy flagged, no fraud alleged." },
  { n: 77, group: "Issue proceeds", freeText: "A false announcement about rights issue proceeds utilisation was circulated to investors.", mustIncludeFraudFamily: true, note: "Issue proceeds + false corporate announcement." },
  { n: 78, group: "Issue proceeds", freeText: "IPO proceeds were diverted and the diversion was concealed through misstated financial statements presented to investors.", mustIncludeFraudFamily: true, note: "Issue proceeds + misstated financial statements." },
  { n: 79, group: "Issue proceeds", freeText: "Public issue proceeds were correctly utilised and independently verified, with no discrepancy found.", mustNotFraud: true, note: "Clean, compliant utilisation." },
  { n: 80, group: "Issue proceeds", freeText: "The renunciation of rights in the rights issue was handled in accordance with the disclosed procedure. No fraud is alleged.", mustNotFraud: true, note: "Clean, compliant procedure." },

  // 81-90: governance/disclosure
  { n: 81, group: "Governance", freeText: "The Audit Committee was not properly constituted and meetings were not conducted for two consecutive quarters.", mustNotFraud: true, mustIncludeIds: ["LODR-18-2"], note: "Governance-process lapse only. Checkpoint correction 2: this compound composition+meetings fact independently satisfies Regulation 18(2)'s own (meetings-not-conducted) gate; the composition component would independently satisfy Regulation 18(1)(b), not registered in this suite's fixture set, and no longer satisfies the role/Schedule-II provision this test previously (incorrectly) expected." },
  { n: 82, group: "Governance", freeText: "Audit Committee meeting minutes and agendas could not be produced for the relevant period.", mustNotFraud: true, note: "Governance-process lapse only." },
  { n: 83, group: "Governance", freeText: "The Compliance Officer position was vacant for several months with no qualified replacement appointed.", mustNotFraud: true, mustIncludeIds: ["LODR-6-gen"], note: "Governance-process lapse only." },
  { n: 84, group: "Governance", freeText: "An unqualified individual was improperly appointed as Compliance Officer.", mustNotFraud: true, note: "Governance-process lapse only." },
  { n: 85, group: "Governance", freeText: "The CEO/CFO compliance certificate to the board was not duly signed for one quarter.", mustNotFraud: true, mustIncludeIds: ["LODR-17-8"], note: "Governance-process lapse only." },
  { n: 86, group: "Governance", freeText: "The Managing Director signed the compliance certificate despite being aware the financial statements did not present a true and fair view.", mustNotFraud: true, note: "Certification lapse; no securities dealing/issue fact is stated." },
  { n: 87, group: "Governance", freeText: "A non-executive director failed to raise concerns despite being aware of irregularities.", mustNotFraud: true, note: "Governance lapse only." },
  { n: 88, group: "Governance", freeText: "A director acquiesced in a decision without exercising independent judgment. No fraud allegation is stated in this scenario.", mustNotFraud: true, note: "Governance lapse only." },
  { n: 89, group: "Governance", freeText: "The Audit Committee existed only on paper with no genuine meetings held during the financial year.", mustNotFraud: true, note: "Governance-process lapse only." },
  { n: 90, group: "Governance", freeText: "Board minutes could not be produced evidencing the director's oversight of a material transaction.", mustNotFraud: true, note: "Governance-process lapse only." },

  // 91-100: compliant / negative controls
  { n: 91, group: "Negative controls", freeText: "A related-party transaction was fully disclosed, reviewed and approved by the Audit Committee in the ordinary course.", mustNotFraud: true, note: "Clean RPT." },
  { n: 92, group: "Negative controls", freeText: "A preferential allotment was fully paid and genuine and complied with the applicable lock-in requirements.", mustNotFraud: true, note: "Clean preferential allotment." },
  { n: 93, group: "Negative controls", freeText: "Rights issue proceeds were used exactly for the disclosed objects and the utilisation was properly certified.", mustNotFraud: true, note: "Clean rights issue." },
  { n: 94, group: "Negative controls", freeText: "The Audit Committee was properly constituted; meetings were held and supported by agendas and minutes.", mustNotFraud: true, note: "Clean Audit Committee." },
  { n: 95, group: "Negative controls", freeText: "The statutory auditor obtained sufficient appropriate audit evidence and no negligence, collusion or misstatement is alleged.", mustNotFraud: true, note: "Clean auditor." },
  { n: 96, group: "Negative controls", freeText: "A listed entity made an ordinary purchase from an unrelated vendor at arm's length.", mustNotFraud: true, note: "Ordinary vendor transaction." },
  { n: 97, group: "Negative controls", freeText: "An ordinary commercial dispute arose between the company and an unrelated counterparty over delivery timelines.", mustNotFraud: true, note: "Ordinary commercial dispute." },
  { n: 98, group: "Negative controls", freeText: "The Compliance Officer was duly appointed and no vacancy is alleged.", mustNotFraud: true, note: "Clean Compliance Officer." },
  { n: 99, group: "Negative controls", freeText: "The company's financial statements were prepared in accordance with applicable accounting standards with no misstatement alleged.", mustNotFraud: true, note: "Clean financial statements." },
  { n: 100, group: "Negative controls", freeText: "A director attended all scheduled board meetings during the financial year with no governance lapse alleged.", mustNotFraud: true, note: "Clean director conduct." },
];

describe("100-scenario CFID-officer stress suite", () => {
  for (const s of SCENARIOS) {
    it(`#${s.n} [${s.group}]: ${s.note}`, () => {
      const result = analyzeScenario({ freeText: s.freeText }, ALL_FINDINGS, ALL_PROVISIONS, []);
      const returnedIds = result.provisionResults.map((pr) => pr.provision.id);

      if (s.mustNotFraud) {
        expect(containsFraud(returnedIds)).toBe(false);
      }
      if (s.mustIncludeFraudFamily) {
        expect(containsFraud(returnedIds)).toBe(true);
      }
      if (s.mustIncludeIds) {
        for (const id of s.mustIncludeIds) {
          expect(returnedIds).toContain(id);
        }
      }
      if (s.mustNotIncludeIds) {
        for (const id of s.mustNotIncludeIds) {
          expect(returnedIds).not.toContain(id);
        }
      }
    });
  }

  it("sanity: every scenario group is represented with exactly 10 scenarios", () => {
    const counts = new Map<string, number>();
    for (const s of SCENARIOS) counts.set(s.group, (counts.get(s.group) ?? 0) + 1);
    expect(SCENARIOS).toHaveLength(100);
    for (const [, count] of counts) expect(count).toBe(10);
  });
});
