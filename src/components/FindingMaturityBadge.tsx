import { findingMaturityTier, FINDING_MATURITY_EXPLANATION, type FindingMaturityTier } from "@/lib/findingMaturity";
import type { ScenarioFinding } from "@/types/domain";

// Drawn from the consolidated semantic-status tokens in globals.css, same
// palette family as StatusBadge - deliberately distinct from it so the two
// signals (procedural disposition vs. record verification maturity) are
// never visually confusable.
const STYLES: Record<FindingMaturityTier, string> = {
  "Draft / Quarantined": "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] ring-[var(--status-neutral-ring)]",
  "Unverified candidate material": "bg-[var(--status-red-bg)] text-[var(--status-red-text)] ring-[var(--status-red-ring)]",
  "Partially verified": "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  "Source-verified, provision-mapping pending": "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  "Field-verified, human review pending": "bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] ring-[var(--status-blue-ring)]",
  "Human reviewed": "bg-[var(--status-green-bg)] text-[var(--status-green-text)] ring-[var(--status-green-ring)]",
};

/** Surfaces how verified/mature a finding's underlying curated record is -
 * a signal entirely separate from StatusBadge (what the order decided) and
 * LegalReviewBadge (whether a CFID officer has completed a full human
 * legal review). This badge is the more granular record: it distinguishes
 * a fully field-verified-but-not-yet-officer-reviewed finding from one
 * where even the source document or paragraph citation is still
 * unverified, so those two very different states never look the same. */
export function FindingMaturityBadge({ finding }: { finding: ScenarioFinding }) {
  const tier = findingMaturityTier(finding);
  return (
    <span
      title={FINDING_MATURITY_EXPLANATION[tier]}
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[tier]}`}
    >
      {tier}
    </span>
  );
}
