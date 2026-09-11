// CHECKPOINT CORRECTION 2 — dedicated regression suite.
//
// Covers, in order:
//   1. Legal-function taxonomy structural regression (item 1): no live/
//      canonical provision may silently fall back to "other".
//   2. Dependency-metadata regression (item 4): the demotion behavior
//      formerly detected by array reference equality must now depend only
//      on the explicit `dependency` field, never on array identity/content.
//   3. Adversarial paired tests (item 6): Compliance Officer (A), Audit
//      Committee 4-way (B), capital-raising family (C), PFUTP 4(2)(h)/(s)
//      (D), and the existing ordinary-RPT-zero-PFUTP hard regression (E).
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
import {
  requiresIndependentlyRetrievedSubstantivePrimary,
  type ProvisionRetrievalRule,
} from "@/data/curated/provision-retrieval-rules";
import { PROVISION_RETRIEVAL_RULES } from "@/data/curated/provision-retrieval-rules";
import { LEGAL_FUNCTION_BY_PROVISION, legalFunctionForProvision } from "@/data/curated/legal-function-classification";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import type { LegalProvision, ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string; provisionIds: string[] }): ScenarioFinding {
  const provisionLinks =
    overrides.provisionLinks ?? overrides.provisionIds.map((provisionId) => ({ provisionId, justifyingTags: [] as string[] }));
  return {
    caseName: "Synthetic Test Matter",
    orderIds: [],
    category: "test",
    scenarioTitle: "Synthetic finding",
    factualPattern: "Synthetic factual pattern for testing.",
    provisionsConsideredRaw: null,
    provisionLinks,
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
    humanLegalReviewCompleted: true,
    publicationStatus: "Published to search",
    ...overrides,
  };
}

function makeProvision(overrides: Partial<LegalProvision> & { id: string }): LegalProvision {
  return {
    instrument: "Test Instrument",
    provisionNumber: "Regulation 1",
    subject: "Test subject",
    currentTextVerificationStatus: "Requires verification",
    officialSource: null,
    ordersConsidered: [],
    treatmentInPilotOrders: "",
    lawLibraryNote: null,
    ...overrides,
  };
}

/** A conduct-only finding, giving a single weight-3 conductOverlap category
 * match — enough to clear MIN_FINDING_SCORE (3) on its own, the minimal
 * shape needed for these gate-precision tests. */
function conductFinding(recordId: string, provisionId: string, conduct: string): ScenarioFinding {
  return makeFinding({ recordId, provisionIds: [provisionId], allegedConduct: [conduct] });
}

function primaryIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.provisionResults.filter((p) => p.candidateTier === "primary_candidate").map((p) => p.provision.id);
}

