// P0 hotfix: disclosure-family legal connectivity. Root cause: two UNGATED,
// subject-specific disclosure provisions — LODR Regulation 27(2)(a)
// (quarterly corporate-governance compliance report) and Regulation 31
// (shareholding pattern) — have EMPTY finding_provisions.justifying_tags on
// every real production link (verified live: SHARON-01, FCEL-01, MFL-01,
// MISL-01, SIL-01). Because they are ungated, promotion falls back to
// linkScopedAllegedConduct's pre-existing "universal" convention for
// empty-justifyingTags links — the entered scenario's own detected concept
// ids intersected against the SUPPORTING FINDING's WHOLE allegedConduct bag,
// with no requirement that the matched id concern the SAME subject as this
// specific provision. The single generic "non_disclosure_of_information"
// conduct tag (kind: conduct, synonyms spanning every disclosure subject —
// "failed to disclose", "did not disclose", etc.) sits in nearly every
// disclosure-adjacent finding's allegedConduct array, so ANY scenario
// mentioning ANY undisclosed fact (a loan default, in Demo C) promoted
// Regulation 27(2)(a) and Regulation 31 as breach candidates even though
// neither concerns a governance compliance report or a shareholding
// pattern at all.
//
// Verified against official SEBI material (see final report): defaults on
// loans from banks/financial institutions are a Regulation 30 mandatory
// disclosure event (SEBI Circular SEBI/HO/CFD/CMD1/CIR/P/2019/140, Nov 21,
// 2019) — LODR-30 already exists in the corpus and already has a proper
// retrieval rule requiring its own "material_event_disclosure" topic
// concept; its synonym list is widened here to recognize "loan default"
// phrasing (previously it did not, so the correct provision could never
// gate-pass for this exact fact pattern either).
//
// The fix (see ConceptTag.subjectAgnostic and engine.ts's
// hasConnectedTopicOverlap): a subject-agnostic conduct id can promote an
// UNGATED provision only when the query's own occurrence of that id is
// CONNECTED (same sentence — the identical mechanism passesRetrievalGate
// already uses for gated rules, see isConnected) to a query-detected topic
// concept that the specific supporting finding's own transactionTypes also
// cites. A subject-specific conduct id (e.g. related_party_misrepresentation)
// is completely unaffected — this is not a new sentence-position/negation
// check on ANY conduct id (that class of fix was tried and reverted
// elsewhere for breaking legitimate negated-topic phrasing); it only ever
// narrows the small, already-generic subjectAgnostic set.
//
// PRE-MERGE LEGAL-VERIFICATION PASS (extends this hotfix): the connectivity
// check above still had a residual gap for these exact two provisions —
// hasConnectedTopicOverlap treats ANY topic in a SUPPORTING FINDING's own
// transactionTypes bag as evidence of subject-match, but every one of
// LODR-27-2-a/LODR-31-statement's real production links is on a
// MULTI-ISSUE finding whose transactionTypes bag also happens to include
// related_party_transaction (that same historical matter separately had an
// RPT issue too). A live-corpus probe confirmed this still let a bare "an
// RPT occurred and was not disclosed" scenario falsely promote both
// provisions, even though neither has anything to do with related-party
// transactions (verified: SEBI LODR Regulations, 2015, current
// consolidated text — Reg 27(2)(a) is the quarterly corporate-governance
// compliance-report submission duty; Reg 31(1) is the shareholding-pattern
// statement submission duty). Both now have their own proper GATED
// retrieval rule (provision-retrieval-rules.ts) requiring their own
// subject-specific topic tag (governance_compliance_report /
// shareholding_pattern_statement, concept-tags.ts) connected to a
// non-disclosure fact — removing them from the ungated ANY-topic fallback
// entirely. Tests 1, 3, 4, 5 below are updated accordingly: a blocked
// gated provision surfaces via gateBlockedProvisionResults now, not
// governingProvisionResults (that bucket is for UNGATED provisions whose
// adverse predicate wasn't connected — these two no longer take that
// path), and an RPT topic alone can never satisfy their gate. Test 7 is
// replaced with a genuine own-subject positive control for each.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  const provisionIds = overrides.provisionIds ?? [];
  const provisionLinks =
    overrides.provisionLinks ?? provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    recordId: "MOCK-01",
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds,
    provisionLinks,
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: "Para 1",
    finalParagraphReferences: "Para 10",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/enforcement/orders/mock",
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

