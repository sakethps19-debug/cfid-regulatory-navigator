// Guards the presentation-layer rename from "High/Medium/Low retrieval
// confidence" to "Strong/Moderate/Limited factual overlap" — the internal
// ConfidenceLevel score/enum is unchanged (see confidence-tiering.test.ts
// and unresolved-status-confidence.test.ts, which test that scoring
// directly), this only guards how it is presented so it can't be mistaken
// for an assessment of legal likelihood.
import { describe, expect, it } from "vitest";
import { matchStrengthLabel, MATCH_STRENGTH_EXPLAINER } from "@/lib/matchStrengthDisplay";
import type { ConfidenceLevel } from "@/lib/matching/types";

describe("matchStrengthLabel", () => {
  it("never renders the word 'confidence' in any label", () => {
    const levels: ConfidenceLevel[] = ["High", "Medium", "Low"];
    for (const level of levels) {
      expect(matchStrengthLabel(level).toLowerCase()).not.toContain("confidence");
    }
  });

  it("maps to the required Strong/Moderate/Limited factual-overlap labels", () => {
    expect(matchStrengthLabel("High")).toBe("Strong factual overlap");
    expect(matchStrengthLabel("Medium")).toBe("Moderate factual overlap");
    expect(matchStrengthLabel("Low")).toBe("Limited factual overlap");
  });

  it("the explainer clarifies factual overlap is not likelihood of violation", () => {
    expect(MATCH_STRENGTH_EXPLAINER.toLowerCase()).toContain("factual overlap");
    expect(MATCH_STRENGTH_EXPLAINER.toLowerCase()).toContain("not the likelihood");
  });
});
