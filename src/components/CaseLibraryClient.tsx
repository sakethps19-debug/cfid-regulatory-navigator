"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Order, OrderStage } from "@/types/domain";
import { SourceLink } from "@/components/Card";
import { formatDate } from "@/lib/formatDate";
import { isDeepAnalyzed } from "@/lib/processingStages";

// Demo-polish sprint: this page previously filtered/labelled every order by
// its internal PIPELINE processing stage (indexed / downloaded / citations
// checked / legally reviewed, etc.) — corpus-management metadata that
// belongs on the Admin Dashboard, not on a regular officer's research
// screen (see the application-wide demo-readiness sprint's "remove admin
// metrics from regular-user surfaces" principle). Filtering now uses the
// order's own legal ORDER STAGE (interim/confirmatory/final/adjudication/
// etc.) instead — a genuinely research-relevant dimension an officer would
// actually want to narrow by.
const ORDER_STAGE_ORDER: OrderStage[] = [
  "Interim order",
  "Interim order cum show cause notice",
  "Confirmatory order",
  "Final order",
  "Adjudication order",
  "Settlement order",
  "Revocation order",
  "Other",
];

export function CaseLibraryClient({ orders }: { orders: Order[] }) {
  const [stageFilter, setStageFilter] = useState<"all" | OrderStage>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<OrderStage, number>();
    for (const o of orders) map.set(o.orderStage, (map.get(o.orderStage) ?? 0) + 1);
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (stageFilter !== "all" && o.orderStage !== stageFilter) return false;
      if (q && ![o.caseName, o.orderNumber, o.scopeNote].some((field) => field?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [orders, stageFilter, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStageFilter("all")}
          className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
            stageFilter === "all" ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
          }`}
        >
          All ({orders.length})
        </button>
        {ORDER_STAGE_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              stageFilter === s ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
            }`}
          >
            {s} ({counts.get(s) ?? 0})
          </button>
        ))}
        <input
          type="search"
          placeholder="Search case name, order number, or scenario keywords…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
        />
      </div>
      <p className="mt-3 text-xs text-[var(--color-ink-500)]">
        {filtered.length} of {orders.length} orders shown.
      </p>

      {/* Desktop/tablet: full table. Below md, this becomes an unreadably
          cramped horizontal-scroll table, so it's replaced entirely by the
          stacked card list below rather than just wrapped in overflow-x. */}
      <div className="mt-2 hidden overflow-x-auto rounded-sm bg-white border border-[var(--color-border)] md:block">
        <table className="w-full min-w-[1000px] divide-y divide-[var(--color-border)] text-sm">
          <thead>
            <tr className="bg-[var(--color-neutral-50)]">
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Case</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Order</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Date</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Research status</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.map((o) => {
              const deepAnalyzed = isDeepAnalyzed(o.processingStage);
              return (
                <tr key={o.id}>
                  <td className="px-3 py-2 align-top font-medium text-[var(--color-ink-900)]">
                    {deepAnalyzed ? (
                      <Link href={`/orders/${o.id}`} className="text-[var(--color-gold-700)] hover:underline">
                        {o.caseName}
                      </Link>
                    ) : (
                      o.caseName
                    )}
                    {deepAnalyzed && o.scopeNote && (
                      <p className="mt-0.5 max-w-md text-xs font-normal text-[var(--color-ink-500)]">{o.scopeNote}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-block rounded-sm bg-[var(--color-gold-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-600)]/50">
                      {o.orderStage}
                    </span>
                    <div className="mt-1 font-mono text-xs text-[var(--color-ink-700)]">{o.orderNumber ?? "-"}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top text-[var(--color-ink-700)]">{formatDate(o.orderDate) || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <span
                      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        deepAnalyzed
                          ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)] ring-[var(--status-green-ring)]"
                          : "bg-transparent text-[var(--color-ink-500)] ring-[var(--color-border)]"
                      }`}
                    >
                      {deepAnalyzed ? "Detailed research available" : "Not yet available for detailed research"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <SourceLink href={o.officialUrl} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-[var(--color-ink-500)]">No rows match this filter.</p>}
      </div>

      {/* Mobile: case, order type/date and stage first, scope note and
          source link tucked below — matches how an officer actually scans
          this list on a phone (identify the case, then check its stage). */}
      <div className="mt-2 space-y-2.5 md:hidden">
        {filtered.map((o) => {
          const deepAnalyzed = isDeepAnalyzed(o.processingStage);
          return (
            <div key={o.id} className="rounded-sm bg-white p-3 border border-[var(--color-border)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  {deepAnalyzed ? (
                    <Link href={`/orders/${o.id}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                      {o.caseName}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--color-ink-900)]">{o.caseName}</span>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-ink-700)]">
                    <span className="inline-block rounded-sm bg-[var(--color-gold-100)] px-2 py-0.5 font-semibold text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-600)]/50">
                      {o.orderStage}
                    </span>
                    <span>{formatDate(o.orderDate) || "-"}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                    deepAnalyzed
                      ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)] ring-[var(--status-green-ring)]"
                      : "bg-transparent text-[var(--color-ink-500)] ring-[var(--color-border)]"
                  }`}
                >
                  {deepAnalyzed ? "Research available" : "Not yet available"}
                </span>
              </div>
              {deepAnalyzed && o.scopeNote && <p className="mt-1.5 text-xs text-[var(--color-ink-500)]">{o.scopeNote}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--color-ink-700)]">
                <span>{o.orderNumber ?? "-"}</span>
              </div>
              <div className="mt-1.5">
                <SourceLink href={o.officialUrl} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="rounded-sm bg-white p-4 text-sm text-[var(--color-ink-500)] border border-[var(--color-border)]">No rows match this filter.</p>}
      </div>
    </div>
  );
}
