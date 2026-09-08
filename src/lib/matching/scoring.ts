// Shared factual-overlap scoring primitives, extracted from engine.ts
// (deterministic-engine completion pass) so that both the precision engine
// (engine.ts, "what applies to MY facts?") and the historical-treatment
// aggregator (historicalTreatment.ts, "how has CFID historically treated
// materially similar facts?") use the EXACT same notion of factual overlap,
// without engine.ts and historicalTreatment.ts importing each other
// (historicalTreatment.ts is called FROM engine.ts, so a reverse import
// would be circular). engine.ts re-exports every symbol here that it
// previously exported directly, so no existing import site needs to change.
import type { FindingStatus, ScenarioFinding } from "@/types/domain";
import type { DetectedConcept } from "./conceptExtraction";
import type { MatchedByCategory } from "./types";

export const NEGATIVE_STATUSES = new Set(["Not Confirmed in Final Order", "Withdrawn"]);
export const UPHELD_STATUSES = new Set(["Confirmed in Final Order", "Partly Confirmed in Final Order"]);
export const UNRESOLVED_STATUSES = new Set(["Alleged", "Inconclusive", "Procedural observation"]);
export const MIN_FINDING_SCORE = 3; // require at least one meaningful (weight-3) category match

const FINAL_ORDER_DISPOSITIONS = new Set<FindingStatus>([
  "Confirmed in Final Order",
  "Partly Confirmed in Final Order",
  "Not Confirmed in Final Order",
]);
export function isFinalOrderFinding(status: FindingStatus): boolean {
  return FINAL_ORDER_DISPOSITIONS.has(status);
}

export type SupportCategory = "Final merits support" | "Interim / prima facie" | "Contextual / unresolved";

export function supportCategory(status: FindingStatus): SupportCategory {
  if (UPHELD_STATUSES.has(status)) return "Final merits support";
  if (UNRESOLVED_STATUSES.has(status)) return "Contextual / unresolved";
  return "Interim / prima facie";
}

export function effectiveLinkStatus(findingStatus: FindingStatus, relationship: string | undefined): FindingStatus {
  if (relationship === "not_upheld") return "Not Confirmed in Final Order";
  if (relationship === "alleged") return "Alleged";
  return findingStatus;
}

export function compareByFactualScoreThenFinality(a: { score: number; finding: ScenarioFinding }, b: { score: number; finding: ScenarioFinding }): number {
  if (a.score !== b.score) return b.score - a.score;
  return Number(isFinalOrderFinding(b.finding.findingStatus)) - Number(isFinalOrderFinding(a.finding.findingStatus));
}

export function humanizeTag(id: string): string {
  return id.replace(/_/g, " ");
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export interface ScoredFinding {
  finding: ScenarioFinding;
  score: number;
  matchedIngredients: string[];
  matchedIds: string[];
  matchedByCategory: MatchedByCategory;
  categoriesMatched: number;
  substantiveCategoriesMatched: number;
}

export function scoreFinding(finding: ScenarioFinding, effectiveConcepts: DetectedConcept[]): ScoredFinding {
  const detectedIds = new Set(effectiveConcepts.map((c) => c.id));
  const detectedLabelById = new Map(effectiveConcepts.map((c) => [c.id, c.label]));

  const transactionOverlap = finding.transactionTypes.filter((t) => detectedIds.has(t));
  const actorOverlap = finding.actorRoles.filter((a) => detectedIds.has(a));
  const conductOverlap = finding.allegedConduct.filter((c) => detectedIds.has(c));
  const evidenceOverlap = finding.evidenceTypes.filter((e) => detectedIds.has(e));

  const score = transactionOverlap.length * 3 + actorOverlap.length * 2 + conductOverlap.length * 3 + evidenceOverlap.length * 1;
  const matchedIds = unique([...transactionOverlap, ...actorOverlap, ...conductOverlap, ...evidenceOverlap]);
  const matchedIngredients = unique(matchedIds.map((id) => detectedLabelById.get(id) ?? id));
  const toLabels = (ids: string[]) => unique(ids.map((id) => detectedLabelById.get(id) ?? id));
  const matchedByCategory: MatchedByCategory = {
    transactionTypes: toLabels(transactionOverlap),
    actorRoles: toLabels(actorOverlap),
    allegedConduct: toLabels(conductOverlap),
    evidenceTypes: toLabels(evidenceOverlap),
  };

  const categoriesMatched = [transactionOverlap, actorOverlap, conductOverlap, evidenceOverlap].filter((arr) => arr.length > 0).length;
  const substantiveCategoriesMatched = [transactionOverlap, conductOverlap].filter((arr) => arr.length > 0).length;

  return { finding, score, matchedIngredients, matchedIds, matchedByCategory, categoriesMatched, substantiveCategoriesMatched };
}

/** MECHANICAL tag subtraction only — see PrecedentRef.
 * additionalPrecedentFactsNotMatched in types.ts for the full explanation
 * of why this is deliberately distinct from ScenarioFinding.
 * ingredientsNotEstablished. */
export function additionalPrecedentFactsNotMatched(finding: ScenarioFinding, matchedIngredients: string[]): string[] {
  const matchedSet = new Set(matchedIngredients);
  const allOwnTags = unique([...finding.transactionTypes, ...finding.actorRoles, ...finding.allegedConduct, ...finding.evidenceTypes]);
  return allOwnTags.map(humanizeTag).filter((label) => !matchedSet.has(label));
}
