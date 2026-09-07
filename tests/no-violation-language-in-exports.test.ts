// Guards against the exact defect flagged in the correctness-review pass:
// the Scenario Analyzer's text/CSV exports and on-screen summary once
// stated "Potential regulatory framework(s) violated" / "the entity has,
// prima facie, potentially violated X" for the ENTERED (present) scenario -
// language too strong for an engine that only performs deterministic
// factual-similarity retrieval. This runs a real analyzeScenario() result
// through the actual export functions and asserts none of that language
// survives, while historical-precedent language (which legitimately
// reports a curated finding's own recorded outcome, e.g. "Confirmed in
// Final Order") is untouched.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import { resultToCsv, resultToText } from "@/components/analyzer/ScenarioAnalyzerClient";

// Phrases that would assert the ENTERED scenario itself violated,
// contravened, or established a violation - as opposed to a historical
// order's own recorded outcome, which legitimately uses "Confirmed in
// Final Order" / "Not Confirmed in Final Order" language.
const FORBIDDEN_ENTERED_SCENARIO_PHRASES = [
  "the entity has, prima facie, potentially violated",
  "the entity has violated",
  "has definitely violated",
  "framework(s) violated",
  "regulatory framework violated",
  "regulatory frameworks violated",
  "committed fraud",
  "is guilty",
  "is liable",
  "established a violation",
  "the entity has contravened",
];

const SCENARIOS = [
  "Fictitious sales and assets disclosed through financial statements.",
  "Preferential allotment allegedly financed through circular transactions, but loans are recorded in audited accounts, third parties were not examined and sale proceeds remain with the allottees.",
  "Audit Committee not properly constituted or meetings not conducted.",
  "Company funds routed through a promoter's personal bank account.",
];

describe("Exports never assert the entered scenario itself violated a provision", () => {
  for (const freeText of SCENARIOS) {
    const result = analyzeScenario({ freeText }, scenarioFindings, provisions, legalTests);

    it(`text export is clean for: "${freeText.slice(0, 40)}..."`, () => {
      expect(result.hasResults).toBe(true);
      const text = resultToText(result).toLowerCase();
      for (const phrase of FORBIDDEN_ENTERED_SCENARIO_PHRASES) {
        expect(text).not.toContain(phrase.toLowerCase());
      }
    });

    it(`CSV export is clean for: "${freeText.slice(0, 40)}..."`, () => {
      const csv = resultToCsv(result).toLowerCase();
      for (const phrase of FORBIDDEN_ENTERED_SCENARIO_PHRASES) {
        expect(csv).not.toContain(phrase.toLowerCase());
      }
    });
  }

  it("the text export carries the required qualified framing when provisions are cited", () => {
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests
    );
    const text = resultToText(result);
    expect(text).toContain("may warrant examination");
    expect(text).toContain("does not indicate that the ingredients of any violation have been established");
  });

  it("historical precedent outcome language (Confirmed/Not Confirmed in Final Order) is preserved, not weakened", () => {
    const result = analyzeScenario(
      {
        freeText:
          "Preferential allotment allegedly financed through circular transactions, but loans are recorded in audited accounts, third parties were not examined and sale proceeds remain with the allottees.",
      },
      scenarioFindings,
      provisions,
      legalTests
    );
    const text = resultToText(result);
    expect(text.toLowerCase()).toContain("final order · not confirmed");
  });
});
