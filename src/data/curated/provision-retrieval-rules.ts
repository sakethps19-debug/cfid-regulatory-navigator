// P0 provision-precision remediation (first pass: 100-scenario stress test;
// second pass: independent post-remediation review, 120-scenario blind
// suite — see docs/provision-gating-remediation-v2.md for the full
// clause-by-clause matrix and reasoning behind every group below).
//
// FIRST-PASS ROOT CAUSE: every one of the 498 finding_provisions rows
// linking a scenario finding to a PFUTP or SEBI Act 12A provision has an
// EMPTY justifying_tags array, so engine.ts's per-link gate treated every
// one as universal. Fixed by an independent, provision-level gate applied
// in addition to (never instead of) the per-link justifyingTags check.
//
// SECOND-PASS DEFECT (this file): the first-pass gate itself still relied
// on ONE coarse tag, price_manipulation_nexus, to satisfy multiple
// textually distinct PFUTP 4(2) clauses, and on plain "requireAllOfGroups"
// bag-of-tags matching that let two UNRELATED facts anywhere in a long
// scenario each satisfy one independent group without ever being stated as
// connected to each other (e.g. "an undisclosed RPT" + a wholly separate
// "the share price genuinely rose on unrelated news" would previously have
// satisfied both a dealing-nexus group and a fraud-conduct group). Two
// structural fixes:
//
// 1. price_manipulation_nexus split into four narrower conduct tags (see
//    concept-tags.ts): false_appearance_of_trading, non_genuine_dealing_or_
//    ownership, actual_price_manipulation, investor_inducement_to_trade —
//    each tracking one statutory predicate, not a blend.
// 2. passesRetrievalGate now requires, for any rule with 2+ groups, that at
//    least one matching concept from each group be CONNECTED — the same
//    sentence in the entered free text, or a dropdown signal (a deliberate,
//    explicit officer assertion about the scenario as a whole) — not
//    merely present somewhere in the scenario. See DetectedConcept.
//    sentenceIndices (conceptExtraction.ts) for how that is tracked.

import type { DetectedConcept } from "@/lib/matching/conceptExtraction";

/** At least one concept-tag id from EACH inner group must be present among
 * the query's effective concepts (see buildEffectiveScenarioConcepts), AND
 * — for a rule with 2+ groups — at least one such match per group must be
 * CONNECTED (same sentence, or a dropdown signal) to a match in every other
 * group. A single-group rule is a plain "require any of these"; it needs no
 * connectivity check since there is nothing to connect. Collapsed into one
 * field rather than three separately-named ones (requireAny/requireAll/
 * excludeIf) because every rule actually needed here is expressible as this
 * one shape. */
export interface ProvisionRetrievalRule {
  provisionId: string;
  requireAllOfGroups: string[][];
  /** Plain-language statement of the minimum facts required, shown to the
   * officer alongside the provision so the gate's own reasoning is never
   * hidden inside code. This is a retrieval PREREQUISITE, not a legal
   * ingredients test: satisfying it means the provision is worth
   * examining, not that its elements have been established. */
  explanation: string;
  /** Opt-in only, same meaning as the identically-named field on each
   * alternateRoutes entry below, applied here to the PRIMARY
   * requireAllOfGroups route instead: when true, this rule's own-group
   * connectivity check also treats two concepts as connected via the
   * bounded cross-sentence continuity map (computeContinuitySentenceGroups,
   * conceptExtraction.ts). Reserved for a provision whose own subject is, by
   * its nature, routinely split across two adjacent sentences the same way
   * PFUTP-4-1's diversion route is (a transaction/context sentence
   * immediately followed by a diversion/misuse sentence referring back to it
   * only by anaphora) — currently only LODR-32 (issue-proceeds monitoring):
   * "A listed company raised proceeds through a rights issue. The proceeds
   * were transferred to promoter-connected entities instead of being used
   * for the disclosed objects." Left false (same-sentence-only) for every
   * other rule in this file. */
  allowSentenceContinuity?: boolean;
  /** Optional additional, INDEPENDENTLY-sufficient route(s) into the same
   * provision id — evaluated with the identical own-group-satisfaction and
   * own-connectivity rules as requireAllOfGroups (see passesRetrievalGate),
   * then OR'd against the primary route. Reserved for a provision whose
   * governing text itself contains more than one free-standing basis for
   * liability (e.g. the PFUTP Regulation 4(1) Explanation's diversion/
   * misutilisation/siphoning deeming clause, which does not require
   * Regulation 4(1)'s general securities-dealing nexus at all) — never used
   * to loosen what any single route on its own requires. Each route's
   * groups are independently AND'd and independently connectivity-checked;
   * a match under one route can never combine with a match under another
   * to satisfy either. */
  alternateRoutes?: {
    requireAllOfGroups: string[][];
    /** Opt-in only: when true, this route's own-group connectivity check
     * (satisfiesGroups) also treats two concepts as connected when their
     * sentences are linked by the bounded cross-sentence continuity map
     * (computeContinuitySentenceGroups, conceptExtraction.ts) — an ordinary
     * investigation narrative splitting ONE factual object across adjacent
     * sentences purely for readability (e.g. "A listed company advanced
     * funds to promoter-connected entities. The funds were subsequently
     * diverted..."). Same-sentence connectivity (isConnected's base check)
     * still applies first and is unaffected; this only ADDS a narrow,
     * deterministic extra basis for connectivity on routes that explicitly
     * opt in. Never set on requireAllOfGroups (the primary route) or on any
     * other provision's rule — actor connectivity, the disclosure-family
     * gates, and every other rule in this file remain same-sentence-only. */
    allowSentenceContinuity?: boolean;
  }[];
}

// ----- Reusable concept-tag groups -----
//
// Composed entirely from the existing curated CONCEPT_TAGS vocabulary
// (src/data/curated/concept-tags.ts) — no new tag ids are introduced here
// beyond the price_manipulation_nexus split already made in that file.

/** Evidence a securities TRANSACTION of some kind actually occurred —
 * either an issue/allotment event, or actual trading/dealing conduct
 * (which necessarily implies dealing occurred). An ordinary corporate
 * transaction (an RPT, a vendor purchase, an internal fund transfer) is
 * not itself a securities dealing, and is deliberately excluded. */
const SECURITIES_DEALING_OR_ISSUE_NEXUS = [
  "preferential_allotment",
  "rights_issue",
  "sham_preferential_allotment",
  "unsupported_share_allotment_consideration",
  "false_appearance_of_trading",
  "actual_price_manipulation",
  "non_genuine_dealing_or_ownership",
];

/** False, fictitious or misrepresented CONTENT — what was said or recorded,
 * as opposed to a trading act. Never includes a trading-conduct tag: a
 * synchronized-trading fact is not itself "information", and conflating
 * the two here would silently let trading conduct satisfy the "false
 * information" predicate 4(2)(f)/(k)/(r) each specifically require. */
const FALSE_INFORMATION_CONTENT = [
  "fictitious_sales_or_revenue",
  "fictitious_or_nongenuine_assets",
  "financial_statement_misstatement",
  "false_business_or_corporate_announcement",
  "related_party_misrepresentation",
  "sham_preferential_allotment",
  "unsupported_share_allotment_consideration",
];

/** Any of the three trading/price-conduct predicates — used where a clause
 * needs "some dealing/trading act occurred", without requiring the MORE
 * specific one of the three that 4(2)(a)/(b)/(e) each individually gate on
 * below. */
const TRADING_CONDUCT_ANY = ["false_appearance_of_trading", "actual_price_manipulation", "non_genuine_dealing_or_ownership"];

/** Fraudulent or deceptive conduct in the broadest sense the general
 * anti-fraud clauses (PFUTP 3(a)-(d)/4(1), SEBI Act 12A(a)-(c)) require:
 * either false/fictitious content, or trading conduct that is itself the
 * deceptive act (wash trading, price manipulation). Governance/disclosure
 * lapses (RPT non-disclosure, Audit Committee/Compliance Officer
 * deficiencies) are deliberately excluded — those are gated by their own
 * home instrument's provisions, never by PFUTP/SEBI Act 12A. */
const FRAUDULENT_OR_DECEPTIVE_CONDUCT = [...FALSE_INFORMATION_CONTENT, ...TRADING_CONDUCT_ANY];

