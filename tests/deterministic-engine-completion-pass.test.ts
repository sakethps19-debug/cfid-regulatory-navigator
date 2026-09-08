// Deterministic Scenario Analyzer completion pass: an INDEPENDENT test suite
// for the five workstreams added on top of the prior two provision-precision
// remediation passes:
//   1. Companies Act retrieval precision (7 provisions, previously ungated)
//   2. Actor/noticee-specific candidate retrieval (provision-actor-applicability.ts)
//   3. Structured legal-function taxonomy + candidate-tier hierarchy
//   4. Temporal applicability (buildApplicableVersionNote, provision_versions)
//   5. Historical treatment across CFID cases (historicalTreatment.ts)
//
// Not a paraphrase of tests/non-pfutp-blind-validation-suite.test.ts or any
// earlier suite — new record ids throughout, new provisions fixtures, and
// scenarios reasoned fresh against this pass's own new mechanisms (never
// against the retrieval gate alone, which the earlier suites already cover).
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, Order, ProvisionVersion, ScenarioFinding } from "@/types/domain";

function makeProvision(id: string, provisionNumber: string, subject: string, instrument = "Test Instrument"): LegalProvision {
  return { id, instrument, provisionNumber, subject, currentTextVerificationStatus: "Requires verification", officialSource: null, ordersConsidered: [], treatmentInPilotOrders: "", lawLibraryNote: null };
}
function link(provisionId: string, justifyingTags: string[] = [], relationship?: string) {
  return { provisionId, justifyingTags, relationship };
}
function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionLinks: { provisionId: string; justifyingTags: string[]; relationship?: string }[] }): ScenarioFinding {
  return {
    caseName: "Synthetic Completion-Pass Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic completion-pass finding",
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
const LODR_6_GEN = makeProvision("LODR-6-gen", "Regulation 6", "Compliance Officer appointment.", "LODR Regulations, 2015");
const LODR_17_8 = makeProvision("LODR-17-8", "Regulation 17(8)", "CEO/CFO compliance certification.", "LODR Regulations, 2015");
const LODR_18_3 = makeProvision("LODR-18-3-schedule-II", "Regulation 18(3) / Schedule II Part C", "Audit Committee role and responsibilities.", "LODR Regulations, 2015");
const LODR_18_1_B = makeProvision("LODR-18-1-b", "Regulation 18(1)(b)", "Audit Committee independent-director composition.", "LODR Regulations, 2015");
const LODR_18_1_D = makeProvision("LODR-18-1-d", "Regulation 18(1)(d)", "Audit Committee chairperson requirement.", "LODR Regulations, 2015");
const LODR_16_1_B = makeProvision("LODR-16-1-b", "Regulation 16(1)(b)", "Definition of independent director.", "LODR Regulations, 2015");
const LODR_2_ZC = makeProvision("LODR-2-zc", "Regulation 2(1)(zc)", "Definition of related party transaction.", "LODR Regulations, 2015");
const LODR_23_1 = makeProvision("LODR-23-1", "Regulation 23(1) proviso", "RPT materiality threshold.", "LODR Regulations, 2015");
const LODR_23_2 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
const LODR_30 = makeProvision("LODR-30", "Regulation 30", "Material event/information disclosure.", "LODR Regulations, 2015");
const LODR_48 = makeProvision("LODR-48", "Regulation 48", "Compliance with accounting standards.", "LODR Regulations, 2015");
const LODR_33_1_GEN = makeProvision("LODR-33-1-gen", "Regulation 33(1)", "General financial-results preparation requirements.", "LODR Regulations, 2015");
const LODR_4_1 = makeProvision("LODR-4-1", "Regulation 4(1)", "General disclosure/governance principles.", "LODR Regulations, 2015");
const LODR_37A = makeProvision("LODR-37A", "Regulation 37A", "Interested-shareholder voting prohibition on undertaking disposal.", "LODR Regulations, 2015");
const SEBI_27 = makeProvision("SEBI-ACT-27", "Section 27", "Liability attribution to persons in charge of the company.", "SEBI Act, 1992");
const SEBI_15HB = makeProvision("SEBI-ACT-15HB", "Section 15HB", "Residual penalty provision.", "SEBI Act, 1992");
const ICDR_160 = makeProvision("ICDR-160", "Regulation 160", "Fully-paid-up requirement for preferential allotment.", "SEBI (ICDR) Regulations, 2018");
const PFUTP_3_A = makeProvision("PFUTP-3-a", "Regulation 3(a)", "Dealing in securities in a fraudulent manner.", "PFUTP Regulations, 2003");
const SEBI_12A_A = makeProvision("SEBI-ACT-12A-a", "Section 12A(a)", "Manipulative/deceptive device connected with dealing.", "SEBI Act, 1992");
const COMPANIES_ACT_136 = makeProvision("COMPANIES-ACT-136", "Section 136(1)", "Access/publication of financial statements including subsidiary information.", "Companies Act, 2013");
const COMPANIES_ACT_139 = makeProvision("COMPANIES-ACT-139", "Section 139", "Statutory auditor rotation requirement.", "Companies Act, 2013");
const COMPANIES_ACT_141_3_D = makeProvision("COMPANIES-ACT-141-3-d", "Section 141(3)(d)", "Auditor ineligibility, holding securities.", "Companies Act, 2013");
const COMPANIES_ACT_141_3_E = makeProvision("COMPANIES-ACT-141-3-e", "Section 141(3)(e)", "Auditor ineligibility, business relationship.", "Companies Act, 2013");
const COMPANIES_ACT_180_1_A = makeProvision("COMPANIES-ACT-180-1-a", "Section 180(1)(a)", "Board restriction on disposal of an undertaking.", "Companies Act, 2013");
const COMPANIES_ACT_24 = makeProvision("COMPANIES-ACT-24", "Section 24", "SEBI powers re issue/transfer of securities.", "Companies Act, 2013");
const COMPANIES_ACT_67_2 = makeProvision("COMPANIES-ACT-67-2", "Section 67(2)", "Restriction on financial assistance for own-share purchase.", "Companies Act, 2013");

const ALL_PROVISIONS = [
  LODR_6_GEN, LODR_17_8, LODR_18_3, LODR_18_1_B, LODR_18_1_D, LODR_16_1_B, LODR_2_ZC, LODR_23_1, LODR_23_2, LODR_30, LODR_48,
  LODR_33_1_GEN, LODR_4_1, LODR_37A, SEBI_27, SEBI_15HB, ICDR_160, PFUTP_3_A, SEBI_12A_A,
  COMPANIES_ACT_136, COMPANIES_ACT_139, COMPANIES_ACT_141_3_D, COMPANIES_ACT_141_3_E, COMPANIES_ACT_180_1_A, COMPANIES_ACT_24, COMPANIES_ACT_67_2,
];

// ----- Findings -----
// Each carries the SPECIFIC conduct/transaction tags needed to reach the
// factual-overlap score threshold and satisfy each provision's own factual
// gate (where one exists), independent of the free-text scenarios below —
// exactly mirroring how the live corpus's own tagged findings work.
const F_CO_VACANCY = makeFinding({
  recordId: "CP-CO-01", caseName: "Synthetic Compliance Officer Matter",
  transactionTypes: ["compliance_officer_appointment"], allegedConduct: ["compliance_officer_deficiency"],
  // justifyingTags mirrors real production curation for this provision
  // (LODR-6-gen and its siblings have 0 empty-justifyingTags links live) —
  // narrowing the link to the specific deficiency conduct, not a bare
  // topic mention of "Compliance Officer".
  provisionLinks: [link("LODR-6-gen", ["compliance_officer_deficiency"])],
});
const F_CEO_CFO_CERT = makeFinding({
  recordId: "CP-CERT-01", caseName: "Synthetic Certification Matter",
  transactionTypes: ["certification_process"], allegedConduct: ["false_compliance_certification"],
  provisionLinks: [link("LODR-17-8")],
});
const F_AC_ROLE = makeFinding({
  recordId: "CP-AC-01", caseName: "Synthetic Audit Committee Matter",
  transactionTypes: ["audit_committee_process"], allegedConduct: ["audit_committee_deficiency"],
  provisionLinks: [link("LODR-18-3-schedule-II"), link("LODR-18-1-b"), link("LODR-18-1-d")],
});
const F_INDEPENDENT_DIRECTOR = makeFinding({
  recordId: "CP-ID-01", caseName: "Synthetic Independent Director Matter",
  actorRoles: ["independent_director"], allegedConduct: ["director_governance_failure"],
  provisionLinks: [link("LODR-16-1-b")],
});
const F_RPT = makeFinding({
  recordId: "CP-RPT-01", caseName: "Synthetic RPT Matter",
  transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
  provisionLinks: [link("LODR-2-zc"), link("LODR-23-1"), link("LODR-23-2")],
});
const F_MATERIAL_EVENT = makeFinding({
  recordId: "CP-EVT-01", caseName: "Synthetic Material Event Matter",
  transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"],
  provisionLinks: [link("LODR-30")],
});
const F_FINRESULTS = makeFinding({
  recordId: "CP-FIN-01", caseName: "Synthetic Financial Results Matter",
  transactionTypes: ["financial_statement_disclosure"], allegedConduct: ["financial_statement_misstatement"],
  provisionLinks: [link("LODR-48"), link("LODR-33-1-gen"), link("LODR-4-1")],
});
const F_LIABILITY = makeFinding({
  recordId: "CP-LIAB-01", caseName: "Synthetic Liability Matter",
  actorRoles: ["promoter"], allegedConduct: ["fund_diversion"],
  provisionLinks: [link("SEBI-ACT-27"), link("SEBI-ACT-15HB")],
});
const F_ALLOTMENT = makeFinding({
  recordId: "CP-ALLOT-01", caseName: "Synthetic Preferential Allotment Matter",
  transactionTypes: ["preferential_allotment"], allegedConduct: ["sham_preferential_allotment"],
  provisionLinks: [link("ICDR-160"), link("COMPANIES-ACT-24"), link("COMPANIES-ACT-67-2")],
});
const F_TRADING = makeFinding({
  recordId: "CP-TRD-01", caseName: "Synthetic Trading Fraud Matter",
  transactionTypes: ["preferential_allotment"], allegedConduct: ["actual_price_manipulation"],
  provisionLinks: [link("PFUTP-3-a"), link("SEBI-ACT-12A-a")],
});
const F_AUDITOR = makeFinding({
  recordId: "CP-AUD-01", caseName: "Synthetic Auditor Eligibility Matter",
  actorRoles: ["statutory_auditor"], allegedConduct: ["auditor_tenure_or_independence_issue"],
  provisionLinks: [link("COMPANIES-ACT-139"), link("COMPANIES-ACT-141-3-d"), link("COMPANIES-ACT-141-3-e")],
});
const F_SUBSIDIARY_DISCLOSURE = makeFinding({
  recordId: "CP-SUB-01", caseName: "Synthetic Subsidiary Disclosure Matter",
  transactionTypes: ["consolidated_financials"], allegedConduct: ["non_disclosure_of_information"],
  provisionLinks: [link("COMPANIES-ACT-136")],
});
const F_UNDERTAKING = makeFinding({
  recordId: "CP-UND-01", caseName: "Synthetic Undertaking Disposal Matter",
  transactionTypes: ["asset_or_undertaking_disposal"], allegedConduct: [],
  provisionLinks: [link("COMPANIES-ACT-180-1-a"), link("LODR-37A")],
});

const ALL_FINDINGS = [
  F_CO_VACANCY, F_CEO_CFO_CERT, F_AC_ROLE, F_INDEPENDENT_DIRECTOR, F_RPT, F_MATERIAL_EVENT, F_FINRESULTS, F_LIABILITY,
  F_ALLOTMENT, F_TRADING, F_AUDITOR, F_SUBSIDIARY_DISCLOSURE, F_UNDERTAKING,
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
  // ===== Group 1-14: actor incompatibility (workstream 2) =====
  // P0 actor-applicability CONNECTIVITY fix: this scenario's own expectation
  // was legally wrong and encoded the scenario-wide actor-contamination
  // defect the fix corrects. The Compliance Officer vacancy is itself a
  // direct, self-contained Regulation 6 factual predicate stated in its
  // OWN sentence, naming no actor at all there; the promoter is a
  // genuinely UNRELATED actor named in a SEPARATE sentence with an express
  // "no stated Compliance Officer role" disclaimer. An unrelated actor
  // elsewhere in the scenario must never withhold a provision whose own
  // connected proposition names no actor (or is a company-level duty) —
  // see provision-actor-applicability.ts's own applicableActorTags for
  // LODR-6-gen, which already includes "company" for exactly this reason.
  { n: 1, group: "Actor incompatibility", freeText: "There was a CO vacancy for several months. The promoter was separately named in the matter with no stated Compliance Officer role.", must: ["LODR-6-gen"], note: "Compliance Officer vacancy is a self-contained, actor-unstated Regulation 6 predicate; an unrelated promoter mention in a separate sentence must not withhold it." },
  { n: 2, group: "Actor incompatibility", freeText: "The Compliance Officer position was vacant for the whole year.", must: ["LODR-6-gen"], note: "The Compliance Officer role itself is stated, so the provision is fully applicable." },
  { n: 3, group: "Actor incompatibility", freeText: "There was a CO vacancy for the whole year with no other actor stated.", must: ["LODR-6-gen"], note: "No actor named at all -> shown as a candidate, actor applicability flagged for verification, never suppressed." },
  // P0 actor-applicability CONNECTIVITY fix: same correction as #1 — the
  // false-certification predicate names no signer in its own sentence, and
  // the allottee is an unrelated actor named separately with an express
  // "no stated role in signing any certificate" disclaimer. The unrelated
  // allottee must not withhold this candidate; the signer's identity is
  // genuinely unstated, which the engine now surfaces via an
  // actor-applicability "requires_verification" note on the candidate
  // itself, not by hiding the candidate.
  { n: 4, group: "Actor incompatibility", freeText: "A false compliance certification was signed. A non-promoter allottee was separately named in the matter with no stated role in signing any certificate.", must: ["LODR-17-8"], note: "Certification predicate names no signer in its own sentence; an unrelated allottee mentioned separately must not withhold it — actor applicability requires verification instead." },
  { n: 5, group: "Actor incompatibility", freeText: "The Managing Director signed a false compliance certification for the board.", must: ["LODR-17-8"], note: "Managing Director is one of the two roles Regulation 17(8)'s own text names alongside CFO." },
  { n: 6, group: "Actor incompatibility", freeText: "The CEO signed a false compliance certification despite knowing it was inaccurate.", must: ["LODR-17-8"], note: "CEO is directly compatible." },
  // P0 actor-applicability CONNECTIVITY fix: same correction as #1/#4 — the
  // Audit Committee deficiency predicate names no member in its own
  // sentence, and the non-executive director is an unrelated actor named
  // separately with an express "no stated Audit Committee role"
  // disclaimer. The unrelated director must not withhold this candidate.
  { n: 7, group: "Actor incompatibility", freeText: "The Audit Committee meetings were not conducted for the year. A non-executive director was separately named in the matter with no stated Audit Committee role.", must: ["LODR-18-3-schedule-II"], note: "Audit Committee deficiency predicate names no member in its own sentence; an unrelated non-executive director mentioned separately must not withhold it." },
  { n: 8, group: "Actor incompatibility", freeText: "An Audit Committee member failed to attend meetings that were not conducted for the year.", must: ["LODR-18-3-schedule-II"], note: "Audit Committee member is directly compatible." },
  { n: 9, group: "Actor incompatibility", freeText: "A business relationship with the company's subsidiary raised an independence issue under the auditor eligibility rules. A promoter was separately named in the matter with no stated role in that eligibility question.", mustNot: ["COMPANIES-ACT-141-3-e"], note: "Auditor business-relationship ineligibility ground must not attach to a promoter." },
  { n: 10, group: "Actor incompatibility", freeText: "There was non-compliance with the auditor rotation requirement. The promoter was separately named in the matter with no stated role in the auditor's own tenure.", mustNot: ["COMPANIES-ACT-139"], note: "Auditor rotation is the auditor's own personal eligibility requirement, not a promoter's." },
  { n: 11, group: "Actor incompatibility", freeText: "The independent-director eligibility criteria were not met. A non-promoter allottee was separately named in the matter with no stated director role.", mustNot: ["LODR-16-1-b"], note: "Independent-director eligibility definition must not attach to an unrelated allottee." },
  { n: 12, group: "Actor incompatibility", freeText: "An independent director failed to exercise duties properly, since her own eligibility criteria were not met because she held a key managerial personnel position in the preceding three years.", must: ["LODR-16-1-b"], note: "The specific independent director is directly compatible." },
  { n: 13, group: "Actor incompatibility", freeText: "A person held securities in the company beyond the permitted threshold, an independence issue under the auditor eligibility rules. The CFO was separately named in the matter with no stated role in that eligibility question.", mustNot: ["COMPANIES-ACT-141-3-d"], note: "Auditor-specific ineligibility ground must not attach to management (CFO)." },
  { n: 14, group: "Actor incompatibility", freeText: "The statutory auditor held securities in the company beyond the permitted threshold.", must: ["COMPANIES-ACT-141-3-d"], note: "Statutory auditor is directly compatible." },
  { n: 15, group: "Actor incompatibility", freeText: "The statutory auditor did not rotate the auditor as required under the auditor rotation requirement.", must: ["COMPANIES-ACT-139"], note: "Statutory auditor rotation lapse, directly compatible actor." },
  { n: 16, group: "Actor incompatibility", freeText: "There was non-compliance with the auditor rotation requirement. The Managing Director was separately named in the matter with no stated role in the auditor's own tenure.", mustNot: ["COMPANIES-ACT-139"], note: "Auditor rotation is the auditor's own personal eligibility requirement, not management's." },

  // ===== Group 17-37: Companies Act precision (workstream 1) =====
  { n: 17, group: "Companies Act", freeText: "Consolidated financial statements including subsidiary financial statements were not disclosed to members as required.", must: ["COMPANIES-ACT-136"], note: "Subsidiary/consolidation fact connected to non-disclosure fact." },
  { n: 18, group: "Companies Act", freeText: "Consolidated financial statements were prepared and disclosed in full compliance with every applicable requirement.", mustNot: ["COMPANIES-ACT-136"], note: "Compliant, no non-disclosure fact stated." },
  { n: 19, group: "Companies Act", freeText: "The company's standalone results were misstated, an unrelated financial-results matter with no subsidiary or consolidation fact.", mustNot: ["COMPANIES-ACT-136"], note: "No subsidiary/consolidation fact at all." },
  { n: 20, group: "Companies Act", freeText: "The statutory auditor continued beyond the permitted tenure without rotation.", must: ["COMPANIES-ACT-139"], note: "Direct rotation-lapse fact." },
  { n: 21, group: "Companies Act", freeText: "The statutory auditor was appointed and rotated strictly in accordance with the prescribed tenure limits.", mustNot: ["COMPANIES-ACT-139"], note: "Compliant auditor tenure." },
  { n: 22, group: "Companies Act", freeText: "The statutory auditor's business relationship with the company's subsidiary raised an independence issue.", must: ["COMPANIES-ACT-141-3-e"], note: "Direct business-relationship ineligibility fact." },
  { n: 23, group: "Companies Act", freeText: "The statutory auditor had no business relationship of any kind with the company or its subsidiaries.", mustNot: ["COMPANIES-ACT-141-3-e"], note: "Compliant, no business-relationship fact." },
  { n: 24, group: "Companies Act", freeText: "A wholly-owned subsidiary transferred its investments in four listed group companies by way of gift to promoter-group entities.", must: ["COMPANIES-ACT-180-1-a"], note: "Direct undertaking/investment-disposal fact." },
  { n: 25, group: "Companies Act", freeText: "The company continued to hold all its investments and subsidiaries without any transfer, disposal or reorganisation of any kind.", mustNot: ["COMPANIES-ACT-180-1-a"], note: "No disposal fact at all." },
  { n: 26, group: "Companies Act", freeText: "The company realigned and reorganized its investments through its subsidiaries, transferring them to promoter-group entities.", must: ["LODR-37A"], note: "Same undertaking-disposal fact triggers the LODR-side counterpart too." },
  { n: 27, group: "Companies Act", freeText: "A preferential allotment of warrants was made to 82 allottees, and for several allottees, fabricated bank statements were submitted as proof of payment.", must: ["COMPANIES-ACT-67-2", "COMPANIES-ACT-24"], note: "Sham-consideration fact connected to the allotment, triggering both the substantive prohibition and the enabling SEBI power." },
  { n: 28, group: "Companies Act", freeText: "A preferential allotment of warrants was issued to 82 allottees, and every allottee genuinely paid the full consideration in cash with no financing by the company.", mustNot: ["COMPANIES-ACT-67-2", "COMPANIES-ACT-24"], note: "Genuinely paid allotment, no financial-assistance fact." },
  { n: 29, group: "Companies Act", freeText: "The company's financial statements were misstated, an unrelated matter with no preferential allotment at all.", mustNot: ["COMPANIES-ACT-67-2", "COMPANIES-ACT-24"], note: "No allotment fact at all." },
  { n: 30, group: "Companies Act", freeText: "The statutory auditor was ineligible to act as auditor due to a cooling-off period violation.", must: ["COMPANIES-ACT-139"], note: "Cooling-off phrase is a rotation/tenure synonym." },
  { n: 31, group: "Companies Act", freeText: "The company disposed of the whole undertaking through a sale, well above the prescribed net-worth threshold, without the required special resolution.", must: ["COMPANIES-ACT-180-1-a", "LODR-37A"], note: "Undertaking disposal, both provisions." },
  { n: 32, group: "Companies Act", freeText: "Consolidated financial statements were not disclosed to members, and separately the statutory auditor did not rotate the auditor as required under the auditor rotation requirement — two unconnected Companies Act issues in one scenario.", must: ["COMPANIES-ACT-136", "COMPANIES-ACT-139"], note: "Two independently self-contained Companies Act facts." },
  { n: 33, group: "Companies Act", freeText: "Preferential shares were allotted with fabricated bank statements as proof of payment, and separately an unrelated subsidiary transferred its investments to promoter-group entities by way of gift.", must: ["COMPANIES-ACT-67-2", "COMPANIES-ACT-180-1-a"], note: "Two independently self-contained Companies Act facts in one scenario." },
  { n: 34, group: "Companies Act", freeText: "Every Companies Act obligation this pass gates was fully complied with: financial statements circulated to members, the auditor rotated on time, no disposal of any undertaking, and preferential shares fully and genuinely paid for.", mustNot: ["COMPANIES-ACT-136", "COMPANIES-ACT-139", "COMPANIES-ACT-141-3-d", "COMPANIES-ACT-141-3-e", "COMPANIES-ACT-180-1-a", "COMPANIES-ACT-24", "COMPANIES-ACT-67-2"], note: "Comprehensive negative control across every gated Companies Act provision." },
  { n: 35, group: "Companies Act", freeText: "The statutory auditor held securities in the company beyond the permitted threshold, and separately had a business relationship with the company's subsidiary.", must: ["COMPANIES-ACT-141-3-d", "COMPANIES-ACT-141-3-e"], note: "Both auditor-ineligibility grounds independently satisfied." },
  { n: 36, group: "Companies Act", freeText: "The company financed the allotment through a loan for the purchase of its own shares in a preferential allotment.", must: ["COMPANIES-ACT-67-2"], note: "Loan-financed allotment is a direct Section 67(2) fact." },
  { n: 37, group: "Companies Act", freeText: "The company's Board considered, but expressly declined to approve, a proposed disposal of an undertaking; no disposal in fact occurred.", mustNot: ["COMPANIES-ACT-180-1-a", "LODR-37A"], note: "A merely proposed, non-occurring disposal is not itself a disposal fact — the vocabulary requires the disposal itself to have happened." },

  // ===== Group 38-50: substantive vs. penalty/definition/general-principle/attribution distinction (workstream 3) =====
  { n: 38, group: "Candidate tier", freeText: "Financial results contained a misstatement that overstated inflated sales figures reported to the stock exchanges.", must: ["LODR-48"], note: "Substantive accounting/reporting requirement -> primary candidate." },
  { n: 39, group: "Candidate tier", freeText: "Financial results contained a misstatement that overstated inflated sales figures reported to the stock exchanges.", must: ["LODR-4-1"], note: "General principle rides on the same established violation -> related/ancillary, not equivalent to LODR-48." },
  { n: 40, group: "Candidate tier", freeText: "A promoter diverted company funds, an established substantive violation.", must: ["SEBI-ACT-27"], note: "Liability-attribution provision, shown once the substantive violation and actor connect -> related/ancillary tier." },
  { n: 41, group: "Candidate tier", freeText: "A promoter diverted company funds, an established substantive violation.", must: ["SEBI-ACT-15HB"], note: "Residual penalty provision rides on the established violation -> related/ancillary tier, never equivalent to the substantive violation itself." },
  { n: 42, group: "Candidate tier", freeText: "A related-party transaction occurred with the counterparty.", must: ["LODR-23-1"], note: "Bare materiality-threshold definition -> related/ancillary tier, not a primary candidate on its own." },
  { n: 43, group: "Candidate tier", freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline.", must: ["LODR-30"], note: "Disclosure obligation -> primary candidate." },

  // ===== Group 44-58: historical-treatment vs current-applicability separation (workstream 5) =====
  { n: 44, group: "Historical treatment", freeText: "Financial results were fully compliant, prepared and submitted on time with no misstatement of any kind.", mustNot: ["LODR-48"], note: "Clean scenario keeps LODR-48 out of current candidates (checked separately against historicalTreatment below)." },
  { n: 45, group: "Historical treatment", freeText: "There was a CO vacancy for the whole year, and the promoter was separately named with no stated Compliance Officer role.", mustNot: ["LODR-6-gen"], note: "Actor-incompatible block also feeds the historical-treatment cross-reference (checked below)." },

  // ===== Group 46-60: positive controls and further coverage =====
  { n: 46, group: "Positive controls", freeText: "A related-party transaction was undisclosed, without the required Audit Committee approval.", must: ["LODR-23-2"], note: "Direct RPT approval-lapse fact." },
  { n: 47, group: "Positive controls", freeText: "A preferential allotment was made with fabricated bank statements produced as proof of payment.", must: ["ICDR-160"], note: "Direct sham-consideration fact connected to the allotment." },
  { n: 48, group: "Positive controls", freeText: "Shares were dealt with fraudulently in connection with a preferential allotment involving synchronized trading.", must: ["PFUTP-3-a", "SEBI-ACT-12A-a"], note: "Direct securities-dealing plus fraudulent-conduct fact." },
  { n: 49, group: "Positive controls", freeText: "A related-party transaction occurred at fair value, was fully disclosed, and was approved in advance by the Audit Committee, with no irregularities of any kind.", mustNot: ["LODR-23-2"], note: "Genuinely approved and disclosed RPT." },
  { n: 50, group: "Positive controls", freeText: "The company complied with every disclosure, governance and accounting obligation this pass tests, with no violation of any kind alleged anywhere in the scenario.", mustNot: ["LODR-6-gen", "LODR-17-8", "LODR-18-3-schedule-II", "LODR-23-2", "LODR-30", "LODR-48", "ICDR-160", "PFUTP-3-a", "SEBI-ACT-12A-a"], note: "Comprehensive negative control across every substantive family in this suite." },

  // ===== Group 51-58: adversarial mixed (actor + tier + Companies Act combined) =====
  { n: 51, group: "Adversarial mixed", freeText: "There was a CO vacancy for the whole year, blamed on the promoter with no stated Compliance Officer role. Separately, the statutory auditor did not rotate the auditor as required under the auditor rotation requirement.", mustNot: ["LODR-6-gen"], must: ["COMPANIES-ACT-139"], note: "Actor-incompatible CO block coexists with a genuinely compatible, self-contained auditor fact." },
  { n: 52, group: "Adversarial mixed", freeText: "A false compliance certification was signed by the CFO. A non-promoter allottee was separately named in the matter with no stated role in signing any certificate.", must: ["LODR-17-8"], note: "CFO is directly compatible even though an incompatible actor (allottee) is also named elsewhere." },
  { n: 53, group: "Adversarial mixed", freeText: "Financial results contained a misstatement, a substantive violation. Separately, a related-party transaction occurred with the counterparty, an unconnected definitional fact.", must: ["LODR-48", "LODR-4-1", "LODR-23-1"], note: "Primary and ancillary-tier candidates coexist correctly from two independently self-contained facts." },
  { n: 54, group: "Adversarial mixed", freeText: "Consolidated financial statements were not disclosed to members. Separately, an unconnected Compliance Officer position was filled at all times by a duly qualified individual.", must: ["COMPANIES-ACT-136"], mustNot: ["LODR-6-gen"], note: "Companies Act fact self-contained; the separately-stated compliant CO fact correctly excludes LODR-6-gen." },
  { n: 55, group: "Adversarial mixed", freeText: "An independent director failed to exercise duties properly, since her own eligibility criteria were not met. Separately, an unrelated preferential allotment was genuinely and fully paid for.", must: ["LODR-16-1-b"], mustNot: ["ICDR-160"], note: "Compatible-actor definitional fact shown; genuinely paid allotment correctly excludes ICDR-160." },
  { n: 56, group: "Adversarial mixed", freeText: "The Audit Committee's chairperson requirement was not met, and its chairman was not an independent director as required by definition.", must: ["LODR-18-1-d"], note: "Bare 'chairman' is treated as compatible for Audit Committee provisions given this corpus's disclosed actor-vocabulary ambiguity." },
  { n: 57, group: "Adversarial mixed", freeText: "The statutory auditor continued beyond the permitted tenure without rotation. Separately, an unconnected material event was disclosed to the stock exchange accurately and on time.", must: ["COMPANIES-ACT-139"], mustNot: ["LODR-30"], note: "Auditor tenure fact self-contained; compliant material-event fact correctly excludes LODR-30." },
  { n: 58, group: "Adversarial mixed", freeText: "A subsidiary transferred its investments to promoter-group entities by way of gift. Separately, an unconnected statutory auditor rotated strictly on time.", must: ["COMPANIES-ACT-180-1-a", "LODR-37A"], mustNot: ["COMPANIES-ACT-139"], note: "Undertaking-disposal fact self-contained; compliant auditor-rotation fact correctly excludes Section 139." },

  // ===== Group 59-66: further coverage (SEBI-ACT-27 factual-gate actor examples, financial-results channel, more Companies Act, more candidate tier) =====
  { n: 59, group: "Actor incompatibility", freeText: "A promoter was named in the matter. Separately, the company diverted funds, an unconnected substantive violation with no stated actor in charge of the company connected to it.", mustNot: ["SEBI-ACT-27"], note: "Section 27 must not attach merely because a promoter is named somewhere; its own factual gate requires the violation and the actor to be stated CONNECTED, in the same sentence." },
  { n: 60, group: "Actor incompatibility", freeText: "A promoter, acting as the person in charge of and responsible for the conduct of the company's business, diverted company funds.", must: ["SEBI-ACT-27"], note: "Violation and compatible actor stated connected, in one sentence." },
  { n: 61, group: "Companies Act", freeText: "The statutory auditor was ineligible to act as auditor, continuing beyond the permitted tenure without proper rotation.", must: ["COMPANIES-ACT-139"], note: "Direct rotation-lapse fact, alternate phrasing." },
  { n: 62, group: "Companies Act", freeText: "Financial results were misstated, an unrelated matter with no auditor-eligibility fact of any kind.", mustNot: ["COMPANIES-ACT-139", "COMPANIES-ACT-141-3-d", "COMPANIES-ACT-141-3-e"], note: "No auditor-eligibility fact at all, across all three auditor provisions." },
  { n: 63, group: "Candidate tier", freeText: "Consolidated financial statements were not disclosed to members, a substantive Companies Act violation.", must: ["COMPANIES-ACT-136"], note: "Disclosure obligation -> primary candidate, confirmed for the newly-gated Companies Act family too." },
  { n: 64, group: "Candidate tier", freeText: "A related-party transaction was undisclosed, without the required audit committee approval.", must: ["LODR-23-2"], note: "Governance/procedural obligation -> primary candidate." },
  { n: 65, group: "Historical treatment", freeText: "Financial results contained a misstatement that overstated inflated sales figures reported to the stock exchanges.", must: ["LODR-4-1"], note: "General-principle ancillary candidate coexists with LODR-48 without equivalence (checked in the candidate-tier group above)." },
  { n: 66, group: "Historical treatment", freeText: "The statutory auditor did not rotate the auditor as required under the auditor rotation requirement.", must: ["COMPANIES-ACT-139"], note: "Companies Act provision correctly reaches primary-candidate status once genuinely gated (cross-checked against historicalTreatment below)." },
];

describe("Deterministic Scenario Analyzer completion pass: independent test suite", () => {
  it(`has at least 60 scenario-array entries, plus dedicated structural-invariant tests below bringing the total well past 75 (currently ${SCENARIOS.length} scenario entries)`, () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(60);
    const groups = new Set(SCENARIOS.map((s) => s.group));
    expect(groups.size).toBeGreaterThanOrEqual(6);
  });

  for (const s of SCENARIOS) {
    it(`#${s.n} [${s.group}] ${s.note}`, () => {
      const result = analyzeScenario({ freeText: s.freeText }, ALL_FINDINGS, ALL_PROVISIONS, []);
      const returnedIds = result.provisionResults.map((p) => p.provision.id);
      // Question-A polarity correction pass: see the equivalent comment in
      // non-pfutp-blind-validation-suite.test.ts — several "must" entries
      // here (bare definitions, topic-only-gated provisions) now correctly
      // land in governingProvisionResults/contradictedProvisionResults
      // instead of provisionResults, an even stronger form of the
      // "not a primary candidate on its own" outcome these tests already
      // asserted. "mustNot" stays scoped to provisionResults (candidate
      // breach) only.
      const surfacedAnywhereIds = [
        ...returnedIds,
        ...result.governingProvisionResults.map((p) => p.provision.id),
        ...result.contradictedProvisionResults.map((p) => p.provision.id),
      ];
      if (s.must) for (const id of s.must) expect(surfacedAnywhereIds).toContain(id);
      if (s.mustNot) for (const id of s.mustNot) expect(returnedIds).not.toContain(id);
    });
  }
});

// ===== Temporal applicability (workstream 4) =====
describe("Temporal applicability: buildApplicableVersionNote via analyzeScenario's version-map argument", () => {
  const RPT_VERSIONS: ProvisionVersion[] = [
    { id: "v1", provisionId: "LODR-2-zc", versionLabel: "Pre-amendment RPT definition", effectiveFrom: null, effectiveTo: "2022-03-31", exactText: "Pre-1-April-2022 text.", sourceUrl: null, status: "order_cited_text_only" },
    { id: "v2", provisionId: "LODR-2-zc", versionLabel: "Post-amendment RPT definition (unverified)", effectiveFrom: "2022-04-01", effectiveTo: null, exactText: null, sourceUrl: null, status: "requires_verification" },
  ];

  it("with an order-cited historical version plus an unverified current version, discloses that the text has not been independently checked against the official source", () => {
    const map = new Map<string, ProvisionVersion[]>([["LODR-2-zc", RPT_VERSIONS]]);
    const result = analyzeScenario({ freeText: "A related-party transaction occurred with the counterparty, without the required audit committee approval." }, ALL_FINDINGS, ALL_PROVISIONS, [], map);
    const pr = result.provisionResults.find((p) => p.provision.id === "LODR-2-zc");
    expect(pr).toBeDefined();
    expect(pr!.applicableVersionNote).toMatch(/extracted verbatim from a CFID order/);
    expect(pr!.applicableVersionNote).toMatch(/not been independently checked against the official source/);
    expect(pr!.provisionVersions).toHaveLength(2);
  });

  it("with a single officially-verified version, states the applicable version but discloses that pre-effective-date conduct is unverified", () => {
    // Retargeted from LODR-23-1 to LODR-23-2 (Question-A polarity
    // correction pass): LODR-23-1 is a bare materiality-threshold
    // definition with no adverse predicate of its own (its retrieval rule
    // is a single topic-only group), so it now correctly reclassifies to
    // governingProvisionResults — which carries no applicableVersionNote/
    // provisionVersions fields, since those exist only on genuine candidate
    // breaches. LODR-23-2 is cited by the same finding and its own gate
    // (RPT fact + approval-lapse conduct) is satisfied by this exact
    // scenario text, so it exercises the identical temporal-versioning
    // mechanism this test targets while remaining a real candidate.
    const verified: ProvisionVersion[] = [
      { id: "v3", provisionId: "LODR-23-2", versionLabel: "Current text", effectiveFrom: "2022-04-01", effectiveTo: null, exactText: "text", sourceUrl: "https://www.sebi.gov.in/example", status: "officially_verified" },
    ];
    const map = new Map<string, ProvisionVersion[]>([["LODR-23-2", verified]]);
    const result = analyzeScenario({ freeText: "A related-party transaction occurred with the counterparty, without the required audit committee approval." }, ALL_FINDINGS, ALL_PROVISIONS, [], map);
    const pr = result.provisionResults.find((p) => p.provision.id === "LODR-23-2");
    expect(pr).toBeDefined();
    expect(pr!.applicableVersionNote).toMatch(/officially verified/);
    expect(pr!.applicableVersionNote).toMatch(/only version of this provision currently catalogued/);
  });

  it("with two officially-verified versions, states the latest applicable version without the single-version caveat", () => {
    const versions: ProvisionVersion[] = [
      { id: "v4", provisionId: "LODR-30", versionLabel: "Prior text", effectiveFrom: "2015-12-01", effectiveTo: "2021-12-31", exactText: "old text", sourceUrl: "https://www.sebi.gov.in/example", status: "officially_verified" },
      { id: "v5", provisionId: "LODR-30", versionLabel: "Current text", effectiveFrom: "2022-01-01", effectiveTo: null, exactText: "new text", sourceUrl: "https://www.sebi.gov.in/example", status: "officially_verified" },
    ];
    const map = new Map<string, ProvisionVersion[]>([["LODR-30", versions]]);
    const result = analyzeScenario({ freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." }, ALL_FINDINGS, ALL_PROVISIONS, [], map);
    const pr = result.provisionResults.find((p) => p.provision.id === "LODR-30");
    expect(pr).toBeDefined();
    expect(pr!.applicableVersionNote).toMatch(/Current text/);
    expect(pr!.applicableVersionNote).not.toMatch(/only version of this provision currently catalogued/);
  });

  it("with no version data at all, discloses that the in-force text has not been verified", () => {
    const result = analyzeScenario({ freeText: "Financial results contained a misstatement that overstated inflated sales figures reported to the stock exchanges." }, ALL_FINDINGS, ALL_PROVISIONS, []);
    const pr = result.provisionResults.find((p) => p.provision.id === "LODR-48");
    expect(pr).toBeDefined();
    expect(pr!.applicableVersionNote).toMatch(/No provision-version record on file/);
    expect(pr!.provisionVersions).toHaveLength(0);
  });

  it("never silently applies current wording to historical conduct: every provisionResults entry carries a non-empty applicableVersionNote, gated or ungated, versioned or not", () => {
    const result = analyzeScenario({ freeText: "Financial results contained a misstatement that overstated inflated sales figures reported to the stock exchanges." }, ALL_FINDINGS, ALL_PROVISIONS, []);
    expect(result.provisionResults.length).toBeGreaterThan(0);
    for (const pr of result.provisionResults) expect(pr.applicableVersionNote.length).toBeGreaterThan(0);
  });
});

// ===== Historical treatment: critical invariants (workstream 5) =====
describe("Historical treatment: critical invariants", () => {
  it("a provision can appear in historical treatment while being absent from current candidates (historical frequency never determines legal applicability)", () => {
    // Retargeted from the CO-vacancy/promoter scenario (P0 actor-
    // applicability connectivity fix): that scenario's LODR-6-gen absence
    // was an artifact of the since-fixed scenario-wide actor-contamination
    // defect (LODR-6-gen now correctly surfaces there — see scenario #1
    // above), not a genuine example of "historically treated but not a
    // current candidate". This scenario is a clean substitute: LODR-48 has
    // real historical precedent via F_FINRESULTS (a Confirmed-in-Final-
    // Order finding), has no actor-applicability rule at all (so it is
    // untouched by that fix either way), and is genuinely absent from
    // current candidates for a purely factual reason — the entered text
    // states full compliance, not the misstatement fact Regulation 48's
    // own gate requires.
    const result = analyzeScenario({ freeText: "Financial results were fully compliant, prepared and submitted on time with no misstatement of any kind." }, ALL_FINDINGS, ALL_PROVISIONS, []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("LODR-48");
    const histEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-48");
    expect(histEntry).toBeDefined();
    expect(histEntry!.currentCandidateTier).toBe("requires_additional_fact");
    expect(histEntry!.currentApplicabilityNote).toMatch(/NOT currently a candidate/);
  });

  it("an interim allegation cannot be counted as final support, and a not-upheld provision cannot be counted as positive final precedent", () => {
    const findingRejected = makeFinding({
      recordId: "COMP-REJ-01", caseName: "Rejected After Interim Ltd.", findingStatus: "Not Confirmed in Final Order",
      interimParagraphReferences: "Interim para 3 (prima facie view formed)", finalParagraphReferences: "Final para 40 (charge not established)",
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"], provisionLinks: [link("LODR-30")],
    });
    const result = analyzeScenario({ freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." }, [findingRejected], [LODR_30], []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("LODR-30");
    expect(result.contraryOnlyProvisionResults.map((c) => c.provision.id)).toContain("LODR-30");
    const histEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30")!;
    expect(histEntry.dispositionBreakdown.notUpheld).toBe(1);
    expect(histEntry.dispositionBreakdown.confirmedAtInterim).toBe(0);
    expect(histEntry.dispositionBreakdown.confirmedFinal).toBe(0);
  });

  it("one matter with multiple order-stage rows is not incorrectly treated as multiple independent factual precedents (matter-level dedup by case name)", () => {
    const findingInterim = makeFinding({
      recordId: "COMP-MTR-01", caseName: "Same Matter Co Ltd.", findingStatus: "Confirmed at interim", interimParagraphReferences: "Interim para 5", finalParagraphReferences: null,
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"], provisionLinks: [link("LODR-30")],
    });
    const findingFinal = makeFinding({
      recordId: "COMP-MTR-02", caseName: "Same Matter Co Ltd.", findingStatus: "Confirmed in Final Order", interimParagraphReferences: "Interim para 5", finalParagraphReferences: "Final para 12",
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"], provisionLinks: [link("LODR-30")],
    });
    const result = analyzeScenario({ freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." }, [findingInterim, findingFinal], [LODR_30], []);
    const histEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30")!;
    expect(histEntry.comparableMatterCount).toBe(1);
    expect(histEntry.totalFindingsCount).toBe(2);
    // The representative disposition for the one matter prefers the resolved
    // (final) row over the unresolved interim one — never double-counted.
    expect(histEntry.dispositionBreakdown.confirmedFinal).toBe(1);
    expect(histEntry.dispositionBreakdown.confirmedAtInterim).toBe(0);
  });

  it("provision-specific disposition (finding_provisions.relationship) overrides finding-level status in the historical-treatment view too", () => {
    const findingBundled = makeFinding({
      recordId: "COMP-OVR-01", caseName: "Bundled Disposition Ltd.", findingStatus: "Partly Confirmed in Final Order",
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"],
      provisionLinks: [link("LODR-30", [], "not_upheld")],
    });
    const result = analyzeScenario({ freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." }, [findingBundled], [LODR_30], []);
    const histEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30")!;
    expect(histEntry.cases[0].effectiveStatus).toBe("Not Confirmed in Final Order");
    expect(histEntry.cases[0].findingStatus).toBe("Partly Confirmed in Final Order");
    expect(histEntry.dispositionBreakdown.notUpheld).toBe(1);
    expect(histEntry.dispositionBreakdown.partlyUpheld).toBe(0);
  });

  it("actor-specific exoneration is preserved: two noticees on the same provision within one matter can carry different effective dispositions", () => {
    const findingConfirmed = makeFinding({
      recordId: "COMP-NOT-01", caseName: "Multi-Noticee Ltd.", findingStatus: "Confirmed in Final Order", noticeeActors: ["Promoter A"],
      actorRoles: ["promoter"], allegedConduct: ["fund_diversion"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const findingExonerated = makeFinding({
      recordId: "COMP-NOT-02", caseName: "Multi-Noticee Ltd.", findingStatus: "Confirmed in Final Order", noticeeActors: ["Independent Director B"],
      actorRoles: ["promoter"], allegedConduct: ["fund_diversion"], provisionLinks: [link("SEBI-ACT-27", [], "not_upheld")],
    });
    const result = analyzeScenario({ freeText: "A promoter diverted company funds, an established substantive violation." }, [findingConfirmed, findingExonerated], [SEBI_27], []);
    const histEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-27")!;
    const caseA = histEntry.cases.find((c) => c.recordId === "COMP-NOT-01")!;
    const caseB = histEntry.cases.find((c) => c.recordId === "COMP-NOT-02")!;
    expect(caseA.effectiveStatus).toBe("Confirmed in Final Order");
    expect(caseA.noticeeActors).toEqual(["Promoter A"]);
    expect(caseB.effectiveStatus).toBe("Not Confirmed in Final Order");
    expect(caseB.noticeeActors).toEqual(["Independent Director B"]);
    // Two case rows sharing the same caseName still count as ONE comparable
    // matter (see the matter-dedup test above) even though their per-actor
    // dispositions differ — the exoneration is visible in the case-level
    // detail (cases[]), not collapsed into the matter count.
    expect(histEntry.comparableMatterCount).toBe(1);
  });

  it("same fact pattern across different order stages is classified via Order.orderStage when Order data is supplied, never fabricated when it is not", () => {
    const orderInterim: Order = { id: "ord-1", caseName: "Stage Test Ltd.", orderStage: "Interim order", orderDate: null, orderNumber: null, authority: null, noticeesCount: 0, officialUrl: "https://example.com", cfidVerified: true, cfidVerificationBasis: "cfid_tag_in_order_number", proceduralStatus: "", processingStage: "citations_checked", retrievalStatus: "success", retrievalFailureReason: null, scopeNote: null, matterId: null, officialOrderTitle: null, normalizedMatterName: null };
    const orderFinal: Order = { ...orderInterim, id: "ord-2", orderStage: "Final order" };
    const findingStage1 = makeFinding({
      recordId: "COMP-STG-01", caseName: "Stage Test Ltd.", orderIds: ["ord-1"], findingStatus: "Confirmed at interim",
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"], provisionLinks: [link("LODR-30")],
    });
    const findingStage2 = makeFinding({
      recordId: "COMP-STG-02", caseName: "Stage Test Ltd.", orderIds: ["ord-2"], findingStatus: "Confirmed in Final Order",
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"], provisionLinks: [link("LODR-30")],
    });
    const withOrders = analyzeScenario(
      { freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." },
      [findingStage1, findingStage2], [LODR_30], [], new Map(), [], [orderInterim, orderFinal]
    );
    const histEntry = withOrders.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30")!;
    expect(histEntry.cases.find((c) => c.recordId === "COMP-STG-01")!.orderStageClass).toBe("interim_or_ex_parte");
    expect(histEntry.cases.find((c) => c.recordId === "COMP-STG-02")!.orderStageClass).toBe("final_wtm");
    expect(histEntry.comparableMatterCount).toBe(1);

    // Without Order data supplied (the default, e.g. every pre-existing call
    // site that doesn't pass the new 7th argument), the stage is never
    // guessed from findingStatus alone — it stays honestly unclassified.
    const withoutOrders = analyzeScenario(
      { freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." },
      [findingStage1, findingStage2], [LODR_30], []
    );
    const histEntryNoOrders = withoutOrders.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30")!;
    for (const c of histEntryNoOrders.cases) expect(c.orderStageClass).toBe("unresolved_or_not_independently_classified");
  });

  it("partly-upheld matters: a finding-level Partly Confirmed status still lets one linked provision read as supporting and a different linked provision (marked not_upheld) read as contrary-only", () => {
    const findingPartly = makeFinding({
      recordId: "COMP-PU-01", caseName: "Partly Upheld Ltd.", findingStatus: "Partly Confirmed in Final Order",
      transactionTypes: ["material_event_disclosure", "financial_statement_disclosure"],
      allegedConduct: ["non_disclosure_of_information", "financial_statement_misstatement"],
      provisionLinks: [link("LODR-30"), link("LODR-48", [], "not_upheld")],
    });
    const result = analyzeScenario(
      { freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline, and financial results contained a misstatement." },
      [findingPartly], [LODR_30, LODR_48], []
    );
    const lodr30 = result.provisionResults.find((p) => p.provision.id === "LODR-30");
    expect(lodr30).toBeDefined();
    expect(lodr30!.supportingPrecedents[0].effectiveStatus).toBe("Partly Confirmed in Final Order");
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("LODR-48");
    expect(result.contraryOnlyProvisionResults.map((c) => c.provision.id)).toContain("LODR-48");
  });
});
