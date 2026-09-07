"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ScenarioFinding } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { LegalReviewBadge } from "@/components/LegalReviewBadge";
import { SourceLink } from "@/components/Card";

const DEFAULT_LEFT_ID = "SSSL-02";
const DEFAULT_RIGHT_ID = "SSSL-03";
const MAX_VISIBLE_MATCHES = 30;

interface CompareField {
  label: string;
  render: (f: ScenarioFinding) => React.ReactNode;
  /** Long free-text fields get a collapse/expand toggle rather than
   * rendering in full by default — a factual pattern can run to several
   * paragraphs, which made both the table and (especially) the mobile
   * stacked view very long to scroll past just to reach the next field. */
  long?: boolean;
}

const FIELDS: CompareField[] = [
  { label: "Case", render: (f) => f.caseName },
  { label: "Category", render: (f) => f.category },
  { label: "Scenario title", render: (f) => f.scenarioTitle },
  { label: "Factual pattern", render: (f) => f.factualPattern, long: true },
  { label: "Provisions considered", render: (f) => f.provisionsConsideredRaw, long: true },
  { label: "Noticees / actors", render: (f) => f.noticeeActors.join("; ") },
  { label: "Finding status", render: (f) => <StatusBadge status={f.findingStatus} /> },
  { label: "Human legal review", render: (f) => <LegalReviewBadge reviewed={f.humanLegalReviewCompleted} /> },
  { label: "Interim paragraph references", render: (f) => f.interimParagraphReferences ?? "-" },
  { label: "Final paragraph references", render: (f) => f.finalParagraphReferences ?? "-" },
  { label: "Qualification / note", render: (f) => f.qualification ?? "-" },
  { label: "Missing facts / evidence (present-scenario gaps)", render: (f) => (f.evidentiaryGaps.length ? f.evidentiaryGaps.join("; ") : "-") },
  { label: "Outcome in this precedent", render: (f) => f.precedentOutcomeNote ?? "-" },
  { label: "Official source", render: (f) => <SourceLink href={f.officialSourceUrl} /> },
];

const LONG_TEXT_PREVIEW_CHARS = 220;

/** Renders a field's value, truncating with a Show more/less toggle for
 * fields flagged `long` when the rendered value is a plain string past the
 * preview length -- badges, links and short values render exactly as
 * before, untouched. */
