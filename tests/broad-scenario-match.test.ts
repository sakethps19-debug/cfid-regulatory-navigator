// Officer walkthrough Part 4/6/7: Law Library fact/concept search precision,
// and the provision page's "broad CFID scenarios" consolidation. Both are
// powered by the same src/lib/broadScenarioMatch.ts mechanism, restricted
// to a finding's own STRUCTURED transactionTypes/allegedConduct tags —
// never its free-text case name, evidence list, or actor roles, which is
// exactly the leakage that previously let Ind AS 7 and Companies Act
// Section 180 surface for a "related party transactions" search.
import { describe, expect, it } from "vitest";
import { matchScenariosForQuery, broadScenariosForFinding, broadScenariosForProvision } from "@/lib/broadScenarioMatch";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import type { ScenarioFinding } from "@/types/domain";

function makeFinding(overrides: Partial<ScenarioFinding> & { recordId: string }): ScenarioFinding {
  return {
    caseName: "Mock Case Limited",
    orderIds: ["order-1"],
    category: null,
    scenarioTitle: "Mock finding",
    factualPattern: "Mock factual pattern.",
    provisionsConsideredRaw: null,
    provisionIds: [],
    provisionLinks: [],
    noticeeActors: [],
    findingStatus: "Prima facie",
    interimParagraphReferences: null,
    finalParagraphReferences: null,
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

describe("Law search: 'related party transactions' does not surface unrelated provisions", () => {
  it("matches the Related Party Transaction Irregularities scenario for a genuine RPT query", () => {
    const matched = matchScenariosForQuery("related party transactions");
    expect(matched.map((s) => s.id)).toContain("related-party-transaction-irregularities");
  });

  it("the matched scenario's own curated provisions never include Ind AS 7 or Companies Act Section 180", () => {
    const matched = matchScenariosForQuery("related party transactions");
    const rpt = matched.find((s) => s.id === "related-party-transaction-irregularities")!;
    expect(rpt.provisionIds).not.toContain("IND-AS-7");
    expect(rpt.provisionIds).not.toContain("COMPANIES-ACT-180-1-a");
  });

  it("Ind AS 7 and Companies Act 180 are not in ANY scenario's curated provision list (no curated RPT association exists anywhere)", () => {
    for (const scenario of FIXED_SCENARIOS) {
      expect(scenario.provisionIds).not.toContain("IND-AS-7");
      expect(scenario.provisionIds).not.toContain("COMPANIES-ACT-180-1-a");
    }
  });

  it("does not match on a bare mention of 'related party' evidence alone (no free-text fallback over evidenceTypes)", () => {
    // Reproduces the exact leakage mechanism that used to surface Ind AS 7:
    // a finding whose only RPT-adjacent signal is its EVIDENCE list, with
    // no genuine transaction/conduct tag. broadScenariosForFinding must
    // never key off evidenceTypes.
    const finding = makeFinding({
      recordId: "F-01",
      category: "Fictitious sales or assets",
      transactionTypes: ["fictitious_sale_or_purchase"],
      evidenceTypes: ["related_party_register"],
    });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).not.toContain("related-party-transaction-irregularities");
  });
});

describe("Law search: other broad concepts already in the fixed-scenario taxonomy (not hard-coded to RPT only)", () => {
  it("'diversion of funds' matches the diversion scenario", () => {
    const matched = matchScenariosForQuery("diversion of funds");
    expect(matched.map((s) => s.id)).toContain("diversion-siphoning-misutilisation");
  });

  it("'Audit Committee not properly constituted' matches the governance scenario", () => {
    const matched = matchScenariosForQuery("Audit Committee not properly constituted");
    expect(matched.map((s) => s.id)).toContain("audit-committee-governance-irregularities");
  });

  it("'compliance officer vacancy' matches the Compliance Officer scenario", () => {
    const matched = matchScenariosForQuery("compliance officer vacancy");
    expect(matched.map((s) => s.id)).toContain("compliance-officer-irregularities");
  });

  it("'fraudulent preferential allotment' matches the fraudulent allotment scenario", () => {
    const matched = matchScenariosForQuery("fraudulent preferential allotment");
    expect(matched.map((s) => s.id)).toContain("fraudulent-fictitious-allotment");
  });

  it("an empty or unrecognised query matches no scenario (never a default/catch-all)", () => {
    expect(matchScenariosForQuery("")).toEqual([]);
    expect(matchScenariosForQuery("xyzzy unrelated gibberish query")).toEqual([]);
  });

  it("the broad catch-all scenario (scenario 8) never matches via concept search, only the specific scenario that fits", () => {
    const matched = matchScenariosForQuery("related party transactions");
    expect(matched.map((s) => s.id)).not.toContain("fraudulent-manipulative-conduct-broad");
  });
});

describe("Provision page: broad CFID scenario consolidation is not a tag-propagation system", () => {
  it("a finding maps to a scenario only through its own transactionTypes/allegedConduct, never its evidence or actor tags", () => {
    const finding = makeFinding({
      recordId: "F-01",
      transactionTypes: ["fund_diversion"],
      allegedConduct: ["circular_fund_movement"],
      actorRoles: ["promoter"],
      evidenceTypes: ["bank_statements_flow"],
    });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).toContain("diversion-siphoning-misutilisation");
    expect(scenarios.map((s) => s.id)).not.toContain("related-party-transaction-irregularities");
  });

  it("PFUTP is not associated with every diversion/RPT/financial-statement scenario merely because a finding citing PFUTP also touches those topics incidentally", () => {
    // A finding whose ONLY structured signal is fund diversion must not
    // pull in RPT or financial-statement scenarios just because it also
    // happens to cite PFUTP provisions elsewhere on the same finding.
    const finding = makeFinding({
      recordId: "F-01",
      transactionTypes: ["fund_diversion"],
      provisionIds: ["PFUTP-4-1", "SEBI-ACT-12A-a"],
    });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).toEqual(["diversion-siphoning-misutilisation"]);
  });

  it("consolidates many granular findings into a small set of broad scenarios (not one row per finding)", () => {
    const findings = [
      makeFinding({ recordId: "F-01", transactionTypes: ["fund_diversion"] }),
      makeFinding({ recordId: "F-02", allegedConduct: ["circular_fund_movement"] }),
      makeFinding({ recordId: "F-03", allegedConduct: ["audit_committee_deficiency"] }),
      makeFinding({ recordId: "F-04", category: "unrelated", transactionTypes: [], allegedConduct: [] }),
    ];
    const scenarios = broadScenariosForProvision(findings);
    // 4 findings -> at most 2 distinct broad scenarios (diversion, governance), never 4
    expect(scenarios.length).toBeLessThan(findings.length);
    expect(scenarios.map((s) => s.id).sort()).toEqual(["audit-committee-governance-irregularities", "diversion-siphoning-misutilisation"]);
  });

  it("a provision cited by no findings has no broad scenarios (empty, not a guess)", () => {
    expect(broadScenariosForProvision([])).toEqual([]);
  });
});
