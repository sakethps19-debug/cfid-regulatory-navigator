// Validation-suite extension for the Aug-2026 Debock/Trafiksol/Varanium
// integration pass AND its subsequent correction pass (ICDR re-verification,
// LODR-32 granularity fix, Max Financial negative-precedent preservation,
// capital-raising Product/Sub-product restructuring, Law<->Analyze two-way
// concept mapping). This EXTENDS the existing validation philosophy (see
// tests/fixed-scenario-analyzer.test.ts, tests/broad-scenario-match.test.ts,
// tests/exact-provision-citation.test.ts) rather than replacing it. Expected
// outcomes below were reasoned independently from the official order text
// (see the correction pass's final report for paragraph citations), not
// generated from the engine and then asserted as correct.
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

describe("Item 6 (correction pass): Debock PFUTP-3(a) and PFUTP-4(2)(c) remain excluded from every master mapping", () => {
  it("PFUTP-3-a is not in the diversion or financial-statement-misrepresentation scenarios — a bare diversion fact pattern (which the diversion scenario also covers for non-securities contexts, e.g. a Cash Credit facility, with no 'dealing in securities' nexus at all) does not universally satisfy 3(a)'s 'dealing in securities in a fraudulent manner' prerequisite; correctly modelling the narrower IPO/rights-issue-proceeds-specific sub-case would require splitting the diversion scenario itself, which is out of scope for this pass", () => {
    expect(scenario("diversion-siphoning-misutilisation").provisionIds).not.toContain("PFUTP-3-a");
    expect(scenario("financial-statement-misrepresentation").provisionIds).not.toContain("PFUTP-3-a");
  });

  it("PFUTP-4-2-c is not in any master scenario — the current official PFUTP text of 4(2)(c) requires inducing subscription to fraudulently secure an issue's minimum subscription by advancing money to a third party, a narrower prerequisite Debock's diversion-of-already-raised-proceeds fact pattern does not itself establish", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(s.provisionIds).not.toContain("PFUTP-4-2-c");
    }
  });
});

describe("Capital Raising / Issue of Securities: three legally distinct sub-products (correction pass restructuring)", () => {
  it("replaces the single over-compressed scenario with three sub-products sharing one product label", () => {
    const subProducts = FIXED_SCENARIOS.filter((s) => s.product === "Capital Raising / Issue of Securities");
    expect(subProducts.map((s) => s.id).sort()).toEqual(
      ["capital-raising-fraudulent-mis-selling", "capital-raising-issue-proceeds-deviation-reporting", "capital-raising-offer-document-misstatement"].sort()
    );
    expect(FIXED_SCENARIOS.find((s) => s.id === "ipo-prospectus-offer-document-disclosure-irregularities")).toBeUndefined();
  });

  it("Sub-product A (offer document/prospectus) holds only ICDR 24(1)/245(1) — never LODR-32 or PFUTP-4-2-s", () => {
    const s = scenario("capital-raising-offer-document-misstatement");
    expect(s.provisionIds.sort()).toEqual(["ICDR-24-1", "ICDR-245-1"].sort());
  });

  it("Sub-product B (issue-proceeds deviation reporting) holds only the three exact LODR-32 sub-regulations Varanium's order actually cites — never bare LODR-32, never ICDR provisions", () => {
    const s = scenario("capital-raising-issue-proceeds-deviation-reporting");
    expect(s.provisionIds.sort()).toEqual(["LODR-32-1", "LODR-32-4", "LODR-32-5"].sort());
    expect(s.provisionIds).not.toContain("LODR-32");
    expect(s.provisionIds).not.toContain("ICDR-24-1");
    expect(s.provisionIds).not.toContain("ICDR-245-1");
  });

  it("Sub-product C (fraudulent mis-selling) holds only PFUTP-4-2-s, standing alone — never inherited merely because a scenario is offer-document-adjacent", () => {
    const s = scenario("capital-raising-fraudulent-mis-selling");
    expect(s.provisionIds).toEqual(["PFUTP-4-2-s"]);
  });

  it("no sub-product duplicates PFUTP-4-2-r (Trafiksol, expressly NOT established) or the core PFUTP/12A fraud provisions already an existing match under financial-statement-misrepresentation", () => {
    for (const s of FIXED_SCENARIOS.filter((x) => x.product === "Capital Raising / Issue of Securities")) {
      expect(s.provisionIds).not.toContain("PFUTP-4-2-r");
      for (const id of ["SEBI-ACT-12A-a", "SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-1"]) {
        expect(s.provisionIds).not.toContain(id);
      }
    }
  });
});

