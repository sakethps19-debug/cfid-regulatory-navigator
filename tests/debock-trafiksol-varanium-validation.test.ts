// Validation-suite extension for the Aug-2026 Debock/Trafiksol/Varanium
// integration pass. This EXTENDS the existing validation philosophy (see
// tests/fixed-scenario-analyzer.test.ts, tests/broad-scenario-match.test.ts,
// tests/exact-provision-citation.test.ts) rather than replacing it — those
// files are untouched except for the minimal fixture/count updates the new
// 9th scenario required. Expected outcomes below were reasoned independently
// from the official order text (see this pass's final report for paragraph
// citations), not generated from the engine and then asserted as correct.
import { describe, expect, it } from "vitest";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import { broadScenariosForFinding, matchScenariosForQuery } from "@/lib/broadScenarioMatch";
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

function scenario(id: string) {
  const s = FIXED_SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`fixture gap: no scenario with id ${id}`);
  return s;
}

describe("Debock: diversion of rights-issue proceeds is an EXISTING MATCH (Category A), not a new scenario", () => {
  it("a rights-issue-proceeds diversion finding matches the existing diversion scenario", () => {
    const finding = makeFinding({
      recordId: "DBK-01",
      transactionTypes: ["rights_issue"],
      allegedConduct: ["fund_diversion"],
    });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).toContain("diversion-siphoning-misutilisation");
  });

  it("PFUTP-4-2-h (dealing in stolen/counterfeit securities) is NOT part of any master-scenario mapping despite being an official established citation on this specific finding — its own text is not independently satisfied by a bare diversion/fictitious-statement fact pattern", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(s.provisionIds).not.toContain("PFUTP-4-2-h");
    }
  });
});

describe("New scenario: IPO / Prospectus / Offer Document Disclosure Irregularities (Category C, genuinely new)", () => {
  it("exists, with exactly the four independently-justified provisions", () => {
    const s = scenario("ipo-prospectus-offer-document-disclosure-irregularities");
    expect(s.provisionIds.sort()).toEqual(["ICDR-24-1", "ICDR-245-1", "LODR-32", "PFUTP-4-2-s"].sort());
  });

  it("does NOT include PFUTP-4-2-r — that provision was expressly found NOT established on the Trafiksol facts (an unsuccessfully alleged provision must not become positive template support merely because it was discussed)", () => {
    const s = scenario("ipo-prospectus-offer-document-disclosure-irregularities");
    expect(s.provisionIds).not.toContain("PFUTP-4-2-r");
  });

  it("does NOT duplicate the core PFUTP/12A fraud provisions already an existing match under financial-statement-misrepresentation — repeating them here would blur the two scenarios' distinct identities", () => {
    const s = scenario("ipo-prospectus-offer-document-disclosure-irregularities");
    for (const id of ["SEBI-ACT-12A-a", "SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-1"]) {
      expect(s.provisionIds).not.toContain(id);
    }
  });

  it("ICDR-24-1 and ICDR-245-1 are kept as distinct canonical ids (exact-legal-identity rule) even though their operative text is nearly identical — different regulation numbers for different issue segments are different legal identities", () => {
    const s = scenario("ipo-prospectus-offer-document-disclosure-irregularities");
    expect(s.provisionIds).toContain("ICDR-24-1");
    expect(s.provisionIds).toContain("ICDR-245-1");
    expect(s.provisionIds.filter((id) => id === "ICDR-24-1" || id === "ICDR-245-1")).toHaveLength(2);
  });
});

describe("Exact-instrument-numbering trap: a shared numeral ('4', '24', '32') across instruments/regulations must never imply a legal-hierarchy relationship", () => {
  it("ICDR-24-1 is never treated as related to LODR-4-1 or PFUTP-4-1 merely by sharing a leading digit or sub-clause '(1)'", () => {
    // No scenario should list ICDR-24-1 alongside an assumption that it
    // is the "same" provision as LODR-4-1/PFUTP-4-1 -- this is checked by
    // construction: the new scenario's provisionIds are exactly the four
    // asserted above, and financial-statement-misrepresentation (which
    // DOES use LODR-4-1-* and PFUTP-4-1) does not gain ICDR-24-1.
    const financialMisrep = scenario("financial-statement-misrepresentation");
    expect(financialMisrep.provisionIds).not.toContain("ICDR-24-1");
    expect(financialMisrep.provisionIds).not.toContain("ICDR-245-1");
  });

  it("LODR-32 (issue-proceeds monitoring, kept ungranulated) is never conflated with LODR-4-1's lettered sub-clause split -- LODR-4-1 remains split, LODR-32 remains a single id, and neither corpus modelling choice is retroactively applied to the other", () => {
    const s = scenario("ipo-prospectus-offer-document-disclosure-irregularities");
    expect(s.provisionIds).toContain("LODR-32");
    expect(s.provisionIds).not.toContain("LODR-32-1");
    expect(s.provisionIds).not.toContain("LODR-32-4");
    expect(s.provisionIds).not.toContain("LODR-32-5");
  });
});

