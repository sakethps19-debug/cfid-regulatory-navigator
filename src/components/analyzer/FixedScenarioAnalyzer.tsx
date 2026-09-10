"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { resolveAllFixedScenarios, type ResolvedFixedScenario } from "@/lib/fixedScenarioResolver";
import { retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";
import {
  relevantScenarioRecords,
  groupRelevantScenarioRecords,
  RELEVANT_RECORD_BUCKET_LABELS,
  type RelevantScenarioRecord,
} from "@/lib/fixedScenarioRelevantRecords";
import { legalReviewLabel } from "@/lib/publicationLifecycle";
import type { LegalProvision, Order, ScenarioFinding } from "@/types/domain";

/** Part A of the redesigned Scenario Analyzer — a small, expert-curated set
 * of broad CFID investigation themes. An officer picks the theme that
 * matches what they are investigating and sees a research-first result:
 * the scenario, the substantive regulatory provisions potentially relevant
 * to it, and (Part 6 correction) the captured CFID orders/scenarios
 * structurally connected to the same theme. Still excludes precedent
 * scoring/similarity/confidence percentages/investigation recommendations
 * — those remain the fact-specific Analyzer's (Part B) job — and still
 * excludes enforcement/direction/penalty provisions from the curated
 * provision list itself (enforced by resolveAllFixedScenarios). */
export function FixedScenarioAnalyzer({
  provisions,
  findings,
  orders,
  onSwitchToFreeForm,
}: {
  provisions: LegalProvision[];
  findings: ScenarioFinding[];
  orders: Order[];
  onSwitchToFreeForm: () => void;
}) {
  const scenarios = resolveAllFixedScenarios(provisions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scenarios.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">What type of scenario are you examining?</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-700)] xl:max-w-4xl 2xl:max-w-5xl">
          Select the broad CFID investigation theme closest to what you are looking into. Each theme shows an expert-curated set of potentially
          relevant regulatory provisions to examine — a research shortcut, not a finding that a violation occurred and not a search of past cases.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              aria-pressed={s.id === selectedId}
              className={`rounded-sm border p-3 text-left text-sm transition-colors ${
                s.id === selectedId
                  ? "border-[var(--color-gold-700)] bg-[var(--color-gold-50,#fdf6e3)]"
                  : "border-[var(--color-border)] bg-[var(--color-paper)] hover:border-[var(--color-gold-700)]"
              }`}
            >
              <div className="font-medium text-[var(--color-ink-900)]">{s.name}</div>
              <div className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-700)]">{s.explanation}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <button
            type="button"
            onClick={onSwitchToFreeForm}
            className="text-sm font-medium text-[var(--color-gold-700)] underline decoration-[var(--color-gold-100)] underline-offset-2 hover:text-[var(--color-gold-800)]"
          >
            My scenario does not fit these categories — analyze my own scenario
          </button>
        </div>
      </Card>

      {selected && <FixedScenarioResult scenario={selected} findings={findings} orders={orders} />}
    </div>
  );
}

