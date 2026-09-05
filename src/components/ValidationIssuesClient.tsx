"use client";

import { useMemo, useState } from "react";
import type { ValidationIssue } from "@/types/domain";

const SEVERITY_STYLES: Record<ValidationIssue["severity"], string> = {
  error: "bg-[#f1e3df] text-[#7a2a1f] border-[#dcaa9a]",
  warning: "bg-[#f5ecd9] text-[#7a5310] border-[#dfc98f]",
  info: "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)] border-[var(--color-border)]",
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
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              severityFilter === f.key ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
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
          className="ml-auto rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm bg-white border border-[var(--color-border)]">
        <table className="w-full min-w-[900px] divide-y divide-[var(--color-border)] text-sm">
          <thead>
            <tr className="bg-[var(--color-neutral-50)]">
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Severity</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Type</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Description</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Case / source row</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.map((i) => (
              <tr key={i.id}>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${SEVERITY_STYLES[i.severity]}`}>
                    {i.severity}
                  </span>
                </td>
                <td className="px-3 py-2 align-top font-mono text-xs text-[var(--color-ink-700)]">{i.issueType}</td>
                <td className="px-3 py-2 align-top text-[var(--color-ink-700)]">{i.description}</td>
                <td className="px-3 py-2 align-top text-xs text-[var(--color-ink-500)]">{i.orderCaseName ?? i.sourceRowRef ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-[var(--color-ink-500)]">No issues match this filter.</p>}
      </div>
    </div>
  );
}
