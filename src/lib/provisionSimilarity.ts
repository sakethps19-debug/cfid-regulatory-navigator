import type { LegalProvision } from "@/types/domain";

/** Strips the leading "Regulation"/"Section"/"Rule"/etc. word and whitespace,
 * leaving just the bracket/number sequence — e.g. "Regulation 4(2)(e)" ->
 * "4(2)(e)" — so two provisions can be compared purely on their numbering,
 * independent of which instrument or word ("Regulation" vs "Section") each
 * uses. */
function normalizeProvisionNumber(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(regulation|section|rule|clause|paragraph|para|schedule)\s+/i, "")
    .replace(/\s+/g, "");
}

export type SimilarProvisionRelation = "same_number_different_instrument" | "sub_clause_of" | "parent_of";

export interface SimilarProvision {
  provision: LegalProvision;
  relation: SimilarProvisionRelation;
}

/**
 * Finds every OTHER provision whose numbering could plausibly be confused
 * with the target's — an identical bracket/number sequence in a different
 * instrument, or one that is a direct sub-clause extension of the other
 * (e.g. "4(2)(e)" vs "4(2)(e)(i)"). This is a general safeguard, not
 * hardcoded to any one pair: it runs identically for every provision in the
 * Law Library, and would catch a future case just as it catches the known
 * PFUTP Regulation 4(2)(e) / LODR Regulation 4(2)(e)(i) pair.
 */
export function findSimilarlyNumberedProvisions(target: LegalProvision, all: LegalProvision[]): SimilarProvision[] {
  const targetNorm = normalizeProvisionNumber(target.provisionNumber);
  if (!targetNorm) return [];
  const results: SimilarProvision[] = [];
  for (const p of all) {
    if (p.id === target.id) continue;
    const norm = normalizeProvisionNumber(p.provisionNumber);
    if (!norm) continue;
    if (norm === targetNorm) {
      results.push({ provision: p, relation: "same_number_different_instrument" });
    } else if (norm.startsWith(targetNorm) && norm[targetNorm.length] === "(") {
      results.push({ provision: p, relation: "sub_clause_of" });
    } else if (targetNorm.startsWith(norm) && targetNorm[norm.length] === "(") {
      results.push({ provision: p, relation: "parent_of" });
    }
  }
  return results;
}
