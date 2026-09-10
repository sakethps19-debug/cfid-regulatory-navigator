// Guards the requirement that a searchable-but-not-legally-reviewed
// finding is visibly labelled wherever it's retrieved, without needing to
// open Admin - and that a legally-reviewed one is clearly marked as such.
// This exercises the actual export path (resultToText / resultToCsv)
// against a real analyzeScenario() result; the on-screen LegalReviewBadge
// component itself isn't rendered here (no component-test harness in this
// repo, see FindingsByStatus.tsx/ScenarioAnalyzerClient.tsx for its call
// sites), but the underlying per-finding fact it displays is proven
// correct here at the data layer.
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import { resultToCsv, resultToText } from "@/components/analyzer/ScenarioAnalyzerClient";
import { legalReviewLabel } from "@/lib/publicationLifecycle";

describe("legalReviewLabel", () => {
  it("distinguishes reviewed from pending", () => {
    expect(legalReviewLabel(true)).toBe("legally reviewed");
    expect(legalReviewLabel(false)).toBe("review pending");
    expect(legalReviewLabel(true)).not.toBe(legalReviewLabel(false));
  });
});

describe("Text export surfaces each precedent's own review status, not only the aggregate", () => {
  it("every supporting/upheld/contrary precedent line carries its own legally-reviewed or review-pending tag", () => {
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests
    );
    expect(result.hasResults).toBe(true);
    const text = resultToText(result);
    // At least one of the two labels must appear per referenced precedent
    // record id, not merely once in an aggregate summary sentence.
    const allRefs = result.provisionResults.flatMap((pr) => [...pr.supportingPrecedents, ...pr.upheldPrecedents, ...pr.contraryPrecedents]);
    expect(allRefs.length).toBeGreaterThan(0);
    for (const ref of allRefs) {
      const lineMatchingRecord = text.split("\n").find((l) => l.includes(ref.finding.recordId) && l.trim().startsWith("-"));
      expect(lineMatchingRecord, `no bullet line found for ${ref.finding.recordId}`).toBeTruthy();
      expect(lineMatchingRecord).toContain(legalReviewLabel(ref.finding.humanLegalReviewCompleted));
    }
  });
});

describe("CSV export surfaces a reviewed-count for supporting precedents per provision", () => {
  it("includes a 'Supporting precedents human-legally-reviewed' column with an accurate X of Y count", () => {
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests
    );
    const csv = resultToCsv(result);
    expect(csv).toContain("Supporting precedents human-legally-reviewed");
    for (const pr of result.provisionResults) {
      const reviewedCount = pr.supportingPrecedents.filter((s) => s.finding.humanLegalReviewCompleted).length;
      expect(csv).toContain(`${reviewedCount} of ${pr.supportingPrecedents.length}`);
    }
  });
});
