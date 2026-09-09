// Controlled synonym dictionary for the deterministic scenario-matching engine.
// Every tag id used here is also used in src/data/curated/scenario-tags.ts to
// tag the 34 scenario findings drawn from the pilot workbook. Matching is
// pure keyword/phrase substring matching over normalized text — no ML,
// no external calls.

export type ConceptKind = "transaction" | "actor" | "evidence" | "conduct";

export interface ConceptTag {
  id: string;
  kind: ConceptKind;
  label: string;
  synonyms: string[];
  /** P0 disclosure-family connectivity hotfix: true only for a conduct-kind
   * concept whose own definition spans EVERY disclosure subject matter
   * (e.g. "failed to disclose" says nothing about WHAT was not disclosed).
   * Such a concept can never, by itself, promote an ungated provision into
   * a breach candidate — see engine.ts's conductIdsMatched computation —
   * because unlike a subject-specific conduct concept (e.g.
   * "related_party_misrepresentation"), matching it proves nothing about
   * which disclosure obligation the entered scenario actually concerns. */
  subjectAgnostic?: boolean;
}

export const CONCEPT_TAGS: ConceptTag[] = [
  // ----- Transaction types -----
  {
    id: "financial_statement_disclosure",
    kind: "transaction",
    label: "Financial statement disclosure",
    // "financial results" added (non-PFUTP provision-precision remediation
    // pass): LODR Regulation 33's own statutory subject is "financial
    // results" -- the term this tag's synonyms omitted entirely, silently
    // under-detecting the channel fact Regulation 33/48's own retrieval
    // gate requires (provision-retrieval-rules.ts).
    synonyms: ["financial statement", "financial statements", "disclosure of financials", "published financials", "annual accounts", "financial results", "quarterly results", "annual results"],
  },
  {
    id: "consolidated_financials",
    kind: "transaction",
    label: "Consolidated financial statements",
    synonyms: ["consolidated financial statement", "consolidated financials", "consolidated revenue", "consolidation", "group accounts", "subsidiary consolidation"],
  },
  {
    id: "standalone_financials",
    kind: "transaction",
    label: "Standalone financial statements",
    synonyms: ["standalone financial statement", "standalone financials", "standalone accounts"],
  },
  {
    id: "revenue_recognition",
    kind: "transaction",
    label: "Revenue recognition / classification",
    // "understated" alone was previously a synonym here - a bare,
    // completely generic word with no connection to revenue whatsoever
    // ("the risk was understated", "the liability was understated"), so
    // any scenario using it in an unrelated sense was wrongly tagged as
    // touching revenue recognition. Replaced with the qualified phrases
    // ("understated revenue"/"understated sales"), matching the existing
    // "overstated sales"/"overstated revenue" pattern - see the P1-10/11
    // controlled-vocabulary precision audit.
    synonyms: ["revenue recognition", "classified as revenue", "included in revenue", "operating revenue", "revenue from operations", "foreign exchange gain classified as revenue", "interest income classified as revenue", "overstated sales", "overstated revenue", "understated revenue", "understated sales"],
  },
  {
    id: "derivative_transaction",
    kind: "transaction",
    label: "Derivative transaction",
    synonyms: ["derivative transaction", "derivative trade", "derivative trades", "futures and options", "f&o trade", "personal derivative", "derivative position", "commodity derivative"],
  },
  {
    id: "purchase_transaction",
    kind: "transaction",
    label: "Purchase transaction",
    synonyms: ["purchase transaction", "purchases recorded", "unsupported purchase", "unsupported purchases", "bogus purchase", "fictitious purchase", "purchases from vendor"],
  },
  {
    id: "investment_valuation",
    kind: "transaction",
    label: "Investment valuation",
    synonyms: ["investment valuation", "non-current investment", "unverifiable investment", "investment in mines", "carrying value of investment", "impairment of", "write-off of"],
  },
  {
    id: "receivables_payables_adjustment",
    kind: "transaction",
    label: "Receivables/payables adjustment",
    synonyms: ["receivables", "payables", "netting", "knock-off", "offsetting of balances", "trade receivables reduced", "multi-party netting"],
  },
  {
    id: "related_party_transaction",
    kind: "transaction",
    label: "Related-party transaction",
    // P0 diversion/PFUTP-4(1) fix: "connected entities" / "related entities"
    // removed — both are genuinely ambiguous (they describe entities
    // somehow connected to the company or a promoter, e.g. a fund-diversion
    // or circular-financing recipient, not necessarily a Reg 2(1)(zb)/Ind
    // AS 24 related party at all) and this corpus's own regression suites
    // (hundred-scenario-stress-suite.test.ts #14/#18/#53/#68,
    // blind-validation-suite-v2.test.ts #26/#47/#75) already deliberately
    // use exactly this phrasing for PURE fund-diversion/wash-trading
    // scenarios that must NOT read as an RPT. Retaining them here was
    // separately confirmed (live-corpus trace, Diversion Benchmark A) to
    // wrongly connect an unrelated diversion narrative to RPT-specific
    // disclosure provisions (Reg 31/Reg 27(2)(a)) via the subject-agnostic
    // topic-overlap check in engine.ts — see ConceptTag.subjectAgnostic.
    synonyms: ["related party transaction", "related-party transaction", "rpt", "transactions with related party", "connected party transaction", "related parties"],
  },
  {
    // P0 diversion/PFUTP-4(1) Explanation route: the PFUTP Regulations,
    // 2003 Explanation to Regulation 4(1) (as substituted w.e.f. 1 July
    // 2024, and in materially the same terms before that) deems diversion,
    // misutilisation or siphoning off of assets/earnings of "a company
    // whose securities are listed" to always have been a manipulative,
    // fraudulent or unfair trade practice under sub-regulation (1) — a
    // distinct, self-standing basis from Reg 4(1)'s general securities-
    // dealing prohibition, and one this corpus's vocabulary had no way to
    // detect at all (a private/unlisted company's fund diversion does not
    // attract this deeming clause). See provision-retrieval-rules.ts's
    // PFUTP-4-1 alternate route.
    id: "listed_company",
    kind: "transaction",
    label: "Listed company",
    synonyms: [
      "listed company",
      "listed entity",
      "listed public company",
      "publicly listed company",
      "company whose securities are listed",
      "whose securities are listed",
      "company is listed",
      "shares are listed",
      "securities are listed",
      "listed on the stock exchange",
      "listed on a recognised stock exchange",
      "listed on the exchange",
    ],
  },
  {
    id: "preferential_allotment",
    kind: "transaction",
    label: "Preferential allotment",
    // "allotment consideration" added (Question-A polarity acceptance
    // pass): the mandated preferential-allotment paired test text
    // ("Allotment consideration was circularly funded by issuer.") refers
    // to the consideration for an allotment without repeating "share" or
    // "preferential" — a real officer phrasing this corpus's prior
    // synonym list did not yet cover.
    synonyms: ["preferential allotment", "preferential issue", "preferential shares", "allotment of shares", "share allotment", "shares allotted", "warrants allotted", "cash preferential allotment", "lock-in period", "lock in period", "lock-in violation", "circumvented lock-in", "allotment consideration"],
  },
  {
    id: "rights_issue",
    kind: "transaction",
    label: "IPO / rights issue proceeds",
    synonyms: [
      "rights issue",
      "rights-issue proceeds",
      "rights issue funds",
      "renunciation of rights",
      "ipo proceeds",
      "ipo funds",
      "ipo fund",
      "public issue",
      "public issue proceeds",
      "public issue funds",
      "initial public offering",
      "money raised in the public issue",
      "money raised via ipo",
      "proceeds of the public issue",
      "proceeds from the ipo",
      "issue proceeds",
    ],
  },
  {
    id: "asset_pledge",
    kind: "transaction",
    label: "Pledge of shares/assets as loan security",
    synonyms: ["pledge", "pledged", "pledging", "loan security", "share pledge", "pledge of shares", "pledge invocation", "collateral pledge"],
  },
  {
    id: "cash_credit_facility",
    kind: "transaction",
    label: "Cash-credit / working-capital facility",
    synonyms: ["cash credit", "cash-credit facility", "working capital facility", "bank facility", "overdraft facility"],
  },
  {
    id: "fund_transfer_personal_account",
    kind: "transaction",
    label: "Funds routed through personal account",
    synonyms: ["personal account", "personal bank account", "individual bank account", "promoter's personal account", "routed through personal account", "personal current account", "own bank account"],
  },
  {
    id: "fund_transfer_promoter_entity",
    kind: "transaction",
    label: "Funds transferred to promoter-controlled entity",
    // "promoter-connected entity" / "connected to the promoter" / "linked to
    // the promoter" and similar bare relationship phrases were previously
    // included here, but they describe WHO a counterparty is, not that
    // funds were moved to them - a scenario that merely names a
    // promoter-connected counterparty (e.g. an ordinary, undisclosed but
    // otherwise genuine related-party transaction) is not itself a fund
    // transfer. Removed for the same reason bare "vendor"/"counterparty"
    // were removed from related_party_counterparty in the P1-10/11 audit:
    // topic/relationship presence is not the conduct this tag exists to
    // capture. See the P0 provision-precision remediation pass (2026).
    synonyms: ["promoter-controlled entity", "promoter controlled entity", "entity controlled by promoter", "shell entity", "front entity", "front company", "layering entity", "loans to related entities", "transferred to related entities", "transferred to promoter-controlled entity", "firms connected to the promoter", "entities connected to the promoter"],
  },
  {
    id: "annual_report_disclosure",
    kind: "transaction",
    label: "Annual report disclosure",
    synonyms: ["annual report", "director's report", "directors report", "statement on impact of audit qualifications", "audit qualification disclosure"],
  },
  // Added for the non-PFUTP provision-precision remediation pass: LODR
  // Regulation 30 requires an actual material-event/information-disclosure
  // fact, not merely that wrongdoing occurred elsewhere in the scenario
  // (see provision-retrieval-rules.ts). No existing tag captured this
  // specific channel/subject-matter fact.
  {
    id: "material_event_disclosure",
    kind: "transaction",
    label: "Material event / price-sensitive information disclosure",
    // "material litigation" added (Question-A polarity acceptance pass,
    // Regulation 30 paired test): material litigation is itself a
    // recurring category of Regulation 30 event-based disclosure, not
    // covered by the more generic synonyms above.
    // "material default" added (P0 Question-A polarity connectivity pass):
    // another recurring Regulation 30 event-disclosure category.
    // "loan default"/"default on loan"/"default in repayment" etc. added
    // (P0 disclosure-family connectivity hotfix): defaults on payment of
    // interest/repayment of principal on loans from banks/financial
    // institutions are a Regulation 30 mandatory ("deemed material")
    // disclosure event under Para A of Part A of Schedule III to the LODR
    // Regulations, per SEBI Circular SEBI/HO/CFD/CMD1/CIR/P/2019/140 dated
    // November 21, 2019 (official text verified: sebi.gov.in, "Disclosures
    // by listed entities of defaults on payment of interest/repayment of
    // principal amount on loans from banks/financial institutions and
    // unlisted debt securities") — without this, a scenario stating a plain
    // "loan default" fact never satisfied Regulation 30's own topic gate at
    // all, so the disclosure failure fell through to unrelated ungated
    // disclosure provisions instead.
    synonyms: ["material event", "material information", "material development", "material litigation", "material default", "loan default", "default on loan", "default on the loan", "default in repayment", "default in payment", "default on payment", "default in the repayment", "repayment default", "defaulted on repayment", "defaulted on a loan", "default on borrowings", "price sensitive information", "price-sensitive information", "disclosure to the stock exchange", "disclosure to stock exchanges", "disclosure to the exchange", "event-based disclosure"],
  },
  {
    id: "business_segment_disclosure",
    kind: "transaction",
    label: "Business segment disclosure",
    synonyms: ["business segment", "reportable segment", "segment disclosure", "nature of business disclosure"],
  },
  // Added for the deterministic-engine completion pass (Companies Act
  // Section 180(1)(a) / LODR Regulation 37A): both provisions require an
  // actual disposal/transfer of an undertaking or substantial investment
  // fact, not merely that a subsidiary or related party is mentioned. No
  // existing tag captured this specific transaction.
  {
    id: "asset_or_undertaking_disposal",
    kind: "transaction",
    label: "Disposal/transfer of undertaking or substantial investment",
    synonyms: [
      "sale of undertaking",
      "transfer of undertaking",
      "disposal of undertaking",
      "disposed of its investments",
      "disposed of the investments",
      "transferred its investments",
      "transfer of investments",
      "realigned and reorganized its investments",
      "realigned and reorganised its investments",
      "reorganization of investments",
      "reorganisation of investments",
      "disposal of the whole undertaking",
      "disposal of substantially the whole undertaking",
      "disposed of the whole undertaking",
      "disposed of substantially the whole undertaking",
      "gift of investments",
      "transferred by way of gift",
      "transfer by way of gift",
    ],
  },
  {
    id: "corporate_announcement",
    kind: "transaction",
    label: "Corporate announcement",
    synonyms: ["corporate announcement", "press release", "stock exchange announcement", "acquisition announcement", "turnover projection", "unsupported announcement"],
  },
  {
    id: "audit_committee_process",
    kind: "transaction",
    label: "Audit Committee constitution/process",
    synonyms: ["audit committee", "audit committee constitution", "audit committee meeting", "audit committee meetings", "ac meeting", "ac not constituted", "audit committee chair"],
  },
  {
    id: "compliance_officer_appointment",
    kind: "transaction",
    label: "Compliance Officer appointment/vacancy",
    synonyms: ["compliance officer", "compliance officer vacancy", "compliance officer appointment", "company secretary vacancy", "co vacancy", "compliance officer vacant", "compliance officer position vacant"],
  },
  {
    id: "certification_process",
    kind: "transaction",
    label: "Compliance certification",
    synonyms: ["compliance certificate", "ceo cfo certificate", "regulation 17(8) certificate", "certification to the board"],
  },
  {
    id: "board_director_duties",
    kind: "transaction",
    label: "Board/director duties",
    synonyms: ["board of directors", "director duties", "board responsibilities", "director responsibility", "fiduciary duty", "board oversight"],
  },
  {
    id: "investigation_process",
    kind: "transaction",
    label: "Investigation cooperation",
    synonyms: ["investigation", "summons", "non-cooperation", "failure to produce records", "incomplete submission", "contradictory submission"],
  },

  // ----- Actor roles -----
  { id: "company", kind: "actor", label: "Listed company", synonyms: ["the company", "listed entity", "listed company", "the issuer"] },
  {
    id: "conduit_entity",
    kind: "actor",
    label: "Conduit / front entity",
    synonyms: ["conduit entity", "conduit company", "front entity", "front company", "shell entity", "shell company", "pass-through entity", "layering entity"],
  },
  { id: "promoter", kind: "actor", label: "Promoter", synonyms: ["promoter", "promoter group", "founder-promoter"] },
  { id: "managing_director", kind: "actor", label: "Managing Director", synonyms: ["managing director", "md"] },
  { id: "executive_director", kind: "actor", label: "Executive Director", synonyms: ["executive director", "whole-time director", "wtd"] },
  { id: "independent_director", kind: "actor", label: "Independent Director", synonyms: ["independent director"] },
  // Bare "director" was previously a synonym here - since matching is
  // substring-based (see conceptExtraction.ts), it matched inside every
  // OTHER director-role phrase too ("managing director", "executive
  // director", "independent director", "nominee director"), so a
  // scenario naming one specific director role was always ALSO
  // double-counted as a "Non-executive director" match, inflating actor
  // overlap on a role the text never actually asserted. Removed - a bare,
  // unqualified "the director" no longer detects an actor role, which is
  // more honest than guessing at "non-executive" specifically. See the
  // P1-10/11 controlled-vocabulary precision audit.
  { id: "director_general", kind: "actor", label: "Non-executive director", synonyms: ["non-executive director", "board member"] },
  {
    id: "nominee_director",
    kind: "actor",
    label: "Nominee Director",
    synonyms: ["nominee director", "nominee-director", "director nominated by"],
  },
  { id: "audit_committee_member", kind: "actor", label: "Audit Committee member", synonyms: ["audit committee member", "ac member"] },
  {
    id: "audit_committee_chairman",
    kind: "actor",
    label: "Audit Committee Chairman",
    synonyms: ["audit committee chairman", "chairman of the audit committee", "ac chairman", "audit committee chair"],
  },
  { id: "compliance_officer", kind: "actor", label: "Compliance Officer / Company Secretary", synonyms: ["compliance officer", "company secretary"] },
  { id: "allottee_promoter", kind: "actor", label: "Preferential allottee (promoter)", synonyms: ["promoter allottee", "promoter as allottee", "preferential allottee (promoter)"] },
  {
    id: "allottee_third_party",
    kind: "actor",
    label: "Preferential allottee (non-promoter)",
    synonyms: ["allottee", "allottees", "non-promoter allottee", "third-party allottee", "preferential allottee"],
  },
  // "vendor" and bare "counterparty" were previously synonyms here - both
  // are ordinary, generic commercial-transaction vocabulary with no
  // inherent connection to a REGULATORY related-party relationship (an
  // arm's-length vendor dispute would have wrongly tagged this actor
  // role). Removed and replaced with qualified phrases that actually
  // assert the connection - see the P1-10/11 controlled-vocabulary
  // precision audit, and tests/false-positive-vocabulary.test.ts.
  {
    id: "related_party_counterparty",
    kind: "actor",
    label: "Related party",
    synonyms: [
      "related party",
      "connected entity",
      "connected counterparty",
      "related counterparty",
      "counterparty that is a related party",
      "vendor that is a related party",
      "related-party vendor",
      "customer entity that is a related party",
    ],
  },
  { id: "chairman", kind: "actor", label: "Chairman", synonyms: ["chairman", "chairperson", "executive chairman", "non-executive chairman", "chairman-cum-managing director"] },
  { id: "cfo", kind: "actor", label: "Chief Financial Officer", synonyms: ["cfo", "chief financial officer"] },
  { id: "ceo", kind: "actor", label: "Chief Executive Officer", synonyms: ["ceo", "chief executive officer"] },
  // A bare "auditor" synonym was tried here (Question-A polarity
  // acceptance pass) and reverted: it collided with the existing
  // actor-incompatibility precision tests (#9/#10/#13/#16 in
  // deterministic-engine-completion-pass.test.ts), which deliberately use
  // phrases like "auditor eligibility rules"/"the auditor's own tenure" in
  // EXPLANATORY clauses about a DIFFERENT actor's incompatibility — a bare
  // "auditor" match wrongly flipped those to actor-compatible. See the
  // Auditor paired test in question-a-polarity-clean-controls.test.ts for
  // how the bare-"Auditor" mandate text is instead handled without this
  // tag (an ungated synthetic provision keyed on the conduct tag alone).
  { id: "statutory_auditor", kind: "actor", label: "Statutory auditor", synonyms: ["statutory auditor", "incumbent auditor", "audit firm", "signing partner", "auditors resigned"] },
  // Added for the deterministic-engine completion pass (actor-applicability
  // layer + Companies Act Section 136 subsidiary-disclosure gating): a
  // subsidiary/controlled entity is a distinct actor from the listed
  // company itself and from an ordinary related party (a subsidiary is
  // controlled, not merely connected).
  { id: "subsidiary", kind: "actor", label: "Subsidiary / controlled entity", synonyms: ["subsidiary", "wholly-owned subsidiary", "step-down subsidiary", "controlled entity", "subsidiary company"] },
  // Catch-all for a Key Managerial Personnel/officer role this corpus's
  // vocabulary does not otherwise name specifically (e.g. a Company
  // Secretary acting outside their Compliance Officer capacity, a Chief
  // Risk Officer) — used only so a stated-but-unclassified officer role
  // is not silently treated as no actor being named at all.
  { id: "kmp_other_officer", kind: "actor", label: "Key Managerial Personnel / other officer", synonyms: ["key managerial personnel", "kmp", "chief risk officer", "vice president finance", "whole-time key managerial personnel"] },

  // ----- Evidence types -----
  { id: "bank_statements_flow", kind: "evidence", label: "Bank statements / fund-flow trail", synonyms: ["bank statement", "bank statements", "fund flow", "money trail", "bank trail", "fund-flow evidence"] },
  { id: "gst_tax_records", kind: "evidence", label: "GST / tax records", synonyms: ["gst record", "gst records", "tax record", "e-way bill", "gst return"] },
  { id: "delivery_inventory_records", kind: "evidence", label: "Delivery/inventory records", synonyms: ["delivery challan", "delivery record", "inventory record", "goods receipt", "stock record"] },
  { id: "audited_financial_statements", kind: "evidence", label: "Audited financial statements", synonyms: ["audited financial statement", "audited accounts", "audited books", "statutory audit"] },
  { id: "consolidation_workpapers", kind: "evidence", label: "Consolidation workpapers", synonyms: ["consolidation workpaper", "consolidation working paper", "elimination entry"] },
  { id: "board_minutes", kind: "evidence", label: "Board minutes", synonyms: ["board minutes", "board meeting minutes", "board resolution"] },
  { id: "audit_committee_minutes_agendas", kind: "evidence", label: "Audit Committee minutes/agendas", synonyms: ["audit committee minutes", "audit committee agenda", "ac minutes"] },
  { id: "forensic_audit_report", kind: "evidence", label: "Forensic audit report", synonyms: ["forensic audit", "forensic auditor report", "special audit"] },
  { id: "related_party_register", kind: "evidence", label: "Related-party register", synonyms: ["related party register", "rpt register", "related party disclosure"] },
  { id: "correspondence_summons_replies", kind: "evidence", label: "Correspondence / summons replies", synonyms: ["summons reply", "correspondence", "written submission"] },
  { id: "third_party_examination_statements", kind: "evidence", label: "Third-party examination statements", synonyms: ["third party examination", "statement of third party", "examined the counterparty", "third parties were not examined", "counterparty examination"] },
  { id: "shareholding_allotment_records", kind: "evidence", label: "Shareholding / allotment records", synonyms: ["shareholding record", "allotment record", "share application form", "allotment register"] },
  { id: "utilisation_of_issue_proceeds_certificate", kind: "evidence", label: "Utilisation of issue-proceeds certificate", synonyms: ["utilisation certificate", "monitoring agency report", "use of proceeds"] },
  { id: "deposition_testimony", kind: "evidence", label: "Deposition / recorded testimony", synonyms: ["deposition", "testimony", "recorded statement", "statement on oath", "examination on oath", "admitted in deposition", "under oath"] },

  // ----- Alleged conduct -----
  { id: "financial_statement_misstatement", kind: "conduct", label: "Financial statement misstatement", subjectAgnostic: true, synonyms: ["misstated financial statement", "misstatement", "misrepresentation in accounts", "false financial reporting", "inflated financials", "inflated sales", "inflated profit", "inflated profits", "overstated its sales", "misrepresented its financial statements", "write-off of trade receivables"] },
  // Split from a single "fictitious_sales_or_assets" tag after a user
  // correctly pointed out that SSSL-02 (a sham preferential allotment
  // backed by a fictitious receivable, no revenue transaction at all) was
  // surfacing for "fictitious sales" queries purely because sales-side and
  // asset-side fabrication shared one tag ID. The two fact patterns are
  // genuinely distinguishable in the precedent library (e.g. DHFL-02's
  // fictitious loan-book assets have no revenue/sales dimension at all;
  // ARCOTECH-01's fictitious sales/purchases have no independent asset
  // dimension), so a query about one no longer pulls in a precedent that
  // only has the other. Generic recording-verb phrasing ("fictitiously
  // booked", "recorded fictitiously") is intentionally kept on both tags —
  // it genuinely doesn't specify sales vs. assets, and many real findings
  // (e.g. SSSL-01, SKT-01) legitimately have both. The bare, over-broad
  // "not genuine" / "no genuine business" synonyms were dropped entirely
  // (not carried into either split tag) as too generic to reliably signal
  // either fact pattern — the same over-broad-bare-synonym problem found
  // and fixed once already for "related party" (see related_party_misrepresentation).
  { id: "fictitious_sales_or_revenue", kind: "conduct", label: "Fictitious sales or revenue", synonyms: ["fictitious sales", "bogus sales", "non-genuine sales", "fake sales", "sham sales", "fictitious revenue", "bogus revenue", "no genuine revenue", "sales were fictitious", "sale was fictitious", "sales figures were fictitious", "revenue was fictitious", "not genuine sales", "sales that were not genuine", "revenue that was not genuine", "revenue was not genuine", "sales did not actually take place", "sales never took place", "sales never actually occurred", "no genuine underlying transaction", "no genuine sale", "no genuine transaction", "fictitiously booked", "booked fictitiously", "recorded fictitiously", "fictitiously recorded", "fictitiously reported", "deny having bought", "deny ever having bought", "denied ever buying", "denies ever having transacted", "never actually bought anything", "counterparty denies buying"] },
  { id: "fictitious_or_nongenuine_assets", kind: "conduct", label: "Fictitious or non-genuine assets", synonyms: ["fictitious assets", "non-genuine assets", "bogus assets", "overstated assets", "inflated assets", "assets were fictitious", "assets that were not genuine", "assets were not genuine", "cannot actually verify exist", "cannot be verified to exist", "nobody can verify exist", "fictitiously booked", "booked fictitiously", "recorded fictitiously", "fictitiously recorded", "fictitiously reported"] },
  // "undisclosed" added (P0 provision-precision remediation, 2026): a very
  // common, unambiguous way to describe a non-disclosed fact ("an
  // undisclosed related-party transaction") that the prior synonym list
  // missed entirely, silently under-detecting non-disclosure scenarios.
  // "failed to furnish" moved to non_cooperation_with_investigation below:
  // on its own this phrase is ambiguous between failing to disclose
  // something to the market and failing to produce records to an
  // investigator, and the CFID stress-test scenario it was written against
  // ("failed to furnish accounting records sought under a SEBI summons") is
  // the latter, not the former.
  // "failed to disclose" and "concealed"/"concealment" added (P0 Question-A
  // polarity connectivity pass): common natural phrasings of a genuine
  // non-disclosure allegation this vocabulary previously missed entirely
  // ("failure to disclose" only covered the noun form; "concealed" was
  // already used as a NEGATABLE compliance-cue topic word in
  // factPolarity.ts's own LIST_TOPICS, but was never itself a recognized
  // ADVERSE synonym here, so a genuine concealment allegation was never
  // positively detected at all).
  // P0 disclosure-family connectivity hotfix: marked subjectAgnostic — see
  // ConceptTag.subjectAgnostic and engine.ts's conductIdsMatched fix. This
  // concept's synonyms are deliberately generic across every disclosure
  // subject (shareholding pattern, governance compliance report, loan
  // default, RPT financial-statement disclosure, ...), which is exactly
  // why it must never independently promote an ungated provision without
  // an accompanying subject-specific topical fact.
  { id: "non_disclosure_of_information", kind: "conduct", label: "Non-disclosure of information", subjectAgnostic: true, synonyms: ["non-disclosure", "undisclosed", "failure to disclose", "failed to disclose", "did not disclose", "not disclosed", "withheld information", "omitted disclosure", "failed to identify", "delayed disclosure", "late disclosure", "failed to inform", "did not inform", "disclosure lapse", "disclosure lapses", "concealed", "concealment"] },
  // "summons were ignored"/"ignored the summons" added (Question-A
  // polarity acceptance pass, investigation paired test): a common way to
  // describe non-response to process distinct from the existing
  // "did not respond to summons" phrasing.
  { id: "non_cooperation_with_investigation", kind: "conduct", label: "Non-cooperation with investigation", synonyms: ["non-cooperation", "did not cooperate", "failed to produce records", "failed to furnish", "failed to furnish records", "failed to furnish documents", "failed to furnish accounting records", "did not furnish", "did not respond to summons", "denied access", "withheld", "refused to share", "refused to hand over", "summons were ignored", "ignored the summons", "summons was ignored"] },
  { id: "related_party_misrepresentation", kind: "conduct", label: "Related-party misrepresentation", synonyms: ["misrepresented related party", "false rpt disclosure", "rpt not genuine"] },
  // Added for the non-PFUTP provision-precision remediation pass: LODR
  // Regulation 23(2)/23(4) each require a stated APPROVAL failure (Audit
  // Committee, or shareholder), distinct from a bare non-disclosure fact —
  // an RPT that was fully disclosed but never put to the required approval
  // step is a real, common fact pattern the existing non_disclosure_of_
  // information tag does not capture (see provision-retrieval-rules.ts).
  {
    id: "rpt_approval_lapse",
    kind: "conduct",
    label: "Related-party transaction approval lapse",
    // "not approved by audit committee" (dropping "the") added
    // (Question-A polarity acceptance pass, RPT paired test): the same
    // approval-lapse fact stated without the definite article.
    synonyms: [
      "without prior audit committee approval",
      "without audit committee approval",
      "without the required shareholder approval",
      "without shareholder approval",
      "no audit committee approval",
      "no shareholder approval",
      "not approved by the audit committee",
      "not approved by audit committee",
      "not approved by shareholders",
      "without the required audit committee approval",
      // "not placed before the audit committee" added (P0 Question-A
      // polarity connectivity pass): a common way to describe the same
      // approval-lapse fact without using the word "approved" at all.
      "not placed before the audit committee",
      "not placed before the board",
    ],
  },
  // "transferred to promoter-controlled entities without business purpose"
  // added (P0 Question-A polarity connectivity pass): a common way bank
  // records are described as establishing diversion, distinct from a bare
  // "diverted" allegation and often paired with a promoter's own denial.
  {
    id: "fund_diversion",
    kind: "conduct",
    label: "Diversion of funds",
    subjectAgnostic: true,
    // P0 diversion/PFUTP-4(1) fix: added generic phrasings of the same
    // "diverted, not used for the stated purpose" fact pattern (SEBI orders
    // routinely phrase this as funds moving to promoter-connected entities
    // "not used for the stated [business] purpose/objects") — the entered
    // Diversion Benchmark A text ("transferred substantial funds to
    // entities controlled by its promoter. The funds were not used for the
    // stated business purpose...") was not previously recognised at all.
    synonyms: [
      "diversion of funds",
      "diverted funds",
      "misutilisation of funds",
      "misuse of proceeds",
      "siphoning",
      "fund diversion",
      "diverted the proceeds",
      "siphoned off",
      "diverted",
      "misappropriated",
      "misutilised",
      "transferred to promoter-controlled entities without business purpose",
      "without business purpose",
      "entities controlled by its promoter",
      "entities controlled by the promoter",
      "entities controlled by its promoters",
      "not used for the stated business purpose",
      "not used for the stated purpose",
      "not utilised for the stated purpose",
      "not utilized for the stated purpose",
      "no genuine business purpose",
    ],
  },
  { id: "circular_fund_movement", kind: "conduct", label: "Circular movement of funds", subjectAgnostic: true, synonyms: ["circular transaction", "circular funding", "round tripping", "round-tripping", "layering of funds", "circular movement of funds", "back-to-back transfer", "circular financing", "circular fund flow", "circulated back", "routed through"] },
  { id: "fund_routed_personal_account", kind: "conduct", label: "Company funds routed through personal account", subjectAgnostic: true, synonyms: ["company funds routed", "funds routed through promoter", "routed through personal account", "diverted to personal account"] },
  // "without paying any/genuine consideration" variants added (P0
  // provision-precision remediation, 2026): natural officer phrasing for
  // the same no-genuine-consideration fact the existing "shares without
  // consideration"/"no genuine payment" synonyms already cover, just with
  // "paying"/"any" inserted between "without" and "consideration" - a
  // realistic gap the pure substring matcher otherwise misses.
  { id: "sham_preferential_allotment", kind: "conduct", label: "Fraudulent/sham preferential allotment", synonyms: ["sham allotment", "fraudulent preferential allotment", "fraudulent allotment", "shares without consideration", "allotment without payment", "non-cash allotment", "allotment without acquiring assets", "no genuine payment", "without paying any genuine consideration", "without paying genuine consideration", "without genuine consideration", "fabricated bank statements"] },
  // "circularly funded" added (Question-A polarity acceptance pass,
  // preferential-allotment paired test): the mandated adverse text
  // ("Allotment consideration was circularly funded by issuer") states the
  // same circular-financing fact this tag's own "allotment financed
  // circularly" synonym covers, in the more natural word order officers
  // commonly use.
  { id: "unsupported_share_allotment_consideration", kind: "conduct", label: "Unsupported consideration for share allotment", synonyms: ["consideration not received", "effective cash consideration", "financed the allotment", "consideration for allotment", "allotment financed circularly", "allotment financed through loans", "no genuine payment", "circularly funded"] },
  { id: "false_business_or_corporate_announcement", kind: "conduct", label: "False or fictitious corporate announcement", synonyms: ["unsupported announcement", "false announcement", "misleading announcement", "unsubstantiated projection", "false business claim", "fictitious corporate announcement", "fictitious announcement", "non-binding"] },
  { id: "audit_committee_deficiency", kind: "conduct", label: "Audit Committee not properly constituted / meetings not held", synonyms: ["audit committee not constituted", "not properly constituted", "audit committee meetings not held", "meetings not conducted", "meetings were not conducted", "meetings not convened", "not convened properly", "no audit committee meeting", "improperly constituted audit committee", "ac meetings not conducted", "audit committee did not meet", "no meeting minutes", "minutes could not be produced", "no agendas", "agendas could not be produced", "existed only on paper", "audit committee only on paper"] },
  // "position remained vacant" added (Question-A polarity acceptance pass,
  // governance/Compliance Officer paired test): the mandated adverse text
  // ("Compliance Officer position remained vacant beyond permitted
  // period") inserts "remained" between "position" and "vacant", which the
  // prior contiguous "position vacant" synonym did not match.
  // "had no compliance officer" added (P0 Question-A polarity connectivity
  // pass): a common natural phrasing ("the company had no Compliance
  // Officer for five months") this vocabulary previously missed.
  { id: "compliance_officer_deficiency", kind: "conduct", label: "Compliance Officer deficiency", synonyms: ["compliance officer vacancy", "compliance officer not appointed", "unqualified compliance officer", "co vacancy", "vacancy of compliance officer", "improper appointment of compliance officer", "improper appointment", "vacancy of the compliance officer", "compliance officer vacant", "position vacant", "position remained vacant", "vacant for", "had no compliance officer", "no compliance officer for"] },
  { id: "false_compliance_certification", kind: "conduct", label: "False or improperly signed CEO/CFO certification", synonyms: ["false certificate", "false certification", "signed a false compliance certificate", "certified despite non-compliance", "false compliance certification", "false compliance certificate", "certification not duly signed", "not duly signed", "certificate not duly signed"] },
  { id: "director_governance_failure", kind: "conduct", label: "Director/board duties not fulfilled", subjectAgnostic: true, synonyms: ["governance failure", "duties not fulfilled", "did not fulfil", "failed board responsibilities", "gross negligence of director", "failed to supervise", "failed to exercise duties", "without board knowledge", "failed to raise concerns", "acquiesced"] },
  // Second-order remediation (2026): the single tag "price_manipulation_nexus"
  // previously bundled several legally distinct predicates - a false
  // APPEARANCE of trading (wash/synchronized trades), a genuine ownership
  // question (no real beneficial-ownership change), an actual PRICE effect,
  // and investor INDUCEMENT to trade - under one signal, which the
  // provision-retrieval gate then used to unlock PFUTP 4(2)(a), (b) and (e)
  // together even though each clause's own text requires a different one of
  // these facts. "false appearance of financial health" (a prior synonym)
  // is dropped outright: it is not a trading fact at all, and collided with
  // financial_statement_misstatement/fictitious_sales_or_revenue's own
  // territory, not this family's. Split into four independently-detectable
  // tags, each tracking one statutory predicate:
  {
    id: "false_appearance_of_trading",
    kind: "conduct",
    label: "False or misleading appearance of trading",
    synonyms: ["synchronized trading", "synchronised trading", "matched trades", "wash trades", "wash trading", "connected trading accounts", "false appearance of trading", "misleading appearance of trading", "reversal trades"],
  },
  {
    id: "non_genuine_dealing_or_ownership",
    kind: "conduct",
    label: "No genuine change in beneficial ownership",
    synonyms: ["no genuine change in ownership", "no real change in ownership", "no real change in beneficial ownership", "no genuine change in beneficial ownership", "no intended change in beneficial ownership"],
  },
  {
    id: "actual_price_manipulation",
    kind: "conduct",
    label: "Actual price manipulation",
    synonyms: ["price manipulation", "market manipulation", "distorted price discovery", "artificial price rise", "artificially propped up the price", "artificially maintained the price", "manipulation of the security price", "artificial price"],
  },
  {
    id: "investor_inducement_to_trade",
    kind: "conduct",
    label: "Investor inducement to trade",
    synonyms: ["induced investors to trade", "induced to trade", "inducing trades", "investors induced to trade"],
  },
  { id: "aiding_abetting", kind: "conduct", label: "Aiding and abetting", synonyms: ["aided and abetted", "aiding and abetting", "assisted in the scheme", "facilitated the fraud"] },
  // Added for the deterministic-engine completion pass (Companies Act
  // Section 139/141(3)(d)/(e) auditor rotation and eligibility gating). The
  // sparse (1-link) corpus for these three provisions does not support
  // separately tagging a rotation lapse (Section 139) from the personal
  // ineligibility grounds in Section 141(3)(d)/(e) (holding securities /
  // a business relationship) — a genuine, disclosed limitation, not an
  // invented distinction; see provision-retrieval-rules.ts.
  {
    id: "auditor_tenure_or_independence_issue",
    kind: "conduct",
    label: "Auditor rotation/tenure or independence issue",
    synonyms: [
      "auditor rotation",
      "non-compliance with the auditor rotation",
      "did not rotate the auditor",
      "beyond the permitted tenure",
      "cooling-off period",
      "continued as auditor beyond",
      "auditor rotation requirement",
      "held securities in the company",
      "business relationship with the company",
      "auditor independence",
      "auditor ineligible",
      "ineligible to act as auditor",
      // Added (Question-A polarity acceptance pass, auditor paired test):
      // the mandated adverse text ("Auditor failed statutory independence
      // eligibility requirement") states a bare failed-independence/
      // eligibility fact without any of the rotation/tenure-specific
      // phrasing above.
      "failed statutory independence",
      "independence eligibility requirement",
    ],
  },
];

