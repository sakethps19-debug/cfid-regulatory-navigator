// P0 RECALL-HARDENING SPRINT: root-cause fixes identified by the blind
// legal acceptance benchmark (33% core-issue recall). Every fix below is a
// conservative, concept-level vocabulary/gate improvement mapped to the
// SAME legal concept the existing architecture already recognises under a
// different phrasing — never a scenario-specific string patch, never a
// relaxation of provision-specific prerequisites, actor connectivity,
// subject connectivity, polarity, or PFUTP/disclosure-family separation.
// See the sprint's final report for the full root-cause map and the
// (confirmed, tested-against) reasons two benchmark scenarios (16, 17)
// remain unfixed: their "but"-split negation-scoping design (splitIntoSentences)
// is also deliberately used elsewhere to isolate topically-DISTINCT
// contrasted clauses (question-a-polarity-connectivity.test.ts #57), so a
// general "a contrastive-conjunction split always continues the same
// subject" continuity rule was rejected as unsafe rather than shipped.
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
    recordId: `RECALL-HARDENING-${seq}`,
    caseName: "Synthetic Recall-Hardening Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic recall-hardening finding",
    factualPattern: "Synthetic factual pattern for the P0 recall-hardening regression matrix.",
    provisionsConsideredRaw: null,
    provisionIds: [provisionId],
    provisionLinks: [{ provisionId, justifyingTags }],
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
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

describe("Vocabulary hardening: fictitious_or_nongenuine_assets ('non-genuine receivables')", () => {
  const rule = retrievalRuleForProvision("LODR-48");
  it("positive: 'non-genuine receivables and assets' now detects fictitious_or_nongenuine_assets", () => {
    const concepts = detectConcepts("A listed company recorded non-genuine receivables and assets in its books and included those amounts in its published financial statements.");
    expect(concepts.map((c) => c.id)).toContain("fictitious_or_nongenuine_assets");
    expect(passesRetrievalGate(rule, concepts)).toBe(true);
  });
  it("paraphrase: 'bogus receivables' also detects the same concept", () => {
    const concepts = detectConcepts("The financial statements included bogus receivables that were never genuine.");
    expect(concepts.map((c) => c.id)).toContain("fictitious_or_nongenuine_assets");
  });
  it("negative control: genuine, verified receivables do not trigger it", () => {
    const concepts = detectConcepts("A listed company recorded receivables in its books, fully verified and genuine, in its published financial statements.");
    expect(concepts.map((c) => c.id)).not.toContain("fictitious_or_nongenuine_assets");
  });
});

describe("Vocabulary hardening: fund_diversion ('purposes different from'/'purposes unrelated to')", () => {
  it("positive: rights-issue proceeds 'used for purposes different from the disclosed objects' detects fund_diversion, connected to rights_issue via continuity", () => {
    const text = "A listed company raised funds through a rights issue for stated business objects. The proceeds were subsequently transferred to promoter-connected entities and were used for purposes different from the disclosed objects.";
    const concepts = detectConcepts(text);
    expect(concepts.map((c) => c.id)).toContain("fund_diversion");
    const continuityMap = computeContinuitySentenceGroups(text);
    expect(passesRetrievalGate(retrievalRuleForProvision("LODR-32"), concepts, continuityMap)).toBe(true);
  });
  it("paraphrase: 'used for purposes unrelated to the company's business' also detects fund_diversion", () => {
    const concepts = detectConcepts("Funds belonging to a listed company were transferred to the personal bank account of its promoter and were used for purposes unrelated to the company's business.");
    expect(concepts.map((c) => c.id)).toContain("fund_diversion");
  });
  it("negative control: funds used FOR the stated/disclosed purpose (no 'different from'/'unrelated to') do not trigger it", () => {
    const concepts = detectConcepts("The proceeds were used for the stated business objects exactly as disclosed.");
    expect(concepts.map((c) => c.id)).not.toContain("fund_diversion");
  });
  it("cross-subject control: a bare mention of 'the company's business' elsewhere does not trigger fund_diversion", () => {
    const concepts = detectConcepts("The company's business involves manufacturing and export of textiles.");
    expect(concepts.map((c) => c.id)).not.toContain("fund_diversion");
  });
});

