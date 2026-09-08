// P0 provision-precision remediation (100-scenario CFID-officer stress test).
//
// CONFIRMED ROOT CAUSE: every one of the 498 finding_provisions rows linking
// a scenario finding to a PFUTP or SEBI Act 12A provision has an EMPTY
// justifying_tags array (re-queried live: 100% of 11+41+46+46+50+2+1+1+23+
// 42+34+36+51+57+57 = 498 links across PFUTP-3-a/b/c/d, PFUTP-4-1,
// PFUTP-4-2-a/b/c/e/f/k/r and SEBI-ACT-12A-a/b/c). engine.ts treats an empty
// justifyingTags array as "this link is universal" (see the doc comment on
// ScenarioFinding.provisionLinks) — a deliberate design for provisions that
// genuinely are broad and apply across many fact patterns. PFUTP and SEBI
// Act 12A are NOT such provisions: they require a specific securities
// dealing/issue nexus and a specific deceptive/fraudulent-device nexus, not
// merely "this finding also happens to involve some other kind of corporate
// wrongdoing". Because a single historical finding record routinely bundles
// several distinct allegations (e.g. an undisclosed RPT together with a
// separate fictitious-sales scheme, or a fund diversion together with a
// separately-alleged PFUTP violation), the current engine lets ANY scenario
// that matches that finding on ANY of its bundled tags pull in the FULL
// provision bundle, including PFUTP and SEBI Act 12A clauses that had
// nothing to do with what the present scenario actually describes.
//
// Retroactively curating a specific justifyingTags value for all 498
// individual links against each finding's own source order is real,
// necessary follow-up legal-review work (tracked separately — see
// docs/provision-gating-remediation.md, "Follow-up: per-link justifying-tags
// backfill") but is not, by itself, a sufficient or timely fix: it would
// leave the application returning legally indefensible PFUTP/SEBI Act 12A
// candidates for every scenario until each of those 498 rows is individually
// reviewed against its source order. This file adds an independent,
// PROVISION-LEVEL gate that applies in addition to (never instead of) the
// existing per-link justifyingTags check, so that a provision known to
// require a specific nexus can never be returned for a scenario that does
// not state facts satisfying that nexus — regardless of what any individual
// finding-provision link's justifyingTags currently says. See
// applyProvisionRetrievalGate in engine.ts for where this is enforced.

/** At least one concept-tag id from EACH inner group must be present among
 * the query's effective concepts (see buildEffectiveScenarioConcepts) for
 * the gate to pass. A single-group rule is a plain "require any of these";
 * two or more groups is a plain "require one from each" (i.e. requireAll
 * composed of requireAny groups) — collapsed into one field rather than
 * three separately-named ones (requireAny/requireAll/excludeIf) because
 * every rule actually needed here is expressible as this one shape, and a
 * generic boolean rule language would be more machinery than the fact
 * pattern warrants. */
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
// (src/data/curated/concept-tags.ts) — no new tag ids are introduced here.
// Each group name below corresponds to one of the "nexus" categories the
// audit prompt asked to be distinguished.

/** A genuine securities issue, allotment or trading/dealing fact — the
 * provision families gated here are, on their own text, expressly limited
 * to conduct "in connection with the issue, purchase or sale of securities"
 * (PFUTP 3(b)/(c)/(d), SEBI Act 12A) or to dealing in securities as such
 * (PFUTP 3(a), 4(1)). An ordinary corporate transaction (an RPT, a vendor
 * purchase, an internal fund transfer) is not itself a securities dealing. */
const SECURITIES_ISSUE_OR_DEALING_NEXUS = [
  "preferential_allotment",
  "rights_issue",
  "sham_preferential_allotment",
  "unsupported_share_allotment_consideration",
  "price_manipulation_nexus", // trading in securities is inherent to this tag
];

/** Conduct that is itself deceptive or fraudulent in character, as opposed
 * to a bare procedural, governance or accounting-classification lapse. RPT
 * non-disclosure and Audit Committee/Compliance Officer deficiencies are
 * deliberately NOT included here: those are governance/disclosure lapses,
 * not fraud on their own facts, and are gated by their own home
 * instrument's provisions (LODR etc.), never by PFUTP/SEBI Act 12A. */
