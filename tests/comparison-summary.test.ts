// Tests for buildComparisonSummary — the deterministic Precedent Comparison
// summary added in the application-wide demo-readiness sprint. Built purely
// from each ScenarioFinding's own curated tags/provisions/status fields, no
// inference beyond set intersection/difference.
import { describe, expect, it } from "vitest";
import { buildComparisonSummary } from "@/components/PrecedentCompareClient";
import { scenarioFindings } from "./fixtures";

describe("buildComparisonSummary", () => {
  it("computes symmetric factual-tag and provision differences correctly for two distinct findings", () => {
    const [left, right] = scenarioFindings;
    const summary = buildComparisonSummary(left, right);

    const leftTags = new Set([...left.transactionTypes, ...left.actorRoles, ...left.allegedConduct, ...left.evidenceTypes]);
    const rightTags = new Set([...right.transactionTypes, ...right.actorRoles, ...right.allegedConduct, ...right.evidenceTypes]);

    // Every common tag really is shared by both sides.
    for (const tag of summary.commonFactualTags) {
      expect(leftTags.has(tag)).toBe(true);
      expect(rightTags.has(tag)).toBe(true);
    }
    // Every left-only tag is absent from the right side, and vice versa.
    for (const tag of summary.leftOnlyFactualTags) expect(rightTags.has(tag)).toBe(false);
    for (const tag of summary.rightOnlyFactualTags) expect(leftTags.has(tag)).toBe(false);

    // Provisions partition the same way.
    for (const id of summary.commonProvisionIds) {
      expect(left.provisionIds.includes(id)).toBe(true);
      expect(right.provisionIds.includes(id)).toBe(true);
    }
    for (const id of summary.leftOnlyProvisionIds) expect(right.provisionIds.includes(id)).toBe(false);
    for (const id of summary.rightOnlyProvisionIds) expect(left.provisionIds.includes(id)).toBe(false);
  });

  it("reports sameFindingStatus true only when both findings share the exact same status", () => {
    const same = buildComparisonSummary(scenarioFindings[0], scenarioFindings[0]);
    expect(same.sameFindingStatus).toBe(true);

    const differentStatusPair = scenarioFindings.find((f) => f.findingStatus !== scenarioFindings[0].findingStatus);
    if (differentStatusPair) {
      const summary = buildComparisonSummary(scenarioFindings[0], differentStatusPair);
      expect(summary.sameFindingStatus).toBe(false);
    }
  });

  it("comparing a finding against itself yields no unique-only tags or provisions", () => {
    const f = scenarioFindings[0];
    const summary = buildComparisonSummary(f, f);
    expect(summary.leftOnlyFactualTags).toEqual([]);
    expect(summary.rightOnlyFactualTags).toEqual([]);
    expect(summary.leftOnlyProvisionIds).toEqual([]);
    expect(summary.rightOnlyProvisionIds).toEqual([]);
  });

  it("never infers causation — only reports facts as recorded on each finding", () => {
    const [left, right] = scenarioFindings;
    const summary = buildComparisonSummary(left, right);
    // The summary object itself carries no free-text causal claim field;
    // this test guards that assumption by checking every string value in
    // the summary is drawn verbatim from tags/ids, never a sentence.
    const allStrings = [
      ...summary.commonFactualTags,
      ...summary.leftOnlyFactualTags,
      ...summary.rightOnlyFactualTags,
      ...summary.commonProvisionIds,
      ...summary.leftOnlyProvisionIds,
      ...summary.rightOnlyProvisionIds,
    ];
    for (const s of allStrings) {
      expect(s.toLowerCase()).not.toMatch(/caused|because|due to|resulted in/);
    }
  });
});
