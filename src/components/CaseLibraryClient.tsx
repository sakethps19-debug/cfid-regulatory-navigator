"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Order, ProcessingStage } from "@/types/domain";
import { SourceLink } from "@/components/Card";
import { formatDate } from "@/lib/formatDate";
import { isDeepAnalyzed, PROCESSING_STAGE_SHORT_LABELS, PROCESSING_STAGE_STYLES } from "@/lib/processingStages";

const STAGE_LABELS = PROCESSING_STAGE_SHORT_LABELS;
const STAGE_STYLES = PROCESSING_STAGE_STYLES;

// Filter-chip order: most-complete first, so "Legally reviewed" (the small,
// real number) isn't buried after a long list of not-yet-started stages.
const STAGE_ORDER: ProcessingStage[] = [
  "legally_reviewed",
  "citations_checked",
  "scenario_findings_extracted",
  "text_extracted",
  "downloaded",
  "retrieval_attempted",
  "needs_manual_review",
  "retrieval_failed",
  "awaiting_retrieval",
  "indexed",
];

export function CaseLibraryClient({ orders }: { orders: Order[] }) {
  const [stageFilter, setStageFilter] = useState<"all" | ProcessingStage>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<ProcessingStage, number>();
    for (const o of orders) map.set(o.processingStage, (map.get(o.processingStage) ?? 0) + 1);
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (stageFilter !== "all" && o.processingStage !== stageFilter) return false;
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
        {STAGE_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              stageFilter === s ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
            }`}
          >
            {STAGE_LABELS[s]} ({counts.get(s) ?? 0})
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
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Processing stage</th>
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
                      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STAGE_STYLES[o.processingStage]}`}
                      title={o.retrievalFailureReason ?? undefined}
                    >
                      {STAGE_LABELS[o.processingStage]}
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
                  className={`inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STAGE_STYLES[o.processingStage]}`}
                  title={o.retrievalFailureReason ?? undefined}
                >
                  {STAGE_LABELS[o.processingStage]}
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
