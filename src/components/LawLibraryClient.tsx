"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FindingStatus, LegalInstrument, LegalProvision, ScenarioFinding } from "@/types/domain";
import { Card } from "@/components/Card";
import { sortByProvisionNumber } from "@/lib/provisionOrder";
import { REGULATOR_LABELS, regulatorSlugForAuthority, type RegulatorSlug } from "@/lib/regulators";
import { findingStatusLabel } from "@/lib/findingStatusDisplay";
import { matchScenariosForQuery } from "@/lib/broadScenarioMatch";
import { resolveFixedScenario } from "@/lib/fixedScenarioResolver";

const STATUS_ORDER: FindingStatus[] = [
  "Alleged",
  "Prima facie",
  "Confirmed at interim",
  "Confirmed in Final Order",
  "Partly Confirmed in Final Order",
  "Not Confirmed in Final Order",
  "Withdrawn",
  "Inconclusive",
  "Procedural observation",
];

export function LawLibraryClient({
  instruments,
  provisions,
  findings,
}: {
  instruments: LegalInstrument[];
  provisions: LegalProvision[];
  findings: ScenarioFinding[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FindingStatus>("all");

  const regulatorSlugByInstrumentName = useMemo(() => {
    const map = new Map<string, RegulatorSlug>();
    for (const i of instruments) map.set(i.name, regulatorSlugForAuthority(i.issuingAuthority));
    return map;
  }, [instruments]);

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

  const provisionCountByInstrument = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of provisions) map.set(p.instrument, (map.get(p.instrument) ?? 0) + 1);
    return map;
  }, [provisions]);

  const byRegulator = useMemo(() => {
    const map = new Map<RegulatorSlug, { instrumentCount: number; provisionCount: number }>();
    for (const instrument of instruments) {
      const provisionCount = provisionCountByInstrument.get(instrument.name) ?? 0;
      if (provisionCount === 0) continue; // instrument with nothing cited yet — not a browsable shelf
      const slug = regulatorSlugForAuthority(instrument.issuingAuthority);
      const existing = map.get(slug) ?? { instrumentCount: 0, provisionCount: 0 };
      map.set(slug, { instrumentCount: existing.instrumentCount + 1, provisionCount: existing.provisionCount + provisionCount });
    }
    return map;
  }, [instruments, provisionCountByInstrument]);

  // The most-cited provisions per regulator — a preview shown directly on
  // the landing/browse cards below, rather than leaving each card as just a
  // title and one stat line with the rest of its space empty.
  const topProvisionsByRegulator = useMemo(() => {
    const map = new Map<RegulatorSlug, LegalProvision[]>();
    for (const p of provisions) {
      const slug = regulatorSlugByInstrumentName.get(p.instrument);
      if (!slug) continue;
      map.set(slug, [...(map.get(slug) ?? []), p]);
    }
    for (const [slug, items] of map) {
      map.set(
        slug,
        [...items].sort((a, b) => (findingsByProvision.get(b.id)?.length ?? 0) - (findingsByProvision.get(a.id)?.length ?? 0)).slice(0, 3)
      );
    }
    return map;
  }, [provisions, regulatorSlugByInstrumentName, findingsByProvision]);

  const isFiltering = query.trim().length > 0 || statusFilter !== "all";

  // Fact/concept matching: a precision-first replacement for the previous
  // free-text search over every finding's flattened case name/evidence/
  // actor text (which is exactly what let e.g. Ind AS 7 or Companies Act
  // 180 surface for an RPT query, via an incidental evidence/category tag
  // on an unrelated finding). A query now matches a broad CFID scenario
  // only through the same deterministic concept-tag detection Analyze
  // uses, and only returns that scenario's own precision-vetted,
  // official-source-verified provisions (see fixedScenarioResolver.ts) —
  // never a raw substring hit against a finding's free text.
  const matchedScenarios = useMemo(() => matchScenariosForQuery(query), [query]);
  const scenarioMatchedProvisionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const scenario of matchedScenarios) {
      for (const group of resolveFixedScenario(scenario, provisions).provisionGroups) {
        for (const p of group.items) ids.add(p.id);
      }
    }
    return ids;
  }, [matchedScenarios, provisions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return provisions.filter((p) => {
      const ownFindings = findingsByProvision.get(p.id) ?? [];
      if (statusFilter !== "all" && !ownFindings.some((f) => f.findingStatus === statusFilter)) return false;
      if (!q) return true;
      const provisionText = [p.instrument, p.provisionNumber, p.subject, p.lawLibraryNote].filter(Boolean).join(" ").toLowerCase();
      if (provisionText.includes(q)) return true;
      return scenarioMatchedProvisionIds.has(p.id);
    });
  }, [provisions, findingsByProvision, query, statusFilter, scenarioMatchedProvisionIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, LegalProvision[]>();
    for (const p of filtered) map.set(p.instrument, [...(map.get(p.instrument) ?? []), p]);
    for (const [instrument, items] of map) map.set(instrument, sortByProvisionNumber(items));
    return map;
  }, [filtered]);

  return (
    <div>
      <input
        type="search"
        placeholder='Search by provision, instrument, or a recognised CFID fact pattern, e.g. "related party transactions", "diversion of funds", "Audit Committee composition"…'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full max-w-2xl rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      />
      {matchedScenarios.length > 0 && (
        <p className="mt-2 text-xs text-[var(--color-ink-500)]">
          Matched to the recognised CFID scenario{matchedScenarios.length === 1 ? "" : "s"}:{" "}
          {matchedScenarios.map((s, i) => (
            <span key={s.id}>
              {i > 0 && "; "}
              <span className="font-medium text-[var(--color-ink-700)]">{s.name}</span>
            </span>
          ))}
          . Results below are that scenario&apos;s curated provisions, not every provision that mentions this topic anywhere.
        </p>
      )}

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
            {findingStatusLabel(s)}
          </button>
        ))}
      </div>

      {isFiltering ? (
        <div className="mt-6 space-y-8">
          {[...grouped.entries()].map(([instrument, items]) => {
            const slug = regulatorSlugByInstrumentName.get(instrument);
            return (
              <div key={instrument}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                  {instrument}
                  {slug && <span className="ml-1.5 font-normal normal-case text-[var(--color-ink-500)]">· {REGULATOR_LABELS[slug]}</span>}
                </h2>
                <ul className="mt-2 divide-y divide-[var(--color-border)] rounded-lg bg-white border border-[var(--color-border)]">
                  {items.map((p) => {
                    const ownFindings = findingsByProvision.get(p.id) ?? [];
                    const counts = new Map<FindingStatus, number>();
                    for (const f of ownFindings) counts.set(f.findingStatus, (counts.get(f.findingStatus) ?? 0) + 1);
                    const relatedOrderCount = new Set(ownFindings.flatMap((f) => f.orderIds)).size;
                    return (
                      <li key={p.id}>
                        <Link href={`/provisions/${p.id}`} className="block px-4 py-3 hover:bg-[var(--color-gold-50)]">
                          <div className="font-medium text-[var(--color-ink-900)]">{p.provisionNumber}</div>
                          <div className="text-sm text-[var(--color-ink-700)]">{p.subject}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {[...counts.entries()].map(([status, n]) => (
                              <span key={status} className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs text-[var(--color-ink-700)]">
                                {n} {findingStatusLabel(status).toLowerCase()}
                              </span>
                            ))}
                            {relatedOrderCount > 0 && (
                              <span className="text-xs text-[var(--color-ink-500)]">
                                {relatedOrderCount} related order{relatedOrderCount === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-[var(--color-ink-500)]">No provisions match this search.</p>}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(Object.keys(REGULATOR_LABELS) as RegulatorSlug[]).map((slug) => {
            const stats = byRegulator.get(slug);
            if (!stats) return null;
            const topProvisions = topProvisionsByRegulator.get(slug) ?? [];
            return (
              <Link key={slug} href={`/law-library/${slug}`}>
                <Card className="h-full transition hover:ring-1 hover:ring-[var(--color-gold-600)]">
                  <h2 className="font-serif text-xl font-semibold text-[var(--color-ink-900)]">{REGULATOR_LABELS[slug]}</h2>
                  <p className="mt-2 text-sm text-[var(--color-ink-700)]">
                    {stats.instrumentCount} instrument{stats.instrumentCount === 1 ? "" : "s"} · {stats.provisionCount}{" "}
                    provision{stats.provisionCount === 1 ? "" : "s"} cited
                  </p>
                  {topProvisions.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-[var(--color-border)] pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                        Most-cited provisions
                      </p>
                      {topProvisions.map((p) => (
                        <p key={p.id} className="truncate text-xs text-[var(--color-ink-700)]">
                          <span className="font-medium">{p.provisionNumber}</span> · {p.subject}
                        </p>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