const DECEPTIVE_OR_FRAUDULENT_CONDUCT = [
  "fictitious_sales_or_revenue",
  "fictitious_or_nongenuine_assets",
  "financial_statement_misstatement",
  "false_business_or_corporate_announcement",
  "sham_preferential_allotment",
  "unsupported_share_allotment_consideration",
  "price_manipulation_nexus",
  "related_party_misrepresentation",
];

/** The channel through which information reaches investors/the market —
 * required, together with DECEPTIVE_OR_FRAUDULENT_CONDUCT, for the PFUTP
 * 4(2) clauses concerned specifically with publishing/disseminating false
 * information (as opposed to the trading-conduct clauses). */
const INVESTOR_COMMUNICATION_CHANNEL = [
  "financial_statement_disclosure",
  "consolidated_financials",
  "standalone_financials",
  "annual_report_disclosure",
  "corporate_announcement",
  "business_segment_disclosure",
];

/** Actual trading/price conduct — synchronized/wash trades, artificial
 * price movement, no genuine change in beneficial ownership, inducement to
 * trade. The only curated tag presently capturing this nexus; PFUTP
 * 4(2)(a)/(b)/(e) are each, on their own text, specifically about trading
 * or price conduct rather than general fraud, so all three share this one
 * gate. See docs/provision-gating-remediation.md for the known limitation
 * that this collapses three textually-distinct sub-clauses onto one signal
 * pending richer curated vocabulary. */
const TRADING_OR_PRICE_CONDUCT = ["price_manipulation_nexus"];

const DEALING_CONNECTED_FALSE_INFORMATION = [
  "false_business_or_corporate_announcement",
  "fictitious_sales_or_revenue",
  "financial_statement_misstatement",
];