function FixedScenarioResult({ scenario, findings, orders }: { scenario: ResolvedFixedScenario; findings: ScenarioFinding[]; orders: Order[] }) {
  // Reveal-and-focus the result on every selection (including switching
  // from one curated scenario straight to another), so an officer picking
  // a theme lower on the grid isn't left looking at an unchanged card list
  // with the result rendered off-screen below it.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    resultRef.current?.focus();
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scenario.id]);

  const records = relevantScenarioRecords(scenario.id, findings, [...scenario.provisionGroups.flatMap((g) => g.items)], orders);
  const groups = groupRelevantScenarioRecords(records);

  return (
    <div ref={resultRef} tabIndex={-1} className="scroll-mt-20 outline-none">
      <p role="status" aria-live="polite" className="sr-only">
        Showing potentially relevant provisions for {scenario.name}.
      </p>
      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Scenario</span>
          <h3 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">{scenario.name}</h3>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">What this covers</span>
          <p className="max-w-prose text-sm text-[var(--color-ink-700)]">{scenario.explanation}</p>
        </div>

        {scenario.unresolvedProvisionIds.length > 0 && (
          <div className="mt-4 rounded-sm border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            This scenario&apos;s curated mapping references {scenario.unresolvedProvisionIds.length} provision
            {scenario.unresolvedProvisionIds.length === 1 ? "" : "s"} not currently on file in the corpus ({scenario.unresolvedProvisionIds.join(", ")}
            ) — the list below is incomplete pending a corpus update, not a statement that fewer provisions apply.
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Potentially relevant regulatory provisions</span>
          {scenario.provisionGroups.length === 0 ? (
            <p className="text-sm italic text-[var(--color-ink-300)]">No provisions on file for this scenario.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {scenario.provisionGroups.map((group) => (
                <div key={group.instrument}>
                  <div className="text-sm font-semibold text-[var(--color-ink-900)]">{group.instrument}</div>
                  <ul className="mt-1 flex flex-col gap-1">
                    {group.items.map((p) => {
                      const rule = retrievalRuleForProvision(p.id);
                      return (
                        <li key={p.id} className="text-sm text-[var(--color-ink-700)]">
                          <Link href={`/provisions/${encodeURIComponent(p.id)}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                            {p.provisionNumber}
                          </Link>
                          {p.subject && <span> — {p.subject}</span>}
                          {rule && <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">Why potentially relevant: {rule.explanation}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <RelevantOrdersAndScenarios groups={groups} />
    </div>
  );
}

const INITIAL_VISIBLE = 3;

/** Part 6 correction: "Relevant CFID orders and scenarios" — four
 * initially-collapsed/compact groups, never dumping every order associated
 * with a provision. A record only appears because relevantScenarioRecords
 * verified BOTH the scenario-metadata association (keyConceptIds) and an
 * exact finding_provisions link to one of this scenario's own curated
 * provisions. Interim findings stay visibly interim (StatusBadge shows the
 * finding's own status); negative/contrary treatment is its own bucket,
 * never folded into "supporting"; no frequency-based ordering. */
function RelevantOrdersAndScenarios({ groups }: { groups: { bucket: RelevantScenarioRecord["bucket"]; records: RelevantScenarioRecord[] }[] }) {
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  if (groups.length === 0) {
    return (
      <Card className="mt-4">
        <h3 className="font-serif text-base font-semibold text-[var(--color-ink-900)]">Relevant CFID orders and scenarios</h3>
        <p className="mt-2 text-sm text-[var(--color-ink-700)]">
          No captured CFID precedent is currently mapped to this fact pattern. This means only that the current captured corpus does not provide a
          structured, provision-linked precedent for this scenario — it does not mean no violation exists, that SEBI has never considered such
          conduct, or that the allegation is legally unsustainable.
        </p>
      </Card>
    );
  }

  const totalCount = groups.reduce((n, g) => n + g.records.length, 0);

  return (
    <Card className="mt-4">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={!collapsed}
      >
        <h3 className="font-serif text-base font-semibold text-[var(--color-ink-900)]">
          Relevant CFID orders and scenarios <span className="font-sans text-sm font-normal text-[var(--color-ink-500)]">({totalCount})</span>
        </h3>
        <span className="text-sm text-[var(--color-gold-700)]">{collapsed ? "Show →" : "Hide"}</span>
      </button>
      <p className="mt-1 text-xs text-[var(--color-ink-500)]">
        Captured findings whose own structured facts touch this theme AND whose finding-provision link cites one of the provisions listed above —
        never an order shown merely because it cites the same provision elsewhere.
      </p>

      {!collapsed && (
        <div className="mt-4 flex flex-col gap-5">
          {groups.map((g) => {
            const isExpanded = expandedBuckets.has(g.bucket);
            const visible = isExpanded ? g.records : g.records.slice(0, INITIAL_VISIBLE);
            return (
              <div key={g.bucket}>
                <h4 className="text-sm font-semibold text-[var(--color-ink-900)]">
                  {RELEVANT_RECORD_BUCKET_LABELS[g.bucket]} <span className="font-normal text-[var(--color-ink-500)]">({g.records.length})</span>
                </h4>
                <ul className="mt-2 flex flex-col gap-2">
                  {visible.map((r) => (
                    <li key={`${r.finding.recordId}-${r.provision.id}`} className="rounded-sm border border-[var(--color-border)] p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[var(--color-ink-900)]">{r.finding.caseName}</span>
                        <span className="font-mono text-xs text-[var(--color-ink-500)]">{r.finding.recordId}</span>
                        <StatusBadge status={r.effectiveStatus} />
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-ink-700)]">{r.finding.scenarioTitle}</p>
                      <p className="mt-1 text-xs text-[var(--color-ink-700)]">
                        Provision:{" "}
                        <Link href={`/provisions/${encodeURIComponent(r.provision.id)}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                          {r.provision.provisionNumber}
                        </Link>{" "}
                        — {r.provision.subject}
                      </p>
                      {r.orders.length > 0 && (
                        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                          {r.orders.map((o, i) => (
                            <span key={o.id}>
                              {i > 0 && "; "}
                              {o.orderStage} · {o.orderDate ?? "date not on file"} · {o.orderNumber ?? "order number not on file"}{" "}
                              <Link href={`/orders/${o.id}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                                View order detail →
                              </Link>
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                        {r.finding.interimParagraphReferences && <>Interim paras: {r.finding.interimParagraphReferences}. </>}
                        {r.finding.finalParagraphReferences && <>Final paras: {r.finding.finalParagraphReferences}. </>}
                        {legalReviewLabel(r.finding.humanLegalReviewCompleted)}
                      </p>
                      <div className="mt-1">
                        <SourceLink href={r.finding.officialSourceUrl} />
                      </div>
                    </li>
                  ))}
                </ul>
                {g.records.length > INITIAL_VISIBLE && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBuckets((prev) => {
                        const next = new Set(prev);
                        if (next.has(g.bucket)) next.delete(g.bucket);
                        else next.add(g.bucket);
                        return next;
                      })
                    }
                    className="mt-2 text-xs font-medium text-[var(--color-gold-700)] hover:underline"
                  >
                    {isExpanded ? "Show fewer" : `Show all ${g.records.length} →`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