function makeProvision(overrides: Partial<LegalProvision>): LegalProvision {
  return {
    id: "MOCK-PROVISION",
    instrument: "Mock Instrument",
    provisionNumber: "Mock 1",
    subject: null,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: ["Mock Case Limited"],
    treatmentInPilotOrders: "Cited in 1 finding.",
    lawLibraryNote: null,
    ...overrides,
  };
}

function link(provisionId: string, justifyingTags: string[] = []) {
  return { provisionId, justifyingTags };
}

function breachIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.provisionResults.map((p) => p.provision.id);
}
function contradictedIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.contradictedProvisionResults.map((p) => p.provision.id);
}
function gateBlockedIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.gateBlockedProvisionResults.map((p) => p.provision.id);
}

// Real production shape: both links carry EMPTY justifyingTags, exactly as
// verified live in Supabase for every finding_provisions row citing these
// two provisions.
const reg27 = makeProvision({ id: "LODR-27-2-a", provisionNumber: "Regulation 27(2)(a)", subject: "Quarterly corporate-governance compliance report" });
const reg31 = makeProvision({ id: "LODR-31-statement", provisionNumber: "Regulation 31", subject: "Shareholding pattern disclosure obligations" });
const reg30 = makeProvision({ id: "LODR-30", provisionNumber: "Regulation 30", subject: "Disclosure of material events/information to stock exchanges" });
const indAs24 = makeProvision({ id: "IND-AS-24", subject: "Related Party Disclosures" });
const reg232 = makeProvision({ id: "LODR-23-2", provisionNumber: "Regulation 23(2)", subject: "Prior Audit Committee approval of RPTs" });
const reg234 = makeProvision({ id: "LODR-23-4", provisionNumber: "Regulation 23(4)", subject: "Mandatory shareholder approval of material RPTs" });