describe("Vocabulary hardening: circular_fund_movement ('circular movement of money') and sham_preferential_allotment ('no genuine independent consideration')", () => {
  it("positive: 'circular movement of money' detects circular_fund_movement", () => {
    const concepts = detectConcepts("The consideration was funded through a circular movement of money originating from promoter-connected entities.");
    expect(concepts.map((c) => c.id)).toContain("circular_fund_movement");
  });
  it("positive: 'no genuine independent consideration being received' detects sham_preferential_allotment", () => {
    const concepts = detectConcepts("The allotment resulted in no genuine independent consideration being received.");
    expect(concepts.map((c) => c.id)).toContain("sham_preferential_allotment");
  });
  it("negative control: consideration genuinely and independently received does not trigger sham_preferential_allotment", () => {
    const concepts = detectConcepts("The allotment was made against genuine and independent consideration duly received in cash.");
    expect(concepts.map((c) => c.id)).not.toContain("sham_preferential_allotment");
  });
});

describe("Vocabulary hardening: actual_price_manipulation ('artificially increasing the market price') and PFUTP price-manipulation family", () => {
  it("Critical PFUTP test 1: coordinated trading with intent to artificially increase the market price surfaces price-manipulation PFUTP provisions", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "Connected entities repeatedly traded in the shares of a listed company in a coordinated manner with the intention of artificially increasing the market price of the shares." },
      [finding],
      [makeProvision("PFUTP-4-1", "Regulation 4(1)", "Manipulative, fraudulent or unfair trade practice.")],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).toContain("PFUTP-4-1");
  });
  it("paraphrase: 'artificially decreasing the share price' also detects actual_price_manipulation", () => {
    const concepts = detectConcepts("The scheme was designed with the aim of artificially decreasing the share price ahead of a buyback.");
    expect(concepts.map((c) => c.id)).toContain("actual_price_manipulation");
  });
  it("negative control: a genuine, market-driven price increase does not trigger it", () => {
    const concepts = detectConcepts("The share price rose following genuinely positive quarterly results, with no allegation of manipulation.");
    expect(concepts.map((c) => c.id)).not.toContain("actual_price_manipulation");
  });
  it("Critical PFUTP test 3: pure fund diversion to promoter entities does NOT automatically unlock trading-manipulation clauses", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-2-e" });
    const result = analyzeScenario(
      { freeText: "A listed company diverted its funds to promoter entities and the funds were not used for the stated business purpose." },
      [finding],
      [makeProvision("PFUTP-4-2-e", "Regulation 4(2)(e)", "Manipulation of the security's price.")],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).not.toContain("PFUTP-4-2-e");
  });
});

describe("Vocabulary hardening: false_appearance_of_trading / non_genuine_dealing_or_ownership ('synchronised trades', 'without genuine change in beneficial ownership')", () => {
  it("Critical PFUTP test 2: synchronised trades creating artificial volume without genuine ownership change surfaces PFUTP trading provisions", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-2-a" });
    const result = analyzeScenario(
      { freeText: "Several connected entities entered into synchronised trades in the shares of a listed company, creating artificial trading volume without genuine change in beneficial ownership." },
      [finding],
      [makeProvision("PFUTP-4-2-a", "Regulation 4(2)(a)", "False or misleading appearance of trading.")],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).toContain("PFUTP-4-2-a");
  });
  it("paraphrase: 'without real change in beneficial ownership' also detects non_genuine_dealing_or_ownership", () => {
    const concepts = detectConcepts("Shares changed hands between connected accounts without real change in beneficial ownership.");
    expect(concepts.map((c) => c.id)).toContain("non_genuine_dealing_or_ownership");
  });
  it("negative control: a genuine trade with real ownership change does not trigger it", () => {
    const concepts = detectConcepts("The shares were sold in a genuine, arm's-length transaction with a real change in beneficial ownership.");
    expect(concepts.map((c) => c.id)).not.toContain("non_genuine_dealing_or_ownership");
  });
});

