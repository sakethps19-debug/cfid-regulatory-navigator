"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { resolveAllFixedScenarios, type ResolvedFixedScenario } from "@/lib/fixedScenarioResolver";
import type { LegalProvision } from "@/types/domain";

/** Part A of the redesigned Scenario Analyzer — a small, expert-curated set
 * of broad CFID investigation themes. An officer picks the theme that
 * matches what they are investigating and sees a simple three-layer
 * result: the scenario, what it covers, and the substantive regulatory
 * provisions potentially relevant to it. Deliberately excludes everything
 * from the fact-specific Analyzer (Part B): no case names, no supporting
 * orders, no precedent counts, no similarity scores, no upheld/not-upheld
 * status, no historical frequency, no confidence percentages, no evidence
 * indicators, no investigation recommendations, and — enforced by
 * resolveAllFixedScenarios — no enforcement/direction/penalty provisions. */
export function FixedScenarioAnalyzer({ provisions, onSwitchToFreeForm }: { provisions: LegalProvision[]; onSwitchToFreeForm: () => void }) {
  const scenarios = resolveAllFixedScenarios(provisions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scenarios.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">What type of scenario are you examining?</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-700)]">
          Select the broad CFID investigation theme closest to what you are looking into. Each theme shows an expert-curated set of potentially
          relevant regulatory provisions to examine — a research shortcut, not a finding that a violation occurred and not a search of past cases.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {selected && <FixedScenarioResult scenario={selected} />}
    </div>
  );
}

function FixedScenarioResult({ scenario }: { scenario: ResolvedFixedScenario }) {
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Scenario</span>
        <h3 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">{scenario.name}</h3>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">What this covers</span>
        <p className="text-sm text-[var(--color-ink-700)]">{scenario.explanation}</p>
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
          <div className="flex flex-col gap-4">
            {scenario.provisionGroups.map((group) => (
              <div key={group.instrument}>
                <div className="text-sm font-semibold text-[var(--color-ink-900)]">{group.instrument}</div>
                <ul className="mt-1 flex flex-col gap-1">
                  {group.items.map((p) => (
                    <li key={p.id} className="text-sm text-[var(--color-ink-700)]">
                      <span className="font-medium text-[var(--color-ink-900)]">{p.provisionNumber}</span>
                      {p.subject && <span> — {p.subject}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