describe("Item 7A: exact LODR-32 sub-regulation identity", () => {
  it("LODR-32-1/32-4/32-5 are distinct ids from the legacy LODR-32 umbrella id and from each other", () => {
    const ids = ["LODR-32", "LODR-32-1", "LODR-32-4", "LODR-32-5"];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the legacy LODR-32 id is not used by the new capital-raising sub-products (kept only for pre-existing legacy findings, never for this new exact mapping)", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(s.provisionIds).not.toContain("LODR-32");
    }
  });
});

describe("Item 7D: offer-document disclosure vs. issue-proceeds reporting are legally distinct sub-products, not one bundled obligation", () => {
  it("a finding tagged only with the offer-document/prospectus conduct matches Sub-product A but not Sub-product B", () => {
    const finding = makeFinding({ recordId: "TEST-A", transactionTypes: ["offer_document_prospectus"] });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).toContain("capital-raising-offer-document-misstatement");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-issue-proceeds-deviation-reporting");
  });

  it("a finding tagged only with the issue-proceeds-deviation-reporting conduct matches Sub-product B but not Sub-product A", () => {
    const finding = makeFinding({ recordId: "TEST-B", allegedConduct: ["issue_proceeds_deviation_reporting"] });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).toContain("capital-raising-issue-proceeds-deviation-reporting");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-offer-document-misstatement");
  });
});

describe("Item 7E: PFUTP-4-2-s (mis-selling) requires its own independent prerequisites — never a generic consequence of an offer-document inaccuracy", () => {
  it("a finding tagged only with the offer-document/prospectus conduct (no independent mis-selling signal) does not match Sub-product C", () => {
    const finding = makeFinding({ recordId: "TEST-C", transactionTypes: ["offer_document_prospectus"] });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-fraudulent-mis-selling");
  });

  it("Sub-product C is unreachable via Law Library free-text search for a generic prospectus/offer-document query (keyConceptIds: []) — it never surfaces merely because the query mentions the offer document", () => {
    const matched = matchScenariosForQuery("prospectus misstatement");
    expect(matched.map((s) => s.id)).not.toContain("capital-raising-fraudulent-mis-selling");
  });
});

describe("Item 7G: Law <-> Analyze two-way taxonomy for the new capital-raising product", () => {
  it("'prospectus misstatement' retrieves the offer-document sub-product", () => {
    const matched = matchScenariosForQuery("prospectus misstatement");
    expect(matched.map((s) => s.id)).toContain("capital-raising-offer-document-misstatement");
  });

  it("'DRHP non-disclosure' also retrieves the offer-document sub-product (paraphrase coverage)", () => {
    const matched = matchScenariosForQuery("DRHP non-disclosure");
    expect(matched.map((s) => s.id)).toContain("capital-raising-offer-document-misstatement");
  });

  it("'statement of deviation' retrieves the issue-proceeds-deviation-reporting sub-product", () => {
    const matched = matchScenariosForQuery("statement of deviation");
    expect(matched.map((s) => s.id)).toContain("capital-raising-issue-proceeds-deviation-reporting");
  });

  it("'annual report disclosure' does NOT retrieve either capital-raising sub-product — ongoing post-listing disclosure is a separate legal question from the issue/offer-document process", () => {
    const matched = matchScenariosForQuery("annual report disclosure");
    expect(matched.map((s) => s.id)).not.toContain("capital-raising-offer-document-misstatement");
    expect(matched.map((s) => s.id)).not.toContain("capital-raising-issue-proceeds-deviation-reporting");
  });

  it("'related party transactions' does not retrieve any capital-raising sub-product merely because Trafiksol's facts also involved related-party billing", () => {
    const matched = matchScenariosForQuery("related party transactions");
    expect(matched.map((s) => s.id)).not.toContain("capital-raising-offer-document-misstatement");
    expect(matched.map((s) => s.id)).not.toContain("capital-raising-issue-proceeds-deviation-reporting");
    expect(matched.map((s) => s.id)).not.toContain("capital-raising-fraudulent-mis-selling");
  });

  it("a provision page's 'broad CFID scenarios' summary surfaces Sub-product B for a finding whose own structured tags are issue-proceeds-deviation-specific, never diversion (the two-way relationship uses the finding's own tags, never free text)", () => {
    const findings = [makeFinding({ recordId: "TEST-D", allegedConduct: ["issue_proceeds_deviation_reporting"] })];
    const scenarios = broadScenariosForFinding(findings[0]);
    expect(scenarios.map((s) => s.id)).toEqual(["capital-raising-issue-proceeds-deviation-reporting"]);
  });
});

