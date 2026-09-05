import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { FindingsByStatus } from "@/components/FindingsByStatus";
import { directionsForCase, getOrderById, getOrders, getScenarioFindings, orderRelationshipsForOrder } from "@/lib/data";
import { orderRelationshipSentence, siblingOrdersInMatter } from "@/lib/matterRelationships";
import { cfidVerificationDisplayText } from "@/lib/cfidVerification";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const [allFindings, allDirections, relationships, allOrders] = await Promise.all([
    getScenarioFindings(),
    directionsForCase(order.caseName),
    orderRelationshipsForOrder(order.id),
    getOrders(),
  ]);
  const findings = allFindings.filter((f) => f.orderIds.includes(order.id));
  const directions = allDirections.filter((d) => d.stage.toLowerCase() === (order.orderStage.startsWith("Final") ? "final" : "interim"));
  const siblingOrders = siblingOrdersInMatter(order, allOrders, relationships);

  return (
    <div>
      <Link href="/orders" className="text-sm text-[var(--color-gold-700)] hover:underline">
        ← Back to Search by Order
      </Link>
      <PageHeader title={order.caseName} description={`${order.orderStage} · ${order.orderDate}`} />

      {relationships.map((r) => {
        const otherOrderId = r.fromOrderId === order.id ? r.toOrderId : r.fromOrderId;
        const otherOrder = allOrders.find((o) => o.id === otherOrderId);
        if (!otherOrder) return null; // referenced order not in the provided set — skip rather than guess
        const sentence = orderRelationshipSentence(order, otherOrder, r);
        return (
          <div
            key={r.id}
            className="mb-4 rounded-md bg-[var(--color-gold-50)] p-3 text-sm text-[#7a5310] ring-1 border-[#dfc98f]"
          >
            {sentence}
            {r.note && <span className="block mt-1 text-xs text-[#7a5310]">{r.note}</span>}
            <Link href={`/orders/${otherOrderId}`} className="mt-1 inline-block font-medium text-[#7a5310] underline">
              View the linked order →
            </Link>
          </div>
        );
      })}

      {siblingOrders.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Other orders in the same matter</h2>
          <p className="mb-4 text-sm text-[var(--color-ink-700)]">
            One matter/investigation can span several individual orders — interim, confirmatory, final, adjudication,
            or otherwise. Each stays independently visible with its own procedural status; a later order is never
            treated as silently overwriting an earlier one.
          </p>
          <ul className="space-y-3">
            {siblingOrders.map(({ order: sibling, relationshipLabel }) => (
              <li key={sibling.id} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                      {sibling.officialOrderTitle ?? sibling.caseName}
                    </p>
                    {!sibling.officialOrderTitle && (
                      <p className="text-xs italic text-[var(--color-ink-300)]">
                        Exact official order title not yet captured — showing the matter/case name.
                      </p>
                    )}
                    <p className="mt-1 text-sm text-[var(--color-ink-700)]">
                      {sibling.orderStage} · {sibling.orderDate ?? "Date not yet confirmed"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-500)]">{sibling.proceduralStatus}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-sm bg-[var(--color-gold-50)] px-2 py-1 text-xs font-medium text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-100)]">
                    {relationshipLabel}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href={`/orders/${sibling.id}`} className="text-sm font-medium text-[var(--color-gold-700)] hover:underline">
                    View this order →
                  </Link>
                  <SourceLink href={sibling.officialUrl} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order number</dt>
            <dd className="mt-1 font-mono text-sm text-[var(--color-ink-700)]">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">CFID verification</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{cfidVerificationDisplayText(order.cfidVerificationBasis)}</dd>
            <dd className="mt-1 text-xs text-[var(--color-ink-500)]">
              CFID identifier in order number: {order.cfidVerified ? "present" : "absent"} — tracked as a separate
              fact from verification, since verification can also rest on the official order&apos;s own contents, a
              verified CFID parent matter, or confirmation by an authorised CFID officer.
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Authority</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{order.authority}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Noticees</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{order.noticeesCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Procedural status</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{order.proceduralStatus}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Scope note</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{order.scopeNote}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <SourceLink href={order.officialUrl}>Official SEBI source (PDF/HTML)</SourceLink>
        </div>
      </Card>

      {directions.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Directions &amp; outcomes</h2>
          <ul className="space-y-2">
            {directions.map((d) => (
              <li key={d.id} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
                <p className="text-[var(--color-ink-900)]">{d.directionOrOutcome}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-500)]">{d.paragraphReference}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink-900)]">Scenario findings from this order</h2>
        <FindingsByStatus findings={findings} />
      </Card>
    </div>
  );
}
