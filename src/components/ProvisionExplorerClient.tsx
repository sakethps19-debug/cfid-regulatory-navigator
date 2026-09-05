"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FindingStatus, LegalProvision, ScenarioFinding } from "@/types/domain";

const STATUS_ORDER: FindingStatus[] = [
  "Alleged",
  "Prima facie",
  "Confirmed at interim",
  "Upheld",
  "Partly upheld",
  "Not upheld",
  "Withdrawn",
  "Inconclusive",
  "Procedural observation",
];

function humanizeTag(id: string): string {
  return id.replace(/_/g, " ");
}

/** Every word a finding might reasonably be found by, beyond the provision's
 * own fields — so a free-text search for e.g. "related party transactions"
 * or "diversion of issue proceeds" surfaces the right provisions even when
 * those exact words never appear in the provision's own subject line. This
 * is what makes the Provision Explorer work identically for every provision
 * rather than needing a hand-built page per topic. */
function findingSearchText(f: ScenarioFinding): string {
  return [
    f.caseName,
    f.category,
    f.scenarioTitle,
    f.factualPattern,
    f.findingStatus,
    ...f.transactionTypes.map(humanizeTag),
    ...f.actorRoles.map(humanizeTag),
    ...f.allegedConduct.map(humanizeTag),
    ...f.evidenceTypes.map(humanizeTag),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ProvisionExplorerClient({
  provisions,
  findings,
}: {
  provisions: LegalProvision[];
  findings: ScenarioFinding[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FindingStatus>("all");

  const findingsByProvision = useMemo(() => {
    const map = new Map<string, ScenarioFinding[]>();
    for (const f of findings) {
      for (const provisionId of f.provisionIds) {
        map.set(provisionId, [...(map.get(provisionId) ?? []), f]);
      }
    }
    return map;
  }, [findings]);

  const statusesPresent = useMemo(() => {
    const set = new Set(findings.map((f) => f.findingStatus));
    return STATUS_ORDER.filter((s) => set.has(s));
  }, [findings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return provisions.filter((p) => {
      const ownFindings = findingsByProvision.get(p.id) ?? [];
      if (statusFilter !== "all" && !ownFindings.some((f) => f.findingStatus === statusFilter)) return false;
      if (!q) return true;
      const provisionText = [p.instrument, p.provisionNumber, p.subject, p.lawLibraryNote].filter(Boolean).join(" ").toLowerCase();
      if (provisionText.includes(q)) return true;
      return ownFindings.some((f) => findingSearchText(f).includes(q));
    });
  }, [provisions, findingsByProvision, query, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, LegalProvision[]>();
    for (const p of filtered) map.set(p.instrument, [...(map.get(p.instrument) ?? []), p]);
    return map;
  }, [filtered]);

  return (
    <div>
      <input
        type="search"
        placeholder='Search by provision, instrument, or facts — e.g. "related party transactions", "diversion of issue proceeds", "Audit Committee composition"…'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full max-w-2xl rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
            statusFilter === "all" ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
          }`}
        >
          All statuses
        </button>
        {statusesPresent.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              statusFilter === s ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-8">
        {[...grouped.entries()].map(([instrument, items]) => (
          <div key={instrument}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">{instrument}</h2>
            <ul className="mt-2 divide-y divide-[var(--color-border)] rounded-lg bg-white border border-[var(--color-border)]">
              {items.map((p) => {
                const ownFindings = findingsByProvision.get(p.id) ?? [];
                const counts = new Map<FindingStatus, number>();
                for (const f of ownFindings) counts.set(f.findingStatus, (counts.get(f.findingStatus) ?? 0) + 1);
                return (
                  <li key={p.id}>
                    <Link href={`/provisions/${p.id}`} className="block px-4 py-3 hover:bg-[var(--color-gold-50)]">
                      <div className="font-medium text-[var(--color-ink-900)]">{p.provisionNumber}</div>
                      <div className="text-sm text-[var(--color-ink-700)]">{p.subject}</div>
                      {counts.size > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {[...counts.entries()].map(([status, n]) => (
                            <span key={status} className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs text-[var(--color-ink-700)]">
                              {n} {status.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-[var(--color-ink-500)]">No provisions match this search.</p>}
      </div>
    </div>
  );
}
