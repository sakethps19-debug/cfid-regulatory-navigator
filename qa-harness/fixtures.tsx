// Synthetic fixture data for the QA harness. See qa-harness/README.md for
// the safety design. Values are modeled on already-public, already-official
// SEBI order content this repository's own commit history and existing
// vitest fixtures (e.g. tests/case-journey.test.ts) already reference by
// name and matter_id -- never a raw dump of confidential/unpublished/
// market-sensitive material, and never written back to Supabase.
import type { LegalProvision, Order, OrderNoticee, ProvisionVersion, ScenarioFinding, DirectionOutcome, Matter } from "@/types/domain";
import type { ComparisonRow } from "@/lib/scenarioComparison";

function order(overrides: Partial<Order> & { id: string }): Order {
  return {
    caseName: "Fixture Case Limited",
    orderStage: "Final order",
    orderDate: null,
    orderNumber: null,
    authority: "Securities and Exchange Board of India",
    noticeesCount: 0,
    officialUrl: "https://www.sebi.gov.in/enforcement/orders/fixture.html",
    cfidVerified: true,
    cfidVerificationBasis: "cfid_tag_in_order_number",
    proceduralStatus: "",
    processingStage: "legally_reviewed",
    retrievalStatus: "",
    retrievalFailureReason: null,
    scopeNote: null,
    matterId: null,
    officialOrderTitle: null,
    normalizedMatterName: null,
    ...overrides,
  };
}

function finding(overrides: Partial<ScenarioFinding> & { recordId: string }): ScenarioFinding {
  return {
    caseName: "Fixture Case Limited",
    orderIds: [],
    category: "Diversion / siphoning of funds",
    scenarioTitle: "Fixture finding",
    factualPattern: "Fixture factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/fixture.html",
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
    humanLegalReviewCompleted: true,
    publicationStatus: "Published to search",
    ...overrides,
  };
}

function provision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "PFUTP Regulations, 2003",
    provisionNumber: overrides.id,
    subject: null,
    currentTextVerificationStatus: "Requires verification",
    officialSource: "https://www.sebi.gov.in/legal/regulations/fixture.html",
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// Rajesh Exports-shaped fixture (matter_id matches tests/case-journey.test.ts
// -- 2dbf409c-8e55-49b8-911c-16a1fda47962 -- confirmed via a read-only
// Supabase query during the independent-audit pass; case name, order type,
// order date, and the noticee list are the real, already-public values
// confirmed the same way).
// ---------------------------------------------------------------------
export const REL_ORDER: Order = order({
  id: "fixture-rel-order",
  caseName: "Rajesh Exports Limited",
  orderStage: "Interim order",
  orderDate: "2026-06-03",
  orderNumber: "WTM/AB/CFID/CFID-SEC-1/12345/2026-27",
  matterId: "2dbf409c-8e55-49b8-911c-16a1fda47962",
  officialOrderTitle: null,
  // Post-freeze correction pass (Section I): replaced with the ACTUAL
  // production orders.scope_note for this order (queried read-only during
  // this pass) rather than the earlier paraphrase -- this is already
  // public, already-official-source content (see this file's own header
  // comment on what fixtures may contain), and using the real text,
  // including its "(1) ...; (2) ..." / "Directions: ..." structure, is
  // what actually exercises parseScopeNoteSections's bulleted-list
  // rendering in this harness instead of silently falling back to a
  // plain paragraph.
  scopeNote:
    "Ad-interim ex-parte interim order re Rajesh Exports Limited (REL, gold refiner/exporter, brand SHUBH Jewellers) " +
    "and promoter/Executive Chairman Rajesh Mehta. Prima facie findings (investigation ongoing, not yet final): " +
    "(1) fictitious sale/purchase transactions worth Rs.11,487cr/11,488cr fabricated against Rajesh Mehta's personal " +
    "gold-derivative trading losses via stockbroker Affluence (which confirmed REL was never its client); " +
    "(2) consolidated financials ~99% dependent on unverifiable overseas subsidiary revenue via an " +
    'internally-contradictory consolidation methodology; (3) untraceable Rs.1,035cr "Investment in Gold Mines in ' +
    "Africa\"; (4) opaque netting of Rs.2,914cr receivables against payables and unreconciled intra-group " +
    "investments/payables; (5) Rs.338.9cr routed through Rajesh Mehta's/Siddharth Mehta's personal accounts " +
    "undisclosed as RPTs; (6) non-cooperation/obstruction of SEBI and the Forensic Auditor (withheld ERP/books, " +
    "contradictory submissions across 3 stages). Directions: Rajesh Mehta (Noticee 2) restrained from dealing in " +
    "REL securities until further orders; REL (Noticee 1) directed to cooperate and make true LODR disclosures; no " +
    "penalties yet imposed (investigation to continue with new forensic auditor); matter referred to NFRA re " +
    "statutory auditors.",
});