describe("Disclosure-family connectivity hotfix — mandatory regression matrix", () => {
  // 1. Loan default not disclosed -> Reg 27(2)(a)/Reg 31 must NOT become
  //    candidates merely due to nondisclosure; the correct Reg 30 framework
  //    surfaces independently once it is topically connected.
  it("1. an undisclosed loan default does not promote Reg 27(2)(a) or Reg 31, and correctly promotes Reg 30", () => {
    const financialReportingFinding = makeFinding({
      recordId: "FIN-01",
      caseName: "Financial Reporting Matter Ltd.",
      allegedConduct: ["financial_statement_misstatement", "non_disclosure_of_information"],
      transactionTypes: ["revenue_recognition"],
      provisionIds: [reg27.id],
      provisionLinks: [link(reg27.id, [])],
    });
    const shareholdingFinding = makeFinding({
      recordId: "FIN-02",
      caseName: "Shareholding Matter Ltd.",
      allegedConduct: ["fund_diversion", "non_disclosure_of_information"],
      transactionTypes: ["purchase_transaction"],
      provisionIds: [reg31.id],
      provisionLinks: [link(reg31.id, [])],
    });
    const defaultFinding = makeFinding({
      recordId: "FIN-03",
      caseName: "Default Matter Ltd.",
      allegedConduct: ["non_disclosure_of_information"],
      transactionTypes: ["material_event_disclosure"],
      provisionIds: [reg30.id],
      provisionLinks: [link(reg30.id, [])],
    });
    const result = analyzeScenario(
      { freeText: "A listed company failed to disclose a material default in repayment of a loan from a bank to the stock exchanges within the applicable disclosure framework." },
      [financialReportingFinding, shareholdingFinding, defaultFinding],
      [reg27, reg31, reg30],
      []
    );
    expect(breachIds(result)).not.toContain(reg27.id);
    expect(breachIds(result)).not.toContain(reg31.id);
    // Now fully gated (see file header): a blocked gated provision is
    // never silently dropped, but surfaces via gateBlockedProvisionResults
    // ("requires additional facts"), not governingProvisionResults (that
    // bucket is for ungated provisions whose adverse predicate wasn't
    // connected — these two no longer take that path at all).
    expect(gateBlockedIds(result)).toContain(reg27.id);
    expect(gateBlockedIds(result)).toContain(reg31.id);
    expect(breachIds(result)).toContain(reg30.id);
  });

  // 2. Compliant RPT + unrelated loan-default nondisclosure (Demo C shape).
  it("2. compliant RPT plus an unrelated, separately-stated loan-default nondisclosure: Reg 23(2)/23(4) contradicted, Ind AS 24 not a candidate, Reg 27/31 not falsely promoted, Reg 30 independently detected", () => {
    const rptFinding = makeFinding({
      recordId: "RPT-01",
      caseName: "RPT Matter Ltd.",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [reg232.id, reg234.id, indAs24.id],
      provisionLinks: [
        link(reg232.id, ["related_party_transaction", "related_party_misrepresentation"]),
        link(reg234.id, ["related_party_transaction", "related_party_misrepresentation"]),
        link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"]),
      ],
    });
    const disclosureFamilyFinding = makeFinding({
      recordId: "DISC-01",
      caseName: "Disclosure Family Matter Ltd.",
      allegedConduct: ["financial_statement_misstatement", "non_disclosure_of_information"],
      transactionTypes: ["revenue_recognition", "related_party_transaction"],
      provisionIds: [reg27.id],
      provisionLinks: [link(reg27.id, [])],
    });
    const shareholdingFamilyFinding = makeFinding({
      recordId: "DISC-02",
      caseName: "Shareholding Family Matter Ltd.",
      allegedConduct: ["fund_diversion", "non_disclosure_of_information"],
      transactionTypes: ["purchase_transaction", "related_party_transaction"],
      provisionIds: [reg31.id],
      provisionLinks: [link(reg31.id, [])],
    });
    const defaultFinding = makeFinding({
      recordId: "DISC-03",
      caseName: "Default Matter Ltd.",
      allegedConduct: ["non_disclosure_of_information"],
      transactionTypes: ["material_event_disclosure"],
      provisionIds: [reg30.id],
      provisionLinks: [link(reg30.id, [])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction was properly approved by the Audit Committee and shareholders and was appropriately disclosed. Separately, the listed company failed to disclose a material loan default to the stock exchanges within the applicable disclosure framework.",
      },
      [rptFinding, disclosureFamilyFinding, shareholdingFamilyFinding, defaultFinding],
      [reg232, reg234, indAs24, reg27, reg31, reg30],
      []
    );
    expect(breachIds(result)).not.toContain(reg232.id);
    expect(breachIds(result)).not.toContain(reg234.id);
    expect(contradictedIds(result)).toEqual(expect.arrayContaining([reg232.id, reg234.id]));
    expect(breachIds(result)).not.toContain(indAs24.id);
    expect(breachIds(result)).not.toContain(reg27.id);
    expect(breachIds(result)).not.toContain(reg31.id);
    expect(breachIds(result)).toContain(reg30.id);
  });

  // 3. An RPT topic connected to a generic non-disclosure fact must NOT
  //    promote Reg 27(2)(a) — this exact shape ("a related party
  //    transaction occurred and was not disclosed") is the false positive
  //    the pre-merge legal-verification pass found and fixed: RPT is not
  //    Reg 27(2)(a)'s own subject (see file header).
  it("3. an RPT topic connected to a generic non-disclosure fact does not promote Reg 27(2)(a) (full gating fix)", () => {
    const reg27Finding = makeFinding({
      recordId: "GOV-01",
      caseName: "Governance Report Matter Ltd.",
      allegedConduct: ["non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [reg27.id],
      provisionLinks: [link(reg27.id, [])],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction occurred and the company failed to disclose it to the stock exchanges." },
      [reg27Finding],
      [reg27],
      []
    );
    expect(breachIds(result)).not.toContain(reg27.id);
    expect(gateBlockedIds(result)).toContain(reg27.id);
  });

  // 4. Mirror of case 3 for Reg 31: an RPT topic connected to a generic
  //    non-disclosure fact must not promote Reg 31 either.
  it("4. an RPT topic connected to a generic non-disclosure fact does not promote Reg 31 (full gating fix)", () => {
    const reg31Finding = makeFinding({
      recordId: "SHARE-01",
      caseName: "Unrelated Shareholding Matter Ltd.",
      allegedConduct: ["fund_diversion", "non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [reg31.id],
      provisionLinks: [link(reg31.id, [])],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction occurred and the company failed to disclose it to the stock exchanges." },
      [reg31Finding],
      [reg31],
      []
    );
    expect(breachIds(result)).not.toContain(reg31.id);
    expect(gateBlockedIds(result)).toContain(reg31.id);
  });

  // 5. Generic "the company failed to disclose information" (no topic
  //    stated at all) -> must not fan out into either disclosure-family
  //    provision; both remain gate-blocked/additional-fact-required.
  it("5. a wholly generic nondisclosure statement does not fan out into Reg 27(2)(a) or Reg 31", () => {
    const reg27Finding = makeFinding({
      recordId: "GOV-03",
      allegedConduct: ["non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [reg27.id],
      provisionLinks: [link(reg27.id, [])],
    });
    const reg31Finding = makeFinding({
      recordId: "SHARE-03",
      allegedConduct: ["fund_diversion", "non_disclosure_of_information"],
      transactionTypes: ["purchase_transaction"],
      provisionIds: [reg31.id],
      provisionLinks: [link(reg31.id, [])],
    });
    const result = analyzeScenario({ freeText: "The company failed to disclose information." }, [reg27Finding, reg31Finding], [reg27, reg31], []);
    expect(breachIds(result)).not.toContain(reg27.id);
    expect(breachIds(result)).not.toContain(reg31.id);
  });

  // 6. Two clean controls -> zero breach candidates.
  it("6. clean control: RPT process properly followed produces zero breach candidates", () => {
    const finding = makeFinding({
      recordId: "CLEAN-01",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [reg232.id, reg234.id, indAs24.id],
      provisionLinks: [
        link(reg232.id, ["related_party_transaction", "related_party_misrepresentation"]),
        link(reg234.id, ["related_party_transaction", "related_party_misrepresentation"]),
        link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"]),
      ],
    });
    const result = analyzeScenario(
      {
        freeText:
          "A listed company entered into a related-party transaction with an entity connected to its promoter group in the ordinary course of business at arm's length pricing. The transaction was properly approved by the Audit Committee and by shareholders and was appropriately disclosed in the company's related-party disclosures in its financial statements.",
      },
      [finding],
      [reg232, reg234, indAs24],
      []
    );
    expect(result.provisionResults).toHaveLength(0);
  });

  it("6b. clean control: funds advanced for stated purpose, properly disclosed produces zero breach candidates", () => {
    const finding = makeFinding({
      recordId: "CLEAN-02",
      allegedConduct: ["fund_diversion"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [reg31.id],
      provisionLinks: [link(reg31.id, [])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "A listed company advanced funds to an entity connected with its promoter group for a stated business purpose. The funds were used strictly for that stated purpose, and the transaction and its connected-party nature were accurately disclosed in the company's published financial statements.",
      },
      [finding],
      [reg31],
      []
    );
    expect(result.provisionResults).toHaveLength(0);
  });

  // 7. Positive controls: Reg 27(2)(a) and Reg 31 can each still surface —
  //    on their OWN actual subject, now via their proper gated rule
  //    (governance_compliance_report / shareholding_pattern_statement,
  //    concept-tags.ts) rather than the generic ungated fallback. The fix
  //    must not be overbroad: it removes the RPT-topic false bridge, not
  //    genuine promotion on the provision's real subject.
  it("7a. positive control: Reg 27(2)(a) surfaces when its own subject (governance compliance report) is genuinely stated and connected to a non-disclosure fact", () => {
    const finding = makeFinding({
      recordId: "CONNECTED-01",
      allegedConduct: ["non_disclosure_of_information"],
      transactionTypes: ["governance_compliance_report"],
      provisionIds: [reg27.id],
      provisionLinks: [link(reg27.id, [])],
    });
    const result = analyzeScenario(
      { freeText: "The listed company's quarterly compliance report on corporate governance was not disclosed to the stock exchanges." },
      [finding],
      [reg27],
      []
    );
    expect(breachIds(result)).toContain(reg27.id);
  });

  it("7b. positive control: Reg 31 surfaces when its own subject (shareholding pattern statement) is genuinely stated and connected to a non-disclosure fact", () => {
    const finding = makeFinding({
      recordId: "CONNECTED-02",
      allegedConduct: ["non_disclosure_of_information"],
      transactionTypes: ["shareholding_pattern_statement"],
      provisionIds: [reg31.id],
      provisionLinks: [link(reg31.id, [])],
    });
    const result = analyzeScenario(
      { freeText: "The listed company's shareholding pattern statement was not disclosed to the stock exchanges." },
      [finding],
      [reg31],
      []
    );
    expect(breachIds(result)).toContain(reg31.id);
  });

  // 8. Subject-SPECIFIC conduct ids remain completely unaffected by this
  //    fix (regression safety for the Ind AS 24 promotion-connectivity fix
  //    and the actor/polarity-connectivity fixes).
  it("8. a subject-specific conduct id (related_party_misrepresentation) is unaffected by the subject-agnostic connectivity check", () => {
    const finding = makeFinding({
      recordId: "SPECIFIC-01",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, [])],
    });
    const result = analyzeScenario(
      { freeText: "There was a misrepresented related party dealing recorded as a false RPT disclosure in the annual report." },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).toContain(indAs24.id);
  });
});
