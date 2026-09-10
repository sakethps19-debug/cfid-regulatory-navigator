import Link from "next/link";
import type { JourneyStage } from "@/lib/caseJourney";
import { Card, SourceLink } from "@/components/Card";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import { findingDispositionLabel } from "@/lib/findingStatusDisplay";
import { formatDate } from "@/lib/formatDate";
import { stripPipelineLanguage } from "@/lib/orderGist";
import { NARRATIVE_PROSE_CLASSES } from "@/lib/proseClasses";

/** One order rendered as one independent Case Journey stage — a structured
 * lifecycle SUMMARY, not a duplicate of Case/Order Detail (which stays one
 * click away via "View full case detail →"). Every field here is drawn
 * straight from this order's own row and its own linked findings/
 * directions; nothing is inferred across stages except the relationship
 * notes already computed by buildCaseJourney from actual order_relationships
 * rows.
 *
 * Independent-audit correction (P1-10): "This stage's findings" used to
 * group by raw FindingStatus (GROUP_ORDER/GROUP_INFO) and render a
 * StatusBadge next to each count -- for Alleged/Prima facie, StatusBadge
 * renders nothing, leaving an orphan "×N" floating with no visible label.
 * Order stage (from the real Order, via OrderStageBadge above) and finding
 * disposition are different dimensions and are never fused into a second
 * pseudo-stage derived from finding_status. This card now shows only
 * findings that actually have a disposition (findingDispositionLabel
 * non-null); an SCN-stage allegation with no disposition simply doesn't
 * appear here — it is not given a fabricated one. */
export function CaseJourneyStageCard({ stage, stageNumber, totalStages }: { stage: JourneyStage; stageNumber: number; totalStages: number }) {
  const { order } = stage;
  const dispositions = stage.findings
    .map((f) => ({ recordId: f.recordId, label: findingDispositionLabel(f.findingStatus) }))
    .filter((d): d is { recordId: string; label: string } => d.label !== null);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-300)]">
          Stage {stageNumber} of {totalStages}
        </span>
        <OrderStageBadge orderStage={order.orderStage} />
      </div>

      <div className="mt-2">
        <p className="font-serif text-base font-semibold text-[var(--color-ink-900)]">{order.officialOrderTitle ?? order.caseName}</p>
        {!order.officialOrderTitle && (
          <p className="text-xs italic text-[var(--color-ink-300)]">Exact official order title not yet captured, showing the matter/case name.</p>
        )}
        <p className="mt-1 text-sm text-[var(--color-ink-700)]">
          {order.orderDate ? formatDate(order.orderDate) : "Date not yet confirmed"}
          {order.orderNumber && <span className="font-mono"> · {order.orderNumber}</span>}
        </p>
      </div>

      {stage.relationshipNotes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stage.relationshipNotes.map((note) => (
            <span
              key={note.otherOrderId}
              className="inline-flex items-center rounded-sm bg-[var(--color-gold-50)] px-2 py-0.5 text-xs font-medium text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]"
            >
              {note.label} the {note.otherOrderStage.toLowerCase()}
              {note.otherOrderDate ? ` (${formatDate(note.otherOrderDate)})` : ""}
            </span>
          ))}
        </div>
      )}

      {stage.gist && <p className={`mt-3 text-sm text-[var(--color-ink-700)] ${NARRATIVE_PROSE_CLASSES}`}>{stripPipelineLanguage(stage.gist)}</p>}

      {stage.issuesExamined.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Issues examined</p>
          <p className="mt-0.5 max-w-3xl text-sm text-[var(--color-ink-700)] xl:max-w-4xl 2xl:max-w-5xl">{stage.issuesExamined.join("; ")}</p>
        </div>
      )}

      {dispositions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Outcome / disposition</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {dispositions.map((d) => (
              <li key={d.recordId} className="text-sm text-[var(--color-ink-700)]">
                {d.recordId}: {d.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage.broadScenarios.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Broad scenarios</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {stage.broadScenarios.map(({ scenario }) => (
              <li key={scenario.id} className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink-700)]">
                {scenario.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Outcome / directions</p>
        {stage.directions.length > 0 ? (
          <ul className="mt-1 space-y-1.5">
            {stage.directions.map((d) => (
              <li key={d.id} className={`text-sm text-[var(--color-ink-700)] ${NARRATIVE_PROSE_CLASSES}`}>
                {d.directionOrOutcome}
                {d.paragraphReference && <span className="text-xs text-[var(--color-ink-500)]"> ({d.paragraphReference})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm italic text-[var(--color-ink-300)]">No structured directions/outcome captured yet for this order.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-3">
        <Link href={`/orders/${order.id}`} className="text-sm font-medium text-[var(--color-gold-700)] hover:underline">
          View full case detail →
        </Link>
        <SourceLink href={order.officialUrl} />
      </div>
    </Card>
  );
}