describe("Vocabulary hardening: corporate_announcement channel ('announcement to the stock exchange(s)', 'disseminated to investors')", () => {
  it("positive: a false announcement to the stock exchanges disseminated to investors surfaces PFUTP 4(2)(f)/(k)", () => {
    const findings = [makeFinding({ provisionId: "PFUTP-4-2-f" }), makeFinding({ provisionId: "PFUTP-4-2-k" })];
    const result = analyzeScenario(
      {
        freeText:
          "A listed company made a materially false announcement to the stock exchanges regarding a major business contract. The announcement was disseminated to investors although management knew that no such binding contract existed.",
      },
      findings,
      [makeProvision("PFUTP-4-2-f", "Regulation 4(2)(f)", "Publishing untrue information."), makeProvision("PFUTP-4-2-k", "Regulation 4(2)(k)", "Disseminating false information.")],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("PFUTP-4-2-f");
    expect(ids).toContain("PFUTP-4-2-k");
  });
  it("cross-subject control: a false announcement does NOT automatically unlock PFUTP 3(a)-(d)/SEBI Act 12A (no securities-dealing nexus stated)", () => {
    const findings = ["PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "SEBI-ACT-12A-a"].map((id) => makeFinding({ provisionId: id }));
    const provisions = ["PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "SEBI-ACT-12A-a"].map((id) => makeProvision(id, id, "Synthetic dealing-nexus provision."));
    const result = analyzeScenario(
      {
        freeText:
          "A listed company made a materially false announcement to the stock exchanges regarding a major business contract. The announcement was disseminated to investors although management knew that no such binding contract existed.",
      },
      findings,
      provisions,
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    for (const id of ["PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "SEBI-ACT-12A-a"]) expect(ids).not.toContain(id);
  });
});

describe("Vocabulary hardening: financial_statement_misstatement ('misstated revenue/expenses/profit') scoped to financial content only", () => {
  it("positive: 'materially misstated revenue, expenses and profit figures' surfaces the financial-results family", () => {
    const finding = makeFinding({ provisionId: "LODR-48" });
    const result = analyzeScenario(
      { freeText: "A listed company published quarterly financial results containing materially misstated revenue, expenses and profit figures." },
      [finding],
      [makeProvision("LODR-48", "Regulation 48", "Compliance with accounting standards.", "LODR Regulations, 2015")],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).toContain("LODR-48");
  });
  it("regression control: bare 'misstated'/'materially misstated' with NO financial-content noun must NOT satisfy a single-group financial-statement-misstatement gate (confirmed false positive found and fixed during this pass)", () => {
    const rule = retrievalRuleForProvision("IND-AS-1");
    const concepts = detectConcepts("A listed company submitted its quarterly corporate-governance compliance report but materially misstated the composition and independence of its board and committees.");
    expect(concepts.map((c) => c.id)).not.toContain("financial_statement_misstatement");
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });
});

describe("Polarity/classification fix: PFUTP-4-1's alternate diversion route requires genuine adverse fund-movement conduct, not a bare 'transferred to a personal/promoter account' transaction fact", () => {
  it("Scenario 10: gate-passing, genuinely adverse promoter-personal-account diversion now promotes to primary_candidate (was misclassified as governing/additional_fact_required)", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "Funds belonging to a listed company were transferred to the personal bank account of its promoter and were used for purposes unrelated to the company's business." },
      [finding],
      [makeProvision("PFUTP-4-1", "Regulation 4(1)", "Manipulative, fraudulent or unfair trade practice.")],
      []
    );
    const pr = result.provisionResults.find((p) => p.provision.id === "PFUTP-4-1");
    expect(pr).toBeDefined();
    expect(pr?.candidateTier).toBe("primary_candidate");
  });
  it("general classification-defect regression: a bare 'transferred to a personal account' fact with NO adverse characterisation does NOT alone satisfy the gate", () => {
    const concepts = detectConcepts("A listed company transferred funds to the personal bank account of its promoter as part of an approved and disclosed remuneration arrangement.");
    const rule = retrievalRuleForProvision("PFUTP-4-1");
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });
});

describe("RPT accounting-disclosure route: Ind AS 24 (Related Party Disclosures) gated on its own subject", () => {
  it("Scenario 4: RPT and its outstanding balance omitted from the financial-statement RPT disclosures now surfaces Ind AS 24 (was 'no potentially relevant provisions identified')", () => {
    const finding = makeFinding({ provisionId: "IND-AS-24", transactionTypes: ["related_party_transaction"], allegedConduct: ["non_disclosure_of_information", "related_party_misrepresentation"] });
    const result = analyzeScenario(
      { freeText: "A listed company entered into transactions with entities controlled by members of the promoter group. The transactions and outstanding balances were omitted from the related-party disclosures in the company's financial statements." },
      [finding],
      [makeProvision("IND-AS-24", "Ind AS 24", "Related Party Disclosures.", "Indian Accounting Standards")],
      []
    );
    expect(result.provisionResults.map((pr) => pr.provision.id)).toContain("IND-AS-24");
  });
  it("negative control: a genuinely, accurately disclosed RPT does not satisfy the Ind AS 24 gate", () => {
    const rule = retrievalRuleForProvision("IND-AS-24");
    const concepts = detectConcepts("The related-party transaction and its outstanding balance were fully and accurately disclosed in the notes to the financial statements.");
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });
  it("cross-subject control: a related-party transaction connected only to an approval lapse (no misrepresentation/non-disclosure) does not satisfy Ind AS 24's own gate", () => {
    const rule = retrievalRuleForProvision("IND-AS-24");
    const concepts = detectConcepts("The related-party transaction was entered into without prior Audit Committee approval.");
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });
});

describe("Continuity regression fix: LODR-23-2/23-4 (Scenario 5) — a strict superset of an already-correct RPT-approval fact pattern must not lose the provision", () => {
  it("Scenario 3 (baseline, no continuity needed): RPT approval lapse alone surfaces LODR-23-2/23-4", () => {
    const findings = [makeFinding({ provisionId: "LODR-23-2" }), makeFinding({ provisionId: "LODR-23-4" })];
    const result = analyzeScenario(
      {
        freeText:
          "A listed company entered into a material transaction with an entity controlled by a promoter-related person. The transaction was entered into without prior Audit Committee approval and the material related-party transaction was not placed before shareholders for approval.",
      },
      findings,
      [makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval.", "LODR Regulations, 2015"), makeProvision("LODR-23-4", "Regulation 23(4)", "Shareholder approval.", "LODR Regulations, 2015")],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("LODR-23-2");
    expect(ids).toContain("LODR-23-4");
  });
  it("Scenario 5 (regression): the SAME facts plus one more, fully consistent sentence about the transaction's disclosure fate no longer loses LODR-23-2/23-4", () => {
    const findings = [makeFinding({ provisionId: "LODR-23-2" }), makeFinding({ provisionId: "LODR-23-4" })];
    const result = analyzeScenario(
      {
        freeText:
          "A listed company entered into a material transaction with an entity controlled by a promoter-related person. The transaction was entered into without prior Audit Committee approval and was not placed before shareholders for approval. The transaction and outstanding balance were also omitted from the company's related-party disclosures in its financial statements.",
      },
      findings,
      [makeProvision("LODR-23-2", "Regulation 23(2)", "Prior Audit Committee approval.", "LODR Regulations, 2015"), makeProvision("LODR-23-4", "Regulation 23(4)", "Shareholder approval.", "LODR Regulations, 2015")],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("LODR-23-2");
    expect(ids).toContain("LODR-23-4");
  });
  it("safety control: a compliant RPT sentence followed by a genuinely UNRELATED disclosure failure (break cue present) does not bridge to falsely satisfy LODR-23-2's gate", () => {
    const rule = retrievalRuleForProvision("LODR-23-2");
    const text =
      "The related-party transaction was properly approved by the Audit Committee and shareholders and was appropriately disclosed. The transaction concerning an unrelated loan default was not disclosed to the stock exchanges.";
    const concepts = detectConcepts(text);
    const continuityMap = computeContinuitySentenceGroups(text);
    expect(passesRetrievalGate(rule, concepts, continuityMap)).toBe(false);
  });
});

describe("Continuity fix: preferential-allotment consideration split across sentences (ICDR-160 / Companies Act 67(2)/24)", () => {
  it("positive: the allotment stated in one sentence and its sham consideration in the next now connects via 'the consideration' as a continuation cue", () => {
    const findings = [makeFinding({ provisionId: "ICDR-160" }), makeFinding({ provisionId: "COMPANIES-ACT-67-2" })];
    const result = analyzeScenario(
      {
        freeText:
          "A listed company made a preferential allotment of shares to certain entities. The consideration for the allotment was funded through a circular movement of money originating from entities connected with the promoter, resulting in no genuine independent consideration being received.",
      },
      findings,
      [makeProvision("ICDR-160", "Regulation 160", "Fully paid-up shares."), makeProvision("COMPANIES-ACT-67-2", "Section 67(2)", "Financial assistance prohibition.", "Companies Act, 2013")],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("ICDR-160");
    expect(ids).toContain("COMPANIES-ACT-67-2");
  });
  it("safety control: an unrelated preferential allotment followed by a SEPARATE, explicitly unrelated consideration fact does not bridge", () => {
    const rule = retrievalRuleForProvision("ICDR-160");
    const text = "A listed company made a preferential allotment of shares. Separately, an unrelated entity's own consideration for a different, unconnected transaction was found to be non-genuine.";
    const concepts = detectConcepts(text);
    const continuityMap = computeContinuitySentenceGroups(text);
    expect(passesRetrievalGate(rule, concepts, continuityMap)).toBe(false);
  });
});

describe("Ind AS ungated audit: Ind AS 7, Ind AS 21, Ind AS 28 gated on their own subject, not generic financial-statement misstatement", () => {
  it("Scenario 8's own facts (fictitious sales, no cash-flow/forex/associate-company fact) do NOT satisfy any of the three new gates", () => {
    const concepts = detectConcepts("A listed company recorded fictitious sales transactions and thereby materially inflated its reported revenue and profit in its published financial results.");
    for (const id of ["IND-AS-7", "IND-AS-21", "IND-AS-28"]) {
      expect(passesRetrievalGate(retrievalRuleForProvision(id), concepts)).toBe(false);
    }
  });
  it("Ind AS 7 positive: a genuine cash-flow-statement fact satisfies its own gate", () => {
    const concepts = detectConcepts("The company's statement of cash flows misclassified financing activities as operating cash flow.");
    expect(passesRetrievalGate(retrievalRuleForProvision("IND-AS-7"), concepts)).toBe(true);
  });
  it("Ind AS 28 positive: the live corpus's own BDMCL-01 fact pattern (structured to avoid the associate-company threshold) satisfies its own gate", () => {
    const concepts = detectConcepts("The company deliberately structured its shareholding to fall below the associate company threshold under Ind AS 28.");
    expect(passesRetrievalGate(retrievalRuleForProvision("IND-AS-28"), concepts)).toBe(true);
  });
});

describe("End-to-end Demo A/B/C non-regression (P0 continuity pass, prior sprint) after this pass's vocabulary/gate changes", () => {
  it("Demo B: PFUTP-4-1 still surfaces as the sole primary candidate (no LODR-33/Ind AS 23 over-retrieval reintroduced)", () => {
    const findings = ["PFUTP-4-1", "IND-AS-23", "LODR-33-1-gen"].map((id) => makeFinding({ provisionId: id }));
    const provisions = [
      makeProvision("PFUTP-4-1", "Regulation 4(1)", "Manipulative, fraudulent or unfair trade practice."),
      makeProvision("IND-AS-23", "Ind AS 23", "Borrowing Costs.", "Indian Accounting Standards"),
      makeProvision("LODR-33-1-gen", "Regulation 33(1)", "Financial results.", "LODR Regulations, 2015"),
    ];
    const result = analyzeScenario(
      {
        freeText:
          "A listed company advanced substantial funds to entities connected with its promoter group. The funds were subsequently transferred through multiple entities and were not used for the stated business purpose. The company nevertheless reported the amounts as genuine business advances/receivables and did not disclose the actual end use or connected-party nature in its published financial statements.",
      },
      findings,
      provisions,
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("PFUTP-4-1");
    expect(ids).not.toContain("IND-AS-23");
    expect(ids).not.toContain("LODR-33-1-gen");
  });
});
