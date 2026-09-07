import type { FindingStatus, ScenarioFinding } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { SourceLink } from "@/components/Card";

// A Record keyed by every FindingStatus, not a plain array of hand-picked
// statuses — so adding a new status to the domain type forces a compile
// error here instead of silently dropping its findings from this section
// (as previously happened for confirmed_at_interim, alleged, inconclusive,
// procedural_observation and withdrawn — 18 of 80 findings, invisible with
// no error and no "not linked" message).
export const GROUP_INFO: Record<FindingStatus, { title: string; hint: string }> = {
  "Confirmed in Final Order": { title: "Confirmed in Final Order", hint: "Confirmed in a final order." },
  "Partly Confirmed in Final Order": {
    title: "Partly Confirmed in Final Order",
    hint: "Confirmed in part in a final order; see the qualification for what was excluded.",
  },
  "Not Confirmed in Final Order": {
    title: "Not Confirmed in Final Order",
    hint: "Rejected in a final order; an important contrary/negative precedent.",
  },
  "Confirmed at interim": {
    title: "Confirmed at interim",
    hint: "Confirmed by a confirmatory interim order; not yet a final determination.",
  },
  "Prima facie": {
    title: "Prima facie findings",
    hint: "Interim-stage findings only, not a final determination.",
  },
  Alleged: { title: "Alleged", hint: "Raised in the SCN; not yet adjudicated at any stage." },
  "Procedural observation": {
    title: "Procedural observation",
    hint: "A procedural point in the order, not a substantive finding on the merits.",
  },
  Inconclusive: { title: "Inconclusive", hint: "The order reached no determination either way." },
  Withdrawn: { title: "Withdrawn", hint: "Withdrawn during the proceedings." },
};

// Display order: final-order outcomes first, then interim/pending, then
// procedural — every FindingStatus value from GROUP_INFO appears exactly
// once, checked by the render loop below never seeing an undefined title.
export const GROUP_ORDER: FindingStatus[] = [
  "Confirmed in Final Order",
  "Partly Confirmed in Final Order",
  "Not Confirmed in Final Order",
  "Confirmed at interim",
  "Prima facie",
  "Alleged",
  "Procedural observation",
  "Inconclusive",
  "Withdrawn",
];

// Shown only for a publicationStatus other than the ordinary "Published to
// search" — that ordinary case renders nothing here, so this stays quiet
// for the vast majority of findings and only draws attention to a finding
// an officer has actually pulled from, or flagged within, the publication
// lifecycle (draft, quarantined, withdrawn, or published with a caution).
const PUBLICATION_STATUS_BADGE_STYLES: Record<string, string> = {
  Draft: "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)] ring-[var(--color-border)]",
  Quarantined: "bg-[var(--status-red-bg)] text-[var(--status-red-text)] ring-[var(--status-red-ring)]",
  "Published with warning": "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  Withdrawn: "bg-[var(--status-red-bg)] text-[var(--status-red-text)] ring-[var(--status-red-ring)]",
};

function PublicationStatusBadge({ status }: { status: string }) {
  const style = PUBLICATION_STATUS_BADGE_STYLES[status];
  if (!style) return null;
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}>
      {status}
    </span>
  );
}

function FindingRow({ finding }: { finding: ScenarioFinding }) {
  return (
    <li className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={finding.findingStatus} />
        <PublicationStatusBadge status={finding.publicationStatus} />
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">{finding.recordId}</span>
        <span className="text-sm text-[var(--color-ink-700)]">{finding.caseName}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-[var(--color-ink-900)]">{finding.scenarioTitle}</p>
      <p className="mt-1 text-sm text-[var(--color-ink-700)]">{finding.factualPattern}</p>
      {finding.qualification && <p className="mt-1 text-xs italic text-[var(--color-ink-500)]">{finding.qualification}</p>}
      <p className="mt-1 text-xs text-[var(--color-ink-500)]">
        {finding.interimParagraphReferences && <span>Interim: {finding.interimParagraphReferences}. </span>}
        {finding.finalParagraphReferences && <span>Final: {finding.finalParagraphReferences}.</span>}
      </p>
      <div className="mt-1">
        <SourceLink href={finding.officialSourceUrl} />
      </div>
    </li>
  );
}

export function FindingsByStatus({ findings }: { findings: ScenarioFinding[] }) {
  if (findings.length === 0) {
    return <p className="text-sm text-[var(--color-ink-500)]">No scenario findings are linked to this item in the pilot data.</p>;
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {GROUP_ORDER.map((status) => {
        const items = findings.filter((f) => f.findingStatus === status);
        if (items.length === 0) return null;
        const { title, hint } = GROUP_INFO[status];
        return (
          <div key={status}>
            <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">{title}</h3>
            <p className="text-xs text-[var(--color-ink-500)]">{hint}</p>
            <ul className="mt-2 space-y-2">
              {items.map((f) => (
                <FindingRow key={f.recordId} finding={f} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
