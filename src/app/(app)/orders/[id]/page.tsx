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
      <Link href="/orders" className="text-sm text-blue-700 hover:underline">
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
            className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-300"
          >
            {sentence}
            {r.note && <span className="block mt-1 text-xs text-amber-800">{r.note}</span>}
            <Link href={`/orders/${otherOrderId}`} className="mt-1 inline-block font-medium text-amber-900 underline">
              View the linked order →
            </Link>
          </div>
        );
      })}

      {siblingOrders.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Other orders in the same matter</h2>
          <p className="mb-4 text-sm text-slate-600">
            One matter/investigation can span several individual orders — interim, confirmatory, final, adjudication,
            or otherwise. Each stays independently visible with its own procedural status; a later order is never
            treated as silently overwriting an earlier one.
          </p>
          <ul className="space-y-3">
            {siblingOrders.map(({ order: sibling, relationshipLabel }) => (
              <li key={sibling.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {sibling.officialOrderTitle ?? sibling.caseName}
                    </p>
                    {!sibling.officialOrderTitle && (
                      <p className="text-xs italic text-slate-400">
                        Exact official order title not yet captured — showing the matter/case name.
                      </p>
                    )}
                    <p className="mt-1 text-sm text-slate-600">
                      {sibling.orderStage} · {sibling.orderDate ?? "Date not yet confirmed"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{sibling.proceduralStatus}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
                    {relationshipLabel}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href={`/orders/${sibling.id}`} className="text-sm font-medium text-blue-700 hover:underline">
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
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order number</dt>
            <dd className="mt-1 font-mono text-sm text-slate-700">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">CFID verification</dt>
            <dd className="mt-1 text-sm text-slate-700">{cfidVerificationDisplayText(order.cfidVerificationBasis)}</dd>
            <dd className="mt-1 text-xs text-slate-500">
              CFID identifier in order number: {order.cfidVerified ? "present" : "absent"} — tracked as a separate
              fact from verification, since verification can also rest on the official order&apos;s own contents, a
              verified CFID parent matter, or confirmation by an authorised CFID officer.
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Authority</dt>
            <dd className="mt-1 text-sm text-slate-700">{order.authority}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Noticees</dt>
            <dd className="mt-1 text-sm text-slate-700">{order.noticeesCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Procedural status</dt>
            <dd className="mt-1 text-sm text-slate-700">{order.proceduralStatus}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scope note</dt>
            <dd className="mt-1 text-sm text-slate-700">{order.scopeNote}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <SourceLink href={order.officialUrl}>Official SEBI source (PDF/HTML)</SourceLink>
        </div>
      </Card>

      {directions.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Directions &amp; outcomes</h2>
          <ul className="space-y-2">
            {directions.map((d) => (
              <li key={d.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="text-slate-800">{d.directionOrOutcome}</p>
                <p className="mt-1 text-xs text-slate-500">{d.paragraphReference}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Scenario findings from this order</h2>
        <FindingsByStatus findings={findings} />
      </Card>
    </div>
  );
}
