"use client";

import { useMemo, useState } from "react";
import type { AwaitingAnalysisRow, AwaitingAnalysisStatus } from "@/types/domain";

const STATUS_LABELS: Record<AwaitingAnalysisStatus, string> = {
  already_in_library: "Already in library",
  no_order: "No order on file",
  links_pending_review: "Links pending review",
};

const STATUS_STYLES: Record<AwaitingAnalysisStatus, string> = {
  already_in_library: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  no_order: "bg-slate-100 text-slate-700 ring-slate-300",
  links_pending_review: "bg-amber-100 text-amber-800 ring-amber-300",
};

const FILTERS: { key: "all" | AwaitingAnalysisStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "links_pending_review", label: "Links pending review" },
  { key: "no_order", label: "No order on file" },
  { key: "already_in_library", label: "Already in library" },
];

export function AwaitingAnalysisClient({ rows }: { rows: AwaitingAnalysisRow[] }) {
  const [filter, setFilter] = useState<"all" | AwaitingAnalysisStatus>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!(r.caseName.toLowerCase().includes(q) || String(r.caseId).includes(q))) return false;
      }
      return true;
    });
  }, [rows, filter, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              filter === f.key ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            {f.label} ({f.key === "all" ? rows.length : rows.filter((r) => r.status === f.key).length})
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
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Sr.</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Case name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Order type</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Links</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Review reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((r) => (
              <tr key={r.srNo}>
                <td className="px-3 py-2 align-top text-slate-500">{r.srNo}</td>
                <td className="px-3 py-2 align-top font-medium text-slate-900">{r.caseName}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top text-slate-600">{r.orderType}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  {r.links.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {r.links.map((l, i) => (
                        <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">
                          Link {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-xs text-slate-500">{r.reviewReason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-slate-500">No rows match this filter.</p>}
      </div>
    </div>
  );
}