export const REL_NOTICEES: OrderNoticee[] = [
  { orderId: REL_ORDER.id, fullName: "Rajesh Exports Limited", entityType: "Company", role: "Company" },
  { orderId: REL_ORDER.id, fullName: "Rajesh Mehta", entityType: "Individual", role: "Promoter" },
];

export const REL_FINDINGS: ScenarioFinding[] = [
  finding({
    recordId: "REL-01",
    caseName: REL_ORDER.caseName,
    orderIds: [REL_ORDER.id],
    scenarioTitle: "Fictitious sale/purchase transactions fabricated against personal derivative trading losses",
    factualPattern:
      "Bank statement and books-of-account analysis found fictitious sale/purchase transactions recorded to offset " +
      "personal gold-derivative trading losses incurred through stockbroker Affluence, which confirmed the company " +
      "was never its client.",
    findingStatus: "Prima facie",
    provisionIds: ["PFUTP-2-1-c", "SEBI-ACT-12A"],
    provisionLinks: [
      { provisionId: "PFUTP-2-1-c", justifyingTags: [] },
      { provisionId: "SEBI-ACT-12A", justifyingTags: [] },
    ],
    category: "Fictitious sales or assets",
  }),
  finding({
    recordId: "REL-05",
    caseName: REL_ORDER.caseName,
    orderIds: [REL_ORDER.id],
    scenarioTitle: "Rs. 338.9 crore routed through promoter's and his relative's personal bank accounts without Board/Audit Committee approval or related-party disclosure",
    factualPattern:
      "Bank statement analysis for Apr 2020-Sep 2025 showed REL transferred Rs.338.90cr to Rajesh Mehta's personal " +
      "accounts, with Rs.232.44cr transferred back, leaving a net outflow of Rs.106.39cr. None of these transfers " +
      "were disclosed as related party transactions in REL's Annual Reports, and minutes of Board and Audit " +
      "Committee meetings showed no approval for routing corporate funds through his personal accounts.",
    findingStatus: "Prima facie",
    provisionIds: ["LODR-23-2", "PFUTP-3-a", "PFUTP-4-1"],
    provisionLinks: [
      { provisionId: "LODR-23-2", justifyingTags: [] },
      { provisionId: "PFUTP-3-a", justifyingTags: [] },
      { provisionId: "PFUTP-4-1", justifyingTags: [] },
    ],
    transactionTypes: ["fund_routed_personal_account"],
    category: "Related-party transaction irregularities",
  }),
];

export const REL_PROVISIONS: LegalProvision[] = [
  provision({ id: "PFUTP-2-1-c", provisionNumber: "2(1)(c)", instrument: "PFUTP Regulations, 2003", subject: "Fraud (inducement/intent test)" }),
  provision({ id: "SEBI-ACT-12A", provisionNumber: "12A", instrument: "SEBI Act, 1992", subject: "Prohibition of manipulative and deceptive devices" }),
  provision({ id: "LODR-23-2", provisionNumber: "23(2)", instrument: "SEBI (LODR) Regulations, 2015", subject: "Related party transaction approval" }),
  provision({ id: "PFUTP-3-a", provisionNumber: "3(a)", instrument: "PFUTP Regulations, 2003", subject: "Indulging in fraudulent/unfair trade practice" }),
];

