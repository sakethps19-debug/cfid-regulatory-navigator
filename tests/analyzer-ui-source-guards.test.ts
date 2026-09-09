// Task 3/2 (pre-demo correction sprint) source-level regression guards.
// This repo has no React component-render test harness (no
// @testing-library/jsdom setup), so these guard the two structural UI
// requirements the mandate specifies by inspecting the component's own
// source text — a reasonable substitute for a DOM assertion given the
// existing test infrastructure, and still a real regression guard against
// the dropdown or its request-payload wiring silently reappearing.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(new URL("../src/components/analyzer/ScenarioAnalyzerClient.tsx", import.meta.url), "utf-8");

describe("Scenario Analyzer: Evidence Indicator removed as officer input", () => {
  it("no longer renders an Evidence Indicator dropdown/label as an input control", () => {
    expect(SOURCE).not.toMatch(/Evidence indicator \(optional\)/);
    expect(SOURCE).not.toContain('id="evidenceSignal"');
  });

  it("no longer holds Analyzer-input evidenceSignal state or sends it in the analyze request", () => {
    expect(SOURCE).not.toMatch(/const \[evidenceSignal, setEvidenceSignal\]/);
    expect(SOURCE).not.toMatch(/body:\s*JSON\.stringify\(\{[^}]*evidenceSignal/);
  });

  it("does not tell the officer evidence was 'not stated' as an Analyzer completeness warning", () => {
    expect(SOURCE).not.toMatch(/evidenceSignal &&/);
  });

  it("still retains evidence metadata rendering for precedent detail (evidence remains supporting precedent metadata, not deleted)", () => {
    expect(SOURCE).toContain("EVIDENCE_OPTIONS");
    expect(SOURCE).toContain("Matched evidence indicators");
  });
});

describe("Scenario Analyzer: Indicative Regulatory Assessment is the first substantive result", () => {
  it("the Indicative Regulatory Assessment block appears before the framework-grouped provision results, gate-blocked results, and Historical Treatment in the results JSX", () => {
    const indicativeIdx = SOURCE.indexOf("Indicative Regulatory Assessment");
    const frameworkGroupsIdx = SOURCE.indexOf("frameworkGroups.map");
    const gateBlockedIdx = SOURCE.indexOf("results-historical");
    expect(indicativeIdx).toBeGreaterThan(-1);
    expect(frameworkGroupsIdx).toBeGreaterThan(-1);
    expect(gateBlockedIdx).toBeGreaterThan(-1);
    expect(indicativeIdx).toBeLessThan(frameworkGroupsIdx);
    expect(indicativeIdx).toBeLessThan(gateBlockedIdx);
  });

  it("renders the compact count summary line immediately after the paragraph", () => {
    expect(SOURCE).toMatch(/Potentially relevant provisions: \{indicativeAssessment\.primaryCount\} primary \| \{indicativeAssessment\.relatedAncillaryCount\} related\/ancillary \|/);
  });
});
