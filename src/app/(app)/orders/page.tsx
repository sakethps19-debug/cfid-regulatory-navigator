import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getOrders } from "@/lib/data";
import { isDeepAnalyzed } from "@/lib/processingStages";

export default async function OrdersPage() {
  const allOrders = await getOrders();
  const orders = allOrders.filter((o) => isDeepAnalyzed(o.processingStage));
  return (
    <div>
      <PageHeader
        title="Search by Order"
        description={`Every order that has actually been opened, read, and broken down into scenario findings with paragraph citations (${orders.length} of ${allOrders.length} indexed orders). Most are citation-checked but not yet legally reviewed by a CFID officer — still ready for research use. See the Admin Processing Dashboard for the remaining orders and why they haven't been analysed yet.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`}>
            <Card className="h-full transition hover:ring-blue-400">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-300">
                  {o.orderStage}
                </span>
                {o.cfidVerified && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-300">
                    CFID tag present
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-base font-semibold text-slate-900">{o.caseName}</h2>
              <p className="mt-1 text-sm text-slate-600">{o.orderDate}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{o.orderNumber}</p>
              <p className="mt-2 text-sm text-slate-600">{o.scopeNote}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
