// Single source of truth for processing_stage display order and labels.
// Both the Admin Processing Dashboard and the Case Library filter chips
// import from here, so the two can never drift apart or reintroduce a
// mislabeled stage. See src/types/domain.ts for why awaiting_retrieval and
// retrieval_failed must never be conflated.
import type { ProcessingStage } from "@/types/domain";

export const PROCESSING_STAGE_ORDER: ProcessingStage[] = [
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

export const PROCESSING_STAGE_LABELS: Record<ProcessingStage, string> = {
  indexed: "Indexed only",
  awaiting_retrieval: "Awaiting retrieval",
  retrieval_attempted: "Retrieval attempted",
  retrieval_failed: "Retrieval failed",
  downloaded: "Downloaded",
  text_extracted: "Text extracted",
  scenario_findings_extracted: "Scenario findings extracted",
  citations_checked: "Citations checked",
  legally_reviewed: "Legally reviewed (deep-analyzed)",
  needs_manual_review: "Needs manual review",
};

/** Short label used on compact chips/badges (e.g. Case Library filters),
 * distinct from the fuller PROCESSING_STAGE_LABELS used as descriptive text. */
export const PROCESSING_STAGE_SHORT_LABELS: Record<ProcessingStage, string> = {
  indexed: "Indexed only",
  awaiting_retrieval: "Awaiting retrieval",
  retrieval_attempted: "Retrieval attempted",
  retrieval_failed: "Retrieval failed",
  downloaded: "Downloaded",
  text_extracted: "Text extracted",
  scenario_findings_extracted: "Scenario findings extracted",
  citations_checked: "Citations checked",
  legally_reviewed: "Legally reviewed",
  needs_manual_review: "Needs manual review",
};

/** An order counts as "deeply analysed" once it has been broken down into
 * scenario findings with paragraph citations — i.e. citations_checked or
 * legally_reviewed. legally_reviewed is a further, distinct stage reserved
 * for actual human/CFID-officer sign-off; it is not a precondition for
 * deep analysis, and every "deep analysed" / "scenario findings" surface in
 * this app must use this helper rather than checking legally_reviewed alone,
 * so they can never drift back out of sync. */
export function isDeepAnalyzed(stage: ProcessingStage): boolean {
  return stage === "citations_checked" || stage === "legally_reviewed";
}

/** Tailwind ring/background classes per stage, used for status chips. */
export const PROCESSING_STAGE_STYLES: Record<ProcessingStage, string> = {
  indexed: "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)] ring-[var(--color-border)]",
  awaiting_retrieval: "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)] ring-[var(--color-border)]",
  retrieval_attempted: "bg-[#e2ecee] text-[#1c4a56] ring-[#a3c6cd]",
  retrieval_failed: "bg-[#f1e3df] text-[#7a2a1f] ring-[#dcaa9a]",
  downloaded: "bg-[#e2ecee] text-[#1c4a56] ring-[#a3c6cd]",
  text_extracted: "bg-[#e2ecee] text-[#1c4a56] ring-[#a3c6cd]",
  scenario_findings_extracted: "bg-[#e2ecee] text-[#1c4a56] ring-[#a3c6cd]",
  citations_checked: "bg-[#e2ecee] text-[#1c4a56] ring-[#a3c6cd]",
  legally_reviewed: "bg-[#e6ede3] text-[#204a2e] ring-[#a9c2a0]",
  needs_manual_review: "bg-[#f5ecd9] text-[#7a5310] ring-[#dfc98f]",
};