// The exact provisionIds the real curated "Diversion / Siphoning /
// Misutilisation of Funds" fixed scenario (src/data/curated/fixed-scenarios.ts)
// references, so resolveAllFixedScenarios resolves a non-empty scenario for
// the Fixed Analyzer screens below -- reusing the REAL curated registry, not
// a fixture reimplementation of it.
export const DIVERSION_SCENARIO_PROVISIONS: LegalProvision[] = [
  provision({ id: "SEBI-ACT-12A-a", provisionNumber: "12A(a)", instrument: "SEBI Act, 1992" }),
  provision({ id: "SEBI-ACT-12A-b", provisionNumber: "12A(b)", instrument: "SEBI Act, 1992" }),
  provision({ id: "SEBI-ACT-12A-c", provisionNumber: "12A(c)", instrument: "SEBI Act, 1992" }),
  provision({ id: "PFUTP-3-b", provisionNumber: "3(b)", instrument: "PFUTP Regulations, 2003" }),
  provision({ id: "PFUTP-3-c", provisionNumber: "3(c)", instrument: "PFUTP Regulations, 2003" }),
  provision({ id: "PFUTP-3-d", provisionNumber: "3(d)", instrument: "PFUTP Regulations, 2003" }),
  provision({ id: "PFUTP-4-1", provisionNumber: "4(1)", instrument: "PFUTP Regulations, 2003", subject: "Explanation: diversion, misutilisation or siphoning off of assets/earnings" }),
  provision({ id: "PFUTP-4-2-e", provisionNumber: "4(2)(e)", instrument: "PFUTP Regulations, 2003" }),
  provision({ id: "PFUTP-4-2-f", provisionNumber: "4(2)(f)", instrument: "PFUTP Regulations, 2003" }),
  provision({ id: "PFUTP-4-2-k", provisionNumber: "4(2)(k)", instrument: "PFUTP Regulations, 2003" }),
  provision({ id: "PFUTP-4-2-r", provisionNumber: "4(2)(r)", instrument: "PFUTP Regulations, 2003" }),
];

// ---------------------------------------------------------------------
// Seacoast-shaped fixture (matter_id 60bbd426-879c-47e7-bd4d-038c148b416c,
// interim_cum_show_cause_notice -> final_order, same matter -- confirmed the
// same way).
// ---------------------------------------------------------------------
export const SEACOAST_INTERIM: Order = order({
  id: "fixture-sssl-interim",
  caseName: "Seacoast Shipping Services Limited",
  orderStage: "Interim order cum show cause notice",
  orderDate: "2024-09-30",
  matterId: "60bbd426-879c-47e7-bd4d-038c148b416c",
  scopeNote: "Interim order cum show cause notice examining fund diversion and disclosure irregularities.",
});

export const SEACOAST_FINAL: Order = order({
  id: "fixture-sssl-final",
  caseName: "Seacoast Shipping Services Limited",
  orderStage: "Final order",
  orderDate: "2025-09-24",
  matterId: "60bbd426-879c-47e7-bd4d-038c148b416c",
  scopeNote: "Final order disposing of the show cause notice; one allegation not established, others confirmed.",
});

export const SEACOAST_FINDINGS: ScenarioFinding[] = [
  finding({
    recordId: "SSSL-01",
    caseName: SEACOAST_INTERIM.caseName,
    orderIds: [SEACOAST_INTERIM.id, SEACOAST_FINAL.id],
    scenarioTitle: "Diversion of issue proceeds to related entities",
    findingStatus: "Confirmed in Final Order",
    provisionIds: ["PFUTP-4-2-e"],
    provisionLinks: [{ provisionId: "PFUTP-4-2-e", justifyingTags: [] }],
    transactionTypes: ["fund_diversion"],
    category: "Diversion / siphoning of funds",
  }),
  finding({
    recordId: "SSSL-03",
    caseName: SEACOAST_FINAL.caseName,
    orderIds: [SEACOAST_FINAL.id],
    scenarioTitle: "Alleged non-disclosure of a material related-party transaction",
    findingStatus: "Not Confirmed in Final Order",
    provisionIds: ["LODR-23-2"],
    provisionLinks: [{ provisionId: "LODR-23-2", justifyingTags: [] }],
    category: "Related-party transaction irregularities",
  }),
];

