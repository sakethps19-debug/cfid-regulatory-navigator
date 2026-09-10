// Question-A polarity acceptance pass: permanent regression suite for the
// two categories of literal acceptance-test input the mandate specified
// verbatim — (1) 10 "clean-control" scenarios (A-J) whose facts are, on
// their face, fully compliant, and (2) 8 adverse/compliant paired
// scenarios for the major provision families, where only the breach
// polarity changes between the A and B text of each pair. Every text
// below is reproduced EXACTLY as specified — these are acceptance-test
// inputs, not paraphrased approximations.
//
// Architecture under test (see engine.ts / factPolarity.ts / types.ts):
// a provision only belongs in provisionResults ("candidate breach") when
// at least one ADVERSE (conduct-kind) concept tag was positively matched
// by the entered scenario's own text — for a gated provision, checked
// against the rule's own adverse group(s) via the query's detectedIds;
// otherwise it is either governingProvisionResults (governs the subject,
// no apparent breach — either because the provision has no adverse
// predicate of its own, or because the specific breach fact is simply
// unstated) or contradictedProvisionResults (the entered facts
// affirmatively rule out the adverse predicate). Both of the latter two
// arrays share the "governing_relevant" candidateTier and the
// GoverningProvisionResult shape — together they are the "no apparent
// breach" umbrella the mandate's item 2 describes as buckets B and D.
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
    caseName: "Question-A Polarity Test Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Question-A polarity test finding",
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

/** All ids present anywhere across provisionResults (candidate breach). */
function breachIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.provisionResults.map((p) => p.provision.id);
}
/** All ids present anywhere across the two "no apparent breach" arrays. */
function noBreachIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return [...result.governingProvisionResults.map((p) => p.provision.id), ...result.contradictedProvisionResults.map((p) => p.provision.id)];
}

