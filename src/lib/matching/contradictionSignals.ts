// Historical Treatment correction pass, round 2 — comparability defect #2:
// "the entered scenario affirmatively states facts incompatible with a
// precedent's own critical basis" must demote that precedent, not merely
// leave it untouched because the incompatible fact was never positively
// matched. Example: a scenario stating an "arm's-length related-party
// transaction" affirmatively RULES OUT a precedent whose own finding
// record turns on a SHAM transaction — that is a stronger, different
// signal than the scenario simply not mentioning "sham" at all (silence),
// which this module never treats as a contradiction.
//
// Deliberately self-contained: this file does NOT import from or modify
// conceptExtraction.ts (detectConcepts and its negation machinery), which
// both Question A (engine.ts) and Question B share. A shared change to
// negation handling risks shifting Question A's own candidate set — the
// explicit instruction is to preserve every existing PFUTP/12A/non-PFUTP
// gate unchanged. This module's own small, local negation/list-negation
// check is used ONLY here, for Question B's comparability layer, and can
// never affect Question A.
import { normalizeText } from "./normalize";

export interface ContradictionSignal {
  /** Existing controlled-vocabulary concept-tag ids (see
   * data/curated/concept-tags.ts) whose presence in a PRECEDENT's own
   * record is incompatible with an affirmative statement the entered
   * scenario actually made. */
  contradictedConceptIds: Set<string>;
  /** conceptId -> which phrase/group in the entered text triggered the
   * contradiction, for inspectability — never a single opaque flag. */
  rationale: Map<string, string>;
}

interface StandalonePhraseGroup {
  label: string;
  phrases: string[];
  contradicts: string[];
}

// Phrases that are THEMSELVES already an affirmative compliant/negative
// statement (no additional negation-context check needed — "fully
// disclosed" or "arm's-length" is inherently the positive assertion of
// compliance, not a negation of something else).
const STANDALONE_GROUPS: StandalonePhraseGroup[] = [
  {
    label: "arm's-length / genuine related-party transaction",
    phrases: [
      "arm s length related party transaction",
      "arm s length related-party transaction",
      "arms length related party transaction",
      "genuine related party transaction",
      "genuine related-party transaction",
      "bona fide related party transaction",
      "at arm s length",
    ],
    contradicts: ["related_party_misrepresentation"],
  },
  {
    label: "fully / properly disclosed",
    phrases: ["fully disclosed", "duly disclosed", "properly disclosed", "adequately disclosed", "disclosed to the audit committee", "disclosed in the related party register", "disclosed in the related-party register"],
    contradicts: ["non_disclosure_of_information"],
  },
  {
    label: "funds used exactly as stated / no diversion",
    phrases: [
      "used exactly for the stated objects",
      "utilised exactly as stated",
      "utilized exactly as stated",
      "used for the stated objects of the issue",
      "no diversion of funds",
      "funds were not diverted",
      "applied strictly to its stated objects",
      "used strictly for its stated business purposes",
    ],
    contradicts: ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account"],
  },
  {
    label: "full cooperation with the investigation",
    phrases: [
      "full cooperation",
      "fully cooperated",
      "complied with every summons",
      "complied with all summons",
      "responded to all summons",
      "provided all requested records",
      "supplied all requested records",
      "furnished all requested documents",
      "cooperated fully with the investigation",
    ],
    contradicts: ["non_cooperation_with_investigation"],
  },
];

// Bare topic nouns that are contradictions ONLY when they sit inside a
// negated list within the SAME sentence (e.g. "There was no diversion,
// sham transaction, false financial statement, securities trading, price
// manipulation or investor inducement.") — matched unconditionally, these
// same words would just as often appear as a POSITIVE allegation
// elsewhere, so they are never treated as a contradiction on their own.
const LIST_NEGATION_CUES = ["there was no", "there were no", "there is no", "there are no", "none of the following", "without any"];

interface ListTopic {
  phrase: string;
  contradicts: string[];
}

