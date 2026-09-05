"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Order, ProcessingStage } from "@/types/domain";
import { SourceLink } from "@/components/Card";
import { isDeepAnalyzed, PROCESSING_STAGE_SHORT_LABELS, PROCESSING_STAGE_STYLES } from "@/lib/processingStages";
import { cfidVerificationDisplayText } from "@/lib/cfidVerification";

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
    return orders.filter((o) => {
      if (stageFilter !== "all" && o.processingStage !== stageFilter) return false;
      if (query.trim() && !o.caseName.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [orders, stageFilter, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStageFilter("all")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
            stageFilter === "all" ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
          }`}
        >
          All ({orders.length})
        </button>
        {STAGE_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              stageFilter === s ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            {STAGE_LABELS[s]} ({counts.get(s) ?? 0})
          </button>
        ))}
        <input
          type="search"
          placeholder="Search case name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[900px] divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Case name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Order number</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Stage</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">CFID tag</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-2 align-top font-medium text-slate-900">
                  {isDeepAnalyzed(o.processingStage) ? (
                    <Link href={`/orders/${o.id}`} className="text-blue-700 hover:underline">
                      {o.caseName}
                    </Link>
                  ) : (
                    o.caseName
                  )}
                </td>
                <td className="px-3 py-2 align-top font-mono text-xs text-slate-600">{o.orderNumber ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STAGE_STYLES[o.processingStage]}`}
                    title={o.retrievalFailureReason ?? undefined}
                  >
                    {STAGE_LABELS[o.processingStage]}
                  </span>
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2 align-top text-slate-700"
                  title={cfidVerificationDisplayText(o.cfidVerificationBasis)}
                >
                  {o.cfidVerified ? "Yes" : "No"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <SourceLink href={o.officialUrl} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-slate-500">No rows match this filter.</p>}
      </div>
    </div>
  );
}
