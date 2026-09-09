// Historical Treatment correction pass, ROUND 2: live-database validation
// found one concrete matter-identity failure (ADANI-AC-01/ADANI-MR-01: two
// findings with different case names, whose linked orders already agreed,
// in the orders' OWN curated normalized_matter_name, that they concern one
// investigation) and one remaining historical-comparability weakness (a
// single generic transaction tag + a single generic conduct tag could still
// reach "strongly comparable", and the entered scenario's own affirmative
// negations — "arm's-length", "fully disclosed", "full cooperation" — were
// never used to demote an incompatible precedent). This suite is authored
// fresh against those round-2 fixes specifically (three-tier matter
// identity, the specificity cap, the contradiction penalty, and the
// presentation-hierarchy tier) — round-1's own suite
// (historical-treatment-correction-pass.test.ts) still covers the
// round-1 architecture and is untouched.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import type { LegalProvision, Order, ScenarioFinding } from "@/types/domain";

function makeProvision(id: string, provisionNumber: string, subject: string, instrument = "Test Instrument"): LegalProvision {
  return { id, instrument, provisionNumber, subject, currentTextVerificationStatus: "Requires verification", officialSource: null, ordersConsidered: [], treatmentInPilotOrders: "", lawLibraryNote: null };
}
function link(provisionId: string, justifyingTags: string[] = [], relationship?: string) {
  return { provisionId, justifyingTags, relationship };
}
function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionLinks: { provisionId: string; justifyingTags: string[]; relationship?: string }[] }): ScenarioFinding {
  return {
    caseName: "Round-2 Correction-Pass Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Round-2 correction-pass finding",
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
function makeOrder(overrides: Partial<Order> & { id: string; caseName: string }): Order {
  return {
    orderStage: "Interim order",
    orderDate: null,
    orderNumber: null,
    authority: null,
    noticeesCount: 0,
    officialUrl: "https://example.com",
    cfidVerified: true,
    cfidVerificationBasis: "cfid_tag_in_order_number",
    proceduralStatus: "",
    processingStage: "citations_checked",
    retrievalStatus: "success",
    retrievalFailureReason: null,
    scopeNote: null,
    matterId: null,
    officialOrderTitle: null,
    normalizedMatterName: null,
    ...overrides,
  };
}

const LODR_23_2 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
const PFUTP_4_1 = makeProvision("PFUTP-4-1", "Regulation 4(1)", "Fraudulent or unfair trade practice, general.", "PFUTP Regulations, 2003");
const DIVERSION_PROV = makeProvision("TEST-DIVERSION-1", "Section 24", "Diversion of company funds.", "Companies Act, 2013");
const NONCOOP_PROV = makeProvision("SEBI-ACT-11C", "Section 11C(3)", "Failure to furnish information/documents to an investigating authority.", "SEBI Act, 1992");
const RIGHTS_ISSUE_PROV = makeProvision("TEST-ISSUE-PROCEEDS-1", "Regulation 32", "Utilisation of issue proceeds.", "LODR Regulations, 2015");
const FIN_MISSTATEMENT_PROV = makeProvision("PFUTP-4-2-f", "Regulation 4(2)(f)", "Publishing false/misleading information.", "PFUTP Regulations, 2003");
const ALL_PROVISIONS = [LODR_23_2, PFUTP_4_1, DIVERSION_PROV, NONCOOP_PROV, RIGHTS_ISSUE_PROV, FIN_MISSTATEMENT_PROV];

describe("Round 2 — matter identity (regression tests #1-#4)", () => {
  it("[#1] two different finding case names linked to orders sharing one canonical matter ID deduplicate", () => {
    const order1 = makeOrder({ id: "r2-ord-1", caseName: "Regatta Textiles Interim Order", matterId: "r2-matter-1" });
    const order2 = makeOrder({ id: "r2-ord-2", caseName: "Regatta Textiles Confirmatory Order", matterId: "r2-matter-1" });
    const f1 = makeFinding({
      recordId: "R2-DEDUP-01", caseName: "Regatta Textiles Interim Investigation", orderIds: ["r2-ord-1"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const f2 = makeFinding({
      recordId: "R2-DEDUP-02", caseName: "In the matter of Regatta Textiles Limited", orderIds: ["r2-ord-2"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [f1, f2], ALL_PROVISIONS, [], new Map(), [], [order1, order2]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.comparableMatterCount).toBe(1);
    expect(entry.matterOutcomes[0].cases).toHaveLength(2);
    expect(entry.matterOutcomes[0].matterIdBasis).toBe("matter_id");
  });

  it("[#2] the Adani pattern: different case names, no matter_id on either order, but both orders share one curated normalized_matter_name — treated as ONE matter", () => {
    const adaniOrder1 = makeOrder({ id: "adani-ord-1", caseName: "Adani order 1", matterId: null, normalizedMatterName: "Investigation into Hindenburg allegations wrt Rehvar and Milestone in the matter of Adani Group" });
    const adaniOrder2 = makeOrder({ id: "adani-ord-2", caseName: "Adani order 2", matterId: null, normalizedMatterName: "Investigation into Hindenburg allegations wrt Rehvar and Milestone in the matter of Adani Group" });
    const adicorp = makeFinding({
      recordId: "ADANI-AC-01", caseName: "Hindenburg Allegations against Adani Group (Adicorp Enterprises)", orderIds: ["adani-ord-1"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const milestoneRehvar = makeFinding({
      recordId: "ADANI-MR-01", caseName: "Hindenburg Allegations against Adani Group (Milestone Tradelinks / Rehvar Infrastructure)", orderIds: ["adani-ord-2"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [adicorp, milestoneRehvar], ALL_PROVISIONS, [], new Map(), [], [adaniOrder1, adaniOrder2]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    // The concrete round-2 defect: under the round-1 case-name-only
    // fallback these two would have produced TWO separate matters (their
    // case names genuinely differ). The order-metadata tier fixes this.
    expect(entry.comparableMatterCount).toBe(1);
    expect(entry.matterOutcomes[0].cases.map((c) => c.recordId).sort()).toEqual(["ADANI-AC-01", "ADANI-MR-01"]);
    expect(entry.matterOutcomes[0].matterIdBasis).toBe("order_metadata_fallback");
    expect(result.historicalTreatment.matterIdentityStats.resolvedViaOrderMetadata).toBeGreaterThanOrEqual(2);
  });

  it("[#3] the same company/case name does NOT alone merge separate matters when the underlying orders genuinely differ", () => {
    const orderX = makeOrder({ id: "r2-sep-ord-x", caseName: "Meridian Holdings Limited", matterId: "r2-matter-x" });
    const orderY = makeOrder({ id: "r2-sep-ord-y", caseName: "Meridian Holdings Limited", matterId: "r2-matter-y" });
    const fx = makeFinding({
      recordId: "R2-SEP-01", caseName: "Meridian Holdings Limited", orderIds: ["r2-sep-ord-x"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const fy = makeFinding({
      recordId: "R2-SEP-02", caseName: "Meridian Holdings Limited", orderIds: ["r2-sep-ord-y"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [fx, fy], ALL_PROVISIONS, [], new Map(), [], [orderX, orderY]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.comparableMatterCount).toBe(2);
    expect(new Set(entry.matterOutcomes.map((mo) => mo.matterKey)).size).toBe(2);
  });

  it("[#4] order.normalized_matter_name fallback beats the finding's own case-name fallback where matter_id is absent", () => {
    const orderP = makeOrder({ id: "r2-ordname-p", caseName: "Filed as: Orion Steel", matterId: null, normalizedMatterName: "Investigation into Orion Steel Limited" });
    const orderQ = makeOrder({ id: "r2-ordname-q", caseName: "Filed as: Orion Steel Ltd (later name)", matterId: null, normalizedMatterName: "Investigation into Orion Steel Limited" });
    const fP = makeFinding({
      recordId: "R2-ORDNAME-01", caseName: "Orion Steel — first tranche finding", orderIds: ["r2-ordname-p"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const fQ = makeFinding({
      recordId: "R2-ORDNAME-02", caseName: "Orion Steel — second tranche finding (different case-name text)", orderIds: ["r2-ordname-q"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [fP, fQ], ALL_PROVISIONS, [], new Map(), [], [orderP, orderQ]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    // The two findings' own case_name strings are DIFFERENT — a case-name
    // fallback would have kept them apart. The order-metadata tier merges
    // them because both orders share one normalized_matter_name.
    expect(entry.comparableMatterCount).toBe(1);
    expect(entry.matterOutcomes[0].matterIdBasis).toBe("order_metadata_fallback");
    expect(entry.matterOutcomes[0].cases).toHaveLength(2);
  });
});

describe("Round 2 — contradiction demotion (regression tests #5-#8)", () => {
  it("[#5] contradictory facts demote a precedent: 'arm's-length' rules out a sham-RPT precedent", () => {
    const shamOrder = makeOrder({ id: "r2-sham-ord", caseName: "Sham RPT Matter Ltd." });
    const shamFinding = makeFinding({
      recordId: "R2-SHAM-01", caseName: "Sham RPT Matter Ltd.", orderIds: ["r2-sham-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["related_party_misrepresentation", "rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "An arm's-length related-party transaction was not approved by the audit committee as required." },
      [shamFinding], ALL_PROVISIONS, [], new Map(), [], [shamOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2");
    // Base tier (before contradiction) would be strongly_comparable
    // (transaction + conduct overlap on rpt_approval_lapse) with
    // specificity satisfied (rpt_approval_lapse is not generic) — but the
    // finding's OWN record also carries related_party_misrepresentation
    // (sham), which the entered "arm's-length" statement contradicts, so
    // it must be demoted one full level, landing at moderately_comparable.
    expect(entry).toBeDefined();
    const mo = entry!.matterOutcomes.find((m) => m.matterKey.includes("sham") || m.cases.some((c) => c.recordId === "R2-SHAM-01"));
    expect(mo?.comparabilityTier).toBe("moderately_comparable");
    expect(mo?.comparabilityRationale).toMatch(/demoted/i);
  });

  it("[#6] 'fully disclosed' does not let a concealment/non-disclosure precedent reach strongly comparable", () => {
    const concealOrder = makeOrder({ id: "r2-conceal-ord", caseName: "Concealed RPT Matter Ltd." });
    const concealFinding = makeFinding({
      recordId: "R2-CONCEAL-01", caseName: "Concealed RPT Matter Ltd.", orderIds: ["r2-conceal-ord"],
      // The finding's OWN record carries BOTH conducts: rpt_approval_lapse
      // (matched by the query, giving a genuine strongly_comparable base
      // tier — it is not on the generic-conduct list, so no specificity
      // cap applies either) and non_disclosure_of_information (present in
      // the precedent's own record, but never positively matched by this
      // query — the query affirmatively states the OPPOSITE).
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse", "non_disclosure_of_information"],
      provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "The company fully disclosed a related-party transaction that was not approved by the audit committee." },
      [concealFinding], ALL_PROVISIONS, [], new Map(), [], [concealOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2");
    expect(entry).toBeDefined();
    const mo = entry!.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-CONCEAL-01"));
    // Base tier (transaction + conduct overlap on rpt_approval_lapse) would
    // be strongly_comparable, but the finding's own record ALSO carries
    // non_disclosure_of_information, which "fully disclosed" contradicts —
    // demoted one full level.
    expect(mo?.comparabilityTier).toBe("moderately_comparable");
    expect(mo?.comparabilityRationale).toMatch(/demoted/i);
  });

  it("[#7] 'full cooperation' does not treat a non-cooperation precedent as comparable", () => {
    const noncoopOrder = makeOrder({ id: "r2-noncoop-ord", caseName: "Non-Cooperation Matter Ltd." });
    const noncoopFinding = makeFinding({
      recordId: "R2-NONCOOP-01", caseName: "Non-Cooperation Matter Ltd.", orderIds: ["r2-noncoop-ord"],
      actorRoles: ["promoter"], allegedConduct: ["non_cooperation_with_investigation"],
      provisionLinks: [link("SEBI-ACT-11C")],
    });
    const result = analyzeScenario(
      { freeText: "The company fully cooperated with the investigation; a promoter was named in the matter." },
      [noncoopFinding], ALL_PROVISIONS, [], new Map(), [], [noncoopOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-11C");
    // Base tier: actor overlap only (no transaction tag on this finding) ->
    // contextually_related at best, then the contradiction demotes it
    // straight past weak_excluded — either way it must NOT read as a
    // comparable matter for this provision.
    if (entry) {
      const mo = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-NONCOOP-01"));
      expect(mo).toBeUndefined();
    }
    expect(entry?.comparableMatterCount ?? 0).toBe(0);
  });

  it("[#8] a pure arm's-length RPT scenario does not rank a sham-RPT/diversion precedent strongly on RPT+disclosure tags alone", () => {
    const shamOrder = makeOrder({ id: "r2-8-sham-ord", caseName: "Sham+Diversion Matter Ltd." });
    const shamFinding = makeFinding({
      recordId: "R2-8-SHAM-01", caseName: "Sham+Diversion Matter Ltd.", orderIds: ["r2-8-sham-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["related_party_misrepresentation"],
      provisionLinks: [link("LODR-23-2")],
    });
    const cleanOrder = makeOrder({ id: "r2-8-clean-ord", caseName: "Clean RPT Approval-Lapse Matter Ltd." });
    const cleanFinding = makeFinding({
      recordId: "R2-8-CLEAN-01", caseName: "Clean RPT Approval-Lapse Matter Ltd.", orderIds: ["r2-8-clean-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "An arm's-length related-party transaction was not disclosed to the audit committee." },
      [shamFinding, cleanFinding], ALL_PROVISIONS, [], new Map(), [], [shamOrder, cleanOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    const shamOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-8-SHAM-01"));
    const cleanOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-8-CLEAN-01"));
    // The sham precedent's own critical basis (related_party_misrepresentation)
    // is directly contradicted; it never reaches even moderately_comparable
    // here (transaction-only overlap -> moderately_comparable base, then
    // demoted to contextually_related -> excluded from case entries).
    expect(shamOutcome).toBeUndefined();
    // The clean approval-lapse precedent has no contradicted tag and keeps
    // its comparable standing.
    expect(cleanOutcome).toBeDefined();
  });
});

describe("Round 2 — specificity-aware ranking (regression tests #9-#10)", () => {
  it("[#9] diversion without an issue-proceeds fact ranks an issue-proceeds-specific precedent LOWER (weaker tier) than a true advances-diversion precedent", () => {
    const advOrder = makeOrder({ id: "r2-9-adv-ord", caseName: "Advances Diversion Matter Ltd." });
    const advFinding = makeFinding({
      recordId: "R2-9-ADV-01", caseName: "Advances Diversion Matter Ltd.", orderIds: ["r2-9-adv-ord"],
      transactionTypes: ["fund_transfer_promoter_entity"], allegedConduct: ["fund_diversion"],
      provisionLinks: [link("TEST-DIVERSION-1")],
    });
    const issueOrder = makeOrder({ id: "r2-9-issue-ord", caseName: "Issue-Proceeds Diversion Matter Ltd." });
    const issueFinding = makeFinding({
      recordId: "R2-9-ISSUE-01", caseName: "Issue-Proceeds Diversion Matter Ltd.", orderIds: ["r2-9-issue-ord"],
      transactionTypes: ["rights_issue"], allegedConduct: ["fund_diversion"],
      provisionLinks: [link("TEST-DIVERSION-1")],
    });
    const result = analyzeScenario(
      { freeText: "Company funds were diverted to promoter-controlled entities through advances without genuine business purpose." },
      [advFinding, issueFinding], ALL_PROVISIONS, [], new Map(), [], [advOrder, issueOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "TEST-DIVERSION-1")!;
    const advOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-9-ADV-01"))!;
    const issueOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-9-ISSUE-01"))!;
    expect(advOutcome.comparabilityTier).toBe("strongly_comparable");
    expect(issueOutcome.comparabilityTier).toBe("moderately_comparable");
    // The advances precedent must be ranked ahead of the issue-proceeds one.
    expect(entry.matterOutcomes.indexOf(advOutcome)).toBeLessThan(entry.matterOutcomes.indexOf(issueOutcome));
  });

  it("[#10] diversion concealed by false published financial statements ranks the matching concealed-misstatement precedent HIGHER than a pure-diversion-only precedent, at the same tier", () => {
    const concealedOrder = makeOrder({ id: "r2-10-concealed-ord", caseName: "Concealed Diversion + Misstatement Matter Ltd." });
    const concealedFinding = makeFinding({
      recordId: "R2-10-CONCEALED-01", caseName: "Concealed Diversion + Misstatement Matter Ltd.", orderIds: ["r2-10-concealed-ord"],
      transactionTypes: ["fund_transfer_promoter_entity"], allegedConduct: ["fund_diversion", "financial_statement_misstatement"],
      provisionLinks: [link("TEST-DIVERSION-1")],
    });
    const pureOrder = makeOrder({ id: "r2-10-pure-ord", caseName: "Pure Diversion Matter Ltd." });
    const pureFinding = makeFinding({
      recordId: "R2-10-PURE-01", caseName: "Pure Diversion Matter Ltd.", orderIds: ["r2-10-pure-ord"],
      transactionTypes: ["fund_transfer_promoter_entity"], allegedConduct: ["fund_diversion"],
      provisionLinks: [link("TEST-DIVERSION-1")],
    });
    const result = analyzeScenario(
      {
        freeText:
          "Company funds were diverted to promoter-controlled entities through advances without genuine business purpose. The diversion was concealed because the company misrepresented its financial statements issued to shareholders.",
      },
      [concealedFinding, pureFinding], ALL_PROVISIONS, [], new Map(), [], [concealedOrder, pureOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "TEST-DIVERSION-1")!;
    const concealedOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-10-CONCEALED-01"))!;
    const pureOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-10-PURE-01"))!;
    expect(concealedOutcome.comparabilityTier).toBe("strongly_comparable");
    expect(pureOutcome.comparabilityTier).toBe("strongly_comparable");
    expect(concealedOutcome.comparabilityScore).toBeGreaterThan(pureOutcome.comparabilityScore);
    expect(entry.matterOutcomes.indexOf(concealedOutcome)).toBeLessThan(entry.matterOutcomes.indexOf(pureOutcome));
  });
});

describe("Round 2 — presentation hierarchy and invariants (regression tests #11-#15)", () => {
  it("[#11] a clean-control scenario with no comparable precedent generates no misleading historical-treatment headline", () => {
    const result = analyzeScenario(
      { freeText: "The company held its board meetings on the scheduled dates and maintained a properly constituted board with the required number of independent directors." },
      [], ALL_PROVISIONS, [], new Map(), [], []
    );
    expect(result.historicalTreatment.entries).toHaveLength(0);
    expect(result.provisionResults).toHaveLength(0);
  });

  it("[#12] attributed provisions are ranked ahead of unverified cited-only provisions", () => {
    const attribOrder = makeOrder({ id: "r2-12-attrib-ord", caseName: "Attributed Matter Ltd." });
    const attribFinding = makeFinding({
      recordId: "R2-12-ATTRIB-01", caseName: "Attributed Matter Ltd.", orderIds: ["r2-12-attrib-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2", ["rpt_approval_lapse"])],
    });
    const unverifiedOrder = makeOrder({ id: "r2-12-unverified-ord", caseName: "Unverified Matter Ltd." });
    const unverifiedFinding = makeFinding({
      recordId: "R2-12-UNVERIFIED-01", caseName: "Unverified Matter Ltd.", orderIds: ["r2-12-unverified-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("PFUTP-4-1")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [attribFinding, unverifiedFinding], ALL_PROVISIONS, [], new Map(), [], [attribOrder, unverifiedOrder]
    );
    const attribEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    const unverifiedEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "PFUTP-4-1")!;
    expect(attribEntry.presentationTier).toBe("fact_attributed");
    expect(unverifiedEntry.presentationTier).toBe("comparable_unverified");
    expect(result.historicalTreatment.entries.indexOf(attribEntry)).toBeLessThan(result.historicalTreatment.entries.indexOf(unverifiedEntry));
  });

  it("[#13] cited-only/unverified entries remain present in the result (visually secondary, never deleted)", () => {
    const unverifiedOrder = makeOrder({ id: "r2-13-unverified-ord", caseName: "Unverified Matter Two Ltd." });
    const unverifiedFinding = makeFinding({
      recordId: "R2-13-UNVERIFIED-01", caseName: "Unverified Matter Two Ltd.", orderIds: ["r2-13-unverified-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("PFUTP-4-1")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [unverifiedFinding], ALL_PROVISIONS, [], new Map(), [], [unverifiedOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "PFUTP-4-1");
    expect(entry).toBeDefined();
    expect(entry!.presentationTier).toBe("comparable_unverified");
    expect(entry!.unverifiedFindingsCount).toBeGreaterThan(0);
  });

  it("[#14] Question B's historical-comparability tiering never changes Question A's own provision candidates", () => {
    const contradictedOrder = makeOrder({ id: "r2-14-ord", caseName: "Contradicted Precedent Matter Ltd." });
    const contradictedFinding = makeFinding({
      recordId: "R2-14-01", caseName: "Contradicted Precedent Matter Ltd.", orderIds: ["r2-14-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["related_party_misrepresentation", "rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2")],
    });
    const text = "An arm's-length related-party transaction was not approved by the audit committee as required.";
    const result = analyzeScenario({ freeText: text }, [contradictedFinding], ALL_PROVISIONS, [], new Map(), [], [contradictedOrder]);
    // Question A (provisionResults) is built from this SAME finding acting
    // as its supporting precedent — it still surfaces LODR-23-2 because the
    // entered scenario's own facts satisfy the retrieval gate and a
    // supporting precedent exists, computed via the untouched Question-A
    // path (findingStatus/effectiveLinkStatus), NOT via
    // assessComparability. Meanwhile Question B (historicalTreatment), for
    // the VERY SAME finding, demotes it below strongly_comparable because
    // its own record carries related_party_misrepresentation (contradicted
    // by "arm's-length"). Both must be true simultaneously — Question B's
    // demotion has zero effect on Question A's own inclusion decision.
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("LODR-23-2");
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2");
    const mo = entry?.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "R2-14-01"));
    expect(mo?.comparabilityTier).toBe("moderately_comparable");
  });

  it("[#15] the same input produces deterministic, identical historical-treatment output on repeated runs", () => {
    const order = makeOrder({ id: "r2-15-ord", caseName: "Determinism Matter Ltd." });
    const finding = makeFinding({
      recordId: "R2-15-01", caseName: "Determinism Matter Ltd.", orderIds: ["r2-15-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2", ["rpt_approval_lapse"])],
    });
    const text = "A related-party transaction was undisclosed, without the required audit committee approval.";
    const run1 = analyzeScenario({ freeText: text }, [finding], ALL_PROVISIONS, [], new Map(), [], [order]);
    const run2 = analyzeScenario({ freeText: text }, [finding], ALL_PROVISIONS, [], new Map(), [], [order]);
    expect(run1.historicalTreatment).toEqual(run2.historicalTreatment);
  });
});

// ---------------------------------------------------------------------------
// Item 4 acceptance scenarios (A-E), verbatim scenario texts from the
// correction-pass mandate.
// ---------------------------------------------------------------------------
describe("Round 2 — Scenario A-E acceptance tests", () => {
  it("Scenario A: pure RPT — an unrelated PFUTP/fraud-bundle precedent is not shown as historically invoked", () => {
    const rptOrder = makeOrder({ id: "sa-rpt-ord", caseName: "Pure RPT Register Matter Ltd." });
    const rptFinding = makeFinding({
      recordId: "SA-RPT-01", caseName: "Pure RPT Register Matter Ltd.", orderIds: ["sa-rpt-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["non_disclosure_of_information", "rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2", ["non_disclosure_of_information"])],
    });
    const bundleOrder = makeOrder({ id: "sa-bundle-ord", caseName: "Complex Fraud Bundle Matter Ltd." });
    const bundleFinding = makeFinding({
      recordId: "SA-BUNDLE-01", caseName: "Complex Fraud Bundle Matter Ltd.", orderIds: ["sa-bundle-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2", []), link("PFUTP-4-1", [])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "An arm's-length related-party transaction was not disclosed to the Audit Committee or in the related-party register. There was no diversion, sham transaction, false financial statement, securities trading, price manipulation or investor inducement.",
      },
      [rptFinding, bundleFinding], ALL_PROVISIONS, [], new Map(), [], [rptOrder, bundleOrder]
    );
    const pfutpEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "PFUTP-4-1");
    // The bundled finding's PFUTP link has empty justifyingTags, so it is
    // AT MOST "comparable_unverified" (cited, not attributed) — never
    // fact_attributed — regardless of whether it clears the comparability
    // bar at all.
    if (pfutpEntry) expect(pfutpEntry.presentationTier).not.toBe("fact_attributed");
    const rptEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(rptEntry.presentationTier).toBe("fact_attributed");
  });

  it("Scenario B: diversion without market nexus — issue-proceeds and trading-specific precedents are distinguished from true diversion", () => {
    const divOrder = makeOrder({ id: "sb-div-ord", caseName: "Advances Diversion Matter B Ltd." });
    const divFinding = makeFinding({
      recordId: "SB-DIV-01", caseName: "Advances Diversion Matter B Ltd.", orderIds: ["sb-div-ord"],
      transactionTypes: ["fund_transfer_promoter_entity"], allegedConduct: ["fund_diversion"],
      provisionLinks: [link("TEST-DIVERSION-1")],
    });
    const issueOrder = makeOrder({ id: "sb-issue-ord", caseName: "Issue Proceeds Matter B Ltd." });
    const issueFinding = makeFinding({
      recordId: "SB-ISSUE-01", caseName: "Issue Proceeds Matter B Ltd.", orderIds: ["sb-issue-ord"],
      transactionTypes: ["rights_issue"], allegedConduct: ["fund_diversion"],
      provisionLinks: [link("TEST-ISSUE-PROCEEDS-1")],
    });
    const result = analyzeScenario(
      {
        freeText:
          "Company funds were diverted to promoter-controlled entities through advances without genuine business purpose. There was no false exchange disclosure, no securities dealing, no price manipulation and no issue proceeds.",
      },
      [divFinding, issueFinding], ALL_PROVISIONS, [], new Map(), [], [divOrder, issueOrder]
    );
    const divEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "TEST-DIVERSION-1")!;
    expect(divEntry.matterOutcomes[0]?.comparabilityTier).toBe("strongly_comparable");
    const issueEntry = result.historicalTreatment.entries.find((e) => e.provision.id === "TEST-ISSUE-PROCEEDS-1");
    // The issue-proceeds-specific precedent only overlaps on the generic
    // fund_diversion conduct tag — no transaction overlap at all (this
    // scenario affirmatively has "no issue proceeds") — so it must not
    // read as strongly comparable, if it surfaces at all.
    if (issueEntry?.matterOutcomes[0]) expect(issueEntry.matterOutcomes[0].comparabilityTier).not.toBe("strongly_comparable");
  });

  it("Scenario C: diversion + concealed false financials ranks ahead of Scenario B's pure-diversion precedent for the same provision", () => {
    const concealedOrder = makeOrder({ id: "sc-concealed-ord", caseName: "Concealed Diversion Matter C Ltd." });
    const concealedFinding = makeFinding({
      recordId: "SC-CONCEALED-01", caseName: "Concealed Diversion Matter C Ltd.", orderIds: ["sc-concealed-ord"],
      transactionTypes: ["fund_transfer_promoter_entity"], allegedConduct: ["fund_diversion", "financial_statement_misstatement"],
      provisionLinks: [link("TEST-DIVERSION-1")],
    });
    const pureOrder = makeOrder({ id: "sc-pure-ord", caseName: "Pure Diversion Matter C Ltd." });
    const pureFinding = makeFinding({
      recordId: "SC-PURE-01", caseName: "Pure Diversion Matter C Ltd.", orderIds: ["sc-pure-ord"],
      transactionTypes: ["fund_transfer_promoter_entity"], allegedConduct: ["fund_diversion"],
      provisionLinks: [link("TEST-DIVERSION-1")],
    });
    const result = analyzeScenario(
      {
        freeText:
          "Company funds were diverted to promoter-controlled entities through advances without genuine business purpose. The diversion was concealed because the company misrepresented its financial statements issued to shareholders.",
      },
      [concealedFinding, pureFinding], ALL_PROVISIONS, [], new Map(), [], [concealedOrder, pureOrder]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "TEST-DIVERSION-1")!;
    const concealedOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "SC-CONCEALED-01"))!;
    const pureOutcome = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "SC-PURE-01"))!;
    expect(entry.matterOutcomes.indexOf(concealedOutcome)).toBeLessThan(entry.matterOutcomes.indexOf(pureOutcome));
  });

  it("Scenario D: clean RPT control — no violation candidates, and enforcement matters are not characterized as strongly comparable merely for involving RPTs", () => {
    const shamOrder = makeOrder({ id: "sd-sham-ord", caseName: "Sham RPT Enforcement Matter D Ltd." });
    const shamFinding = makeFinding({
      recordId: "SD-SHAM-01", caseName: "Sham RPT Enforcement Matter D Ltd.", orderIds: ["sd-sham-ord"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["related_party_misrepresentation", "non_disclosure_of_information"],
      provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "An arm's-length related-party transaction was properly approved, accounted for and fully disclosed." },
      [shamFinding], ALL_PROVISIONS, [], new Map(), [], [shamOrder]
    );
    expect(result.provisionResults).toHaveLength(0);
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2");
    if (entry) {
      const mo = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "SD-SHAM-01"));
      expect(mo?.comparabilityTier).not.toBe("strongly_comparable");
    }
  });

  it("Scenario E: full investigation cooperation — no non-cooperation candidates, and a non-cooperation precedent is contradicted/demoted, not moderately comparable", () => {
    const noncoopOrder = makeOrder({ id: "se-noncoop-ord", caseName: "Non-Cooperation Enforcement Matter E Ltd." });
    const noncoopFinding = makeFinding({
      recordId: "SE-NONCOOP-01", caseName: "Non-Cooperation Enforcement Matter E Ltd.", orderIds: ["se-noncoop-ord"],
      actorRoles: ["promoter"], allegedConduct: ["non_cooperation_with_investigation"],
      provisionLinks: [link("SEBI-ACT-11C")],
    });
    const result = analyzeScenario(
      { freeText: "The company complied with every summons and supplied all requested records." },
      [noncoopFinding], ALL_PROVISIONS, [], new Map(), [], [noncoopOrder]
    );
    expect(result.provisionResults).toHaveLength(0);
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-11C");
    if (entry) {
      const mo = entry.matterOutcomes.find((m) => m.cases.some((c) => c.recordId === "SE-NONCOOP-01"));
      expect(mo?.comparabilityTier).not.toBe("moderately_comparable");
      expect(mo?.comparabilityTier).not.toBe("strongly_comparable");
    }
  });
});
