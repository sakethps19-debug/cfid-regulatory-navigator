"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicationStatus, ScenarioFinding, ValidationIssue } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { LegalReviewBadge } from "@/components/LegalReviewBadge";
import { SourceLink } from "@/components/Card";
import { findingStatusLabel } from "@/lib/findingStatusDisplay";

export interface QueueRow {
  finding: ScenarioFinding;
  orders: { id: string; caseName: string; orderStage: string; orderNumber: string | null }[];
  matterName: string | null;
  linkedValidationIssues: ValidationIssue[];
}

type VerificationFilterKey = "reviewPending" | "citationUnverified" | "provisionUnverified" | "statusUnverified" | "noticeeUnverified";

const VERIFICATION_FILTERS: { key: VerificationFilterKey; label: string; test: (f: ScenarioFinding) => boolean }[] = [
  { key: "reviewPending", label: "Human review pending", test: (f) => !f.humanLegalReviewCompleted },
  { key: "citationUnverified", label: "Paragraph citation unverified", test: (f) => !f.paragraphCitationVerified },
  { key: "provisionUnverified", label: "Provision mapping unverified", test: (f) => !f.provisionMappingVerified },
  { key: "statusUnverified", label: "Finding status unverified", test: (f) => !f.findingStatusVerified },
  { key: "noticeeUnverified", label: "Noticee mapping unverified", test: (f) => !f.noticeeMappingVerified },
];

