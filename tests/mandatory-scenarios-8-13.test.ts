// Completes the 13-named-scenario coverage begun in matching-engine.test.ts
// (which already covers scenarios 1-7, numbered against section 27 of the
// consolidated correctness-review prompt). See docs/mandatory-scenario-audit.md
// for the full audit matrix, including the two scenarios (11 and 12) whose
// available curated data only partially or newly supports a clean test, and
// why.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import { auditorNegligenceFinding, extendedScenarioFindings } from "./fixtures-extended";
import type { AnalysisResult } from "@/lib/matching/types";

function run(findings: typeof scenarioFindings, freeText: string): AnalysisResult {
  return analyzeScenario({ freeText }, findings, provisions, legalTests);
}

function allRecordIds(result: AnalysisResult): string[] {
  const ids: string[] = [];
  for (const pr of result.provisionResults) {
    ids.push(...pr.supportingPrecedents.map((p) => p.finding.recordId));
    ids.push(...pr.contraryPrecedents.map((p) => p.finding.recordId));
    ids.push(...pr.upheldPrecedents.map((p) => p.finding.recordId));
  }
  // Question-A polarity correction pass: see matching-engine.test.ts's own
  // copy of this helper for why the two new arrays are included here too.
  for (const gp of result.governingProvisionResults) ids.push(...gp.relatedPrecedents.map((p) => p.finding.recordId));
  for (const cp of result.contradictedProvisionResults) ids.push(...cp.relatedPrecedents.map((p) => p.finding.recordId));
  ids.push(...result.globalContraryPrecedents.map((p) => p.finding.recordId));
  return ids;
}

describe("Mandatory scenario 8: related-party non-disclosure", () => {
  it("retrieves the SSSL-08 precedent", () => {
    const result = run(
      scenarioFindings,
      "A related-party transaction with a counterparty connected to the promoter was not disclosed in the related-party register and was misrepresented as an arm's-length dealing."
    );
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("SSSL-08");
  });
});

describe("Mandatory scenario 9: false corporate announcements", () => {
  it("retrieves the SSSL-07 precedent", () => {
    const result = run(
      scenarioFindings,
      "The company made a stock exchange announcement about an intended acquisition and projected turnover that turned out to be unsubstantiated, with no supporting documentation for the claims made in the announcement."
    );
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("SSSL-07");
  });
});

describe("Mandatory scenario 10: false CEO/CFO certification", () => {
  it("retrieves the SSSL-16 precedent", () => {
    // Checkpoint correction B: the query must itself state the adverse
    // fact (a false certification), not merely the surrounding topic/actor
    // facts — "signed the compliance certificate ... despite being aware"
    // detects no conduct-kind concept at all (see detectConcepts), so
    // SSSL-16 previously surfaced only via LODR-17-8's own ungated
    // precedent-conduct-overlap fallback, exactly the leakage that
    // correction removes. "signed a false compliance certificate" is the
    // curated vocabulary's own phrase for the same allegation.
    const result = run(
      scenarioFindings,
      "The Managing Director signed a false compliance certificate to the board despite being aware that the financial statements did not present a true and fair view."
    );
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("SSSL-16");
  });
});

describe("Mandatory scenario 11: director non-cooperation with the investigation", () => {
  // The pilot fixture set's only "non-cooperation with investigation"
  // record (REL-03) is curated with actorRoles: ["company"], not a named
  // director role - see docs/mandatory-scenario-audit.md for why this is a
  // genuine, disclosed data-completeness gap rather than an engine defect,
  // and for the live corpus's own director-specific example (ZEE-PLEDGE-02,
  // not present in this fast fixture set).
  it("retrieves the REL-03 non-cooperation precedent on the shared conduct/transaction overlap", () => {
    const result = run(
      scenarioFindings,
      "The company and its directors failed to cooperate with the investigation, giving contradictory and incomplete submissions and not producing complete information despite repeated summons."
    );
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("REL-03");
  });
});

