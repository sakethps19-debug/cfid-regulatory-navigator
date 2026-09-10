"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FindingStatus, LegalProvision, Order } from "@/types/domain";
import { Card, SourceLink } from "@/components/Card";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/formatDate";
import { findingDispositionLabel } from "@/lib/findingStatusDisplay";
import { NARRATIVE_JUSTIFY_ONLY } from "@/lib/proseClasses";
import {
  comparisonRowMatterLabel,
  type ComparisonRow,
  type ComparisonSortKey,
  filterComparisonRows,
  sortComparisonRows,
} from "@/lib/scenarioComparison";

const SORT_OPTIONS: { value: ComparisonSortKey; label: string }[] = [
  { value: "date_desc", label: "Newest order first" },
  { value: "date_asc", label: "Oldest order first" },
  { value: "stage", label: "By stage" },
  { value: "disposition", label: "By disposition" },
];

/** finding_provisions carries no order-specific column (see
 * scenarioComparison.ts's header comment) -- a provision cited only
 * through a finding that also spans another order is real and traceable
 * to that finding, but not proven specific to THIS order alone. This
 * section's own heading and, where needed, an explicit qualifier note
 * reflect that distinction rather than overclaiming "considered in this
 * order" for every citation. The heading itself only ever downgrades to
 * the conservative wording when this row actually has a finding-level-only
 * citation -- a row whose provenance is genuinely order-specific keeps the
 * plain "Provisions considered in this order" heading. */