// ---------------------------------------------------------------------
// 6 synthetic diversion orders, to exercise the Fixed Analyzer's ">5
// Relevant CFID Orders, expandable" state (INITIAL_VISIBLE_ORDERS = 5 in
// FixedScenarioAnalyzer.tsx).
// ---------------------------------------------------------------------
export const MANY_DIVERSION_ORDERS: Order[] = Array.from({ length: 6 }, (_, i) =>
  order({
    id: `fixture-diversion-${i + 1}`,
    caseName: `Diversion Matter ${i + 1} Limited`,
    orderStage: i % 2 === 0 ? "Final order" : "Interim order",
    orderDate: `2025-0${(i % 9) + 1}-15`,
  })
);

export const MANY_DIVERSION_FINDINGS: ScenarioFinding[] = MANY_DIVERSION_ORDERS.map((o, i) =>
  finding({
    recordId: `DIV-${i + 1}`,
    caseName: o.caseName,
    orderIds: [o.id],
    scenarioTitle: "Diversion of company funds through promoter-controlled entities",
    findingStatus: i % 3 === 0 ? "Confirmed in Final Order" : "Prima facie",
    provisionIds: ["PFUTP-4-1"],
    provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [] }],
    transactionTypes: ["fund_diversion"],
    category: "Diversion / siphoning of funds",
  })
);

// ---------------------------------------------------------------------
// A generic, low-complexity Order (empty/incomplete-metadata state).
// ---------------------------------------------------------------------
export const EMPTY_METADATA_ORDER: Order = order({
  id: "fixture-empty-metadata",
  caseName: "Newly Indexed Matter Limited",
  orderStage: "Other",
  orderDate: null,
  orderNumber: null,
  officialOrderTitle: null,
});

// ---------------------------------------------------------------------
// Provision-version fixtures for Provision Detail (officially verified /
// order-cited / requires-verification, so all three provenance states are
// exercised on one screen).
// ---------------------------------------------------------------------
export const PROVISION_VERSIONS: ProvisionVersion[] = [
  {
    id: "v1",
    provisionId: "PFUTP-2-1-c",
    versionLabel: "As amended, in force",
    effectiveFrom: "2018-09-19",
    effectiveTo: null,
    exactText:
      '"Fraud" includes any act, expression, omission or concealment committed whether in a deceitful manner or not by a person ' +
      "or by any other person with his connivance or by his agent while dealing in securities in order to induce another " +
      "person or his agent to deal in securities, whether or not there is any wrongful gain or avoidance of any loss.",
    sourceUrl: "https://www.sebi.gov.in/legal/regulations/pfutp.html",
    status: "officially_verified",
  },
  {
    id: "v2",
    provisionId: "PFUTP-2-1-c",
    versionLabel: "Reproduced in Rajesh Exports Limited interim order",
    effectiveFrom: "2018-09-19",
    effectiveTo: null,
    exactText: null,
    sourceUrl: "https://www.sebi.gov.in/enforcement/orders/fixture.html",
    status: "order_cited_text_only",
  },
  {
    id: "v3",
    provisionId: "PFUTP-2-1-c",
    versionLabel: "Pre-2018 version",
    effectiveFrom: "2003-05-17",
    effectiveTo: "2018-09-18",
    exactText: null,
    sourceUrl: null,
    status: "requires_verification",
  },
];

