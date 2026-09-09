import { FIXED_SCENARIOS, type FixedScenario } from "@/data/curated/fixed-scenarios";
import { legalFunctionForProvision, type LegalFunctionCategory } from "@/data/curated/legal-function-classification";
import { sortByProvisionNumber } from "@/lib/provisionOrder";
import type { LegalProvision } from "@/types/domain";

/** Legal functions that can NEVER be presented by Fixed Scenario Analysis
 * as a "Potential Legal Violation" — SEBI's enforcement powers, direction
 * provisions, penalty provisions and attribution/liability mechanisms.
 * These may occur in the underlying SEBI orders because they form the
 * legal basis for directions, enforcement action or penalties (see e.g.
 * the Seacoast final order, para 241, invoking Sections
 * 11(1)/11(4)/11(4A)/11B(1)/11B(2)/15HA/15HB only for that purpose) — they
 * are never the substantive violation this tool investigates. Unlike
 * PRIMARY_CAPABLE_LEGAL_FUNCTIONS (engine.ts's Part B candidate-tiering,
 * which also treats "general_principle" and "definition" provisions as
 * unable to anchor a Primary candidate on their own), this set is
 * deliberately narrower: the verified Seacoast Table 52 itself cites
 * general-principle clauses (e.g. LODR 4(1)(a)-(j)) and definitional
 * clauses (e.g. LODR 16(1)(b), read with 18(1)(d)) as part of the
 * substantive-violation basis, so those categories are not excluded here. */
const FIXED_SCENARIO_EXCLUDED_LEGAL_FUNCTIONS = new Set<LegalFunctionCategory>([
  "penalty_provision",
  "sebi_power_remedial_provision",
  "liability_attribution_provision",
]);

export function isEligibleForFixedScenarioOutput(provisionId: string): boolean {
  return !FIXED_SCENARIO_EXCLUDED_LEGAL_FUNCTIONS.has(legalFunctionForProvision(provisionId));
}

export interface FixedScenarioProvisionGroup {
  instrument: string;
  items: LegalProvision[];
}

export interface ResolvedFixedScenario {
  id: string;
  name: string;
  explanation: string;
  provisionGroups: FixedScenarioProvisionGroup[];
  /** Curated ids that did not resolve against the live provisions corpus
   * (e.g. a typo, or a provision retired/renamed since curation) — surfaced
   * so this fails visibly rather than silently under-displaying, never
   * silently substituting or inventing a mapping. */
  unresolvedProvisionIds: string[];
}

/** Resolves a curated FixedScenario's provision ids against the live
 * LegalProvision[] corpus (single source of truth for display text — see
 * getProvisions() in src/lib/data.ts), grouped by instrument in provision-
 * number order, and defensively drops any id whose legal function is a
 * mandatory-excluded category — belt-and-suspenders alongside the
 * curated-data tests, so even a future curation mistake can never surface
 * a penalty/power/attribution provision as a "Potential Legal Violation". */
export function resolveFixedScenario(scenario: FixedScenario, provisions: LegalProvision[]): ResolvedFixedScenario {
  const byId = new Map(provisions.map((p) => [p.id, p]));
  const groups = new Map<string, LegalProvision[]>();
  const unresolvedProvisionIds: string[] = [];

  for (const id of scenario.provisionIds) {
    if (!isEligibleForFixedScenarioOutput(id)) continue;
    const provision = byId.get(id);
    if (!provision) {
      unresolvedProvisionIds.push(id);
      continue;
    }
    const list = groups.get(provision.instrument) ?? [];
    list.push(provision);
    groups.set(provision.instrument, list);
  }

  const provisionGroups: FixedScenarioProvisionGroup[] = [...groups.entries()].map(([instrument, items]) => ({
    instrument,
    items: sortByProvisionNumber(items),
  }));

  return {
    id: scenario.id,
    name: scenario.name,
    explanation: scenario.explanation,
    provisionGroups,
    unresolvedProvisionIds,
  };
}

export function resolveAllFixedScenarios(provisions: LegalProvision[]): ResolvedFixedScenario[] {
  return FIXED_SCENARIOS.map((s) => resolveFixedScenario(s, provisions));
}