describe("Mandatory scenario 12: auditor negligence", () => {
  // Requires the extended fixture set (tests/fixtures-extended.ts): the
  // pilot fixture set alone has no statutory-auditor-actor record.
  it("retrieves the ARL-AUD-01 precedent", () => {
    const result = run(
      extendedScenarioFindings,
      "The statutory auditor certified the company's financial statements for several years despite inflated sales and profits from circular transactions with connected entities that were never detected."
    );
    expect(result.hasResults).toBe(true);
    expect(allRecordIds(result)).toContain("ARL-AUD-01");
  });

  it("does not overstate the auditor's liability beyond the curated finding status", () => {
    // Isolated to [auditorNegligenceFinding] alone, not the full
    // extendedScenarioFindings corpus (P0 provision-precision remediation):
    // gateBlockedProvisionResults.relatedFactualPrecedents is capped at the
    // top 3 highest-scoring findings for that provision, same as
    // provisionResults/contraryOnlyProvisionResults elsewhere - against the
    // full corpus, SSSL-01/REL-02/REL-12 (which also cite SEBI-ACT-12A and
    // score higher on this query) fill that cap before ARL-AUD-01 does.
    // What this test actually needs to guard - that ARL-AUD-01's own status
    // is preserved, un-upgraded - does not depend on it competing against
    // the rest of the corpus, so isolating it removes that incidental
    // dependency entirely.
    const result = run(
      [auditorNegligenceFinding],
      "The statutory auditor certified the company's financial statements for several years despite inflated sales and profits from circular transactions with connected entities that were never detected."
    );
    // Retargeted from provisionResults to gateBlockedProvisionResults (P0
    // provision-precision remediation): ARL-AUD-01's only link is to
    // SEBI-ACT-12A, and this query states no securities dealing/issue fact
    // (only accounting misstatement and internal circular transactions) -
    // fitting, since the real order's own finding is that the PFUTP/12A
    // fraud connection against the auditor specifically was NOT sustained
    // for want of evidence of connivance. SEBI-ACT-12A is now correctly
    // gate-blocked for this query rather than shown in provisionResults;
    // the related factual precedent is still surfaced (see
    // AnalysisResult.gateBlockedProvisionResults), and its true, un-upgraded
    // status is what this test actually needs to guard.
    const arlRef = result.gateBlockedProvisionResults
      .flatMap((gb) => gb.relatedFactualPrecedents)
      .find((p) => p.finding.recordId === "ARL-AUD-01");
    expect(arlRef).toBeDefined();
    // The curated finding status is "Not Confirmed in Final Order" (the
    // PFUTP fraud charge against the auditor was not sustained, even though
    // gross negligence was separately found) - the engine must present that
    // status as-is, never upgrade it to a confirmed/upheld outcome.
    expect(arlRef?.finding.findingStatus).toBe("Not Confirmed in Final Order");
  });
});

describe("Mandatory scenario 13: price/market manipulation where supported by the corpus", () => {
  // REL-12, REL-02, REL-04 and SSSL-01 all carry the identical
  // allegedConduct pairing ["price_manipulation_nexus",
  // "financial_statement_misstatement"] that this scenario's facts detect,
  // so they score-tie at this query's detected-concept overlap; the
  // top-3-per-provision cap in engine.ts (supporting.slice(0, 3)) then keeps
  // whichever three happen to sort first (SSSL-01 wins outright on its
  // Confirmed-in-Final-Order multiplier; REL-02/REL-04 win the tie over
  // REL-12 on fixture array order alone). See
  // docs/mandatory-scenario-audit.md scenario 13 for why this asserts the
  // price-manipulation-nexus concept class rather than one specific record.
  it("retrieves at least one price/market-manipulation-nexus precedent", () => {
    const result = run(
      scenarioFindings,
      "The misleading financial picture created by the misstatements distorted price discovery and induced investors to trade at prices not reflective of the company's true position."
    );
    expect(result.hasResults).toBe(true);
    const ids = allRecordIds(result);
    expect(ids.some((id) => ["REL-12", "REL-02", "REL-04", "SSSL-01"].includes(id))).toBe(true);
  });
});
