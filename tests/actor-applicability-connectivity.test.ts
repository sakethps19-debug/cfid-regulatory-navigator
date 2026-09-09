// P0 ACTOR-APPLICABILITY CONNECTIVITY FIX — permanent regression suite.
//
// Companion to tests/question-a-polarity-connectivity.test.ts: that pass
// fixed scenario-wide POLARITY suppression (a compliant fact anywhere
// curing an unrelated adverse candidate); this pass fixes the same defect
// class in ACTOR APPLICABILITY (checkActorApplicability in engine.ts),
// which collected every actor concept anywhere in the scenario and asked
// whether ANY of them were compatible with a provision — causing both
// false withholding (an unrelated incompatible actor blocking a genuinely
// applicable, actor-unstated or company-duty candidate) and false
// compatibility (an unrelated compatible actor curing a connected but
// incompatible actor). See engine.ts's connectedSentences logic in
// checkActorApplicability/getActorApplicability for the fix itself.
//
// Part 1 reproduces the mandate's 12 mandatory conceptual cases verbatim.
// Part 2 is a categorized, table-driven suite of 60+ fresh scenarios
// across actor-connectivity dimensions, with a holdout subset (item 11 of
// the mandate) not used to design the fix.
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
    caseName: "diag", orderIds: [], category: "test", scenarioTitle: "diag", factualPattern: "diag",
    provisionsConsideredRaw: null, provisionIds: overrides.provisionLinks.map((l) => l.provisionId),
    noticeeActors: [], findingStatus: "Confirmed in Final Order", interimParagraphReferences: null,
    finalParagraphReferences: "Para 1", qualification: null, officialSourceUrl: "https://x",
    transactionTypes: [], actorRoles: [], evidenceTypes: [], allegedConduct: [], evidentiaryGaps: [],
    precedentOutcomeNote: null, ingredientsNotEstablished: [], sourceDocumentVerified: true,
    paragraphCitationVerified: true, findingStatusVerified: true, provisionMappingVerified: true,
    noticeeMappingVerified: true, humanLegalReviewCompleted: false, publicationStatus: "Published to search",
    ...overrides,
  };
}

function breachIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.provisionResults.map((p) => p.provision.id);
}
function isBreach(result: ReturnType<typeof analyzeScenario>, id: string) {
  expect(breachIds(result)).toContain(id);
}
function notBreach(result: ReturnType<typeof analyzeScenario>, id: string) {
  expect(breachIds(result)).not.toContain(id);
}

