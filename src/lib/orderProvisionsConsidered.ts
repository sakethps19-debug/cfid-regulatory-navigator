import type { ScenarioFinding } from "@/types/domain";
import { legalFunctionForProvision, LEGAL_FUNCTION_LABELS, type LegalFunctionCategory } from "@/data/curated/legal-function-classification";

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
  /** What KIND of legal norm this provision is (see
   * legal-function-classification.ts) — Substantive prohibition, Penalty
   * provision, SEBI power/remedial provision, etc. Case Detail is
   * historical-order RESEARCH ("what did this order actually consider"),
   * a different question from Fixed Scenario Analysis's candidate-
   * violation output ("what may be a substantive violation") — so, unlike
   * that screen, this list is never filtered by legal function. Every
   * provision genuinely linked to this order's findings is shown, with
   * this label distinguishing a penalty/power/attribution provision from a
   * substantive one so the officer is never misled into reading a bare
   * SEBI Act 15HA/15HB citation as itself the underlying contravention. */
  legalFunction: LegalFunctionCategory;
  legalFunctionLabel: string;
}

/** Case/Order Detail's "Provisions considered" — historical-order research,
 * answering "what provisions did this order actually consider", NOT Fixed
 * Scenario Analysis's candidate-violation output ("what may be a
 * substantive violation"). Those are different questions with different
 * correct answers: Fixed Scenario Analysis must exclude penalty/SEBI-power/
 * attribution provisions from its candidate-violation list (see
 * fixedScenarioResolver.ts's isEligibleForFixedScenarioOutput), but Case
 * Detail must NOT apply that same filter — an officer researching an order
 * needs to see every provision genuinely linked to it, including the
 * penalty section actually imposed, the power SEBI actually invoked, and
 * any attribution provision actually cited, each correctly labelled by
 * legal function rather than hidden.
 *
 * Preserves the exact canonical provision id throughout — never collapses
 * a sub-clause into its parent, never merges same-numbered provisions
 * across instruments (each id here comes straight from
 * finding.provisionLinks, the same exact-identity join used throughout
 * this corpus). A provision considered but not upheld remains listed
 * (never hidden merely because disposition was negative) with
 * notUpheldOnly=true so the caller can render it as secondary/factual
 * rather than indistinguishable from an established citation. */
export function orderProvisionsConsidered(findings: ScenarioFinding[]): ProvisionConsideredSummary[] {
  const relationshipsByProvisionId = new Map<string, Set<string>>();
  for (const finding of findings) {
    for (const link of finding.provisionLinks) {
      const set = relationshipsByProvisionId.get(link.provisionId) ?? new Set<string>();
      set.add(link.relationship ?? "alleged");
      relationshipsByProvisionId.set(link.provisionId, set);
    }
    // A finding may list provisionIds with no matching provisionLinks entry
    // (older data shaped before per-provision relationship tracking existed)
    // — still considered, just with no relationship information to flag.
    for (const provisionId of finding.provisionIds) {
      if (!relationshipsByProvisionId.has(provisionId)) relationshipsByProvisionId.set(provisionId, new Set());
    }
  }

  return [...relationshipsByProvisionId.entries()].map(([provisionId, relationships]) => {
    const legalFunction = legalFunctionForProvision(provisionId);
    return {
      provisionId,
      notUpheldOnly: relationships.size > 0 && [...relationships].every((r) => r === "not_upheld"),
      legalFunction,
      legalFunctionLabel: LEGAL_FUNCTION_LABELS[legalFunction],
    };
  });
}
