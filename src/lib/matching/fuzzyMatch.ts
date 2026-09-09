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
 * Terms that must NEVER be silently rewritten into a different word, even
 * within edit-distance tolerance, because each is a valid but legally
 * distinct legal/accounting/evidentiary/governance concept whose meaning
 * changes if swapped for a near neighbour (verification vs certification
 * chief among them — the specific defect this guard was added for: a bare
 * edit-distance search found "verification" was not itself a literal
 * curated-synonym word, while "certification" was (via "false
 * certification"), so a correctly-spelled "verification" was silently
 * rewritten to "certification"). A word in this set is always already
 * "recognized" (never itself corrected to anything else), regardless of
 * whether it happens to also appear as a curated synonym word — protecting
 * it does not depend on the curated vocabulary's own contents, which can
 * change independently of this list.
 */
export const PROTECTED_TERMS = new Set([
  "verification",
  "certification",
  "representation",
  "misrepresentation",
  "disclosure",
  "approval",
  "authorization",
  "authorisation",
  "audit",
  "investigation",
  "diversion",
  "misutilisation",
  "misutilization",
  "allotment",
  "consideration",
]);

/**
 * The full correction-candidate pool: curated vocabulary words plus every
 * protected term (so a genuine misspelling of a protected term, e.g.
 * "verfication", still correctly resolves back to that SAME protected term
 * — a spelling fix, not a meaning change — rather than drifting to whatever
 * unrelated curated word happens to be nearest once the correct target
 * isn't even a candidate). Deduplicated since a protected term may already
 * also be a literal curated synonym word (e.g. "certification").
 */
const CORRECTION_CANDIDATES: string[] = [...new Set([...VOCABULARY, ...PROTECTED_TERMS])];

/**
 * Corrects a single normalized (lowercase, alnum) word against the
 * correction-candidate pool if — and only if — exactly one candidate is
 * within tolerance. An exact-vocabulary or exact-protected-term hit needs
 * no correction (returns null); a tie between two equally-close candidates
 * is left uncorrected rather than guessed. A word already in PROTECTED_TERMS
 * is always treated as already-recognized and is NEVER corrected to
 * anything else, regardless of edit distance to some other word — this is
 * the hard guarantee that a correctly-typed "verification" can never
 * silently become "certification" (or any other protected term), no matter
 * what the curated vocabulary contains. Once the input itself has cleared
 * that guard, the candidate pool (including other protected terms) is
 * searched normally, so a genuine typo can still resolve to its own correct
 * word, protected or not.
 */
function correctWord(word: string): string | null {
  if (word.length < 7 || VOCABULARY.includes(word) || PROTECTED_TERMS.has(word)) return null;
  const tolerance = toleranceForLength(word.length);
  if (tolerance === 0) return null;
  let best: string | null = null;
  let bestDist = tolerance + 1;
  let tie = false;
  for (const candidate of CORRECTION_CANDIDATES) {
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
