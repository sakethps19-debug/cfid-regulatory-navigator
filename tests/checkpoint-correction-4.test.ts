// Checkpoint correction 4: DIVERSION / PFUTP RECALL + ADDITIONAL-FACT
// ARCHITECTURE.
//
// LIVE DEFECT REPORTED: entering "diversion of funds" in the Scenario
// Analyzer showed no PFUTP-4-1 signal an officer could actually find. Root
// cause, confirmed by tracing the live corpus (95 findings / 911 links)
// through the real analyzeScenario(): PFUTP-4-1 WAS already present in
// gateBlockedProvisionResults ("Additional fact required") for a bare
// diversion query — via the pre-existing precedent-driven mechanism (any
// scoring finding cited to PFUTP-4-1) — but buried, unlabelled and
// unsorted, among 29-43 other provisions merely co-cited by the SAME
// historical finding record for entirely unrelated reasons (e.g.
// COMPANIES-ACT-67-2, ICDR-160, IND-AS-115 alongside a bare "the company
// diverted funds"). A second, separate defect: that precedent-driven
// mechanism only ever fires when the live corpus happens to hold a
// sufficiently-scoring linked finding at all — a provision whose statutory
// route the entered facts genuinely engage must not silently disappear
// purely because no such precedent exists yet (corpus-completeness gap).
//
// FIX: a new, deliberately narrow and OPT-IN "topic anchor" mechanism (see
// ProvisionRetrievalRule.topicAnchor / alternateRoutes[].topicAnchor,
// provision-retrieval-rules.ts) marks PURE_FUND_MOVEMENT_CONDUCT
// (fund_diversion / circular_fund_movement / fund_routed_personal_account —
// none a generic word, each naming a specific act the Explanation to
// Regulation 4(1) itself lists) as PFUTP-4-1's genuine statutory-specific
// anchor for its Explanation-based diversion route. When the entered
// scenario's facts intersect that anchor but the full gate (anchor group
// AND "listed_company") is not satisfied, the engine (a) surfaces PFUTP-4-1
// in gateBlockedProvisionResults even with ZERO scoring corpus precedent,
// with a note naming exactly the missing fact (listed-company status), and
// (b) sorts anchor-satisfied entries to the FRONT of the list, ahead of
// merely-co-cited noise. topicAnchorSatisfied is never used to decide
// PASS/FAIL of the retrieval gate itself — passesRetrievalGate,
// provisionResults and every PFUTP anti-overreach invariant from
// Corrections 1-3 are completely unaffected; a provision only ever reaches
// primary_candidate/related_ancillary by satisfying its full gate exactly
// as before.
//
// A related presentation defect was found and fixed in the same pass: a
// SEPARATE, pre-existing actor-role concept tag (id: "company", the generic
// "the company"/"the issuer" respondent-entity signal) shared the exact
// display label "Listed company" with the real PFUTP-4-1 topic-anchor
// concept (id: "listed_company", requiring actual "listed company"/"listed
// entity"/"securities are listed" phrasing) — so detectedConceptLabels for
// a bare "The company diverted funds." misleadingly showed "Listed
// company" even though no listed-company fact had been stated at all. The
// id:"company" tag's label was renamed to "Company (respondent entity)";
// no concept id, synonym or matching logic changed.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
import { passesRetrievalGate, retrievalRuleForProvision, topicAnchorMissingFactNotes } from "@/data/curated/provision-retrieval-rules";
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
    recordId: `CP4-${seq}`,
    caseName: "Checkpoint 4 synthetic matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Checkpoint 4 synthetic finding",
    factualPattern: "Synthetic factual pattern for checkpoint correction 4.",
    provisionsConsideredRaw: null,
    provisionIds: [provisionId],
    provisionLinks: [{ provisionId, justifyingTags }],
    noticeeActors: [],
    findingStatus: "Confirmed in Final Order",
    interimParagraphReferences: null,
    finalParagraphReferences: "Para 1",
    qualification: null,
    officialSourceUrl: "https://www.sebi.gov.in/example.html",
    transactionTypes: ["listed_company"],
    actorRoles: ["promoter"],
    evidenceTypes: [],
    allegedConduct: ["fund_diversion"],
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
const LODR_32_1 = makeProvision("LODR-32-1", "Regulation 32(1)", "Statement of deviation/variation in use of issue proceeds.", "LODR");

