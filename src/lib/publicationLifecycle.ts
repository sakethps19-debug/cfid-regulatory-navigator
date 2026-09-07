import type { PublicationStatus, ScenarioFinding } from "@/types/domain";

/** Publication statuses excluded from ordinary Scenario Analyzer retrieval
 * and from any "searchable findings" count shown to an officer. Draft work
 * is unfinished; Quarantined and Withdrawn findings have been pulled from
 * reliance for a recorded reason. The single source of truth for this set —
 * both the matching engine (engine.ts) and any UI/metrics code that reports
 * a "searchable findings" count must use this, not redefine it locally, so
 * the two can never silently drift apart. */
export const EXCLUDED_PUBLICATION_STATUSES = new Set<PublicationStatus>(["Draft", "Quarantined", "Withdrawn"]);

export function isSearchableFinding(finding: ScenarioFinding): boolean {
  return !EXCLUDED_PUBLICATION_STATUSES.has(finding.publicationStatus);
}

/** Short, export-friendly label for a finding's human_legal_review_completed
 * status — the plain-text counterpart to LegalReviewBadge.tsx, used in the
 * text/CSV exports so the same maturity signal survives outside the app. */
export function legalReviewLabel(reviewed: boolean): string {
  return reviewed ? "legally reviewed" : "review pending";
}
