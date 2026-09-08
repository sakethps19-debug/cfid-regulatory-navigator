// Question-A polarity defect fix (final blind-acceptance pass): the engine
// previously treated "topic present" as sufficient regulatory relevance —
// a provision surfaced as a candidate the moment a factually-overlapping
// precedent cited it and (for gated provisions) the query's own facts
// satisfied the provision's retrieval-topic, with NO check that the
// entered scenario's facts actually indicate an ADVERSE/breach state
// rather than an affirmatively COMPLIANT one. This module is the
// deterministic, inspectable "fact polarity" layer that fixes that: for
// the entered scenario text, it detects affirmative COMPLIANT statements
// (the scenario's own facts establishing that a specific adverse/breach
// predicate did NOT occur) and maps each one to the existing
// controlled-vocabulary conduct-tag id(s) it is incompatible with.
//
// Deliberately self-contained — generalizes the phrase-group/list-negation
// PATTERN already used in contradictionSignals.ts (Historical Treatment's
// own comparability-contradiction layer) to a much broader vocabulary
// covering every provision family item 3 of the mandate lists, but does
// NOT import from or modify contradictionSignals.ts itself, so Historical
// Treatment's own behavior is completely unaffected by this file existing.
//
// This is intentionally NOT "a small list of UI phrases": it is consumed
// by engine.ts to make a structural classification decision (candidate
// breach vs governing/no-breach vs additional-fact-required vs
// not-triggered/contradicted — see QuestionAPolarityClass in types.ts),
// and every hit carries a `rationale` explaining which phrase/group fired,
// so the classification is inspectable and testable, never a single
// opaque signal.
//
// P0 CONNECTIVITY FIX: a first version of this module recorded compliance
// hits into one SCENARIO-WIDE Set<string> — a compliant phrase anywhere in
// the free text could suppress an adverse candidate anywhere else, with no
// regard for whether the two statements concerned the same regulatory
// nexus, the same actor, or the same underlying transaction (e.g. "RPT A
// was fully disclosed" would wrongly read as ruling out non-disclosure of
// an unrelated Regulation 30 event, or of a wholly separate RPT B). Fixed
// by tracking each compliance hit as a PolarityEvidence record carrying
// its own sentence index, plus the transaction- and actor-kind concepts
// CO-DETECTED IN THAT SAME SENTENCE — the same "connected" test
// provision-retrieval-rules.ts already applies between a rule's own topic
// and adverse groups (see isConnected there), now applied a second time
// between a compliance statement and the provision it is being asked to
// suppress. See engine.ts's polarityEvidenceConnects for the consuming
// side. compliantConceptIds/rationale are kept, DERIVED from evidence, for
// any caller that only needs the coarse "was this ever stated compliant
// anywhere" signal (display text, etc.) — every classification decision in
// engine.ts now goes through the connectivity-aware `evidence` list
// instead.
import { normalizeText } from "./normalize";
import { splitIntoSentences, type DetectedConcept } from "./conceptExtraction";

/** One compliance/negation statement found in the entered scenario text,
 * with enough provenance to answer: what text triggered it; which
 * predicate it concerns; which sentence it came from; and which
 * topic/actor concepts were stated ALONGSIDE it in that same sentence —
 * the basis engine.ts uses to test connectivity to a specific provision
 * before letting it suppress or contradict anything. */
export interface PolarityEvidence {
  /** The controlled-vocabulary conduct-tag id this evidence concerns. */
  conceptId: string;
  /** Always "compliant" today (an affirmative statement, or a negated
   * list-topic, that the adverse predicate did not occur) — kept as a
   * literal union rather than a bare boolean so a future explicit-negative/
   * disputed state can be added without changing every call site. */
  polarity: "compliant";
  sentenceIndex: number;
  matchedText: string;
  /** Transaction-kind concept ids also detected in this SAME sentence —
   * the regulatory-nexus anchor (RPT, Regulation 30 event, issue proceeds,
   * investigation, preferential allotment, etc.). Empty means this
   * sentence stated no topic of its own the connectivity check can use. */
  nexusTopicIds: string[];
  /** Actor-kind concept ids also detected in this SAME sentence — e.g. a
   * compliance statement scoped to "the company" specifically must not be
   * read as covering "the promoter" elsewhere in the same scenario. Empty
   * means no specific actor was named (treated as company-wide/unscoped). */
  actorIds: string[];
  rationale: string;
}

