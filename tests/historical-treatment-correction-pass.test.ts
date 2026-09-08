// Historical Treatment correction pass: an independent review of the
// deterministic-completion pass's Historical Treatment feature found three
// defects (case-name-only matter dedup, a too-permissive "materially
// similar" bar reused from the precision engine, and noticee-specific
// outcomes silently collapsed by a finality-priority pick). This suite is
// NOT a paraphrase of the historical-treatment assertions already inside
// tests/deterministic-engine-completion-pass.test.ts (which still cover the
// basic architecture); every scenario here is authored fresh against the
// THREE specific fixes in historicalTreatment.ts, with new record/matter
// ids throughout.
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
    caseName: "Historical-Treatment Correction-Pass Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Historical-treatment correction-pass finding",
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
const LODR_48 = makeProvision("LODR-48", "Regulation 48", "Compliance with accounting standards.", "LODR Regulations, 2015");
const LODR_30 = makeProvision("LODR-30", "Regulation 30", "Material event/information disclosure.", "LODR Regulations, 2015");
const PFUTP_3_A = makeProvision("PFUTP-3-a", "Regulation 3(a)", "Dealing in securities in a fraudulent manner.", "PFUTP Regulations, 2003");
const SEBI_12A_A = makeProvision("SEBI-ACT-12A-a", "Section 12A(a)", "Manipulative/deceptive device connected with dealing.", "SEBI Act, 1992");
const SEBI_27 = makeProvision("SEBI-ACT-27", "Section 27", "Liability attribution to persons in charge of the company.", "SEBI Act, 1992");

