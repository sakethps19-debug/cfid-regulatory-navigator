import type { ScenarioFinding } from "@/types/domain";
import { orderBroadScenarios } from "@/lib/orderBroadScenarios";
import { NARRATIVE_JUSTIFY_ONLY } from "@/lib/proseClasses";

/** Order Detail's "Broad scenarios arising from this order" (officer-facing
 * cleanup pass, Part 11 — replaces the previous FindingsByStatus render on
 * this page, which showed one row per scenario_finding with its own
 * status badge/recordId/paragraph references — internal research
 * granularity, not what an officer scanning a case needs). FindingsByStatus
 * itself is untouched (still used for GROUP_INFO/GROUP_ORDER elsewhere and
 * available for any future need); this is a separate, purpose-built
 * component, same pattern as ProvisionOrderList's relationship to it.
 * Each row is just "Broad Scenario" + a short order-specific description —
 * no finding id, no processing/review/status clutter. */
export function OrderBroadScenarios({ findings }: { findings: ScenarioFinding[] }) {
  const scenarios = orderBroadScenarios(findings);

  if (scenarios.length === 0) {
    return <p className="text-sm text-[var(--color-ink-500)]">No broad CFID scenario is on file for this order&apos;s findings.</p>;
  }

  return (
    <div>
      {/* Quantum-integrity safeguard (live-officer-review correction —
          Rajesh Exports): a broad-scenario theme name like "Diversion /
          Siphoning / Misutilisation of Funds" sitting directly above a
          finding's own amount-bearing title must never read as if the
          full amount were itself an established quantum of diversion,
          siphoning or misutilisation. This is a standing disclaimer, not
          a per-amount inference — no amount here is parsed, classified or
          relabelled. */}
      <p className={`mb-3 text-xs text-[var(--color-ink-500)] ${NARRATIVE_JUSTIFY_ONLY}`}>
        A theme listed below means this order&apos;s findings examine that subject matter — not that any amount
        mentioned in a finding&apos;s title is itself an established quantum of diversion, siphoning or misutilisation.
        Consult the order for the actual amount transferred, returned, outstanding or otherwise characterised.
      </p>
      <ul className="space-y-3">
        {scenarios.map(({ scenario, description }) => (
          <li key={scenario.id} className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">{scenario.name}</p>
            {description && <p className={`mt-1 text-sm text-[var(--color-ink-700)] ${NARRATIVE_JUSTIFY_ONLY}`}>{description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
