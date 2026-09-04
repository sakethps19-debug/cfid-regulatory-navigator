// Guards the processing-stage vocabulary correction: "awaiting_retrieval"
// (no attempt made) and "retrieval_failed" (a genuine, individually
// recorded attempt was made and failed) must never be conflated, and every
// stage the officer asked for must be present with an honest label.
import { describe, expect, it } from "vitest";
import { PROCESSING_STAGE_LABELS, PROCESSING_STAGE_ORDER, PROCESSING_STAGE_SHORT_LABELS } from "@/lib/processingStages";
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