describe("Question-A polarity: mandatory clean-control scenarios (permanent regression)", () => {
  it("Scenario A: clean RPT — zero candidate breaches; RPT/Ind AS provisions governing only", () => {
    const provisions = [
      makeProvision("LODR-23-1", "Regulation 23(1)", "RPT materiality threshold.", "LODR Regulations, 2015"),
      makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015"),
      makeProvision("LODR-23-4", "Regulation 23(4)", "Shareholder approval of material RPTs.", "LODR Regulations, 2015"),
      makeProvision("IND-AS-24", "Ind AS 24", "Related Party Disclosures.", "Indian Accounting Standards"),
      makeProvision("PFUTP-3-d", "Regulation 3(d)", "Fraud/deceit in connection with dealing in securities.", "PFUTP Regulations, 2003"),
      makeProvision("SEBI-ACT-27", "Section 27", "Offences by companies — attribution.", "SEBI Act, 1992"),
    ];
    const finding = makeFinding({
      recordId: "QA-A-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      transactionTypes: ["related_party_transaction"],
      allegedConduct: ["related_party_misrepresentation", "financial_statement_misstatement"],
    });
    const freeText =
      "An arm's-length related-party transaction was duly approved by the Audit Committee and shareholders wherever required, properly accounted for under applicable accounting standards, and fully disclosed.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
    // The RPT/Ind AS family must be visible as governing, never silently dropped.
    expect(noBreachIds(result)).toEqual(expect.arrayContaining(["LODR-23-1"]));
  });

  it("Scenario B: genuine sales — zero fictitious-sales/fraud candidate breaches", () => {
    const provisions = [
      makeProvision("LODR-48", "Regulation 48", "Compliance with accounting standards.", "LODR Regulations, 2015"),
      makeProvision("IND-AS-1", "Ind AS 1", "Presentation of Financial Statements.", "Indian Accounting Standards"),
      makeProvision("PFUTP-3-a", "Regulation 3(a)", "Fraudulent dealing in securities.", "PFUTP Regulations, 2003"),
    ];
    const finding = makeFinding({
      recordId: "QA-B-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      transactionTypes: ["financial_statement_disclosure"],
      allegedConduct: ["fictitious_sales_or_revenue", "financial_statement_misstatement"],
    });
    const freeText =
      "The company's sales were genuine and supported by GST records, delivery documents, customer confirmations and bank receipts. There was no fictitious revenue or false financial statement.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
  });

  it("Scenario C: no diversion — zero diversion/fraud candidate breaches", () => {
    const provisions = [
      makeProvision("SEBI-ACT-15HB", "Section 15HB", "Residual penalty.", "SEBI Act, 1992"),
      makeProvision("PFUTP-4-1", "Regulation 4(1)", "General prohibition on fraud/unfair trade practice.", "PFUTP Regulations, 2003"),
    ];
    const finding = makeFinding({
      recordId: "QA-C-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      actorRoles: ["promoter"],
      allegedConduct: ["fund_diversion"],
    });
    const freeText = "Bank records establish that company funds were used strictly for stated business purposes and no funds were diverted, siphoned or routed to promoters.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
  });

  it("Scenario D: full summons cooperation — zero investigation candidate breaches; SEBI powers never entity contraventions", () => {
    const provisions = [
      makeProvision("SEBI-ACT-11C-3", "Section 11C(3)", "Power to require production of records.", "SEBI Act, 1992"),
      makeProvision("SEBI-ACT-11-2-i", "Section 11(2)(i)", "SEBI power to inspect books/registers.", "SEBI Act, 1992"),
      makeProvision("SEBI-ACT-11-2-ia", "Section 11(2)(ia)", "SEBI power to call for information.", "SEBI Act, 1992"),
    ];
    const finding = makeFinding({
      recordId: "QA-D-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      transactionTypes: ["investigation_process"],
      allegedConduct: ["non_cooperation_with_investigation"],
    });
    const freeText = "The company and its officers complied with every summons and furnished all requested records completely and on time.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
    // The specific defect named in the mandate: SEBI-ACT-11-2-i/-ia must
    // never appear as an entity contravention on a full-cooperation
    // scenario, and must not be silently dropped either — governing only.
    expect(noBreachIds(result)).toEqual(expect.arrayContaining(["SEBI-ACT-11-2-i", "SEBI-ACT-11-2-ia"]));
  });

  it("Scenario E: compliant preferential allotment — zero ICDR candidate breaches", () => {
    const provisions = [
      makeProvision("ICDR-158-CH-V", "Regulation 158", "Preferential-issue guidelines.", "ICDR Regulations, 2018"),
      makeProvision("ICDR-160", "Regulation 160", "Full payment at allotment.", "ICDR Regulations, 2018"),
      makeProvision("ICDR-167", "Regulation 167", "Lock-in of preferential allottees.", "ICDR Regulations, 2018"),
    ];
    const finding = makeFinding({
      recordId: "QA-E-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      transactionTypes: ["preferential_allotment"],
      allegedConduct: ["sham_preferential_allotment", "unsupported_share_allotment_consideration"],
    });
    const freeText = "Preferential allotment was fully paid, correctly priced, properly approved and the applicable lock-in was complied with.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
    expect(noBreachIds(result)).toEqual(expect.arrayContaining(["ICDR-158-CH-V"]));
  });

  it("Scenario F: compliant issue proceeds — zero issue-proceeds/diversion candidate breaches", () => {
    const provisions = [makeProvision("LODR-32", "Regulation 32", "Issue-proceeds monitoring and disclosure.", "LODR Regulations, 2015")];
    const finding = makeFinding({
      recordId: "QA-F-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      transactionTypes: ["rights_issue"],
      allegedConduct: ["fund_diversion", "financial_statement_misstatement"],
    });
    const freeText = "Rights/issue proceeds were utilised exactly for the stated objects and independently certified. No diversion or misstatement occurred.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
    expect(noBreachIds(result)).toEqual(expect.arrayContaining(["LODR-32"]));
  });

  it("Scenario G: proper Audit Committee — zero Audit Committee governance candidate breaches", () => {
    const provisions = [makeProvision("LODR-18-1-d", "Regulation 18(1)(d)", "Audit Committee constitution and functioning.", "LODR Regulations, 2015")];
    const finding = makeFinding({
      recordId: "QA-G-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      transactionTypes: ["annual_report_disclosure"],
      allegedConduct: ["audit_committee_deficiency"],
    });
    const freeText = "The Audit Committee was properly constituted, met as required and discharged all applicable functions.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
  });

  it("Scenario H: compliant auditor — zero auditor/Companies Act candidate breaches", () => {
    const provisions = [
      makeProvision("COMPANIES-ACT-139", "Section 139", "Auditor rotation.", "Companies Act, 2013"),
      makeProvision("COMPANIES-ACT-141-3-d", "Section 141(3)(d)", "Auditor disqualification — securities/interest.", "Companies Act, 2013"),
      makeProvision("COMPANIES-ACT-141-3-e", "Section 141(3)(e)", "Auditor disqualification — business relationship.", "Companies Act, 2013"),
    ];
    const finding = makeFinding({
      recordId: "QA-H-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      actorRoles: ["statutory_auditor"],
      evidenceTypes: ["audited_financial_statements"],
      allegedConduct: ["auditor_tenure_or_independence_issue"],
    });
    const freeText = "The statutory auditor satisfied independence and eligibility requirements and obtained sufficient appropriate audit evidence.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
    expect(noBreachIds(result)).toEqual(expect.arrayContaining(["COMPANIES-ACT-139"]));
  });

  it("Scenario I: genuine price rise — zero market-manipulation/PFUTP candidate breaches", () => {
    const provisions = [
      makeProvision("PFUTP-4-2-a", "Regulation 4(2)(a)", "False appearance of trading.", "PFUTP Regulations, 2003"),
      makeProvision("PFUTP-4-2-e", "Regulation 4(2)(e)", "Manipulation of security price.", "PFUTP Regulations, 2003"),
      makeProvision("SEBI-ACT-12A-a", "Section 12A(a)", "Manipulative/deceptive device.", "SEBI Act, 1992"),
      makeProvision("SEBI-ACT-15HA", "Section 15HA", "Penalty for fraudulent and unfair trade practices.", "SEBI Act, 1992"),
    ];
    const finding = makeFinding({
      recordId: "QA-I-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      allegedConduct: ["actual_price_manipulation", "false_appearance_of_trading"],
    });
    const freeText = "The share price increased following genuine earnings improvement. There were no synchronized trades, wash trades, false disclosures or manipulative conduct.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
  });

  it("Scenario J: unrelated ordinary purchase — zero candidate breaches", () => {
    const provisions = [
      makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015"),
      makeProvision("PFUTP-3-d", "Regulation 3(d)", "Fraud/deceit in connection with dealing in securities.", "PFUTP Regulations, 2003"),
    ];
    const finding = makeFinding({
      recordId: "QA-J-01",
      provisionLinks: provisions.map((p) => link(p.id)),
      allegedConduct: ["related_party_misrepresentation"],
    });
    const freeText = "The company purchased goods from an unrelated third-party vendor in the ordinary course of business on arm's-length terms.";
    const result = analyzeScenario({ freeText }, [finding], provisions, []);

    expect(breachIds(result)).toEqual([]);
  });
});

