// Guards the processing-stage vocabulary correction: "awaiting_retrieval"
// (no attempt made) and "retrieval_failed" (a genuine, individually
// recorded attempt was made and failed) must never be conflated, and every
// stage the officer asked for must be present with an honest label.
import { describe, expect, it } from "vitest";
import {
  isDeepAnalyzed,
  isDeepAnalyzedWithFindings,
  PROCESSING_STAGE_LABELS,
  PROCESSING_STAGE_ORDER,
  PROCESSING_STAGE_SHORT_LABELS,
} from "@/lib/processingStages";
import type { ProcessingStage } from "@/types/domain";

const EXPECTED_STAGES: ProcessingStage[] = [
  "indexed",
  "awaiting_retrieval",
  "retrieval_attempted",
  "retrieval_failed",
  "downloaded",
  "text_extracted",
  "scenario_findings_extracted",
  "citations_checked",
  "legally_reviewed",
  "needs_manual_review",
];

describe("processing stage vocabulary", () => {
  it("contains exactly the ten required stages, in the required order", () => {
    expect(PROCESSING_STAGE_ORDER).toEqual(EXPECTED_STAGES);
  });

  it("labels every stage in both the full and short label maps", () => {
    for (const stage of EXPECTED_STAGES) {
      expect(PROCESSING_STAGE_LABELS[stage]).toBeTruthy();
      expect(PROCESSING_STAGE_SHORT_LABELS[stage]).toBeTruthy();
    }
  });

  it("never describes awaiting_retrieval as a failure", () => {
    expect(PROCESSING_STAGE_LABELS.awaiting_retrieval.toLowerCase()).not.toContain("fail");
    expect(PROCESSING_STAGE_SHORT_LABELS.awaiting_retrieval.toLowerCase()).not.toContain("fail");
  });

  it("keeps retrieval_failed's label distinct from awaiting_retrieval's", () => {
    expect(PROCESSING_STAGE_LABELS.retrieval_failed).not.toBe(PROCESSING_STAGE_LABELS.awaiting_retrieval);
    expect(PROCESSING_STAGE_LABELS.retrieval_failed.toLowerCase()).toContain("fail");
  });

  it("has no duplicate short labels across distinct stages", () => {
    const labels = EXPECTED_STAGES.map((s) => PROCESSING_STAGE_SHORT_LABELS[s]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("isDeepAnalyzed", () => {
  // Guards against reintroducing the bug where several pages treated
  // legally_reviewed (human sign-off, expected to sit at 0 for a long time
  // in this pilot) as the only stage with real scenario findings, hiding the
  // citations_checked orders that actually carry the analysis.
  it("is true for citations_checked and legally_reviewed", () => {
    expect(isDeepAnalyzed("citations_checked")).toBe(true);
    expect(isDeepAnalyzed("legally_reviewed")).toBe(true);
  });

  it("is false for every earlier stage", () => {
    const earlierStages: ProcessingStage[] = [
      "indexed",
      "awaiting_retrieval",
      "retrieval_attempted",
      "retrieval_failed",
      "downloaded",
      "text_extracted",
      "scenario_findings_extracted",
      "needs_manual_review",
    ];
    for (const stage of earlierStages) {
      expect(isDeepAnalyzed(stage)).toBe(false);
    }
  });
});

// Pre-demo remediation finding (P0): the Admin Dashboard and "Orders
// Awaiting Analysis" register both asserted "92 of 92 indexed orders have
// been turned into full scenario findings" purely from processing_stage
// (every order in the corpus carries citations_checked or legally_reviewed),
// while a live audit found only 82 of 92 orders actually have a linked
// scenario_findings row -- 10 orders are structured-finding coverage gaps
// despite their pipeline stage reading as complete. isDeepAnalyzedWithFindings
// requires BOTH conditions so this claim can never again be asserted from
// the stage label alone.
describe("isDeepAnalyzedWithFindings", () => {
  it("is true only when the stage is deep-analyzed AND a linked finding actually exists", () => {
    expect(isDeepAnalyzedWithFindings("citations_checked", true)).toBe(true);
    expect(isDeepAnalyzedWithFindings("legally_reviewed", true)).toBe(true);
  });

  it("is false when the stage is deep-analyzed but no finding is linked -- the specific reported defect", () => {
    expect(isDeepAnalyzedWithFindings("citations_checked", false)).toBe(false);
    expect(isDeepAnalyzedWithFindings("legally_reviewed", false)).toBe(false);
  });

  it("is false for an earlier stage regardless of hasLinkedFinding (a finding row should not exist yet, but even if flagged true, the stage itself is not complete)", () => {
    expect(isDeepAnalyzedWithFindings("indexed", true)).toBe(false);
    expect(isDeepAnalyzedWithFindings("text_extracted", true)).toBe(false);
  });
});
