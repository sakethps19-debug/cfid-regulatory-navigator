import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { getOrders, getProvisions, getVerifiedCfidOrders } from "@/lib/data";
import { isDeepAnalyzed } from "@/lib/processingStages";

export default async function LibraryPage() {
  const [allOrders, provisions, verifiedCfidOrders] = await Promise.all([getOrders(), getProvisions(), getVerifiedCfidOrders()]);
  const orders = allOrders.filter((o) => isDeepAnalyzed(o.processingStage));
  const byInstrument = new Map<string, number>();
  for (const p of provisions) byInstrument.set(p.instrument, (byInstrument.get(p.instrument) ?? 0) + 1);

  return (
    <div>
      <PageHeader
        title="Source Library"
        description="Official sources used in this pilot. Only the official SEBI website (orders, Acts, regulations, circulars), the official MCA website, official sources for notified accounting standards, and sources expressly referred to within the SEBI orders themselves are used — never law-firm articles, blogs, news reports, commercial databases, or unofficial reproductions."
      />

      <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Deep-analyzed orders ({orders.length})</h2>
      <p className="mb-3 text-sm text-[var(--color-ink-700)]">
        These orders have been broken down into individual scenario findings with paragraph references. See{" "}
        <Link href="/awaiting-analysis" className="text-[var(--color-gold-700)] hover:underline">
          Orders Awaiting Analysis
        </Link>{" "}
        for the full authoritative list of {verifiedCfidOrders.length} confirmed CFID orders.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <Card key={o.id}>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">{o.caseName}</h3>
            <p className="text-sm text-[var(--color-ink-700)]">
              {o.orderStage} · {o.orderDate}
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--color-ink-500)]">{o.orderNumber}</p>
            <p className="mt-2 text-sm text-[var(--color-ink-700)]">{o.authority}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SourceLink href={o.officialUrl} />
              <Link href={`/orders/${o.id}`} className="text-sm font-medium text-[var(--color-gold-700)] hover:underline">
                View in Search by Order →
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Provisions indexed by instrument</h2>
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[...byInstrument.entries()].map(([instrument, count]) => (
            <div key={instrument} className="flex items-center justify-between rounded-md bg-[var(--color-neutral-50)] px-3 py-2 text-sm">
              <dt className="text-[var(--color-ink-700)]">{instrument}</dt>
              <dd className="font-semibold text-[var(--color-ink-900)]">{count}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[var(--color-ink-500)]">
          These {provisions.length} provisions are only the ones actually cited in the orders analysed so far — they
          do not represent the complete CFID law library, and the count will grow as more orders are analysed.
          Current statutory text for each provision is not reproduced in this pilot and is marked{" "}
          <span className="font-medium">&quot;Requires verification&quot;</span> — always confirm the current
          in-force text on the official SEBI or MCA website before relying on it.
        </p>
      </Card>
    </div>
  );
}