export interface FactPolarityResult {
  /** Every compliance hit, with full sentence/nexus/actor provenance —
   * the primary output; engine.ts's connectivity check consumes this. */
  evidence: PolarityEvidence[];
  /** Existing controlled-vocabulary conduct-tag ids (concept-tags.ts) that
   * the entered scenario affirmatively states did NOT occur / are
   * satisfied compliantly, ANYWHERE in the scenario — a coarse, DERIVED
   * union of `evidence` with no connectivity applied. Retained only for
   * callers that need the bare "was this concept id ever stated compliant
   * anywhere" fact (e.g. display/explanatory text); never use this Set to
   * decide whether a specific provision may be suppressed or contradicted
   * — that decision must go through `evidence` and a connectivity check. */
  compliantConceptIds: Set<string>;
  rationale: Map<string, string>;
}

interface StandaloneGroup {
  label: string;
  phrases: string[];
  compliantFor: string[];
}

// Phrases that are themselves the affirmative compliant statement (no
// further negation-context check needed) — but STILL checked for a nearby
// PRECEDING negation, since even these can themselves be denied ("was NOT
// fully disclosed", "had NOT been duly approved").
const STANDALONE_GROUPS: StandaloneGroup[] = [
  // ----- Related-party transactions (LODR 23, Ind AS 24) -----
  {
    label: "RPT duly approved by the Audit Committee/shareholders",
    phrases: [
      "duly approved by the audit committee",
      "approved by the audit committee",
      "approved by audit committee",
      "approved by shareholders",
      "duly approved by the audit committee and shareholders",
      "properly approved",
    ],
    compliantFor: ["rpt_approval_lapse"],
  },
  {
    label: "RPT fully / properly disclosed",
    phrases: ["fully disclosed", "duly disclosed", "properly disclosed", "adequately disclosed", "disclosed to the audit committee", "disclosed in the related party register", "disclosed in the related-party register"],
    compliantFor: ["non_disclosure_of_information"],
  },
  {
    label: "RPT arm's-length / genuine",
    phrases: ["arm s length related party transaction", "arm s length related-party transaction", "arms length related party transaction", "genuine related party transaction", "genuine related-party transaction", "bona fide related party transaction", "at arm s length"],
    compliantFor: ["related_party_misrepresentation"],
  },
  {
    label: "RPT properly accounted for",
    // P0 connectivity fix: this compliance statement is about the RPT's OWN
    // accounting treatment, not general financial-statement accuracy — it
    // must never be read as ruling out financial_statement_misstatement for
    // an unrelated, topic-less rule (e.g. Ind AS 1's own bare misstatement
    // predicate, which has no topic group of its own for the connectivity
    // check in engine.ts to compare against and would otherwise connect
    // unconditionally). A general "financial statements were accurate"
    // statement (a genuinely on-topic fact) is already covered by the
    // separate "results accurate and timely filed" group below.
    phrases: ["properly accounted for", "correctly accounted for", "accounted for under applicable accounting standards"],
    compliantFor: ["related_party_misrepresentation"],
  },

  // ----- Material event disclosure (LODR 30) -----
  {
    label: "material event timely/accurately disclosed",
    phrases: ["timely and accurately disclosed", "accurately disclosed", "timely disclosed", "disclosed within the prescribed time", "disclosed within the prescribed timeline"],
    compliantFor: ["non_disclosure_of_information", "false_business_or_corporate_announcement"],
  },

  // ----- Financial results / accounting (LODR 33/48, Ind AS) -----
  {
    label: "results accurate and timely filed",
    phrases: ["results were accurate and timely filed", "accurate and timely filed", "quarterly results were accurate", "results were accurately reported", "financial statements were accurate"],
    compliantFor: ["financial_statement_misstatement", "fictitious_sales_or_revenue"],
  },
  {
    label: "sales genuine and supported by records",
    phrases: [
      "sales were genuine",
      "genuine and supported by gst",
      "supported by gst records",
      "supported by delivery documents",
      "supported by bank receipts",
      "supported by customer confirmations",
    ],
    compliantFor: ["fictitious_sales_or_revenue", "fictitious_or_nongenuine_assets"],
  },

  // ----- Investigation cooperation (SEBI Act 11C) -----
  {
    label: "full cooperation with the investigation",
    phrases: [
      "full cooperation",
      "fully cooperated",
      "complied with every summons",
      "complied with all summons",
      "summons were complied with",
      "summons was complied with",
      "responded to all summons",
      "provided all requested records",
      "supplied all requested records",
      "furnished all requested documents",
      "furnished all requested records",
      "cooperated fully with the investigation",
      "on time",
    ],
    compliantFor: ["non_cooperation_with_investigation"],
  },

  // ----- Preferential allotment (ICDR) -----
  {
    label: "preferential allotment fully paid, correctly priced, properly approved",
    phrases: [
      "fully paid",
      "correctly priced",
      "properly approved",
      "independently paid and verified",
      // "independent paid and verified" added (Question-A polarity
      // acceptance pass): applySemanticAssist's own spell-correction layer
      // (fuzzyMatch.ts) corrects the adverb "independently" to the
      // vocabulary word "independent" (distance 2, within this word
      // length's tolerance) before detectFactPolarity ever sees the text,
      // so the literal mandated phrase never reaches this module with the
      // "-ly" intact.
      "independent paid and verified",
      "lock-in was complied with",
      "lock in was complied with",
      "genuine consideration",
      "consideration was independently paid",
      "consideration was independent paid",
    ],
    compliantFor: ["sham_preferential_allotment", "unsupported_share_allotment_consideration"],
  },

  // ----- Issue proceeds (LODR 32) -----
  {
    label: "issue proceeds used exactly for stated objects / independently certified",
    phrases: [
      "used exactly for the stated objects",
      "used exactly for stated objects",
      "utilised exactly for the stated objects",
      "utilized exactly for the stated objects",
      "utilised exactly as stated",
      "utilized exactly as stated",
      "independently certified",
      "no diversion of funds",
      "funds were not diverted",
      "used strictly for stated business purposes",
      "applied strictly to its stated objects",
    ],
    compliantFor: ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account", "financial_statement_misstatement"],
  },

  // ----- Governance: Compliance Officer / Audit Committee (LODR 6/17/18) -----
  {
    label: "Compliance Officer continuously and qualifiedly appointed",
    phrases: ["continuously appointed", "remained continuously appointed", "qualified compliance officer", "no vacancy in the compliance officer"],
    compliantFor: ["compliance_officer_deficiency"],
  },
  {
    label: "Audit Committee properly constituted and functioning",
    phrases: ["properly constituted", "met as required", "discharged all applicable functions", "duly constituted audit committee"],
    compliantFor: ["audit_committee_deficiency"],
  },

  // ----- Statutory auditor (Companies Act 139/141) -----
  {
    label: "auditor satisfied independence/eligibility requirements",
    // Singular "requirement" variants added (Question-A polarity
    // acceptance pass): applySemanticAssist's own spell-correction layer
    // (fuzzyMatch.ts) singularizes "requirements" to "requirement" before
    // this module ever sees the text, whenever the corpus vocabulary
    // happens to contain the singular form elsewhere (as it does here, via
    // auditor_tenure_or_independence_issue's own "auditor rotation
    // requirement" synonym) — so the plural-only phrase below never
    // actually reaches this module intact.
    phrases: [
      "satisfied independence and eligibility requirements",
      "satisfied independence and eligibility requirement",
      "satisfied independence requirements",
      "satisfied independence requirement",
      "sufficient appropriate audit evidence",
      "independent and eligible",
    ],
    compliantFor: ["auditor_tenure_or_independence_issue"],
  },

  // ----- Market conduct / trading (PFUTP, SEBI Act 12A) -----
  {
    label: "genuine price movement, no manipulative conduct",
    phrases: ["genuine earnings improvement", "no manipulative conduct"],
    compliantFor: ["actual_price_manipulation", "false_appearance_of_trading", "non_genuine_dealing_or_ownership", "investor_inducement_to_trade"],
  },

  // ----- Ordinary/unrelated transaction (no adverse family implicated) -----
  {
    label: "unrelated third-party, arm's-length, ordinary course",
    phrases: ["unrelated third-party vendor", "unrelated third party vendor", "arm s length terms", "ordinary course of business"],
    compliantFor: ["related_party_misrepresentation", "rpt_approval_lapse", "non_disclosure_of_information"],
  },
];

