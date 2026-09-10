// Synthetic fixture data for the QA harness. See qa-harness/README.md for
// the safety design. Values are modeled on already-public, already-official
// SEBI order content this repository's own commit history and existing
// vitest fixtures (e.g. tests/case-journey.test.ts) already reference by
// name and matter_id -- never a raw dump of confidential/unpublished/
// market-sensitive material, and never written back to Supabase.
import type { LegalProvision, Order, OrderNoticee, ProvisionVersion, ScenarioFinding } from "@/types/domain";

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
  scopeNote:
    "Ad-interim ex-parte interim order re Rajesh Exports Limited (REL, gold refiner/exporter) and promoter/Executive " +
    "Chairman Rajesh Mehta. Prima facie findings (investigation ongoing, not yet final): fictitious sale/purchase " +
    "transactions fabricated against personal gold-derivative trading losses; consolidated financials heavily " +
    "dependent on unverifiable overseas subsidiary revenue; an untraceable investment; opaque netting of " +
    "receivables/payables; funds routed through personal accounts undisclosed as related-party transactions; " +
    "non-cooperation with SEBI and the Forensic Auditor.",
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
