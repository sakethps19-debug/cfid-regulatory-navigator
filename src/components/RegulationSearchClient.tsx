"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LegalProvision } from "@/types/domain";

export function RegulationSearchClient({ provisions }: { provisions: LegalProvision[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return provisions;
    return provisions.filter((p) =>
      [p.instrument, p.provisionNumber, p.subject, p.treatmentInPilotOrders].join(" ").toLowerCase().includes(q)
    );
  }, [provisions, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, LegalProvision[]>();
    for (const p of filtered) map.set(p.instrument, [...(map.get(p.instrument) ?? []), p]);
    return map;
  }, [filtered]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search by instrument, provision number, or subject (e.g. 4(2)(e), preferential allotment, LODR)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full max-w-xl rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <div className="mt-6 space-y-8">
        {[...grouped.entries()].map(([instrument, items]) => (
          <div key={instrument}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{instrument}</h2>
            <ul className="mt-2 divide-y divide-slate-200 rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
              {items.map((p) => (
                <li key={p.id}>
                  <Link href={`/regulations/${p.id}`} className="block px-4 py-3 hover:bg-blue-50">
                    <div className="font-medium text-slate-900">{p.provisionNumber}</div>
                    <div className="text-sm text-slate-600">{p.subject}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500">No provisions match this search.</p>}
      </div>
    </div>
  );
}
