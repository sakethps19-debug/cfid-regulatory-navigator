// P0 fix: PFUTP Regulation 4(1) Explanation-specific diversion route.
//
// ROOT CAUSE (live-corpus trace, "Diversion Benchmark A" — see final report):
// PFUTP-4-1's only retrieval route required SECURITIES_DEALING_OR_ISSUE_NEXUS
// (an issue/allotment or actual trading conduct) connected to
// FRAUDULENT_OR_DECEPTIVE_CONDUCT. A pure listed-company fund-diversion
// scenario (no securities transaction at all) never satisfied that nexus, so
// Regulation 4(1) was fully gate-blocked even though the Explanation to
// Regulation 4(1) — verified against the official current (last amended 28
// June 2024) consolidated PFUTP Regulations, 2003 (sebi.gov.in) — deems
// diversion, misutilisation or siphoning off of the assets or earnings of "a
// company whose securities are listed" to always have been a manipulative,
// fraudulent or unfair trade practice under sub-regulation (1), with no
// securities-dealing nexus required at all.
//
// FIX: a new, independently-sufficient "alternate route" on the SAME
// PFUTP-4-1 rule (see ProvisionRetrievalRule.alternateRoutes in
// provision-retrieval-rules.ts) requiring only the new listed_company topic
// tag connected to a fund-diversion/misutilisation/siphoning conduct tag —
// never touching PFUTP 3(a)-(d), PFUTP 4(2)'s own lettered sub-clauses, or
// SEBI Act 12A, each of which keeps its own independent predicate.
//
// A related, previously-unreported leak was found and fixed in the same
// pass: LODR-31 (shareholding pattern) and LODR-27(2)(a) (governance
// compliance report) — both ungated, empty-justifyingTags provisions — were
// being falsely promoted by a pure fund-diversion scenario via the SAME
// architectural defect Turn 8's disclosure-family hotfix targeted
// (linkScopedAllegedConduct's "universal" empty-justifyingTags fallback).
// fund_diversion/circular_fund_movement/fund_routed_personal_account were
// not yet marked ConceptTag.subjectAgnostic, and "connected entities"/
// "related entities" were ambiguous related_party_transaction synonyms that
// let an unrelated fund-routing narrative read as topically RPT-connected.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { passesRetrievalGate, retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
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
    recordId: `DIVERSION-MATRIX-${seq}`,
    caseName: "Synthetic Diversion Matrix Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic diversion-matrix finding",
    factualPattern: "Synthetic factual pattern for the PFUTP-4-1 diversion regression matrix.",
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
    // pfutp-provision-gating.test.ts matrix convention) so the synthetic
    // finding scores above MIN_FINDING_SCORE against whichever query text
    // each case below actually states — what varies per test is the QUERY,
    // exactly like a real officer's input would.
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

describe("PFUTP-4-1 Explanation-specific diversion route (gate mechanics)", () => {
  const rule = retrievalRuleForProvision("PFUTP-4-1");

  it("gate passes for listed company + diversion of funds, connected in the same sentence", () => {
    const concepts = detectConcepts(
      "A listed company transferred substantial funds to entities controlled by its promoter. The funds were not used for the stated business purpose and were subsequently routed through several connected entities."
    );
    expect(passesRetrievalGate(rule, concepts)).toBe(true);
  });

  it("gate does NOT pass for the same diversion facts without any listed-company statement", () => {
    const concepts = detectConcepts(
      "A company transferred substantial funds to entities controlled by its promoter. The funds were not used for the stated business purpose."
    );
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });

  it("gate does NOT pass for a listed company with no diversion/misutilisation/siphoning conduct stated", () => {
    const concepts = detectConcepts("The listed company held its annual general meeting on schedule and filed its annual report on time.");
    expect(passesRetrievalGate(rule, concepts)).toBe(false);
  });

  it("still gate-passes via the EXISTING securities-dealing route, unaffected by the new alternate route", () => {
    const concepts = detectConcepts(
      "The company made a preferential allotment while its published annual report contained a false announcement about the transaction's genuineness."
    );
    expect(passesRetrievalGate(rule, concepts)).toBe(true);
  });
});

