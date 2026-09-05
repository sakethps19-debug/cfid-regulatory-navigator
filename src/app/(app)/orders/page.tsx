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
            <Card className="h-full transition hover:ring-[var(--color-gold-600)]">
              <span className="inline-block rounded-sm bg-[var(--color-gold-100)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-600)]/50">
                {o.orderStage}
              </span>
              <h2 className="mt-2 text-base font-semibold text-[var(--color-ink-900)]">{o.caseName}</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-700)]">{o.orderDate}</p>
              <p className="mt-1 font-mono text-xs text-[var(--color-ink-500)]">{o.orderNumber}</p>
              <p className="mt-2 text-sm text-[var(--color-ink-700)]">{o.scopeNote}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
