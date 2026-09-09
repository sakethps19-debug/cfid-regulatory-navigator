import type { ScenarioFinding } from "@/types/domain";
import { orderBroadScenarios } from "@/lib/orderBroadScenarios";

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
    <ul className="space-y-3">
      {scenarios.map(({ scenario, description }) => (
        <li key={scenario.id} className="rounded-lg border border-[var(--color-border)] p-3">
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">{scenario.name}</p>
          {description && <p className="mt-1 text-left text-sm text-[var(--color-ink-700)]">{description}</p>}
        </li>
      ))}
    </ul>
  );
}
