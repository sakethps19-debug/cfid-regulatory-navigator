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

/** "Deep-analyzed" / "turned into full scenario findings" as claimed to an
 * officer (e.g. Admin's "Orders Awaiting Analysis" register, the Admin
 * Dashboard's corpus summary) requires BOTH: isDeepAnalyzed(stage) (the
 * order's own document work is done) AND that the order actually has at
 * least one linked scenario_finding row. A live audit found processing_stage
 * alone is not trustworthy for this claim: every order in the corpus can
 * carry a "citations_checked"/"legally_reviewed" stage while some genuinely
 * have zero linked findings (the same gap
 * getStructuredFindingCoverageGaps()/ProcessingMetrics.
 * ordersContributingStructuredFindings surfaces) -- asserting "deep-analyzed"
 * from the stage label alone previously produced the false "92 of 92 have
 * been turned into full scenario findings" claim when only 82 of 92 orders
 * actually had one. hasLinkedFinding must be computed the same way as
 * ordersContributingStructuredFindings (by actual presence in
 * scenario_findings.order_id/final_order_id), never re-derived differently
 * per call site. */
export function isDeepAnalyzedWithFindings(stage: ProcessingStage, hasLinkedFinding: boolean): boolean {
  return isDeepAnalyzed(stage) && hasLinkedFinding;
}

/** Tailwind ring/background classes per stage, used for status chips. */
export const PROCESSING_STAGE_STYLES: Record<ProcessingStage, string> = {
  indexed: "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)] ring-[var(--color-border)]",
  awaiting_retrieval: "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)] ring-[var(--color-border)]",
  retrieval_attempted: "bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] ring-[var(--status-blue-ring)]",
  retrieval_failed: "bg-[var(--status-red-bg)] text-[var(--status-red-text)] ring-[var(--status-red-ring)]",
  downloaded: "bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] ring-[var(--status-blue-ring)]",
  text_extracted: "bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] ring-[var(--status-blue-ring)]",
  scenario_findings_extracted: "bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] ring-[var(--status-blue-ring)]",
  citations_checked: "bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] ring-[var(--status-blue-ring)]",
  legally_reviewed: "bg-[var(--status-green-bg)] text-[var(--status-green-text)] ring-[var(--status-green-ring)]",
  needs_manual_review: "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
};