const VERIFICATION_ROWS: { label: string; test: (f: ScenarioFinding) => boolean }[] = [
  { label: "Source document verified", test: (f) => f.sourceDocumentVerified },
  { label: "Paragraph citation verified", test: (f) => f.paragraphCitationVerified },
  { label: "Finding status verified", test: (f) => f.findingStatusVerified },
  { label: "Provision mapping verified", test: (f) => f.provisionMappingVerified },
  { label: "Noticee mapping verified", test: (f) => f.noticeeMappingVerified },
];

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        verified
          ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)] border-[var(--status-green-ring)]"
          : "bg-[var(--color-neutral-100)] text-[var(--color-ink-500)] border-[var(--color-border)]"
      }`}
    >
      {verified ? "✓" : "○"} {label}
    </span>
  );
}

/** Per-provision cited-only vs outcome-determining summary for this
 * finding, from provisionLinks[].relationship (see
 * src/app/(app)/provisions/[id]/page.tsx for the same distinction applied
 * to a single provision) — "upheld"/"not_upheld" means the provision was
 * the basis of this finding's own disposition, "alleged" or unset means it
 * was cited/considered without being that basis. */
export function provisionRelationshipSummary(finding: ScenarioFinding): string {
  const total = finding.provisionLinks.length;
  if (total === 0) return "No provisions mapped";
  const outcomeDetermining = finding.provisionLinks.filter((l) => l.relationship === "upheld" || l.relationship === "not_upheld").length;
  return `${outcomeDetermining} of ${total} provision${total === 1 ? "" : "s"} outcome-determining, ${total - outcomeDetermining} cited/considered only`;
}

function humanize(id: string): string {
  return id.replace(/_/g, " ");
}

export function LegalReviewQueueClient({ rows }: { rows: QueueRow[] }) {
  const [activeVerificationFilters, setActiveVerificationFilters] = useState<Set<VerificationFilterKey>>(new Set());
  const [publicationFilter, setPublicationFilter] = useState<"all" | PublicationStatus>("all");
  const [orderFilter, setOrderFilter] = useState<"all" | string>("all");
  const [matterFilter, setMatterFilter] = useState<"all" | string>("all");

  const orderOptions = useMemo(
    () => [...new Set(rows.flatMap((r) => r.orders.map((o) => o.caseName)))].sort(),
    [rows]
  );
  const matterOptions = useMemo(
    () => [...new Set(rows.map((r) => r.matterName).filter((m): m is string => Boolean(m)))].sort(),
    [rows]
  );
  const publicationOptions = useMemo(
    () => [...new Set(rows.map((r) => r.finding.publicationStatus))].sort(),
    [rows]
  );

  function toggleVerificationFilter(key: VerificationFilterKey) {
    setActiveVerificationFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return rows.filter(({ finding, orders, matterName }) => {
      for (const key of activeVerificationFilters) {
        const filterDef = VERIFICATION_FILTERS.find((f) => f.key === key);
        if (filterDef && !filterDef.test(finding)) return false;
      }
      if (publicationFilter !== "all" && finding.publicationStatus !== publicationFilter) return false;
      if (orderFilter !== "all" && !orders.some((o) => o.caseName === orderFilter)) return false;
      if (matterFilter !== "all" && matterName !== matterFilter) return false;
      return true;
    });
  }, [rows, activeVerificationFilters, publicationFilter, orderFilter, matterFilter]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {VERIFICATION_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleVerificationFilter(key)}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
              activeVerificationFilters.has(key)
                ? "bg-[var(--color-gold-700)] text-white ring-[var(--color-gold-700)]"
                : "bg-white text-[var(--color-ink-700)] border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="text-xs text-[var(--color-ink-700)]">
          Publication status
          <select
            value={publicationFilter}
            onChange={(e) => setPublicationFilter(e.target.value as typeof publicationFilter)}
            className="ml-2 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-ink-900)]"
          >
            <option value="all">All</option>
            {publicationOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--color-ink-700)]">
          Order
          <select
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            className="ml-2 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-ink-900)]"
          >
            <option value="all">All</option>
            {orderOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--color-ink-700)]">
          Matter
          <select
            value={matterFilter}
            onChange={(e) => setMatterFilter(e.target.value)}
            className="ml-2 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-ink-900)]"
          >
            <option value="all">All</option>
            {matterOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-[var(--color-ink-500)]">
        {filtered.length} of {rows.length} scenario findings shown.
      </p>

      <div className="mt-3 space-y-3">
        {filtered.map(({ finding: f, orders, matterName, linkedValidationIssues }) => (
          <div key={f.recordId} className="rounded-sm bg-white p-4 border border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[var(--color-ink-900)]">{f.recordId}</span>
              <span className="text-sm text-[var(--color-ink-700)]">{f.caseName}</span>
              <StatusBadge status={f.findingStatus} />
              <LegalReviewBadge reviewed={f.humanLegalReviewCompleted} />
              <span className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs text-[var(--color-ink-700)]">
                {f.publicationStatus}
              </span>
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Matter / order</p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">
                  {matterName ?? "No matter link recorded"}
                  {orders.length > 0 && (
                    <>
                      {" — "}
                      {orders.map((o, i) => (
                        <span key={o.id}>
                          {i > 0 && "; "}
                          {o.orderStage}
                          {o.orderNumber ? ` (${o.orderNumber})` : ""}
                        </span>
                      ))}
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Official source</p>
                <div className="mt-0.5">
                  <SourceLink href={f.officialSourceUrl} />
                </div>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Scenario title</p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-900)]">{f.scenarioTitle}</p>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Factual pattern</p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">{f.factualPattern}</p>
            </div>
            {f.allegationText && (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Allegation</p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">{f.allegationText}</p>
              </div>
            )}

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Paragraph references</p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
                  {f.interimParagraphReferences && <span>Interim: {f.interimParagraphReferences}. </span>}
                  {f.finalParagraphReferences && <span>Final: {f.finalParagraphReferences}.</span>}
                  {!f.interimParagraphReferences && !f.finalParagraphReferences && "None recorded"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order stage · outcome</p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">{findingStatusLabel(f.findingStatus)}</p>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Mapped provisions</p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">
                {f.provisionIds.length > 0 ? f.provisionIds.join(", ") : "None mapped"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{provisionRelationshipSummary(f)}</p>
            </div>

            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Actor roles</p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-700)]">{f.actorRoles.map(humanize).join(", ") || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Transaction types</p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-700)]">{f.transactionTypes.map(humanize).join(", ") || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Alleged conduct</p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-700)]">{f.allegedConduct.map(humanize).join(", ") || "-"}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Evidence indicators</p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-700)]">{f.evidenceTypes.map(humanize).join(", ") || "-"}</p>
            </div>

            {f.evidentiaryGaps.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                  Genuine evidentiary gaps
                </p>
                <ul className="mt-0.5 list-inside list-disc text-xs text-[var(--color-ink-700)]">
                  {f.evidentiaryGaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {f.precedentOutcomeNote && (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Precedent outcome note</p>
                <p className="mt-0.5 text-xs italic text-[var(--color-ink-700)]">{f.precedentOutcomeNote}</p>
              </div>
            )}
            {f.qualification && (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Qualification / note</p>
                <p className="mt-0.5 text-xs italic text-[var(--color-ink-700)]">{f.qualification}</p>
              </div>
            )}

            <div className="mt-3 border-t border-[var(--color-border)] pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Verification record</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {VERIFICATION_ROWS.map(({ label, test }) => (
                  <VerificationBadge key={label} verified={test(f)} label={label} />
                ))}
              </div>
            </div>

            {linkedValidationIssues.length > 0 && (
              <div className="mt-2 rounded-sm bg-[var(--color-neutral-50)] p-2.5 ring-1 border-[var(--color-border)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                  Linked validation issues ({linkedValidationIssues.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {linkedValidationIssues.map((issue) => (
                    <li key={issue.id} className="text-xs text-[var(--color-ink-700)]">
                      [{issue.severity}] {issue.description} {issue.resolved ? "(resolved)" : "(open)"}
                    </li>
                  ))}
                </ul>
                <Link href="/admin/validation-issues" className="mt-1 inline-block text-xs font-medium text-[var(--color-gold-700)] hover:underline">
                  View in Validation Issues →
                </Link>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-sm bg-white p-4 text-sm text-[var(--color-ink-500)] border border-[var(--color-border)]">
            No scenario findings match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