describe("Question-A polarity: mandatory adverse/compliant paired tests (permanent regression)", () => {
  it("RPT: 'not approved' is a candidate breach; 'approved' is governing only, not a breach", () => {
    const provision = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
    const finding = makeFinding({
      recordId: "QA-PAIR-RPT",
      provisionLinks: [link(provision.id)],
      transactionTypes: ["related_party_transaction"],
      allegedConduct: ["rpt_approval_lapse"],
    });
    const adverse = analyzeScenario({ freeText: "RPT not approved by Audit Committee." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "RPT approved by Audit Committee." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("LODR-23-2");
    expect(breachIds(compliant)).not.toContain("LODR-23-2");
    expect(noBreachIds(compliant)).toContain("LODR-23-2");
  });

  it("Regulation 30: non-disclosure of material litigation is a candidate breach; timely disclosure is not", () => {
    const provision = makeProvision("LODR-30", "Regulation 30", "Disclosure of material events.", "LODR Regulations, 2015");
    const finding = makeFinding({
      recordId: "QA-PAIR-REG30",
      provisionLinks: [link(provision.id)],
      transactionTypes: ["material_event_disclosure"],
      allegedConduct: ["non_disclosure_of_information"],
    });
    const adverse = analyzeScenario({ freeText: "Material litigation was not disclosed." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "Material litigation was timely and accurately disclosed." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("LODR-30");
    expect(breachIds(compliant)).not.toContain("LODR-30");
    expect(noBreachIds(compliant)).toContain("LODR-30");
  });

  it("Regulation 33: fictitious revenue in published results is a candidate breach; accurate/timely filing is not", () => {
    const provision = makeProvision("LODR-33-1-gen", "Regulation 33(1)", "Preparation of financial results.", "LODR Regulations, 2015");
    const finding = makeFinding({
      recordId: "QA-PAIR-REG33",
      provisionLinks: [link(provision.id)],
      transactionTypes: ["financial_statement_disclosure"],
      allegedConduct: ["fictitious_sales_or_revenue"],
    });
    const adverse = analyzeScenario({ freeText: "Published quarterly results contained material fictitious revenue." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "Quarterly results were accurate and timely filed." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("LODR-33-1-gen");
    expect(breachIds(compliant)).not.toContain("LODR-33-1-gen");
    expect(noBreachIds(compliant)).toContain("LODR-33-1-gen");
  });

  it("Investigation: ignored summons is a candidate breach; full compliance is not", () => {
    const provision = makeProvision("SEBI-ACT-11C-3", "Section 11C(3)", "Power to require production of records.", "SEBI Act, 1992");
    const finding = makeFinding({
      recordId: "QA-PAIR-INVEST",
      provisionLinks: [link(provision.id)],
      transactionTypes: ["investigation_process"],
      allegedConduct: ["non_cooperation_with_investigation"],
    });
    const adverse = analyzeScenario({ freeText: "Repeated summons were ignored." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "All summons were complied with." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("SEBI-ACT-11C-3");
    expect(breachIds(compliant)).not.toContain("SEBI-ACT-11C-3");
    expect(noBreachIds(compliant)).toContain("SEBI-ACT-11C-3");
  });

  it("Preferential allotment: circularly-funded consideration is a candidate breach; independently paid/verified is not", () => {
    const provision = makeProvision("ICDR-160", "Regulation 160", "Full payment at allotment.", "ICDR Regulations, 2018");
    const finding = makeFinding({
      recordId: "QA-PAIR-PREF",
      provisionLinks: [link(provision.id)],
      transactionTypes: ["preferential_allotment"],
      allegedConduct: ["unsupported_share_allotment_consideration"],
    });
    const adverse = analyzeScenario({ freeText: "Allotment consideration was circularly funded by issuer." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "Allotment consideration was independently paid and verified." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("ICDR-160");
    expect(breachIds(compliant)).not.toContain("ICDR-160");
    expect(noBreachIds(compliant)).toContain("ICDR-160");
  });

  it("Issue proceeds: diversion to promoter-controlled entities is a candidate breach; use exactly as stated is not", () => {
    const provision = makeProvision("LODR-32", "Regulation 32", "Issue-proceeds monitoring and disclosure.", "LODR Regulations, 2015");
    const finding = makeFinding({
      recordId: "QA-PAIR-ISSUE",
      provisionLinks: [link(provision.id)],
      transactionTypes: ["rights_issue"],
      allegedConduct: ["fund_diversion"],
    });
    const adverse = analyzeScenario({ freeText: "Issue proceeds were diverted to promoter-controlled entities." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "Issue proceeds were used exactly for stated objects." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("LODR-32");
    expect(breachIds(compliant)).not.toContain("LODR-32");
    expect(noBreachIds(compliant)).toContain("LODR-32");
  });

  it("Governance (Compliance Officer): vacancy beyond the permitted period is a candidate breach; continuous qualified appointment is not", () => {
    // Checkpoint correction 2, item 2: a bare vacancy fact is gated on
    // compliance_officer_deficiency (LODR-6-gen), never on the
    // duty-performance-specific LODR-6(2)(a) (compliance_officer_duty_failure).
    const provision = makeProvision("LODR-6-gen", "Regulation 6", "Compliance Officer appointment.", "LODR Regulations, 2015");
    const finding = makeFinding({
      recordId: "QA-PAIR-GOV",
      provisionLinks: [link(provision.id)],
      transactionTypes: ["compliance_officer_appointment"],
      allegedConduct: ["compliance_officer_deficiency"],
    });
    const adverse = analyzeScenario({ freeText: "Compliance Officer position remained vacant beyond permitted period." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "Qualified Compliance Officer remained continuously appointed." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("LODR-6-gen");
    expect(breachIds(compliant)).not.toContain("LODR-6-gen");
    expect(noBreachIds(compliant)).toContain("LODR-6-gen");
  });

  it("Auditor: failed independence/eligibility is a candidate breach; satisfied independence is not", () => {
    // Checkpoint correction B retired the ungated synthetic-provision
    // vehicle this test previously used (COMPANIES-ACT-141-3-i, "ungated,
    // synthetic") — an ungated provision can no longer reach breachIds
    // purely through a linked precedent's conduct-tag overlap. Retargeted
    // to the real, independently gated COMPANIES-ACT-141-3-d
    // (requireAllOfGroups: [["statutory_auditor"], ["auditor_tenure_or_
    // independence_issue"]], actor-restricted to statutory_auditor) — both
    // freeText variants now name "statutory auditor" so the real gate's
    // own topic group is satisfied, exercising the exact same
    // adverse/compliant polarity flip this test exists to prove, on a
    // genuine provision rather than a fabricated one.
    const provision = makeProvision("COMPANIES-ACT-141-3-d", "Section 141(3)(d)", "Statutory auditor financial-position disqualification.", "Companies Act, 2013");
    const finding = makeFinding({
      recordId: "QA-PAIR-AUDITOR",
      provisionLinks: [link(provision.id)],
      allegedConduct: ["auditor_tenure_or_independence_issue"],
    });
    const adverse = analyzeScenario({ freeText: "The statutory auditor failed the independence eligibility requirement." }, [finding], [provision], []);
    const compliant = analyzeScenario({ freeText: "The statutory auditor satisfied independence requirements." }, [finding], [provision], []);

    expect(breachIds(adverse)).toContain("COMPANIES-ACT-141-3-d");
    expect(breachIds(compliant)).not.toContain("COMPANIES-ACT-141-3-d");
  });
});
