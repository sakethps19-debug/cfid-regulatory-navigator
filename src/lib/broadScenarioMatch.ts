import { detectConcepts } from "@/lib/matching/conceptExtraction";
import { FIXED_SCENARIOS, type FixedScenario } from "@/data/curated/fixed-scenarios";
import type { ScenarioFinding } from "@/types/domain";

/** The single shared mechanism behind both halves of the Analyze <-> Law
 * relationship:
 *   - Analyze: broad scenario -> potentially relevant provisions (already
 *     built, see fixedScenarioResolver.ts).
 *   - Law: exact provision -> broad CFID scenarios it has been invoked in
 *     (broadScenariosForProvision below), and Law's own fact/concept search
 *     (matchScenariosForQuery below).
 * Both consume the SAME FIXED_SCENARIOS taxonomy and the same small,
 * curated keyConceptIds per scenario, so Analyze and Law can never drift
 * into two unrelated scenario classification systems.
 *
 * Deliberately NOT a tag-propagation system: matching is restricted to a
 * finding's own STRUCTURED concept-tag fields (transactionTypes,
 * allegedConduct) — never its free-text case name, scenario title, or
 * (critically) its evidenceTypes/actorRoles, which is exactly the leakage
 * that caused Law Library's old free-text search to surface e.g. Ind AS 7
 * for an RPT query purely because an unrelated finding's EVIDENCE list
 * happened to mention a related-party register. */

/** A broad scenario is "invoked" by a finding only if the finding's own
 * transactionTypes/allegedConduct tags include at least one of that
 * scenario's keyConceptIds. Descriptive only: this says the finding's
 * facts touched the scenario's defining conduct, never that every
 * provision this scenario lists actually applies to that finding. */
export function broadScenariosForFinding(finding: ScenarioFinding): FixedScenario[] {
  const findingConceptIds = new Set([...finding.transactionTypes, ...finding.allegedConduct]);
  return FIXED_SCENARIOS.filter((s) => s.keyConceptIds.length > 0 && s.keyConceptIds.some((id) => findingConceptIds.has(id)));
}

/** For a given provision, the small set of broad CFID scenarios it has
 * actually been invoked in across the findings that cite it — "In what
 * broad CFID fact patterns has this provision been invoked?" — derived
 * from each citing finding's own structured tags, not from Fixed Scenario
 * Analysis's prescriptive provisionIds (a different, forward-looking
 * question: "what should an officer examine for this scenario"). Order:
 * most-cited scenario first, ties broken by FIXED_SCENARIOS's own order. */
export function broadScenariosForProvision(findingsForThisProvision: ScenarioFinding[]): FixedScenario[] {
  const counts = new Map<string, number>();
  for (const f of findingsForThisProvision) {
    for (const s of broadScenariosForFinding(f)) {
      counts.set(s.id, (counts.get(s.id) ?? 0) + 1);
    }
  }
  return FIXED_SCENARIOS.filter((s) => counts.has(s.id)).sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
}

/** Law Library fact/concept search: detects concept tags in the officer's
 * own query text (the same deterministic keyword/synonym detection Analyze
 * uses on entered scenarios) and returns the broad scenarios whose
 * keyConceptIds intersect what was detected — never a raw substring match
 * against finding text, so a query can only surface a scenario (and, in
 * turn, that scenario's own precision-vetted provisionIds) through a real
 * concept match, not incidental word overlap. */
export function matchScenariosForQuery(query: string): FixedScenario[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const detectedIds = new Set(detectConcepts(trimmed).map((c) => c.id));
  return FIXED_SCENARIOS.filter((s) => s.keyConceptIds.length > 0 && s.keyConceptIds.some((id) => detectedIds.has(id)));
}