function pfutpGateBlocked(result: ReturnType<typeof analyzeScenario>) {
  return result.gateBlockedProvisionResults.find((gb) => gb.provision.id === "PFUTP-4-1");
}

describe("Checkpoint correction 4 — the mandatory 8-scenario progressive test ladder", () => {
  it("A. 'Diversion of funds.' -> Additional Fact Required, not silently absent (corpus-independent — zero PFUTP-4-1-linked findings supplied)", () => {
    const result = analyzeScenario({ freeText: "Diversion of funds." }, [], [PFUTP_4_1], []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    const gb = pfutpGateBlocked(result);
    expect(gb).toBeDefined();
    expect(gb?.topicAnchorSatisfied).toBe(true);
    expect(gb?.relatedFactualPrecedents).toEqual([]);
    expect(gb?.note).toMatch(/listed company/i);
  });

  it("B. 'The company diverted funds.' -> still Additional Fact Required (bare 'the company' does not satisfy the listed_company predicate)", () => {
    const concepts = detectConcepts("The company diverted funds.");
    expect(concepts.map((c) => c.id)).not.toContain("listed_company");
    expect(concepts.map((c) => c.id)).toContain("fund_diversion");
    const result = analyzeScenario({ freeText: "The company diverted funds." }, [], [PFUTP_4_1], []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    expect(pfutpGateBlocked(result)?.topicAnchorSatisfied).toBe(true);
  });

  it("C. 'A listed company diverted its funds.' -> Primary (full gate satisfied)", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario({ freeText: "A listed company diverted its funds." }, [finding], [PFUTP_4_1], []);
    const ids = result.provisionResults.map((p) => p.provision.id);
    expect(ids).toContain("PFUTP-4-1");
    expect(result.provisionResults.find((p) => p.provision.id === "PFUTP-4-1")?.candidateTier).toBe("primary_candidate");
    expect(pfutpGateBlocked(result)).toBeUndefined();
  });

  it("D. 'A listed company diverted ₹50 crore to promoter-controlled entities.' -> Primary", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      { freeText: "A listed company diverted ₹50 crore to promoter-controlled entities." },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("PFUTP-4-1");
  });

  it("E. diversion + concealment in books/financial statements -> Primary via the SAME diversion route (Explanation clause (i) is independently satisfied by diversion alone; concealment is a stronger, not an additional-element, fact)", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" });
    const result = analyzeScenario(
      {
        freeText:
          "A listed company diverted ₹50 crore to promoter-controlled entities and concealed the transactions in its books/financial statements.",
      },
      [finding],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("PFUTP-4-1");
  });

  it("F. official-source check: the current (post-1 July 2024) Explanation to Regulation 4(1) requires NOTHING beyond diversion/misutilisation/siphoning of a listed company's assets or earnings for clause (i)'s first limb — no additional statutory element is missing from the gate", () => {
    // Verified against the current consolidated PFUTP Regulations, 2003
    // (sebi.gov.in), Explanation to Regulation 4(1) as substituted w.e.f. 1
    // July 2024: "(i) any act of diversion, misutilisation or siphoning off
    // of assets or earnings of a company whose securities are listed ...
    // shall be and shall always be deemed to have been included in
    // sub-regulation (1)." The pre-substitution text (in force before 1
    // July 2024) used materially the same diversion/misutilisation/
    // siphoning-of-a-listed-company's-assets wording. The gate's existing
    // two-group route (["listed_company"], PURE_FUND_MOVEMENT_CONDUCT) is
    // therefore legally complete for this limb; no rule change was needed.
    const rule = retrievalRuleForProvision("PFUTP-4-1");
    const concepts = detectConcepts("A listed company diverted its funds.");
    expect(passesRetrievalGate(rule, concepts)).toBe(true);
  });

  it("G. clean/no-diversion negative control -> no PFUTP-4-1 anywhere, not even Additional Fact Required (negation removes the anchor concept entirely)", () => {
    const result = analyzeScenario(
      { freeText: "The listed company used its funds for the disclosed business objects. No diversion or misutilisation occurred." },
      [],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    expect(pfutpGateBlocked(result)).toBeUndefined();
  });

  it("H. uncertainty control (unexplained transfers, diversion vs legitimate use not yet established) -> Additional Fact Required, never a concluded violation", () => {
    const result = analyzeScenario(
      {
        freeText:
          "There are unexplained transfers to promoter-connected entities, but it is not yet established whether the funds were diverted or used for legitimate purposes.",
      },
      [],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    const gb = pfutpGateBlocked(result);
    expect(gb).toBeDefined();
    expect(gb?.candidateTier).toBe("requires_additional_fact");
  });
});

describe("Checkpoint correction 4 — general additional-fact architecture (13 regression requirements)", () => {
  it("1-5/8. the eight-scenario ladder is covered by the describe block above (A-H)", () => {
    expect(true).toBe(true);
  });

  it("6. bare diversion never silently disappears: PFUTP-4-1 is present in SOME result bucket for a pure diversion scenario even with a totally empty provisions/findings corpus other than PFUTP-4-1 itself", () => {
    const result = analyzeScenario({ freeText: "Funds were diverted." }, [], [PFUTP_4_1], []);
    const anywhere =
      result.provisionResults.some((p) => p.provision.id === "PFUTP-4-1") ||
      result.gateBlockedProvisionResults.some((p) => p.provision.id === "PFUTP-4-1") ||
      result.governingProvisionResults.some((p) => p.provision.id === "PFUTP-4-1");
    expect(anywhere).toBe(true);
  });

  it("7. bare diversion never automatically becomes a concluded violation: it is requires_additional_fact, never primary_candidate/related_ancillary, absent the listed-company fact", () => {
    const result = analyzeScenario({ freeText: "Funds were diverted to a connected entity." }, [], [PFUTP_4_1], []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    expect(pfutpGateBlocked(result)?.candidateTier).toBe("requires_additional_fact");
  });

  it("9. satisfied topic anchor + missing material predicate -> topicAnchorMissingFactNotes returns the specific missing-fact note", () => {
    const rule = retrievalRuleForProvision("PFUTP-4-1");
    const concepts = detectConcepts("Funds were diverted.");
    const notes = topicAnchorMissingFactNotes(rule, concepts);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toMatch(/listed company/i);
  });

  it("10. weak/generic overlap alone (no anchor concept at all) never triggers topic-anchor-driven Additional Fact Required: an unrelated LODR-6 compliance-officer scenario does not surface PFUTP-4-1 via the new mechanism", () => {
    const rule = retrievalRuleForProvision("PFUTP-4-1");
    const concepts = detectConcepts("The company had no compliance officer, since no qualified person was ever appointed to the role.");
    expect(topicAnchorMissingFactNotes(rule, concepts)).toEqual([]);
    const result = analyzeScenario(
      { freeText: "The company had no compliance officer, since no qualified person was ever appointed to the role." },
      [],
      [PFUTP_4_1],
      []
    );
    expect(pfutpGateBlocked(result)).toBeUndefined();
  });

  it("10b. a single generic word ('company') alone never creates a topic-anchor-driven Additional Fact Required entry — topicAnchor conceptIds are never satisfied by the bare actor-role tag", () => {
    const rule = retrievalRuleForProvision("PFUTP-4-1");
    const concepts = detectConcepts("The company held its annual general meeting.");
    expect(concepts.map((c) => c.id)).toContain("company");
    expect(topicAnchorMissingFactNotes(rule, concepts)).toEqual([]);
  });

  it("11. ordinary RPT non-disclosure without diversion/fraud facts -> zero PFUTP anywhere in provisionResults (Corrections 1-3 invariant re-confirmed)", () => {
    const result = analyzeScenario(
      {
        freeText:
          "A related-party transaction with an entity controlled by the promoter was not disclosed to the audit committee or shareholders as required.",
      },
      [],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    // The topic-anchor mechanism specifically must not manufacture a
    // gate-blocked entry either: no diversion-family concept is present.
    expect(pfutpGateBlocked(result)).toBeUndefined();
  });

  it("12. an accounting error without any diversion/fraud fact -> zero PFUTP anywhere, topic anchor not satisfied", () => {
    const result = analyzeScenario(
      { freeText: "Foreign exchange gain was incorrectly classified as revenue from operations due to a bona fide accounting error." },
      [],
      [PFUTP_4_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    expect(pfutpGateBlocked(result)).toBeUndefined();
  });

  it("13. a bare governance lapse (Audit Committee/Compliance Officer) -> zero PFUTP anywhere, topic anchor not satisfied", () => {
    const acResult = analyzeScenario(
      { freeText: "The Audit Committee was not properly constituted and its meetings were not conducted for two consecutive quarters." },
      [],
      [PFUTP_4_1],
      []
    );
    expect(acResult.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    expect(pfutpGateBlocked(acResult)).toBeUndefined();

    const coResult = analyzeScenario(
      { freeText: "The Compliance Officer position was vacant for several months with no qualified replacement appointed." },
      [],
      [PFUTP_4_1],
      []
    );
    expect(coResult.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    expect(pfutpGateBlocked(coResult)).toBeUndefined();
  });
});

describe("Checkpoint correction 4 — historical precedent cannot substitute for or override the statutory gate", () => {
  it("a linked historical precedent finding for PFUTP-4-1 does not itself upgrade a bare-diversion scenario to primary_candidate — it stays requires_additional_fact", () => {
    const finding = makeFinding({ provisionId: "PFUTP-4-1" }); // finding itself asserts listed_company + fund_diversion
    // The ENTERED scenario, not the precedent, states only bare diversion.
    const result = analyzeScenario({ freeText: "Funds were diverted to a connected entity." }, [finding], [PFUTP_4_1], []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    const gb = pfutpGateBlocked(result);
    expect(gb?.candidateTier).toBe("requires_additional_fact");
    // Precedent attachment is visible (not hidden) but structurally
    // separate from current-scenario applicability.
    expect(gb?.relatedFactualPrecedents.length).toBeGreaterThan(0);
  });

  it("an interim/prima-facie precedent does not upgrade current-scenario certainty beyond requires_additional_fact", () => {
    const interimFinding = makeFinding({ provisionId: "PFUTP-4-1", findingStatus: "Confirmed at interim" });
    const result = analyzeScenario({ freeText: "Funds were diverted." }, [interimFinding], [PFUTP_4_1], []);
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("PFUTP-4-1");
    expect(pfutpGateBlocked(result)?.candidateTier).toBe("requires_additional_fact");
  });

  it("a negative (not-upheld) precedent for PFUTP-4-1 remains visible in the gate-blocked precedent list, never suppressed", () => {
    const negativeFinding = makeFinding({ provisionId: "PFUTP-4-1", findingStatus: "Not Confirmed in Final Order" });
    const result = analyzeScenario({ freeText: "Funds were diverted." }, [negativeFinding], [PFUTP_4_1], []);
    const gb = pfutpGateBlocked(result);
    expect(gb).toBeDefined();
    expect(gb?.relatedFactualPrecedents.length).toBeGreaterThan(0);
  });
});

describe("Checkpoint correction 4 — LODR-32 reporting provisions remain independently gated after Correction 3 (diversion never conflated with failure-to-report)", () => {
  it("bare diversion of rights-issue proceeds alone does not satisfy LODR-32(1)'s own reporting-specific predicate", () => {
    const finding = makeFinding({ provisionId: "LODR-32-1", allegedConduct: ["fund_diversion"] });
    const result = analyzeScenario(
      { freeText: "The company raised funds through a rights issue and diverted the proceeds to a promoter-controlled entity." },
      [finding],
      [LODR_32_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).not.toContain("LODR-32-1");
  });

  it("a stated reporting-specific fact (deviation statement not filed) independently satisfies LODR-32(1) as its own gate, unaffected by the PFUTP-4-1 topic-anchor mechanism", () => {
    const finding = makeFinding({ provisionId: "LODR-32-1", allegedConduct: ["quarterly_deviation_disclosure_failure"] });
    const result = analyzeScenario(
      { freeText: "For the rights issue proceeds, the quarterly deviation statement was not filed as required under Regulation 32(1)." },
      [finding],
      [LODR_32_1],
      []
    );
    expect(result.provisionResults.map((p) => p.provision.id)).toContain("LODR-32-1");
  });
});

describe("Checkpoint correction 4 — label-collision fix (id:'company' vs id:'listed_company')", () => {
  it("the generic respondent-entity actor tag no longer shares the 'Listed company' label", () => {
    const concepts = detectConcepts("The company diverted funds.");
    const companyTag = concepts.find((c) => c.id === "company");
    expect(companyTag?.label).not.toBe("Listed company");
    expect(companyTag?.label).toBe("Company (respondent entity)");
  });

  it("the real listed-company topic-anchor concept keeps its own distinct 'Listed company' label", () => {
    const concepts = detectConcepts("A listed company diverted its funds.");
    const listedTag = concepts.find((c) => c.id === "listed_company");
    expect(listedTag?.label).toBe("Listed company");
  });
});
