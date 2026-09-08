// Question-A polarity acceptance pass, item 9: "Re-run the original
// negative-control philosophy" — at least 50 fresh adversarial Question-A
// scenarios, NOT limited to the exact phrases in the mandate's own
// clean-control/paired examples (those are covered permanently in
// question-a-polarity-clean-controls.test.ts). Categories covered, per
// the mandate: fully compliant facts; mixed compliant/adverse facts;
// negated allegations; "not established" language; "alleged but
// disproved" wording; unknown approval/disclosure status; immaterial
// breaches; corrected errors; timing-only violations; actor-specific
// compliance; one violation plus unrelated compliant facts.
//
// Each scenario asserts against result.provisionResults only (the
// CANDIDATE BREACH array) — "must" means the provision must appear as a
// candidate breach; "mustNot" means it must not. Whether a "mustNot"
// provision lands in governingProvisionResults, contradictedProvisionResults
// or gateBlockedProvisionResults instead is not asserted here (that
// distinction has its own dedicated coverage in
// question-a-polarity-clean-controls.test.ts) — this suite's purpose is
// the single sharpest question the mandate raised: does topic presence
// alone, or an unstated/negated/corrected/immaterial fact, ever wrongly
// read as a candidate breach.
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
    caseName: "Question-A Adversarial Suite Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Question-A adversarial-suite finding",
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

// ----- Provisions (real, curated ids so the real global retrieval rules /
// legal-function / actor-applicability registries apply) -----
const LODR_23_2 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
const LODR_30 = makeProvision("LODR-30", "Regulation 30", "Disclosure of material events.", "LODR Regulations, 2015");
const LODR_33 = makeProvision("LODR-33-1-gen", "Regulation 33(1)", "Preparation of financial results.", "LODR Regulations, 2015");
const LODR_48 = makeProvision("LODR-48", "Regulation 48", "Compliance with accounting standards.", "LODR Regulations, 2015");
const SEBI_11C_3 = makeProvision("SEBI-ACT-11C-3", "Section 11C(3)", "Power to require production of records.", "SEBI Act, 1992");
const ICDR_160 = makeProvision("ICDR-160", "Regulation 160", "Full payment at allotment.", "ICDR Regulations, 2018");
const LODR_32 = makeProvision("LODR-32", "Regulation 32", "Issue-proceeds monitoring and disclosure.", "LODR Regulations, 2015");
const PFUTP_3_a = makeProvision("PFUTP-3-a", "Regulation 3(a)", "Fraudulent dealing in securities.", "PFUTP Regulations, 2003");
const COMPANIES_67_2 = makeProvision("COMPANIES-ACT-67-2", "Section 67(2)", "Prohibition on financial assistance for own-share purchase.", "Companies Act, 2013");

// Ungated synthetic ids for families with no per-provision retrieval rule
// in this corpus (Compliance Officer, Audit Committee constitution,
// auditor independence phrased without "statutory auditor") — classified
// through the ungated fallback (precedent's own allegedConduct intersected
// with the query's own detected concepts), same architecture as the
// governing/contradicted coverage in the clean-control suite.
const LODR_6_CO = makeProvision("LODR-6-2-a", "Regulation 6(2)(a)", "Compliance Officer appointment.", "LODR Regulations, 2015");
const LODR_18_AC = makeProvision("LODR-18-1-d", "Regulation 18(1)(d)", "Audit Committee constitution and functioning.", "LODR Regulations, 2015");
const AUDITOR_INDEP = makeProvision("COMPANIES-ACT-141-3-i", "Section 141(3)", "Auditor independence/eligibility.", "Companies Act, 2013");

const ALL_PROVISIONS = [LODR_23_2, LODR_30, LODR_33, LODR_48, SEBI_11C_3, ICDR_160, LODR_32, PFUTP_3_a, COMPANIES_67_2, LODR_6_CO, LODR_18_AC, AUDITOR_INDEP];