describe("PFUTP-4-1 diversion route: end-to-end regression matrix", () => {
  it("A. listed company + promoter-connected diversion + funds not used for stated purpose -> PFUTP-4-1 surfaces", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1", transactionTypes: ["fund_diversion" as unknown as never], allegedConduct: ["fund_diversion"] });
    const result = analyzeScenario(
      {
        freeText:
          "A listed company transferred substantial funds to entities controlled by its promoter. The funds were not used for the stated business purpose and were subsequently routed through several connected entities.",
      },
      [finding],
      [PFUTP_4_1],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).toContain("PFUTP-4-1");
  });

  it("E. unlisted/private company diversion -> PFUTP-4-1 does NOT surface merely because 'diversion' language appears", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1", allegedConduct: ["fund_diversion"] });
    const result = analyzeScenario(
      {
        freeText:
          "A private company that is not listed transferred substantial funds to entities controlled by its promoter for purposes unrelated to any securities transaction, and the funds were not used for the stated business purpose.",
      },
      [finding],
      [PFUTP_4_1],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).not.toContain("PFUTP-4-1");
  });

  it("F. pure RPT non-disclosure, no diversion/fraud/securities facts -> no PFUTP-4-1 regression", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1", allegedConduct: ["fund_diversion"] });
    const result = analyzeScenario(
      { freeText: "The company entered into a related party transaction with an entity controlled by its promoter that was not disclosed to the audit committee or shareholders as required." },
      [finding],
      [PFUTP_4_1],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).not.toContain("PFUTP-4-1");
  });

  it("G. clean/compliant scenario -> PFUTP-4-1 not a candidate", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1", allegedConduct: ["fund_diversion"] });
    const result = analyzeScenario(
      { freeText: "The listed company disclosed all related party transactions in full, obtained audit committee and shareholder approval where required, and its financial statements were accurate with no irregularities found." },
      [finding],
      [PFUTP_4_1],
      []
    );
    const ids = result.provisionResults.map((pr) => pr.provision.id);
    expect(ids).not.toContain("PFUTP-4-1");
  });

  it("does not unlock PFUTP 3(a)-(d), 4(2)(a)/(b)/(e)/(f)/(k)/(r) or SEBI Act 12A merely from the diversion route's own predicate", () => {
    const broadFamily = [
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
    for (const id of broadFamily) {
      const rule = retrievalRuleForProvision(id);
      const concepts = detectConcepts(
        "A listed company transferred substantial funds to entities controlled by its promoter. The funds were not used for the stated business purpose and were subsequently routed through several connected entities."
      );
      expect(passesRetrievalGate(rule, concepts)).toBe(false);
    }
  });
});

describe("Diversion-family subject-agnostic connectivity fix (LODR-31 / LODR-27(2)(a) leak)", () => {
  const reg27 = makeProvision("LODR-27-2-a", "Regulation 27(2)(a)", "Quarterly corporate governance compliance report.", "LODR");
  const reg31 = makeProvision("LODR-31-statement", "Regulation 31", "Shareholding pattern statement.", "LODR");

  it("a pure fund-diversion scenario (no RPT, no shareholding-pattern facts) does not falsely promote LODR-27(2)(a) or LODR-31 as breach candidates", () => {
    // Mirrors the real production shape: LODR-27(2)(a)/LODR-31 links carry
    // EMPTY justifyingTags, and the supporting finding's allegedConduct bag
    // also happens to carry the same generic diversion conduct ids as its
    // OWN (unrelated) subject matter — exactly the shape that produced the
    // false promotion before this fix.
    const reg27Finding = makeFinding({
      provisionId: "LODR-27-2-a",
      allegedConduct: ["non_disclosure_of_information", "fund_diversion"],
      transactionTypes: ["related_party_transaction"],
    });
    const reg31Finding = makeFinding({
      provisionId: "LODR-31-statement",
      allegedConduct: ["fund_diversion", "circular_fund_movement", "non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction"],
    });
    const result = analyzeScenario(
      {
        freeText:
          "A listed company transferred substantial funds to entities controlled by its promoter. The funds were not used for the stated business purpose and were subsequently routed through several connected entities.",
      },
      [reg27Finding, reg31Finding],
      [reg27, reg31],
      []
    );
    const breachIds = result.provisionResults.map((pr) => pr.provision.id);
    expect(breachIds).not.toContain("LODR-27-2-a");
    expect(breachIds).not.toContain("LODR-31-statement");
  });

  it("a diversion scenario stated as PART OF the same connected sentence as a genuine related-party transaction fact still legitimately reaches LODR-27(2)(a)/LODR-31 (no over-correction)", () => {
    const reg27Finding = makeFinding({
      provisionId: "LODR-27-2-a",
      allegedConduct: ["non_disclosure_of_information"],
      transactionTypes: ["related_party_transaction"],
    });
    const result = analyzeScenario(
      { freeText: "The related party transaction with an entity controlled by the promoter was not disclosed in the governance compliance report." },
      [reg27Finding],
      [reg27],
      []
    );
    const breachIds = result.provisionResults.map((pr) => pr.provision.id);
    expect(breachIds).toContain("LODR-27-2-a");
  });
});
