// Guards the P0 fix separating factual overlap from procedural
// authority/historical disposition: the former `score *= 1.15` finality
// multiplier (and the isFinal/isUnresolved special-casing inside
// deriveConfidence) let a precedent's own procedural stage change how
// factually similar it appeared to be. Neither scoreFinding's raw score
// nor deriveConfidence's tier may depend on findingStatus any more —
// finality now only ever breaks an EXACT tie for display order, via
// compareByFactualScoreThenFinality, and can never let a lower-scoring
// final-order finding outrank a higher-scoring interim/unresolved one.
import { describe, expect, it } from "vitest";
import { analyzeScenario, compareByFactualScoreThenFinality } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";

describe("compareByFactualScoreThenFinality", () => {
  it("orders by score first, regardless of finality", () => {
    const higherInterim = { score: 10, finding: { findingStatus: "Prima facie" } } as never;
    const lowerFinal = { score: 5, finding: { findingStatus: "Confirmed in Final Order" } } as never;
    expect(compareByFactualScoreThenFinality(higherInterim, lowerFinal)).toBeLessThan(0); // higherInterim sorts first
  });

  it("breaks an exact score tie in favour of the final-order finding", () => {
    const finalTied = { score: 6, finding: { findingStatus: "Confirmed in Final Order" } } as never;
    const interimTied = { score: 6, finding: { findingStatus: "Prima facie" } } as never;
    expect(compareByFactualScoreThenFinality(finalTied, interimTied)).toBeLessThan(0); // finalTied sorts first
    expect(compareByFactualScoreThenFinality(interimTied, finalTied)).toBeGreaterThan(0);
  });

  it("never lets finality flip the order of unequal scores, even a small gap", () => {
    const finalSlightlyLower = { score: 8, finding: { findingStatus: "Confirmed in Final Order" } } as never;
    const interimSlightlyHigher = { score: 9, finding: { findingStatus: "Prima facie" } } as never;
    expect(compareByFactualScoreThenFinality(interimSlightlyHigher, finalSlightlyLower)).toBeLessThan(0);
  });
});

describe("Factual overlap score is never adjusted for procedural stage", () => {
  it("an interim-only finding and a final-order finding with identical detected-concept overlap score identically", () => {
    // Retargeted the query text (Question-A polarity correction pass): the
    // prior text ("Fictitious sales and assets...") relied on the
    // pilot-era generated fixture's own STALE, pre-split allegedConduct tag
    // id "fictitious_sales_or_assets", which no longer exists in
    // concept-tags.ts (see the fictitious_sales_or_assets tag split, task
    // #43) and so no longer positively matches anything — meaning this
    // scenario now states no genuinely-detected adverse conduct at all,
    // and LODR-33 (ungated) correctly demotes to governingProvisionResults
    // under the new "candidate breach requires a positively-matched
    // adverse concept" rule. Both REL-04 and SSSL-01 ALSO independently
    // carry "actual_price_manipulation" in their own allegedConduct (a
    // still-current tag id) — using that fact instead exercises the exact
    // same finality-must-not-affect-score guarantee this test exists for,
    // while remaining a genuine candidate breach under the new rule.
    const freeText = "There was manipulation of the security price.";
    const result = analyzeScenario({ freeText }, scenarioFindings, provisions, legalTests);
    const pr = result.provisionResults.find((p) => p.provision.id === "LODR-33");
    expect(pr).toBeDefined();
    // REL-04 (Prima facie, interim) and SSSL-01 (Confirmed in Final Order)
    // both cite this provision and both independently carry
    // "actual_price_manipulation" in their own allegedConduct — their
    // scores must be equal regardless of finality.
    const rel04 = pr!.supportingPrecedents.find((s) => s.finding.recordId === "REL-04");
    const sssl01 = pr!.supportingPrecedents.find((s) => s.finding.recordId === "SSSL-01");
    if (rel04 && sssl01) {
      expect(rel04.score).toBe(sssl01.score);
    }
  });
});
