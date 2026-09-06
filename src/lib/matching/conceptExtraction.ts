import { CONCEPT_TAGS, type ConceptKind } from "@/data/curated/concept-tags";
import { normalizeText } from "./normalize";

export interface DetectedConcept {
  id: string;
  kind: ConceptKind;
  label: string;
  matchedPhrases: string[];
}

/** A curated synonym written in one grammatical number ("fictitious sales")
 * should still match a scenario phrased in the other ("a fictitious sale") —
 * an officer's own wording, not the exact plural form on file, is what
 * varies in practice. Adds a singular/plural variant of the synonym's own
 * last word only (never touches the free-text side of matching), which is
 * the overwhelmingly common source of this kind of miss without risking the
 * false-positive collisions a blanket stemmer over arbitrary English words
 * would invite. */
function pluralVariant(normalizedSynonym: string): string | null {
  const words = normalizedSynonym.split(" ");
  const last = words[words.length - 1];
  if (last.length < 4) return null;
  if (last.endsWith("ies") && last.length > 4) {
    return [...words.slice(0, -1), last.slice(0, -3) + "y"].join(" ");
  }
  if (last.endsWith("s") && !last.endsWith("ss")) {
    return [...words.slice(0, -1), last.slice(0, -1)].join(" ");
  }
  const singularToY = last.replace(/y$/, "ies");
  if (singularToY !== last) {
    return [...words.slice(0, -1), singularToY].join(" ");
  }
  if (last.endsWith("s") || last.endsWith("d")) return null;
  return [...words.slice(0, -1), last + "s"].join(" ");
}

const NORMALIZED_TAGS = CONCEPT_TAGS.map((tag) => {
  const base = tag.synonyms.map(normalizeText).filter(Boolean);
  const variants = base.map(pluralVariant).filter((v): v is string => !!v);
  return { ...tag, normalizedSynonyms: [...new Set([...base, ...variants])] };
});

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
