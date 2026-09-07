/** Surfaces a finding's human_legal_review_completed status wherever the
 * finding itself is shown as a precedent - an officer must be able to see
 * this without opening Admin (see docs on the Admin Processing Dashboard's
 * "Scenario findings human-legally-reviewed" metric, which is the same
 * fact aggregated). Deliberately shown for BOTH states, not only the
 * exceptional one (contrast PublicationStatusBadge in
 * FindingsByStatus.tsx, which renders nothing for the ordinary case) -
 * "not yet reviewed" is the current majority state of this pilot's corpus
 * and is exactly the fact this badge exists to keep visible, not hide by
 * omission. */
export function LegalReviewBadge({ reviewed }: { reviewed: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        reviewed
          ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)] border-[var(--status-green-ring)]"
          : "bg-[var(--color-neutral-100)] text-[var(--color-ink-500)] border-[var(--color-border)]"
      }`}
    >
      {reviewed ? "Human legal review completed" : "Human legal review pending"}
    </span>
  );
}