function FieldValue({ field, finding }: { field: CompareField; finding: ScenarioFinding }) {
  const [expanded, setExpanded] = useState(false);
  const value = field.render(finding);
  if (!field.long || typeof value !== "string" || value.length <= LONG_TEXT_PREVIEW_CHARS) {
    return <>{value}</>;
  }
  return (
    <div>
      {expanded ? value : `${value.slice(0, LONG_TEXT_PREVIEW_CHARS)}…`}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="ml-1.5 text-xs font-medium text-[var(--color-gold-700)] hover:underline"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

function findingLabel(f: ScenarioFinding): string {
  return `${f.recordId} · ${f.caseName}: ${f.scenarioTitle}`;
}

function FindingPicker({
  findings,
  value,
  onChange,
  label,
}: {
  findings: ScenarioFinding[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const selected = findings.find((f) => f.recordId === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? findings.filter(
          (f) =>
            f.recordId.toLowerCase().includes(q) ||
            f.caseName.toLowerCase().includes(q) ||
            f.scenarioTitle.toLowerCase().includes(q)
        )
      : findings;
    return pool.slice(0, MAX_VISIBLE_MATCHES);
  }, [findings, query]);

  const totalMatchCount = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return findings.length;
    return findings.filter(
      (f) =>
        f.recordId.toLowerCase().includes(q) ||
        f.caseName.toLowerCase().includes(q) ||
        f.scenarioTitle.toLowerCase().includes(q)
    ).length;
  }, [findings, query]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[var(--color-ink-700)]">{label}</label>
      <input
        type="text"
        value={open ? query : selected ? findingLabel(selected) : ""}
        placeholder="Search by case name, record ID, or scenario…"
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => {
          closeTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-[var(--color-border)] bg-white shadow-lg">
          {matches.length === 0 && <p className="px-3 py-2 text-sm text-[var(--color-ink-500)]">No matching findings.</p>}
          {matches.map((f) => (
            <button
              key={f.recordId}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (closeTimer.current) clearTimeout(closeTimer.current);
                onChange(f.recordId);
                setQuery("");
                setOpen(false);
              }}
              className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-[var(--color-neutral-50)] ${
                f.recordId === value ? "bg-[var(--color-gold-100)]" : ""
              }`}
              title={findingLabel(f)}
            >
              <span className="font-mono text-xs text-[var(--color-ink-500)]">{f.recordId}</span>
              {" · "}
              {f.caseName}: {f.scenarioTitle}
            </button>
          ))}
          {totalMatchCount > MAX_VISIBLE_MATCHES && (
            <p className="border-t border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-ink-500)]">
              {totalMatchCount - MAX_VISIBLE_MATCHES} more match{totalMatchCount - MAX_VISIBLE_MATCHES === 1 ? "" : "es"}, keep typing to narrow it down.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function PrecedentCompareClient({ findings }: { findings: ScenarioFinding[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [leftId, setLeftId] = useState(() => searchParams.get("a") || DEFAULT_LEFT_ID);
  const [rightId, setRightId] = useState(() => searchParams.get("b") || DEFAULT_RIGHT_ID);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (leftId) params.set("a", leftId);
    else params.delete("a");
    if (rightId) params.set("b", rightId);
    else params.delete("b");
    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}?${searchParams.toString()}`;
    if (next !== current) router.replace(next, { scroll: false });
    // Only re-run when the selected findings change — re-including
    // searchParams/router/pathname here would loop, since this effect is
    // itself what changes searchParams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftId, rightId]);

  const left = findings.find((f) => f.recordId === leftId);
  const right = findings.find((f) => f.recordId === rightId);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FindingPicker findings={findings} value={leftId} onChange={setLeftId} label="Finding A" />
        <FindingPicker findings={findings} value={rightId} onChange={setRightId} label="Finding B" />
      </div>

      {(!left || !right) && (
        <p className="mt-4 text-sm text-[var(--color-ink-500)]">
          {!left && !right
            ? "Select two scenario findings to compare."
            : `No scenario finding found for record ID "${!left ? leftId : rightId}".`}
        </p>
      )}

      {left && right && (
        <>
          {/* Desktop/tablet: side-by-side table. */}
          <div className="mt-6 hidden overflow-x-auto rounded-sm bg-white border border-[var(--color-border)] md:block">
            <table className="w-full min-w-[640px] divide-y divide-[var(--color-border)] text-sm">
              <thead>
                <tr className="bg-[var(--color-neutral-50)]">
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-700)]">Field</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-700)]">{left.recordId}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-700)]">{right.recordId}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {FIELDS.map((field, i) => (
                  <tr key={field.label} className={i % 2 === 1 ? "bg-[var(--color-neutral-50)]/50" : undefined}>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-[var(--color-ink-700)]">{field.label}</td>
                    <td className="px-4 py-3 align-top text-[var(--color-ink-900)]">
                      <FieldValue field={field} finding={left} />
                    </td>
                    <td className="px-4 py-3 align-top text-[var(--color-ink-900)]">
                      <FieldValue field={field} finding={right} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: an unusably wide 3-column table becomes, per field, a
              small "Earlier stage / Later stage"-style stack -- Finding A's
              value directly above Finding B's, field by field. */}
          <div className="mt-6 space-y-4 md:hidden">
            {FIELDS.map((field, i) => (
              <div key={field.label} className={`rounded-sm p-3 border border-[var(--color-border)] ${i % 2 === 1 ? "bg-[var(--color-neutral-50)]/50" : "bg-white"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">{field.label}</p>
                <div className="mt-2">
                  <p className="text-xs font-medium text-[var(--color-ink-500)]">{left.recordId}</p>
                  <div className="mt-0.5 text-sm text-[var(--color-ink-900)]">
                    <FieldValue field={field} finding={left} />
                  </div>
                </div>
                <div className="mt-2.5 border-t border-[var(--color-border)] pt-2.5">
                  <p className="text-xs font-medium text-[var(--color-ink-500)]">{right.recordId}</p>
                  <div className="mt-0.5 text-sm text-[var(--color-ink-900)]">
                    <FieldValue field={field} finding={right} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
