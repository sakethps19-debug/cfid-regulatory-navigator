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

/** "sub_clause_of"/"parent_of" describe a genuine hierarchical relationship
 * and are only ever assigned WITHIN one instrument (e.g. Regulation 4(2)
 * and Regulation 4(2)(e) of the same Act). Two provisions from DIFFERENT
 * instruments that merely happen to share, or overlap in, their numbering —
 * such as PFUTP Regulation 4(2)(e) and LODR Regulation 4(2)(e)(i) — are
 * never a parent/child pair; they are unrelated provisions with coincidental
 * numbering, always reported as "similarly_numbered_different_instrument". */
export type SimilarProvisionRelation =
  | "similarly_numbered_different_instrument"
  | "sub_clause_of"
  | "parent_of";

export interface SimilarProvision {
  provision: LegalProvision;
  relation: SimilarProvisionRelation;
}

/**
 * Finds every OTHER provision whose numbering could plausibly be confused
 * with the target's — an identical or overlapping bracket/number sequence.
 * A genuine parent/sub-clause relationship ("sub_clause_of"/"parent_of") is
 * reported ONLY when both provisions belong to the same instrument — numeric
 * overlap alone is never enough, and is never sufficient across different
 * instruments regardless of how closely the numbering lines up. This is a
 * general safeguard, not hardcoded to any one pair: it runs identically for
 * every provision in the Law Library, and would catch a future case just as
 * it catches the known PFUTP Regulation 4(2)(e) / LODR Regulation 4(2)(e)(i)
 * pair — which, being in different instruments, is always reported as
 * "similarly_numbered_different_instrument", never as a sub-clause.
 */
export function findSimilarlyNumberedProvisions(target: LegalProvision, all: LegalProvision[]): SimilarProvision[] {
  const targetNorm = normalizeProvisionNumber(target.provisionNumber);
  if (!targetNorm) return [];
  const results: SimilarProvision[] = [];
  for (const p of all) {
    if (p.id === target.id) continue;
    const norm = normalizeProvisionNumber(p.provisionNumber);
    if (!norm) continue;

    const isExactMatch = norm === targetNorm;
    const pExtendsTarget = norm.startsWith(targetNorm) && norm[targetNorm.length] === "(";
    const targetExtendsP = targetNorm.startsWith(norm) && targetNorm[norm.length] === "(";
    if (!isExactMatch && !pExtendsTarget && !targetExtendsP) continue;

    const sameInstrument = p.instrument === target.instrument;

    if (sameInstrument && pExtendsTarget) {
      results.push({ provision: p, relation: "sub_clause_of" });
    } else if (sameInstrument && targetExtendsP) {
      results.push({ provision: p, relation: "parent_of" });
    } else {
      // Different instruments (or, rarely, an exact-number duplicate within
      // the same instrument) — numbering overlap alone never implies a
      // hierarchical relationship; only ever reported as coincidental
      // similar numbering.
      results.push({ provision: p, relation: "similarly_numbered_different_instrument" });
    }
  }
  return results;
}
