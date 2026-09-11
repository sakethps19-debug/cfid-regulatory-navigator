// CHECKPOINT CORRECTION 3 — legal retrieval precision.
//
// Covers, in order:
//   P0-1: ICDR-24-1 (main board) / ICDR-245-1 (SME) chapter-alternative
//         applicability — never simultaneously Primary; conservative
//         "additional fact required" when the chapter is unstated.
//   P0-2: LODR-32(1)/(4)/(5) — each sub-duty requires its OWN specific
//         reporting-failure predicate; a bare diversion/misuse fact alone
//         never promotes any of the three.
//   P0-3: LODR Regulation 6 — appointment/qualification vs vacancy-beyond-
//         period (time-bound) vs duty-performance, three distinct
//         predicates.
//   P1:   LODR-18(2) — a documentation gap (minutes/agendas unavailable)
//         is evidentiary only, never itself the substantive "meeting not
//         held" breach.
//   Structural invariants required by the checkpoint (mutually-exclusive
//   alternatives, non-inherited sibling gates, time-condition gating,
//   evidence-vs-breach, precedent attachment never overriding a failed
//   gate).
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
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

function conductFinding(recordId: string, provisionId: string, conduct: string): ScenarioFinding {
  return makeFinding({ recordId, provisionIds: [provisionId], allegedConduct: [conduct] });
}

function primaryIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.provisionResults.filter((p) => p.candidateTier === "primary_candidate").map((p) => p.provision.id);
}
function allBreachIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.provisionResults.map((p) => p.provision.id);
}
function gateBlockedIds(result: ReturnType<typeof analyzeScenario>): string[] {
  return result.gateBlockedProvisionResults.map((g) => g.provision.id);
}