function ProvisionsSection({ row, provisionById }: { row: ComparisonRow; provisionById: Map<string, LegalProvision> }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
        {row.hasFindingLevelOnlyProvisionLinkage ? "Provisions linked to matched finding(s)" : "Provisions considered in this order"}
      </p>
      {row.hasFindingLevelOnlyProvisionLinkage && (
        <p className={`mt-0.5 text-[11px] italic text-[var(--color-ink-500)] ${NARRATIVE_JUSTIFY_ONLY}`}>
          Provision linkage is recorded at finding level in the current corpus and may span more than one captured order.
        </p>
      )}
      {row.provisionsConsidered.length === 0 ? (
        <p className="mt-1 text-xs italic text-[var(--color-ink-300)]">No provisions on file for the matched finding(s).</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {row.provisionsConsidered.map((summary) => {
            const provision = provisionById.get(summary.provisionId);
            return (
              <li key={summary.provisionId}>
                <Link
                  href={`/provisions/${summary.provisionId}`}
                  className="inline-flex flex-wrap items-center gap-1 rounded-sm bg-[var(--color-neutral-50)] px-2 py-1 text-xs font-medium text-[var(--color-ink-900)] ring-1 ring-inset ring-[var(--color-border)] hover:bg-[var(--color-gold-50)] hover:text-[var(--color-gold-800)]"
                >
                  {provision ? `${provision.instrument} · ${provision.provisionNumber}` : summary.provisionId}
                  <span className="rounded-sm bg-[var(--color-neutral-100)] px-1 py-0.5 text-[10px] font-normal text-[var(--color-ink-500)]">
                    {summary.legalFunctionLabel}
                  </span>
                  {summary.notUpheldOnly && (
                    <span className="rounded-sm bg-[var(--color-neutral-100)] px-1 py-0.5 text-[10px] font-normal text-[var(--color-ink-500)]">
                      Contravention not established
                    </span>
                  )}
                  {!summary.orderSpecific && (
                    <span
                      className="rounded-sm bg-[var(--color-neutral-100)] px-1 py-0.5 text-[10px] font-normal text-[var(--color-ink-500)]"
                      title="This citation is traceable to a finding that also spans another captured order -- not proven specific to this order alone."
                    >
                      Finding-level
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DispositionBadges({ dispositions }: { dispositions: FindingStatus[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {dispositions.map((d) => (
        <StatusBadge key={d} status={d} />
      ))}
    </div>
  );
}

function DirectionsSummary({ row }: { row: ComparisonRow }) {
  if (row.directions.length === 0) {
    return <p className="text-xs italic text-[var(--color-ink-300)]">No structured directions/outcome captured yet for this order.</p>;
  }
  return (
    <ul className="space-y-1">
      {row.directions.map((d) => (
        <li key={d.id} className={`text-xs text-[var(--color-ink-700)] ${NARRATIVE_JUSTIFY_ONLY}`}>
          {d.directionOrOutcome}
          {d.paragraphReference && <span className="text-[var(--color-ink-500)]"> ({d.paragraphReference})</span>}
        </li>
      ))}
    </ul>
  );
}

function orderTitle(order: Order): { title: string; unverifiedTitle: boolean } {
  return order.officialOrderTitle
    ? { title: order.officialOrderTitle, unverifiedTitle: false }
    : { title: order.caseName, unverifiedTitle: true };
}

export function CompareScenariosResultClient({ rows, provisions }: { rows: ComparisonRow[]; provisions: LegalProvision[] }) {
  const provisionById = useMemo(() => new Map(provisions.map((p) => [p.id, p])), [provisions]);

  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dispositionFilter, setDispositionFilter] = useState<string>("all");
  const [provisionFilter, setProvisionFilter] = useState<string>("all");
  const [matterFilter, setMatterFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortKey, setSortKey] = useState<ComparisonSortKey>("date_desc");

  const stageOptions = useMemo(() => [...new Set(rows.map((r) => r.order.orderStage))], [rows]);
  // Independent-audit correction (P1-9): the disposition filter must never
  // render a raw FindingStatus enum value as an option -- "Alleged" and
  // "Prima facie" carry no actual disposition (findingDispositionLabel
  // returns null for both) and are excluded here entirely rather than
  // given a fabricated disposition label just to make the filter list
  // complete. A row with only those statuses remains findable via every
  // other filter (stage, provision, matter, date); it simply has no
  // "by disposition" option of its own.
  const dispositionOptions = useMemo(() => {
    const statuses = [...new Set(rows.flatMap((r) => r.dispositions))];
    return statuses
      .map((status) => ({ status, label: findingDispositionLabel(status) }))
      .filter((o): o is { status: FindingStatus; label: string } => o.label !== null);
  }, [rows]);
  const provisionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      for (const { provisionId } of r.provisionsConsidered) {
        if (map.has(provisionId)) continue;
        const p = provisionById.get(provisionId);
        map.set(provisionId, p ? `${p.instrument} · ${p.provisionNumber}` : provisionId);
      }
    }
    return [...map.entries()];
  }, [rows, provisionById]);
  const matterOptions = useMemo(() => [...new Set(rows.map(comparisonRowMatterLabel))], [rows]);

  const filtered = useMemo(
    () =>
      filterComparisonRows(rows, {
        stage: stageFilter === "all" ? undefined : (stageFilter as Order["orderStage"]),
        disposition: dispositionFilter === "all" ? undefined : (dispositionFilter as FindingStatus),
        provisionId: provisionFilter === "all" ? undefined : provisionFilter,
        matterLabel: matterFilter === "all" ? undefined : matterFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [rows, stageFilter, dispositionFilter, provisionFilter, matterFilter, dateFrom, dateTo]
  );

  const sorted = useMemo(() => sortComparisonRows(filtered, sortKey), [filtered, sortKey]);

  const selectClass =
    "rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-sm text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]";

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-700)]">
          Stage
          <select className={selectClass} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">All stages</option>
            {stageOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-700)]">
          Disposition
          <select className={selectClass} value={dispositionFilter} onChange={(e) => setDispositionFilter(e.target.value)}>
            <option value="all">All dispositions</option>
            {dispositionOptions.map((o) => (
              <option key={o.status} value={o.status}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-700)]">
          Provision
          <select className={selectClass} value={provisionFilter} onChange={(e) => setProvisionFilter(e.target.value)}>
            <option value="all">All provisions</option>
            {provisionOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-700)]">
          Matter
          <select className={selectClass} value={matterFilter} onChange={(e) => setMatterFilter(e.target.value)}>
            <option value="all">All matters</option>
            {matterOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-700)]">
          From
          <input type="date" className={selectClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-700)]">
          To
          <input type="date" className={selectClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label className="ml-auto flex flex-col gap-1 text-xs font-medium text-[var(--color-ink-700)]">
          Sort
          <select className={selectClass} value={sortKey} onChange={(e) => setSortKey(e.target.value as ComparisonSortKey)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-[var(--color-ink-500)]">
        {sorted.length} of {rows.length} order{rows.length === 1 ? "" : "s"} shown.
      </p>

      {/* Desktop/tablet: full comparison table. */}
      <div className="mt-2 hidden overflow-x-auto rounded-sm bg-white border border-[var(--color-border)] md:block">
        <table className="w-full min-w-[1200px] divide-y divide-[var(--color-border)] text-sm">
          <thead>
            <tr className="bg-[var(--color-neutral-50)]">
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Matter</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Order</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Date</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Stage</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Broad factual issue</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Disposition</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Provisions</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Outcome / directions</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sorted.map((row) => {
              const { title, unverifiedTitle } = orderTitle(row.order);
              return (
                <tr key={row.order.id}>
                  <td className="px-3 py-2 align-top text-[var(--color-ink-900)]">{comparisonRowMatterLabel(row)}</td>
                  <td className="max-w-xs px-3 py-2 align-top">
                    <Link href={`/orders/${row.order.id}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                      {title}
                    </Link>
                    {unverifiedTitle && <p className="mt-0.5 text-[11px] italic text-[var(--color-ink-300)]">Exact order title not yet captured</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top text-[var(--color-ink-700)]">{formatDate(row.order.orderDate) || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <OrderStageBadge orderStage={row.order.orderStage} />
                  </td>
                  <td className="max-w-xs px-3 py-2 align-top text-[var(--color-ink-700)]">
                    {[...new Set(row.findings.map((f) => f.scenarioTitle))].join("; ")}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <DispositionBadges dispositions={row.dispositions} />
                  </td>
                  <td className="max-w-xs px-3 py-2 align-top">
                    <ProvisionsSection row={row} provisionById={provisionById} />
                  </td>
                  <td className="max-w-xs px-3 py-2 align-top">
                    <DirectionsSummary row={row} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <SourceLink href={row.order.officialUrl} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="p-4 text-sm text-[var(--color-ink-500)]">No captured orders match this filter.</p>}
      </div>

      {/* Mobile: stacked comparison cards, same information, no columns to
          squeeze. */}
      <div className="mt-2 space-y-3 md:hidden">
        {sorted.map((row) => {
          const { title, unverifiedTitle } = orderTitle(row.order);
          return (
            <Card key={row.order.id}>
              <p className="text-xs text-[var(--color-ink-500)]">{comparisonRowMatterLabel(row)}</p>
              <Link href={`/orders/${row.order.id}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                {title}
              </Link>
              {unverifiedTitle && <p className="text-[11px] italic text-[var(--color-ink-300)]">Exact order title not yet captured</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <OrderStageBadge orderStage={row.order.orderStage} />
                <span className="text-xs text-[var(--color-ink-700)]">{formatDate(row.order.orderDate) || "-"}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-ink-700)]">{[...new Set(row.findings.map((f) => f.scenarioTitle))].join("; ")}</p>
              <div className="mt-2">
                <DispositionBadges dispositions={row.dispositions} />
              </div>
              <div className="mt-2">
                <ProvisionsSection row={row} provisionById={provisionById} />
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Outcome / directions</p>
                <DirectionsSummary row={row} />
              </div>
              <div className="mt-2">
                <SourceLink href={row.order.officialUrl} />
              </div>
            </Card>
          );
        })}
        {sorted.length === 0 && <p className="rounded-sm bg-white p-4 text-sm text-[var(--color-ink-500)] border border-[var(--color-border)]">No captured orders match this filter.</p>}
      </div>
    </div>
  );
}
