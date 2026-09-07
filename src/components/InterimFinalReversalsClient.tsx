"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Order, ScenarioFinding } from "@/types/domain";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { isDeepAnalyzed } from "@/lib/processingStages";

function orderLink(order: Order | undefined): { href: string; label: string } | null {
  if (!order) return null;
  if (!isDeepAnalyzed(order.processingStage)) return { href: "", label: order.orderStage };
  return { href: `/orders/${order.id}`, label: order.orderStage };
}

function StageOrderLink({ order, fallbackLabel }: { order: Order | undefined; fallbackLabel: string }) {
  const link = orderLink(order);
  if (!link) return <span className="text-[var(--color-ink-500)]">{fallbackLabel}</span>;
  if (!link.href) return <span>{link.label}</span>;
  return (
    <Link href={link.href} className="text-[var(--color-gold-700)] hover:underline">
      {link.label}
    </Link>
  );
}

export function InterimFinalReversalsClient({ findings, orders }: { findings: ScenarioFinding[]; orders: Order[] }) {
  const [query, setQuery] = useState("");

  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return findings;
    return findings.filter((f) =>
      [f.caseName, f.recordId, f.scenarioTitle, f.factualPattern, f.qualification].some((field) =>
        field?.toLowerCase().includes(q)
      )
    );
  }, [findings, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search case name, record ID, or scenario text…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full max-w-2xl rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      />
      <p className="mt-2 text-xs text-[var(--color-ink-500)]">
        {filtered.length} of {findings.length} shown.
      </p>

      <div className="mt-4 space-y-4">
        {filtered.map((f) => {
          // orderIds is built (see lib/data.ts mapFinding) as [order_id,
          // final_order_id].filter(Boolean) — position 0 is always the
          // order the finding was extracted from (the earlier stage, for a
          // reversal), position 1 (when present) the order that disposed of
          // it. Neither is necessarily literally an "Interim order"/"Final
          // order" (e.g. a confirmatory order reciting the interim
          // allegations, or a revocation order disposing of an earlier
          // restraint) — StageOrderLink shows each order's own actual
          // orderStage rather than assuming one.
          const interimOrder = orderById.get(f.orderIds[0]);
          const finalOrder = f.orderIds[1] ? orderById.get(f.orderIds[1]) : undefined;
          return (
            <Card key={f.recordId}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-[var(--color-ink-500)]">{f.recordId}</span>
                  <h3 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">{f.caseName}</h3>
                </div>
                <StatusBadge status={f.findingStatus} />
              </div>
              <p className="mt-2 text-sm text-[var(--color-ink-800)]">{f.scenarioTitle}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-[var(--color-gold-600)]/40 bg-[var(--color-gold-50)]/60 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gold-800)]">
                    Earlier stage — <StageOrderLink order={interimOrder} fallbackLabel="order not in this register" />
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--color-ink-700)]">{f.interimParagraphReferences}</p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-neutral-50)] p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-700)]">
                    Final disposition — <StageOrderLink order={finalOrder} fallbackLabel="order not in this register" />
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--color-ink-700)]">{f.finalParagraphReferences}</p>
                </div>
              </div>

              {f.qualification && (
                <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Why the outcome changed</div>
                  <p className="mt-1 text-sm text-[var(--color-ink-700)]">{f.qualification}</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <SourceLink href={f.officialSourceUrl} />
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-[var(--color-ink-500)]">No reversals match this search.</p>}
      </div>
    </div>
  );
}