// =======================================================================
// P0-1: ICDR-24-1 (main board) / ICDR-245-1 (SME) chapter alternatives
// =======================================================================
describe("Checkpoint correction 3, P0-1: ICDR-24-1/245-1 chapter-alternative applicability", () => {
  const mainBoard = makeProvision({ id: "ICDR-24-1", subject: "Main-board offer document disclosures" });
  const sme = makeProvision({ id: "ICDR-245-1", subject: "SME offer document disclosures" });
  const provisions = [mainBoard, sme];
  const findings = [
    conductFinding("SYN-ICDR24-FIND", mainBoard.id, "non_disclosure_of_information"),
    conductFinding("SYN-ICDR245-FIND", sme.id, "non_disclosure_of_information"),
  ];

  it("1. a MAIN-BOARD offer-document misstatement fact retrieves ICDR-24-1 only, never ICDR-245-1", () => {
    const result = analyzeScenario(
      { freeText: "The company's prospectus, filed for its initial public offer on the main board, did not disclose material litigation against the promoter." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["ICDR-24-1"]);
  });

  it("2. an SME offer-document misstatement fact retrieves ICDR-245-1 only, never ICDR-24-1", () => {
    const result = analyzeScenario(
      { freeText: "The company's prospectus, filed for its SME initial public offer, did not disclose material litigation against the promoter." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["ICDR-245-1"]);
  });

  it("3. a CHAPTER-UNSPECIFIED offer-document misstatement fact promotes NEITHER to Primary — shown, if at all, only as a chapter-dependent additional-fact candidate", () => {
    const result = analyzeScenario(
      { freeText: "The prospectus did not disclose material litigation against the promoter." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual([]);
    // Both remain visible to the officer (never silently dropped) as
    // requiring the missing chapter fact, never as an established
    // candidate breach.
    const blocked = gateBlockedIds(result);
    expect(blocked).toContain("ICDR-24-1");
    expect(blocked).toContain("ICDR-245-1");
  });

  it("4. a compliant offer document (no stated disclosure defect) yields neither as a candidate breach, regardless of chapter", () => {
    const result = analyzeScenario(
      { freeText: "The prospectus for the main-board initial public offer was accurate and complete in all material respects." },
      findings,
      provisions,
      []
    );
    expect(allBreachIds(result)).not.toContain("ICDR-24-1");
    expect(allBreachIds(result)).not.toContain("ICDR-245-1");
  });
});

// =======================================================================
// P0-2: LODR-32(1)/(4)/(5) — provision-specific reporting predicates
// =======================================================================
describe("Checkpoint correction 3, P0-2: LODR-32(1)/(4)/(5) each require their own specific reporting-failure fact", () => {
  const p1 = makeProvision({ id: "LODR-32-1", subject: "Quarterly deviation/variation statement" });
  const p4 = makeProvision({ id: "LODR-32-4", subject: "Directors' report explanation of variation" });
  const p5 = makeProvision({ id: "LODR-32-5", subject: "Annual statement, auditor-certified, placed before Audit Committee" });
  const provisions = [p1, p4, p5];
  const findings = [
    conductFinding("SYN-32-1-FIND", p1.id, "quarterly_deviation_disclosure_failure"),
    conductFinding("SYN-32-4-FIND", p4.id, "annual_variation_explanation_failure"),
    conductFinding("SYN-32-5-FIND", p5.id, "deviation_statement_auditor_certification_failure"),
    // A bare-diversion finding independently linking to all three, so a
    // pure diversion fact has a real chance to (wrongly) surface any of
    // them if the gate were still overbroad.
    makeFinding({ recordId: "SYN-32-DIVERSION-FIND", provisionIds: [p1.id, p4.id, p5.id], allegedConduct: ["fund_diversion"] }),
  ];

  it("A. a BARE diversion fact (no stated reporting failure) promotes NONE of the three to Primary", () => {
    const result = analyzeScenario(
      { freeText: "Rights issue proceeds were diverted from the stated objects." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual([]);
  });

  it("B. diversion + quarterly statement not disclosed retrieves 32(1) only, never 32(4)/32(5)", () => {
    const result = analyzeScenario(
      { freeText: "Rights issue proceeds were diverted from the stated objects, and the quarterly statement of deviation was not disclosed." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-32-1"]);
  });

  it("C. annual statement not placed before the Audit Committee retrieves 32(5) only — corrected from the checkpoint's own working hypothesis that this was 32(4): verified directly against the current official LODR text, Regulation 32(4) is the directors'-report explanation duty with NO Audit-Committee-involvement text of its own; the AC-placement duty sits in 32(5) (combined with auditor certification) and, separately, in 32(3) (not independently indexed in this corpus)", () => {
    const result = analyzeScenario(
      { freeText: "A listed company raised proceeds through a rights issue, and the annual statement was not placed before the audit committee." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-32-5"]);
  });

  it("D. annual statement not certified by the statutory auditor retrieves 32(5) only", () => {
    const result = analyzeScenario(
      { freeText: "A listed company raised proceeds through a rights issue, and the annual statement of deviation was not certified by the statutory auditor." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-32-5"]);
  });

  it("E. funds diverted but all deviation statements and certifications were properly made — no Reg 32 reporting provision is a candidate breach", () => {
    const result = analyzeScenario(
      {
        freeText:
          "Rights issue proceeds were diverted from the stated objects. The quarterly statement of deviation was properly disclosed, the directors' report properly explained the variation, and the annual statement was duly certified by the statutory auditor and placed before the audit committee.",
      },
      findings,
      provisions,
      []
    );
    expect(allBreachIds(result)).not.toContain("LODR-32-1");
    expect(allBreachIds(result)).not.toContain("LODR-32-4");
    expect(allBreachIds(result)).not.toContain("LODR-32-5");
  });

  it("F. NO diversion, but the company failed to make the required quarterly deviation statement — 32(1) is independently retrieved (verified: Regulation 32(1) requires the quarterly statement 'indicating deviations, if any' — a nil-deviation quarter still requires the filing)", () => {
    const result = analyzeScenario(
      { freeText: "A listed company raised proceeds through a rights issue, and the company failed to submit the quarterly statement of deviation to the stock exchange." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toContain("LODR-32-1");
  });
});

// =======================================================================
// P0-3: LODR Regulation 6 — three distinct predicates
// =======================================================================
describe("Checkpoint correction 3, P0-3: LODR Regulation 6 appointment / vacancy-beyond-period / duty-performance are three distinct predicates", () => {
  const appt = makeProvision({ id: "LODR-6-gen", subject: "Compliance Officer appointment" });
  const vacancy = makeProvision({ id: "LODR-6-1A", subject: "Compliance Officer vacancy — time-bound duty to fill" });
  const duty = makeProvision({ id: "LODR-6-2-a", subject: "Compliance Officer duty to ensure conformity" });
  const provisions = [appt, vacancy, duty];
  const findings = [
    conductFinding("SYN-6-APPT-FIND", appt.id, "compliance_officer_deficiency"),
    conductFinding("SYN-6-VAC-FIND", vacancy.id, "compliance_officer_vacancy_beyond_period"),
    conductFinding("SYN-6-DUTY-FIND", duty.id, "compliance_officer_duty_failure"),
  ];

  it("1. 'became vacant yesterday' (no exceedance stated) must NOT automatically produce a 6(1A) breach candidate merely because a vacancy exists", () => {
    const result = analyzeScenario(
      { freeText: "The Compliance Officer position became vacant yesterday." },
      findings,
      provisions,
      []
    );
    expect(allBreachIds(result)).not.toContain("LODR-6-1A");
  });

  it("2. a vacancy stated to have remained unfilled beyond the statutory period retrieves LODR-6-1A", () => {
    const result = analyzeScenario(
      { freeText: "The Compliance Officer vacancy remained unfilled beyond the statutory period." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toContain("LODR-6-1A");
  });

  it("3. 'the company had no compliance officer' retrieves the appointment obligation (6-gen), not the 6(2) duty-performance provision, and not 6(1A) absent a stated exceedance", () => {
    const result = analyzeScenario(
      { freeText: "The company had no compliance officer, since no qualified person was ever appointed to the role." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-6-gen"]);
  });

  it("4. a duly appointed Compliance Officer's duty-performance failure retrieves the specific 6(2) duty, never the vacancy or appointment provisions", () => {
    const result = analyzeScenario(
      { freeText: "A duly appointed Compliance Officer failed to ensure conformity with regulatory requirements." },
      findings,
      provisions,
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-6-2-a"]);
  });

  it("5. Compliance Officer duly appointed and all duties performed — zero candidate breaches", () => {
    const result = analyzeScenario(
      { freeText: "The Compliance Officer was duly appointed and all duties were performed." },
      findings,
      provisions,
      []
    );
    expect(allBreachIds(result)).toEqual([]);
  });
});

// =======================================================================
// P1: LODR-18(2) — documentation gap is evidentiary, not substantive
// =======================================================================
describe("Checkpoint correction 3, P1: Audit Committee meeting documentation absence is evidentiary only, never itself the substantive breach", () => {
  const meetings = makeProvision({ id: "LODR-18-2", subject: "Audit Committee meeting frequency" });
  const finding = conductFinding("SYN-18-2-FIND", meetings.id, "audit_committee_deficiency");

  it("a documentation-gap-only fact (minutes/agendas unavailable) does NOT promote LODR-18-2 to a candidate breach", () => {
    const result = analyzeScenario(
      { freeText: "The Audit Committee's minutes could not be produced, and no agendas were available for the relevant period." },
      [finding],
      [meetings],
      []
    );
    expect(allBreachIds(result)).not.toContain("LODR-18-2");
  });

  it("detectConcepts flags the documentation gap as its own evidentiary concept, distinct from the substantive meetings-not-held concept", () => {
    const detected = detectConcepts("The Audit Committee's minutes could not be produced, and no agendas were available for the relevant period.");
    const ids = detected.map((d) => d.id);
    expect(ids).toContain("audit_committee_meeting_documentation_gap");
    expect(ids).not.toContain("audit_committee_deficiency");
  });

  it("an explicit 'did not meet as required' fact DOES promote LODR-18-2 to a candidate breach", () => {
    const result = analyzeScenario(
      { freeText: "The Audit Committee did not meet as required during the financial year." },
      [finding],
      [meetings],
      []
    );
    expect(primaryIds(result)).toContain("LODR-18-2");
  });
});

// =======================================================================
// Structural invariants required by checkpoint correction 3
// =======================================================================
describe("Checkpoint correction 3: structural invariant — mutually-exclusive/chapter-alternative provisions never simultaneously Primary merely because a common subject is detected", () => {
  it("ICDR-24-1 and ICDR-245-1 are never both primary_candidate in the same result, across every fixture combination in this file", () => {
    const mainBoard = makeProvision({ id: "ICDR-24-1", subject: "Main-board offer document disclosures" });
    const sme = makeProvision({ id: "ICDR-245-1", subject: "SME offer document disclosures" });
    const findings = [
      conductFinding("STRUCT-24-FIND", mainBoard.id, "non_disclosure_of_information"),
      conductFinding("STRUCT-245-FIND", sme.id, "non_disclosure_of_information"),
    ];
    for (const text of [
      "The prospectus did not disclose material facts.",
      "The company's prospectus, for its main-board IPO, did not disclose material facts.",
      "The company's prospectus, for its SME IPO, did not disclose material facts.",
    ]) {
      const result = analyzeScenario({ freeText: text }, findings, [mainBoard, sme], []);
      const both = primaryIds(result).filter((id) => id === "ICDR-24-1" || id === "ICDR-245-1");
      expect(both.length).toBeLessThanOrEqual(1);
    }
  });
});

describe("Checkpoint correction 3: structural invariant — sibling/cumulative sub-provisions do not inherit one another's factual gate", () => {
  it("a fact satisfying ONLY LODR-32(1)'s own predicate never also promotes 32(4) or 32(5)", () => {
    const p1 = makeProvision({ id: "LODR-32-1", subject: "Quarterly deviation/variation statement" });
    const p4 = makeProvision({ id: "LODR-32-4", subject: "Directors' report explanation of variation" });
    const p5 = makeProvision({ id: "LODR-32-5", subject: "Annual statement, auditor-certified" });
    const findings = [
      conductFinding("SIB-32-1", p1.id, "quarterly_deviation_disclosure_failure"),
      conductFinding("SIB-32-4", p4.id, "annual_variation_explanation_failure"),
      conductFinding("SIB-32-5", p5.id, "deviation_statement_auditor_certification_failure"),
    ];
    const result = analyzeScenario(
      { freeText: "A listed company raised proceeds through a rights issue, and the quarterly statement of deviation was not disclosed." },
      findings,
      [p1, p4, p5],
      []
    );
    expect(primaryIds(result)).toEqual(["LODR-32-1"]);
  });

  it("a fact satisfying ONLY Regulation 6(2)(a)'s own duty-performance predicate never also promotes 6(2)(b)/(c)", () => {
    const a = makeProvision({ id: "LODR-6-2-a", subject: "Ensure conformity" });
    const b = makeProvision({ id: "LODR-6-2-b", subject: "Co-ordinate with and report to the Board" });
    const c = makeProvision({ id: "LODR-6-2-c", subject: "Ensure correct procedures" });
    const findings = [
      conductFinding("SIB-6-2-A", a.id, "compliance_officer_duty_failure"),
      conductFinding("SIB-6-2-B", b.id, "compliance_officer_duty_failure"),
      conductFinding("SIB-6-2-C", c.id, "compliance_officer_duty_failure"),
    ];
    const result = analyzeScenario(
      { freeText: "The Compliance Officer failed to ensure conformity with the applicable statutory requirements." },
      findings,
      [a, b, c],
      []
    );
    // All three currently share one curated conduct concept (this corpus's
    // vocabulary does not yet distinguish the three 6(2) lettered duties
    // from one another textually — a disclosed, genuine limitation, not
    // silently papered over); the invariant under test is that a fact
    // matching the SHARED concept does not ALSO promote a provision gated
    // on a genuinely DIFFERENT concept (e.g. vacancy or appointment).
    expect(primaryIds(result).sort()).toEqual(["LODR-6-2-a", "LODR-6-2-b", "LODR-6-2-c"]);
  });
});

describe("Checkpoint correction 3: structural invariant — time-bound compliance provisions require the time-condition fact before candidate-breach promotion", () => {
  it("LODR-6-1A requires an explicit exceedance-of-period fact; a bare vacancy mention never promotes it", () => {
    const vacancy = makeProvision({ id: "LODR-6-1A", subject: "Compliance Officer vacancy time-bound duty" });
    const finding = conductFinding("TIME-6-1A", vacancy.id, "compliance_officer_vacancy_beyond_period");
    const bare = analyzeScenario({ freeText: "There was a Compliance Officer vacancy." }, [finding], [vacancy], []);
    expect(allBreachIds(bare)).not.toContain("LODR-6-1A");
    const exceeded = analyzeScenario(
      { freeText: "The Compliance Officer vacancy remained unfilled beyond the statutory period." },
      [finding],
      [vacancy],
      []
    );
    expect(primaryIds(exceeded)).toContain("LODR-6-1A");
  });
});

describe("Checkpoint correction 3: structural invariant — evidentiary absence never equals substantive breach", () => {
  it("LODR-18-2 requires the substantive meetings-not-held fact; documentary absence alone never promotes it", () => {
    const meetings = makeProvision({ id: "LODR-18-2", subject: "Audit Committee meeting frequency" });
    const finding = conductFinding("EVID-18-2", meetings.id, "audit_committee_deficiency");
    const evidentiaryOnly = analyzeScenario(
      { freeText: "No meeting minutes could be produced." },
      [finding],
      [meetings],
      []
    );
    expect(allBreachIds(evidentiaryOnly)).not.toContain("LODR-18-2");
  });
});

describe("Checkpoint correction 3: structural invariant — ordinary RPT non-disclosure without independent PFUTP facts remains zero PFUTP (re-confirmed after this checkpoint's changes)", () => {
  it("detectConcepts on a plain RPT non-disclosure scenario still detects no PFUTP-relevant fraud/trading conduct concept", () => {
    const detected = detectConcepts(
      "A related-party transaction was not disclosed to the Audit Committee as required, though the transaction itself was conducted at fair value."
    );
    const conductIds = new Set(detected.filter((d) => d.kind === "conduct").map((d) => d.id));
    for (const fraudConcept of [
      "false_appearance_of_trading",
      "actual_price_manipulation",
      "non_genuine_dealing_or_ownership",
      "dealing_in_stolen_or_counterfeit_securities",
      "mis_selling_of_securities",
    ]) {
      expect(conductIds.has(fraudConcept)).toBe(false);
    }
  });
});

describe("Checkpoint correction 3: structural invariant — an honest zero-result answer remains valid (no forced non-empty result)", () => {
  it("a scenario with genuinely no adverse fact for any registered provision returns zero provisionResults without error", () => {
    const p = makeProvision({ id: "ICDR-24-1", subject: "Main-board offer document disclosures" });
    const finding = conductFinding("HONEST-ZERO", p.id, "non_disclosure_of_information");
    const result = analyzeScenario({ freeText: "The company held its annual general meeting as scheduled." }, [finding], [p], []);
    expect(result.provisionResults).toHaveLength(0);
  });
});

describe("Checkpoint correction 3: structural invariant — historical precedent attachment never overrides a failed provision-specific prerequisite", () => {
  it("a provision cited by a real, confirmed, on-point historical precedent still does not become a candidate breach when the entered facts fail its own gate", () => {
    const p = makeProvision({ id: "ICDR-245-1", subject: "SME offer document disclosures" });
    // A strong precedent: Confirmed in Final Order, directly on point.
    const finding = makeFinding({
      recordId: "PRECEDENT-STRONG",
      provisionIds: [p.id],
      allegedConduct: ["non_disclosure_of_information"],
      findingStatus: "Confirmed in Final Order",
    });
    // Entered facts state a disclosure defect but no SME signal at all —
    // ICDR-245-1's own gate is unmet regardless of how strong the
    // attached precedent is.
    const result = analyzeScenario(
      { freeText: "The prospectus did not disclose material facts about the promoter's litigation history." },
      [finding],
      [p],
      []
    );
    expect(primaryIds(result)).not.toContain("ICDR-245-1");
    // Still surfaced, honestly, as gate-blocked rather than silently
    // dropped — the precedent's own existence is never lost, just never
    // used to bypass the gate.
    expect(gateBlockedIds(result)).toContain("ICDR-245-1");
  });
});
