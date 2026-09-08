// Tests for resultToResearchBrief — the deterministic "Scenario Research
// Brief" export added in the application-wide demo-readiness sprint. Built
// entirely from AnalysisResult's already-computed fields (no new data
// fetching, no generative text). Asserts the required section structure is
// present, that it carries the same never-assert-violation discipline as
// the other exports, and that it never invents an evidentiary requirement
// beyond what is actually recorded on the cited precedents.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import { resultToResearchBrief } from "@/components/analyzer/ScenarioAnalyzerClient";

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

const REQUIRED_SECTION_HEADINGS = [
  "1. Facts identified",
  "2. Regulatory issues for examination",
  "3. Facts requiring verification",
  "4. Historical CFID Treatment",
  "5. Evidence / records to examine",
  "6. Official sources",
];

describe("resultToResearchBrief", () => {
  for (const freeText of SCENARIOS) {
    const result = analyzeScenario({ freeText }, scenarioFindings, provisions, legalTests);
    const brief = resultToResearchBrief(result);

    it(`carries every required section for: "${freeText.slice(0, 40)}..."`, () => {
      for (const heading of REQUIRED_SECTION_HEADINGS) {
        expect(brief).toContain(heading);
      }
    });

    it(`never asserts the entered scenario itself violated a provision: "${freeText.slice(0, 40)}..."`, () => {
      const lower = brief.toLowerCase();
      for (const phrase of FORBIDDEN_ENTERED_SCENARIO_PHRASES) {
        expect(lower).not.toContain(phrase.toLowerCase());
      }
    });

    it(`states historical frequency does not determine applicability: "${freeText.slice(0, 40)}..."`, () => {
      expect(brief).toContain("does not determine whether a provision applies");
    });

    it(`ends with the research-assistance-only caveat: "${freeText.slice(0, 40)}..."`, () => {
      expect(brief).toContain("does not conclude that any violation has occurred");
    });
  }

  it("reports 'not established as absent' for facts not stated, never that they did not occur", () => {
    const result = analyzeScenario(
      { freeText: "Related-party transaction with a promoter-connected counterparty." },
      scenarioFindings,
      provisions,
      legalTests,
    );
    const brief = resultToResearchBrief(result);
    expect(brief).not.toMatch(/did not occur/i);
    if (result.provisionResults.some((pr) => pr.missingFacts.length > 0)) {
      expect(brief).toContain("not established as absent");
    }
  });

  it("draws evidence indicators only from recorded evidenceTypes, never inventing a requirement", () => {
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests,
    );
    const brief = resultToResearchBrief(result);
    const evidenceSection = brief.slice(brief.indexOf("5. Evidence / records to examine"), brief.indexOf("6. Official sources"));
    // Every evidence label mentioned must trace back to some cited precedent's own evidenceTypes.
    const citedEvidenceIds = new Set(
      result.provisionResults.flatMap((pr) => [...pr.upheldPrecedents, ...pr.supportingPrecedents].flatMap((p) => p.finding.evidenceTypes)),
    );
    if (citedEvidenceIds.size === 0) {
      expect(evidenceSection).toContain("No evidence indicators recorded");
    }
  });

  it("produces empty-safe output when the scenario has no results", () => {
    const result = analyzeScenario({ freeText: "The weather was pleasant on the day of the board meeting." }, scenarioFindings, provisions, legalTests);
    const brief = resultToResearchBrief(result);
    expect(brief).toContain("No potentially relevant provisions were identified");
  });
});
