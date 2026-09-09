// P0 FINAL: multi-sentence factual continuity.
//
// ROOT CAUSE: the Demo B narrative splits ONE factual object (the advanced
// funds) across two adjacent sentences purely for readability -- "A listed
// company advanced substantial funds to entities connected with its
// promoter group. The funds were subsequently transferred through multiple
// entities and were not used for the stated business purpose." -- with
// "listed_company" in sentence 0 and the actual diversion conduct in
// sentence 1, joined only by the anaphor "The funds". The existing
// same-sentence-only connectivity mechanism (isConnected,
// provision-retrieval-rules.ts) could not bridge this, so PFUTP-4-1's
// Explanation-based diversion route (see pfutp-4-1-diversion-route.test.ts)
// never fired on Demo B even though its own diversion facts are genuinely
// present, just one sentence apart.
//
// FIX: a new, bounded, deterministic cross-sentence continuity mechanism
// (computeContinuitySentenceGroups, conceptExtraction.ts) that links a
// sentence to the immediately preceding one ONLY when it opens (within its
// first 5 words) with a closed-class anaphoric cue referring back to a
// fund/transaction object ("the funds", "such proceeds", "the transaction",
// ...) and does NOT open with a break cue signalling a distinct episode
// ("separately", "a different X", "an unrelated X", ...). This is opt-in
// per retrieval route (ProvisionRetrievalRule.allowSentenceContinuity /
// alternateRoutes[].allowSentenceContinuity, provision-retrieval-rules.ts)
// -- currently only PFUTP-4-1's diversion alternate route and LODR-32
// (issue-proceeds monitoring, the same split-context/diversion-sentence
// pattern) opt in. Every other rule, and PFUTP-4-1's own primary
// securities-dealing route, stays same-sentence-only, so this can never
// unlock PFUTP 3(a)-(d), PFUTP 4(2)'s lettered sub-clauses, or SEBI Act
// 12A, nor bridge two genuinely unrelated sentences/entities/episodes
// elsewhere in a long scenario.
//
// A related Demo B RESULT-QUALITY defect was found and fixed in the same
// pass (see final report for the full audit): LODR Regulation 33's eleven
// sub-clauses and Ind AS 23 (Borrowing Costs) were both over-retrieved as
// PRIMARY candidates on Demo B, neither on its own genuine factual
// prerequisite --
//   - LODR-33's family gated on ANY_SUBSTANTIVE_VIOLATION_CONDUCT (a
//     15+-tag list spanning every kind of violation in the corpus)
//     connected to a bare financial-results-channel mention, when
//     Regulation 33's own subject is the correctness of financial RESULTS
//     CONTENT specifically -- narrowed to the same misstatement/fictitious-
//     content predicate Regulation 48 already requires
//     (FINANCIAL_RESULTS_CONTENT_VIOLATION, provision-retrieval-rules.ts).
//   - Ind AS 23 had NO retrieval rule at all (completely ungated), so it
//     surfaced on any financial-results-channel fact. The live corpus's
//     only IND-AS-23 link (MAGNUM-01) is squarely about reversed accrued
//     interest / unrecognised bank-loan interest expense -- Ind AS 23's
//     actual subject (Borrowing Costs) -- so a new interest_or_borrowing_
//     cost_misstatement concept tag now gates it on that specific fact
//     (concept-tags.ts).
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { computeContinuitySentenceGroups, detectConcepts } from "@/lib/matching/conceptExtraction";
import { passesRetrievalGate, retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeProvision(id: string, provisionNumber: string, subject: string, instrument = "PFUTP Regulations, 2003"): LegalProvision {
  return {
    id,
    instrument,
    provisionNumber,
    subject,
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
  };
}

let seq = 0;
function makeFinding(overrides: Partial<ScenarioFinding> & { provisionId: string; justifyingTags?: string[] }): ScenarioFinding {
  seq += 1;
  const { provisionId, justifyingTags = [], ...rest } = overrides;
  return {
    recordId: `CONTINUITY-MATRIX-${seq}`,
    caseName: "Synthetic Continuity Matrix Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic continuity-matrix finding",
    factualPattern: "Synthetic factual pattern for the multi-sentence continuity regression matrix.",
    provisionsConsideredRaw: null,
    provisionIds: [provisionId],
    provisionLinks: [{ provisionId, justifyingTags }],
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    // Broad transactionTypes/allegedConduct (mirrors the established
    // pfutp-4-1-diversion-route.test.ts convention) so the synthetic finding
    // scores above MIN_FINDING_SCORE against whichever query text each case
    // below actually states — what varies per test is the QUERY.
    transactionTypes: ["preferential_allotment", "rights_issue", "related_party_transaction", "listed_company"],
    actorRoles: ["promoter"],
    evidenceTypes: [],
    allegedConduct: ["fund_diversion", "circular_fund_movement", "financial_statement_misstatement", "non_disclosure_of_information"],
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
    ...rest,
  };
}

const PFUTP_4_1 = makeProvision("PFUTP-4-1", "Regulation 4(1)", "Manipulative, fraudulent or unfair trade practice in the securities market.");
const LODR_32 = makeProvision("LODR-32", "Regulation 32 / 32(7A)", "Monitoring/disclosure of issue-proceeds utilisation.", "LODR Regulations, 2015");

// Every PFUTP/SEBI-Act-12A provision the mandate requires must NOT
// automatically unlock, each with its own real id and its own independent
// gate untouched by this pass.
const NON_UNLOCKABLE_IDS = [
  "PFUTP-3-a",
  "PFUTP-3-b",
  "PFUTP-3-c",
  "PFUTP-3-d",
  "PFUTP-4-2-a",
  "PFUTP-4-2-b",
  "PFUTP-4-2-e",
  "PFUTP-4-2-f",
  "PFUTP-4-2-k",
  "PFUTP-4-2-r",
  "SEBI-ACT-12A-a",
  "SEBI-ACT-12A-b",
  "SEBI-ACT-12A-c",
];
const NON_UNLOCKABLE_PROVISIONS = NON_UNLOCKABLE_IDS.map((id) => makeProvision(id, id, "Synthetic non-unlockable provision for the P0 safety check."));

const DEMO_B_TEXT =
  "A listed company advanced substantial funds to entities connected with its promoter group. The funds were subsequently transferred through multiple entities and were not used for the stated business purpose. The company nevertheless reported the amounts as genuine business advances/receivables and did not disclose the actual end use or connected-party nature in its published financial statements.";

describe("P0 multi-sentence factual continuity: gate-level mechanics", () => {
  const pfutp41Rule = retrievalRuleForProvision("PFUTP-4-1");
  const lodr32Rule = retrievalRuleForProvision("LODR-32");

  it("1. exact Demo B text: PFUTP-4-1 gate passes via the continuity-linked diversion route", () => {
    const concepts = detectConcepts(DEMO_B_TEXT);
    const continuityMap = computeContinuitySentenceGroups(DEMO_B_TEXT);
    expect(passesRetrievalGate(pfutp41Rule, concepts, continuityMap)).toBe(true);
  });

  it("PFUTP-4-1 gate does NOT pass on Demo B text without the continuity map (proves the fix, not a pre-existing pass)", () => {
    const concepts = detectConcepts(DEMO_B_TEXT);
    expect(passesRetrievalGate(pfutp41Rule, concepts)).toBe(false);
  });

  it("4. issue-proceeds continuity: LODR-32 gate passes when the diversion sentence immediately follows the rights-issue sentence", () => {
    const text =
      "A listed company raised proceeds through a rights issue. The proceeds were transferred to promoter-connected entities instead of being used for the disclosed objects.";
    const concepts = detectConcepts(text);
    const continuityMap = computeContinuitySentenceGroups(text);
    expect(passesRetrievalGate(lodr32Rule, concepts, continuityMap)).toBe(true);
    expect(passesRetrievalGate(pfutp41Rule, concepts, continuityMap)).toBe(true);
  });
});

describe("P0 multi-sentence factual continuity: mandatory 13-scenario test matrix", () => {
  it("1. exact Demo B text -> PFUTP-4-1 surfaces as a candidate", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario({ freeText: DEMO_B_TEXT }, [finding], [PFUTP_4_1], []);
    expect(result.provisionResults.map((pr) => pr.provision.id)).toContain("PFUTP-4-1");
  });

  it("2. 'advanced funds ... routed through ... not used for stated purpose' (adjacent sentences) -> PFUTP-4-1 surfaces", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      {
        freeText:
          "A listed company advanced funds to promoter-connected entities. The funds were routed through several connected entities and were not used for the stated business purpose.",
      },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).toContain("PFUTP-4-1");
  });

  it("3. 'Such funds were subsequently diverted for purposes unrelated to the stated business purpose' -> PFUTP-4-1 surfaces (break-cue phrase mid-sentence must not defeat continuity)", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      {
        freeText: "A listed company advanced funds to promoter-connected entities. Such funds were subsequently diverted for purposes unrelated to the stated business purpose.",
      },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).toContain("PFUTP-4-1");
  });

  it("4. rights-issue proceeds diverted to promoter-connected entities -> correct issue-proceeds provision (LODR-32) surfaces, plus PFUTP-4-1 where its own prerequisites are independently met", () => {
    const findings = [makeFinding({ provisionId: "LODR-32" }), makeFinding({ provisionId: "PFUTP-4-1" })];
    const result = analyzeScenario(
      {
        freeText: "A listed company raised proceeds through a rights issue. The proceeds were transferred to promoter-connected entities instead of being used for the disclosed objects.",
      },
      findings,
      [LODR_32, PFUTP_4_1],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("LODR-32");
    expect(ids).toContain("PFUTP-4-1");
  });

  it("5. genuine business advance, funds USED for the stated purpose (no 'not') -> NO PFUTP-4-1", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A listed company made a genuine business advance to a supplier. The funds were used for the stated business purpose." },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).not.toContain("PFUTP-4-1");
  });

  it("6. unlisted private company diversion -> NO automatic PFUTP-4-1 (no listed_company fact anywhere)", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "An unlisted private company advanced funds to another private company. The funds were subsequently used for an unrelated purpose." },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).not.toContain("PFUTP-4-1");
  });

  it("7. material RPT not disclosed (cross-sentence continuity exists via 'the transaction', but no fund-diversion conduct at all) -> NO PFUTP-4-1 merely because continuity links the sentences", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A listed company entered into a material related-party transaction. The transaction was not disclosed in its financial statements." },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).not.toContain("PFUTP-4-1");
  });

  it("8. 'Separately, an unrelated entity diverted funds' -> NO cross-entity contamination from the first sentence's listed-company status", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A listed company made an investment. Separately, an unrelated entity diverted funds." },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).not.toContain("PFUTP-4-1");
  });

  it("9. 'Entity B separately routed its own funds' -> NO false bridge from Entity A's listed-company status to Entity B's funds", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A listed company advanced funds to Entity A. Entity B separately routed its own funds through connected entities." },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).not.toContain("PFUTP-4-1");
  });

  it("10. unrelated episode three months later -> do not bridge unrelated factual episodes merely because they appear in the same scenario", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A listed company advanced funds to a subsidiary. Three months later, a different transaction involving promoter entities was not disclosed." },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).not.toContain("PFUTP-4-1");
  });

  it("11. Demo A (RPT approval-lapse text): Reg 23(2)/23(4) remain core candidates; no PFUTP contamination; Reg 27/31 remain excluded without their own subject facts", () => {
    const DEMO_A_TEXT =
      "A listed company entered into a material transaction with an entity controlled by a promoter-related person. The transaction was entered into without prior Audit Committee approval and the material related-party transaction was not placed before shareholders for approval. The transaction and outstanding balance were also omitted from the company's related-party disclosures in its financial statements.";
    const reg232 = makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval of RPTs.", "LODR Regulations, 2015");
    const reg234 = makeProvision("LODR-23-4", "Regulation 23(4)", "Shareholder approval for material RPTs.", "LODR Regulations, 2015");
    const reg27 = makeProvision("LODR-27-2-a", "Regulation 27(2)(a)", "Quarterly corporate-governance compliance report.", "LODR Regulations, 2015");
    const reg31 = makeProvision("LODR-31-statement", "Regulation 31", "Shareholding pattern statement.", "LODR Regulations, 2015");
    const f232 = makeFinding({ provisionId: reg232.id, allegedConduct: ["rpt_approval_lapse"], transactionTypes: ["related_party_transaction"] });
    const f234 = makeFinding({ provisionId: reg234.id, allegedConduct: ["rpt_approval_lapse"], transactionTypes: ["related_party_transaction"] });
    const f27 = makeFinding({ provisionId: reg27.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const f31 = makeFinding({ provisionId: reg31.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const result = analyzeScenario(
      { freeText: DEMO_A_TEXT },
      [f232, f234, f27, f31, ...NON_UNLOCKABLE_IDS.map((id) => makeFinding({ provisionId: id }))],
      [reg232, reg234, reg27, reg31, ...NON_UNLOCKABLE_PROVISIONS],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("LODR-23-2");
    expect(ids).toContain("LODR-23-4");
    expect(ids).not.toContain("LODR-27-2-a");
    expect(ids).not.toContain("LODR-31-statement");
    for (const id of NON_UNLOCKABLE_IDS) expect(ids).not.toContain(id);
  });

  it("12. Demo C (compliant RPT + unrelated loan-default non-disclosure): Reg 30 primary; no Reg 27/31 contamination; no PFUTP contamination", () => {
    const DEMO_C_TEXT =
      "The related-party transaction was properly approved by the Audit Committee and shareholders and was appropriately disclosed. Separately, the listed company failed to disclose a material loan default to the stock exchanges within the applicable disclosure framework.";
    const reg30 = makeProvision("LODR-30", "Regulation 30", "Material event/information disclosure.", "LODR Regulations, 2015");
    const reg27 = makeProvision("LODR-27-2-a", "Regulation 27(2)(a)", "Quarterly corporate-governance compliance report.", "LODR Regulations, 2015");
    const reg31 = makeProvision("LODR-31-statement", "Regulation 31", "Shareholding pattern statement.", "LODR Regulations, 2015");
    const f30 = makeFinding({ provisionId: reg30.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["material_event_disclosure"] });
    const f27 = makeFinding({ provisionId: reg27.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const f31 = makeFinding({ provisionId: reg31.id, allegedConduct: ["non_disclosure_of_information"], transactionTypes: ["related_party_transaction"] });
    const result = analyzeScenario(
      { freeText: DEMO_C_TEXT },
      [f30, f27, f31, ...NON_UNLOCKABLE_IDS.map((id) => makeFinding({ provisionId: id }))],
      [reg30, reg27, reg31, ...NON_UNLOCKABLE_PROVISIONS],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("LODR-30");
    expect(ids).not.toContain("LODR-27-2-a");
    expect(ids).not.toContain("LODR-31-statement");
    for (const id of NON_UNLOCKABLE_IDS) expect(ids).not.toContain(id);
  });

  it("13. clean control: fully compliant multi-sentence narrative -> clean, no PFUTP-4-1, no issue-proceeds contamination", () => {
    const findings = [makeFinding({ provisionId: "PFUTP-4-1" }), makeFinding({ provisionId: "LODR-32" })];
    const result = analyzeScenario(
      {
        freeText:
          "A listed company raised proceeds through a rights issue. The proceeds were used exactly for the disclosed objects and fully accounted for in the company's financial statements.",
      },
      findings,
      [PFUTP_4_1, LODR_32],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).not.toContain("PFUTP-4-1");
    expect(ids).not.toContain("LODR-32");
  });
});

describe("P0 multi-sentence factual continuity: PFUTP-4-1-specific safety (no automatic unlock of sibling provisions)", () => {
  it("exact Demo B text does not automatically unlock PFUTP 3(a)-(d), PFUTP 4(2)'s lettered sub-clauses, or SEBI Act 12A(a)-(c)", () => {
    const findings = [makeFinding({ provisionId: "PFUTP-4-1" }), ...NON_UNLOCKABLE_IDS.map((id) => makeFinding({ provisionId: id }))];
    const result = analyzeScenario({ freeText: DEMO_B_TEXT }, findings, [PFUTP_4_1, ...NON_UNLOCKABLE_PROVISIONS], []);
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("PFUTP-4-1");
    for (const id of NON_UNLOCKABLE_IDS) {
      expect(ids).not.toContain(id);
    }
  });
});

describe("P0 Demo B result-quality fix: LODR Regulation 33 family no longer over-retrieved on generic non-disclosure facts", () => {
  it("Demo B's own facts (financial-results channel + non_disclosure_of_information, no misstatement fact) do NOT satisfy LODR-33's narrowed gate", () => {
    const rule = retrievalRuleForProvision("LODR-33-1-gen");
    const concepts = detectConcepts(DEMO_B_TEXT);
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });

  it("a genuine financial-results misstatement still satisfies LODR-33 (no regression to the existing positive case)", () => {
    const rule = retrievalRuleForProvision("LODR-33-1-a");
    const concepts = detectConcepts("Financial results contained a misstatement because they were not prepared on an accrual basis in a given quarter.");
    expect(passesRetrievalGate(rule, concepts)).toBe(true);
  });
});

describe("P0 Demo B result-quality fix: Ind AS 23 (Borrowing Costs) gated on its own subject, not generic misstatement", () => {
  it("Demo B's own facts (no interest/borrowing-cost fact) do NOT satisfy IND-AS-23's new gate", () => {
    const rule = retrievalRuleForProvision("IND-AS-23");
    const concepts = detectConcepts(DEMO_B_TEXT);
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });

  it("the live corpus's own MAGNUM-01 fact pattern (reversed accrued interest / unrecognised bank-loan interest expense) still satisfies IND-AS-23's gate (no regression)", () => {
    const rule = retrievalRuleForProvision("IND-AS-23");
    const concepts = detectConcepts(
      "The company reversed accumulated accrued interest and failed to recognize ongoing bank loan interest expense, and understated its restructured liability to a lender."
    );
    expect(passesRetrievalGate(rule, concepts)).toBe(true);
  });
});
