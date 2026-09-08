// Non-PFUTP provision-precision remediation: an INDEPENDENT blind
// validation suite covering LODR, SEBI Act (non-12A), ICDR and Ind AS --
// the families the prior two passes did not gate. Not a paraphrase of
// tests/blind-validation-suite-v2.test.ts (which exercises PFUTP/SEBI Act
// 12A) or tests/hundred-scenario-stress-suite.test.ts; scenarios and
// reasoning here are authored fresh against the NEW gates in
// provision-retrieval-rules.ts (LODR Regulation 23/30/32/33/34/46/48/4,
// SEBI Act 11C/15HA/15HB/27/11(2), ICDR 158/160/167, Ind AS 1/32/109/110/115).
// PFUTP/12A appear only in the adversarial group, to confirm the fraud
// family stays correctly excluded/included alongside the newly-gated
// families on the same facts.
//
// Every expected MUST/MUST-NOT is reasoned from each gate's own design
// (see docs/provision-gating-remediation-v3.md) BEFORE running the engine.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeProvision(id: string, provisionNumber: string, subject: string, instrument = "Test Instrument"): LegalProvision {
  return { id, instrument, provisionNumber, subject, currentTextVerificationStatus: "Requires verification", officialSource: null, ordersConsidered: [], treatmentInPilotOrders: "", lawLibraryNote: null };
}
function link(provisionId: string, justifyingTags: string[] = []) {
  return { provisionId, justifyingTags };
}
function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionLinks: { provisionId: string; justifyingTags: string[] }[] }): ScenarioFinding {
  return {
    caseName: "Synthetic Non-PFUTP Blind-Suite Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic non-PFUTP blind-validation finding",
    factualPattern: "Synthetic factual pattern.",
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
const LODR_23_1 = makeProvision("LODR-23-1", "Regulation 23(1) proviso", "RPT materiality threshold.", "LODR Regulations, 2015");
const LODR_23_2 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
const LODR_23_4 = makeProvision("LODR-23-4", "Regulation 23(4)", "Shareholder approval for material RPTs.", "LODR Regulations, 2015");
const LODR_2_ZC = makeProvision("LODR-2-zc", "Regulation 2(1)(zc)", "Definition of related party transaction.", "LODR Regulations, 2015");
const LODR_30 = makeProvision("LODR-30", "Regulation 30", "Material event/information disclosure.", "LODR Regulations, 2015");
const LODR_33_1_GEN = makeProvision("LODR-33-1-gen", "Regulation 33(1)", "General financial-results preparation requirements.", "LODR Regulations, 2015");
const LODR_33_1_A = makeProvision("LODR-33-1-a", "Regulation 33(1)(a)", "Accrual-basis financial results.", "LODR Regulations, 2015");
const LODR_48 = makeProvision("LODR-48", "Regulation 48", "Compliance with accounting standards.", "LODR Regulations, 2015");
const LODR_34_3 = makeProvision("LODR-34-3", "Regulation 34(3)", "Annual report other disclosures.", "LODR Regulations, 2015");
const LODR_46_2_S = makeProvision("LODR-46-2-s", "Regulation 46(2)(s)", "Website publication of subsidiary financial statements.", "LODR Regulations, 2015");
const LODR_32 = makeProvision("LODR-32", "Regulation 32", "Issue-proceeds monitoring/disclosure.", "LODR Regulations, 2015");
const LODR_4_1 = makeProvision("LODR-4-1", "Regulation 4(1)", "General disclosure/governance principles.", "LODR Regulations, 2015");
const LODR_4_2_E_I = makeProvision("LODR-4-2-e-i", "Regulation 4(2)(e)(i)", "True and fair view of financial statements.", "LODR Regulations, 2015");
const LODR_18_3 = makeProvision("LODR-18-3-schedule-II", "Regulation 18(3) / Schedule II Part C", "Audit Committee role and responsibilities.", "LODR Regulations, 2015");
const LODR_6_GEN = makeProvision("LODR-6-gen", "Regulation 6", "Compliance Officer appointment.", "LODR Regulations, 2015");
const LODR_17_8 = makeProvision("LODR-17-8", "Regulation 17(8)", "CEO/CFO compliance certification.", "LODR Regulations, 2015");
const SEBI_11C_2 = makeProvision("SEBI-ACT-11C-2", "Section 11C(2)", "Duty to preserve/produce records to the investigating authority.", "SEBI Act, 1992");
const SEBI_11C_3 = makeProvision("SEBI-ACT-11C-3", "Section 11C(3)", "Power to require production of records.", "SEBI Act, 1992");
const SEBI_15HA = makeProvision("SEBI-ACT-15HA", "Section 15HA", "Penalty for fraudulent/unfair trade practices.", "SEBI Act, 1992");
const SEBI_15HB = makeProvision("SEBI-ACT-15HB", "Section 15HB", "Residual penalty provision.", "SEBI Act, 1992");
const SEBI_27 = makeProvision("SEBI-ACT-27", "Section 27", "Liability attribution to persons in charge of the company.", "SEBI Act, 1992");
const SEBI_11_2_E = makeProvision("SEBI-ACT-11-2-e", "Section 11(2)(e)", "Power to prohibit fraudulent/unfair trade practices.", "SEBI Act, 1992");
const ICDR_158 = makeProvision("ICDR-158-CH-V", "Regulation 158, Chapter V", "Preferential-issue guidelines.", "SEBI (ICDR) Regulations, 2018");
const ICDR_160 = makeProvision("ICDR-160", "Regulation 160", "Fully-paid-up requirement for preferential allotment.", "SEBI (ICDR) Regulations, 2018");
const ICDR_167 = makeProvision("ICDR-167", "Regulation 167", "Lock-in period for preferential allottees.", "SEBI (ICDR) Regulations, 2018");
const IND_AS_1 = makeProvision("IND-AS-1", "Ind AS 1", "Presentation of Financial Statements.", "Indian Accounting Standards");
const IND_AS_24 = makeProvision("IND-AS-24", "Ind AS 24", "Related Party Disclosures.", "Indian Accounting Standards");
const IND_AS_32 = makeProvision("IND-AS-32", "Ind AS 32", "Financial Instruments: Presentation.", "Indian Accounting Standards");
const IND_AS_109 = makeProvision("IND-AS-109", "Ind AS 109", "Financial Instruments: recognition/measurement.", "Indian Accounting Standards");
const IND_AS_110 = makeProvision("IND-AS-110", "Ind AS 110", "Consolidated Financial Statements.", "Indian Accounting Standards");
const IND_AS_115 = makeProvision("IND-AS-115", "Ind AS 115", "Revenue from Contracts with Customers.", "Indian Accounting Standards");
const COMPANIES_ACT_136 = makeProvision("COMPANIES-ACT-136", "Section 136(1)", "Access/publication of financial statements.", "Companies Act, 2013");
const PFUTP_3_A = makeProvision("PFUTP-3-a", "Regulation 3(a)", "Dealing in securities in a fraudulent manner.", "PFUTP Regulations, 2003");
const SEBI_12A_A = makeProvision("SEBI-ACT-12A-a", "Section 12A(a)", "Manipulative/deceptive device connected with dealing.", "SEBI Act, 1992");

const ALL_PROVISIONS = [
  LODR_23_1, LODR_23_2, LODR_23_4, LODR_2_ZC, LODR_30, LODR_33_1_GEN, LODR_33_1_A, LODR_48, LODR_34_3, LODR_46_2_S, LODR_32,
  LODR_4_1, LODR_4_2_E_I, LODR_18_3, LODR_6_GEN, LODR_17_8, SEBI_11C_2, SEBI_11C_3, SEBI_15HA, SEBI_15HB, SEBI_27, SEBI_11_2_E,
  ICDR_158, ICDR_160, ICDR_167, IND_AS_1, IND_AS_24, IND_AS_32, IND_AS_109, IND_AS_110, IND_AS_115, COMPANIES_ACT_136,
  PFUTP_3_A, SEBI_12A_A,
];

// ----- Findings: each carries its realistic "home" provisions AND an
// empty-justifyingTags link to the broad-fraud family, exactly like the
// live corpus, so MUST-NOT assertions on PFUTP/12A in the adversarial
// group are genuine gate tests. -----
const F_RPT = makeFinding({
  recordId: "NP-RPT-01",
  transactionTypes: ["related_party_transaction"],
  actorRoles: ["promoter"],
  allegedConduct: ["non_disclosure_of_information", "rpt_approval_lapse", "related_party_misrepresentation"],
  provisionLinks: [link(LODR_23_1.id), link(LODR_23_2.id), link(LODR_23_4.id), link(LODR_2_ZC.id), link(IND_AS_24.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_MATERIAL_EVENT = makeFinding({
  recordId: "NP-EVENT-01",
  transactionTypes: ["corporate_announcement"],
  allegedConduct: ["non_disclosure_of_information", "false_business_or_corporate_announcement"],
  provisionLinks: [link(LODR_30.id), link(LODR_4_1.id), link(SEBI_15HB.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_FINRESULTS = makeFinding({
  recordId: "NP-FIN-01",
  transactionTypes: ["financial_statement_disclosure", "standalone_financials", "consolidated_financials"],
  allegedConduct: ["financial_statement_misstatement", "fictitious_sales_or_revenue"],
  provisionLinks: [link(LODR_33_1_GEN.id), link(LODR_33_1_A.id), link(LODR_48.id), link(LODR_4_2_E_I.id), link(IND_AS_1.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_ANNUAL_REPORT = makeFinding({
  recordId: "NP-AR-01",
  transactionTypes: ["annual_report_disclosure"],
  allegedConduct: ["non_disclosure_of_information", "financial_statement_misstatement"],
  provisionLinks: [link(LODR_34_3.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_WEBSITE = makeFinding({
  recordId: "NP-WEB-01",
  transactionTypes: ["consolidated_financials"],
  allegedConduct: ["non_disclosure_of_information"],
  provisionLinks: [link(LODR_46_2_S.id), link(IND_AS_110.id)],
});
const F_ISSUE_PROCEEDS = makeFinding({
  recordId: "NP-ISSUE-01",
  transactionTypes: ["rights_issue"],
  allegedConduct: ["fund_diversion", "financial_statement_misstatement"],
  evidenceTypes: ["utilisation_of_issue_proceeds_certificate"],
  provisionLinks: [link(LODR_32.id), link(LODR_48.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_GOVERNANCE = makeFinding({
  recordId: "NP-GOV-01",
  transactionTypes: ["audit_committee_process", "compliance_officer_appointment", "certification_process"],
  allegedConduct: ["audit_committee_deficiency", "compliance_officer_deficiency", "false_compliance_certification"],
  provisionLinks: [link(LODR_18_3.id, ["audit_committee_deficiency"]), link(LODR_6_GEN.id, ["compliance_officer_deficiency"]), link(LODR_17_8.id, ["false_compliance_certification"])],
});
const F_INVESTIGATION = makeFinding({
  recordId: "NP-INV-01",
  transactionTypes: ["investigation_process"],
  actorRoles: ["statutory_auditor"],
  allegedConduct: ["non_cooperation_with_investigation"],
  provisionLinks: [link(SEBI_11C_2.id), link(SEBI_11C_3.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_ALLOTMENT = makeFinding({
  recordId: "NP-ALLOT-01",
  transactionTypes: ["preferential_allotment"],
  actorRoles: ["promoter"],
  allegedConduct: ["sham_preferential_allotment", "unsupported_share_allotment_consideration"],
  provisionLinks: [link(ICDR_158.id), link(ICDR_160.id), link(ICDR_167.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_LIABILITY = makeFinding({
  recordId: "NP-LIAB-01",
  transactionTypes: ["board_director_duties"],
  actorRoles: ["managing_director", "cfo"],
  allegedConduct: ["fund_diversion", "director_governance_failure"],
  provisionLinks: [link(SEBI_27.id), link(SEBI_15HA.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_ACCOUNTING = makeFinding({
  recordId: "NP-ACC-01",
  transactionTypes: ["investment_valuation", "revenue_recognition", "consolidated_financials"],
  allegedConduct: ["financial_statement_misstatement"],
  provisionLinks: [link(IND_AS_32.id), link(IND_AS_109.id), link(IND_AS_110.id), link(IND_AS_115.id), link(PFUTP_3_A.id), link(SEBI_12A_A.id)],
});
const F_TRADING = makeFinding({
  recordId: "NP-TRADE-01",
  allegedConduct: ["false_appearance_of_trading", "actual_price_manipulation"],
  provisionLinks: [link(PFUTP_3_A.id), link(SEBI_12A_A.id), link(SEBI_11_2_E.id)],
});
const F_COMPANIES_ACT = makeFinding({
  recordId: "NP-CA-01",
  transactionTypes: ["consolidated_financials"],
  allegedConduct: ["non_disclosure_of_information"],
  provisionLinks: [link(COMPANIES_ACT_136.id)],
});

const ALL_FINDINGS = [
  F_RPT, F_MATERIAL_EVENT, F_FINRESULTS, F_ANNUAL_REPORT, F_WEBSITE, F_ISSUE_PROCEEDS, F_GOVERNANCE, F_INVESTIGATION,
  F_ALLOTMENT, F_LIABILITY, F_ACCOUNTING, F_TRADING, F_COMPANIES_ACT,
];

interface Scenario {
  n: number;
  group: string;
  freeText: string;
  must?: string[];
  mustNot?: string[];
  note: string;
}

const SCENARIOS: Scenario[] = [
  // ===== 1-20: RPT / Regulation 23 =====
  { n: 1, group: "RPT/Reg 23", freeText: "A related party exists but no transaction with it has occurred.", mustNot: ["LODR-23-2", "LODR-23-4"], note: "Related-party fact alone, no transaction -- RPT_FACT itself requires a transaction, not merely a relationship." },
  { n: 2, group: "RPT/Reg 23", freeText: "A related-party transaction was entered into, fully approved by the Audit Committee and shareholders, and disclosed without any lapse.", mustNot: ["LODR-23-2", "LODR-23-4"], note: "Genuine RPT, no process-lapse fact stated." },
  { n: 3, group: "RPT/Reg 23", freeText: "A related-party transaction proceeded without prior Audit Committee approval.", must: ["LODR-23-2"], note: "RPT + approval lapse, same sentence." },
  { n: 4, group: "RPT/Reg 23", freeText: "A material related-party transaction proceeded without the required shareholder approval.", must: ["LODR-23-4"], note: "RPT + shareholder-approval lapse." },
  { n: 5, group: "RPT/Reg 23", freeText: "A related-party transaction fell below the materiality threshold; shareholder approval was accordingly not obtained, as none was required.", must: ["LODR-23-1"], mustNot: ["LODR-23-4"], note: "Non-material RPT -- 23(1) proviso (threshold) is the relevant provision, not the shareholder-approval requirement." },
  { n: 6, group: "RPT/Reg 23", freeText: "A material related-party transaction was undertaken.", must: ["LODR-23-1"], note: "Bare RPT -- materiality-threshold provision requires only the RPT fact." },
  { n: 7, group: "RPT/Reg 23", freeText: "A related-party transaction involved a late disclosure, three weeks after the deadline, though it was genuinely approved.", must: ["LODR-23-2"], note: "Disclosure lapse counts as a process lapse under this corpus's vocabulary (a genuine limitation, see docs); approval itself was not stated as absent, but the lapse fact alone connects." },
  { n: 8, group: "RPT/Reg 23", freeText: "A related-party transaction with a wholly-owned subsidiary was correctly disclosed and approved.", mustNot: ["LODR-23-2", "LODR-23-4"], note: "Compliant subsidiary RPT." },
  { n: 9, group: "RPT/Reg 23", freeText: "A related-party transaction was not approved by the Audit Committee.", must: ["LODR-23-2"], note: "Explicit AC-approval-lapse phrasing." },
  { n: 10, group: "RPT/Reg 23", freeText: "A related-party transaction was not approved by shareholders.", must: ["LODR-23-4"], note: "Explicit shareholder-approval-lapse phrasing." },
  { n: 11, group: "RPT/Reg 23", freeText: "The definition of related party transaction was considered in relation to a proposed transaction.", must: ["LODR-2-zc"], note: "Pure definitional query." },
  { n: 12, group: "RPT/Reg 23", freeText: "An ordinary vendor, wrongly assumed to be a related party, supplied goods on standard commercial terms.", mustNot: ["LODR-23-2", "LODR-23-4"], note: "No related_party_transaction fact actually stated (vendor is not tagged as related-party without the connecting phrase)." },
  { n: 13, group: "RPT/Reg 23", freeText: "A related-party transaction pre-dating the current Regulation 23 amendment was reviewed against the definition then in force.", must: ["LODR-23-1"], note: "Pre/post-amendment framing; RPT fact present triggers the threshold provision regardless of era (temporal wording verification is a separate, disclosed limitation)." },
  { n: 14, group: "RPT/Reg 23", freeText: "A promoter-connected entity's transaction with the company was not disclosed in the related-party register.", must: ["LODR-23-2"], note: "Non-disclosure connected to an RPT fact." },
  { n: 15, group: "RPT/Reg 23", freeText: "A related-party transaction with a director's relative proceeded without prior Audit Committee approval, but was later ratified.", must: ["LODR-23-2"], note: "Approval lapse stated even though later ratified -- ratification is a further fact for the officer to weigh, not a reason to withhold the candidate." },
  { n: 16, group: "RPT/Reg 23", freeText: "No related-party transaction is alleged in this scenario; only an unrelated vendor dispute is described.", mustNot: ["LODR-23-1", "LODR-23-2", "LODR-23-4", "LODR-2-zc"], note: "Comprehensive negative control." },
  { n: 17, group: "RPT/Reg 23", freeText: "A related-party transaction had an omitted disclosure in the register, later corrected following an internal review, with no other committee/shareholder-approval lapse alleged.", must: ["LODR-23-2"], note: "Register omission itself is a disclosure lapse (RPT_PROCESS_LAPSE) even though no other lapse is alleged." },
  { n: 18, group: "RPT/Reg 23", freeText: "A material related-party transaction with a promoter entity was undisclosed, and in the same transaction shares were allotted to that entity without genuine consideration.", must: ["LODR-23-2"], note: "RPT + connected fraud fact -- LODR-23-2 remains relevant alongside any fraud-family candidates." },
  { n: 19, group: "RPT/Reg 23", freeText: "The Audit Committee reviewed and approved a related-party transaction after full disclosure of its terms.", mustNot: ["LODR-23-2", "LODR-23-4"], note: "Fully compliant, explicit approval." },
  { n: 20, group: "RPT/Reg 23", freeText: "A related-party transaction involved a misrepresented related party, presented as an arm's-length dealing.", must: ["LODR-23-2"], note: "related_party_misrepresentation is itself an RPT_PROCESS_LAPSE fact." },

  // ===== 21-40: Financial results / LODR 33 / 48 / Ind AS =====
  { n: 21, group: "Financial results", freeText: "Foreign exchange gain was incorrectly classified as revenue due to a bona fide accounting error, with no deliberate misstatement.", mustNot: ["LODR-48"], note: "Classification error only, no stated misstatement fact -- 48 requires financial_statement_misstatement specifically." },
  { n: 22, group: "Financial results", freeText: "The company's financial statements contained a material misstatement of revenue in breach of the prescribed accounting standards.", must: ["LODR-48"], note: "Financial-results channel + misstatement, connected." },
  { n: 23, group: "Financial results", freeText: "Quarterly financial results were prepared and submitted on time in full compliance with the applicable requirements.", mustNot: ["LODR-33-1-gen", "LODR-33-1-a", "LODR-48"], note: "Clean/compliant results." },
  { n: 24, group: "Financial results", freeText: "Financial results contained a misstatement because they were not prepared on an accrual basis in a given quarter.", must: ["LODR-33-1-a"], note: "Channel + violation connected." },
  { n: 25, group: "Financial results", freeText: "The annual financial statements contained a misstatement; the quarterly results for the same period are not alleged to be in error.", must: ["LODR-33-1-gen"], note: "This corpus's vocabulary does not yet distinguish annual from quarterly channel facts (a disclosed limitation); the channel+misstatement gate is satisfied by the annual-statement misstatement regardless." },
  { n: 26, group: "Financial results", freeText: "The company's audit committee failed to convene, with no financial-results-specific fact stated at all.", mustNot: ["LODR-33-1-gen", "LODR-48"], note: "Governance-only fact, no financial-results channel -- must not flood the results family." },
  { n: 27, group: "Financial results", freeText: "The company's financial statements gave a true and fair view; the statutory auditor separately faced an unrelated personal dispute.", mustNot: ["LODR-4-2-e-i"], note: "Explicit compliance statement, no misstatement fact." },
  { n: 28, group: "Financial results", freeText: "The financial statements did not give a true and fair view because of a deliberate misstatement of receivables.", must: ["LODR-4-2-e-i"], note: "Direct misstatement fact." },
  { n: 29, group: "Financial results", freeText: "The company's published financial statements contained fictitious sales figures.", must: ["LODR-48"], note: "Fictitious sales is itself a misstatement-adjacent conduct fact connected to the financial-statement channel." },
  { n: 30, group: "Financial results", freeText: "An auditor's qualification on the financial statements was fully and accurately disclosed, with no misstatement found.", mustNot: ["LODR-48"], note: "Disclosed qualification, no misstatement." },
  { n: 31, group: "Financial results", freeText: "Financial results for the year contained inflated sales figures reported to the stock exchanges.", must: ["LODR-33-1-gen", "LODR-48"], note: "Channel + misstatement, both families satisfied." },
  { n: 32, group: "Financial results", freeText: "The company's standalone financial statements were accurate; a wholly separate segment-disclosure gap is alleged with no financial-statement-specific misstatement.", mustNot: ["LODR-48"], note: "Accurate financials disclaimed; segment gap is a different, unconnected fact." },
  { n: 33, group: "Financial results", freeText: "No misstatement, no accounting-standard non-compliance, and no fictitious accounting is alleged; only a genuine, fully compliant set of results is described.", mustNot: ["LODR-33-1-gen", "LODR-33-1-a", "LODR-48", "LODR-4-2-e-i"], note: "Comprehensive negative control." },
  { n: 34, group: "Financial results", freeText: "Financial statements presented were later found to contain fictitious assets with no genuine basis.", must: ["LODR-48"], note: "Fictitious-asset fact connected to the financial-statement channel." },
  { n: 35, group: "Financial results", freeText: "The Ind AS 1 presentation requirements were considered in relation to a genuine, accurate set of financial statements.", mustNot: ["IND-AS-1"], note: "Ind AS 1 requires a stated misstatement fact, not a bare mention." },
  { n: 36, group: "Financial results", freeText: "The financial statements' presentation contained a misstatement in the classification of a material liability.", must: ["IND-AS-1"], note: "Misstatement fact present." },
  { n: 37, group: "Financial results", freeText: "A director negligently failed to review the financial results before they were submitted, though the results themselves were accurate.", mustNot: ["LODR-48"], note: "Director negligence alone, accurate results disclaimed." },
  { n: 38, group: "Financial results", freeText: "Financial results were submitted with a misstatement, and separately the company had a compliance officer vacancy with no connection stated between the two.", must: ["LODR-33-1-gen", "LODR-6-gen"], note: "Financial-results misstatement satisfies 33; the Compliance Officer vacancy is itself a self-contained, single-group fact for LODR-6-gen regardless of the unconnected misstatement elsewhere." },
  { n: 39, group: "Financial results", freeText: "The company's financial results contained a misstatement and separately failed to comply with the prescribed accounting standards for the same figures.", must: ["LODR-33-1-a", "LODR-48"], note: "Same misstatement fact satisfies both 33(1)(a) and 48." },
  { n: 40, group: "Financial results", freeText: "Revenue was overstated in the financial statements submitted to the exchanges through inflated sales figures.", must: ["LODR-33-1-gen", "LODR-48"], note: "Overstated-sales misstatement, financial-results channel." },

  // ===== 41-55: Regulation 30 / material events =====
  { n: 41, group: "Reg 30 / material events", freeText: "A material event was not disclosed to the stock exchanges.", must: ["LODR-30"], note: "Direct event + non-disclosure, same sentence." },
  { n: 42, group: "Reg 30 / material events", freeText: "A material event was disclosed to the stock exchanges accurately and within the prescribed timeline.", mustNot: ["LODR-30"], note: "Compliant disclosure." },
  { n: 43, group: "Reg 30 / material events", freeText: "The company committed fictitious accounting fraud; no separate material-event disclosure issue is stated.", mustNot: ["LODR-30"], note: "Fraud elsewhere in accounts is not itself a Reg 30 event-disclosure fact -- the prompt's own worked example." },
  { n: 44, group: "Reg 30 / material events", freeText: "A material development concerning litigation was not disclosed to the exchanges for several weeks after it occurred.", must: ["LODR-30"], note: "Delayed material-event disclosure." },
  { n: 45, group: "Reg 30 / material events", freeText: "An immaterial internal development was not separately announced to the exchanges.", mustNot: ["LODR-30"], note: "No material_event_disclosure fact stated (immaterial, not price-sensitive)." },
  { n: 46, group: "Reg 30 / material events", freeText: "A material development concerning an acquisition was the subject of a false announcement mischaracterizing the transaction's terms.", must: ["LODR-30"], note: "Material event + inaccurate disclosure (false announcement)." },
  { n: 47, group: "Reg 30 / material events", freeText: "A material development, a loan default, was not disclosed to the stock exchange as required.", must: ["LODR-30"], note: "Material event + non-disclosure." },
  { n: 48, group: "Reg 30 / material events", freeText: "A director's resignation was disclosed to the exchange within the prescribed timeline with full particulars.", mustNot: ["LODR-30"], note: "Compliant event disclosure." },
  { n: 49, group: "Reg 30 / material events", freeText: "An ordinary, non-material transaction was completed with the usual internal approvals.", mustNot: ["LODR-30"], note: "No material event at all." },
  { n: 50, group: "Reg 30 / material events", freeText: "No material event non-disclosure, delay or inaccuracy is alleged; disclosures to the exchanges were timely and complete throughout.", mustNot: ["LODR-30"], note: "Comprehensive negative control." },
  { n: 51, group: "Reg 30 / material events", freeText: "A material development concerning a regulatory action against the company withheld information from the exchanges.", must: ["LODR-30"], note: "Material event + withholding (non-disclosure synonym)." },
  { n: 52, group: "Reg 30 / material events", freeText: "The company's financial statements were misstated; separately and without connection, a wholly unrelated material acquisition was disclosed accurately and on time.", mustNot: ["LODR-30"], note: "Accurate, unconnected event disclosure -- the misstatement does not establish a Reg 30 failure." },
  { n: 53, group: "Reg 30 / material events", freeText: "A material development was disclosed to one set of investors before the exchanges and was not disclosed to the exchanges themselves, a selective-disclosure fact.", must: ["LODR-30"], note: "Selective disclosure is itself a Reg 30 disclosure-failure fact." },
  { n: 54, group: "Reg 30 / material events", freeText: "The company's false announcement mischaracterized a material event disclosed to the stock exchange.", must: ["LODR-30"], note: "False announcement of a material event." },
  { n: 55, group: "Reg 30 / material events", freeText: "A material corporate restructuring was accurately and completely disclosed to the exchanges the same day.", mustNot: ["LODR-30"], note: "Compliant, same-day disclosure." },

  // ===== 56-70: Governance =====
  { n: 56, group: "Governance", freeText: "The Audit Committee was not properly constituted, with meetings not conducted for the entire year.", must: ["LODR-18-3-schedule-II"], note: "Direct AC-deficiency fact." },
  { n: 57, group: "Governance", freeText: "The Audit Committee was properly constituted and met as required throughout the period.", mustNot: ["LODR-18-3-schedule-II"], note: "Compliant AC." },
  { n: 58, group: "Governance", freeText: "The Compliance Officer position was vacant for several months with no qualified replacement appointed.", must: ["LODR-6-gen"], note: "Direct Compliance Officer vacancy fact." },
  { n: 59, group: "Governance", freeText: "The Compliance Officer position was filled at all times by a duly qualified individual.", mustNot: ["LODR-6-gen"], note: "Compliant appointment." },
  { n: 60, group: "Governance", freeText: "The CEO/CFO compliance certificate was not duly signed for one quarter.", must: ["LODR-17-8"], note: "Direct false-certification-process fact." },
  { n: 61, group: "Governance", freeText: "The CEO/CFO compliance certificate was duly signed and submitted on time every quarter.", mustNot: ["LODR-17-8"], note: "Compliant certification." },
  { n: 62, group: "Governance", freeText: "A non-executive director failed to raise concerns despite being aware of irregularities discussed at a board meeting.", mustNot: ["LODR-18-3-schedule-II", "LODR-6-gen"], note: "Director's own governance failure does not itself establish an Audit Committee or Compliance Officer deficiency absent a stated connection to those specific roles." },
  { n: 63, group: "Governance", freeText: "The statutory auditor certified financial statements despite gross negligence in verifying the underlying figures, with no evidence of collusion.", mustNot: ["LODR-18-3-schedule-II"], note: "Auditor negligence, not an Audit Committee deficiency." },
  { n: 64, group: "Governance", freeText: "An independent director had no knowledge of, or involvement in, the underlying governance failure and voted against the relevant resolution.", mustNot: ["LODR-6-gen", "LODR-17-8"], note: "Independent director expressly uninvolved, no governance-specific fact of her own stated." },
  { n: 65, group: "Governance", freeText: "The Audit Committee's minutes could not be produced, and no meeting agendas existed for the relevant period.", must: ["LODR-18-3-schedule-II"], note: "Direct AC-process-deficiency fact." },
  { n: 66, group: "Governance", freeText: "No Audit Committee deficiency, Compliance Officer vacancy, or false certification is alleged; governance functioned as required throughout.", mustNot: ["LODR-18-3-schedule-II", "LODR-6-gen", "LODR-17-8"], note: "Comprehensive negative control." },
  { n: 67, group: "Governance", freeText: "There was an improper appointment of compliance officer, who lacked the qualifications required for the position.", must: ["LODR-6-gen"], note: "Improper appointment fact." },
  { n: 68, group: "Governance", freeText: "A false compliance certificate was signed by the CFO despite known non-compliance.", must: ["LODR-17-8"], note: "Direct false-certification fact." },
  { n: 69, group: "Governance", freeText: "The Board's own composition requirements were fully satisfied; a wholly unrelated Compliance Officer vacancy existed in a different quarter with no stated connection.", must: ["LODR-6-gen"], note: "The vacancy itself is a self-contained fact for LODR-6-gen regardless of the unrelated Board-composition compliance." },
  { n: 70, group: "Governance", freeText: "The Audit Committee met in general, but was an improperly constituted audit committee because its chairman was not an independent director as required by definition.", must: ["LODR-18-3-schedule-II"], note: "Direct AC-composition-adjacent deficiency in the same finding context." },

  // ===== 71-85: Investigation =====
  { n: 71, group: "Investigation", freeText: "SEBI investigated the company and the company fully cooperated, producing all requested documents.", mustNot: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "The prompt's own explicit worked example: full cooperation must not trigger the non-cooperation provisions." },
  { n: 72, group: "Investigation", freeText: "The company failed to produce records requested under a SEBI summons.", must: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "Direct non-cooperation fact." },
  { n: 73, group: "Investigation", freeText: "The company's records were genuinely unavailable due to a documented office fire, and this was promptly explained to SEBI.", mustNot: ["SEBI-ACT-11C-2"], note: "Non-production explained by genuine unavailability, not itself framed as non-cooperation in the entered facts (the officer should still examine SEBI's own skepticism in comparable precedents)." },
  { n: 74, group: "Investigation", freeText: "The company refused to hand over documents sought during the investigation.", must: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "Direct refusal fact." },
  { n: 75, group: "Investigation", freeText: "A witness attended a deposition and answered all questions on oath.", mustNot: ["SEBI-ACT-11C-2"], note: "Cooperative deposition attendance." },
  { n: 76, group: "Investigation", freeText: "During a SEBI investigation, the company failed to furnish complete documents requested.", must: ["SEBI-ACT-11C-2"], note: "Investigation context + failed-to-furnish (non-cooperation) fact." },
  { n: 77, group: "Investigation", freeText: "An investigation is under way; no allegation of non-cooperation, refusal or incomplete submission is made.", mustNot: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "Investigation context alone, no non-cooperation fact." },
  { n: 78, group: "Investigation", freeText: "Books and records were fully preserved and produced to the investigating authority on request.", mustNot: ["SEBI-ACT-11C-2"], note: "Compliant preservation/production." },
  { n: 79, group: "Investigation", freeText: "The company did not respond to summons issued during the investigation.", must: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "Direct non-response fact." },
  { n: 80, group: "Investigation", freeText: "SEBI exercised its power to call for information relevant to an ongoing investigation; the entity's own conduct is not otherwise characterized.", mustNot: ["SEBI-ACT-11C-2"], note: "SEBI's own power exercise, no entity non-cooperation fact stated." },
  { n: 81, group: "Investigation", freeText: "No investigation of any kind is alleged in this scenario.", mustNot: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "No investigation context at all." },
  { n: 82, group: "Investigation", freeText: "During the SEBI investigation, the company denied access to requested documents.", must: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "Denied access is a direct non-cooperation fact." },
  { n: 83, group: "Investigation", freeText: "The company cooperated fully with the investigation; separately and without connection, an unrelated financial misstatement was found.", mustNot: ["SEBI-ACT-11C-2"], note: "Cooperation disclaimed non-cooperation; the unconnected misstatement does not itself establish a records-production failure." },
  { n: 84, group: "Investigation", freeText: "The company gave a false reply to SEBI's investigation, misrepresenting the facts sought.", mustNot: ["SEBI-ACT-11C-2"], note: "A false reply is a different fact (misrepresentation) from a stated failure to produce/preserve records; this corpus's non_cooperation_with_investigation tag does not capture a false-but-complete reply, a disclosed vocabulary gap." },
  { n: 85, group: "Investigation", freeText: "The company withheld documents specifically sought by the investigating authority.", must: ["SEBI-ACT-11C-2", "SEBI-ACT-11C-3"], note: "Direct withholding fact." },

  // ===== 86-100: Preferential allotment / ICDR =====
  { n: 86, group: "Preferential allotment/ICDR", freeText: "A preferential allotment of shares was made to a promoter entity, fully paid up, with all consideration genuinely received.", must: ["ICDR-158-CH-V"], mustNot: ["ICDR-160"], note: "Compliant allotment -- the applicability provision (158) is relevant, the non-payment provision (160) is not." },
  { n: 87, group: "Preferential allotment/ICDR", freeText: "A preferential allotment was made without genuine consideration being received.", must: ["ICDR-160"], note: "Direct non-payment fact." },
  { n: 88, group: "Preferential allotment/ICDR", freeText: "A preferential allotment's lock-in period was circumvented through an off-market transfer.", must: ["ICDR-167"], note: "Lock-in circumvention is part of the preferential_allotment tag's own synonym set (a disclosed vocabulary limitation, see docs)." },
  { n: 89, group: "Preferential allotment/ICDR", freeText: "No preferential allotment, lock-in issue, or sham consideration is alleged in this scenario.", mustNot: ["ICDR-158-CH-V", "ICDR-160", "ICDR-167"], note: "Comprehensive negative control." },
  { n: 90, group: "Preferential allotment/ICDR", freeText: "A preferential allotment of shares was made to a non-promoter entity, with fabricated bank statements produced as proof of payment.", must: ["ICDR-160"], note: "Fabricated bank statements is a sham-consideration synonym, connected to the allotment fact." },
  { n: 91, group: "Preferential allotment/ICDR", freeText: "An unrelated accounting problem existed at the company; no preferential allotment of any kind is alleged.", mustNot: ["ICDR-158-CH-V", "ICDR-160", "ICDR-167"], note: "No allotment fact at all." },
  { n: 92, group: "Preferential allotment/ICDR", freeText: "A promoter allottee received shares under a preferential issue in exchange for a genuine, verified loan conversion.", must: ["ICDR-158-CH-V"], mustNot: ["ICDR-160"], note: "Genuine loan-conversion exemption scenario, ICDR-158's own subject; no sham-consideration fact." },
  { n: 93, group: "Preferential allotment/ICDR", freeText: "A non-promoter allottee received preferential shares in an allotment without payment of the application money.", must: ["ICDR-160"], note: "Direct non-payment fact, non-promoter allottee." },
  { n: 94, group: "Preferential allotment/ICDR", freeText: "A sham preferential allotment financed circularly through the company's own funds was identified.", must: ["ICDR-160"], note: "Circular financing of the allotment is a sham-consideration fact." },
  { n: 95, group: "Preferential allotment/ICDR", freeText: "A preferential allotment's pricing was correctly determined per the applicable formula, with no other irregularity.", must: ["ICDR-158-CH-V"], mustNot: ["ICDR-160"], note: "Compliant pricing, no sham-consideration fact." },
  { n: 96, group: "Preferential allotment/ICDR", freeText: "A preferential issue of warrants allotted to a promoter entity was later converted, with full and genuine consideration paid at each stage.", must: ["ICDR-158-CH-V"], mustNot: ["ICDR-160"], note: "Compliant warrant allotment." },
  { n: 97, group: "Preferential allotment/ICDR", freeText: "A preferential allotment occurred; secondary-market trading by the allottees is not alleged at all.", must: ["ICDR-158-CH-V"], note: "The allotment fact itself is the trigger; absence of secondary trading does not defeat it." },
  { n: 98, group: "Preferential allotment/ICDR", freeText: "No genuine change in beneficial ownership occurred following a preferential allotment structured to appear as a real transfer.", must: ["ICDR-158-CH-V"], note: "Allotment fact present." },
  { n: 99, group: "Preferential allotment/ICDR", freeText: "A preferential allotment's shares without consideration were allotted to a promoter entity.", must: ["ICDR-160"], note: "Direct no-consideration fact." },
  { n: 100, group: "Preferential allotment/ICDR", freeText: "A rights issue (not a preferential allotment) was made to all shareholders pro rata.", mustNot: ["ICDR-158-CH-V", "ICDR-160", "ICDR-167"], note: "Rights issue is a different transaction type from preferential allotment." },

  // ===== 101-115: Issue proceeds =====
  { n: 101, group: "Issue proceeds", freeText: "Rights issue proceeds were genuinely and correctly utilised for the disclosed objects.", must: ["LODR-32"], mustNot: ["LODR-48"], note: "Genuine issue-proceeds context triggers the monitoring provision; no misstatement fact, so 48 stays excluded." },
  { n: 102, group: "Issue proceeds", freeText: "Rights issue proceeds were diverted to a promoter-controlled entity instead of the disclosed objects.", must: ["LODR-32"], note: "Diversion connected to issue-proceeds context." },
  { n: 103, group: "Issue proceeds", freeText: "IPO proceeds were temporarily parked in a fixed deposit pending utilisation, as disclosed in the offer document.", must: ["LODR-32"], note: "Disclosed temporary parking, issue-proceeds context present." },
  { n: 104, group: "Issue proceeds", freeText: "A deviation in the use of issue proceeds was disclosed to the exchanges as required.", must: ["LODR-32"], note: "Disclosed deviation, issue-proceeds context." },
  { n: 105, group: "Issue proceeds", freeText: "A deviation in the use of issue proceeds was not disclosed to the exchanges.", must: ["LODR-32"], note: "Undisclosed deviation, issue-proceeds context." },
  { n: 106, group: "Issue proceeds", freeText: "A false utilisation certificate for issue proceeds was submitted, misstating how the funds were used.", must: ["LODR-32"], note: "False utilisation certificate, issue-proceeds context." },
  { n: 107, group: "Issue proceeds", freeText: "No monitoring agency report was filed for the issue proceeds as required.", must: ["LODR-32"], note: "Issue-proceeds context present." },
  { n: 108, group: "Issue proceeds", freeText: "An ordinary bank loan (not connected to any securities issue) was diverted to a promoter-controlled entity.", mustNot: ["LODR-32"], note: "Bank-loan diversion, no issue-proceeds fact -- the prompt's own worked example." },
  { n: 109, group: "Issue proceeds", freeText: "IPO proceeds were diverted, and the diversion was concealed through a misstated financial statement submitted to investors.", must: ["LODR-32", "LODR-48"], note: "Issue-proceeds diversion connected to a misstatement fact, satisfying both 32 and 48." },
  { n: 110, group: "Issue proceeds", freeText: "No issue proceeds of any kind are alleged in this scenario; only an ordinary vendor payment is described.", mustNot: ["LODR-32"], note: "No rights_issue/IPO fact at all." },
  { n: 111, group: "Issue proceeds", freeText: "Public issue proceeds were raised and applied exactly as disclosed, with independent verification by the monitoring agency.", must: ["LODR-32"], mustNot: ["LODR-48"], note: "Compliant issue-proceeds use." },
  { n: 112, group: "Issue proceeds", freeText: "Rights issue proceeds were used for working capital, a disclosed object, with no deviation.", must: ["LODR-32"], note: "Compliant, disclosed use." },
  { n: 113, group: "Issue proceeds", freeText: "A public issue's proceeds were partially diverted to a director's personal account.", must: ["LODR-32"], note: "Diversion connected to issue-proceeds context." },
  { n: 114, group: "Issue proceeds", freeText: "IPO proceeds utilisation was correctly monitored and reported quarterly as required, with no deviation of any kind.", must: ["LODR-32"], note: "Compliant monitoring." },
  { n: 115, group: "Issue proceeds", freeText: "Preferential allotment proceeds were used for undisclosed purposes by the promoter entity that received them.", mustNot: ["LODR-32"], note: "Preferential allotment is a different transaction type from rights_issue/IPO proceeds in this corpus's vocabulary." },

  // ===== 116-130: Ind AS / Companies Act =====
  { n: 116, group: "Ind AS/Companies Act", freeText: "The consolidated financial statements contained a misstatement because a subsidiary was wrongly excluded despite the company having control over it.", must: ["IND-AS-110"], note: "Consolidation channel connected to a stated misstatement." },
  { n: 117, group: "Ind AS/Companies Act", freeText: "A subsidiary was correctly included in the consolidated financial statements per the applicable control test, with no misstatement of any kind.", mustNot: ["IND-AS-110"], note: "Compliant consolidation, no violation-conduct fact." },
  { n: 118, group: "Ind AS/Companies Act", freeText: "A standalone accounting error occurred in an unrelated expense classification, with no consolidation issue alleged.", mustNot: ["IND-AS-110"], note: "Standalone error unconnected to consolidation." },
  { n: 119, group: "Ind AS/Companies Act", freeText: "Revenue recognition occurred before the underlying performance obligation was satisfied.", must: ["IND-AS-115"], note: "Direct revenue-recognition fact." },
  { n: 120, group: "Ind AS/Companies Act", freeText: "A fictitious asset was recorded; the same historical matter also had fictitious sales, but no separate revenue-recognition fact is stated here.", mustNot: ["IND-AS-115"], note: "The prompt's own worked example: a fictitious ASSET fact does not itself trigger revenue-recognition standards." },
  { n: 121, group: "Ind AS/Companies Act", freeText: "The carrying value of investment was not written down despite a documented, sustained decline, an investment valuation issue.", must: ["IND-AS-32", "IND-AS-109"], note: "Investment-valuation fact connected to financial instruments." },
  { n: 122, group: "Ind AS/Companies Act", freeText: "An investment's value was correctly assessed and no write-down was required.", mustNot: ["IND-AS-32", "IND-AS-109"], note: "Compliant valuation." },
  { n: 123, group: "Ind AS/Companies Act", freeText: "Trade receivables exist on the balance sheet with no valuation or expected-credit-loss issue stated.", mustNot: ["IND-AS-109"], note: "Bare presence of receivables, no investment-valuation fact." },
  { n: 124, group: "Ind AS/Companies Act", freeText: "An investment valuation issue arose because the expected credit loss on trade receivables was not recognized despite a documented deterioration in recoverability.", must: ["IND-AS-109"], note: "Investment-valuation fact present." },
  { n: 125, group: "Ind AS/Companies Act", freeText: "Consolidated financial statements were not disclosed to shareholders as required under the Companies Act provision on publication; the finding itself was a SEBI regulatory determination, not a Companies Act adjudication.", must: ["COMPANIES-ACT-136"], note: "Companies Act provision surfaced distinctly, per its own instrument label; SEBI did not itself adjudicate a Companies Act offence merely by citing it." },
  { n: 126, group: "Ind AS/Companies Act", freeText: "Consolidated financial statements were not disclosed to shareholders as required under the Companies Act provision on publication.", must: ["COMPANIES-ACT-136"], note: "Direct non-disclosure fact." },
  { n: 127, group: "Ind AS/Companies Act", freeText: "The presentation of financial statements followed all applicable Ind AS 1 requirements with no misstatement.", mustNot: ["IND-AS-1"], note: "Compliant presentation." },
  { n: 128, group: "Ind AS/Companies Act", freeText: "The financial statements' current/non-current classification was misstated, an Ind AS 1 presentation misstatement.", must: ["IND-AS-1"], note: "Direct presentation misstatement." },
  { n: 129, group: "Ind AS/Companies Act", freeText: "No consolidation, revenue-recognition, or financial-instrument-valuation issue is alleged in this scenario.", mustNot: ["IND-AS-110", "IND-AS-115", "IND-AS-32", "IND-AS-109"], note: "Comprehensive negative control." },
  { n: 130, group: "Ind AS/Companies Act", freeText: "Revenue was recognized in accordance with the contract's performance obligations, with independent verification.", mustNot: ["IND-AS-115"], note: "Compliant revenue recognition." },

  // ===== 131-160: Adversarial mixed =====
  { n: 131, group: "Adversarial mixed", freeText: "A related-party transaction was undisclosed. In a completely unrelated development, the company's Compliance Officer position was vacant for that same quarter.", must: ["LODR-23-2", "LODR-6-gen"], note: "Each fact is independently self-contained for its own single-group-adjacent gate; the two need not be connected to each other since neither gate requires connection to the OTHER family." },
  { n: 132, group: "Adversarial mixed", freeText: "The company published fictitious sales figures in its financial statements. In an unrelated matter, a material event was accurately and timely disclosed.", must: ["LODR-48"], mustNot: ["LODR-30"], note: "Financial-statement fraud satisfies 48; the accurate, unconnected event disclosure does not trigger 30." },
  { n: 133, group: "Adversarial mixed", freeText: "Correct, fully compliant financial results were filed on time. Separately, the Audit Committee meetings were not conducted for the entire year.", mustNot: ["LODR-33-1-gen", "LODR-48"], must: ["LODR-18-3-schedule-II"], note: "Compliant results stay excluded from 33/48; the genuine AC lapse still surfaces on its own." },
  { n: 134, group: "Adversarial mixed", freeText: "Issue proceeds were used exactly as disclosed. In a wholly separate finding, an unrelated investment valuation failure under Ind AS 109 occurred.", must: ["LODR-32", "IND-AS-109"], note: "Both self-contained facts independently satisfy their own single-group gates." },
  { n: 135, group: "Adversarial mixed", freeText: "A director was negligent in failing to review the accounts. No fund-diversion or other fact connecting that negligence to Section 27's liability-attribution mechanism is stated.", mustNot: ["SEBI-ACT-27"], note: "Director negligence alone (director_governance_failure) is not itself the substantive-violation-plus-actor pairing Section 27 requires without a further connected violation." },
  { n: 136, group: "Adversarial mixed", freeText: "The company diverted funds, and the Managing Director who authorised the diversion is named as a noticee.", must: ["SEBI-ACT-27"], note: "Violation fact connected to a named person-in-charge actor, same sentence." },
  { n: 137, group: "Adversarial mixed", freeText: "The company is liable for a governance lapse. The independent director had no role in, or knowledge of, that lapse.", mustNot: ["SEBI-ACT-27"], note: "Company-level liability does not mechanically extend Section 27 to an expressly uninvolved individual absent a stated connecting fact for that individual." },
  { n: 138, group: "Adversarial mixed", freeText: "An annual-report disclosure lapse was confirmed. A wholly separate, unconnected preferential allotment was fully compliant.", must: ["LODR-34-3"], mustNot: ["ICDR-160"], note: "Compliant allotment stays excluded; the genuine annual-report lapse surfaces." },
  { n: 139, group: "Adversarial mixed", freeText: "The company fully cooperated with SEBI's investigation. Separately, an unconnected misstatement in the financial statements was found in the same order.", mustNot: ["SEBI-ACT-11C-2"], must: ["LODR-48"], note: "Cooperation excludes the non-cooperation provisions; the misstatement still satisfies 48 on its own facts." },
  { n: 140, group: "Adversarial mixed", freeText: "A preferential allotment was made as a sham allotment without genuine consideration. No trading in the secondary market is alleged.", must: ["ICDR-160"], note: "Self-contained sham-allotment fact, not defeated by the absence of secondary trading." },
  { n: 141, group: "Adversarial mixed", freeText: "The company's website correctly published its subsidiary financial statements. A wholly unrelated consolidation error existed in an internal working paper never published.", mustNot: ["LODR-46-2-s"], note: "Compliant publication; the unpublished internal error is not itself a website-publication failure." },
  { n: 142, group: "Adversarial mixed", freeText: "A material event was disclosed to the stock exchange only following a delayed disclosure past the prescribed timeline, with the underlying content itself later confirmed accurate.", must: ["LODR-30"], note: "Delay itself is a Reg 30 disclosure-lapse fact, even where the ultimate content was accurate." },
  { n: 143, group: "Adversarial mixed", freeText: "An interim order recorded a prima facie Section 27 liability view against a director. The final order found no substantive violation was ever connected to that director specifically.", mustNot: ["SEBI-ACT-27"], note: "A stale interim characterization, per the prompt's own principle, must not resurrect the liability-attribution provision absent a final, connected fact." },
  { n: 144, group: "Adversarial mixed", freeText: "Fictitious sales were recorded in internal management accounts never published or reported to any regulator or investor.", mustNot: ["LODR-48", "LODR-30"], note: "Unpublished, internal-only fictitious accounting -- no financial-results channel or material-event-disclosure fact reaches any external audience." },
  { n: 145, group: "Adversarial mixed", freeText: "A related-party transaction was undisclosed, and the same transaction diverted issue proceeds to the related party.", must: ["LODR-23-2", "LODR-32"], note: "Two genuinely connected facts, each independently self-contained for its own gate." },
  { n: 146, group: "Adversarial mixed", freeText: "Ordinary, fully disclosed and approved related-party transactions, compliant financial results, a properly constituted Audit Committee, a filled Compliance Officer position, full investigation cooperation, a compliant preferential allotment, correctly monitored issue proceeds, and accurate consolidated financial statements are all that this scenario describes.", mustNot: ["LODR-23-2", "LODR-23-4", "LODR-30", "LODR-33-1-gen", "LODR-48", "LODR-18-3-schedule-II", "LODR-6-gen", "SEBI-ACT-11C-2", "ICDR-160", "IND-AS-110"], note: "Comprehensive negative control across every family gated in this pass." },
  { n: 147, group: "Adversarial mixed", freeText: "The statutory auditor's negligent audit failed to detect a misstatement the company itself made in its financial statements.", must: ["LODR-48"], note: "Misstatement fact present regardless of whether the auditor or the company is the primary actor." },
  { n: 148, group: "Adversarial mixed", freeText: "The CFO was involved in preparing financial statements later found to contain a misstatement. The CFO played no role in, and had no knowledge of, any related-party transaction.", must: ["LODR-48"], mustNot: ["LODR-23-2"], note: "The misstatement fact satisfies 48; the CFO's disclaimed RPT involvement correctly keeps 23(2) from surfacing on THIS actor's facts." },
  { n: 149, group: "Adversarial mixed", freeText: "A promoter personally diverted funds during the relevant period. The promoter had no role in, and no knowledge of, the preparation of the company's financial statements.", must: ["SEBI-ACT-27"], mustNot: ["LODR-48"], note: "Diversion connected to the promoter satisfies Section 27; no misstatement fact is connected to this actor, so 48 stays excluded." },
  { n: 150, group: "Adversarial mixed", freeText: "The allegation of a related-party approval lapse against the company was expressly rejected by the final order. A separate Compliance Officer vacancy was confirmed in the same order.", must: ["LODR-6-gen"], mustNot: ["LODR-23-2"], note: "Note: this suite's synthetic corpus does not model negated-allegation findings directly; the freeText itself negates the RPT lapse ('expressly rejected'), so the negation-aware concept extractor should not detect an RPT_PROCESS_LAPSE fact from it." },
  { n: 151, group: "Adversarial mixed", freeText: "A material event was correctly and timely disclosed. The company's shares nonetheless experienced heavy trading the same week on ordinary market interest.", mustNot: ["LODR-30"], note: "The event was disclosed correctly and timely -- heavy trading afterward, alone, is not itself a Reg 30 disclosure-failure fact, mirroring the PFUTP suite's 'price rise after disclosure is not manipulation proof' principle." },
  { n: 152, group: "Adversarial mixed", freeText: "Issue proceeds were diverted through a chain of shell entities, with no related-party, financial-results, or governance fact alleged.", must: ["LODR-32"], note: "Layered diversion, still connected to the issue-proceeds context." },
  { n: 153, group: "Adversarial mixed", freeText: "A preferential allotment was compliant in every respect. The same order separately confirmed an unconnected material-event non-disclosure regarding a different matter.", must: ["LODR-30"], mustNot: ["ICDR-160"], note: "Compliant allotment stays excluded; the genuine, separate event-disclosure failure surfaces." },
  { n: 154, group: "Adversarial mixed", freeText: "The company's Audit Committee reviewed and approved the related-party transaction. In a wholly separate matter, that same committee's meetings were not conducted for an unrelated quarterly review.", must: ["LODR-18-3-schedule-II"], mustNot: ["LODR-23-2"], note: "The RPT was genuinely approved (excludes 23(2)); the separate AC non-convening is its own governance fact." },
  { n: 155, group: "Adversarial mixed", freeText: "A statutory auditor was found to have colluded with management to certify a misstatement in the financial results that was then published in the annual report.", must: ["LODR-48", "LODR-34-3"], note: "Misstatement connected to both the financial-results channel and the annual-report channel in one scheme." },
  { n: 156, group: "Adversarial mixed", freeText: "No SEBI investigation, no related-party transaction, no preferential allotment and no issue proceeds are alleged; only an ordinary, fully compliant annual report is described.", mustNot: ["SEBI-ACT-11C-2", "LODR-23-2", "ICDR-160", "LODR-32"], note: "Comprehensive negative control." },
  { n: 157, group: "Adversarial mixed", freeText: "A company's PFUTP fraud finding was confirmed. A wholly separate, unconnected Compliance Officer vacancy existed at a different time with no stated relationship to the fraud.", must: ["LODR-6-gen"], note: "The vacancy is self-contained for its own gate regardless of the unconnected fraud finding elsewhere." },
  { n: 158, group: "Adversarial mixed", freeText: "Wash trading by connected accounts was identified in the stock. The company's Audit Committee, entirely unconnected, was properly constituted and met as required.", mustNot: ["LODR-18-3-schedule-II"], note: "Compliant AC stays excluded even though a serious, unrelated PFUTP-family fact exists elsewhere in the scenario." },
  { n: 159, group: "Adversarial mixed", freeText: "A related-party transaction was undisclosed, and separately the same order confirmed a Section 11C(3) non-cooperation finding against an unconnected witness.", must: ["LODR-23-2", "SEBI-ACT-11C-3"], note: "Two independently self-contained facts." },
  { n: 160, group: "Adversarial mixed", freeText: "Every family this pass gates is described as fully compliant and every governance, disclosure, investigation-cooperation, and accounting obligation was satisfied, with no violation of any kind alleged anywhere in the scenario.", mustNot: ["LODR-23-2", "LODR-23-4", "LODR-30", "LODR-33-1-gen", "LODR-33-1-a", "LODR-48", "LODR-34-3", "LODR-46-2-s", "LODR-4-1", "LODR-4-2-e-i", "LODR-18-3-schedule-II", "LODR-6-gen", "LODR-17-8", "SEBI-ACT-11C-2", "SEBI-ACT-11C-3", "SEBI-ACT-27", "ICDR-160", "IND-AS-1", "IND-AS-32", "IND-AS-109", "IND-AS-110", "IND-AS-115"], note: "Final comprehensive negative control across every gated provision in this pass." },
];

describe("Non-PFUTP provision-precision remediation: independent blind validation suite", () => {
  it("sanity: at least 150 independently-authored scenarios, spanning 9 groups", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(SCENARIOS.map((s) => s.group)).size).toBeGreaterThanOrEqual(9);
  });

  for (const s of SCENARIOS) {
    it(`#${s.n} [${s.group}] ${s.note}`, () => {
      const result = analyzeScenario({ freeText: s.freeText }, ALL_FINDINGS, ALL_PROVISIONS, []);
      const returnedIds = result.provisionResults.map((p) => p.provision.id);
      if (s.must) for (const id of s.must) expect(returnedIds).toContain(id);
      if (s.mustNot) for (const id of s.mustNot) expect(returnedIds).not.toContain(id);
    });
  }
});
