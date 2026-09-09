import Link from "next/link";
import type { JourneyStage } from "@/lib/caseJourney";
import { Card, SourceLink } from "@/components/Card";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { GROUP_INFO, GROUP_ORDER } from "@/components/FindingsByStatus";
import { formatDate } from "@/lib/formatDate";
import { stripPipelineLanguage } from "@/lib/orderGist";

/** One order rendered as one independent Case Journey stage — a structured
 * lifecycle SUMMARY, not a duplicate of Case/Order Detail (which stays one
 * click away via "View full case detail →"). Every field here is drawn
 * straight from this order's own row and its own linked findings/
 * directions; nothing is inferred across stages except the relationship
 * notes already computed by buildCaseJourney from actual order_relationships
 * rows. */
export function CaseJourneyStageCard({ stage, stageNumber, totalStages }: { stage: JourneyStage; stageNumber: number; totalStages: number }) {
  const { order } = stage;
  const findingsByStatus = GROUP_ORDER.map((status) => ({
    status,
    count: stage.findings.filter((f) => f.findingStatus === status).length,
  })).filter((g) => g.count > 0);

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

      {stage.gist && <p className="mt-3 max-w-prose text-left text-sm text-[var(--color-ink-700)]">{stripPipelineLanguage(stage.gist)}</p>}

      {stage.issuesExamined.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Issues examined</p>
          <p className="mt-0.5 max-w-prose text-sm text-[var(--color-ink-700)]">{stage.issuesExamined.join("; ")}</p>
        </div>
      )}

      {findingsByStatus.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">This stage&apos;s findings</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {findingsByStatus.map(({ status, count }) => (
              <span key={status} className="inline-flex items-center gap-1" title={GROUP_INFO[status].hint}>
                <StatusBadge status={status} />
                <span className="text-xs text-[var(--color-ink-500)]">×{count}</span>
              </span>
            ))}
          </div>
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
              <li key={d.id} className="max-w-prose text-sm text-[var(--color-ink-700)]">
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
