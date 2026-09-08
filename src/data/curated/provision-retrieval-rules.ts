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
      "Regulation 4(1) is the general prohibition on manipulative, fraudulent or unfair trade practice in connection with securities, mirroring Regulation 3. Same minimum facts: a securities transaction connected to fraudulent or deceptive conduct.",
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
];

const RULES_BY_PROVISION_ID = new Map(PROVISION_RETRIEVAL_RULES.map((r) => [r.provisionId, r]));

export function retrievalRuleForProvision(provisionId: string): ProvisionRetrievalRule | undefined {
  return RULES_BY_PROVISION_ID.get(provisionId);
}

/** Two concepts are "connected" for gate purposes if they share a sentence
 * in the entered free text, or if either came from a dropdown signal
 * (sentenceIndices: [] — a deliberate, explicit officer assertion about the
 * scenario as a whole, not free text whose proximity to another fact is
 * otherwise unknown). See DetectedConcept.sentenceIndices. */
function isConnected(a: DetectedConcept, b: DetectedConcept): boolean {
  if (a.sentenceIndices.length === 0 || b.sentenceIndices.length === 0) return true;
  return a.sentenceIndices.some((i) => b.sentenceIndices.includes(i));
}

/** True if the query's effective concepts satisfy every group of the given
 * rule (at least one matching concept per group) AND, for a rule with 2+
 * groups, at least one matching pair (one concept per group) is connected
 * (see isConnected) — never merely both present anywhere in the scenario.
 * A rule with only one group needs no connectivity check. No rule for this
 * provision = ungated (existing behavior preserved for every provision
 * outside the broad-securities-fraud family this pass targets). */
export function passesRetrievalGate(rule: ProvisionRetrievalRule | undefined, effectiveConcepts: DetectedConcept[]): boolean {
  if (!rule) return true;
  const matchesByGroup = rule.requireAllOfGroups.map((group) => effectiveConcepts.filter((c) => group.includes(c.id)));
  if (matchesByGroup.some((matches) => matches.length === 0)) return false;
  if (matchesByGroup.length < 2) return true;
  // Current rules never exceed two groups; connectivity is checked pairwise
  // across every group boundary (0-1, 1-2, ...) so this generalizes safely
  // if a future rule adds a third group, without needing every pair across
  // the whole rule to be mutually connected.
  for (let i = 0; i < matchesByGroup.length - 1; i++) {
    const left = matchesByGroup[i];
    const right = matchesByGroup[i + 1];
    const connected = left.some((a) => right.some((b) => isConnected(a, b)));
    if (!connected) return false;
  }
  return true;
}
