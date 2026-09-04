"use client";

import { useMemo, useState } from "react";
import type { ValidationIssue } from "@/types/domain";

const SEVERITY_STYLES: Record<ValidationIssue["severity"], string> = {
  error: "bg-rose-100 text-rose-800 ring-rose-300",
  warning: "bg-amber-100 text-amber-800 ring-amber-300",
  info: "bg-slate-100 text-slate-600 ring-slate-300",
};

export function ValidationIssuesClient({ issues }: { issues: ValidationIssue[] }) {
  const [severityFilter, setSeverityFilter] = useState<"all" | ValidationIssue["severity"]>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    return {
      error: issues.filter((i) => i.severity === "error").length,
      warning: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
    };
  }, [issues]);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      const q = query.trim().toLowerCase();
      if (q && !i.description.toLowerCase().includes(q) && !(i.orderCaseName ?? "").toLowerCase().includes(q) && !(i.sourceRowRef ?? "").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [issues, severityFilter, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as const, label: `All (${issues.length})` },
            { key: "error" as const, label: `Errors (${counts.error})` },
            { key: "warning" as const, label: `Warnings (${counts.warning})` },
            { key: "info" as const, label: `Info (${counts.info})` },
          ]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setSeverityFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              severityFilter === f.key ? "bg-blue-700 text-white ring-blue-700" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="search"
          placeholder="Search description, case name, or source row…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[900px] divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Severity</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Type</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Description</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Case / source row</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((i) => (
              <tr key={i.id}>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${SEVERITY_STYLES[i.severity]}`}>
                    {i.severity}
                  </span>
                </td>
                <td className="px-3 py-2 align-top font-mono text-xs text-slate-600">{i.issueType}</td>
                <td className="px-3 py-2 align-top text-slate-700">{i.description}</td>
                <td className="px-3 py-2 align-top text-xs text-slate-500">{i.orderCaseName ?? i.sourceRowRef ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-slate-500">No issues match this filter.</p>}
      </div>
    </div>
  );
}
