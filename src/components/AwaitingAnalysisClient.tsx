"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ResidualEntryStatus, ResidualOrderRow, VerifiedCfidOrderRow, VerifiedOrderAnalysisStatus } from "@/types/domain";
import { SourceLink } from "@/components/Card";

const ANALYSIS_LABELS: Record<VerifiedOrderAnalysisStatus, string> = {
  deep_analyzed: "Deep-analyzed (in precedent library)",
  verified_pending_analysis: "Verified — awaiting detailed analysis",
};

const ANALYSIS_STYLES: Record<VerifiedOrderAnalysisStatus, string> = {
  deep_analyzed: "bg-[#e6ede3] text-[#204a2e] border-[#a9c2a0]",
  verified_pending_analysis: "bg-[#f5ecd9] text-[#7a5310] border-[#dfc98f]",
};

const RESIDUAL_LABELS: Record<ResidualEntryStatus, string> = {
  pending_link: "Awaiting link from user",
  duplicate_of_verified: "Duplicate of a verified order",
  not_cfid: "Not a CFID order",
};

const RESIDUAL_STYLES: Record<ResidualEntryStatus, string> = {
  pending_link: "bg-[#f5ecd9] text-[#7a5310] border-[#dfc98f]",
  duplicate_of_verified: "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)] border-[var(--color-border)]",
  not_cfid: "bg-[#f1e3df] text-[#7a2a1f] border-[#dcaa9a]",
};

type Tab = "verified" | "residual";

function VerifiedOrdersTable({ rows }: { rows: VerifiedCfidOrderRow[] }) {
  const [filter, setFilter] = useState<"all" | VerifiedOrderAnalysisStatus>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.analysisStatus !== filter) return false;
      if (query.trim() && !r.caseName.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, query]);

  const deepCount = rows.filter((r) => r.analysisStatus === "deep_analyzed").length;
  const pendingCount = rows.filter((r) => r.analysisStatus === "verified_pending_analysis").length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as const, label: `All (${rows.length})` },
            { key: "deep_analyzed" as const, label: `Deep-analyzed (${deepCount})` },
            { key: "verified_pending_analysis" as const, label: `Awaiting analysis (${pendingCount})` },
          ]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              filter === f.key ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="search"
          placeholder="Search case name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm bg-white border border-[var(--color-border)]">
        <table className="w-full min-w-[820px] divide-y divide-[var(--color-border)] text-sm">
          <thead>
            <tr className="bg-[var(--color-neutral-50)]">
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Case name</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Order identifier</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 align-top font-medium text-[var(--color-ink-900)]">{r.caseName}</td>
                <td className="px-3 py-2 align-top font-mono text-xs text-[var(--color-ink-700)]">{r.orderIdentifier}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ANALYSIS_STYLES[r.analysisStatus]}`}>
                    {ANALYSIS_LABELS[r.analysisStatus]}
                  </span>
                  {r.analysisStatus === "deep_analyzed" && r.linkedOrderIds[0] && (
                    <Link href={`/orders/${r.linkedOrderIds[0]}`} className="ml-2 text-xs font-medium text-[var(--color-gold-700)] hover:underline">
                      View →
                    </Link>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <SourceLink href={r.officialUrl} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-[var(--color-ink-500)]">No rows match this filter.</p>}
      </div>
    </div>
  );
}

function ResidualTable({ rows }: { rows: ResidualOrderRow[] }) {
  const [filter, setFilter] = useState<"all" | ResidualEntryStatus>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (query.trim() && !r.caseOrOrderName.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, query]);

  const counts = {
    pending_link: rows.filter((r) => r.status === "pending_link").length,
    duplicate_of_verified: rows.filter((r) => r.status === "duplicate_of_verified").length,
    not_cfid: rows.filter((r) => r.status === "not_cfid").length,
  };

  return (
    <div>
      <div className="mb-4 rounded-md bg-[var(--color-gold-50)] p-3 text-xs text-[#7a5310] ring-1 border-[#dfc98f]">
        This register is an exclusion and pending-link list only. Nothing here is used as a substantive CFID
        precedent unless it is subsequently verified and moved into the Verified CFID Orders list above.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as const, label: `All (${rows.length})` },
            { key: "pending_link" as const, label: `Awaiting link (${counts.pending_link})` },
            { key: "duplicate_of_verified" as const, label: `Duplicates (${counts.duplicate_of_verified})` },
            { key: "not_cfid" as const, label: `Not CFID (${counts.not_cfid})` },
          ]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              filter === f.key ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]" : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="search"
          placeholder="Search case name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm bg-white border border-[var(--color-border)]">
        <table className="w-full min-w-[820px] divide-y divide-[var(--color-border)] text-sm">
          <thead>
            <tr className="bg-[var(--color-neutral-50)]">
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Case / order name</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Reason</th>
              <th className="px-3 py-2 text-left font-semibold text-[var(--color-ink-700)]">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 align-top font-medium text-[var(--color-ink-900)]">{r.caseOrOrderName}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${RESIDUAL_STYLES[r.status]}`}>
                    {RESIDUAL_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-3 py-2 align-top text-xs text-[var(--color-ink-500)]">{r.reason}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  {r.officialUrl ? <SourceLink href={r.officialUrl} /> : <span className="text-[var(--color-ink-300)]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-sm text-[var(--color-ink-500)]">No rows match this filter.</p>}
      </div>
    </div>
  );
}

export function AwaitingAnalysisClient({
  verifiedRows,
  residualRows,
}: {
  verifiedRows: VerifiedCfidOrderRow[];
  residualRows: ResidualOrderRow[];
}) {
  const [tab, setTab] = useState<Tab>("verified");

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b border-[var(--color-border)]">
        <button
          onClick={() => setTab("verified")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "verified" ? "border-[var(--color-gold-700)] text-[var(--color-gold-700)]" : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
          }`}
        >
          Verified CFID Orders ({verifiedRows.length})
        </button>
        <button
          onClick={() => setTab("residual")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "residual" ? "border-[var(--color-gold-700)] text-[var(--color-gold-700)]" : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
          }`}
        >
          Residual Register ({residualRows.length})
        </button>
      </div>

      {tab === "verified" ? <VerifiedOrdersTable rows={verifiedRows} /> : <ResidualTable rows={residualRows} />}
    </div>
  );
}
