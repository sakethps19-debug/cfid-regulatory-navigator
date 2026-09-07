"use client";

import { useMemo, useState } from "react";
import type { DataChangeLogEntry } from "@/types/domain";
import { formatDate } from "@/lib/formatDate";

/** old_value/new_value are stored as JSON text (usually a string array like
 * '["fund_diversion","related_party_misrepresentation"]'); render them as
 * comma-separated tags when they parse as an array, otherwise as raw text.
 * "[]" reads as "(none)" rather than an empty, confusing blank. */
function renderValue(raw: string | null): string {
  if (raw === null) return "(none)";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed.join(", ") : "(none)";
  } catch {
    // not JSON — fall through to raw text
  }
  return raw;
}

export function DataChangeLogClient({ entries }: { entries: DataChangeLogEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.recordRef, e.fieldName, e.reason, e.oldValue ?? "", e.newValue ?? "", e.changedBy].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [entries, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search by record, field, reason, or who changed it…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 w-full max-w-md rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      />
      <p className="mb-3 text-xs text-[var(--color-ink-500)]">
        {filtered.length} of {entries.length} corrections shown, most recent first.
      </p>
      <div className="space-y-3">
        {filtered.map((e) => (
          <div key={e.id} className="rounded-sm border border-[var(--color-border)] bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--color-ink-900)]">{e.recordRef}</span>
              <span className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 font-mono text-xs text-[var(--color-ink-700)]">
                {e.tableName}.{e.fieldName}
              </span>
              <span className="ml-auto text-xs text-[var(--color-ink-500)]">
                {formatDate(e.changedAt)} · {e.changedBy}
              </span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--status-red-text)]">Before</span>
                <p className="text-sm text-[var(--color-ink-700)]">{renderValue(e.oldValue)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--status-green-text)]">After</span>
                <p className="text-sm text-[var(--color-ink-700)]">{renderValue(e.newValue)}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-700)]">{e.reason}</p>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-sm text-[var(--color-ink-500)]">No corrections match this search.</p>}
    </div>
  );
}