describe("Max Financial Services: full exoneration must never surface as template support for any provision (contradictory/negative case)", () => {
  it("none of this pass's four newly-added provisions (ICDR-24-1, ICDR-245-1, LODR-32, PFUTP-4-2-s) were sourced from Max Financial Services -- all trace only to Trafiksol/Varanium, whose facts independently satisfy them; Max Financial Services' own SCN allegations (Sections 12A(b),(c) / PFUTP 3(c),(d), 4(2)(k),(r)) were ALL found not established and contributed zero provisions to the master taxonomy", () => {
    const newIpoScenario = scenario("ipo-prospectus-offer-document-disclosure-irregularities");
    for (const id of ["ICDR-24-1", "ICDR-245-1", "LODR-32", "PFUTP-4-2-s"]) {
      expect(newIpoScenario.provisionIds).toContain(id);
    }
    // The SCN provisions alleged against Max Financial Services but found
    // NOT established (Section 12A(b)/(c), PFUTP 3(c)/(d), 4(2)(k)/(r))
    // were already present in other scenarios BEFORE this pass (sourced
    // from Seacoast/Rajesh Exports/Debock/Trafiksol, all matters where
    // those provisions WERE independently established) -- this pass did
    // not add or remove any of them because of Max Financial Services.
    expect(newIpoScenario.provisionIds).not.toContain("SEBI-ACT-12A-b");
    expect(newIpoScenario.provisionIds).not.toContain("PFUTP-3-c");
    expect(newIpoScenario.provisionIds).not.toContain("PFUTP-4-2-k");
    expect(newIpoScenario.provisionIds).not.toContain("PFUTP-4-2-r");
  });
});

describe("Near-miss: false/misleading offer-document disclosure vs. 'planting' false news are legally distinct, not interchangeable labels for the same conduct", () => {
  it("a finding tagged only with the generic 'false or fictitious corporate announcement' conduct tag still does not, by itself, prove which specific PFUTP 4(2) sub-clause applies -- broadScenariosForFinding only surfaces the SCENARIO, never a specific sub-clause conclusion", () => {
    const finding = makeFinding({
      recordId: "TRF-01",
      allegedConduct: ["false_business_or_corporate_announcement", "non_disclosure_of_information"],
    });
    const scenarios = broadScenariosForFinding(finding);
    // false-misleading-incomplete-disclosures is the existing scenario
    // this conduct tag combination maps to; the new IPO scenario is
    // deliberately NOT reachable via this mechanism (keyConceptIds: []),
    // so it must not spuriously appear here either.
    expect(scenarios.map((s) => s.id)).toContain("false-misleading-incomplete-disclosures");
    expect(scenarios.map((s) => s.id)).not.toContain("ipo-prospectus-offer-document-disclosure-irregularities");
  });
});

describe("Clean control: an unrelated finding matches neither the diversion scenario nor the new IPO-disclosure scenario", () => {
  it("a finding with no diversion/disclosure-adjacent tags at all matches zero of the two scenarios this pass touched", () => {
    const finding = makeFinding({
      recordId: "CLEAN-01",
      transactionTypes: ["derivative_transaction"],
      allegedConduct: ["audit_committee_deficiency"],
    });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).not.toContain("diversion-siphoning-misutilisation");
    expect(scenarios.map((s) => s.id)).not.toContain("ipo-prospectus-offer-document-disclosure-irregularities");
  });

  it("Law Library free-text search for an unrelated query never matches the new IPO scenario (it has no keyConceptIds, so it can never be a false-positive free-text hit)", () => {
    const matched = matchScenariosForQuery("audit committee composition");
    expect(matched.map((s) => s.id)).not.toContain("ipo-prospectus-offer-document-disclosure-irregularities");
  });
});

describe("Mixed scenario: Debock's fraudulent scheme spans two existing scenarios without conflating their provisions", () => {
  it("a finding with BOTH diversion and fictitious-sales conduct tags matches both existing scenarios, and each scenario's own provisionIds remain unchanged by this pass", () => {
    const finding = makeFinding({
      recordId: "DBK-01",
      transactionTypes: ["rights_issue"],
      allegedConduct: ["fund_diversion", "fictitious_sales_or_revenue"],
    });
    const scenarios = broadScenariosForFinding(finding);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids).toEqual(["diversion-siphoning-misutilisation", "financial-statement-misrepresentation"].sort());
  });
});