// ---------------------------------------------------------------------
// 1. Legal-function taxonomy structural regression (item 1)
// ---------------------------------------------------------------------
describe("Checkpoint correction 2, item 1: no live/canonical provision silently falls back to 'other'", () => {
  it("every provisionId referenced by FIXED_SCENARIOS has an explicit LEGAL_FUNCTION_BY_PROVISION entry", () => {
    const missing: string[] = [];
    for (const scenario of FIXED_SCENARIOS) {
      for (const id of scenario.provisionIds) {
        if (!Object.prototype.hasOwnProperty.call(LEGAL_FUNCTION_BY_PROVISION, id)) missing.push(id);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every provisionId with its own curated retrieval rule has an explicit LEGAL_FUNCTION_BY_PROVISION entry", () => {
    const missing: string[] = [];
    for (const rule of PROVISION_RETRIEVAL_RULES) {
      if (!Object.prototype.hasOwnProperty.call(LEGAL_FUNCTION_BY_PROVISION, rule.provisionId)) missing.push(rule.provisionId);
    }
    expect(missing).toEqual([]);
  });

  // Live-corpus snapshot: every canonical_id actually referenced by a
  // finding_provisions row in production Supabase (project aytcrvaagqxyetqckbvb),
  // captured via a read-only query during this checkpoint's independent
  // legal-source verification (SELECT DISTINCT lp.canonical_id FROM
  // finding_provisions fp JOIN legal_provisions lp ON lp.id = fp.provision_id).
  // No Supabase data was written or migrated to produce this list. Frozen
  // here as a regression fixture rather than re-queried live on every test
  // run, so this suite stays deterministic and offline-runnable; a
  // genuinely new corpus id introduced later should be added to this list
  // deliberately, not silently skipped.
  const LIVE_CORPUS_CANONICAL_IDS = [
    "COMPANIES-ACT-136", "COMPANIES-ACT-139", "COMPANIES-ACT-141-3-d", "COMPANIES-ACT-141-3-e",
    "COMPANIES-ACT-180-1-a", "COMPANIES-ACT-24", "COMPANIES-ACT-67-2",
    "ICDR-158-CH-V", "ICDR-160", "ICDR-167", "ICDR-24-1", "ICDR-245-1",
    "IND-AS-1", "IND-AS-107", "IND-AS-109", "IND-AS-110", "IND-AS-115", "IND-AS-21", "IND-AS-23", "IND-AS-24", "IND-AS-28", "IND-AS-32", "IND-AS-7",
    "LODR-16-1-b", "LODR-17-8", "LODR-18-1-b", "LODR-18-1-d", "LODR-18-3-schedule-II", "LODR-2-zc",
    "LODR-23-1", "LODR-23-2", "LODR-23-4", "LODR-27-2-a", "LODR-30", "LODR-31-statement",
    "LODR-32", "LODR-32-1", "LODR-32-4", "LODR-32-5",
    "LODR-33-1-a", "LODR-33-1-c", "LODR-33-1-d", "LODR-33-1-gen", "LODR-33-2-a", "LODR-33-3-b", "LODR-33-3-c", "LODR-33-3-d", "LODR-33-3-gen", "LODR-33-3-i", "LODR-33-5",
    "LODR-34-2-a", "LODR-34-2-b", "LODR-34-3", "LODR-37A",
    "LODR-4-1", "LODR-4-1-a", "LODR-4-1-b", "LODR-4-1-c", "LODR-4-1-d", "LODR-4-1-e", "LODR-4-1-g", "LODR-4-1-h", "LODR-4-1-i", "LODR-4-1-j",
    "LODR-4-2-e-i", "LODR-4-2-f", "LODR-4-2-f-i", "LODR-4-2-f-ii", "LODR-4-2-f-iii",
    "LODR-46-2-s", "LODR-48", "LODR-6-1", "LODR-6-2-a", "LODR-6-2-b", "LODR-6-2-c", "LODR-6-2-gen", "LODR-6-gen", "LODR-SCHEDULE-V-A-1",
    "PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-1",
    "PFUTP-4-2-a", "PFUTP-4-2-b", "PFUTP-4-2-c", "PFUTP-4-2-e", "PFUTP-4-2-f", "PFUTP-4-2-h", "PFUTP-4-2-k", "PFUTP-4-2-r", "PFUTP-4-2-s",
    "SEBI-ACT-11-2-e", "SEBI-ACT-11-2-gen", "SEBI-ACT-11-2-i", "SEBI-ACT-11-2-ia",
    "SEBI-ACT-11C-2", "SEBI-ACT-11C-3", "SEBI-ACT-11C-5",
    "SEBI-ACT-12A-a", "SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "SEBI-ACT-15HA", "SEBI-ACT-15HB", "SEBI-ACT-27",
  ];

  it("every id in the live-corpus finding_provisions snapshot has an explicit LEGAL_FUNCTION_BY_PROVISION entry", () => {
    const missing = LIVE_CORPUS_CANONICAL_IDS.filter((id) => !Object.prototype.hasOwnProperty.call(LEGAL_FUNCTION_BY_PROVISION, id));
    expect(missing).toEqual([]);
  });

  it("the 7 checkpoint-correction-2 provisions resolve to their independently-verified legal function, never the silent 'other' fallback", () => {
    expect(legalFunctionForProvision("ICDR-24-1")).toBe("disclosure_obligation");
    expect(legalFunctionForProvision("ICDR-245-1")).toBe("disclosure_obligation");
    expect(legalFunctionForProvision("LODR-32-1")).toBe("accounting_reporting_requirement");
    expect(legalFunctionForProvision("LODR-32-4")).toBe("accounting_reporting_requirement");
    expect(legalFunctionForProvision("LODR-32-5")).toBe("accounting_reporting_requirement");
    expect(legalFunctionForProvision("PFUTP-4-2-h")).toBe("substantive_prohibition");
    expect(legalFunctionForProvision("PFUTP-4-2-s")).toBe("substantive_prohibition");
  });

  it("the fallback to 'other' is preserved as defensive behavior for a genuinely unknown future id", () => {
    expect(legalFunctionForProvision("SOME-FUTURE-PROVISION-NOT-YET-CLASSIFIED")).toBe("other");
  });
});

// ---------------------------------------------------------------------
// 2. Dependency-metadata regression (item 4): must not depend on array
//    reference equality / content.
// ---------------------------------------------------------------------
describe("Checkpoint correction 2, item 4: requiresIndependentlyRetrievedSubstantivePrimary depends only on the explicit `dependency` field", () => {
  it("returns false for undefined", () => {
    expect(requiresIndependentlyRetrievedSubstantivePrimary(undefined)).toBe(false);
  });

  it("returns false for a rule with NO dependency field, even one whose requireAllOfGroups content is a clone of a real umbrella-gated rule's array", () => {
    const realRule = PROVISION_RETRIEVAL_RULES.find((r) => r.dependency === "requires_independently_retrieved_substantive_candidate");
    expect(realRule).toBeDefined();
    const clonedContent: string[][] = realRule!.requireAllOfGroups.map((group) => [...group]);
    const lookalike: ProvisionRetrievalRule = {
      provisionId: "SYNTHETIC-LOOKALIKE",
      requireAllOfGroups: clonedContent,
      explanation: "Synthetic rule with identical group content but no dependency field.",
      // dependency deliberately omitted
    };
    expect(requiresIndependentlyRetrievedSubstantivePrimary(lookalike)).toBe(false);
  });

  it("returns true for any rule carrying the explicit dependency field, regardless of what array object/content requireAllOfGroups holds", () => {
    const syntheticRule: ProvisionRetrievalRule = {
      provisionId: "SYNTHETIC-WITH-DEPENDENCY",
      requireAllOfGroups: [["some_arbitrary_concept_id"]],
      explanation: "Synthetic rule proving the field alone controls the behavior.",
      dependency: "requires_independently_retrieved_substantive_candidate",
    };
    expect(requiresIndependentlyRetrievedSubstantivePrimary(syntheticRule)).toBe(true);
  });

  it("every real rule carrying the dependency field is drawn from the curated PROVISION_RETRIEVAL_RULES array (sanity check the field is actually wired, not just testable in isolation)", () => {
    const dependent = PROVISION_RETRIEVAL_RULES.filter((r) => requiresIndependentlyRetrievedSubstantivePrimary(r));
    expect(dependent.length).toBeGreaterThan(15);
  });
});

// ---------------------------------------------------------------------
// 3(A). Compliance Officer: vacancy vs duty-failure — provision sets differ
// ---------------------------------------------------------------------
describe("Checkpoint correction 2, item 2/6(A): Compliance Officer vacancy vs duty-failure retrieve DIFFERENT provisions", () => {
  const vacancy = makeProvision({ id: "LODR-6-gen", subject: "Compliance Officer appointment" });
  const dutyFailure = makeProvision({ id: "LODR-6-2-a", subject: "Compliance Officer duty to ensure conformity" });
  const findings = [
    conductFinding("SYN-CO-VACANCY-FIND", vacancy.id, "compliance_officer_deficiency"),
    conductFinding("SYN-CO-DUTY-FIND", dutyFailure.id, "compliance_officer_duty_failure"),
  ];

  it("a bare vacancy fact retrieves LODR-6-gen only, never LODR-6-2-a", () => {
    const result = analyzeScenario(
      { freeText: "The Compliance Officer position remained vacant beyond the permitted period." },
      findings,
      [vacancy, dutyFailure],
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-6-gen"]);
  });

  it("a bare duty-failure fact (no vacancy) retrieves LODR-6-2-a only, never LODR-6-gen", () => {
    const result = analyzeScenario(
      { freeText: "The Compliance Officer failed to ensure conformity with the applicable statutory requirements." },
      findings,
      [vacancy, dutyFailure],
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-6-2-a"]);
  });
});

// ---------------------------------------------------------------------
// 3(B). Audit Committee 4-way — provision sets differ
// ---------------------------------------------------------------------
describe("Checkpoint correction 2, item 2/6(B): Audit Committee composition/meetings/chairperson/role-failure each retrieve a DIFFERENT single provision", () => {
  const composition = makeProvision({ id: "LODR-18-1-b", subject: "Audit Committee composition" });
  const meetings = makeProvision({ id: "LODR-18-2", subject: "Audit Committee meeting frequency" });
  const chairperson = makeProvision({ id: "LODR-18-1-d", subject: "Audit Committee chairperson" });
  const roleFailure = makeProvision({ id: "LODR-18-3-schedule-II", subject: "Audit Committee Schedule II role" });
  const provisions = [composition, meetings, chairperson, roleFailure];
  const findings = [
    conductFinding("SYN-AC-COMPOSITION-FIND", composition.id, "audit_committee_composition_deficiency"),
    conductFinding("SYN-AC-MEETINGS-FIND", meetings.id, "audit_committee_deficiency"),
    conductFinding("SYN-AC-CHAIR-FIND", chairperson.id, "audit_committee_chairperson_deficiency"),
    conductFinding("SYN-AC-ROLE-FIND", roleFailure.id, "audit_committee_role_failure"),
  ];

  it("composition-only fact retrieves LODR-18-1-b only", () => {
    const result = analyzeScenario({ freeText: "The Audit Committee was not properly constituted." }, findings, provisions, []);
    expect(primaryIds(result)).toEqual(["LODR-18-1-b"]);
  });

  it("meetings-not-held-only fact retrieves LODR-18-2 only", () => {
    const result = analyzeScenario({ freeText: "Audit Committee meetings were not conducted." }, findings, provisions, []);
    expect(primaryIds(result)).toEqual(["LODR-18-2"]);
  });

  it("chairperson-only fact retrieves LODR-18-1-d only", () => {
    const result = analyzeScenario(
      { freeText: "The chairperson of the Audit Committee was not an independent director." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-18-1-d"]);
  });

  it("Schedule-II-role-failure-only fact retrieves LODR-18-3-schedule-II only", () => {
    const result = analyzeScenario({ freeText: "The Audit Committee failed to review the financial statements." }, findings, provisions, []);
    expect(primaryIds(result)).toEqual(["LODR-18-3-schedule-II"]);
  });
});

// ---------------------------------------------------------------------
// 3(C). Capital-raising family — must not collapse into one family
// ---------------------------------------------------------------------
describe("Checkpoint correction 2, item 1/6(C): capital-raising provisions (offer-document disclosure vs issue-proceeds deviation) retrieve DIFFERENT provisions on different facts", () => {
  const offerDoc = makeProvision({ id: "ICDR-24-1", subject: "Offer document material disclosures" });
  const offerDocSme = makeProvision({ id: "ICDR-245-1", subject: "SME offer document material disclosures" });
  const proceeds1 = makeProvision({ id: "LODR-32-1", subject: "Issue-proceeds deviation disclosure" });
  const proceeds4 = makeProvision({ id: "LODR-32-4", subject: "Issue-proceeds deviation — Audit Committee review" });
  const proceeds5 = makeProvision({ id: "LODR-32-5", subject: "Issue-proceeds deviation — auditor certification" });
  const stolen = makeProvision({ id: "PFUTP-4-2-h", subject: "Dealing in stolen/counterfeit securities" });
  const misSelling = makeProvision({ id: "PFUTP-4-2-s", subject: "Mis-selling of securities" });
  const provisions = [offerDoc, offerDocSme, proceeds1, proceeds4, proceeds5, stolen, misSelling];
  const findings = [
    conductFinding("SYN-OFFERDOC-FIND", offerDoc.id, "non_disclosure_of_information"),
    conductFinding("SYN-OFFERDOC-SME-FIND", offerDocSme.id, "non_disclosure_of_information"),
    conductFinding("SYN-PROCEEDS1-FIND", proceeds1.id, "fund_diversion"),
    conductFinding("SYN-PROCEEDS4-FIND", proceeds4.id, "fund_diversion"),
    conductFinding("SYN-PROCEEDS5-FIND", proceeds5.id, "fund_diversion"),
    conductFinding("SYN-STOLEN-FIND", stolen.id, "dealing_in_stolen_or_counterfeit_securities"),
    conductFinding("SYN-MISSELL-FIND", misSelling.id, "mis_selling_of_securities"),
  ];

  // Checkpoint correction 3, P0-1: the two tests below were rewritten —
  // checkpoint correction 2 had gated ICDR-24-1/245-1 identically with no
  // chapter distinction, which let this exact chapter-unspecified fact
  // wrongly mark BOTH as simultaneous Primary candidates (main-board and
  // SME are chapter-specific alternatives that can never both genuinely
  // apply to the same offer document). See tests/checkpoint-correction-3.test.ts
  // for the full chapter-applicability adversarial suite (main-board only,
  // SME only, unspecified, compliant).
  it("a chapter-UNSPECIFIED offer-document non-disclosure fact promotes NEITHER ICDR-24-1 nor ICDR-245-1 to Primary — the entered facts do not establish which chapter applies", () => {
    const result = analyzeScenario(
      { freeText: "The prospectus did not disclose material facts about the promoter's litigation history." },
      findings,
      provisions,
      []
    );
    const ids = primaryIds(result).sort();
    expect(ids).toEqual([]);
  });

  // Checkpoint correction 3, P0-2: rewritten — checkpoint correction 2 had
  // gated all three of LODR-32-1/4/5 on the shared ISSUE_PROCEEDS_MISUSE
  // bag (fund_diversion et al.), so a bare diversion fact wrongly promoted
  // all three REPORTING sub-duties to Primary even though nothing in the
  // entered facts stated any of them was actually breached. See
  // tests/checkpoint-correction-3.test.ts for the full per-sub-duty
  // adversarial suite.
  it("a BARE issue-proceeds diversion fact (no stated reporting failure) promotes NONE of LODR-32-1/4/5 to Primary — diversion alone does not prove any specific Regulation 32 reporting duty was breached", () => {
    const result = analyzeScenario(
      { freeText: "A listed company raised proceeds through a rights issue. The proceeds were diverted to promoter-controlled entities instead of being used for the disclosed objects." },
      findings,
      provisions,
      []
    );
    const ids = primaryIds(result).sort();
    expect(ids).toEqual([]);
  });

  it("a stolen/counterfeit-securities fact retrieves PFUTP-4-2-h only, never mis-selling or the offer-document/issue-proceeds provisions", () => {
    const result = analyzeScenario(
      { freeText: "The intermediary was involved in selling stolen securities to unsuspecting investors." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["PFUTP-4-2-h"]);
  });

  it("a mis-selling fact retrieves PFUTP-4-2-s only, never dealing-in-stolen-securities or the offer-document/issue-proceeds provisions", () => {
    const result = analyzeScenario(
      { freeText: "The intermediary engaged in mis-selling of securities to retail investors by concealing the associated risk." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["PFUTP-4-2-s"]);
  });
});

// ---------------------------------------------------------------------
// 3(D)/(E). Redundant with 3(C) for D; E is the existing hard regression,
// re-confirmed directly here against the live matching engine + live
// vocabulary (not a synthetic finding set) to prove it still holds after
// every change in this checkpoint.
// ---------------------------------------------------------------------
describe("Checkpoint correction 2, item 6(E): ordinary RPT non-disclosure without fraudulent/deceptive securities-market facts still yields ZERO PFUTP candidate concepts", () => {
  it("detectConcepts on a plain RPT non-disclosure scenario detects no PFUTP-relevant fraud/trading conduct concept", () => {
    const detected = detectConcepts(
      "A related-party transaction was not disclosed to the Audit Committee as required, though the transaction itself was conducted at fair value."
    );
    const conductIds = new Set(detected.filter((d) => d.kind === "conduct").map((d) => d.id));
    for (const fraudConcept of [
      "false_appearance_of_trading",
      "actual_price_manipulation",
      "non_genuine_dealing_or_ownership",
      "fictitious_sales_or_revenue",
      "fictitious_or_nongenuine_assets",
      "dealing_in_stolen_or_counterfeit_securities",
      "mis_selling_of_securities",
    ]) {
      expect(conductIds.has(fraudConcept)).toBe(false);
    }
  });
});
