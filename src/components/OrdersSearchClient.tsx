"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types/domain";
import { Card } from "@/components/Card";

export function OrdersSearchClient({ orders }: { orders: Order[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      [o.caseName, o.orderNumber, o.scopeNote].some((field) => field?.toLowerCase().includes(q))
    );
  }, [orders, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search by case name, order number, or scenario keywords…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full max-w-md rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      />
      <p className="mb-3 text-xs text-[var(--color-ink-500)]">
        {filtered.length} of {orders.length} orders shown.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((o) => (
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
      {filtered.length === 0 && <p className="text-sm text-[var(--color-ink-500)]">No orders match this search.</p>}
    </div>
  );
}
