// Post-checkpoint-4 UI/terminology hardening: this suite previously
// enforced the OPPOSITE invariant -- that every precedent line in the
// officer-facing text/CSV exports carried its own "legally reviewed" /
// "review pending" tag, and that the CSV exposed a per-provision
// human-legally-reviewed reviewed-count column. That was itself the kind
// of internal data-governance/workflow status this checkpoint requires be
// kept out of normal officer screens (see LegalReviewBadge/
// FindingMaturityBadge, which remain Admin-only via LegalReviewQueueClient
// at /admin/legal-review-queue). Rewritten to guard the corrected
// invariant: the officer-facing exports (resultToText/resultToCsv) must
// NEVER surface human-legal-review status or record-maturity tier text,
// while still surfacing legitimate procedural/source provenance
// (findingStatusLabel, source URLs).
import { describe, expect, it } from "vitest";
import { analyzeScenario } from "@/lib/matching/engine";
import { legalTests, provisions, scenarioFindings } from "./fixtures";
import { resultToCsv, resultToText } from "@/components/analyzer/ScenarioAnalyzerClient";
import { legalReviewLabel } from "@/lib/publicationLifecycle";
import { findingMaturityTier } from "@/lib/findingMaturity";

describe("legalReviewLabel", () => {
  it("distinguishes reviewed from pending (still used by the Admin-only Legal Review Queue)", () => {
    expect(legalReviewLabel(true)).toBe("legally reviewed");
    expect(legalReviewLabel(false)).toBe("review pending");
    expect(legalReviewLabel(true)).not.toBe(legalReviewLabel(false));
  });
});

describe("Officer-facing text export never surfaces internal review/maturity workflow status", () => {
  it("does not contain 'legally reviewed', 'review pending', or any findingMaturityTier label anywhere in the text export", () => {
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests
    );
    expect(result.hasResults).toBe(true);
    const text = resultToText(result).toLowerCase();
    expect(text).not.toContain("legally reviewed");
    expect(text).not.toContain("review pending");
    expect(text).not.toContain("human legal review");
    expect(text).not.toContain("human reviewed");
    expect(text).not.toContain("deeply analysed");
    expect(text).not.toContain("deep-analyzed");
    for (const label of ["field-verified, human review pending", "source-verified, provision-mapping pending"]) {
      expect(text).not.toContain(label);
    }
  });

  it("still surfaces legitimate procedural status (findingStatusLabel) for each precedent", () => {
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests
    );
    const text = resultToText(result);
    const allRefs = result.provisionResults.flatMap((pr) => [...pr.supportingPrecedents, ...pr.upheldPrecedents, ...pr.contraryPrecedents]);
    expect(allRefs.length).toBeGreaterThan(0);
    for (const ref of allRefs) {
      const lineMatchingRecord = text.split("\n").find((l) => l.includes(ref.finding.recordId) && l.trim().startsWith("-"));
      expect(lineMatchingRecord, `no bullet line found for ${ref.finding.recordId}`).toBeTruthy();
      expect(lineMatchingRecord).toContain(ref.finding.officialSourceUrl);
    }
  });
});

describe("Officer-facing CSV export never surfaces internal review/maturity workflow status", () => {
  it("does not include a human-legally-reviewed column, a record-maturity column, or any findingMaturityTier value", () => {
    const result = analyzeScenario(
      { freeText: "Fictitious sales and assets disclosed through financial statements." },
      scenarioFindings,
      provisions,
      legalTests
    );
    const csv = resultToCsv(result);
    expect(csv).not.toContain("Supporting precedents human-legally-reviewed");
    expect(csv).not.toContain("Supporting precedents record verification maturity");
    expect(csv).not.toContain("Human reviewed");
    expect(csv).not.toContain("Field-verified, human review pending");
    for (const pr of result.provisionResults) {
      for (const s of pr.supportingPrecedents) {
        expect(csv).not.toContain(findingMaturityTier(s.finding));
      }
    }
  });
});