// Bare topic nouns counted as compliant ONLY inside a negated list within
// the same sentence ("There was no diversion, sham transaction, false
// financial statement, securities trading, price manipulation or investor
// inducement.") — never on their own, since an unnegated mention would be
// a POSITIVE adverse allegation, not a compliance statement.
const LIST_NEGATION_CUES = ["there was no", "there were no", "there is no", "there are no", "none of the following", "without any", "no false", "no synchronized", "no synchronised", "no manipulative"];

interface ListTopic {
  phrase: string;
  compliantFor: string[];
}

const LIST_TOPICS: ListTopic[] = [
  { phrase: "diversion", compliantFor: ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account"] },
  { phrase: "siphon", compliantFor: ["fund_diversion"] },
  { phrase: "routed to promoters", compliantFor: ["fund_diversion", "fund_routed_personal_account"] },
  { phrase: "sham transaction", compliantFor: ["related_party_misrepresentation"] },
  { phrase: "false financial statement", compliantFor: ["financial_statement_misstatement"] },
  { phrase: "misstatement", compliantFor: ["financial_statement_misstatement"] },
  { phrase: "fictitious revenue", compliantFor: ["fictitious_sales_or_revenue"] },
  { phrase: "securities trading", compliantFor: ["false_appearance_of_trading", "non_genuine_dealing_or_ownership"] },
  { phrase: "synchronized trades", compliantFor: ["false_appearance_of_trading"] },
  { phrase: "synchronised trades", compliantFor: ["false_appearance_of_trading"] },
  { phrase: "wash trades", compliantFor: ["false_appearance_of_trading"] },
  { phrase: "false disclosures", compliantFor: ["non_disclosure_of_information", "false_business_or_corporate_announcement"] },
  // "false disclosure" (singular) added (Question-A polarity acceptance
  // pass): applySemanticAssist singularizes "disclosures" before this
  // module sees the text whenever the singular form appears elsewhere in
  // the vocabulary.
  { phrase: "false disclosure", compliantFor: ["non_disclosure_of_information", "false_business_or_corporate_announcement"] },
  { phrase: "manipulative conduct", compliantFor: ["actual_price_manipulation"] },
  // "manipulation conduit" added (Question-A polarity acceptance pass):
  // applySemanticAssist's spell-correction layer corrects the ordinary
  // English word "conduct" to the unrelated vocabulary word "conduit"
  // (edit distance 1, within this word length's tolerance) and separately
  // corrects "manipulative" to "manipulation" — a known, disclosed
  // limitation of that pre-existing correction layer (see final report),
  // worked around here rather than in fuzzyMatch.ts itself.
  { phrase: "manipulation conduit", compliantFor: ["actual_price_manipulation"] },
  { phrase: "price manipulation", compliantFor: ["actual_price_manipulation"] },
  { phrase: "investor inducement", compliantFor: ["investor_inducement_to_trade"] },
  { phrase: "non cooperation", compliantFor: ["non_cooperation_with_investigation"] },
  { phrase: "non-cooperation", compliantFor: ["non_cooperation_with_investigation"] },
  { phrase: "concealment", compliantFor: ["non_disclosure_of_information"] },
];

const NEARBY_NEGATION_WORDS = new Set(["not", "never", "no", "without"]);
const NEARBY_NEGATION_WINDOW = 4;

function hasNearbyPrecedingNegation(sentenceNormalized: string, matchIndex: number): boolean {
  const precedingWords = sentenceNormalized.slice(0, matchIndex).trim().split(" ").filter(Boolean);
  return precedingWords.slice(-NEARBY_NEGATION_WINDOW).some((w) => NEARBY_NEGATION_WORDS.has(w));
}

/** Detects affirmative-compliance statements in the ENTERED scenario text
 * and returns which existing conduct-tag ids they render satisfied/absent,
 * each carrying its own sentence/nexus/actor provenance (PolarityEvidence)
 * so a consumer can test CONNECTIVITY before treating it as applicable to
 * any particular provision — never a scenario-wide bag-of-tags signal.
 * Deterministic phrase/list-cue matching only — no ML.
 *
 * `detected` must be the SAME DetectedConcept[] (from detectConcepts, run
 * on this same text) the caller is already using elsewhere — this module
 * reuses its sentence indices exactly (via the same splitIntoSentences) so
 * "co-detected in this sentence" means the identical thing on both sides. */
export function detectFactPolarity(freeText: string, detected: DetectedConcept[]): FactPolarityResult {
  const evidence: PolarityEvidence[] = [];
  const compliantConceptIds = new Set<string>();
  const rationale = new Map<string, string>();

  const topicIdsBySentence = new Map<number, string[]>();
  const actorIdsBySentence = new Map<number, string[]>();
  for (const c of detected) {
    const bucket = c.kind === "transaction" ? topicIdsBySentence : c.kind === "actor" ? actorIdsBySentence : null;
    if (!bucket) continue;
    for (const idx of c.sentenceIndices) {
      bucket.set(idx, [...(bucket.get(idx) ?? []), c.id]);
    }
  }

  const record = (ids: string[], reason: string, sentenceIndex: number, matchedText: string) => {
    const nexusTopicIds = topicIdsBySentence.get(sentenceIndex) ?? [];
    const actorIds = actorIdsBySentence.get(sentenceIndex) ?? [];
    for (const id of ids) {
      evidence.push({ conceptId: id, polarity: "compliant", sentenceIndex, matchedText, nexusTopicIds, actorIds, rationale: reason });
      if (!compliantConceptIds.has(id)) {
        compliantConceptIds.add(id);
        rationale.set(id, reason);
      }
    }
  };

  const sentences = splitIntoSentences(freeText).map(normalizeText).filter(Boolean);
  sentences.forEach((sentence, sentenceIndex) => {
    for (const group of STANDALONE_GROUPS) {
      for (const phrase of group.phrases) {
        const idx = sentence.indexOf(phrase);
        if (idx === -1) continue;
        if (hasNearbyPrecedingNegation(sentence, idx)) continue;
        record(group.compliantFor, `Entered scenario states "${group.label}".`, sentenceIndex, phrase);
        break;
      }
    }

    const cueIndex = LIST_NEGATION_CUES.reduce((earliest, cue) => {
      const idx = sentence.indexOf(cue);
      if (idx === -1) return earliest;
      return earliest === -1 ? idx : Math.min(earliest, idx);
    }, -1);
    if (cueIndex === -1) return;
    for (const topic of LIST_TOPICS) {
      const topicIndex = sentence.indexOf(topic.phrase);
      if (topicIndex !== -1 && topicIndex > cueIndex) {
        record(
          topic.compliantFor,
          `Entered scenario affirmatively negates "${topic.phrase}" ("${sentence.slice(Math.max(0, cueIndex), cueIndex + 50)}...").`,
          sentenceIndex,
          topic.phrase
        );
      }
    }
  });

  return { evidence, compliantConceptIds, rationale };
}