/** The channel through which information reaches investors/the market. */
const INVESTOR_COMMUNICATION_CHANNEL = [
  "financial_statement_disclosure",
  "consolidated_financials",
  "standalone_financials",
  "annual_report_disclosure",
  "corporate_announcement",
  "business_segment_disclosure",
];

// ----- Non-PFUTP provision-precision remediation (this pass) -----
//
// The prior two passes gated PFUTP/SEBI Act 12A only; live production data
// showed the SAME architecture defect present across LODR (284 links, 248
// with empty justifying_tags), SEBI Act non-12A (52 links, 100% empty),
// Indian Accounting Standards (26 links, 22 empty), Companies Act (8 links,
// 100% empty) and ICDR (3 links, 100% empty): with no provision-level
// rule, retrievalRuleForProvision() returned undefined and every one of
// these provisions was completely ungated, surfacing on nothing more than
// weak (Low-confidence, 1-2 category) score overlap. A live-corpus probe of
// a scenario stating an RPT "conducted at fair value and disclosed in
// full... all financial statements accurate and no irregularities found"
// returned 56 candidate provisions, including both SEBI Act fraud-penalty
// provisions (15HA/15HB) and the entire LODR Regulation 4/33/34/48 family.
// See docs/provision-gating-remediation-v3.md for the full matrix.
//
// Groups below are, like the PFUTP ones above, composed entirely from
// existing curated vocabulary (plus one new tag, material_event_disclosure,
// added for Regulation 30, which had no existing tag for its own specific
// subject matter) and use the same connectivity mechanism.

/** A related-party TRANSACTION fact — sufficient on its own for the
 * materiality-threshold provision (Regulation 23(1) proviso), which is
 * itself about whether an RPT crosses a value threshold, not about a
 * separate procedural failure. */
const RPT_FACT = ["related_party_transaction"];

/** A stated failure in the RPT approval/disclosure process — required, in
 * addition to RPT_FACT, for provisions imposing a specific procedural duty
 * (Audit Committee approval, shareholder approval): a genuinely approved,
 * fully disclosed RPT must not satisfy these. This corpus's vocabulary does
 * not yet separately distinguish an Audit-Committee-approval lapse from a
 * shareholder-approval lapse from a bare RPT misrepresentation — all three
 * gate on the same signal here; a genuine limitation, disclosed rather than
 * papered over with an invented distinction the vocabulary cannot support. */
const RPT_PROCESS_LAPSE = ["non_disclosure_of_information", "audit_committee_deficiency", "related_party_misrepresentation", "rpt_approval_lapse"];

/** Any conduct fact this corpus's vocabulary treats as a genuine
 * substantive violation, as opposed to a bare topic/actor/evidence mention.
 * Used to gate provisions that are themselves general principles or
 * residual penalties riding on SOME violation, rather than independent
 * triggers of their own (LODR Regulation 4(1)/4(2)(f) family, SEBI Act
 * Section 15HB) — shown once a substantive violation is otherwise
 * established, never on a clean/compliant scenario. */
const ANY_SUBSTANTIVE_VIOLATION_CONDUCT = [
  "financial_statement_misstatement",
  "fictitious_sales_or_revenue",
  "fictitious_or_nongenuine_assets",
  "non_disclosure_of_information",
  "related_party_misrepresentation",
  "fund_diversion",
  "circular_fund_movement",
  "fund_routed_personal_account",
  "false_business_or_corporate_announcement",
  "sham_preferential_allotment",
  "unsupported_share_allotment_consideration",
  "audit_committee_deficiency",
  "compliance_officer_deficiency",
  "false_compliance_certification",
  "director_governance_failure",
  "non_cooperation_with_investigation",
  ...TRADING_CONDUCT_ANY,
];

/** Actor tags identifying a natural person potentially "in charge of and
 * responsible to the company for the conduct of its business" — the
 * category SEBI Act Section 27's company-attribution mechanism actually
 * targets. Deliberately excludes statutory_auditor (an independent
 * professional, not a person in charge of the company's business) and
 * related_party_counterparty (an outside role); an officer researching a
 * statutory auditor's own exposure should look to the provision governing
 * THAT duty specifically, not Section 27's attribution mechanism. */
const PERSON_IN_CHARGE_OF_COMPANY = [
  "promoter",
  "managing_director",
  "executive_director",
  "chairman",
  "cfo",
  "ceo",
  "compliance_officer",
  "director_general",
  "nominee_director",
  "independent_director",
  "audit_committee_member",
];

/** Financial results (as opposed to the broader annual-report/corporate-
 * announcement channel) — the specific channel LODR Regulation 33's
 * preparation/submission/timeline sub-clauses each require. */
const FINANCIAL_RESULTS_CHANNEL = ["financial_statement_disclosure", "standalone_financials", "consolidated_financials"];

/** P0 Demo B result-quality fix: Regulation 33's own subject is the
 * preparation/manner/timeline of FINANCIAL RESULTS CONTENT itself — the
 * SAME content-correctness family Regulation 48 gates on (see LODR-48
 * below), not "some substantive violation happened to be alleged and a
 * financial-results-channel fact was also mentioned". Using the broad
 * ANY_SUBSTANTIVE_VIOLATION_CONDUCT list here (as the LODR-4-1 umbrella-
 * principle family legitimately does) let a channel mention connected to
 * ANY unrelated violation — including a bare non-disclosure fact with no
 * stated misstatement — promote the entire 11-sub-clause Regulation 33
 * family. Narrowed to the same misstatement/fictitious-content predicate
 * LODR-48 itself requires; every existing "must" assertion for this family
 * across the test suite already uses one of these three tags, so this is a
 * pure narrowing with no known regression. */
const FINANCIAL_RESULTS_CONTENT_VIOLATION = ["financial_statement_misstatement", "fictitious_sales_or_revenue", "fictitious_or_nongenuine_assets"];

/** SEBI's own investigation is under way — the minimum context any Section
 * 11(2)/11C power needs to be a candidate at all. */
const INVESTIGATION_CONTEXT = ["investigation_process"];

/** Question-A polarity acceptance pass: LODR-32's own subject
 * (issue-proceeds monitoring/disclosure) is a genuine substantive
 * obligation, not a bare definition or SEBI power — unlike LODR-23-1 or
 * the SEBI Section 11(2) power family, it needs its own adverse predicate,
 * not merely the rights_issue topic, or it would always read as
 * "governing, no breach" even on a scenario stating issue proceeds were
 * diverted. Reuses the same fund-misuse vocabulary factPolarity.ts already
 * treats as the compliant-negation family for "issue proceeds used
 * exactly for the stated objects". */
const ISSUE_PROCEEDS_MISUSE = ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account", "financial_statement_misstatement"];

/** Diversion/misutilisation/siphoning of assets or earnings, in the terms
 * the PFUTP Regulation 4(1) Explanation itself uses — mirrors engine.ts's
 * own PURE_FUND_MOVEMENT_TAGS (how money moved, with no inherent connection
 * to a securities transaction). Used ONLY for PFUTP-4-1's Explanation-
 * specific alternate route below, alongside the listed_company topic tag —
 * never to gate PFUTP 3, PFUTP 4(2)'s own lettered sub-clauses, or SEBI Act
 * 12A, each of which keeps its own independent predicate.
 *
 * P0 recall-hardening sprint (general classification-defect fix):
 * fund_transfer_personal_account and fund_transfer_promoter_entity were
 * REMOVED from this list. Both are "transaction"-kind concept tags (see
 * concept-tags.ts) — they record WHERE funds went, a neutral occurrence
 * fact used throughout this corpus as a `transactionTypes` topic anchor,
 * never itself an adverse/breach-indicating fact (per engine.ts's own
 * documented invariant: "'transaction'/'actor'/'evidence'-kind tags are
 * neutral occurrence facts ... never themselves a breach"). Their prior
 * inclusion here let a scenario stating ONLY "funds were transferred to a
 * personal/promoter-controlled account" — with no further adverse
 * characterisation at all — satisfy this route's own adverse-conduct
 * group. That is not merely imprecise: it silently broke the SAME
 * invariant everywhere downstream that relies on it (engine.ts's own
 * adverseConceptIdsForRule filters strictly by kind==="conduct", so a
 * gate that passed only via one of these two ids produced ZERO adverse
 * ids for the promotion-eligibility check — the confirmed root cause of a
 * gate-passing, genuinely adverse fund-diversion scenario ("Funds
 * belonging to a listed company were transferred to the personal bank
 * account of its promoter and were used for purposes unrelated to the
 * company's business.") being demoted to governing/additional_fact_
 * required instead of promoted to a candidate breach). The three
 * remaining ids are all genuinely conduct-kind and require no further
 * adverse characterisation to satisfy this route, which is exactly
 * correct: "diverted", "circularly moved" and "routed through a personal
 * account" ARE themselves the adverse act; "transferred to a personal
 * account" alone is not (it could be a lawful salary/dividend payment) —
 * see fund_diversion's own widened synonym family below for how a bare
 * "personal/promoter account" transfer now still reaches this route once
 * the scenario states the missing adverse characterisation ("used for
 * purposes unrelated to...", "not used for the stated purpose", ...). */