const LIST_TOPICS: ListTopic[] = [
  { phrase: "diversion", contradicts: ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account"] },
  { phrase: "sham transaction", contradicts: ["related_party_misrepresentation"] },
  { phrase: "false financial statement", contradicts: ["financial_statement_misstatement"] },
  { phrase: "securities trading", contradicts: ["false_appearance_of_trading", "non_genuine_dealing_or_ownership"] },
  { phrase: "price manipulation", contradicts: ["actual_price_manipulation"] },
  { phrase: "investor inducement", contradicts: ["investor_inducement_to_trade"] },
  { phrase: "non cooperation", contradicts: ["non_cooperation_with_investigation"] },
  { phrase: "concealment", contradicts: ["non_disclosure_of_information"] },
];

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Detects affirmative-compliance / affirmative-negation statements in the
 * ENTERED scenario text and returns which existing concept-tag ids they
 * render incompatible with a precedent. Deterministic substring/list-cue
 * matching only — no ML, no external calls, and every hit is attributed to
 * the specific phrase/group that produced it (rationale) so this is
 * inspectable rather than a single opaque signal. */
export function detectContradictionSignals(freeText: string): ContradictionSignal {
  const contradictedConceptIds = new Set<string>();
  const rationale = new Map<string, string>();

  const record = (ids: string[], reason: string) => {
    for (const id of ids) {
      if (!contradictedConceptIds.has(id)) {
        contradictedConceptIds.add(id);
        rationale.set(id, reason);
      }
    }
  };

  const sentences = splitSentences(freeText).map(normalizeText).filter(Boolean);
  for (const sentence of sentences) {
    // Standalone phrases ARE the affirmative statement themselves ("fully
    // disclosed"), but a preceding negation word within a short window
    // flips that meaning ("was NOT fully disclosed", "was not disclosed to
    // the audit committee") — checked per match, never assumed away, so a
    // genuine denial is never misread as the compliance statement it
    // denies.
    for (const group of STANDALONE_GROUPS) {
      for (const phrase of group.phrases) {
        const idx = sentence.indexOf(phrase);
        if (idx === -1) continue;
        if (hasNearbyPrecedingNegation(sentence, idx)) continue;
        record(group.contradicts, `Entered scenario states "${group.label}".`);
        break;
      }
    }

    // Bare topic nouns are contradictions ONLY inside a negated list within
    // the same sentence (see LIST_TOPICS's own doc comment).
    const cueIndex = LIST_NEGATION_CUES.reduce((earliest, cue) => {
      const idx = sentence.indexOf(cue);
      if (idx === -1) return earliest;
      return earliest === -1 ? idx : Math.min(earliest, idx);
    }, -1);
    if (cueIndex === -1) continue;
    for (const topic of LIST_TOPICS) {
      const topicIndex = sentence.indexOf(topic.phrase);
      if (topicIndex !== -1 && topicIndex > cueIndex) {
        record(topic.contradicts, `Entered scenario affirmatively negates "${topic.phrase}" within a negated list ("${sentence.slice(cueIndex, cueIndex + 40)}...").`);
      }
    }
  }

  return { contradictedConceptIds, rationale };
}

// Short preceding-negation window for STANDALONE_GROUPS phrase matches —
// deliberately simple (unlike LIST_NEGATION_CUES, which intentionally
// spans an enumerated list) since a standalone phrase's own negation cue
// sits immediately before it in ordinary English ("was NOT fully
// disclosed", "had NOT been disclosed to the audit committee").
const NEARBY_NEGATION_WORDS = new Set(["not", "never", "no", "without", "n t", "nt"]);
const NEARBY_NEGATION_WINDOW = 4;

function hasNearbyPrecedingNegation(sentenceNormalized: string, matchIndex: number): boolean {
  const precedingWords = sentenceNormalized.slice(0, matchIndex).trim().split(" ").filter(Boolean);
  return precedingWords.slice(-NEARBY_NEGATION_WINDOW).some((w) => NEARBY_NEGATION_WORDS.has(w));
}