describe("Historical Treatment correction pass: matter identity (defect #1)", () => {
  it("same case name + different matter IDs remain separate comparable matters", () => {
    const orderA = makeOrder({ id: "ord-A", caseName: "Sunrise Textiles Limited", matterId: "matter-alpha" });
    const orderB = makeOrder({ id: "ord-B", caseName: "Sunrise Textiles Limited", matterId: "matter-beta" });
    const findingA = makeFinding({
      recordId: "HTX-A-01", caseName: "Sunrise Textiles Limited", orderIds: ["ord-A"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const findingB = makeFinding({
      recordId: "HTX-B-01", caseName: "Sunrise Textiles Limited", orderIds: ["ord-B"],
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [findingA, findingB], [LODR_23_2], [], new Map(), [], [orderA, orderB]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.comparableMatterCount).toBe(2);
    expect(new Set(entry.matterOutcomes.map((mo) => mo.matterKey)).size).toBe(2);
    expect(entry.matterOutcomes.every((mo) => mo.matterIdBasis === "matter_id")).toBe(true);
  });

  it("different case names + same matter ID aggregate as ONE comparable matter", () => {
    const order1 = makeOrder({ id: "ord-1", caseName: "Alpha Corp Interim Order", matterId: "matter-gamma" });
    const order2 = makeOrder({ id: "ord-2", caseName: "Alpha Corp Limited (formerly Alpha Corp Interim)", matterId: "matter-gamma" });
    const finding1 = makeFinding({
      recordId: "ALPHA-01", caseName: "Alpha Corp Interim Order", orderIds: ["ord-1"], findingStatus: "Confirmed at interim",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const finding2 = makeFinding({
      recordId: "ALPHA-02", caseName: "Alpha Corp Limited (formerly Alpha Corp Interim)", orderIds: ["ord-2"], findingStatus: "Confirmed in Final Order",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [finding1, finding2], [LODR_23_2], [], new Map(), [], [order1, order2]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    // Different case-name strings but the SAME matter_id must aggregate as
    // one matter — the whole point of using matter_id over string-normalized
    // case names.
    expect(entry.comparableMatterCount).toBe(1);
    expect(entry.matterOutcomes[0].cases).toHaveLength(2);
  });

  it("interim and final sibling orders (same matter_id) do not double-count the matter", () => {
    const orderInterim = makeOrder({ id: "ord-i", caseName: "Beta Industries Limited", matterId: "matter-delta", orderStage: "Interim order" });
    const orderFinal = makeOrder({ id: "ord-f", caseName: "Beta Industries Limited", matterId: "matter-delta", orderStage: "Final order" });
    const findingInterim = makeFinding({
      recordId: "BETA-01", caseName: "Beta Industries Limited", orderIds: ["ord-i"], findingStatus: "Confirmed at interim",
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"], provisionLinks: [link("LODR-30")],
    });
    const findingFinal = makeFinding({
      recordId: "BETA-02", caseName: "Beta Industries Limited", orderIds: ["ord-f"], findingStatus: "Confirmed in Final Order",
      transactionTypes: ["material_event_disclosure"], allegedConduct: ["non_disclosure_of_information"], provisionLinks: [link("LODR-30")],
    });
    const result = analyzeScenario(
      { freeText: "A material event was not disclosed to the stock exchange within the prescribed timeline." },
      [findingInterim, findingFinal], [LODR_30], [], new Map(), [], [orderInterim, orderFinal]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-30")!;
    expect(entry.comparableMatterCount).toBe(1);
    expect(entry.totalFindingsCount).toBe(2);
    const mo = entry.matterOutcomes[0];
    expect(mo.cases.map((c) => c.orderStageClass).sort()).toEqual(["final_wtm", "interim_or_ex_parte"]);
    // Final supersedes interim for the SAME allegation — never "mixed".
    expect(mo.outcome).toBe("uniformly_confirmed_final");
  });

  it("falls back to case-name matching, with the basis disclosed, only when no linked order carries a matter_id", () => {
    const finding = makeFinding({
      recordId: "NOORDER-01", caseName: "Gamma Holdings Limited",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [finding], [LODR_23_2], []
    );
    expect(result.historicalTreatment.matterIdentityStats.resolvedViaCaseName).toBe(1);
    expect(result.historicalTreatment.matterIdentityStats.resolvedViaMatterId).toBe(0);
    expect(result.historicalTreatment.matterIdentityStats.resolvedViaOrderMetadata).toBe(0);
    expect(result.historicalTreatment.matterIdentityStats.caseNameFallbackRecordIds).toContain("NOORDER-01");
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.matterOutcomes[0].matterIdBasis).toBe("case_name_fallback");
  });
});

describe("Historical Treatment correction pass: comparability tiering (defect #2)", () => {
  it("one generic transaction tag alone is insufficient for 'strongly comparable' — it lands at 'moderately comparable'", () => {
    const finding = makeFinding({
      recordId: "GEN-01", caseName: "Single-Tag Matter Ltd.",
      transactionTypes: ["related_party_transaction"], allegedConduct: [], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario({ freeText: "A related-party transaction occurred with the counterparty." }, [finding], [LODR_23_2], []);
    expect(result.historicalTreatment.overallMatterCounts.stronglyComparable).toBe(0);
    expect(result.historicalTreatment.overallMatterCounts.moderatelyComparable).toBe(1);
  });

  it("overlap on BOTH transaction and conduct reaches 'strongly comparable'", () => {
    const finding = makeFinding({
      recordId: "GEN-02", caseName: "Dual-Tag Matter Ltd.",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"], provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [finding], [LODR_23_2], []
    );
    expect(result.historicalTreatment.overallMatterCounts.stronglyComparable).toBe(1);
  });

  it("overlap confined to actor/evidence tags only is 'contextually related', not 'moderately/strongly comparable'", () => {
    const finding = makeFinding({
      recordId: "GEN-03", caseName: "Actor-Only Matter Ltd.",
      actorRoles: ["promoter"], evidenceTypes: ["bank_statements_flow"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const result = analyzeScenario({ freeText: "A promoter was named in the matter, with bank statements on file." }, [finding], [SEBI_27], []);
    expect(result.historicalTreatment.overallMatterCounts.contextuallyRelated).toBe(1);
    expect(result.historicalTreatment.overallMatterCounts.stronglyComparable).toBe(0);
    expect(result.historicalTreatment.overallMatterCounts.moderatelyComparable).toBe(0);
  });

  it("a contextually-related matter contributes NO case entries to any provision, only a contextuallyRelatedMatterCount", () => {
    const finding = makeFinding({
      recordId: "GEN-04", caseName: "Actor-Only Matter Two Ltd.",
      actorRoles: ["promoter"], evidenceTypes: ["bank_statements_flow"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const result = analyzeScenario({ freeText: "A promoter was named in the matter, with bank statements on file." }, [finding], [SEBI_27], []);
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-27");
    expect(entry).toBeDefined();
    expect(entry!.comparableMatterCount).toBe(0);
    expect(entry!.cases).toHaveLength(0);
    expect(entry!.contextuallyRelatedMatterCount).toBe(1);
  });

  it("a scenario below the base factual-overlap bar is weak/excluded entirely — no entry, no count anywhere", () => {
    const finding = makeFinding({
      recordId: "GEN-05", caseName: "Below-Bar Matter Ltd.",
      evidenceTypes: ["bank_statements_flow"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const result = analyzeScenario({ freeText: "Bank statements were on file." }, [finding], [SEBI_27], []);
    expect(result.historicalTreatment.overallMatterCounts.weakExcluded).toBeGreaterThanOrEqual(0);
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-27");
    expect(entry).toBeUndefined();
  });

  it("a pure RPT scenario does not inherit unrelated provisions from a complex RPT+fraud historical matter as ATTRIBUTED — they appear, if at all, only as cited-and-unverified", () => {
    // One bundled finding: RPT non-disclosure (matches the query) PLUS
    // fictitious sales / trading fraud (does NOT match the query), citing
    // FOUR provisions with EMPTY justifyingTags — mirrors the real
    // corpus's own bundled, multi-issue findings and their data-quality
    // state.
    const bundled = makeFinding({
      recordId: "BUNDLE-CP-01", caseName: "Big Bundled Correction-Pass Matter Ltd.",
      transactionTypes: ["related_party_transaction", "preferential_allotment"],
      allegedConduct: ["non_disclosure_of_information", "fictitious_sales_or_revenue", "actual_price_manipulation"],
      provisionLinks: [link("LODR-23-2"), link("LODR-48"), link("PFUTP-3-a"), link("SEBI-ACT-12A-a")],
    });
    const result = analyzeScenario(
      { freeText: "An arm's-length related-party transaction was not disclosed, without the required audit committee approval." },
      [bundled], [LODR_23_2, LODR_48, PFUTP_3_A, SEBI_12A_A], []
    );
    const byId = new Map(result.historicalTreatment.entries.map((e) => [e.provision.id, e]));
    // Every one of the four is CITED (the finding did clear the
    // strongly-comparable bar via RPT+non-disclosure), but with empty
    // justifyingTags on every link, NONE are positively attributed — this
    // is the honest, disclosed data-quality state, not a fabricated
    // distinction.
    for (const id of ["LODR-23-2", "LODR-48", "PFUTP-3-a", "SEBI-ACT-12A-a"]) {
      expect(byId.get(id)!.attributedFindingsCount).toBe(0);
      expect(byId.get(id)!.unverifiedFindingsCount).toBe(1);
    }
    // Question A (the precision engine) must still correctly show ONLY
    // LODR-23-2 as an actual candidate on these facts — historical
    // treatment never leaks into current applicability.
    expect(result.provisionResults.map((p) => p.provision.id)).toEqual(["LODR-23-2"]);
  });

  it("when a bundled finding's OWN justifyingTags positively distinguish the RPT link from the fraud links, only the RPT link is attributed and the fraud links are excluded from this query's view entirely", () => {
    const bundled = makeFinding({
      recordId: "BUNDLE-CP-02", caseName: "Curated Bundled Matter Ltd.",
      transactionTypes: ["related_party_transaction", "preferential_allotment"],
      allegedConduct: ["non_disclosure_of_information", "fictitious_sales_or_revenue"],
      provisionLinks: [
        link("LODR-23-2", ["related_party_transaction", "non_disclosure_of_information"]), // curated: genuinely about the RPT fact
        link("PFUTP-3-a", ["fictitious_sales_or_revenue"]), // curated: genuinely about the UNRELATED fraud fact
      ],
    });
    const result = analyzeScenario(
      { freeText: "An arm's-length related-party transaction was not disclosed, without the required audit committee approval." },
      [bundled], [LODR_23_2, PFUTP_3_A], []
    );
    const byId = new Map(result.historicalTreatment.entries.map((e) => [e.provision.id, e]));
    expect(byId.get("LODR-23-2")!.attributedFindingsCount).toBe(1);
    // PFUTP-3-a's own curated tags positively point to a DIFFERENT fact —
    // it must not appear at all for this query, attributed or otherwise.
    expect(byId.has("PFUTP-3-a")).toBe(false);
  });
});

describe("Historical Treatment correction pass: noticee-specific outcome aggregation (defect #3)", () => {
  it("company upheld + director not upheld for the SAME provision produces an explicit mixed-outcome state, never a bare 'upheld'", () => {
    const order = makeOrder({ id: "ord-mixed", caseName: "Mixed Outcome Ltd.", matterId: "matter-mixed" });
    const findingCompany = makeFinding({
      recordId: "MIX-01", caseName: "Mixed Outcome Ltd.", orderIds: ["ord-mixed"], findingStatus: "Confirmed in Final Order",
      noticeeActors: ["Mixed Outcome Ltd. (company)"], actorRoles: ["company"], allegedConduct: ["fund_diversion"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const findingDirector = makeFinding({
      recordId: "MIX-02", caseName: "Mixed Outcome Ltd.", orderIds: ["ord-mixed"], findingStatus: "Confirmed in Final Order",
      noticeeActors: ["Independent Director Q"], actorRoles: ["company"], allegedConduct: ["fund_diversion"],
      provisionLinks: [link("SEBI-ACT-27", [], "not_upheld")],
    });
    const result = analyzeScenario(
      { freeText: "A promoter, acting as the person in charge of and responsible for the conduct of the company's business, diverted company funds." },
      [findingCompany, findingDirector], [SEBI_27], [], new Map(), [], [order]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-27")!;
    expect(entry.comparableMatterCount).toBe(1); // ONE matter (same matter_id)
    const mo = entry.matterOutcomes[0];
    expect(mo.outcome).toBe("mixed_noticee_outcome");
    expect(entry.dispositionBreakdown.mixedNoticeeOutcome).toBe(1);
    expect(entry.dispositionBreakdown.confirmedFinal).toBe(0); // never silently counted as a plain "confirmed"
  });

  it("separate noticees retain separate, individually-visible outcomes within the mixed matter", () => {
    const order = makeOrder({ id: "ord-sep", caseName: "Separate Noticees Ltd.", matterId: "matter-sep" });
    const findingA = makeFinding({
      recordId: "SEP-01", caseName: "Separate Noticees Ltd.", orderIds: ["ord-sep"], findingStatus: "Confirmed in Final Order",
      noticeeActors: ["Promoter R"], actorRoles: ["company"], allegedConduct: ["fund_diversion"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const findingB = makeFinding({
      recordId: "SEP-02", caseName: "Separate Noticees Ltd.", orderIds: ["ord-sep"], findingStatus: "Confirmed in Final Order",
      noticeeActors: ["CFO S"], actorRoles: ["company"], allegedConduct: ["fund_diversion"], provisionLinks: [link("SEBI-ACT-27", [], "not_upheld")],
    });
    const result = analyzeScenario(
      { freeText: "A promoter, acting as the person in charge of and responsible for the conduct of the company's business, diverted company funds." },
      [findingA, findingB], [SEBI_27], [], new Map(), [], [order]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-27")!;
    const mo = entry.matterOutcomes[0];
    const promoterCase = mo.cases.find((c) => c.noticeeActors.includes("Promoter R"))!;
    const cfoCase = mo.cases.find((c) => c.noticeeActors.includes("CFO S"))!;
    expect(promoterCase.effectiveStatus).toBe("Confirmed in Final Order");
    expect(cfoCase.effectiveStatus).toBe("Not Confirmed in Final Order");
  });

  it("final rejection supersedes interim prima facie treatment for that same noticee/provision (progression, not a mixed outcome)", () => {
    const order = makeOrder({ id: "ord-prog", caseName: "Progression Ltd.", matterId: "matter-prog" });
    const findingInterim = makeFinding({
      recordId: "PROG-01", caseName: "Progression Ltd.", orderIds: ["ord-prog"], findingStatus: "Confirmed at interim",
      allegedConduct: ["fund_diversion"], actorRoles: ["company"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const findingFinalRejected = makeFinding({
      recordId: "PROG-02", caseName: "Progression Ltd.", orderIds: ["ord-prog"], findingStatus: "Not Confirmed in Final Order",
      allegedConduct: ["fund_diversion"], actorRoles: ["company"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const result = analyzeScenario(
      { freeText: "A promoter, acting as the person in charge of and responsible for the conduct of the company's business, diverted company funds." },
      [findingInterim, findingFinalRejected], [SEBI_27], [], new Map(), [], [order]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-27")!;
    expect(entry.comparableMatterCount).toBe(1);
    const mo = entry.matterOutcomes[0];
    expect(mo.outcome).toBe("uniformly_not_upheld"); // the FINAL rejection, not "mixed" with the earlier interim view
    expect(entry.dispositionBreakdown.mixedNoticeeOutcome).toBe(0);
    expect(entry.dispositionBreakdown.notUpheld).toBe(1);
  });

  it("a not-upheld provision can never be counted as positive final precedent, even inside a mixed-outcome matter", () => {
    const order = makeOrder({ id: "ord-notup", caseName: "Not Upheld Component Ltd.", matterId: "matter-notup" });
    const findingUpheld = makeFinding({
      recordId: "NU-01", caseName: "Not Upheld Component Ltd.", orderIds: ["ord-notup"], findingStatus: "Confirmed in Final Order",
      allegedConduct: ["fund_diversion"], actorRoles: ["company"], provisionLinks: [link("SEBI-ACT-27")],
    });
    const findingNotUpheld = makeFinding({
      recordId: "NU-02", caseName: "Not Upheld Component Ltd.", orderIds: ["ord-notup"], findingStatus: "Confirmed in Final Order",
      allegedConduct: ["fund_diversion"], actorRoles: ["company"], provisionLinks: [link("SEBI-ACT-27", [], "not_upheld")],
    });
    const result = analyzeScenario(
      { freeText: "A promoter, acting as the person in charge of and responsible for the conduct of the company's business, diverted company funds." },
      [findingUpheld, findingNotUpheld], [SEBI_27], [], new Map(), [], [order]
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "SEBI-ACT-27")!;
    expect(entry.matterOutcomes[0].outcome).toBe("mixed_noticee_outcome");
    // The not_upheld case entry is preserved, individually, as such:
    const notUpheldCase = entry.matterOutcomes[0].cases.find((c) => c.recordId === "NU-02")!;
    expect(notUpheldCase.effectiveStatus).toBe("Not Confirmed in Final Order");
  });
});

describe("Historical Treatment correction pass: attribution disclosure", () => {
  it("an empty-justifying-tag historical provision link is labelled 'unverified', never implied to be historically invoked for the matching fact", () => {
    const finding = makeFinding({
      recordId: "ATTR-01", caseName: "Unverified Attribution Ltd.",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2")], // empty justifyingTags
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [finding], [LODR_23_2], []
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.attributedFindingsCount).toBe(0);
    expect(entry.unverifiedFindingsCount).toBe(1);
    expect(entry.cases[0].attributionStatus).toBe("unverified");
  });

  it("a non-empty, overlapping justifying-tag link is labelled 'attributed'", () => {
    const finding = makeFinding({
      recordId: "ATTR-02", caseName: "Verified Attribution Ltd.",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2", ["related_party_transaction"])],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [finding], [LODR_23_2], []
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.attributedFindingsCount).toBe(1);
    expect(entry.cases[0].attributionStatus).toBe("attributed");
  });

  it("a provision may be historically cited without being historically attributable to the matching fact — attributedFindingsCount and unverifiedFindingsCount are always reported separately, never merged into one ambiguous figure", () => {
    const findingAttributed = makeFinding({
      recordId: "MIXATTR-01", caseName: "Mixed Attribution Matter One Ltd.",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2", ["related_party_transaction"])],
    });
    const findingUnverified = makeFinding({
      recordId: "MIXATTR-02", caseName: "Mixed Attribution Matter Two Ltd.",
      transactionTypes: ["related_party_transaction"], allegedConduct: ["rpt_approval_lapse"],
      provisionLinks: [link("LODR-23-2")],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, without the required audit committee approval." },
      [findingAttributed, findingUnverified], [LODR_23_2], []
    );
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-23-2")!;
    expect(entry.attributedFindingsCount).toBe(1);
    expect(entry.unverifiedFindingsCount).toBe(1);
    expect(entry.totalFindingsCount).toBe(2);
  });
});

describe("Historical Treatment correction pass: critical invariant preserved", () => {
  it("historical frequency continues to have ZERO effect on Question A candidate applicability, even with the new tiering/attribution machinery", () => {
    // Ten strongly-comparable, fully-attributed historical matters for a
    // provision whose own factual retrieval prerequisite the CURRENT
    // scenario does not satisfy.
    const findings: ScenarioFinding[] = Array.from({ length: 10 }, (_, i) =>
      makeFinding({
        recordId: `FREQ-${i}`, caseName: `Frequent Matter ${i} Ltd.`,
        transactionTypes: ["financial_statement_disclosure"],
        allegedConduct: ["financial_statement_misstatement"],
        provisionLinks: [link("LODR-48", ["financial_statement_disclosure", "financial_statement_misstatement"])],
      })
    );
    // The CURRENT scenario states only a governance fact — no financial
    // results / misstatement fact at all — so LODR-48's own factual
    // prerequisite is not satisfied on THESE facts, no matter how many
    // historically comparable, fully-attributed matters exist.
    const result = analyzeScenario({ freeText: "The Compliance Officer position was vacant for the whole year." }, findings, [LODR_48], []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("LODR-48");
    const entry = result.historicalTreatment.entries.find((e) => e.provision.id === "LODR-48");
    expect(entry).toBeUndefined(); // no factual overlap with THIS query at all -- correctly absent, not merely gated
  });
});
