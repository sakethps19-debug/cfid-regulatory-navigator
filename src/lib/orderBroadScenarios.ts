import type { ScenarioFinding } from "@/types/domain";
import type { FixedScenario } from "@/data/curated/fixed-scenarios";
import { broadScenariosForFinding } from "@/lib/broadScenarioMatch";

export interface OrderBroadScenarioSummary {
  scenario: FixedScenario;
  /** A short, order-specific description of how this broad scenario arose
   * in THIS order — reuses the curated scenarioTitle(s) of whichever
   * finding(s) actually matched this scenario (never freshly generated
   * prose), deduplicated so the same underlying finding text is never
   * repeated. */
  description: string;
}

/** Case/Order Detail's "Broad scenarios arising from this order" — the
 * consolidated replacement for a raw one-row-per-scenario_finding list
 * (officer-facing cleanup pass, Part 11). Reuses the exact same
 * broadScenariosForFinding mechanism Law Library and the provision-page
 * "broad CFID scenarios" summary already use (matching only a finding's
 * own structured transactionTypes/allegedConduct tags against a curated
 * scenario's keyConceptIds — never free text, never provision
 * co-occurrence), so a scenario can only ever appear here through the same
 * precision-vetted mechanism used everywhere else in the app. A finding
 * whose tags don't intersect ANY curated scenario's keyConceptIds
 * (including scenario 8's and the mis-selling sub-product's own
 * deliberately-empty keyConceptIds) simply contributes nothing here — this
 * function never force-fits a weak match, and never invents a scenario
 * from provision co-occurrence alone (it never looks at provisionIds).
 * Each distinct scenario id appears at most once per order. */
export function orderBroadScenarios(findings: ScenarioFinding[]): OrderBroadScenarioSummary[] {
  const descriptionsByScenarioId = new Map<string, Set<string>>();
  const scenarioById = new Map<string, FixedScenario>();

  for (const finding of findings) {
    for (const scenario of broadScenariosForFinding(finding)) {
      scenarioById.set(scenario.id, scenario);
      const set = descriptionsByScenarioId.get(scenario.id) ?? new Set<string>();
      if (finding.scenarioTitle) set.add(finding.scenarioTitle);
      descriptionsByScenarioId.set(scenario.id, set);
    }
  }

  return [...scenarioById.values()].map((scenario) => ({
    scenario,
    description: [...(descriptionsByScenarioId.get(scenario.id) ?? [])].join(" "),
  }));
}