const RPT_FINDING = makeFinding({ recordId: "ADV-RPT", provisionLinks: [link("LODR-23-2")], transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse", "non_disclosure_of_information"] });
const REG30_FINDING = makeFinding({ recordId: "ADV-REG30", provisionLinks: [link("LODR-30")], transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"] });
const REG33_FINDING = makeFinding({ recordId: "ADV-REG33", provisionLinks: [link("LODR-33-1-gen")], transactionTypes: ["financial_statement_disclosure"], allegedConduct: ["fictitious_sales_or_revenue", "financial_statement_misstatement"] });
const REG48_FINDING = makeFinding({ recordId: "ADV-REG48", provisionLinks: [link("LODR-48")], transactionTypes: ["financial_statement_disclosure"], allegedConduct: ["financial_statement_misstatement"] });
const INVEST_FINDING = makeFinding({ recordId: "ADV-INVEST", provisionLinks: [link("SEBI-ACT-11C-3")], transactionTypes: ["investigation_process"], allegedConduct: ["non_cooperation_with_investigation"] });
const PREF_FINDING = makeFinding({ recordId: "ADV-PREF", provisionLinks: [link("ICDR-160")], transactionTypes: ["preferential_allotment"], allegedConduct: ["unsupported_share_allotment_consideration", "sham_preferential_allotment"] });
const ISSUE_FINDING = makeFinding({ recordId: "ADV-ISSUE", provisionLinks: [link("LODR-32")], transactionTypes: ["rights_issue"], allegedConduct: ["fund_diversion"] });
const PFUTP_FINDING = makeFinding({ recordId: "ADV-PFUTP", provisionLinks: [link("PFUTP-3-a")], transactionTypes: ["preferential_allotment"], allegedConduct: ["actual_price_manipulation", "false_appearance_of_trading"] });
const COMPANIES_672_FINDING = makeFinding({ recordId: "ADV-CO67", provisionLinks: [link("COMPANIES-ACT-67-2")], transactionTypes: ["preferential_allotment"], allegedConduct: ["sham_preferential_allotment"] });
const CO_FINDING = makeFinding({ recordId: "ADV-CO", provisionLinks: [link("LODR-6-2-a")], transactionTypes: ["compliance_officer_appointment"], allegedConduct: ["compliance_officer_deficiency"] });
const AC_FINDING = makeFinding({ recordId: "ADV-AC", provisionLinks: [link("LODR-18-1-d")], transactionTypes: ["annual_report_disclosure"], allegedConduct: ["audit_committee_deficiency"] });
const AUDITOR_FINDING = makeFinding({ recordId: "ADV-AUDITOR", provisionLinks: [link("COMPANIES-ACT-141-3-i")], actorRoles: ["statutory_auditor"], allegedConduct: ["auditor_tenure_or_independence_issue"] });

const ALL_FINDINGS = [
  RPT_FINDING,
  REG30_FINDING,
  REG33_FINDING,
  REG48_FINDING,
  INVEST_FINDING,
  PREF_FINDING,
  ISSUE_FINDING,
  PFUTP_FINDING,
  COMPANIES_672_FINDING,
  CO_FINDING,
  AC_FINDING,
  AUDITOR_FINDING,
];

interface Scenario {
  n: number;
  group: string;
  freeText: string;
  must?: string[];
  mustNot?: string[];
}

const SCENARIOS: Scenario[] = [
  // ----- Fully compliant facts (1-8) -----
  { n: 1, group: "Fully compliant", freeText: "The related-party transaction was duly approved by the Audit Committee and fully disclosed in the related party register.", mustNot: ["LODR-23-2"] },
  { n: 2, group: "Fully compliant", freeText: "The material development was disclosed to the stock exchange within the prescribed timeline.", mustNot: ["LODR-30"] },
  { n: 3, group: "Fully compliant", freeText: "The quarterly financial results were accurately reported and no misstatement was identified on review.", mustNot: ["LODR-33-1-gen", "LODR-48"] },
  { n: 4, group: "Fully compliant", freeText: "The company furnished all requested records to the investigating authority in full.", mustNot: ["SEBI-ACT-11C-3"] },
  { n: 5, group: "Fully compliant", freeText: "The preferential allotment consideration was received in genuine consideration and independently verified.", mustNot: ["ICDR-160"] },
  { n: 6, group: "Fully compliant", freeText: "The rights issue proceeds were applied strictly to its stated objects, with no diversion of funds.", mustNot: ["LODR-32"] },
  { n: 7, group: "Fully compliant", freeText: "The Compliance Officer remained continuously appointed throughout the relevant period.", mustNot: ["LODR-6-2-a"] },
  { n: 8, group: "Fully compliant", freeText: "The Audit Committee was duly constituted audit committee and discharged all applicable functions.", mustNot: ["LODR-18-1-d"] },

  // ----- Mixed compliant/adverse facts (9-14) -----
  { n: 9, group: "Mixed compliant/adverse", freeText: "The related-party transaction was not approved by the audit committee, though it was fully disclosed.", must: ["LODR-23-2"] },
  { n: 10, group: "Mixed compliant/adverse", freeText: "The material event was disclosed to the stock exchange, but quarterly results contained material fictitious revenue.", must: ["LODR-33-1-gen"], mustNot: ["LODR-30"] },
  { n: 11, group: "Mixed compliant/adverse", freeText: "The company furnished all requested records, and separately, funds raised through the rights issue were diverted to promoter-controlled entities.", must: ["LODR-32"], mustNot: ["SEBI-ACT-11C-3"] },
  { n: 12, group: "Mixed compliant/adverse", freeText: "The preferential allotment consideration was independently paid, but the Compliance Officer position remained vacant beyond permitted period.", must: ["LODR-6-2-a"], mustNot: ["ICDR-160"] },
  { n: 13, group: "Mixed compliant/adverse", freeText: "The published financial results contained sales that were fictitious and were fictitiously booked, though the Audit Committee was properly constituted and functioning.", must: ["LODR-33-1-gen"], mustNot: ["LODR-18-1-d"] },
  { n: 14, group: "Mixed compliant/adverse", freeText: "The auditor satisfied independence and eligibility requirements, but the related-party transaction had no audit committee approval.", must: ["LODR-23-2"], mustNot: ["COMPANIES-ACT-141-3-i"] },

  // ----- Negated allegations (15-20) -----
  { n: 15, group: "Negated allegation", freeText: "It was alleged that funds were diverted, but no funds were diverted.", mustNot: ["LODR-32"] },
  { n: 16, group: "Negated allegation", freeText: "There was no non-disclosure of the related-party transaction; it was duly disclosed in the related party register.", mustNot: ["LODR-30"] },
  { n: 17, group: "Negated allegation", freeText: "The company did not fail to furnish records requested during the SEBI investigation.", mustNot: ["SEBI-ACT-11C-3"] },
  { n: 18, group: "Negated allegation", freeText: "There was no sham preferential allotment; the consideration was independently paid and verified.", mustNot: ["ICDR-160"] },
  { n: 19, group: "Negated allegation", freeText: "There was no audit committee deficiency; the committee met as required.", mustNot: ["LODR-18-1-d"] },
  { n: 20, group: "Negated allegation", freeText: "There was no compliance officer vacancy; a qualified compliance officer remained continuously appointed.", mustNot: ["LODR-6-2-a"] },

  // ----- "Not established" language (21-25) -----
  { n: 21, group: "Not established", freeText: "SEBI's show cause notice alleged fund diversion, but on review the diversion of funds was not established.", mustNot: ["LODR-32"] },
  { n: 22, group: "Not established", freeText: "The allegation of a fictitious sale was not established; the sale was supported by GST records and delivery documents.", mustNot: ["LODR-33-1-gen", "LODR-48"] },
  { n: 23, group: "Not established", freeText: "There was no evidence of non-cooperation by the company during the investigation; the company furnished all requested records.", mustNot: ["SEBI-ACT-11C-3"] },
  { n: 24, group: "Not established", freeText: "The allegation of an RPT approval lapse was not established, as the audit committee minutes confirmed prior approval.", mustNot: ["LODR-23-2"] },
  { n: 25, group: "Not established", freeText: "The allegation that the auditor lacked independence was not established; the auditor satisfied independence requirements.", mustNot: ["COMPANIES-ACT-141-3-i"] },

  // ----- "Alleged but disproved" wording (26-30) -----
  { n: 26, group: "Alleged but disproved", freeText: "There was no evidence of price manipulation; the share price increased following genuine earnings improvement.", mustNot: ["PFUTP-3-a"] },
  { n: 27, group: "Alleged but disproved", freeText: "A sham preferential allotment was alleged, but the allotment was fully paid, correctly priced and properly approved.", mustNot: ["ICDR-160"] },
  { n: 28, group: "Alleged but disproved", freeText: "There was no evidence of non-disclosure of the material event; it was timely and accurately disclosed.", mustNot: ["LODR-30"] },
  { n: 29, group: "Alleged but disproved", freeText: "Financial assistance for the purchase of its own shares was alleged against the company, but the allotment consideration was independently paid and verified.", mustNot: ["COMPANIES-ACT-67-2"] },
  { n: 30, group: "Alleged but disproved", freeText: "Diversion of issue proceeds was alleged, but the proceeds were utilised exactly for the stated objects and independently certified.", mustNot: ["LODR-32"] },

  // ----- Unknown approval/disclosure status (31-36) -----
  { n: 31, group: "Unknown status", freeText: "The company entered into a related-party transaction.", mustNot: ["LODR-23-2"] },
  { n: 32, group: "Unknown status", freeText: "The company published its quarterly financial results.", mustNot: ["LODR-33-1-gen", "LODR-48"] },
  { n: 33, group: "Unknown status", freeText: "A material event occurred at the company.", mustNot: ["LODR-30"] },
  { n: 34, group: "Unknown status", freeText: "SEBI initiated an investigation into the company.", mustNot: ["SEBI-ACT-11C-3"] },
  { n: 35, group: "Unknown status", freeText: "The company made a preferential allotment of shares.", mustNot: ["ICDR-160"] },
  { n: 36, group: "Unknown status", freeText: "The company appointed a Compliance Officer.", mustNot: ["LODR-6-2-a"] },

  // ----- Immaterial breaches (37-40) -----
  { n: 37, group: "Immaterial breach", freeText: "A minor, immaterial related-party transaction below the prescribed threshold was entered into; audit committee approval was not applicable at that value.", mustNot: ["LODR-23-2"] },
  { n: 38, group: "Immaterial breach", freeText: "An immaterial rounding difference in the quarterly results was later found to have no impact on the reported figures.", mustNot: ["LODR-33-1-gen", "LODR-48"] },
  { n: 39, group: "Immaterial breach", freeText: "A trivial administrative delay in furnishing one document to SEBI was fully cured the same day, with the company having otherwise fully cooperated.", mustNot: ["SEBI-ACT-11C-3"] },
  { n: 40, group: "Immaterial breach", freeText: "An immaterial preferential allotment of a small number of shares was fully paid and correctly priced.", mustNot: ["ICDR-160"] },

  // ----- Corrected errors (41-44) -----
  { n: 41, group: "Corrected error", freeText: "There was no financial statement misstatement in the quarterly results as filed; an earlier draft error had been identified internally and corrected before filing, and the results were accurate and timely filed.", mustNot: ["LODR-33-1-gen", "LODR-48"] },
  { n: 42, group: "Corrected error", freeText: "A related-party transaction's approval process began before the scheduled Audit Committee meeting; the transaction was ultimately duly approved by the audit committee before the transaction closed.", mustNot: ["LODR-23-2"] },
  { n: 43, group: "Corrected error", freeText: "A vacancy in the Compliance Officer role was promptly filled; a qualified Compliance Officer remained continuously appointed thereafter.", mustNot: ["LODR-6-2-a"] },
  { n: 44, group: "Corrected error", freeText: "An early utilisation certificate contained an error that was corrected, and the rights issue proceeds were used exactly for the stated objects.", mustNot: ["LODR-32"] },

  // ----- Timing-only violations (45-47) -----
  { n: 45, group: "Timing-only", freeText: "The material litigation disclosure to the stock exchange was a late disclosure, made after the prescribed timeline.", must: ["LODR-30"] },
  { n: 46, group: "Timing-only", freeText: "The quarterly results were filed after the prescribed deadline, with material fictitious revenue also identified in the same results.", must: ["LODR-33-1-gen"] },
  { n: 47, group: "Timing-only", freeText: "The company responded to SEBI's summons, but only after repeated summons were ignored for several months.", must: ["SEBI-ACT-11C-3"] },

  // ----- Actor-specific compliance (48-51) -----
  { n: 48, group: "Actor-specific compliance", freeText: "The statutory auditor satisfied independence requirements; a promoter was separately named in the matter with no stated role in that eligibility question.", mustNot: ["COMPANIES-ACT-141-3-i"] },
  { n: 49, group: "Actor-specific compliance", freeText: "The Compliance Officer remained continuously appointed; the Managing Director was separately named in the matter with no stated role in the compliance officer's own appointment.", mustNot: ["LODR-6-2-a"] },
  { n: 50, group: "Actor-specific compliance", freeText: "The Audit Committee discharged all applicable functions; the CFO was separately named in the matter with no stated role in the committee's own functioning.", mustNot: ["LODR-18-1-d"] },

  // ----- One violation plus unrelated compliant facts (51-55) -----
  { n: 51, group: "One violation, unrelated compliant facts", freeText: "Issue proceeds were diverted to promoter-controlled entities. Separately, the statutory auditor satisfied independence requirements and the Compliance Officer remained continuously appointed.", must: ["LODR-32"], mustNot: ["COMPANIES-ACT-141-3-i", "LODR-6-2-a"] },
  { n: 52, group: "One violation, unrelated compliant facts", freeText: "The related-party transaction was not approved by the audit committee. Separately, the rights issue proceeds were used exactly for the stated objects.", must: ["LODR-23-2"], mustNot: ["LODR-32"] },
  { n: 53, group: "One violation, unrelated compliant facts", freeText: "Repeated summons were ignored by the company. Separately, the preferential allotment was fully paid, correctly priced and properly approved.", must: ["SEBI-ACT-11C-3"], mustNot: ["ICDR-160"] },
  { n: 54, group: "One violation, unrelated compliant facts", freeText: "Sales were fictitious and were fictitiously booked in the quarterly results. Separately, the material litigation was timely and accurately disclosed.", must: ["LODR-33-1-gen"], mustNot: ["LODR-30"] },
  { n: 55, group: "One violation, unrelated compliant facts", freeText: "The preferential allotment consideration was circularly funded by the issuer. Separately, the Audit Committee was properly constituted and met as required.", must: ["ICDR-160"], mustNot: ["LODR-18-1-d"] },

  // ----- Disputed/uncertain facts (56-58) — extra coverage beyond the
  // required 11 categories, item 1's own fifth polarity state -----
  { n: 56, group: "Disputed/uncertain", freeText: "Whether the related-party transaction had audit committee approval is disputed between the parties and remains unresolved.", mustNot: ["LODR-23-2"] },
  { n: 57, group: "Disputed/uncertain", freeText: "The parties dispute whether the quarterly results were accurate; the matter remains uncertain pending further review.", mustNot: ["LODR-33-1-gen", "LODR-48"] },
  { n: 58, group: "Disputed/uncertain", freeText: "It remains uncertain whether the company furnished all requested records during the investigation.", mustNot: ["SEBI-ACT-11C-3"] },
];

describe("Question-A polarity: adversarial negative-control suite (50+ scenarios)", () => {
  it("covers at least 50 scenarios across the mandated categories", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(SCENARIOS.map((s) => s.group)).size).toBeGreaterThanOrEqual(11);
  });

  for (const s of SCENARIOS) {
    it(`#${s.n} [${s.group}] ${s.freeText}`, () => {
      const result = analyzeScenario({ freeText: s.freeText }, ALL_FINDINGS, ALL_PROVISIONS, []);
      const breachIds = result.provisionResults.map((p) => p.provision.id);
      if (s.must) for (const id of s.must) expect(breachIds).toContain(id);
      if (s.mustNot) for (const id of s.mustNot) expect(breachIds).not.toContain(id);
    });
  }
});
