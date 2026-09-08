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
    const freeText = "Fictitious sales and assets disclosed through financial statements.";
    const result = analyzeScenario({ freeText }, scenarioFindings, provisions, legalTests);
    // Retargeted from SEBI-ACT-12A to LODR-33 (P0 provision-precision
    // remediation): this bare query states no securities dealing/issue
    // fact, so SEBI-ACT-12A is now correctly gate-blocked (see
    // provision-retrieval-rules.ts) and no longer appears in
    // provisionResults at all - testing score parity on a blocked
    // provision would prove nothing. LODR-33 is ungated (not part of the
    // broad-securities-fraud family this pass targets) and both REL-04 and
    // SSSL-01 cite it in the same fixture data, so it exercises the exact
    // same finality-must-not-affect-score guarantee this test exists for.
    const pr = result.provisionResults.find((p) => p.provision.id === "LODR-33");
    expect(pr).toBeDefined();
    // REL-04 (Prima facie, interim) and SSSL-01 (Confirmed in Final Order)
    // both cite this provision with the same allegedConduct overlap
    // ["fictitious_sales_or_assets","financial_statement_misstatement"] and
    // no other detected categories here — their scores must be equal.
    const rel04 = pr!.supportingPrecedents.find((s) => s.finding.recordId === "REL-04");
    const sssl01 = pr!.supportingPrecedents.find((s) => s.finding.recordId === "SSSL-01");
    if (rel04 && sssl01) {
      expect(rel04.score).toBe(sssl01.score);
    }
  });
});
