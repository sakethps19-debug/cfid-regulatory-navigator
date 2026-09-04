import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { orders } from "@/lib/data";

export default function OrdersPage() {
  return (
    <div>
      <PageHeader
        title="Search by Order"
        description={'The three verified CFID orders analysed for this pilot. Each order\'s number has been confirmed to contain "CFID" before admission to this library.'}
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
                    CFID verified
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