export const CONTRARY_PRECEDENT_TRIGGER_TAGS = new Set([
  "preferential_allotment",
  "cash_credit_facility",
  "circular_fund_movement",
  "fund_transfer_personal_account",
  "fund_transfer_promoter_entity",
  "fund_diversion",
  "unsupported_share_allotment_consideration",
]);

// A user directly tested "fictitious sales" and got Regulation 6 of the
// LODR Regulations back — a provision that governs Compliance Officer
// appointment and duties and has nothing to do with fictitious sales. The
// cause: ScenarioFinding.provisionIds used to be a flat list of every
// provision an order cited for a finding, with no record of which specific
// alleged conduct justified which specific provision. A single order
// finding can legitimately bundle fictitious sales together with an
// entirely separate Compliance Officer vacancy (e.g. FCEL-01), so the flat
// list surfaced Regulation 6 for ANY query that matched that finding on ANY
// of its bundled conduct tags, not just the Compliance Officer one.
//
// The original fix here was a hard-coded NARROW_SCOPE_PROVISION_TAGS map in
// this file. That has since been superseded by a general, data-driven
// mechanism: finding_provisions.justifying_tags (see migration
// 0010_finding_provisions_justifying_tags.sql and ScenarioFinding.provisionLinks
// in types/domain.ts) records, per finding-provision LINK, which specific
// concept tags justify it. An empty justifyingTags array means the link is
// universal (broad anti-fraud clauses such as PFUTP 3(a)-(d) or SEBI Act
// 12A are genuinely applicable across many kinds of fraud, including
// fictitious sales, and are never narrowed); a non-empty array narrows the
// link to only apply when the query's detected concepts intersect it. See
// analyzeScenario in engine.ts for where this is applied.