const PURE_FUND_MOVEMENT_CONDUCT = ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account"];

export const PROVISION_RETRIEVAL_RULES: ProvisionRetrievalRule[] = [
  {
    provisionId: "PFUTP-3-a",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Regulation 3(a) prohibits buying, selling or otherwise dealing in securities in a fraudulent manner. It requires a securities transaction (an issue/allotment, or actual trading conduct) connected to a fraudulent or deceptive act.",
  },
  {
    provisionId: "PFUTP-3-b",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Regulation 3(b) requires a manipulative or deceptive device or contrivance used in connection with the issue, purchase or sale of a listed or to-be-listed security. It requires a securities transaction connected to a deceptive-device fact.",
  },
  {
    provisionId: "PFUTP-3-c",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Regulation 3(c) requires a device, scheme or artifice to defraud in connection with dealing in or the issue of listed (or to-be-listed) securities. It requires a securities transaction connected to a fraudulent-scheme fact.",
  },
  {
    provisionId: "PFUTP-3-d",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Regulation 3(d) requires an act, practice or course of business operating as a fraud or deceit on any person, in connection with dealing in or the issue of listed (or to-be-listed) securities. It requires a securities transaction connected to a fraud/deceit fact.",
  },
  {
    provisionId: "PFUTP-4-1",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Regulation 4(1) is the general prohibition on manipulative, fraudulent or unfair trade practice in connection with securities, mirroring Regulation 3. It is satisfied on either of two independent bases: (1) a securities transaction connected to fraudulent or deceptive conduct, or (2) under the Explanation to Regulation 4(1), diversion, misutilisation or siphoning off of the assets or earnings of a company whose securities are listed — that Explanation deems such conduct to always have been a manipulative, fraudulent or unfair trade practice under sub-regulation (1), without needing the ordinary securities-dealing nexus route (1) requires.",
    // P0 diversion/PFUTP-4(1) fix: Explanation-specific route, verified
    // against the official current (last amended 28 June 2024) consolidated
    // PFUTP Regulations, 2003 (sebi.gov.in), Explanation to Regulation 4(1)
    // — "any act of diversion, misutilisation or siphoning off of assets or
    // earnings of a company whose securities are listed ... shall be and
    // shall always be deemed to have been included in sub-regulation (1)".
    // Independently sufficient: does NOT require SECURITIES_DEALING_OR_
    // ISSUE_NEXUS or FRAUDULENT_OR_DECEPTIVE_CONDUCT above, and does not
    // extend to PFUTP 3, PFUTP 4(2)'s own lettered sub-clauses (each keeps
    // its own independent predicate — see PFUTP-4-2-* rules below,
    // unaffected by this route) or SEBI Act 12A. A private/unlisted
    // company's fund diversion does not satisfy this route, since
    // "listed_company" is not detected — see concept-tags.ts.
    // P0 multi-sentence factual continuity fix: officer narratives routinely
    // split this exact fact pattern across two adjacent sentences purely for
    // readability ("A listed company advanced funds to promoter-connected
    // entities. The funds were subsequently diverted...") - "listed_company"
    // sits in the first sentence, the diversion conduct in the next, joined
    // only by an anaphoric reference to the funds/proceeds/amount/advance/
    // transaction. allowSentenceContinuity opts this route (and only this
    // route) into that bounded, closed-class continuation-phrase bridge; see
    // computeContinuitySentenceGroups (conceptExtraction.ts) for the exact
    // rule and its safeguards against scenario-wide or cross-entity bridging.
    alternateRoutes: [
      {
        requireAllOfGroups: [["listed_company"], PURE_FUND_MOVEMENT_CONDUCT],
        allowSentenceContinuity: true,
      },
    ],
  },
  {
    provisionId: "PFUTP-4-2-a",
    requireAllOfGroups: [["false_appearance_of_trading"]],
    explanation:
      "Regulation 4(2)(a) is specifically about knowingly creating a false or misleading appearance of trading (e.g. synchronized or wash trades). It requires that specific fact, not artificial price or ownership facts alone, and not fictitious accounting or an undisclosed transaction without more.",
  },
  {
    provisionId: "PFUTP-4-2-b",
    requireAllOfGroups: [TRADING_CONDUCT_ANY],
    explanation:
      "Regulation 4(2)(b) is dealing in securities involving an artificial price. It requires an actual trading/dealing act connected to an artificial-price, false-appearance-of-trading, or non-genuine-ownership fact.",
  },
  {
    provisionId: "PFUTP-4-2-c",
    requireAllOfGroups: [TRADING_CONDUCT_ANY, FALSE_INFORMATION_CONTENT],
    explanation:
      "Regulation 4(2)(c) requires a person dealing in securities who circulates or disseminates rumours or information not based on fact. It requires a trading/dealing act connected to a false-information fact.",
  },
  {
    provisionId: "PFUTP-4-2-e",
    requireAllOfGroups: [["actual_price_manipulation"]],
    explanation:
      "Regulation 4(2)(e) is an act or omission amounting to manipulation of the security's price. It requires that specific fact, an actual or alleged price effect, not merely a trading pattern or ownership fact without a stated price consequence.",
  },
  {
    provisionId: "PFUTP-4-2-f",
    requireAllOfGroups: [FALSE_INFORMATION_CONTENT, INVESTOR_COMMUNICATION_CHANNEL],
    explanation:
      "Regulation 4(2)(f) is publishing or reporting untrue securities-related information. It requires false/fictitious content connected to a fact showing it reached investors/the market through a specific communication channel (financial statements, annual report, corporate announcement, etc.); an internal misstatement never published or reported does not, by itself, satisfy it.",
  },
  {
    provisionId: "PFUTP-4-2-k",
    // Broader second group than 4(2)(f): the statutory text is
    // "disseminating false/misleading information LIKELY TO INFLUENCE
    // INVESTORS" - an explicit inducement/influence qualifier 4(2)(f)'s
    // bare "publishing/reporting" wording lacks - so either a communication
    // channel OR an explicit inducement fact satisfies this clause's own
    // independent predicate, not a mechanical copy of 4(2)(f)'s gate.
    requireAllOfGroups: [FALSE_INFORMATION_CONTENT, [...INVESTOR_COMMUNICATION_CHANNEL, "investor_inducement_to_trade"]],
    explanation:
      "Regulation 4(2)(k) is disseminating false or misleading information likely to influence investors, an explicit investor-influence qualifier 4(2)(f) lacks. It requires false/fictitious content connected to either a communication channel or an explicit investor-inducement fact.",
  },
  {
    provisionId: "PFUTP-4-2-r",
    requireAllOfGroups: [FALSE_INFORMATION_CONTENT, ["investor_inducement_to_trade"]],
    explanation:
      "Regulation 4(2)(r) is knowingly planting false or misleading information that induces trades. It requires false/fictitious content connected to an explicit trading-inducement fact; trading manipulation conduct alone, without a stated false-information fact distinct from that conduct, does not satisfy it.",
  },
  {
    provisionId: "SEBI-ACT-12A-a",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Section 12A(a) mirrors PFUTP Regulation 3(b): a manipulative or deceptive device used in connection with the issue, purchase or sale of securities. Same minimum facts.",
  },
  {
    provisionId: "SEBI-ACT-12A-b",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Section 12A(b) mirrors PFUTP Regulation 3(c): a device, scheme or artifice to defraud in connection with the issue of, or dealing in, securities. Same minimum facts.",
  },
  {
    provisionId: "SEBI-ACT-12A-c",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Section 12A(c) mirrors PFUTP Regulation 3(d): an act, practice or course of business operating as fraud or deceit, in connection with the issue of or dealing in securities. Same minimum facts.",
  },
  // Defense in depth for two pre-split, legacy bundled ids that no longer
  // exist in the live database (confirmed live: legal_provisions only has
  // the split PFUTP-3-a/b/c/d and SEBI-ACT-12A-a/b/c rows) but still appear
  // in the pilot-era generated fixture JSON that tests/fixtures.ts loads.
  {
    provisionId: "SEBI-ACT-12A",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Section 12A prohibits manipulative/deceptive devices and fraudulent schemes in connection with the issue of or dealing in securities. Requires a securities transaction connected to fraudulent or deceptive conduct.",
  },
  {
    provisionId: "PFUTP-3-a-d",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "Regulation 3 (clauses (a)-(d)) prohibits fraudulent or deceptive conduct in connection with dealing in or the issue of securities. Requires a securities transaction connected to fraudulent or deceptive conduct.",
  },

  // ----- LODR Regulation 23 (related-party transactions) -----
  {
    provisionId: "LODR-23-1",
    requireAllOfGroups: [RPT_FACT],
    explanation:
      "[Definition/materiality threshold] Regulation 23(1)'s proviso sets the value threshold above which a related-party transaction becomes material. It requires only a related-party-transaction fact; whether that transaction actually crosses the threshold is a further question the entered facts should separately address.",
  },
  {
    provisionId: "LODR-23-2",
    requireAllOfGroups: [RPT_FACT, RPT_PROCESS_LAPSE],
    explanation:
      "[Governance/procedural obligation] Regulation 23(2) requires prior Audit Committee approval of related-party transactions. It requires a related-party-transaction fact connected to a stated approval, disclosure or Audit Committee process failure; a related-party transaction that was genuinely approved and disclosed does not, without more, satisfy it.",
    // P0 recall-hardening sprint: a strict SUPERSET of an already-correct
    // fact pattern (the same RPT-approval-lapse narrative, plus one more,
    // fully consistent sentence about the same transaction's disclosure
    // fate) was found to silently lose this provision entirely, because
    // that extra sentence shifted which sentence the query's own
    // related_party_transaction match landed in relative to the approval-
    // lapse sentence — same-sentence-only connectivity then failed even
    // though both facts plainly describe the one RPT the scenario is
    // about. allowSentenceContinuity bridges exactly this, using the same
    // bounded, closed-class anaphoric-cue mechanism as PFUTP-4-1/LODR-32
    // (computeContinuitySentenceGroups, conceptExtraction.ts) — it can
    // never bridge a genuinely separate, unrelated RPT or transaction
    // stated elsewhere in a longer scenario.
    allowSentenceContinuity: true,
  },
  {
    provisionId: "LODR-23-4",
    requireAllOfGroups: [RPT_FACT, RPT_PROCESS_LAPSE],
    explanation:
      "[Governance/procedural obligation] Regulation 23(4) requires shareholder approval (by ordinary resolution, the related party not voting) for material related-party transactions. It requires a related-party-transaction fact connected to a stated approval or disclosure failure. This corpus's vocabulary does not yet separately distinguish an Audit-Committee-approval lapse from a shareholder-approval lapse; both currently gate on the same underlying facts.",
    // P0 recall-hardening sprint: same fix, same reasoning as LODR-23-2
    // immediately above.
    allowSentenceContinuity: true,
  },

  // ----- LODR Regulation 30 (material events) -----
  {
    provisionId: "LODR-30",
    requireAllOfGroups: [["material_event_disclosure"], ["non_disclosure_of_information", "false_business_or_corporate_announcement"]],
    explanation:
      "[Disclosure obligation] Regulation 30 requires disclosure of material events/information to the stock exchanges. It requires a material-event/price-sensitive-information fact connected to a stated non-disclosure, delay or inaccuracy in that specific disclosure; wrongdoing occurring elsewhere in a scenario (e.g. fictitious sales in the accounts) does not, by itself, establish a Regulation 30 disclosure failure.",
  },

  // ----- LODR Regulation 27(2)(a) and Regulation 31 (disclosure-family
  // contamination fix, pre-merge legal-verification pass) -----
  //
  // Both were previously ungated, relying on the same subjectAgnostic
  // fallback as every other empty-justifyingTags provision. Live-corpus
  // probe confirmed a false promotion: "A listed company entered into a
  // related party transaction ... and the transaction was not disclosed"
  // promoted BOTH to primary_candidate, because every one of their real
  // finding_provisions links is on a multi-issue finding whose OWN
  // transactionTypes bag happens to also include related_party_transaction
  // (that same historical matter separately had an RPT issue too) — see
  // hasConnectedTopicOverlap in engine.ts. Neither provision's own official
  // text (SEBI LODR Regulations, 2015, current consolidated text,
  // sebi.gov.in) has anything to do with related-party transactions:
  // Regulation 27(2)(a) is the quarterly corporate governance compliance
  // report submission duty; Regulation 31(1) is the shareholding pattern
  // statement submission duty. Gating each on its own actual subject (see
  // the two new topic tags in concept-tags.ts) removes them from the
  // ungated fallback entirely, so an unrelated RPT non-disclosure fact can
  // never promote either again, while a scenario genuinely stating that
  // OWN report/statement was not submitted/disclosed still can.
  {
    provisionId: "LODR-27-2-a",
    // P0 recall-hardening sprint: financial_statement_misstatement added
    // to the second group — the report was genuinely SUBMITTED but
    // contained a material misstatement (e.g. of board/committee
    // composition and independence) is still a Regulation 27(2)(a)
    // failure (the duty is to submit an ACCURATE report), a distinct fact
    // pattern from non-submission that non_disclosure_of_information alone
    // does not capture. Both remain subjectAgnostic conduct tags requiring
    // same-sentence connectivity to THIS provision's own
    // governance_compliance_report topic — an unrelated misstatement
    // elsewhere in the scenario still cannot connect.
    requireAllOfGroups: [["governance_compliance_report"], ["non_disclosure_of_information", "financial_statement_misstatement"]],
    explanation:
      "[Disclosure obligation] Regulation 27(2)(a) requires the listed entity to submit a quarterly compliance report on corporate governance to the stock exchange(s). It requires a fact about that specific report connected to a stated non-submission, delay, inaccuracy or material misstatement; an unrelated disclosure lapse elsewhere in the scenario (e.g. an undisclosed related-party transaction) does not, by itself, establish a Regulation 27(2)(a) failure.",
  },
  {
    provisionId: "LODR-31-statement",
    // P0 recall-hardening sprint: same widening as LODR-27-2-a immediately
    // above — a submitted-but-materially-incorrect shareholding pattern
    // statement (e.g. omitting promoter-group holdings) is still a
    // Regulation 31 failure.
    requireAllOfGroups: [["shareholding_pattern_statement"], ["non_disclosure_of_information", "financial_statement_misstatement"]],
    explanation:
      "[Disclosure obligation] Regulation 31(1) requires the listed entity to submit a statement of shareholding pattern to the stock exchange(s). It requires a fact about that specific statement connected to a stated non-submission, delay, inaccuracy or material misstatement; an unrelated disclosure lapse elsewhere in the scenario (e.g. an undisclosed related-party transaction) does not, by itself, establish a Regulation 31 failure.",
  },

  // ----- LODR Regulation 48 (accounting standards) -----
  // The single highest-volume empty-tagged provision in the live corpus (28
  // links). Gated on a financial-results channel fact connected to a
  // stated MISSTATEMENT specifically (Regulation 48's own subject is
  // compliance with prescribed accounting standards) — never used as a
  // generic synonym for "financial statements were wrong" in some looser
  // sense (a bare disclosure-timeliness or governance lapse does not
  // satisfy it).
  {
    provisionId: "LODR-48",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, ["financial_statement_misstatement", "fictitious_sales_or_revenue", "fictitious_or_nongenuine_assets"]],
    explanation:
      "[Accounting/reporting obligation] Regulation 48 requires compliance with the accounting standards specified for listed entities. It requires a financial-results-specific fact connected to a stated misstatement, fictitious-revenue or fictitious-asset fact (all genuine accounting-standard non-compliance); a bare disclosure-timeliness or governance lapse, or a financial-statement mention with no such fact, does not satisfy it.",
  },

  // ----- LODR Regulation 33 (financial results) -----
  {
    provisionId: "LODR-33-1-gen",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(1) sets general requirements for preparing financial results submitted to the stock exchange(s). It requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content); a violation unconnected to the preparation or submission of financial results (e.g. a governance, non-disclosure, or investigation-only fact) does not satisfy it.",
  },
  {
    provisionId: "LODR-33-1-a",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(1)(a) requires financial results to be prepared on an accrual basis, using uniform accounting practices across periods. Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-1-c",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(1)(c) concerns the manner of preparing/presenting financial results submitted to the stock exchange(s). Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-1-d",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(1)(d) concerns the manner of preparing/presenting financial results submitted to the stock exchange(s). Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-2-a",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Governance/procedural obligation] Regulation 33(2)(a) concerns approval and signing of financial results before submission to the stock exchange(s). Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-3-gen",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(3) sets the timelines and manner of submitting quarterly/annual financial results. Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-3-b",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(3)(b) concerns submission of financial results to the stock exchange(s). Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-3-c",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(3)(c) concerns submission of financial results to the stock exchange(s). Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-3-d",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(3)(d) requires audited standalone financial results within sixty days of the financial year-end, with the audit report and a Statement on Impact of Audit Qualifications or a declaration. Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-3-i",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(3)(i) concerns submission of financial results to the stock exchange(s). Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },
  {
    provisionId: "LODR-33-5",
    requireAllOfGroups: [FINANCIAL_RESULTS_CHANNEL, FINANCIAL_RESULTS_CONTENT_VIOLATION],
    explanation:
      "[Accounting/reporting obligation] Regulation 33(5) applies to submission of financial results (read together with Regulation 33(3) in this corpus). Requires a financial-results-specific fact connected to a stated misstatement, fictitious-sales or fictitious-asset fact (Regulation 33 is itself about the correctness of financial-results content) -- not merely some other, unconnected violation elsewhere in the scenario, nor a bare financial-statement mention.",
  },

  // ----- LODR Regulation 34 (annual report) -----
  {
    provisionId: "LODR-34-2-a",
    requireAllOfGroups: [["annual_report_disclosure"], ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[Accounting/reporting obligation] Regulation 34(2)(a) requires the annual report to contain the audited standalone financial statements. Requires an annual-report-specific fact; an accounting error not connected to the annual report itself does not, by itself, satisfy it.",
  },
  {
    provisionId: "LODR-34-2-b",
    requireAllOfGroups: [["annual_report_disclosure"], ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[Accounting/reporting obligation] Regulation 34(2)(b) requires the annual report to contain the audited consolidated financial statements. Requires an annual-report-specific fact connected to a stated violation, not merely that an annual report exists.",
  },
  {
    provisionId: "LODR-34-3",
    requireAllOfGroups: [["annual_report_disclosure"], ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[Disclosure obligation] Regulation 34(3) requires the annual report to contain the other disclosures specified in the Companies Act, 2013 and Schedule V. Requires an annual-report-specific fact connected to a stated violation, not merely that an annual report exists.",
  },
  {
    provisionId: "LODR-SCHEDULE-V-A-1",
    requireAllOfGroups: [["annual_report_disclosure"], ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[Disclosure obligation] Schedule V, Part A, Clause 1 requires annual-report disclosure of related-party transactions per the applicable Accounting Standard. Requires an annual-report-specific fact connected to a stated violation, not merely that an annual report exists.",
  },

  // ----- LODR Regulation 46 (website) -----
  {
    provisionId: "LODR-46-2-s",
    requireAllOfGroups: [["consolidated_financials"], ["non_disclosure_of_information"]],
    explanation:
      "[Disclosure obligation] Regulation 46(2)(s) requires website publication of subsidiary financial statements. Requires a subsidiary/consolidation-specific fact connected to a stated non-publication/non-disclosure fact; a company committing fraud elsewhere does not, by itself, establish a website-publication failure, and the bare presence of subsidiary financials being genuinely and correctly published does not satisfy it either.",
  },

  // ----- LODR Regulation 32 (issue-proceeds monitoring) -----
  {
    provisionId: "LODR-32",
    requireAllOfGroups: [["rights_issue"], ISSUE_PROCEEDS_MISUSE],
    explanation:
      "[Disclosure/governance obligation] Regulation 32/32(7A) requires monitoring and disclosure of issue-proceeds utilisation. Requires an issue-proceeds-specific fact (IPO/rights-issue/preferential-issue proceeds) connected to a stated diversion or misstatement fact; ordinary bank-loan diversion unconnected to a securities issue, and a bare, compliant mention of issue proceeds with no stated misuse, do not satisfy it.",
    // P0 multi-sentence factual continuity fix: this provision's own subject
    // is, by its nature, an issue-proceeds CONTEXT fact (a rights/
    // preferential issue) immediately followed by a diversion/misuse fact
    // about THOSE proceeds, referred back to only by anaphora ("The
    // proceeds were transferred..."), the same split-across-adjacent-
    // sentences pattern PFUTP-4-1's diversion route was fixed for. See
    // ProvisionRetrievalRule.allowSentenceContinuity above.
    allowSentenceContinuity: true,
  },

  // ----- LODR Regulation 4 (general principles) -----
  // Deliberately gated on ANY established substantive violation, not a
  // provision-specific predicate: these are general/umbrella principles the
  // Regulations themselves state apply "in letter and spirit" across every
  // other obligation, not independent triggers of their own. Shown as
  // related/general-principle candidates once some violation is otherwise
  // established, never on a clean/compliant scenario. See docs/
  // provision-gating-remediation-v3.md for why this corpus's vocabulary
  // does not support gating each lettered sub-clause more narrowly.
  {
    provisionId: "LODR-4-1",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1) is the umbrella clause of general disclosure/governance principles a listed entity must abide by. Shown as a related general-principle candidate once some other substantive violation is established by the entered facts; not itself an independent trigger.",
  },
  {
    provisionId: "LODR-4-1-a",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(a): information shall be prepared and disclosed in accordance with applicable accounting/disclosure standards. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-b",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(b): prescribed accounting standards shall be implemented in letter and spirit, with an independent, competent auditor. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-c",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(c): the listed entity shall refrain from misrepresentation and ensure information given to exchanges/investors is not misleading. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-d",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(d): the listed entity shall recognise stakeholder rights and give timely, effective redress. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-e",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(e): timely and accurate disclosure of all material matters, financial situation, performance, ownership and governance. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-g",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(g): the listed entity shall abide by all applicable securities-law provisions and Board/exchange guidelines. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-h",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(h): specified disclosures/obligations shall be followed in letter and spirit, taking all stakeholders' interests into account. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-i",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(i): event-based/periodic filings shall contain relevant information. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-1-j",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(1)(j): periodic filings shall enable investors to track performance over regular intervals. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-2-f",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(2)(f) is the umbrella board-responsibilities clause under which numbered sub-duties (i)-(iii) sit. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-2-f-i",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(2)(f)(i), a numbered board-responsibility sub-duty. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-2-f-ii",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(2)(f)(ii), a numbered board-responsibility sub-duty. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-2-f-iii",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[General principle] Regulation 4(2)(f)(iii), a numbered board-responsibility sub-duty. General-principle candidate, shown once some substantive violation is established.",
  },
  {
    provisionId: "LODR-4-2-e-i",
    requireAllOfGroups: [["financial_statement_misstatement"]],
    explanation:
      "[Accounting/reporting obligation] Regulation 4(2)(e)(i) requires financial statements to give a true and fair view in accordance with applicable accounting standards. Unlike the general-principle 4(1)/4(2)(f) family above, this sub-clause's own subject is specific enough to require a stated financial-statement misstatement fact, not merely any violation elsewhere.",
  },

  // ----- SEBI Act, 1992 (non-12A) -----
  {
    provisionId: "SEBI-ACT-11C-2",
    requireAllOfGroups: [INVESTIGATION_CONTEXT, ["non_cooperation_with_investigation"]],
    explanation:
      "[Investigation/cooperation obligation] Section 11C(2) imposes a duty to preserve and produce books, registers, documents and records to the investigating authority. Requires an investigation context connected to a stated non-cooperation/non-production fact; a scenario stating SEBI investigated and the entity fully cooperated does not satisfy it.",
  },
  {
    provisionId: "SEBI-ACT-11C-3",
    requireAllOfGroups: [INVESTIGATION_CONTEXT, ["non_cooperation_with_investigation"]],
    explanation:
      "[Investigation/cooperation obligation] Section 11C(3) is the investigating authority's power to require production of books, registers, documents and records. Requires an investigation context connected to a stated non-cooperation/non-production fact.",
  },
  {
    provisionId: "SEBI-ACT-11C-5",
    requireAllOfGroups: [INVESTIGATION_CONTEXT, ["non_cooperation_with_investigation"]],
    explanation:
      "[Investigation/cooperation obligation] Section 11C(5) is a further investigating-authority power under Section 11C. Requires an investigation context connected to a stated non-cooperation fact.",
  },
  {
    provisionId: "SEBI-ACT-11-2-i",
    requireAllOfGroups: [INVESTIGATION_CONTEXT],
    explanation:
      "[SEBI power/remedial provision] Section 11(2)(i) is SEBI's power to inspect books/registers/documents of a registered intermediary. Requires only an investigation context; this is a power SEBI may exercise, not a substantive prohibition on the entity's own conduct.",
  },
  {
    provisionId: "SEBI-ACT-11-2-ia",
    requireAllOfGroups: [INVESTIGATION_CONTEXT],
    explanation:
      "[SEBI power/remedial provision] Section 11(2)(ia) is SEBI's power to call for information/records relevant to an investigation. Requires only an investigation context; a power SEBI may exercise, not a substantive prohibition.",
  },
  {
    provisionId: "SEBI-ACT-11-2-gen",
    requireAllOfGroups: [INVESTIGATION_CONTEXT],
    explanation:
      "[SEBI power/remedial provision] Section 11(2) is the umbrella power for SEBI to protect investors and regulate the securities market. Requires only an investigation/regulatory-action context.",
  },
  {
    provisionId: "SEBI-ACT-11-2-e",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "[SEBI power/remedial provision] Section 11(2)(e) is SEBI's power to prohibit fraudulent and unfair trade practices, mirroring PFUTP. Same minimum facts as the PFUTP fraud family: a securities transaction connected to fraudulent or deceptive conduct.",
  },
  {
    provisionId: "SEBI-ACT-15HA",
    requireAllOfGroups: [SECURITIES_DEALING_OR_ISSUE_NEXUS, FRAUDULENT_OR_DECEPTIVE_CONDUCT],
    explanation:
      "[Penalty provision, not itself a violation] Section 15HA is the monetary penalty for fraudulent and unfair trade practices; its quantum is fixed separately under Sections 15-I/15J. Gated on the same minimum facts as the PFUTP/12A fraud family it penalises: a securities transaction connected to fraudulent or deceptive conduct.",
  },
  {
    provisionId: "SEBI-ACT-15HB",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[Residual penalty provision, not itself a violation] Section 15HB is the catch-all penalty for any SEBI Act/rule/regulation/direction contravention with no separately specified penalty. It is not, on its own, a standalone conduct standard; shown once some other substantive violation is established by the entered facts.",
  },
  {
    provisionId: "SEBI-ACT-27",
    requireAllOfGroups: [ANY_SUBSTANTIVE_VIOLATION_CONDUCT, PERSON_IN_CHARGE_OF_COMPANY],
    explanation:
      "[Liability/attribution provision, not itself a violation] Section 27 attributes a company's contravention to persons who were, at the relevant time, in charge of and responsible to the company for the conduct of its business (subject to their own consent/connivance/negligence defence). It is not a generic company-violation provision: it requires a substantive violation fact connected to a stated actor in such a role, not merely that a director/officer exists somewhere in the matter. It must never be read as extending automatically to every named individual once the company itself is found to have violated a provision.",
  },

  // ----- SEBI (ICDR) Regulations, 2018 -----
  {
    provisionId: "ICDR-158-CH-V",
    requireAllOfGroups: [["preferential_allotment"]],
    explanation:
      "[Substantive prohibition] Regulation 158 (Chapter V) sets preferential-issue guidelines, including the exemption for share issuance on conversion of a genuine loan. Requires a preferential-allotment-specific fact.",
  },
  {
    provisionId: "ICDR-160",
    requireAllOfGroups: [["preferential_allotment"], ["sham_preferential_allotment", "unsupported_share_allotment_consideration"]],
    explanation:
      "[Substantive prohibition] Regulation 160 requires preferentially-allotted equity shares to be fully paid up at allotment. Requires a preferential-allotment fact connected to a stated non-payment/sham-consideration fact; the bare fact that a preferential allotment occurred does not, by itself, establish a non-payment violation.",
    // P0 recall-hardening sprint: a preferential allotment is very often
    // stated in one sentence and the fate of its CONSIDERATION (the
    // payment/value received for it) in the very next ("A listed company
    // made a preferential allotment of shares... The consideration for the
    // allotment was funded through a circular movement of money..."), the
    // same one-factual-object-split-across-sentences pattern already fixed
    // for PFUTP-4-1/LODR-32/LODR-23-2/23-4/Ind AS 24. "the consideration"
    // is now a recognised continuation cue (conceptExtraction.ts), scoped
    // to exactly this provision family.
    allowSentenceContinuity: true,
  },
  {
    provisionId: "ICDR-167",
    requireAllOfGroups: [["preferential_allotment"]],
    explanation:
      "[Substantive prohibition] Regulation 167 sets the lock-in period for preferential allottees (3 years for promoter/promoter-group, 1 year for others). Requires a preferential-allotment fact. This corpus's vocabulary does not yet separately tag a lock-in-specific fact from the bare allotment fact (the existing preferential_allotment tag's own synonyms include lock-in phrasing); a genuine, disclosed limitation rather than an invented distinction.",
  },

  // ----- Indian Accounting Standards -----
  {
    provisionId: "IND-AS-1",
    requireAllOfGroups: [["financial_statement_misstatement"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 1 (Presentation of Financial Statements) is a general presentation standard. Requires a stated financial-statement misstatement fact; not shown merely because financial statements are mentioned.",
  },
  // P0 Demo B result-quality fix: previously completely ungated (no rule at
  // all), so it surfaced as a primary candidate on ANY scenario carrying a
  // generic financial-statement-misstatement/non-disclosure fact, regardless
  // of subject matter. The live corpus's only IND-AS-23 link (MAGNUM-01) is
  // squarely about reversed accrued interest and unrecognised bank-loan
  // interest expense -- Ind AS 23's own actual subject (Borrowing Costs) --
  // so this gates it on that specific fact instead.
  {
    provisionId: "IND-AS-23",
    requireAllOfGroups: [["interest_or_borrowing_cost_misstatement"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 23 (Borrowing Costs) governs recognition and capitalisation of interest/borrowing costs. Requires a stated fact about interest/borrowing-cost recognition, accrual or capitalisation specifically; a generic financial-statement misstatement or receivables adjustment with no interest/borrowing-cost fact does not, by itself, satisfy it.",
  },
  {
    provisionId: "IND-AS-32",
    requireAllOfGroups: [["investment_valuation"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 32 (Financial Instruments: Presentation) requires a financial-instrument/investment-valuation-specific fact; the bare presence of trade receivables or other assets does not, by itself, satisfy it.",
  },
  {
    provisionId: "IND-AS-109",
    requireAllOfGroups: [["investment_valuation"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 109 (Financial Instruments: recognition/measurement, including expected credit loss) requires a financial-instrument/investment-valuation-specific fact; the bare existence of trade receivables does not, by itself, satisfy it.",
  },
  {
    provisionId: "IND-AS-107",
    requireAllOfGroups: [["investment_valuation"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 107 (Financial Instruments: Disclosures) requires a financial-instrument/investment-valuation-specific fact.",
  },
  {
    provisionId: "IND-AS-110",
    requireAllOfGroups: [["consolidated_financials"], ANY_SUBSTANTIVE_VIOLATION_CONDUCT],
    explanation:
      "[Accounting/reporting requirement] Ind AS 110 (Consolidated Financial Statements) requires a subsidiary/control/consolidation-specific fact connected to a stated violation (e.g. a misstatement from wrongly excluding a controlled subsidiary); a standalone accounting error unconnected to consolidation, or a bare, compliant mention of consolidated financials, does not, by itself, satisfy it.",
  },
  {
    provisionId: "IND-AS-115",
    requireAllOfGroups: [["revenue_recognition"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 115 (Revenue from Contracts with Customers) requires a revenue-recognition-specific fact; a fictitious ASSET fact does not, by itself, satisfy it merely because the same historical matter also had fictitious sales.",
  },
  // P0 recall-hardening sprint: IND-AS-24 (Related Party Disclosures) was
  // previously completely ungated — every one of its 4 live-corpus links
  // (FRL-01, SSSL-05, REL-02, REL-05) carries the SAME curated
  // justifyingTags: ["related_party_transaction", "related_party_
  // misrepresentation"] — a strong, corpus-grounded basis for gating it on
  // exactly that pairing, widened to also accept the general non_
  // disclosure_of_information conduct tag (a related-party transaction and
  // its outstanding balance simply OMITTED from the financial-statement
  // RPT disclosures — the SSSL-05/REL-05 fact pattern — is a non-
  // disclosure of that RPT, not necessarily a "misrepresentation" of it).
  // allowSentenceContinuity: an RPT is very often stated in one sentence
  // and its accounting-disclosure fate in the very next ("...entered into
  // transactions with entities controlled by the promoter group. The
  // transactions and outstanding balances were omitted from the related-
  // party disclosures..."), the same one-factual-object-split-across-
  // sentences pattern PFUTP-4-1/LODR-32/LODR-23-2/23-4 were fixed for.
  {
    provisionId: "IND-AS-24",
    requireAllOfGroups: [RPT_FACT, ["related_party_misrepresentation", "non_disclosure_of_information"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 24 (Related Party Disclosures) requires disclosure, in the notes to financial statements, of related-party transactions and outstanding balances. It requires a related-party-transaction fact connected to a stated misrepresentation or non-disclosure of that transaction/balance in the financial statements; a related-party transaction that was genuinely and accurately disclosed does not, without more, satisfy it.",
    allowSentenceContinuity: true,
  },
  // P0 recall-hardening sprint (Ind AS ungated audit): Ind AS 7, Ind AS 21
  // and Ind AS 28 were all completely ungated. Each live-corpus link for
  // all three (SSSL-01, SSSL-02, REL-02, BDMCL-01 — see concept-tags.ts's
  // header comment on the three new tags below) was reviewed and found to
  // cite each provision only as part of a broader, generic misstatement
  // bundle with no fact specific to that standard's OWN accounting subject
  // stated in the finding itself — except BDMCL-01, whose facts genuinely
  // are about deliberately staying below the Ind AS 28 "Associate Company"
  // significant-influence threshold. Each gate below requires the
  // officer's own entered facts to state something specific to that
  // standard's own subject; none is satisfied by a generic financial-
  // statement-misstatement fact alone.
  {
    provisionId: "IND-AS-7",
    requireAllOfGroups: [["cash_flow_statement_issue"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 7 (Statement of Cash Flows) governs the presentation and classification of cash-flow information. Requires a stated fact about the cash-flow statement specifically; a generic financial-statement misstatement with no cash-flow-specific fact does not, by itself, satisfy it.",
  },
  {
    provisionId: "IND-AS-21",
    requireAllOfGroups: [["foreign_exchange_rate_issue"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 21 (The Effects of Changes in Foreign Exchange Rates) governs translation of foreign-currency transactions and operations. Requires a stated fact about foreign-exchange rates or translation specifically; a generic financial-statement misstatement with no forex-specific fact does not, by itself, satisfy it.",
  },
  {
    provisionId: "IND-AS-28",
    requireAllOfGroups: [["associate_or_joint_venture_accounting_issue"]],
    explanation:
      "[Accounting/reporting requirement] Ind AS 28 (Investments in Associates and Joint Ventures) governs the equity-method accounting threshold (significant influence, typically 20% or more shareholding). Requires a stated fact about an associate-company/significant-influence/equity-method threshold specifically; a generic related-party or financial-statement misstatement with no such fact does not, by itself, satisfy it.",
  },

  // ----- Companies Act, 2013 -----
  // Deterministic-engine completion pass: the prior non-PFUTP remediation
  // pass deliberately left every Companies Act provision ungated because
  // the live corpus is sparse (8 links total across 7 provisions, all
  // empty-tagged, 1-2 links each). Sparse precedent data is not, on its
  // own, a reason to leave a provision universally retrievable — each rule
  // below is built from the actual live finding(s) that cite it (see
  // scripts/tmp-companies-act-review.ts), never inferred from case title
  // alone, and disclosed where the corpus cannot support a finer-grained
  // predicate than a conservative one.
  {
    provisionId: "COMPANIES-ACT-136",
    requireAllOfGroups: [["consolidated_financials"], ["non_disclosure_of_information"]],
    explanation:
      "[Disclosure obligation] Section 136(1) requires a company to circulate/make available its financial statements to members, INCLUDING subsidiary financial statements. This is a Companies Act circulation-to-members obligation, distinct from a SEBI/LODR exchange-facing disclosure violation (contrast Regulation 46(2)(s), the LODR website-publication counterpart, gated the same way). Requires a subsidiary/consolidation-specific fact connected to a stated non-disclosure fact; a company committing an unrelated violation elsewhere does not, by itself, satisfy it.",
  },
  {
    provisionId: "COMPANIES-ACT-139",
    requireAllOfGroups: [["statutory_auditor"], ["auditor_tenure_or_independence_issue"]],
    explanation:
      "[Governance/procedural obligation] Section 139 read with Rule 6(3) of the Companies (Audit and Auditors) Rules, 2014 requires rotation of the statutory auditor/audit firm within prescribed tenure limits. Requires a statutory-auditor actor fact connected to a stated tenure/rotation-specific fact; this corpus's vocabulary does not separately distinguish a rotation lapse from the personal ineligibility grounds in Section 141(3)(d)/(e) below — a genuine, disclosed limitation given the sparse (1-link) corpus for this provision, not an invented finer distinction.",
  },
  {
    provisionId: "COMPANIES-ACT-141-3-d",
    requireAllOfGroups: [["statutory_auditor"], ["auditor_tenure_or_independence_issue"]],
    explanation:
      "[Substantive prohibition] Section 141(3)(d) disqualifies a person from acting as auditor while holding a security of, or interest in, the company (or a related company) beyond a prescribed value, including through a partner. Requires a statutory-auditor actor fact connected to a stated independence/ineligibility fact; management's own conduct, without a stated fact about the AUDITOR's personal position, does not satisfy it. Same disclosed vocabulary limitation as Section 139 above.",
  },
  {
    provisionId: "COMPANIES-ACT-141-3-e",
    requireAllOfGroups: [["statutory_auditor"], ["auditor_tenure_or_independence_issue"]],
    explanation:
      "[Substantive prohibition] Section 141(3)(e) disqualifies a person from acting as auditor where they (or their relative/partner) have a prescribed business relationship with the company or its holding/subsidiary/associate company. Requires a statutory-auditor actor fact connected to a stated independence/ineligibility fact. Same disclosed vocabulary limitation as Section 139 above.",
  },
  {
    provisionId: "COMPANIES-ACT-180-1-a",
    requireAllOfGroups: [["asset_or_undertaking_disposal"]],
    explanation:
      "[Governance/procedural obligation] Section 180(1)(a) requires board authorisation by special resolution before selling, leasing or otherwise disposing of the whole, or substantially the whole, of an undertaking above the prescribed net-worth threshold. Requires only an asset/undertaking-disposal fact — like LODR Regulation 23(1)'s RPT-materiality proviso, this provision's own subject is itself a materiality/procedural threshold, not a bare topic mention; both live findings citing this provision (HEXA-01, NALWA-01) concern exactly this fact pattern (a subsidiary's investments transferred/reorganised to promoter-group entities), and both were NOT upheld on the merits — whether a given disposal actually crossed the statutory threshold or lacked the required resolution is a further question the entered facts should separately address.",
  },
  {
    provisionId: "COMPANIES-ACT-24",
    requireAllOfGroups: [["preferential_allotment"], ["sham_preferential_allotment", "unsupported_share_allotment_consideration"]],
    explanation:
      "[SEBI power/remedial provision] Section 24 gives SEBI powers concurrent with the Central Government under Chapter III/IV of the Companies Act (including Section 67) in respect of listed companies' securities issue/transfer matters. In this corpus it is invoked exclusively alongside Section 67(2) (financial assistance for purchase of a company's own shares — see BGL-PREF-01), so it is gated on the same minimum facts: a preferential-allotment fact connected to a stated non-payment/sham-consideration fact. This is a jurisdictional/enabling provision, not itself a substantive prohibition on the company's own conduct, and must never be presented as an independent violation distinct from the underlying Section 67(2)/ICDR breach it lets SEBI act on.",
    // P0 recall-hardening sprint: same continuity fix as ICDR-160 above.
    allowSentenceContinuity: true,
  },
  {
    provisionId: "COMPANIES-ACT-67-2",
    requireAllOfGroups: [["preferential_allotment"], ["sham_preferential_allotment", "unsupported_share_allotment_consideration"]],
    explanation:
      "[Substantive prohibition] Section 67(2) prohibits a public company from giving financial assistance (directly or indirectly, by loan, guarantee, security or otherwise) for the purchase of, or subscription to, its own shares or its holding company's shares. Requires a preferential-allotment fact connected to a stated non-payment/sham-consideration/loan-financed-allotment fact; the bare fact that a preferential allotment occurred does not, by itself, establish that the company financed it. This is a company-law obligation distinct from — though it may accompany — a SEBI regulatory (ICDR/PFUTP) violation on the same facts; the two must not be presented as if SEBI's order necessarily adjudicated the Companies Act offence itself unless the source order actually did so.",
    // P0 recall-hardening sprint: same continuity fix as ICDR-160 above.
    allowSentenceContinuity: true,
  },

  // ----- LODR Regulation 37A -----
  // Deliberately left ungated by the prior pass (a low-volume, 1-2-link
  // provision); now gated on the same asset/undertaking-disposal fact
  // Companies Act Section 180(1)(a) requires, since it is the SAME
  // fact pattern (an interested public shareholder voting on an
  // undertaking-disposal resolution) viewed from the LODR side.
  {
    provisionId: "LODR-37A",
    requireAllOfGroups: [["asset_or_undertaking_disposal"]],
    explanation:
      "[Governance/procedural obligation] Regulation 37A prohibits a public shareholder who is directly or indirectly a party to a sale/lease/disposal of the whole or substantially the whole undertaking from voting on the resolution approving it. Requires an asset/undertaking-disposal fact — the same materiality/procedural-threshold predicate Companies Act Section 180(1)(a) requires (see above); whether the specific voting shareholder was actually interested is a further question the entered facts should separately address.",
  },
];

const RULES_BY_PROVISION_ID = new Map(PROVISION_RETRIEVAL_RULES.map((r) => [r.provisionId, r]));

export function retrievalRuleForProvision(provisionId: string): ProvisionRetrievalRule | undefined {
  return RULES_BY_PROVISION_ID.get(provisionId);
}

/** Two concepts are "connected" for gate purposes if they share a sentence
 * in the entered free text, or if either came from a dropdown signal
 * (sentenceIndices: [] — a deliberate, explicit officer assertion about the
 * scenario as a whole, not free text whose proximity to another fact is
 * otherwise unknown). See DetectedConcept.sentenceIndices.
 *
 * continuityMap is optional and, when supplied, adds exactly one further
 * basis: the two concepts' sentences are linked by the bounded cross-
 * sentence continuity map (computeContinuitySentenceGroups,
 * conceptExtraction.ts) — an ordinary investigation narrative splitting one
 * factual object across an immediately adjacent sentence via a closed-class
 * anaphoric cue ("the funds", "such proceeds", ...). Callers pass this map
 * only for a rule/route that has explicitly opted in
 * (ProvisionRetrievalRule.alternateRoutes[].allowSentenceContinuity); every
 * other call site omits it, leaving same-sentence-only connectivity
 * completely unchanged. */
export function isConnected(a: DetectedConcept, b: DetectedConcept, continuityMap?: Map<number, Set<number>>): boolean {
  if (a.sentenceIndices.length === 0 || b.sentenceIndices.length === 0) return true;
  if (a.sentenceIndices.some((i) => b.sentenceIndices.includes(i))) return true;
  if (!continuityMap) return false;
  const closureOf = (indices: number[]) => new Set(indices.flatMap((i) => [...(continuityMap.get(i) ?? new Set([i]))]));
  const aClosure = closureOf(a.sentenceIndices);
  const bClosure = closureOf(b.sentenceIndices);
  for (const i of aClosure) if (bClosure.has(i)) return true;
  return false;
}

/** True if the query's effective concepts satisfy every group of the given
 * rule (at least one matching concept per group) AND, for a rule with 2+
 * groups, at least one matching pair (one concept per group) is connected
 * (see isConnected) — never merely both present anywhere in the scenario.
 * A rule with only one group needs no connectivity check. No rule for this
 * provision = ungated (existing behavior preserved for every provision
 * outside the broad-securities-fraud family this pass targets).
 *
 * continuityMap is threaded straight into isConnected and must only be
 * passed by a caller evaluating a route that opted in via
 * allowSentenceContinuity — see passesRetrievalGate below. */
function satisfiesGroups(requireAllOfGroups: string[][], effectiveConcepts: DetectedConcept[], continuityMap?: Map<number, Set<number>>): boolean {
  const matchesByGroup = requireAllOfGroups.map((group) => effectiveConcepts.filter((c) => group.includes(c.id)));
  if (matchesByGroup.some((matches) => matches.length === 0)) return false;
  if (matchesByGroup.length < 2) return true;
  // Current rules never exceed two groups; connectivity is checked pairwise
  // across every group boundary (0-1, 1-2, ...) so this generalizes safely
  // if a future rule adds a third group, without needing every pair across
  // the whole rule to be mutually connected.
  for (let i = 0; i < matchesByGroup.length - 1; i++) {
    const left = matchesByGroup[i];
    const right = matchesByGroup[i + 1];
    const connected = left.some((a) => right.some((b) => isConnected(a, b, continuityMap)));
    if (!connected) return false;
  }
  return true;
}

/** continuityMap (see computeContinuitySentenceGroups, conceptExtraction.ts)
 * is optional and, when supplied, is used ONLY while evaluating an alternate
 * route that has set allowSentenceContinuity: true — never for the primary
 * requireAllOfGroups route, and never for a route that has not explicitly
 * opted in. This keeps the bounded continuity mechanism scoped to exactly
 * the routes that requested it (currently: PFUTP-4-1's Explanation-based
 * diversion route only), leaving every other provision's gate, and PFUTP-
 * 4-1's own primary securities-dealing route, on same-sentence-only
 * connectivity. */
export function passesRetrievalGate(
  rule: ProvisionRetrievalRule | undefined,
  effectiveConcepts: DetectedConcept[],
  continuityMap?: Map<number, Set<number>>
): boolean {
  if (!rule) return true;
  if (satisfiesGroups(rule.requireAllOfGroups, effectiveConcepts, rule.allowSentenceContinuity ? continuityMap : undefined)) return true;
  // Each alternate route is a wholly separate, independently-sufficient
  // basis (see ProvisionRetrievalRule.alternateRoutes) — evaluated with its
  // own groups and its own connectivity check, never mixed with the primary
  // route's matches or another alternate route's matches.
  return (rule.alternateRoutes ?? []).some((route) =>
    satisfiesGroups(route.requireAllOfGroups, effectiveConcepts, route.allowSentenceContinuity ? continuityMap : undefined)
  );
}
