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

/** An officer ruling something out ("there was no diversion of funds") reads,
 * to pure substring matching, identically to an officer alleging it ("there
 * was a diversion of funds") — both contain "diversion of funds". Checked as
 * whole words (never substring) so domain words like "noticee" can't
 * collide with the cue "not". Deliberately conservative: only negation
 * words immediately before the matched phrase are considered, within a
 * short word window — negation stated after the phrase ("diversion was
 * alleged but not established") is a known miss, preferred over the false
 * suppressions a wider or bidirectional window would risk. The window is
 * kept tight (not sentence-wide) because this domain's own vocabulary is
 * full of a different, non-negating pattern that a looser window would
 * wrongly catch: "never flagged AS a related party dealing" or "no record
 * OF the purchases" negate the disclosure/documentation verb, not the
 * underlying related-party-transaction or purchase-transaction concept —
 * the concept is exactly what's being alleged. Both were confirmed
 * regressions during tuning and are now excluded by keeping the window
 * short enough that the cue must sit right next to the match, with at
 * most one or two intervening words (e.g. "no genuine diversion"). */
const NEGATION_WORD_CUES = new Set([
  "no",
  "not",
  "never",
  "none",
  "without",
  "nil",
  "didn",
  "doesn",
  "wasn",
  "weren",
  "isn",
  "aren",
  "couldn",
  "shouldn",
  "wouldn",
  "hasn",
  "haven",
  "hadn",
]);
const NEGATION_PHRASE_CUES = ["no evidence of", "nothing to suggest", "unable to establish", "not established", "ruled out"];
// Single negation words must sit close to the match (at most a couple of
// intervening words, e.g. "no genuine diversion"); the multi-word phrase
// cues above are unambiguous enough on their own to allow a wider gap.
const NEGATION_WORD_WINDOW = 3;
const NEGATION_PHRASE_WINDOW = 6;

function hasPrecedingNegation(sentenceNormalized: string, matchIndex: number): boolean {
  const precedingWords = sentenceNormalized.slice(0, matchIndex).trim().split(" ").filter(Boolean);
  if (precedingWords.slice(-NEGATION_WORD_WINDOW).some((w) => NEGATION_WORD_CUES.has(w))) return true;
  const phraseWindowText = precedingWords.slice(-NEGATION_PHRASE_WINDOW).join(" ");
  return NEGATION_PHRASE_CUES.some((p) => phraseWindowText.includes(p));
}

/** Splits on sentence-ending punctuation so a negation earlier in one
 * sentence can never suppress a genuine, separately-stated match in the
 * next ("There was no diversion of funds. Related party transactions were
 * not disclosed." must still detect the RPT concept normally). Also splits
 * on contrastive conjunctions within one sentence ("though", "but", etc.):
 * CFID order language routinely uses exactly this construction to state one
 * outcome and then contrast it with another ("...the fraud charge was not
 * established, though LODR disclosure lapses were confirmed..."), and
 * without this split a negation cue on one side of the contrast was
 * wrongly suppressing a genuine, unnegated match stated on the other side. */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?;\n]+|,?\s+\b(?:though|but|however|although|whereas|yet)\b,?\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Deterministic keyword/synonym detection: for each controlled-vocabulary
 * concept tag, check whether any of its synonym phrases appear as a
 * substring of the normalized scenario text, ignoring occurrences that are
 * themselves negated in the scenario's own wording. No ML, no external
 * calls.
 */
export function detectConcepts(freeText: string): DetectedConcept[] {
  const sentences = splitIntoSentences(freeText)
    .map(normalizeText)
    .filter(Boolean);
  if (sentences.length === 0) return [];

  const results: DetectedConcept[] = [];
  for (const tag of NORMALIZED_TAGS) {
    const matchedPhrases: string[] = [];
    for (const syn of tag.normalizedSynonyms) {
      const matchedNonNegated = sentences.some((sentence) => {
        const idx = sentence.indexOf(syn);
        return idx !== -1 && !hasPrecedingNegation(sentence, idx);
      });
      if (matchedNonNegated) matchedPhrases.push(syn);
    }
    if (matchedPhrases.length > 0) {
      results.push({ id: tag.id, kind: tag.kind, label: tag.label, matchedPhrases });
    }
  }
  return results;
}

export function conceptsByKind(concepts: DetectedConcept[], kind: ConceptKind): DetectedConcept[] {
  return concepts.filter((c) => c.kind === kind);
}