export const PROVISION_DETAIL_SUBJECT: LegalProvision = provision({
  id: "PFUTP-2-1-c",
  provisionNumber: "2(1)(c)",
  instrument: "PFUTP Regulations, 2003",
  issuingAuthority: "SEBI",
  subject: 'Definition of "fraud" (inducement/intent test)',
});

// ---------------------------------------------------------------------
// Case Library rows: a mix of stages/completeness, including a long case
// name and >3 issue chips, for the density/wrapping review.
// ---------------------------------------------------------------------
export const CASE_LIBRARY_ORDERS: Order[] = [
  REL_ORDER,
  SEACOAST_INTERIM,
  SEACOAST_FINAL,
  order({
    id: "fixture-many-issues",
    caseName: "Consolidated Multi-Issue Industries and Financial Holdings Private Limited",
    orderStage: "Confirmatory order",
    orderDate: "2025-11-12",
    officialOrderTitle: null,
  }),
  EMPTY_METADATA_ORDER,
];

export const CASE_LIBRARY_FINDINGS: ScenarioFinding[] = [
  ...REL_FINDINGS,
  ...SEACOAST_FINDINGS,
  finding({
    recordId: "MULTI-01",
    caseName: "Consolidated Multi-Issue Industries and Financial Holdings Private Limited",
    orderIds: ["fixture-many-issues"],
    category: "Financial misstatement",
  }),
  finding({
    recordId: "MULTI-02",
    caseName: "Consolidated Multi-Issue Industries and Financial Holdings Private Limited",
    orderIds: ["fixture-many-issues"],
    category: "Audit committee / governance irregularities",
  }),
  finding({
    recordId: "MULTI-03",
    caseName: "Consolidated Multi-Issue Industries and Financial Holdings Private Limited",
    orderIds: ["fixture-many-issues"],
    category: "Compliance officer irregularities",
  }),
  finding({
    recordId: "MULTI-04",
    caseName: "Consolidated Multi-Issue Industries and Financial Holdings Private Limited",
    orderIds: ["fixture-many-issues"],
    category: "False or misleading disclosures",
  }),
];

// ---------------------------------------------------------------------
// COMPARE SCENARIOS: ComparisonRow[] built directly (this module's own
// shape is already exactly what the real page needs -- no need to run
// the matching functions), covering interim+final mix, negative
// precedent, finding-level-only provenance, long directions, and several
// provisions across matters. Diversion / Siphoning / Misutilisation of
// Funds is reused as the compared scenario throughout.
// ---------------------------------------------------------------------
function direction(overrides: Partial<DirectionOutcome> & { id: string; orderId: string; caseName: string }): DirectionOutcome {
  return {
    stage: "Final order",
    directionOrOutcome: "Direction text.",
    paragraphReference: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/fixture.html",
    ...overrides,
  };
}

const REL_MATTER: Matter = { id: "2dbf409c-8e55-49b8-911c-16a1fda47962", normalizedMatterName: "Rajesh Exports Limited", description: null };
const SEACOAST_MATTER: Matter = { id: "60bbd426-879c-47e7-bd4d-038c148b416c", normalizedMatterName: "Seacoast Shipping Services Limited", description: null };

const DB_REALTY_ORDER: Order = order({
  id: "fixture-db-realty",
  caseName: "DB Realty Limited",
  orderStage: "Final order",
  orderDate: "2025-02-04",
});
const DB_REALTY_MATTER: Matter = { id: "db-realty-matter", normalizedMatterName: "DB Realty Limited", description: null };

const MAX_FINANCIAL_ORDER: Order = order({
  id: "fixture-max-financial",
  caseName: "In the matter of Max Financial Services Limited",
  orderStage: "Final order",
  orderDate: "2026-08-24",
});
const MAX_FINANCIAL_MATTER: Matter = { id: "faa4a18e-9c62-4d40-b8e8-b2a77f787c9b", normalizedMatterName: "Max Financial Services Limited", description: null };

