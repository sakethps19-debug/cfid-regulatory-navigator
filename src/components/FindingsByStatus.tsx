import Link from "next/link";
import type { FindingStatus, ScenarioFinding } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { SourceLink } from "@/components/Card";
import { LegalReviewBadge } from "@/components/LegalReviewBadge";
import { findingStatusLabel } from "@/lib/findingStatusDisplay";

// A Record keyed by every FindingStatus, not a plain array of hand-picked
// statuses — so adding a new status to the domain type forces a compile
// error here instead of silently dropping its findings from this section
// (as previously happened for confirmed_at_interim, alleged, inconclusive,
// procedural_observation and withdrawn — 18 of 80 findings, invisible with
// no error and no "not linked" message). Titles reuse findingStatusLabel
// (order-stage-first, e.g. "Final order · Confirmed") for consistency with
// the StatusBadge shown on every finding elsewhere in the app.
export const GROUP_INFO: Record<FindingStatus, { title: string; hint: string }> = {
  "Confirmed in Final Order": { title: findingStatusLabel("Confirmed in Final Order"), hint: "Confirmed in a final order." },
  "Partly Confirmed in Final Order": {
    title: findingStatusLabel("Partly Confirmed in Final Order"),
    hint: "Confirmed in part in a final order; see the qualification for what was excluded.",
  },
  "Not Confirmed in Final Order": {
    title: findingStatusLabel("Not Confirmed in Final Order"),
    hint: "Rejected in a final order; an important contrary/negative precedent.",
  },
  "Confirmed at interim": {
    title: findingStatusLabel("Confirmed at interim"),
    hint: "Confirmed by a confirmatory interim order; not yet a final determination.",
  },
  "Prima facie": {
    title: findingStatusLabel("Prima facie"),
    hint: "Interim-stage findings only, not a final determination.",
  },
  Alleged: { title: findingStatusLabel("Alleged"), hint: "Raised in the SCN; not yet adjudicated at any stage." },
  "Procedural observation": {
    title: findingStatusLabel("Procedural observation"),
    hint: "A procedural point in the order, not a substantive finding on the merits.",
  },
  Inconclusive: { title: findingStatusLabel("Inconclusive"), hint: "The order reached no determination either way." },
  Withdrawn: { title: findingStatusLabel("Withdrawn"), hint: "Withdrawn during the proceedings." },
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

// Labels for finding_provisions.relationship, when a caller (e.g. a
// provision detail page) supplies a per-finding relationship via
// provisionRelationship. "alleged" means the provision was cited/considered
// in this finding but is not recorded as itself what the disposition
// turned on; upheld/not_upheld means this specific provision IS recorded
// as that basis. This is a curated data-entry classification (871 rows
// audited: the majority were deliberately set per-provision, not merely
// copied from the finding's own overall status — see
// docs/finding-provisions-relationship-audit.md), not an independent legal
// verification — see each finding's own human-legal-review status.
// "upheld"/"not_upheld" here does NOT mean a final order specifically: the
// finding this provision belongs to can be at any procedural stage
// (confirmed_at_interim included), shown separately via that finding's own
// StatusBadge, never implied by this label alone.
const PROVISION_RELATIONSHIP_LABELS: Record<string, string> = {
  alleged: "Cited in this finding",
  upheld: "Recorded as basis of this finding's own disposition",
  not_upheld: "Recorded as basis of this finding's own (not-confirmed) disposition",
};

function FindingRow({
  finding,
  relationship,
  currentOrderId,
}: {
  finding: ScenarioFinding;
  relationship?: string;
  /** The order id of the page this row is already rendered on (Order
   * Detail) — excluded from the "View order" links below so a finding
   * never links back to the very order the officer is already reading.
   * Omitted on Provision Detail, where every linked order is worth a
   * link. */
  currentOrderId?: string;
}) {
  const relationshipLabel = relationship ? PROVISION_RELATIONSHIP_LABELS[relationship] : undefined;
  const linkableOrderIds = finding.orderIds.filter((id) => id !== currentOrderId);
  return (
    <li className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={finding.findingStatus} />
        <PublicationStatusBadge status={finding.publicationStatus} />
        <LegalReviewBadge reviewed={finding.humanLegalReviewCompleted} />
        <span className="text-sm font-semibold text-[var(--color-ink-900)]">{finding.recordId}</span>
        <span className="text-sm text-[var(--color-ink-700)]">{finding.caseName}</span>
        {relationshipLabel && (
          <span className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs text-[var(--color-ink-700)]">
            {relationshipLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm font-medium text-[var(--color-ink-900)]">{finding.scenarioTitle}</p>
      <p className="mt-1 text-sm text-[var(--color-ink-700)]">{finding.factualPattern}</p>
      {finding.qualification && <p className="mt-1 text-xs italic text-[var(--color-ink-500)]">{finding.qualification}</p>}
      <p className="mt-1 text-xs text-[var(--color-ink-500)]">
        {finding.interimParagraphReferences && <span>Interim: {finding.interimParagraphReferences}. </span>}
        {finding.finalParagraphReferences && <span>Final: {finding.finalParagraphReferences}.</span>}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <SourceLink href={finding.officialSourceUrl} />
        {linkableOrderIds.map((orderId) => (
          <Link key={orderId} href={`/orders/${orderId}`} className="text-sm font-medium text-[var(--color-gold-700)] hover:underline">
            View order detail →
          </Link>
        ))}
      </div>
    </li>
  );
}

export function FindingsByStatus({
  findings,
  provisionRelationship,
  currentOrderId,
}: {
  findings: ScenarioFinding[];
  /** Optional: given a finding, returns how a specific provision (the
   * caller's context, e.g. a provision detail page) related to it - see
   * PROVISION_RELATIONSHIP_LABELS. Omit when there is no single provision
   * in context (e.g. an order detail page listing every finding). */
  provisionRelationship?: (finding: ScenarioFinding) => string | undefined;
  /** See FindingRow's currentOrderId. */
  currentOrderId?: string;
}) {
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
                <FindingRow key={f.recordId} finding={f} relationship={provisionRelationship?.(f)} currentOrderId={currentOrderId} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
