import { CONCEPT_TAGS, type ConceptKind } from "@/data/curated/concept-tags";
import { normalizeText } from "./normalize";

export interface DetectedConcept {
  id: string;
  kind: ConceptKind;
  label: string;
  matchedPhrases: string[];
  /** Every sentence index (0-based, within the scenario's own free text)
   * where this concept was detected without negation. Second-order
   * provision-precision remediation: used by the provision-level retrieval
   * gate to test whether two facts were stated as CONNECTED (the same
   * sentence) rather than merely both present somewhere in a long scenario
   * - see requireConnectedGroups in provision-retrieval-rules.ts. Two
   * unrelated facts anywhere in a scenario satisfying two independent
   * requirements is exactly the "bag of tags" reasoning that requirement
   * exists to prevent. A dropdown-signal-derived concept (see
   * buildEffectiveScenarioConcepts in engine.ts) carries no sentence of its
   * own and is represented with an empty array; the gate treats those as
   * compatible with any sentence, since selecting a dropdown is a
   * deliberate, explicit officer assertion about the scenario as a whole,
   * not free text whose proximity to another fact is otherwise unknown. */
  sentenceIndices: number[];
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

// P0 provision-precision remediation (100-scenario stress test): CFID
// scenario text routinely disclaims a whole LIST of things at once ("there
// is no allegation of diversion, fictitious accounting, price manipulation,
// securities trading, false announcement or other fraudulent
// securities-market conduct"). hasPrecedingNegation's short word/phrase
// window above only ever reaches the single item immediately following a
// negation cue - the third, fourth or fifth item in such a list sits far
// outside that window and would wrongly read as a positive, unnegated
// allegation. These two additional checks are purely ADDITIVE (new cue
// phrases/shapes not previously recognized as negation at all), so they
// only ever catch a negation that was previously missed - they cannot
// suppress a match that a prior test already relied on being detected.

/** Cue phrases that specifically introduce an enumerated, negated list
 * spanning the REST of the sentence, not just the next word or two. Once
 * one of these appears, every match later in the same sentence is treated
 * as negated. */
const NEGATION_LIST_CUES = [
  "no allegation of",
  "no allegations of",
  "there is no allegation of",
  "without any allegation of",
  "no suggestion of",
  "no indication of",
  "no facts have yet been provided about",
  "no facts have been provided about",
  "no additional facts are stated about",
];

function hasListNegationInEffect(sentenceNormalized: string, matchIndex: number): boolean {
  return NEGATION_LIST_CUES.some((cue) => {
    const cueIndex = sentenceNormalized.indexOf(cue);
    return cueIndex !== -1 && cueIndex < matchIndex;
  });
}

/** Handles the mirror-image sentence shape: the negation cue comes FIRST
 * ("No A, B, C or D is alleged.") and the closing verb comes LAST, after
 * the whole enumerated list. When a sentence both starts with a bare
 * negation word and ends with one of these closing phrases, every match
 * anywhere in that sentence is treated as negated, not just the first item.
 */
const SENTENCE_NEGATION_LEADING_WORDS = new Set(["no", "none", "nil", "without"]);
const SENTENCE_NEGATION_TRAILING_PHRASES = [
  "is alleged",
  "are alleged",
  "was alleged",
  "were alleged",
  "is stated",
  "are stated",
  "is present",
  "are present",
  "is involved",
  "are involved",
  "is suggested",
  "are suggested",
];

function isWholeSentenceNegated(sentenceNormalized: string): boolean {
  const firstWord = sentenceNormalized.split(" ")[0];
  if (!SENTENCE_NEGATION_LEADING_WORDS.has(firstWord)) return false;
  return SENTENCE_NEGATION_TRAILING_PHRASES.some((p) => sentenceNormalized.endsWith(p));
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
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?;\n]+|,?\s+\b(?:though|but|however|although|whereas|yet)\b,?\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// P0 bounded cross-sentence factual continuity (multi-sentence investigation
// narratives): an ordinary officer narrative routinely splits ONE factual
// object across sentences purely for readability - "A listed company
// advanced substantial funds to entities connected with its promoter group.
// The funds were subsequently transferred through multiple entities and
// were not used for the stated business purpose." Same-sentence-only
// connectivity (isConnected, provision-retrieval-rules.ts) cannot bridge
// this: "listed company" sits in sentence 0, the actual diversion facts in
// sentence 1, joined only by the anaphor "The funds". This is NOT a general
// relaxation of connectivity (scenario-wide bag-of-tags is exactly what the
// P0 provision-precision remediation eliminated) - it is a narrow,
// deterministic, CLOSED-CLASS continuation-phrase rule: a sentence is
// treated as continuing the IMMEDIATELY preceding one only when it opens
// with one of a small set of anaphoric references to a fund/transaction
// object ("the funds", "such proceeds", "the transaction", ...), and never
// when a break cue ("separately", "a different X", "an unrelated X") is
// present - both a genuinely distinct object introduced by name (an
// unrelated entity's own funds) and an explicit contrast marker fail to
// match. Deliberately excludes bare "the company" - that phrase recurs in
// nearly every sentence of this domain's narratives and would functionally
// re-open scenario-wide bridging (the actor is already tracked separately
// and robustly via the `company`/`promoter` actor tags; this mechanism
// exists specifically for the fund/transaction OBJECT a pronoun can hide).
const CONTINUATION_CUE_PHRASES = [
  "the funds",
  "such funds",
  "these funds",
  "the said funds",
  "the amount",
  "such amount",
  "these amounts",
  "the said amount",
  "the proceeds",
  "such proceeds",
  "these proceeds",
  "the said proceeds",
  "the advance",
  "such advance",
  "these advances",
  "the said advance",
  "the transaction",
  "such transaction",
  "the said transaction",
  // "the consideration" added (P0 recall-hardening sprint): the same
  // anaphoric-object pattern above, for a preferential-allotment narrative
  // that states the allotment in one sentence and the fate of its
  // CONSIDERATION (the payment/value received for it) in the next -- e.g.
  // "A listed company made a preferential allotment of shares. The
  // consideration for the allotment was funded through a circular
  // movement of money...". Scoped to only the two provisions whose own
  // subject is genuinely the sufficiency of that consideration (ICDR-160,
  // Companies Act ss.24/67(2) — see provision-retrieval-rules.ts); the
  // word itself is specific enough (payment/value for an allotment, not a
  // generic English word) to carry the same closed-class-anaphor design as
  // every other cue above.
  "the consideration",
  "such consideration",
  "the said consideration",
];

/** Cue phrases that affirmatively signal the sentence is introducing a
 * SEPARATE, distinct factual episode rather than continuing the prior
 * one - checked first and, if present WITHIN THE SAME LEADING WINDOW used
 * for the continuation cue below, always defeats a continuation-cue match
 * (e.g. "Separately, an unrelated entity diverted funds" must never read as
 * continuing the previous sentence's funds merely because a later,
 * unrelated fact also happens to be about funds). Deliberately checked only
 * within the sentence's OWN leading words, not anywhere in the sentence: an
 * ordinary sentence can legitimately use a phrase like "unrelated to" deep
 * inside its own factual assertion without introducing a new episode at all
 * (e.g. "Such funds were subsequently diverted for purposes unrelated to
 * the stated business purpose" is still squarely about the SAME funds -
 * "unrelated to" there modifies the funds' end use, not the sentence's
 * relationship to the prior one). A break cue only means what it says when
 * it is itself how the sentence opens. */
const CONTINUATION_BREAK_CUE_PHRASES = ["separately", "a different", "an unrelated", "unrelated to", "in a separate", "on a separate occasion"];

/** How many leading words of a sentence are scanned for a continuation cue
 * (and, symmetrically, a break cue) - kept short so either signal must
 * genuinely open the sentence's own factual assertion ("The funds were...",
 * "Separately, an unrelated entity..."), not merely appear somewhere within
 * a long sentence, which would be a much weaker, less deterministic signal
 * for a continuation cue, and a false trigger on ordinary phrasing for a
 * break cue (see CONTINUATION_BREAK_CUE_PHRASES above). */
const CONTINUATION_CUE_LEAD_WORDS = 5;

function sentenceContinuesPrevious(normalizedSentence: string): boolean {
  const leadWords = normalizedSentence.split(" ").slice(0, CONTINUATION_CUE_LEAD_WORDS).join(" ");
  if (CONTINUATION_BREAK_CUE_PHRASES.some((cue) => leadWords.includes(cue))) return false;
  return CONTINUATION_CUE_PHRASES.some((cue) => leadWords.startsWith(cue) || leadWords.includes(` ${cue}`));
}

/** For each sentence index, the CLOSURE of sentence indices it is
 * transitively continuity-linked to, backward only (a sentence's closure
 * always includes itself). Two concepts detected in different sentences
 * are continuity-connected exactly when their sentences' closures
 * intersect - see isConnected's continuityMap parameter
 * (provision-retrieval-rules.ts). A break anywhere stops the chain, so
 * this can never bridge two genuinely unrelated episodes elsewhere in a
 * long scenario, only an immediately adjacent, deterministically-signalled
 * continuation. */
export function computeContinuitySentenceGroups(freeText: string): Map<number, Set<number>> {
  const sentences = splitIntoSentences(freeText)
    .map(normalizeText)
    .filter(Boolean);
  const closures = new Map<number, Set<number>>();
  for (let i = 0; i < sentences.length; i++) {
    if (i === 0 || !sentenceContinuesPrevious(sentences[i])) {
      closures.set(i, new Set([i]));
      continue;
    }
    const previousClosure = closures.get(i - 1) ?? new Set([i - 1]);
    closures.set(i, new Set([...previousClosure, i]));
  }
  return closures;
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
    const matchedPhrases = new Set<string>();
    const sentenceIndices = new Set<number>();
    for (const syn of tag.normalizedSynonyms) {
      sentences.forEach((sentence, sentenceIndex) => {
        const idx = sentence.indexOf(syn);
        if (idx === -1) return;
        if (isWholeSentenceNegated(sentence)) return;
        if (hasPrecedingNegation(sentence, idx)) return;
        if (hasListNegationInEffect(sentence, idx)) return;
        matchedPhrases.add(syn);
        sentenceIndices.add(sentenceIndex);
      });
    }
    if (matchedPhrases.size > 0) {
      results.push({ id: tag.id, kind: tag.kind, label: tag.label, matchedPhrases: [...matchedPhrases], sentenceIndices: [...sentenceIndices] });
    }
  }
  return results;
}

export function conceptsByKind(concepts: DetectedConcept[], kind: ConceptKind): DetectedConcept[] {
  return concepts.filter((c) => c.kind === kind);
}
