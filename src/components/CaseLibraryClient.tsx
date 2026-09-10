"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types/domain";
import { SourceLink } from "@/components/Card";
import { formatDate } from "@/lib/formatDate";
import { isDeepAnalyzed } from "@/lib/processingStages";
import { stripPipelineLanguage } from "@/lib/orderGist";
import { CASE_LIBRARY_ORDER_TYPE_FAMILY_ORDER, caseLibraryOrderTypeFamily, type CaseLibraryOrderTypeFamily } from "@/lib/orderTypeDisplayFamily";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";

type IssueRef = { id: string; name: string };
type CaseLibraryOrder = Order & { provisionSearchText: string; issuesExamined: IssueRef[] };

// Chips beyond this count collapse behind "+N more" (item 7: 2-4 principal
// issue labels, not a dump of every structured finding).
const INITIAL_VISIBLE_ISSUES = 3;

export function CaseLibraryClient({ orders }: { orders: CaseLibraryOrder[] }) {
  const [familyFilter, setFamilyFilter] = useState<"all" | CaseLibraryOrderTypeFamily>("all");
  const [issueFilter, setIssueFilter] = useState<"all" | string>("all");
  const [query, setQuery] = useState("");

  // Deterministic issue filter options: only issues actually present in
  // this order set, ordered by the canonical FIXED_SCENARIOS registry (item
  // 8/9) -- never a fuzzy/invented label, never LLM-derived.
  const issuesPresent = useMemo(() => {
    const present = new Set<string>();
    for (const o of orders) for (const issue of o.issuesExamined) present.add(issue.id);
    return FIXED_SCENARIOS.filter((s) => present.has(s.id));
  }, [orders]);

  // Officer-facing display normalization only (Part 3 of the Cases
  // cleanup pass): collapses the exact orderStage values that read as one
  // simple family to an officer scanning the register (e.g. "Interim
  // order" and "Interim order cum show cause notice" both read as
  // "Interim") WITHOUT touching orders.order_type or orderStage itself —
  // see orderTypeDisplayFamily.ts. The full order-type reclassification
  // audit across the corpus is a separate, later workstream.
  const counts = useMemo(() => {
    const map = new Map<CaseLibraryOrderTypeFamily, number>();
    for (const o of orders) {
      const family = caseLibraryOrderTypeFamily(o.orderStage);
      map.set(family, (map.get(family) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  // orders is already sorted newest-first by the server (see
  // sortOrdersNewestFirst) — Array.prototype.filter preserves that order,
  // so filtering/searching here never needs to re-sort.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (familyFilter !== "all" && caseLibraryOrderTypeFamily(o.orderStage) !== familyFilter) return false;
      if (issueFilter !== "all" && !o.issuesExamined.some((issue) => issue.id === issueFilter)) return false;
      if (
        q &&
        ![o.caseName, o.orderNumber, o.scopeNote, o.provisionSearchText, ...o.issuesExamined.map((issue) => issue.name)].some((field) =>
          field?.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [orders, familyFilter, issueFilter, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFamilyFilter("all")}
          className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
            familyFilter === "all" ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
          }`}
        >
          All ({orders.length})
        </button>
        {CASE_LIBRARY_ORDER_TYPE_FAMILY_ORDER.filter((f) => (counts.get(f) ?? 0) > 0).map((f) => (
          <button
            key={f}
            onClick={() => setFamilyFilter(f)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              familyFilter === f ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
            }`}
          >
            {f} ({counts.get(f) ?? 0})
          </button>
        ))}
        {issuesPresent.length > 0 && (
          <select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
            className="rounded-sm border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--color-ink-700)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
            aria-label="Filter by issue examined"
          >
            <option value="all">All issues examined</option>
            {issuesPresent.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="search"
          placeholder="Search case name, order number, provision, or issue (e.g. Regulation 23, Ind AS 24, Diversion)…"
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
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Issues Examined</th>
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
                      <p className="mt-0.5 max-w-md text-xs font-normal text-[var(--color-ink-500)]">{stripPipelineLanguage(o.scopeNote)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-block rounded-sm bg-[var(--color-gold-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-600)]/50">
                      {caseLibraryOrderTypeFamily(o.orderStage)}
                    </span>
                    <div className="mt-1 font-mono text-xs text-[var(--color-ink-700)]">{o.orderNumber ?? "-"}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top text-[var(--color-ink-700)]">{formatDate(o.orderDate) || "-"}</td>
                  <td className="px-3 py-2 align-top">
                    <IssueChips issues={o.issuesExamined} />
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
                      {caseLibraryOrderTypeFamily(o.orderStage)}
                    </span>
                    <span>{formatDate(o.orderDate) || "-"}</span>
                  </div>
                </div>
              </div>
              {deepAnalyzed && o.scopeNote && <p className="mt-1.5 text-xs text-[var(--color-ink-500)]">{stripPipelineLanguage(o.scopeNote)}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--color-ink-700)]">
                <span>{o.orderNumber ?? "-"}</span>
              </div>
              {o.issuesExamined.length > 0 && (
                <div className="mt-1.5">
                  <IssueChips issues={o.issuesExamined} />
                </div>
              )}
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

// "Issues Examined" chips (item 7): broad, concise subject-matter labels an
// officer can scan without opening every order -- deliberately NOT a dump
// of every structured finding (item 8's "same concept = same officer-
// facing label" plus the "2-4 principal issue labels" instruction). This
// means subject matter considered, never violation established/allegation
// upheld -- a Final Order that examined an issue and found the
// contravention not established still lists that issue here.
function IssueChips({ issues }: { issues: IssueRef[] }) {
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 0) {
    return <span className="text-xs text-[var(--color-ink-500)]">-</span>;
  }
  const visible = expanded ? issues : issues.slice(0, INITIAL_VISIBLE_ISSUES);
  const hidden = issues.length - visible.length;
  return (
    <div className="flex max-w-xs flex-wrap items-center gap-1">
      {visible.map((issue) => (
        <span
          key={issue.id}
          className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs text-[var(--color-ink-700)]"
        >
          {issue.name}
        </span>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-[var(--color-gold-700)] hover:underline"
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
}
