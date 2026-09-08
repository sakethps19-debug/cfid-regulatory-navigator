import type { CandidateTier } from "@/lib/matching/types";
import { LEGAL_FUNCTION_LABELS, type LegalFunctionCategory } from "@/data/curated/legal-function-classification";

// Deterministic-engine completion pass: makes the candidate hierarchy and
// legal-function taxonomy visible on every provision card, so a penalty
// provision, a bare definition, a general principle, a liability-attribution
// mechanism and a substantive prohibition never read as equivalent
// candidate violations — see CandidateTier/LegalFunctionCategory.
const TIER_LABELS: Record<CandidateTier, string> = {
  primary_candidate: "Primary candidate",
  related_ancillary: "Related / ancillary",
  requires_additional_fact: "Requires additional fact",
  historical_precedent_only: "Historical precedent only",
};

const TIER_STYLES: Record<CandidateTier, string> = {
  primary_candidate: "bg-[var(--color-navy-900)] text-white ring-[var(--color-navy-900)]",
  related_ancillary: "bg-transparent text-[var(--color-ink-700)] ring-[var(--color-border)]",
  requires_additional_fact: "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  historical_precedent_only: "bg-transparent text-[var(--color-ink-500)] ring-[var(--color-border)]",
};

export function CandidateTierBadge({ tier }: { tier: CandidateTier }) {
  return (
    <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TIER_STYLES[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

export function LegalFunctionTag({ legalFunction }: { legalFunction: LegalFunctionCategory }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-[var(--color-neutral-50)] px-2 py-0.5 text-xs text-[var(--color-ink-500)] ring-1 ring-inset ring-[var(--color-border)]">
      {LEGAL_FUNCTION_LABELS[legalFunction]}
    </span>
  );
}
