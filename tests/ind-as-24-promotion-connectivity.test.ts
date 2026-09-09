// P0 promotion-connectivity fix (final P0 correctness + demo QA pass): a
// permanent regression suite for the fix in engine.ts's
// linkScopedAllegedConduct. Root cause: for an UNGATED provision (Ind AS 24
// has no retrieval rule in the real curated data), whether the entered
// scenario's own matched adverse-conduct tag counts toward promoting that
// provision to a candidate breach was a FINDING-level bag-of-tags
// comparison — a matched conduct tag anywhere in the scenario, intersected
// with the supporting precedent's own finding-level allegedConduct array,
// regardless of which SPECIFIC provision-finding link that tag was actually
// curated to justify. A real production finding (REL-05) links to Ind AS 24
// with curated finding_provisions.justifying_tags = ["related_party_
// transaction", "related_party_misrepresentation"], but ALSO carries an
// unrelated generic "non_disclosure_of_information" tag at the finding
// level (from a different aspect of that historical matter) — so an
// entirely unrelated non-disclosure stated elsewhere in the CURRENT
// scenario (e.g. a loan-default disclosure failure) matched that generic
// tag and promoted Ind AS 24 as if the RPT itself were undisclosed, even
// where the scenario affirmatively states the RPT was properly disclosed.
//
// The fix: when a provision-finding LINK carries curated justifyingTags
// that include at least one ADVERSE (conduct-kind) concept id, those ids
// become the authoritative list of which adverse concept this SPECIFIC
// link is about — promotion requires the scenario to independently match
// one of THOSE ids, not merely any tag in the finding's whole allegedConduct
// bag. A link whose justifyingTags carry no adverse id at all (e.g. purely
// an evidence-type narrowing gate) is completely unaffected — this is not
// a sentence-position/negation-based check (which was tried and reverted
// for breaking legitimate "no Compliance Officer" / "no Audit Committee
// meeting" phrasing), it is a curated-data attribution check.
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

// Real production shape, mirroring REL-05's actual finding_provisions row
// for Ind AS 24 (queried live from Supabase during this session):
// justifying_tags = ["related_party_transaction", "related_party_misrepresentation"].
const indAs24 = makeProvision({ id: "IND-AS-24", subject: "Related Party Disclosures" });
const rptApproval = makeProvision({ id: "MOCK-RPT-APPROVAL", subject: "Prior Audit Committee / shareholder approval of RPTs" });