export const COMPARE_SCENARIOS_ROWS: ComparisonRow[] = [
  {
    order: REL_ORDER,
    matter: REL_MATTER,
    findings: [REL_FINDINGS[1]],
    provisionsConsidered: [
      { provisionId: "PFUTP-4-1", legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition", notUpheldOnly: false, orderSpecific: false},
      { provisionId: "LODR-23-2", legalFunction: "governance_procedural_obligation", legalFunctionLabel: "Governance/procedural obligation", notUpheldOnly: false, orderSpecific: true},
    ],
    hasFindingLevelOnlyProvisionLinkage: true,
    hasNonAttributableDispositions: false,
    directions: [
      direction({
        id: "d-rel-1",
        orderId: REL_ORDER.id,
        caseName: REL_ORDER.caseName,
        stage: "Interim order",
        directionOrOutcome:
          "Rajesh Mehta (Noticee 2) restrained from dealing in REL securities in any manner, directly or indirectly, until further orders. Rajesh Exports Limited (Noticee 1) directed to cooperate fully with the investigation, appoint a new Forensic Auditor within 15 days, and make true and adequate disclosures under the LODR Regulations. The matter is referred to the National Financial Reporting Authority in respect of the statutory auditors. No monetary penalty is imposed at this ad-interim stage; the investigation shall continue and this order shall be reviewed after the Forensic Audit Report is received.",
        paragraphReference: "Para 45",
      }),
    ],
    dispositions: ["Prima facie"],
  },
  {
    order: SEACOAST_FINAL,
    matter: SEACOAST_MATTER,
    findings: [SEACOAST_FINDINGS[0]],
    provisionsConsidered: [{ provisionId: "PFUTP-4-2-e", legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition", notUpheldOnly: false, orderSpecific: true}],
    hasFindingLevelOnlyProvisionLinkage: false,
    hasNonAttributableDispositions: false,
    directions: [direction({ id: "d-sea-1", orderId: SEACOAST_FINAL.id, caseName: SEACOAST_FINAL.caseName, directionOrOutcome: "Disgorgement of Rs. 4.2 crore with interest; restrained from the securities market for 2 years.", paragraphReference: "Para 61" })],
    dispositions: ["Confirmed in Final Order"],
  },
  {
    // Section C correction: SEACOAST_FINDINGS[0] (SSSL-01) is
    // "Confirmed in Final Order" -- a final-adjudicatory status
    // attributable only to SEACOAST_FINAL (see attributedOrderIdForDisposition,
    // caseJourney.ts). Never rendered under the interim row merely because
    // the same finding also references it -- this fixture previously
    // (incorrectly) copied that same disposition onto this row too.
    order: SEACOAST_INTERIM,
    matter: SEACOAST_MATTER,
    findings: [SEACOAST_FINDINGS[0]],
    provisionsConsidered: [{ provisionId: "PFUTP-4-2-e", legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition", notUpheldOnly: false, orderSpecific: true}],
    hasFindingLevelOnlyProvisionLinkage: false,
    hasNonAttributableDispositions: true,
    directions: [],
    dispositions: [],
  },
  {
    // Negative precedent: a "not established" disposition on a distinct order.
    order: DB_REALTY_ORDER,
    matter: DB_REALTY_MATTER,
    findings: [
      finding({
        recordId: "DBRL-01",
        caseName: DB_REALTY_ORDER.caseName,
        orderIds: [DB_REALTY_ORDER.id],
        scenarioTitle: "Alleged diversion of rights-issue proceeds to group entities",
        findingStatus: "Partly Confirmed in Final Order",
        provisionIds: ["PFUTP-4-1"],
        provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [] }],
        transactionTypes: ["fund_diversion"],
      }),
    ],
    provisionsConsidered: [{ provisionId: "PFUTP-4-1", legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition", notUpheldOnly: false, orderSpecific: true }],
    hasFindingLevelOnlyProvisionLinkage: false,
    hasNonAttributableDispositions: false,
    directions: [],
    dispositions: ["Partly Confirmed in Final Order"],
  },
  {
    order: MAX_FINANCIAL_ORDER,
    matter: MAX_FINANCIAL_MATTER,
    findings: [
      finding({
        recordId: "MAX-02",
        caseName: MAX_FINANCIAL_ORDER.caseName,
        orderIds: [MAX_FINANCIAL_ORDER.id],
        scenarioTitle: "Alleged diversion of policyholder-linked funds through a related entity",
        findingStatus: "Not Confirmed in Final Order",
        provisionIds: ["PFUTP-4-1"],
        provisionLinks: [{ provisionId: "PFUTP-4-1", justifyingTags: [], relationship: "not_upheld" }],
        transactionTypes: ["fund_diversion"],
      }),
    ],
    provisionsConsidered: [{ provisionId: "PFUTP-4-1", legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition", notUpheldOnly: true, orderSpecific: true }],
    hasFindingLevelOnlyProvisionLinkage: false,
    hasNonAttributableDispositions: false,
    directions: [],
    dispositions: ["Not Confirmed in Final Order"],
  },
  ...MANY_DIVERSION_ORDERS.slice(0, 3).map((o, i): ComparisonRow => ({
    order: o,
    matter: { id: `matter-div-${i + 1}`, normalizedMatterName: o.caseName, description: null },
    findings: [MANY_DIVERSION_FINDINGS[i]],
    provisionsConsidered: [{ provisionId: "PFUTP-4-1", legalFunction: "substantive_prohibition", legalFunctionLabel: "Substantive prohibition", notUpheldOnly: false, orderSpecific: true }],
    hasFindingLevelOnlyProvisionLinkage: false,
    hasNonAttributableDispositions: false,
    directions: [],
    dispositions: [MANY_DIVERSION_FINDINGS[i].findingStatus],
  })),
];

export const COMPARE_SCENARIOS_PROVISIONS: LegalProvision[] = [...REL_PROVISIONS, ...DIVERSION_SCENARIO_PROVISIONS];

// ---------------------------------------------------------------------
// LAW LIBRARY / SOURCE LIBRARY / FRAUD DOCTRINE fixtures
// ---------------------------------------------------------------------
import type { LegalInstrument, LegalTest } from "@/types/domain";

export const LAW_LIBRARY_INSTRUMENTS: LegalInstrument[] = [
  { id: "pfutp-2003", name: "PFUTP Regulations, 2003", issuingAuthority: "SEBI", officialSourceUrl: "https://www.sebi.gov.in/legal/regulations/pfutp.html" },
  { id: "sebi-act-1992", name: "SEBI Act, 1992", issuingAuthority: "SEBI", officialSourceUrl: "https://www.sebi.gov.in/legal/acts/sebi-act.html" },
  { id: "lodr-2015", name: "SEBI (LODR) Regulations, 2015", issuingAuthority: "SEBI", officialSourceUrl: "https://www.sebi.gov.in/legal/regulations/lodr.html" },
];

export const LAW_LIBRARY_PROVISIONS: LegalProvision[] = [...REL_PROVISIONS, ...DIVERSION_SCENARIO_PROVISIONS];
export const LAW_LIBRARY_FINDINGS: ScenarioFinding[] = [...REL_FINDINGS, ...SEACOAST_FINDINGS];

export const FRAUD_DOCTRINE_LEGAL_TEST: LegalTest = {
  id: "pfutp-2-1-c-fraud-test",
  provisionOrIssue: "PFUTP 2(1)(c): fraud (inducement/intent test)",
  workingPrinciple:
    "The Supreme Court's two-limb test for \"fraud\" under Regulation 2(1)(c): either (i) established injury/wrongful gain/avoided loss from inducement to deal in securities, or (ii) deceitful/mala fide intent clear from blatant misconduct or attending circumstances.",
  paragraphAnchors: "Reliance Industries Ltd. v. SEBI, 2026 INSC 585, para 175; applied in REL interim paras 219-222 (both limbs found satisfied).",
  implementationGuardrail: "Never treat bare dealing/inducement alone as satisfying Limb (i) without established injury, wrongful gain, or avoided loss.",
};
