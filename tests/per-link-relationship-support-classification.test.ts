// Second-order P0 provision-precision remediation defect, found via the
// live-corpus integration trace (25 blind scenarios run against the real
// production corpus): a multi-provision finding's overall findingStatus
// (e.g. "Partly Confirmed in Final Order") was previously applied uniformly
// to EVERY provision it links, even when the DB's own per-link
// finding_provisions.relationship curation records that a SPECIFIC linked
// provision was only "alleged" (cited, not the basis of the disposition)
// or "not_upheld" (this specific charge was decided negatively) within that
// bundled finding.
//
// Concretely: FRL-01 (Future Retail Limited) is "Partly Confirmed in Final
// Order" overall because its LODR related-party-transaction disclosure
// provisions were confirmed -- but the order expressly holds "Fraud under
// Section 12A SEBI Act and Regulations 3(b),(c),(d),4(1),4(2)(f) PFUTP
// Regulations: not established ... no deliberate concealment or misleading
// intent found". The live finding_provisions row for FRL-01/PFUTP-4-1
// carries relationship="not_upheld"; every other FRL-01 PFUTP/SEBI-Act-12A
// link carries relationship="alleged". Before this fix, the engine ignored
// relationship entirely and classified FRL-01 as a positive "supporting"
// (even "Final merits support") precedent for every one of its 11 linked
// PFUTP/SEBI-Act-12A provisions purely because the finding's overall status
// was not in NEGATIVE_STATUSES -- exactly the "supporting precedent must
// mean supporting, not merely part of a bundled finding where another
// allegation was upheld" defect this remediation pass targets. See
// PrecedentRef.effectiveStatus and effectiveLinkStatus in engine.ts.
import { describe, expect, it } from "vitest";
import { analyzeScenario, supportCategory } from "@/lib/matching/engine";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  return {
    recordId: "MOCK-01",
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
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

describe("Per-link finding_provisions.relationship overrides the finding's overall status", () => {
  it("a link recorded not_upheld is excluded from supportingPrecedents even when the finding's overall status is positive elsewhere", () => {
    const lodrProvision = makeProvision({ id: "LODR-23-2" });
    const pfutpProvision = makeProvision({ id: "PFUTP-4-1" });
    const finding = makeFinding({
      recordId: "FRL-01",
      findingStatus: "Partly Confirmed in Final Order",
      allegedConduct: ["non_disclosure_of_information", "actual_price_manipulation"],
      provisionIds: [lodrProvision.id, pfutpProvision.id],
      provisionLinks: [
        { provisionId: lodrProvision.id, justifyingTags: [] },
        { provisionId: pfutpProvision.id, justifyingTags: [], relationship: "not_upheld" },
      ],
    });
    const result = analyzeScenario(
      { freeText: "A related-party transaction was undisclosed, and there was manipulation of the security price." },
      [finding],
      [lodrProvision, pfutpProvision],
      []
    );

    // The LODR provision (relationship-less link, uses the finding's own
    // positive overall status) still surfaces as a normal supporting
    // precedent.
    const lodrResult = result.provisionResults.find((p) => p.provision.id === lodrProvision.id);
    expect(lodrResult?.supportingPrecedents.some((s) => s.finding.recordId === "FRL-01")).toBe(true);

    // The PFUTP provision, whose OWN link is recorded not_upheld, must NOT
    // appear as a supporting precedent for FRL-01 -- this is the defect:
    // before the fix, it would have shown up here (and even inside
    // upheldPrecedents) purely because the finding's overall status is
    // "Partly Confirmed in Final Order".
    const pfutpResult = result.provisionResults.find((p) => p.provision.id === pfutpProvision.id);
    expect(pfutpResult?.supportingPrecedents.some((s) => s.finding.recordId === "FRL-01")).not.toBe(true);
    expect(pfutpResult?.upheldPrecedents.some((s) => s.finding.recordId === "FRL-01")).not.toBe(true);
  });

  it("a link recorded alleged is capped at Contextual / unresolved support category regardless of the finding's overall (higher) status", () => {
    const pfutpProvision = makeProvision({ id: "SEBI-ACT-12A-a" });
    const finding = makeFinding({
      recordId: "FRL-01",
      findingStatus: "Partly Confirmed in Final Order",
      allegedConduct: ["actual_price_manipulation", "false_appearance_of_trading"],
      provisionIds: [pfutpProvision.id],
      provisionLinks: [{ provisionId: pfutpProvision.id, justifyingTags: [], relationship: "alleged" }],
    });
    const result = analyzeScenario(
      { freeText: "Synchronized trading caused manipulation of the security price." },
      [finding],
      [pfutpProvision],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === pfutpProvision.id);
    const ref = pr?.supportingPrecedents.find((s) => s.finding.recordId === "FRL-01");
    expect(ref).toBeDefined();
    expect(ref?.effectiveStatus).toBe("Alleged");
    expect(supportCategory(ref!.effectiveStatus)).toBe("Contextual / unresolved");
    // The finding's own overall status is unchanged and still shown as-is
    // elsewhere (e.g. the finding's own status badge) -- only the
    // provision-specific classification is downgraded.
    expect(ref?.finding.findingStatus).toBe("Partly Confirmed in Final Order");
  });

  it("a link with no curated relationship falls back to the finding's own overall status unchanged (no regression for the majority of links)", () => {
    // LODR-2-zc: still ungated and actor-unspecific (unlike
    // LODR-31-statement, which the pre-merge legal-verification pass moved
    // to a gated rule — see disclosure-family-connectivity.test.ts) and
    // unrelated to this test's actual subject (per-link relationship/status
    // classification).
    const provision = makeProvision({ id: "LODR-2-zc" });
    const finding = makeFinding({
      recordId: "MOCK-02",
      findingStatus: "Confirmed in Final Order",
      allegedConduct: ["false_compliance_certification"],
      provisionIds: [provision.id],
      provisionLinks: [{ provisionId: provision.id, justifyingTags: [] }],
    });
    const result = analyzeScenario({ freeText: "There was a false certification by a promoter-controlled entity." }, [finding], [provision], []);
    const pr = result.provisionResults.find((p) => p.provision.id === provision.id);
    const ref = pr?.supportingPrecedents.find((s) => s.finding.recordId === "MOCK-02");
    expect(ref?.effectiveStatus).toBe("Confirmed in Final Order");
    expect(pr?.upheldPrecedents.some((s) => s.finding.recordId === "MOCK-02")).toBe(true);
  });
});
