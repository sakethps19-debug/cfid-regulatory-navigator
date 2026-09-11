import type { FindingStatus } from "@/types/domain";
import { findingDispositionLabel } from "@/lib/findingStatusDisplay";

// Post-checkpoint-5 officer-UX overhaul: this badge now shows the finding's
// DISPOSITION only — never a guessed order stage (see OrderStageBadge for
// the actual Order.orderStage badge, which callers should render alongside
// this one wherever an Order is available) and never the bare word
// "Alleged"/"Prima facie" (global officer-facing product rule — neither may
// function as a status badge). For those two statuses findingDispositionLabel
// returns null and this component renders nothing at all, rather than a
// stage guess or a bare allegation-stage word dressed up as a disposition.
const STYLES: Record<FindingStatus, string> = {
  Alleged: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] ring-[var(--status-neutral-ring)]",
  "Prima facie": "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  "Confirmed at interim": "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  "Confirmed in Final Order": "bg-[var(--status-green-bg)] text-[var(--status-green-text)] ring-[var(--status-green-ring)]",
  "Partly Confirmed in Final Order": "bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] ring-[var(--status-blue-ring)]",
  "Not Confirmed in Final Order": "bg-[var(--status-red-bg)] text-[var(--status-red-text)] ring-[var(--status-red-ring)]",
  Withdrawn: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] ring-[var(--status-neutral-ring)]",
  Inconclusive: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] ring-[var(--status-neutral-ring)]",
  "Procedural observation": "bg-[var(--status-purple-bg)] text-[var(--status-purple-text)] ring-[var(--status-purple-ring)]",
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  const label = findingDispositionLabel(status);
  if (!label) return null;
  return (
    <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}>{label}</span>
  );
}
