// P2-19: full-text-supplemental findings (Postgres full-text search results
// the deterministic tag-based engine did not itself surface) must be fully
// traceable in BOTH exports, exactly like deterministic matches - record
// id, status, human-review state, verification-maturity state, paragraph
// reference and source - and must be visibly labelled as a full-text-only
// match, never presented as if it were a scored/ranked deterministic
// result. Before this, resultToText/resultToCsv omitted
// fullTextSupplementalFindings entirely, so exporting an analysis silently
// dropped them relative to what was shown on screen.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import { resultToCsv, resultToText } from "@/components/analyzer/ScenarioAnalyzerClient";

describe("full-text supplemental findings are traceable in both exports", () => {
  it("resultToText includes the decoy full-text finding, its status/review/maturity state, paragraph reference and source", () => {
    const decoyFinding = { ...scenarioFindings[0], recordId: "DECOY-TRACE-01" };
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests,
      new Map(),
      [decoyFinding]
    );
    expect(result.fullTextSupplementalFindings.map((f) => f.recordId)).toContain("DECOY-TRACE-01");

    const text = resultToText(result);
    expect(text).toContain("Also worth reviewing (full-text match only");
    expect(text).toContain("DECOY-TRACE-01");
    expect(text).toContain(decoyFinding.officialSourceUrl);
  });

  it("resultToCsv includes a distinctly row-typed entry for the decoy full-text finding, with its record id preserved", () => {
    const decoyFinding = { ...scenarioFindings[0], recordId: "DECOY-TRACE-02" };
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests,
      new Map(),
      [decoyFinding]
    );
    const csv = resultToCsv(result);
    expect(csv).toContain("Full-text match only");
    expect(csv).toContain("DECOY-TRACE-02");
  });
});
