"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, SourceLink } from "@/components/Card";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import { resolveAllFixedScenarios, type ResolvedFixedScenario } from "@/lib/fixedScenarioResolver";
import { retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";
import { relevantScenarioRecords, groupRelevantRecordsByOrder, type RelevantOrderGroup } from "@/lib/fixedScenarioRelevantRecords";
import { formatDate } from "@/lib/formatDate";
import type { LegalProvision, Order, ScenarioFinding } from "@/types/domain";

/** Part A of the redesigned Scenario Analyzer — a small, curated set
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
          Select the broad CFID investigation theme closest to what you are looking into. Each theme shows a curated set of potentially
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
  const orderGroups = groupRelevantRecordsByOrder(records);

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
          {/* Wide-screen content-width fix (live officer review): this used
              to be hard-capped at max-w-prose (~65ch) regardless of
              breakpoint, leaving a large dead column next to the provisions
              grid below, which has no cap at all. Tiered widening matches
              the same pattern PageHeader's own description paragraph and
              the theme-picker intro above already use — readable measure on
              a laptop, materially wider on a large desktop, never
              full-bleed width:100% text. */}
          <p className="max-w-3xl text-sm text-[var(--color-ink-700)] xl:max-w-4xl 2xl:max-w-5xl">{scenario.explanation}</p>
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

      <RelevantCfidOrders groups={orderGroups} />
    </div>
  );
}

const INITIAL_VISIBLE_ORDERS = 5;

/** Live-officer-review correction: "Relevant CFID Orders" — the primary
 * presentation is now ORDER-centric, never dumping the same company
 * repeatedly merely because it has several structured findings (the
 * previous finding/record-centric list showed Royal Orchid Hotels three
 * times for ROHL-01/02/03). One captured order = one card, provisions
 * deduped within it. A record only appears because relevantScenarioRecords
 * verified BOTH the scenario-metadata association (keyConceptIds) and an
 * exact finding_provisions link to one of this scenario's own curated
 * provisions. Two orders for the same matter (e.g. an Interim Order and its
 * later Final Order) are NEVER combined into one card — order stage is
 * legally material, so groupRelevantRecordsByOrder keys strictly by
 * order.id. */
function RelevantCfidOrders({ groups }: { groups: RelevantOrderGroup[] }) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (groups.length === 0) {
    return (
      <Card className="mt-4">
        <h3 className="font-serif text-base font-semibold text-[var(--color-ink-900)]">Relevant CFID Orders</h3>
        <p className="mt-2 text-sm text-[var(--color-ink-700)]">
          No captured CFID precedent is currently mapped to this fact pattern. This means only that the current captured corpus does not provide a
          structured, provision-linked precedent for this scenario — it does not mean no violation exists, that SEBI has never considered such
          conduct, or that the allegation is legally unsustainable.
        </p>
      </Card>
    );
  }

  const visible = expanded ? groups : groups.slice(0, INITIAL_VISIBLE_ORDERS);

  return (
    <Card className="mt-4">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={!collapsed}
      >
        <h3 className="font-serif text-base font-semibold text-[var(--color-ink-900)]">
          Relevant CFID Orders <span className="font-sans text-sm font-normal text-[var(--color-ink-500)]">({groups.length})</span>
        </h3>
        <span className="text-sm text-[var(--color-gold-700)]">{collapsed ? "Show →" : "Hide"}</span>
      </button>
      <p className="mt-1 text-xs text-[var(--color-ink-500)]">
        One card per captured order whose own structured findings touch this theme AND whose finding-provision link cites one of the provisions
        listed above — never an order shown merely because it cites the same provision elsewhere. A matter&apos;s Interim Order and its later
        Final Order always remain separate cards; order stage is legally material.
      </p>

      {!collapsed && (
        <div className="mt-4 flex flex-col gap-4">
          {visible.map((g) => (
            <RelevantOrderCard key={g.order.id} group={g} />
          ))}
          {groups.length > INITIAL_VISIBLE_ORDERS && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="self-start text-xs font-medium text-[var(--color-gold-700)] hover:underline"
            >
              {expanded ? "Show fewer" : `Show all ${groups.length} orders →`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function RelevantOrderCard({ group }: { group: RelevantOrderGroup }) {
  const { order, findings, provisions, hasFindingLevelOnlyLinkage } = group;
  const dispositions = findings.filter((f) => f.dispositionLabel);

  return (
    <div className="rounded-sm border border-[var(--color-border)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-[var(--color-ink-900)]">{order.caseName}</span>
        <OrderStageBadge orderStage={order.orderStage} />
        <span className="text-xs text-[var(--color-ink-500)]">{formatDate(order.orderDate) || "date not on file"}</span>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Relevant findings/scenarios in this order</span>
        <ul className="flex flex-col gap-1">
          {findings.map((f) => (
            <li key={f.finding.recordId} className="text-sm text-[var(--color-ink-700)]">
              <span className="font-mono text-xs text-[var(--color-ink-500)]">{f.finding.recordId}</span> — {f.scenarioTitle}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">
          Provisions considered in these relevant findings
        </span>
        {hasFindingLevelOnlyLinkage && (
          <p className="text-xs italic text-[var(--color-ink-500)]">
            Finding-level provision linkage: at least one finding below is linked to more than one captured order, so the provision below is shown
            as linked to that finding, not individually proven to have been considered by this specific order alone.
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {provisions.map((p) => (
            <li key={p.provision.id} className="text-sm text-[var(--color-ink-700)]">
              <Link href={`/provisions/${encodeURIComponent(p.provision.id)}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                {p.provision.provisionNumber}
              </Link>{" "}
              — {p.findingRecordIds.join(", ")}
            </li>
          ))}
        </ul>
      </div>

      {dispositions.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Outcome / historical treatment</span>
          <ul className="flex flex-col gap-0.5">
            {dispositions.map((f) => (
              <li key={f.finding.recordId} className="text-sm text-[var(--color-ink-700)]">
                {f.finding.recordId}: {f.dispositionLabel}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-xs text-[var(--color-ink-500)]">
        Relevant because {findings.length} finding{findings.length === 1 ? "" : "s"} in this order touch this scenario&apos;s own structured facts
        and cite a provision listed above.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <SourceLink href={order.officialUrl} />
        <Link href={`/orders/${order.id}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
          View Case →
        </Link>
      </div>
    </div>
  );
}
