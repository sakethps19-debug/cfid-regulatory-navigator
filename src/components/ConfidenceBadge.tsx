import type { ConfidenceLevel } from "@/lib/matching/types";
import { matchStrengthLabel } from "@/lib/matchStrengthDisplay";

// Deliberately unequal visual weight — High is a solid, dark-filled badge
// that reads at a glance among a page of many results; Low is quiet and
// recedes, so an officer scanning a long results list isn't given the same
// visual emphasis for a weak match as a strong one.
const STYLES: Record<ConfidenceLevel, string> = {
  High: "bg-[var(--color-navy-900)] text-white ring-[var(--color-navy-900)]",
  Medium: "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  Low: "bg-transparent text-[var(--color-ink-500)] ring-[var(--color-border)]",
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[level]}`}
    >
      {matchStrengthLabel(level)}
    </span>
  );
}
