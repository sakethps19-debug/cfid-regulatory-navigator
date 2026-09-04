import { CONCEPT_TAGS, type ConceptKind } from "@/data/curated/concept-tags";
import { normalizeText } from "./normalize";

export interface DetectedConcept {
  id: string;
  kind: ConceptKind;
  label: string;
  matchedPhrases: string[];
}

const NORMALIZED_TAGS = CONCEPT_TAGS.map((tag) => ({
  ...tag,
  normalizedSynonyms: tag.synonyms.map(normalizeText).filter(Boolean),
}));

/**
 * Deterministic keyword/synonym detection: for each controlled-vocabulary
 * concept tag, check whether any of its synonym phrases appear as a
 * substring of the normalized scenario text. No ML, no external calls.
 */
export function detectConcepts(freeText: string): DetectedConcept[] {
  const normalized = normalizeText(freeText);
  if (!normalized) return [];

  const results: DetectedConcept[] = [];
  for (const tag of NORMALIZED_TAGS) {
    const matchedPhrases = tag.normalizedSynonyms.filter((syn) => normalized.includes(syn));
    if (matchedPhrases.length > 0) {
      results.push({ id: tag.id, kind: tag.kind, label: tag.label, matchedPhrases });
    }
  }
  return results;
}

export function conceptsByKind(concepts: DetectedConcept[], kind: ConceptKind): DetectedConcept[] {
  return concepts.filter((c) => c.kind === kind);
}