// ===================================================================
// PART 1 — mandatory Cases 1-12
// ===================================================================
describe("Actor-applicability connectivity: mandatory Cases 1-12", () => {
  const LODR_6_GEN = makeProvision("LODR-6-gen", "Regulation 6", "Compliance Officer appointment.", "LODR Regulations, 2015");
  const LODR_17_8 = makeProvision("LODR-17-8", "Regulation 17(8)", "CEO/CFO compliance certification.", "LODR Regulations, 2015");
  const LODR_18_1_D = makeProvision("LODR-18-1-d", "Regulation 18(1)(d)", "Audit Committee chairperson requirement.", "LODR Regulations, 2015");
  const COMPANIES_ACT_139 = makeProvision("COMPANIES-ACT-139", "Section 139", "Statutory auditor rotation requirement.", "Companies Act, 2013");
  const COMPANIES_ACT_141_3_E = makeProvision("COMPANIES-ACT-141-3-e", "Section 141(3)(e)", "Auditor ineligibility, business relationship.", "Companies Act, 2013");

  it("Case 1: Compliance Officer vacancy remains a candidate despite an unrelated promoter mention", () => {
    const finding = makeFinding({ recordId: "AC1", provisionLinks: [link("LODR-6-gen")], transactionTypes: ["compliance_officer_appointment"], allegedConduct: ["compliance_officer_deficiency"] });
    const result = analyzeScenario({ freeText: "The Compliance Officer position remained vacant for six months. Separately, the promoter sold shares." }, [finding], [LODR_6_GEN], []);
    isBreach(result, "LODR-6-gen");
  });

  it("Case 2: promoter diversion and Compliance Officer vacancy surface independently, without cross-contamination", () => {
    const provisions = [makeProvision("SEBI-ACT-15HB", "Section 15HB", "Residual penalty.", "SEBI Act, 1992"), LODR_6_GEN];
    const findings = [
      makeFinding({ recordId: "AC2-DIV", provisionLinks: [link("SEBI-ACT-15HB")], allegedConduct: ["fund_diversion"], actorRoles: ["promoter"] }),
      makeFinding({ recordId: "AC2-CO", provisionLinks: [link("LODR-6-gen")], transactionTypes: ["compliance_officer_appointment"], allegedConduct: ["compliance_officer_deficiency"] }),
    ];
    const result = analyzeScenario({ freeText: "The promoter diverted funds. Separately, the Compliance Officer position remained vacant." }, findings, provisions, []);
    isBreach(result, "SEBI-ACT-15HB");
    isBreach(result, "LODR-6-gen");
  });

  it("Case 3: CFO signing a certificate is actor-compatible despite an unrelated allottee", () => {
    const provisions = [LODR_17_8, makeProvision("ICDR-160", "Regulation 160", "Full payment at allotment.", "ICDR Regulations, 2018")];
    const findings = [
      makeFinding({ recordId: "AC3-CERT", provisionLinks: [link("LODR-17-8")], transactionTypes: ["certification_process"], allegedConduct: ["false_compliance_certification"] }),
      makeFinding({ recordId: "AC3-PREF", provisionLinks: [link("ICDR-160")], transactionTypes: ["preferential_allotment"], allegedConduct: ["unsupported_share_allotment_consideration"] }),
    ];
    const result = analyzeScenario({ freeText: "The CFO signed a false compliance certificate. Separately, an allottee participated in a preferential allotment where consideration was unsupported." }, findings, provisions, []);
    isBreach(result, "LODR-17-8");
  });

  it("Case 4: an unidentified certificate signer is not withheld merely because an allottee is named elsewhere", () => {
    const finding = makeFinding({ recordId: "AC4", provisionLinks: [link("LODR-17-8")], transactionTypes: ["certification_process"], allegedConduct: ["false_compliance_certification"] });
    const result = analyzeScenario({ freeText: "An allottee signed a document unrelated to certification. Separately, a false compliance certificate was issued for CEO/CFO signature, but the signer is not identified." }, [finding], [LODR_17_8], []);
    isBreach(result, "LODR-17-8");
  });

  it("Case 5: Audit Committee deficiency not blocked by an unrelated promoter RPT mention", () => {
    const provisions = [LODR_18_1_D, makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015")];
    const findings = [
      makeFinding({ recordId: "AC5-AC", provisionLinks: [link("LODR-18-1-d")], transactionTypes: ["audit_committee_process"], allegedConduct: ["audit_committee_deficiency"] }),
      makeFinding({ recordId: "AC5-RPT", provisionLinks: [link("LODR-23-2")], transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"] }),
    ];
    const result = analyzeScenario({ freeText: "The Audit Committee chairman presided while meetings were not conducted for the year. Separately, the promoter entered into a related-party transaction not approved by the audit committee." }, findings, provisions, []);
    isBreach(result, "LODR-18-1-d");
  });

  it("Case 6: Audit Committee chairperson provision available on its own connected proposition despite an unrelated promoter-supervision mention", () => {
    const finding = makeFinding({ recordId: "AC6", provisionLinks: [link("LODR-18-1-d")], transactionTypes: ["audit_committee_process"], allegedConduct: ["audit_committee_deficiency"] });
    const result = analyzeScenario({ freeText: "The promoter failed to supervise the company. Separately, the Audit Committee chairman presided while meetings were not conducted for the year." }, [finding], [LODR_18_1_D], []);
    isBreach(result, "LODR-18-1-d");
  });

  it("Case 7: statutory-auditor tenure provision actor-compatible; unrelated management mention irrelevant", () => {
    const finding = makeFinding({ recordId: "AC7", provisionLinks: [link("COMPANIES-ACT-139")], actorRoles: ["statutory_auditor"], allegedConduct: ["auditor_tenure_or_independence_issue"] });
    const result = analyzeScenario({ freeText: "The statutory auditor continued beyond the permitted tenure without rotation. Separately, management approved a loan unrelated to the auditor's own tenure." }, [finding], [COMPANIES_ACT_139], []);
    isBreach(result, "COMPANIES-ACT-139");
  });

  it("Case 8: an unidentified auditor is not withheld from candidacy merely because management is the only named actor elsewhere (shown gate-blocked / additional-fact, not falsely actor-incompatible)", () => {
    const finding = makeFinding({ recordId: "AC8", provisionLinks: [link("COMPANIES-ACT-141-3-e")], actorRoles: ["statutory_auditor"], allegedConduct: ["auditor_tenure_or_independence_issue"] });
    const result = analyzeScenario({ freeText: "Management breached an unrelated duty. Separately, auditor independence requirements were violated, but the auditor's identity is not stated." }, [finding], [COMPANIES_ACT_141_3_E], []);
    // This provision's own retrieval rule requires the statutory_auditor
    // actor concept as part of its factual topic group (see
    // provision-retrieval-rules.ts) — with the auditor's identity
    // genuinely unstated, this lands in gate-blocked (factual prerequisite
    // unmet), never in provisionResults, but critically NEVER via a false
    // "management is an incompatible actor" determination either.
    const gate = result.gateBlockedProvisionResults.find((g) => g.provision.id === "COMPANIES-ACT-141-3-e");
    expect(gate).toBeDefined();
    expect(gate!.blockReason).toBe("factual_prerequisite");
  });

  it("Case 9: Compliance Officer no breach; CFO false certification adverse candidate", () => {
    const provisions = [LODR_6_GEN, LODR_17_8];
    const findings = [
      makeFinding({ recordId: "AC9-CO", provisionLinks: [link("LODR-6-gen")], transactionTypes: ["compliance_officer_appointment"], allegedConduct: ["compliance_officer_deficiency"] }),
      makeFinding({ recordId: "AC9-CERT", provisionLinks: [link("LODR-17-8")], transactionTypes: ["certification_process"], allegedConduct: ["false_compliance_certification"] }),
    ];
    const result = analyzeScenario({ freeText: "The Compliance Officer fulfilled all duties. Separately, the CFO signed a false compliance certificate." }, findings, provisions, []);
    notBreach(result, "LODR-6-gen");
    isBreach(result, "LODR-17-8");
  });

  it("Case 10: CFO certification no breach; Compliance Officer vacancy adverse candidate", () => {
    const provisions = [LODR_6_GEN, LODR_17_8];
    const findings = [
      makeFinding({ recordId: "AC10-CO", provisionLinks: [link("LODR-6-gen")], transactionTypes: ["compliance_officer_appointment"], allegedConduct: ["compliance_officer_deficiency"] }),
      makeFinding({ recordId: "AC10-CERT", provisionLinks: [link("LODR-17-8")], transactionTypes: ["certification_process"], allegedConduct: ["false_compliance_certification"] }),
    ];
    const result = analyzeScenario({ freeText: "The CFO certification was proper. Separately, the Compliance Officer position remained vacant for six months." }, findings, provisions, []);
    notBreach(result, "LODR-17-8");
    isBreach(result, "LODR-6-gen");
  });

  it("Case 11: an unrelated compatible independent director elsewhere does not need to, and does not, affect a connected Audit Committee chairperson candidate", () => {
    const finding = makeFinding({ recordId: "AC11", provisionLinks: [link("LODR-18-1-d")], transactionTypes: ["audit_committee_process"], allegedConduct: ["audit_committee_deficiency"] });
    const result = analyzeScenario({ freeText: "The Audit Committee chairman presided while meetings were not conducted for the year. Separately, a properly independent director served elsewhere on the Board." }, [finding], [LODR_18_1_D], []);
    isBreach(result, "LODR-18-1-d");
  });

  it("Case 12: an unrelated compliant auditor elsewhere does not neutralise a connected adverse auditor proposition", () => {
    const finding = makeFinding({ recordId: "AC12", provisionLinks: [link("COMPANIES-ACT-141-3-e")], actorRoles: ["statutory_auditor"], allegedConduct: ["auditor_tenure_or_independence_issue"] });
    const result = analyzeScenario({ freeText: "The statutory auditor's business relationship with the company's subsidiary raised an independence issue. A different auditor mentioned elsewhere had no such relationship." }, [finding], [COMPANIES_ACT_141_3_E], []);
    isBreach(result, "COMPANIES-ACT-141-3-e");
  });
});

// ===================================================================
// PART 2 — categorized suite (item 11): 60+ scenarios, holdout from #41
// ===================================================================
describe("Actor-applicability connectivity: categorized suite (60+ scenarios, holdout from #41)", () => {
  const LODR_6_GEN = makeProvision("LODR-6-gen", "Regulation 6", "Compliance Officer appointment.", "LODR Regulations, 2015");
  const LODR_17_8 = makeProvision("LODR-17-8", "Regulation 17(8)", "CEO/CFO compliance certification.", "LODR Regulations, 2015");
  const LODR_18_1_D = makeProvision("LODR-18-1-d", "Regulation 18(1)(d)", "Audit Committee chairperson requirement.", "LODR Regulations, 2015");
  const LODR_18_3 = makeProvision("LODR-18-3-schedule-II", "Regulation 18(3) / Schedule II Part C", "Audit Committee role and responsibilities.", "LODR Regulations, 2015");
  const LODR_16_1_B = makeProvision("LODR-16-1-b", "Regulation 16(1)(b)", "Definition of independent director.", "LODR Regulations, 2015");
  const COMPANIES_ACT_139 = makeProvision("COMPANIES-ACT-139", "Section 139", "Statutory auditor rotation requirement.", "Companies Act, 2013");
  const COMPANIES_ACT_141_3_D = makeProvision("COMPANIES-ACT-141-3-d", "Section 141(3)(d)", "Auditor ineligibility, holding securities.", "Companies Act, 2013");
  const COMPANIES_ACT_141_3_E = makeProvision("COMPANIES-ACT-141-3-e", "Section 141(3)(e)", "Auditor ineligibility, business relationship.", "Companies Act, 2013");
  const LODR_23_2 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
  const SEBI_15HB = makeProvision("SEBI-ACT-15HB", "Section 15HB", "Residual penalty.", "SEBI Act, 1992");

  const ALL_PROVISIONS = [LODR_6_GEN, LODR_17_8, LODR_18_1_D, LODR_18_3, LODR_16_1_B, COMPANIES_ACT_139, COMPANIES_ACT_141_3_D, COMPANIES_ACT_141_3_E, LODR_23_2, SEBI_15HB];

  const CO_F = makeFinding({ recordId: "CX-CO", provisionLinks: [link("LODR-6-gen")], transactionTypes: ["compliance_officer_appointment"], allegedConduct: ["compliance_officer_deficiency"] });
  const CERT_F = makeFinding({ recordId: "CX-CERT", provisionLinks: [link("LODR-17-8")], transactionTypes: ["certification_process"], allegedConduct: ["false_compliance_certification"] });
  // One finding bundling BOTH Audit Committee provisions (same organ, no
  // sibling-conduct-bleed concern since both links share the same subject).
  const AC_F = makeFinding({ recordId: "CX-AC", provisionLinks: [link("LODR-18-1-d"), link("LODR-18-3-schedule-II")], transactionTypes: ["audit_committee_process"], allegedConduct: ["audit_committee_deficiency"] });
  const ID_F = makeFinding({ recordId: "CX-ID", provisionLinks: [link("LODR-16-1-b")], actorRoles: ["independent_director"], allegedConduct: ["director_governance_failure"] });
  const AUD_F = makeFinding({ recordId: "CX-AUD", provisionLinks: [link("COMPANIES-ACT-139"), link("COMPANIES-ACT-141-3-d"), link("COMPANIES-ACT-141-3-e")], actorRoles: ["statutory_auditor"], allegedConduct: ["auditor_tenure_or_independence_issue"] });
  const RPT_F = makeFinding({ recordId: "CX-RPT", provisionLinks: [link("LODR-23-2")], transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"] });
  const DIV_F = makeFinding({ recordId: "CX-DIV", provisionLinks: [link("SEBI-ACT-15HB")], allegedConduct: ["fund_diversion"] });

  const ALL_FINDINGS = [CO_F, CERT_F, AC_F, ID_F, AUD_F, RPT_F, DIV_F];

  // Validated atomic clauses (each independently proven against the real
  // engine — see the diagnostic trace this suite was built from).
  const CO_ADVERSE_UNSTATED = "There was a CO vacancy for six months.";
  const CO_ADVERSE_CONNECTED = "There was an unqualified Compliance Officer.";
  const CO_COMPLIANT = "A qualified Compliance Officer remained continuously appointed throughout the year.";
  const CERT_ADVERSE_UNSTATED = "A false compliance certification was signed.";
  const CERT_ADVERSE_CFO = "The CFO signed a false compliance certificate.";
  const CERT_ADVERSE_CEO = "The CEO signed a false compliance certification despite knowing it was inaccurate.";
  const CERT_ADVERSE_MD = "The Managing Director signed a false compliance certification for the board.";
  const CERT_COMPLIANT = "The CEO/CFO compliance certification was proper and duly signed.";
  const AC_ADVERSE_UNSTATED = "The Audit Committee meetings were not conducted for the year.";
  const AC_ADVERSE_MEMBER = "An Audit Committee member failed to attend meetings not conducted for the year.";
  const AC_ADVERSE_CHAIR = "The Audit Committee chairman presided while meetings were not conducted for the year.";
  const AC_COMPLIANT = "The Audit Committee was properly constituted and met as required.";
  const AUDITOR_ADVERSE_TENURE = "The statutory auditor continued beyond the permitted tenure without rotation.";
  const AUDITOR_ADVERSE_SECURITIES = "The statutory auditor held securities in the company beyond the permitted threshold.";
  const AUDITOR_ADVERSE_RELATIONSHIP = "The statutory auditor's business relationship with the company's subsidiary raised an independence issue.";
  const AUDITOR_COMPLIANT = "The statutory auditor satisfied independence requirements and rotated strictly on time.";
  const PROMOTER_UNRELATED = "The promoter sold shares.";
  const RPT_ADVERSE = "The related-party transaction was not approved by the audit committee.";
  const FUND_DIVERSION_ADVERSE = "The promoter diverted company funds.";

  interface Scenario {
    n: number;
    group: string;
    freeText: string;
    must?: string[];
    mustNot?: string[];
  }

  const SCENARIOS: Scenario[] = [
    // 1. unrelated promoter mention
    { n: 1, group: "unrelated promoter mention", freeText: `${CO_ADVERSE_UNSTATED} ${PROMOTER_UNRELATED}`, must: ["LODR-6-gen"] },
    { n: 2, group: "unrelated promoter mention", freeText: `${CERT_ADVERSE_UNSTATED} ${PROMOTER_UNRELATED}`, must: ["LODR-17-8"] },
    { n: 3, group: "unrelated promoter mention", freeText: `${AC_ADVERSE_UNSTATED} ${PROMOTER_UNRELATED}`, must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    // 2. unrelated director mention
    { n: 4, group: "unrelated director mention", freeText: `${CO_ADVERSE_UNSTATED} A non-executive director was separately named in the matter with no stated Compliance Officer role.`, must: ["LODR-6-gen"] },
    { n: 5, group: "unrelated director mention", freeText: `${CERT_ADVERSE_UNSTATED} A non-executive director was separately named in the matter with no stated role in signing any certificate.`, must: ["LODR-17-8"] },
    // 3. company + promoter mixed
    { n: 6, group: "company + promoter mixed", freeText: `${CO_ADVERSE_UNSTATED} The company and the promoter were both separately named elsewhere in the matter.`, must: ["LODR-6-gen"] },
    // 4. CEO vs CFO
    { n: 7, group: "CEO vs CFO", freeText: CERT_ADVERSE_CFO, must: ["LODR-17-8"] },
    { n: 8, group: "CEO vs CFO", freeText: CERT_ADVERSE_CEO, must: ["LODR-17-8"] },
    { n: 9, group: "CEO vs CFO", freeText: CERT_ADVERSE_MD, must: ["LODR-17-8"] },
    // 5. CEO vs unrelated director
    { n: 10, group: "CEO vs unrelated director", freeText: `${CERT_ADVERSE_CEO} Separately, a non-executive director was named with no stated certification role.`, must: ["LODR-17-8"] },
    // 6. Compliance Officer vs promoter
    { n: 11, group: "Compliance Officer vs promoter", freeText: `${CO_ADVERSE_CONNECTED} Separately, ${PROMOTER_UNRELATED}`, must: ["LODR-6-gen"] },
    { n: 12, group: "Compliance Officer vs promoter", freeText: `${PROMOTER_UNRELATED} Separately, ${CO_ADVERSE_UNSTATED}`, must: ["LODR-6-gen"] },
    // 7. Audit Committee member vs generic director
    { n: 13, group: "Audit Committee member vs generic director", freeText: AC_ADVERSE_MEMBER, must: ["LODR-18-3-schedule-II"] },
    { n: 14, group: "Audit Committee member vs generic director", freeText: `${AC_ADVERSE_UNSTATED} A non-executive director was separately named in the matter with no stated Audit Committee role.`, must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    // 8. Audit Committee chair vs Board chair (bare "chairman" — corpus's
    // own disclosed conservative ambiguity, see provision-actor-applicability.ts)
    { n: 15, group: "Audit Committee chair vs Board chair", freeText: AC_ADVERSE_CHAIR, must: ["LODR-18-1-d"] },
    // 9. independent director A vs independent director B
    { n: 16, group: "independent director A vs B", freeText: `${AC_ADVERSE_CHAIR} Separately, a properly independent director served elsewhere on the Board.`, must: ["LODR-18-1-d"] },
    // 10. statutory auditor vs management
    { n: 17, group: "statutory auditor vs management", freeText: `${AUDITOR_ADVERSE_TENURE} Separately, management approved an unrelated loan.`, must: ["COMPANIES-ACT-139"] },
    { n: 18, group: "statutory auditor vs management", freeText: `${AUDITOR_ADVERSE_SECURITIES} Separately, management approved an unrelated loan.`, must: ["COMPANIES-ACT-141-3-d"] },
    { n: 19, group: "statutory auditor vs management", freeText: `${AUDITOR_ADVERSE_RELATIONSHIP} Separately, management approved an unrelated loan.`, must: ["COMPANIES-ACT-141-3-e"] },
    // 11. two auditors
    { n: 20, group: "two auditors", freeText: `${AUDITOR_ADVERSE_RELATIONSHIP} A different auditor mentioned elsewhere had no such relationship.`, must: ["COMPANIES-ACT-141-3-e"] },
    // 12. two directors
    { n: 21, group: "two directors", freeText: `${AC_ADVERSE_CHAIR} Director B, a proper independent director, served elsewhere on the Board.`, must: ["LODR-18-1-d"] },
    // 13. actor unstated
    { n: 22, group: "actor unstated", freeText: CO_ADVERSE_UNSTATED, must: ["LODR-6-gen"] },
    { n: 23, group: "actor unstated", freeText: CERT_ADVERSE_UNSTATED, must: ["LODR-17-8"] },
    { n: 24, group: "actor unstated", freeText: AC_ADVERSE_UNSTATED, must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    // 14. company only
    { n: 25, group: "company only", freeText: `${CO_ADVERSE_UNSTATED} The company was separately named elsewhere in the matter.`, must: ["LODR-6-gen"] },
    // 15. multiple adverse propositions
    { n: 26, group: "multiple adverse propositions", freeText: `${CO_ADVERSE_UNSTATED} ${CERT_ADVERSE_UNSTATED}`, must: ["LODR-6-gen", "LODR-17-8"] },
    { n: 27, group: "multiple adverse propositions", freeText: `${AUDITOR_ADVERSE_TENURE} ${AC_ADVERSE_UNSTATED}`, must: ["COMPANIES-ACT-139", "LODR-18-3-schedule-II"] },
    // 16. one compliant actor + one adverse actor
    { n: 28, group: "one compliant actor + one adverse actor", freeText: `${CO_COMPLIANT} Separately, ${CERT_ADVERSE_CFO}`, mustNot: ["LODR-6-gen"], must: ["LODR-17-8"] },
    { n: 29, group: "one compliant actor + one adverse actor", freeText: `${CERT_COMPLIANT} Separately, ${CO_ADVERSE_UNSTATED}`, mustNot: ["LODR-17-8"], must: ["LODR-6-gen"] },
    { n: 30, group: "one compliant actor + one adverse actor", freeText: `${AC_COMPLIANT} Separately, ${AUDITOR_ADVERSE_TENURE}`, mustNot: ["LODR-18-3-schedule-II", "LODR-18-1-d"], must: ["COMPANIES-ACT-139"] },
    { n: 31, group: "one compliant actor + one adverse actor", freeText: `${AUDITOR_COMPLIANT} Separately, ${AC_ADVERSE_UNSTATED}`, mustNot: ["COMPANIES-ACT-139"], must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    // 17. one actor with two roles
    { n: 32, group: "one actor with two roles", freeText: `${CERT_ADVERSE_CFO} Separately, the CFO also failed to ensure the Compliance Officer role's own duties were fulfilled.`, must: ["LODR-17-8"] },
    // 18. actor named in previous sentence
    { n: 33, group: "actor named in previous sentence", freeText: `${PROMOTER_UNRELATED} Separately, ${CO_ADVERSE_UNSTATED}`, must: ["LODR-6-gen"] },
    // 19. actor named in following sentence
    { n: 34, group: "actor named in following sentence", freeText: `${CO_ADVERSE_UNSTATED} Separately, ${PROMOTER_UNRELATED}`, must: ["LODR-6-gen"] },
    // 20. "respectively" constructions
    { n: 35, group: "respectively constructions", freeText: "The CFO signed the false compliance certificate, and an allottee separately signed an allotment form, respectively.", must: ["LODR-17-8"] },
    // 21. "whereas/however/but" constructions
    { n: 36, group: "however/but constructions", freeText: "The Audit Committee was properly constituted; however, its meetings were not conducted for the year.", must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    { n: 37, group: "however/but constructions", freeText: `${PROMOTER_UNRELATED} However, ${CO_ADVERSE_UNSTATED}`, must: ["LODR-6-gen"] },
    // 22. unrelated actor in same sentence (must remain blocked — genuine connectivity)
    { n: 38, group: "unrelated actor in same sentence", freeText: "There was a CO vacancy blamed on the promoter, with no stated Compliance Officer role.", mustNot: ["LODR-6-gen"] },
    { n: 39, group: "unrelated actor in same sentence", freeText: "A non-promoter allottee signed a false compliance certificate, with no company officer role of any kind.", mustNot: ["LODR-17-8"] },
    // 23. actor references separated by semicolon
    { n: 40, group: "semicolon-separated actor references", freeText: `${CO_ADVERSE_UNSTATED}; separately, ${PROMOTER_UNRELATED}`, must: ["LODR-6-gen"] },
    // 24. deliberately adversarial actor-name collisions
    { n: 41, group: "adversarial actor-name collisions", freeText: `${CERT_ADVERSE_CFO} Separately, ${CO_ADVERSE_UNSTATED}`, must: ["LODR-17-8", "LODR-6-gen"] },
    { n: 42, group: "adversarial actor-name collisions", freeText: `${AUDITOR_ADVERSE_TENURE} Separately, ${CERT_ADVERSE_UNSTATED}`, must: ["COMPANIES-ACT-139", "LODR-17-8"] },

    // ---- Holdout / adversarial subset (item 11) — #43 onward ----
    { n: 43, group: "unrelated promoter mention (holdout)", freeText: `${AUDITOR_ADVERSE_TENURE} ${PROMOTER_UNRELATED}`, must: ["COMPANIES-ACT-139"] },
    { n: 44, group: "unrelated director mention (holdout)", freeText: `${AC_ADVERSE_UNSTATED} A related-party counterparty was separately named in the matter with no stated Audit Committee role.`, must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    { n: 45, group: "company + promoter mixed (holdout)", freeText: `${CERT_ADVERSE_UNSTATED} Both the company and the promoter were separately named elsewhere in the matter.`, must: ["LODR-17-8"] },
    { n: 46, group: "CEO vs CFO (holdout)", freeText: `${CERT_ADVERSE_CFO} Separately, ${PROMOTER_UNRELATED}`, must: ["LODR-17-8"] },
    { n: 47, group: "CEO vs unrelated director (holdout)", freeText: `${CERT_ADVERSE_MD} Separately, a non-executive director was named with no stated certification role.`, must: ["LODR-17-8"] },
    { n: 48, group: "Compliance Officer vs promoter (holdout)", freeText: `${FUND_DIVERSION_ADVERSE} Separately, ${CO_ADVERSE_UNSTATED}`, must: ["SEBI-ACT-15HB", "LODR-6-gen"] },
    { n: 49, group: "Audit Committee member vs generic director (holdout)", freeText: `${AC_ADVERSE_MEMBER} Separately, ${PROMOTER_UNRELATED}`, must: ["LODR-18-3-schedule-II"] },
    { n: 50, group: "Audit Committee chair vs Board chair (holdout)", freeText: `${AC_ADVERSE_CHAIR} Separately, ${PROMOTER_UNRELATED}`, must: ["LODR-18-1-d"] },
    { n: 51, group: "independent director A vs B (holdout)", freeText: `${AC_ADVERSE_CHAIR} Separately, an unconnected independent director's own eligibility was never in question.`, must: ["LODR-18-1-d"] },
    { n: 52, group: "statutory auditor vs management (holdout)", freeText: `${AUDITOR_ADVERSE_SECURITIES} Separately, management approved an unrelated loan.`, must: ["COMPANIES-ACT-141-3-d"] },
    { n: 53, group: "two auditors (holdout)", freeText: `${AUDITOR_ADVERSE_TENURE} A different auditor mentioned elsewhere rotated strictly on time.`, must: ["COMPANIES-ACT-139"] },
    { n: 54, group: "two directors (holdout)", freeText: `${AC_ADVERSE_MEMBER} Separately, a compatible independent director served without incident elsewhere.`, must: ["LODR-18-3-schedule-II"] },
    { n: 55, group: "actor unstated (holdout)", freeText: `${AC_ADVERSE_UNSTATED}`, must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    { n: 56, group: "company only (holdout)", freeText: `${CERT_ADVERSE_UNSTATED} The company alone was separately named elsewhere in the matter.`, must: ["LODR-17-8"] },
    { n: 57, group: "multiple adverse propositions (holdout)", freeText: `${AUDITOR_ADVERSE_RELATIONSHIP} ${CERT_ADVERSE_UNSTATED}`, must: ["COMPANIES-ACT-141-3-e", "LODR-17-8"] },
    { n: 58, group: "one compliant actor + one adverse actor (holdout)", freeText: `${AC_COMPLIANT} Separately, ${CO_ADVERSE_UNSTATED}`, mustNot: ["LODR-18-3-schedule-II", "LODR-18-1-d"], must: ["LODR-6-gen"] },
    { n: 59, group: "one compliant actor + one adverse actor (holdout)", freeText: `${CO_COMPLIANT} Separately, ${AC_ADVERSE_UNSTATED}`, mustNot: ["LODR-6-gen"], must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    { n: 60, group: "one actor with two roles (holdout)", freeText: `${AUDITOR_ADVERSE_TENURE} Separately, the same statutory auditor's business relationship with the company's subsidiary also raised an independence issue.`, must: ["COMPANIES-ACT-139", "COMPANIES-ACT-141-3-e"] },
    { n: 61, group: "actor named in previous sentence (holdout)", freeText: `${PROMOTER_UNRELATED} Separately, ${CERT_ADVERSE_UNSTATED}`, must: ["LODR-17-8"] },
    { n: 62, group: "actor named in following sentence (holdout)", freeText: `${AC_ADVERSE_UNSTATED} Separately, ${PROMOTER_UNRELATED}`, must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    { n: 63, group: "however/but constructions (holdout)", freeText: `${AUDITOR_COMPLIANT} However, ${CO_ADVERSE_UNSTATED}`, mustNot: ["COMPANIES-ACT-139"], must: ["LODR-6-gen"] },
    { n: 64, group: "unrelated actor in same sentence (holdout)", freeText: "There was non-compliance with the auditor rotation requirement, blamed on the promoter, with no stated auditor identity.", mustNot: ["COMPANIES-ACT-139"] },
    { n: 65, group: "semicolon-separated actor references (holdout)", freeText: `${AC_ADVERSE_UNSTATED}; separately, ${PROMOTER_UNRELATED}`, must: ["LODR-18-3-schedule-II", "LODR-18-1-d"] },
    { n: 66, group: "adversarial actor-name collisions (holdout)", freeText: `${AC_ADVERSE_CHAIR} Separately, ${CERT_ADVERSE_UNSTATED}`, must: ["LODR-18-1-d", "LODR-17-8"] },
    { n: 67, group: "cross-nexus actor collision (holdout)", freeText: `${RPT_ADVERSE} Separately, ${CO_ADVERSE_UNSTATED}`, must: ["LODR-23-2", "LODR-6-gen"] },
  ];

  it("covers at least 60 scenarios across at least 20 mandated categories", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(60);
    const groups = new Set(SCENARIOS.map((s) => s.group));
    expect(groups.size).toBeGreaterThanOrEqual(20);
    expect(SCENARIOS.filter((s) => s.n >= 43).length).toBeGreaterThanOrEqual(25);
  });

  for (const s of SCENARIOS) {
    it(`#${s.n} [${s.group}] ${s.freeText}`, () => {
      const result = analyzeScenario({ freeText: s.freeText }, ALL_FINDINGS, ALL_PROVISIONS, []);
      const ids = breachIds(result);
      if (s.must) for (const id of s.must) expect(ids).toContain(id);
      if (s.mustNot) for (const id of s.mustNot) expect(ids).not.toContain(id);
    });
  }
});