describe("Item 7B/C: Max Financial Services preserved as a negative precedent, never as positive template support", () => {
  it("none of this pass's newly-added provisions (ICDR-24-1, ICDR-245-1, LODR-32-1/4/5, PFUTP-4-2-s) were sourced from Max Financial Services — all trace only to Trafiksol/Varanium, whose facts independently satisfy them", () => {
    const capitalRaisingProvisionIds = FIXED_SCENARIOS.filter((s) => s.product === "Capital Raising / Issue of Securities").flatMap((s) => s.provisionIds);
    // Max Financial Services' own SCN allegations (Section 12A(b)/(c),
    // PFUTP 3(c)/(d)/4(2)(k)/(r), LODR 30) were ALL found not established
    // (recorded in scenario_findings/finding_provisions with
    // relationship='not_upheld' -- see migration 0022) and contributed
    // zero provisions to the master taxonomy.
    for (const id of ["SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-2-k", "PFUTP-4-2-r", "LODR-30"]) {
      expect(capitalRaisingProvisionIds).not.toContain(id);
    }
  });

  it("no fixed scenario anywhere in the master taxonomy contains LODR-30 (Max Financial Services' only order-specific, not-established citation) — a not_upheld case-level citation never becomes template support", () => {
    for (const s of FIXED_SCENARIOS) {
      expect(s.provisionIds).not.toContain("LODR-30");
    }
  });
});

describe("Near-miss: false/misleading offer-document disclosure vs. 'planting' false news are legally distinct, not interchangeable labels for the same conduct", () => {
  it("a finding tagged only with the generic 'false or fictitious corporate announcement' conduct tag maps to the existing false-misleading-incomplete-disclosures scenario, not the new capital-raising sub-products (which require their own specific offer-document/deviation-reporting/mis-selling signals)", () => {
    const finding = makeFinding({
      recordId: "TRF-01",
      allegedConduct: ["false_business_or_corporate_announcement", "non_disclosure_of_information"],
    });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).toContain("false-misleading-incomplete-disclosures");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-offer-document-misstatement");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-issue-proceeds-deviation-reporting");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-fraudulent-mis-selling");
  });
});

describe("Item 7H: clean controls", () => {
  it("a finding with no diversion/disclosure/capital-raising-adjacent tags at all matches none of the scenarios this pass touched", () => {
    const finding = makeFinding({
      recordId: "CLEAN-01",
      transactionTypes: ["derivative_transaction"],
      allegedConduct: ["audit_committee_deficiency"],
    });
    const scenarios = broadScenariosForFinding(finding);
    expect(scenarios.map((s) => s.id)).not.toContain("diversion-siphoning-misutilisation");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-offer-document-misstatement");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-issue-proceeds-deviation-reporting");
    expect(scenarios.map((s) => s.id)).not.toContain("capital-raising-fraudulent-mis-selling");
  });

  it("an empty or unrelated Law Library query matches none of the three new sub-products", () => {
    expect(matchScenariosForQuery("").map((s) => s.id)).toEqual([]);
    const unrelated = matchScenariosForQuery("audit committee composition");
    expect(unrelated.map((s) => s.id)).not.toContain("capital-raising-offer-document-misstatement");
    expect(unrelated.map((s) => s.id)).not.toContain("capital-raising-issue-proceeds-deviation-reporting");
    expect(unrelated.map((s) => s.id)).not.toContain("capital-raising-fraudulent-mis-selling");
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
