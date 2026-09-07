// Guards the interim-vs-final "reversal" filter behind the Precedent
// Comparison page's new section (requested after live-demo feedback: "a
// scenario X which was mentioned in interim order but it was not upheld in
// final order... comparative analysis between the both"). The tricky part
// is that scenario_findings.interim_paragraph_references is sometimes a
// non-null explanatory note ("Not applicable — the interim order itself is
// not in this register") rather than an actual citation — those must be
// excluded the same as a genuinely empty field, or the comparison panel
// shows a fabricated-looking "at interim" side with nothing real in it.
import { describe, expect, it } from "vitest";
import { interimFinalReversals, isInterimFinalReversal } from "@/lib/precedentShifts";
import type { ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding>): ScenarioFinding {
  return {
    recordId: "MOCK-01",
    caseName: "Mock Case Limited",
    orderIds: ["order-1", "order-2"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
    noticeeActors: [],
    findingStatus: "Not Confirmed in Final Order",
    interimParagraphReferences: "Interim order paras 1-10",
    finalParagraphReferences: "Final order paras 20-25",
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

describe("isInterimFinalReversal", () => {
  it("accepts a negative-outcome finding with real citations on both sides (the SSSL-03 shape)", () => {
    expect(isInterimFinalReversal(makeFinding({}))).toBe(true);
  });

  it("accepts Withdrawn as well as Not Confirmed in Final Order", () => {
    expect(isInterimFinalReversal(makeFinding({ findingStatus: "Withdrawn" }))).toBe(true);
  });

  it("rejects a positive-outcome finding even with both citations present", () => {
    expect(isInterimFinalReversal(makeFinding({ findingStatus: "Confirmed in Final Order" }))).toBe(false);
    expect(isInterimFinalReversal(makeFinding({ findingStatus: "Partly Confirmed in Final Order" }))).toBe(false);
  });

  it("rejects a finding with no interim paragraph reference at all", () => {
    expect(isInterimFinalReversal(makeFinding({ interimParagraphReferences: null }))).toBe(false);
  });

  it("rejects a finding with no final paragraph reference at all", () => {
    expect(isInterimFinalReversal(makeFinding({ finalParagraphReferences: null }))).toBe(false);
  });

  it("rejects an interimParagraphReferences that is really a 'not applicable' note (HEXA-01/NALWA-01 shape)", () => {
    expect(
      isInterimFinalReversal(
        makeFinding({
          interimParagraphReferences: "Not applicable (this is a single final order disposing of the SCN, not preceded by an interim order in this register)",
        })
      )
    ).toBe(false);
  });

  it("rejects an interimParagraphReferences that only recites an order 'not itself in this register' (ARL-AUD-01/DHFL-01 shape)", () => {
    expect(
      isInterimFinalReversal(
        makeFinding({
          interimParagraphReferences: "Interim order (Feb 16, 2017) — not itself in this register; recited at paras 3-4 of this order",
        })
      )
    ).toBe(false);
    expect(
      isInterimFinalReversal(
        makeFinding({
          interimParagraphReferences: "Not applicable — the interim order itself is not in this register; this order (paras 1-3) only recites its existence and directions.",
        })
      )
    ).toBe(false);
  });
});

describe("interimFinalReversals", () => {
  it("filters a mixed list down to only genuine reversals", () => {
    const findings = [
      makeFinding({ recordId: "REVERSAL-01" }),
      makeFinding({ recordId: "UPHELD-01", findingStatus: "Confirmed in Final Order" }),
      makeFinding({ recordId: "NO-INTERIM-01", interimParagraphReferences: null }),
      makeFinding({
        recordId: "NOT-APPLICABLE-01",
        interimParagraphReferences: "Not applicable (single final order; reasoning incorporated by reference)",
      }),
    ];
    expect(interimFinalReversals(findings).map((f) => f.recordId)).toEqual(["REVERSAL-01"]);
  });
});
