import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { FindingsByStatus } from "@/components/FindingsByStatus";
import { directionsForCase, getOrderById, scenarioFindings } from "@/lib/data";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrderById(id);
  if (!order) notFound();

  const findings = scenarioFindings.filter((f) => f.orderIds.includes(order.id));
  const directions = directionsForCase(order.caseName).filter((d) => d.stage.toLowerCase() === (order.orderStage.startsWith("Final") ? "final" : "interim"));

  return (
    <div>
      <Link href="/orders" className="text-sm text-blue-700 hover:underline">
        ← Back to Search by Order
      </Link>
      <PageHeader title={order.caseName} description={`${order.orderStage} · ${order.orderDate}`} />

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order number</dt>
            <dd className="mt-1 font-mono text-sm text-slate-700">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">CFID verification</dt>
            <dd className="mt-1 text-sm text-slate-700">
              {order.cfidVerified ? "Verified — order number contains \"CFID\"" : "Not verified"}
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
