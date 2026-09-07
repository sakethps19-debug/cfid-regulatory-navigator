import { CONCEPT_TAGS } from "@/data/curated/concept-tags";
import { normalizeText } from "./normalize";

/**
 * Iterative Levenshtein distance with an early-exit cap: once every entry in
 * the current row exceeds `cap`, the words are already too different to be a
 * usable typo-correction candidate, so the full O(m*n) table is abandoned
 * early. This only matters for keeping correction of a full free-text
 * scenario fast against the whole curated vocabulary — it does not change
 * which corrections get made (anything genuinely within `cap` is still
 * found exactly).
 */
export function levenshteinDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1);
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > cap) return cap + 1;
    prev = curr;
  }
  return prev[n];
}

/**
 * How much typo tolerance a word of this length is allowed. Deliberately
 * conservative — a wrong auto-correction is worse than a missed one for a
 * tool whose whole premise is not asserting things it can't support, and
 * short-to-medium words are exactly where a one-letter edit distance starts
 * colliding with ordinary, unrelated English words (e.g. "found" is one
 * deletion from "fund"). Only the longer, distinctly domain-specific words
 * that make up most of this vocabulary (e.g. "preferential", "consolidation",
 * "misappropriation") get any tolerance at all.
 */
function toleranceForLength(len: number): number {
  if (len < 7) return 0;
  if (len <= 9) return 1;
  return 2;
}

const STOPWORDS = new Set([
  "of", "the", "and", "to", "a", "in", "for", "on", "by", "with", "from", "at", "as", "is", "was", "were", "not", "no",
]);

/**
 * Vocabulary of "correctable" words: every word of length >=5 appearing in
 * any curated concept-tag synonym — i.e. exactly the words the deterministic
 * matcher already knows how to act on. This pre-pass never invents a concept
 * the matcher doesn't otherwise recognize; it only fixes how a word the
 * matcher already looks for was spelled.
 */
const VOCABULARY: string[] = [
  ...new Set(
    CONCEPT_TAGS.flatMap((tag) => tag.synonyms.flatMap((s) => normalizeText(s).split(" "))).filter(
      (w) => w.length >= 5 && !STOPWORDS.has(w)
    )
  ),
];

export interface WordCorrection {
  original: string;
  corrected: string;
}

/**
 * Corrects a single normalized (lowercase, alnum) word against the curated
 * vocabulary if — and only if — exactly one vocabulary word is within
 * tolerance. An exact vocabulary hit needs no correction (returns null); a
 * tie between two equally-close vocabulary words is left uncorrected rather
 * than guessed.
 */
function correctWord(word: string): string | null {
  if (word.length < 7 || VOCABULARY.includes(word)) return null;
  const tolerance = toleranceForLength(word.length);
  if (tolerance === 0) return null;
  let best: string | null = null;
  let bestDist = tolerance + 1;
  let tie = false;
  for (const candidate of VOCABULARY) {
    if (Math.abs(candidate.length - word.length) > tolerance) continue;
    const d = levenshteinDistance(word, candidate, tolerance);
    if (d > tolerance) continue;
    if (d < bestDist) {
      best = candidate;
      bestDist = d;
      tie = false;
    } else if (d === bestDist && candidate !== best) {
      tie = true;
    }
  }
  if (tie || !best) return null;
  return best;
}

/**
 * Semantic-assist pre-pass: corrects likely typos in free text against the
 * curated concept vocabulary BEFORE handing it to the deterministic
 * concept-tag matcher (detectConcepts). It never adds or infers meaning of
 * its own — every correction is a bounded-edit-distance spelling fix against
 * a word the matcher already recognizes — and every correction made is
 * returned so the UI can show exactly what was read differently than typed.
 * The matcher's own exact-match/negation/scoring logic downstream is
 * completely unchanged; this only cleans up its input, and the user's
 * original text is never altered anywhere it is displayed back to them.
 */
export function applySemanticAssist(freeText: string): { correctedText: string; corrections: WordCorrection[] } {
  const tokens = freeText.split(/(\s+)/); // keep separators so unaffected spacing round-trips exactly
  const corrections: WordCorrection[] = [];
  const correctedTokens = tokens.map((token) => {
    if (token.length === 0 || /^\s+$/.test(token)) return token;
    const bare = token.replace(/[^a-zA-Z0-9]/g, "");
    if (!bare || !token.startsWith(bare) || /^[0-9]+$/.test(bare)) return token; // skip anything but word[+trailing punctuation]
    const normalized = bare.toLowerCase();
    const fix = correctWord(normalized);
    if (!fix || fix === normalized) return token;
    const suffix = token.slice(bare.length);
    const wasCapitalized = bare[0] !== bare[0].toLowerCase();
    const displayFix = wasCapitalized ? fix[0].toUpperCase() + fix.slice(1) : fix;
    corrections.push({ original: bare, corrected: fix });
    return displayFix + suffix;
  });
  return { correctedText: correctedTokens.join(""), corrections };
}