export const PROVISION_RETRIEVAL_RULES: ProvisionRetrievalRule[] = [
  {
    provisionId: "PFUTP-3-a",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Regulation 3(a) prohibits buying, selling or otherwise dealing in securities in a fraudulent manner. It requires both a securities issue/allotment/dealing fact and a fraudulent or deceptive act connected to that dealing.",
  },
  {
    provisionId: "PFUTP-3-b",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Regulation 3(b) requires a manipulative or deceptive device or contrivance used in connection with the issue, purchase or sale of a listed or to-be-listed security. It requires both a securities issue/dealing fact and a deceptive-device fact.",
  },
  {
    provisionId: "PFUTP-3-c",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Regulation 3(c) requires a device, scheme or artifice to defraud in connection with dealing in or the issue of listed (or to-be-listed) securities. It requires both a securities issue/dealing fact and a fraudulent-scheme fact.",
  },
  {
    provisionId: "PFUTP-3-d",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Regulation 3(d) requires an act, practice or course of business operating as a fraud or deceit on any person, in connection with dealing in or the issue of listed (or to-be-listed) securities. It requires both a securities issue/dealing fact and a fraud/deceit fact.",
  },
  {
    provisionId: "PFUTP-4-1",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Regulation 4(1) is the general prohibition on manipulative, fraudulent or unfair trade practice in connection with securities, mirroring Regulation 3. Same minimum facts: a securities issue/dealing fact and a fraudulent or deceptive conduct fact.",
  },
  {
    provisionId: "PFUTP-4-2-a",
    requireAllOfGroups: [TRADING_OR_PRICE_CONDUCT],
    explanation:
      "Regulation 4(2)(a) is specifically about knowingly creating a false or misleading appearance of trading. It requires an actual trading/price-manipulation fact: fictitious accounting or an undisclosed transaction, without more, does not satisfy it.",
  },
  {
    provisionId: "PFUTP-4-2-b",
    requireAllOfGroups: [TRADING_OR_PRICE_CONDUCT],
    explanation:
      "Regulation 4(2)(b) is specifically about dealing in securities involving an artificial price. It requires an actual trading/price-manipulation fact.",
  },
  {
    provisionId: "PFUTP-4-2-c",
    requireAllOfGroups: [TRADING_OR_PRICE_CONDUCT, DEALING_CONNECTED_FALSE_INFORMATION],
    explanation:
      "Regulation 4(2)(c) requires a person dealing in securities who circulates or disseminates rumours or information not based on fact. It requires both a trading fact and a false-information fact.",
  },
  {
    provisionId: "PFUTP-4-2-e",
    requireAllOfGroups: [TRADING_OR_PRICE_CONDUCT],
    explanation:
      "Regulation 4(2)(e) is an act or omission amounting to manipulation of the security's price. It requires an actual trading/price-manipulation fact.",
  },
  {
    provisionId: "PFUTP-4-2-f",
    requireAllOfGroups: [DECEPTIVE_OR_FRAUDULENT_CONDUCT, INVESTOR_COMMUNICATION_CHANNEL],
    explanation:
      "Regulation 4(2)(f) is publishing or reporting untrue securities-related information. It requires both a fraudulent/false-accounting fact and a fact showing that information reached investors/the market through a specific communication channel (financial statements, annual report, corporate announcement, etc.).",
  },
  {
    provisionId: "PFUTP-4-2-k",
    requireAllOfGroups: [DECEPTIVE_OR_FRAUDULENT_CONDUCT, INVESTOR_COMMUNICATION_CHANNEL],
    explanation:
      "Regulation 4(2)(k) is disseminating false or misleading information likely to influence investors. It requires both a false-information fact and a fact showing an investor-facing communication channel.",
  },
  {
    provisionId: "PFUTP-4-2-r",
    // Deliberately DEALING_CONNECTED_FALSE_INFORMATION, not the broader
    // DECEPTIVE_OR_FRAUDULENT_CONDUCT (which includes price_manipulation_nexus
    // itself) - 4(2)(r) requires false INFORMATION distinct from the trading
    // conduct it induces, not trading manipulation alone counted twice.
    requireAllOfGroups: [DEALING_CONNECTED_FALSE_INFORMATION, TRADING_OR_PRICE_CONDUCT],
    explanation:
      "Regulation 4(2)(r) is knowingly planting false or misleading information that induces trades. It requires both a false-information fact and a trading-inducement fact.",
  },
  {
    provisionId: "SEBI-ACT-12A-a",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Section 12A(a) mirrors PFUTP Regulation 3(b): a manipulative or deceptive device used in connection with the issue, purchase or sale of securities. Same minimum facts.",
  },
  {
    provisionId: "SEBI-ACT-12A-b",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Section 12A(b) mirrors PFUTP Regulation 3(c): a device, scheme or artifice to defraud in connection with the issue of, or dealing in, securities. Same minimum facts.",
  },
  {
    provisionId: "SEBI-ACT-12A-c",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Section 12A(c) mirrors PFUTP Regulation 3(d): an act, practice or course of business operating as fraud or deceit, in connection with the issue of or dealing in securities. Same minimum facts.",
  },
  // Defense in depth for two pre-split, legacy bundled ids that no longer
  // exist in the live database (confirmed live: legal_provisions only has
  // the split PFUTP-3-a/b/c/d and SEBI-ACT-12A-a/b/c rows) but still appear
  // in the pilot-era generated fixture JSON (src/data/generated/
  // scenarioFindings.json, predating the provision-split work) that
  // tests/fixtures.ts loads. Gated identically to their split counterparts
  // so this remediation is not silently bypassed for any test, or any
  // future data path, still using the old bundled id.
  {
    provisionId: "SEBI-ACT-12A",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Section 12A prohibits manipulative/deceptive devices and fraudulent schemes in connection with the issue of or dealing in securities. Requires both a securities issue/dealing fact and a deceptive or fraudulent conduct fact.",
  },
  {
    provisionId: "PFUTP-3-a-d",
    requireAllOfGroups: [SECURITIES_ISSUE_OR_DEALING_NEXUS, DECEPTIVE_OR_FRAUDULENT_CONDUCT],
    explanation:
      "Regulation 3 (clauses (a)-(d)) prohibits fraudulent or deceptive conduct in connection with dealing in or the issue of securities. Requires both a securities issue/dealing fact and a deceptive or fraudulent conduct fact.",
  },
];

const RULES_BY_PROVISION_ID = new Map(PROVISION_RETRIEVAL_RULES.map((r) => [r.provisionId, r]));

export function retrievalRuleForProvision(provisionId: string): ProvisionRetrievalRule | undefined {
  return RULES_BY_PROVISION_ID.get(provisionId);
}

/** True if the query's effective concept ids satisfy every group of the
 * given rule (at least one id per group). No rule for this provision =
 * ungated (existing behavior preserved for every provision outside the
 * broad-securities-fraud family this pass targets). */
export function passesRetrievalGate(rule: ProvisionRetrievalRule | undefined, detectedIds: Set<string>): boolean {
  if (!rule) return true;
  return rule.requireAllOfGroups.every((group) => group.some((id) => detectedIds.has(id)));
}
