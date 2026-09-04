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

/** Tailwind ring/background classes per stage, used for status chips. */
export const PROCESSING_STAGE_STYLES: Record<ProcessingStage, string> = {
  indexed: "bg-slate-100 text-slate-600 ring-slate-300",
  awaiting_retrieval: "bg-slate-100 text-slate-600 ring-slate-300",
  retrieval_attempted: "bg-sky-100 text-sky-800 ring-sky-300",
  retrieval_failed: "bg-rose-100 text-rose-800 ring-rose-300",
  downloaded: "bg-sky-100 text-sky-800 ring-sky-300",
  text_extracted: "bg-sky-100 text-sky-800 ring-sky-300",
  scenario_findings_extracted: "bg-sky-100 text-sky-800 ring-sky-300",
  citations_checked: "bg-sky-100 text-sky-800 ring-sky-300",
  legally_reviewed: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  needs_manual_review: "bg-amber-100 text-amber-800 ring-amber-300",
};
