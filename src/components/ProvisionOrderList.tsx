import Link from "next/link";
import type { Order, ScenarioFinding } from "@/types/domain";
import { SourceLink } from "@/components/Card";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import { orderGist } from "@/lib/orderGist";

/** The provision detail page's "which orders expressly invoked this exact
 * provision" list (Part 8 of the officer walkthrough cleanup pass). A
 * dedicated component, not a mode of the shared FindingsByStatus (which
 * stays exactly as-is for the Order Detail page's own "findings within
 * this order" list — a different question with its own reasonable
 * status-grouped presentation, out of scope for this redesign).
 *
 * Deliberately: one flat list, never grouped/bifurcated by a disposition
 * outcome (established, partly established, rejected, etc.) — that
 * disposition data is preserved in full elsewhere (Analyze, Case Journey,
 * Admin, each finding's own record) and is not deleted by this component,
 * simply not used to organise this particular list. Exactly one
 * order-type badge per row, and none of the workflow/pipeline badges
 * (review-pending status, publication lifecycle, or a per-provision
 * citation-relationship label) this pass removes from officer-facing
 * screens app-wide. The internal finding record id is kept, but small and
 * unobtrusive, for traceability only. */
export function ProvisionOrderList({ findings, ordersById }: { findings: ScenarioFinding[]; ordersById: Map<string, Order> }) {
  if (findings.length === 0) {
    return <p className="text-sm text-[var(--color-ink-500)]">No orders on file expressly cite this exact provision.</p>;
  }

  const rows = findings.map((f) => {
    const linkedOrders = f.orderIds.map((id) => ordersById.get(id)).filter((o): o is Order => !!o);
    // Prefer the most recently dated linked order for the single
    // order-type badge (usually the more conclusive one, e.g. a final
    // order over its own earlier interim order); falls back to whichever
    // order is on file when dates are missing.
    const badgeOrder = [...linkedOrders].sort((a, b) => (b.orderDate ?? "").localeCompare(a.orderDate ?? ""))[0];
    const gist = badgeOrder ? orderGist(badgeOrder, [f]) : null;
    return { finding: f, linkedOrders, badgeOrder, gist };
  });

  return (
    <ul className="space-y-2">
      {rows.map(({ finding: f, linkedOrders, badgeOrder, gist }) => (
        <li key={f.recordId} className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {badgeOrder && <OrderStageBadge orderStage={badgeOrder.orderStage} />}
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">{f.caseName}</span>
            <span className="text-xs text-[var(--color-ink-300)]">{f.recordId}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-ink-700)]">{gist ?? f.scenarioTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <SourceLink href={f.officialSourceUrl} />
            {linkedOrders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="text-sm font-medium text-[var(--color-gold-700)] hover:underline">
                View order in detail →
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
