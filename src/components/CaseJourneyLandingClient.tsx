"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MatterWithOrderCount } from "@/lib/caseJourney";
import { Card } from "@/components/Card";

/** Case Journey landing: officer selects/searches for a matter. Only
 * matters that already have at least one captured order are ever passed in
 * here (see mattersWithAtLeastOneOrder) — this component performs no
 * further filtering of that kind, only a client-side text search over the
 * already-curated matter name. */
export function CaseJourneyLandingClient({ matters }: { matters: MatterWithOrderCount[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matters;
    return matters.filter((m) => m.matter.normalizedMatterName.toLowerCase().includes(q));
  }, [matters, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search by matter name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full max-w-2xl rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      />
      <p className="mt-3 text-xs text-[var(--color-ink-500)]">
        {filtered.length} of {matters.length} matters shown — only matters with at least one captured order appear here.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ matter, orderCount }) => (
          <Link key={matter.id} href={`/case-journey/${matter.id}`}>
            <Card className="h-full transition hover:ring-1 hover:ring-[var(--color-gold-600)]">
              <h2 className="font-serif text-base font-semibold text-[var(--color-ink-900)]">{matter.normalizedMatterName}</h2>
              <p className="mt-1.5 text-sm text-[var(--color-ink-700)]">
                {orderCount === 1 ? "Only one order currently captured" : `${orderCount} orders currently captured`}
              </p>
              {matter.description && <p className="mt-2 max-w-prose text-xs text-[var(--color-ink-500)]">{matter.description}</p>}
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-[var(--color-ink-500)]">No matters match this search.</p>}
      </div>
    </div>
  );
}