describe("Ind AS 24 promotion-connectivity fix — mandatory regression matrix", () => {
  // 1. compliant RPT disclosure -> no Ind AS 24 breach candidate
  it("1. compliant RPT disclosure never promotes Ind AS 24", () => {
    const finding = makeFinding({
      recordId: "CASE1",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      { freeText: "The related-party transaction was properly disclosed, including the transaction and outstanding balance." },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).not.toContain(indAs24.id);
  });

  // 2. omitted RPT disclosure -> Ind AS 24 candidate
  it("2. an actually omitted/misrepresented RPT disclosure promotes Ind AS 24", () => {
    const finding = makeFinding({
      recordId: "CASE2",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      { freeText: "There was a misrepresented related party dealing recorded as a false RPT disclosure in the annual report." },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).toContain(indAs24.id);
  });

  // 3. compliant RPT + unrelated loan-default nondisclosure -> no Ind AS 24 candidate
  it("3. compliant RPT plus an unrelated, separately-stated disclosure failure does not promote Ind AS 24 (Demo C shape)", () => {
    const finding = makeFinding({
      recordId: "CASE3",
      allegedConduct: ["related_party_misrepresentation", "non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction", "material_event_disclosure"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction was properly approved and disclosed. Separately, the company failed to disclose a material default to the stock exchanges.",
      },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).not.toContain(indAs24.id);
  });

  // 4. RPT approval failure but complete Ind AS 24 disclosure -> approval
  //    provision is a candidate, Ind AS 24 is not.
  it("4. an approval-only lapse promotes the approval provision but not Ind AS 24", () => {
    const finding = makeFinding({
      recordId: "CASE4",
      allegedConduct: ["rpt_approval_lapse", "related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [rptApproval.id, indAs24.id],
      provisionLinks: [
        link(rptApproval.id, ["related_party_transaction", "rpt_approval_lapse"]),
        link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"]),
      ],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction was entered into without prior audit committee approval, but the transaction and outstanding balance were properly disclosed in the related-party register.",
      },
      [finding],
      [rptApproval, indAs24],
      []
    );
    const ids = breachIds(result);
    expect(ids).toContain(rptApproval.id);
    expect(ids).not.toContain(indAs24.id);
  });

  // 5. complete RPT approval but omitted accounting disclosure -> Ind AS 24
  //    is a candidate, the approval provision is not.
  it("5. a disclosure-only lapse promotes Ind AS 24 but not the approval provision", () => {
    const finding = makeFinding({
      recordId: "CASE5",
      allegedConduct: ["rpt_approval_lapse", "related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [rptApproval.id, indAs24.id],
      provisionLinks: [
        link(rptApproval.id, ["related_party_transaction", "rpt_approval_lapse"]),
        link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"]),
      ],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction received prior audit committee approval, but it was a misrepresented related party dealing recorded as a false RPT disclosure.",
      },
      [finding],
      [rptApproval, indAs24],
      []
    );
    const ids = breachIds(result);
    expect(ids).toContain(indAs24.id);
    expect(ids).not.toContain(rptApproval.id);
  });

  // 6. promoter-connected entity but no RPT stated -> no automatic Ind AS 24 breach
  it("6. a bare promoter-connected relationship with no transaction stated never promotes Ind AS 24", () => {
    const finding = makeFinding({
      recordId: "CASE6",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      { freeText: "The company disclosed a relationship with a promoter-connected related party, but no transaction occurred." },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).not.toContain(indAs24.id);
  });

  // 7. unrelated financial misstatement elsewhere -> does not promote Ind AS 24
  it("7. an unrelated financial-statement misstatement elsewhere does not promote Ind AS 24", () => {
    const finding = makeFinding({
      recordId: "CASE7",
      allegedConduct: ["related_party_misrepresentation", "financial_statement_misstatement"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction was properly disclosed. Separately, the company's financial statements contained a misstatement of revenue.",
      },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).not.toContain(indAs24.id);
  });

  // 8. two-sentence mixed adverse/compliant case (distinct from #3's exact wording)
  it("8. a two-sentence mixed compliant/adverse case keeps the adverse issue independent of the compliant RPT", () => {
    const finding = makeFinding({
      recordId: "CASE8",
      allegedConduct: ["related_party_misrepresentation", "non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction", "material_event_disclosure"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction and outstanding balance were correctly disclosed. The company separately did not disclose a material development to the stock exchanges.",
      },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).not.toContain(indAs24.id);
  });

  // 9. same-sentence mixed facts
  it("9. a single sentence mixing compliant RPT language with an unrelated adverse fact does not promote Ind AS 24", () => {
    const finding = makeFinding({
      recordId: "CASE9",
      allegedConduct: ["related_party_misrepresentation", "non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction", "material_event_disclosure"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction was properly disclosed, though the company did not disclose a material development to the stock exchanges.",
      },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).not.toContain(indAs24.id);
  });

  // 10. "no Compliance Officer" remains correctly adverse
  it("10. 'no Compliance Officer' still correctly promotes a Compliance Officer provision", () => {
    const complianceOfficer = makeProvision({ id: "MOCK-CO-6-2-a", subject: "Compliance Officer appointment" });
    const auditCommittee = makeProvision({ id: "MOCK-AC-18-1-d", subject: "Audit Committee constitution and functioning" });
    const finding = makeFinding({
      recordId: "CASE10",
      allegedConduct: ["audit_committee_deficiency", "compliance_officer_deficiency"],
      transactionTypes: ["audit_committee_process", "compliance_officer_appointment"],
      provisionIds: [auditCommittee.id, complianceOfficer.id],
      provisionLinks: [link(auditCommittee.id, ["audit_committee_deficiency"]), link(complianceOfficer.id, ["compliance_officer_deficiency"])],
    });
    const result = analyzeScenario(
      { freeText: "The Audit Committee was properly constituted and met as required. The company had no Compliance Officer for five months." },
      [finding],
      [auditCommittee, complianceOfficer],
      []
    );
    const ids = breachIds(result);
    expect(ids).toContain(complianceOfficer.id);
    expect(ids).not.toContain(auditCommittee.id);
  });

  // 11. "no Audit Committee meeting was held" remains correctly adverse
  it("11. 'no audit committee meeting' still correctly promotes an Audit Committee provision", () => {
    const auditCommittee = makeProvision({ id: "MOCK-AC-18-1-d-2", subject: "Audit Committee constitution and functioning" });
    const finding = makeFinding({
      recordId: "CASE11",
      allegedConduct: ["audit_committee_deficiency"],
      transactionTypes: ["audit_committee_process"],
      provisionIds: [auditCommittee.id],
      provisionLinks: [link(auditCommittee.id, ["audit_committee_deficiency"])],
    });
    const result = analyzeScenario(
      { freeText: "There was no audit committee meeting held during the year." },
      [finding],
      [auditCommittee],
      []
    );
    expect(breachIds(result)).toContain(auditCommittee.id);
  });

  // 12. actor-connectivity sanity check remains unchanged (full suite: tests/actor-applicability-connectivity.test.ts)
  it("12. actor-incompatible provisions elsewhere still do not falsely withhold an unrelated actor-unstated candidate", () => {
    const coProvision = makeProvision({ id: "MOCK-CO-ACTOR-SANITY", subject: "Compliance Officer appointment" });
    const finding = makeFinding({
      recordId: "CASE12",
      allegedConduct: ["compliance_officer_deficiency"],
      transactionTypes: ["compliance_officer_appointment"],
      provisionIds: [coProvision.id],
      provisionLinks: [link(coProvision.id, ["compliance_officer_deficiency"])],
    });
    const result = analyzeScenario(
      { freeText: "The company had no Compliance Officer for five months." },
      [finding],
      [coProvision],
      []
    );
    expect(breachIds(result)).toContain(coProvision.id);
  });

  // 13. polarity-connectivity sanity check remains unchanged (full suite: tests/question-a-polarity-connectivity.test.ts)
  it("13. an unrelated compliant fact elsewhere does not cure a connected, unstated adverse fact", () => {
    const finding = makeFinding({
      recordId: "CASE13",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      { freeText: "The Audit Committee was properly constituted and met as required. The related-party transaction was misrepresented related party dealing recorded as a false RPT disclosure." },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).toContain(indAs24.id);
  });

  // 14. clean controls remain zero-candidate
  it("14. a genuinely clean, no-issue scenario surfaces zero candidates", () => {
    const finding = makeFinding({
      recordId: "CASE14",
      allegedConduct: ["related_party_misrepresentation"],
      transactionTypes: ["related_party_transaction"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      { freeText: "The company held its annual general meeting within the statutory timeline and no shareholder raised any objection." },
      [finding],
      [indAs24],
      []
    );
    expect(result.provisionResults.length).toBe(0);
  });

  // 15. Historical Treatment can still contain Ind AS 24 even when the
  //     current scenario does not treat it as a candidate.
  it("15. Historical Treatment can still surface Ind AS 24 even when it is not a current candidate", () => {
    const finding = makeFinding({
      recordId: "CASE15",
      allegedConduct: ["related_party_misrepresentation", "non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction", "material_event_disclosure"],
      provisionIds: [indAs24.id],
      provisionLinks: [link(indAs24.id, ["related_party_transaction", "related_party_misrepresentation"])],
    });
    const result = analyzeScenario(
      {
        freeText:
          "The related-party transaction was properly approved and disclosed. Separately, the company failed to disclose a material default to the stock exchanges.",
      },
      [finding],
      [indAs24],
      []
    );
    expect(breachIds(result)).not.toContain(indAs24.id);
    const historicalEntry = result.historicalTreatment.entries.find((e) => e.provision.id === indAs24.id);
    expect(historicalEntry).toBeDefined();
    expect(historicalEntry!.currentCandidateTier).not.toBe("primary_candidate");
  });
});
