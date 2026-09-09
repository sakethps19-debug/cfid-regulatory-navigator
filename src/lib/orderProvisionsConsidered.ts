import type { ScenarioFinding } from "@/types/domain";
import { isEligibleForFixedScenarioOutput } from "@/lib/fixedScenarioResolver";

export interface ProvisionConsideredSummary {
  provisionId: string;
  /** True only when EVERY recorded relationship for this provision, across
   * every finding on this order, is 'not_upheld' — i.e. the provision was
   * genuinely considered/alleged in connection with this order but never
   * recorded as established. A provision with at least one 'alleged'
   * (cited, disposition not itself recorded), 'applied', or 'upheld' link
   * is NOT flagged here, even if it also carries a separate not_upheld
   * link elsewhere on the order (e.g. against a different noticee) — the
   * flag exists so a purely-rejected provision (Max Financial Services'
   * PFUTP-4-2-r, etc.) reads as secondary/factual, never so an
   * establishment gets hidden behind a mixed-disposition provision. */
  notUpheldOnly: boolean;
}

/** Case/Order Detail's "Provisions considered" (officer-facing cleanup
 * pass, Part 9). Preserves the exact canonical provision id — never
 * collapses a sub-clause into its parent, never merges same-numbered
 * provisions across instruments (each id here comes straight from
 * finding.provisionLinks, the same exact-identity join used throughout
 * this corpus). A provision considered but not upheld remains listed
 * (never hidden merely because disposition was negative) with
 * notUpheldOnly=true so the caller can render it as secondary/factual
 * rather than indistinguishable from an established citation.
 *
 * Also excludes any provision whose legal function is a penalty,
 * SEBI-power/remedial, or liability-attribution provision — the same
 * mandatory exclusion Fixed Scenario Analysis already enforces (see
 * fixedScenarioResolver.ts's isEligibleForFixedScenarioOutput). A bare
 * SEBI Act 15HA/15HB penalty citation, or Section 27 attribution, on its
 * own would otherwise read here as "the substantive provisions this case
 * is about" — exactly the misleading impression this list exists to
 * avoid. Those provisions remain contextual to the order's penalty/
 * direction machinery, never displayed here as a considered substantive
 * provision. */
export function orderProvisionsConsidered(findings: ScenarioFinding[]): ProvisionConsideredSummary[] {
  const relationshipsByProvisionId = new Map<string, Set<string>>();
  for (const finding of findings) {
    for (const link of finding.provisionLinks) {
      if (!isEligibleForFixedScenarioOutput(link.provisionId)) continue;
      const set = relationshipsByProvisionId.get(link.provisionId) ?? new Set<string>();
      set.add(link.relationship ?? "alleged");
      relationshipsByProvisionId.set(link.provisionId, set);
    }
    // A finding may list provisionIds with no matching provisionLinks entry
    // (older data shaped before per-provision relationship tracking existed)
    // — still considered, just with no relationship information to flag.
    for (const provisionId of finding.provisionIds) {
      if (!isEligibleForFixedScenarioOutput(provisionId)) continue;
      if (!relationshipsByProvisionId.has(provisionId)) relationshipsByProvisionId.set(provisionId, new Set());
    }
  }

  return [...relationshipsByProvisionId.entries()].map(([provisionId, relationships]) => ({
    provisionId,
    notUpheldOnly: relationships.size > 0 && [...relationships].every((r) => r === "not_upheld"),
  }));
}
