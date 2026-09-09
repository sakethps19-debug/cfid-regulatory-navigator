// Fixed Scenario Analysis — Part A of the redesigned officer-facing
// Scenario Analyzer (see AnalyzerLanding / FixedScenarioAnalyzer).
//
// This is a small, hand-curated set of broad, recognisable CFID
// investigation themes, each mapped to the substantive regulatory
// provisions an officer investigating that theme should examine. It is
// deliberately NOT precedent search, NOT historical-treatment analysis, and
// NOT an automated finding that a violation occurred — it answers "I am
// investigating this broad type of conduct; what substantive provisions
// should I examine?", an expert-curated research shortcut distinct from the
// fact-specific deterministic-retrieval engine in engine.ts (Part B,
// "Analyze my own scenario").
//
// Every provisionIds entry below is a canonical id that must resolve
// against the live `legal_provisions` table (see src/lib/data.ts
// getProvisions()) — display text (instrument, provision number, subject)
// is never hardcoded here, only looked up at render time, so there is a
// single source of truth for provision text. See resolveFixedScenario in
// this file for that lookup plus the mandatory-exclusion enforcement.
//
// Taxonomy developed principally from, and cross-checked paragraph-by-
// paragraph against, two official SEBI orders:
//   - Final Order in the matter of Seacoast Shipping Services Limited
//     (Sep 24, 2025) — in particular Table 52 (the Section H "Conclusion"
//     summary-of-findings table, paras 238-239), which lists the exact
//     substantive-provision combination upheld against each noticee for
//     each category of conduct, and para 241, which confirms that Sections
//     11(1)/11(4)/11(4A)/11B(1)/11B(2)/15HA/15HB of the SEBI Act are
//     invoked only for directions/penalties, never listed as the
//     substantive provision in Table 52 itself.
//   - Interim Order in the matter of Rajesh Exports Limited (2026) —
//     in particular paras 178-198 (Ind AS 24 / Regulation 23(2) / 34(3)
//     RPT-disclosure findings) and paras 195-198 (the PFUTP Regulation
//     4(1) Explanation on diversion/siphoning of funds).
//
// These two orders do not, between them, evidence every clause listed
// below with equal directness for every scenario (scenario 8 in
// particular is a deliberately broader catch-all, not tied to a single
// order) — see the finalReport's "legal mapping uncertainty" section for
// the specific caveats.
//
// LODR Regulation 18(2) and Regulation 6(1A) were initially omitted from
// this file because no legal_provisions row existed for either, even
// though the Seacoast final order's Table 52 (row 10: "Failure to convene
// the AC meetings"; row 11: "Failure to fill the vacancy of compliance
// officer in due time...") expressly relies on both and upholds both
// findings. A missing corpus row is a data-completeness defect, not a
// reason to drop a legally applicable provision from this taxonomy —
// migration 0017_lodr_18_2_and_6_1a_provisions.sql adds both as canonical
// legal_provisions rows (verified directly against SEBI's official
// consolidated LODR Regulations text; see that migration's comments for
// the exact source and for why Regulation 18(2) is modelled as a single
// id whose subject documents its internal (a)/(b)/(c) structure rather
// than as a separate "18(2)(a)" id), so both now resolve normally here.

export interface FixedScenario {
  /** Stable slug id, used in the UI and in tests. Never reused/repurposed. */
  id: string;
  /** Short, officer-friendly name — the "Broad Generic Scenario" layer. */
  name: string;
  /** Concise description of the factual patterns falling within this
   * scenario — the "Explanation" layer, shown before/while selecting. */
  explanation: string;
  /** Curated provision ids for the "Potential Legal Violations" layer.
   * Order within the array is not display order (display groups by
   * instrument, see resolveFixedScenario) — order here just mirrors the
   * source verification work. */
  provisionIds: string[];
  /** A small, hand-curated set of concept-tags.ts ids (CONCEPT_TAGS,
   * "transaction" or "conduct" kind only — deliberately never "evidence" or
   * "actor" kind, since an evidence/actor tag being incidentally present on
   * an otherwise-unrelated finding is exactly the mechanism that produced
   * the officer-reported Law Library false positives, e.g. Ind AS 7
   * surfacing for a "related party transactions" search purely because an
   * unrelated finding's EVIDENCE list happened to include a related-party
   * register) that most specifically identify this broad scenario. Used by
   * src/lib/broadScenarioMatch.ts to power (a) Law Library's fact/concept
   * search precisely, by matching a query's own detected concepts against
   * this list rather than a free-text bag-of-words, and (b) a provision's
   * "broad CFID scenarios" summary on its Law Library page, by matching a
   * scenario_finding's own structured transactionTypes/allegedConduct tags
   * (never its case name, evidence list or actor roles) against this same
   * list — one shared mechanism for both, per the two-way Analyze/Law
   * scenario-taxonomy relationship. Deliberately small (2-3 ids) and never
   * populated for scenario 8 (the intentionally broad catch-all) so that
   * scenario never dominates a concept match merely by being broad. */
  keyConceptIds: string[];
}

export const FIXED_SCENARIOS: FixedScenario[] = [
  {
    id: "financial-statement-misrepresentation",
    name: "Misrepresentation / Misstatement of Financial Statements",
    explanation:
      "Material manipulation or misstatement of a listed entity's reported financial information — fictitious sales, purchases or revenue; fictitious assets or receivables; inflated turnover or profits; incorrect revenue recognition or classification; improper accounting treatment; incorrect consolidation; unverifiable investments or assets; manipulated receivables or payables; or other material misstatements that render the reported financial position or performance misleading. These are potential provisions for this curated scenario, not an assertion that every financial-statement error automatically attracts fraud provisions — applicability remains fact-dependent.",
    provisionIds: [
      "SEBI-ACT-12A-a",
      "SEBI-ACT-12A-b",
      "SEBI-ACT-12A-c",
      "PFUTP-3-b",
      "PFUTP-3-c",
      "PFUTP-3-d",
      "PFUTP-4-1",
      "PFUTP-4-2-e",
      "PFUTP-4-2-f",
      "PFUTP-4-2-k",
      "PFUTP-4-2-r",
      "LODR-4-1-a",
      "LODR-4-1-b",
      "LODR-4-1-c",
      "LODR-4-1-e",
      "LODR-4-1-g",
      "LODR-4-1-h",
      "LODR-4-1-j",
      "LODR-4-2-e-i",
      "LODR-33-1-a",
      "LODR-33-1-c",
      "LODR-48",
    ],
    keyConceptIds: ["financial_statement_misstatement", "fictitious_sales_or_revenue", "fictitious_or_nongenuine_assets"],
  },
  {
    id: "diversion-siphoning-misutilisation",
    name: "Diversion / Siphoning / Misutilisation of Funds",
    explanation:
      "Diversion of Rights Issue proceeds; misutilisation of issue proceeds; diversion of borrowed funds or Cash Credit facilities; routing of company funds through personal accounts or promoter-controlled entities; circular movement of company funds; payments against fictitious purchases used as a diversion mechanism; or funds applied for purposes unrelated to a stated or genuine corporate purpose. This scenario does not automatically import related-party-transaction disclosure/approval provisions merely because the recipient happens to be a related party — RPT irregularities are a separate scenario. It also preserves the specific legal nuance in Regulation 4(1) of the PFUTP Regulations, whose Explanation addresses diversion, misutilisation or siphoning of assets or earnings, or concealment thereof so as to manipulate a company's books of account or financial statements — not every diversion is treated here as every PFUTP clause automatically applying.",
    provisionIds: [
      "SEBI-ACT-12A-a",
      "SEBI-ACT-12A-b",
      "SEBI-ACT-12A-c",
      "PFUTP-3-b",
      "PFUTP-3-c",
      "PFUTP-3-d",
      "PFUTP-4-1",
      "PFUTP-4-2-e",
      "PFUTP-4-2-f",
      "PFUTP-4-2-k",
      "PFUTP-4-2-r",
    ],
    keyConceptIds: ["fund_diversion", "circular_fund_movement", "fund_routed_personal_account"],
  },
  {
    id: "fraudulent-fictitious-allotment",
    name: "Fraudulent / Fictitious Issue or Allotment of Securities",
    explanation:
      "Preferential allotment made without genuine consideration; purported consideration never actually received; allotment against fictitious assets or business consideration; circular funding of share application money; a sham preferential allotment; or a fraudulent issue/allotment that benefits connected persons. An ordinary preferential allotment, or a technical allotment irregularity, is not fraud merely because this scenario exists — applicability depends on the specific facts of the allotment.",
    provisionIds: [
      "SEBI-ACT-12A-a",
      "SEBI-ACT-12A-b",
      "SEBI-ACT-12A-c",
      "PFUTP-3-a",
      "PFUTP-3-b",
      "PFUTP-3-c",
      "PFUTP-3-d",
      "PFUTP-4-1",
      "PFUTP-4-2-e",
      "PFUTP-4-2-f",
      "PFUTP-4-2-k",
      "PFUTP-4-2-r",
      "LODR-4-1-a",
      "LODR-4-1-b",
      "LODR-4-1-c",
      "LODR-4-1-e",
      "LODR-4-1-g",
      "LODR-4-1-h",
      "LODR-4-1-j",
      "LODR-4-2-e-i",
      "LODR-33-1-a",
      "LODR-33-1-c",
      "LODR-48",
    ],
    keyConceptIds: ["sham_preferential_allotment", "unsupported_share_allotment_consideration"],
  },
  {
    id: "related-party-transaction-irregularities",
    name: "Related Party Transaction Irregularities",
    explanation:
      "Non-disclosure of related party transactions; incorrect or misleading RPT disclosures; non-disclosure of outstanding related-party balances; transactions with promoter or promoter-controlled entities; company funds routed through related parties; failure to place RPTs before the Audit Committee; or failure to obtain required prior approval. Kept conceptually separate from fund diversion: the same underlying facts may involve both, but selecting this scenario does not automatically generate PFUTP findings merely because a related party is involved.",
    provisionIds: ["IND-AS-24", "LODR-23-2", "LODR-34-3", "LODR-SCHEDULE-V-A-1", "LODR-4-1-a", "LODR-4-1-b", "LODR-4-2-e-i", "LODR-48"],
    keyConceptIds: ["related_party_transaction", "related_party_misrepresentation", "rpt_approval_lapse"],
  },
  {
    id: "false-misleading-incomplete-disclosures",
    name: "False / Misleading / Incomplete Corporate Disclosures",
    explanation:
      "False or misleading stock-exchange disclosures; incomplete Annual Reports; a misleading description of business operations; incorrect disclosures regarding investments; misleading disclosures regarding audit qualifications; concealment or omission of material information; or other materially false or incomplete corporate disclosures. Not every delayed or incomplete disclosure is fraud — applicability remains fact-dependent.",
    provisionIds: ["PFUTP-4-2-f", "PFUTP-4-2-k", "PFUTP-4-2-r", "LODR-4-1-c", "LODR-33-3-d", "LODR-34-2-a"],
    keyConceptIds: ["non_disclosure_of_information", "false_business_or_corporate_announcement"],
  },
  {
    id: "audit-committee-governance-irregularities",
    name: "Audit Committee / Corporate Governance Irregularities",
    explanation:
      "Improper constitution of the Audit Committee; failure to convene Audit Committee meetings; the Audit Committee failing to discharge its responsibilities; directors or independent directors failing their governance duties; a failure of Board/Audit-Committee oversight; signing or certifying compliance despite known material deficiencies; or other material Board/Audit-Committee governance failures. The exact provision engaged depends on the specific governance failure at issue — not every provision listed here applies to every governance lapse. A bare Audit Committee meeting-frequency lapse is a governance/procedural matter, not automatically a PFUTP fraud finding, even where PFUTP provisions also appeared in a particular order's broader factual matrix.",
    provisionIds: ["LODR-16-1-b", "LODR-17-8", "LODR-18-1-d", "LODR-18-2", "LODR-18-3-schedule-II", "LODR-4-2-f"],
    keyConceptIds: ["audit_committee_deficiency", "director_governance_failure"],
  },
  {
    id: "compliance-officer-irregularities",
    name: "Compliance Officer Irregularities",
    explanation:
      "Failure to appoint a Compliance Officer; failure to fill a Compliance Officer vacancy within the prescribed period; appointment of an ineligible or non-compliant person as Compliance Officer; the Compliance Officer failing prescribed responsibilities; or failure to ensure regulatory conformity. The exact provision text/version depends on when the conduct occurred — an earlier version of the LODR Regulations may govern conduct predating a later amendment.",
    provisionIds: ["LODR-6-1", "LODR-6-1A", "LODR-6-2-a", "LODR-6-2-c"],
    keyConceptIds: ["compliance_officer_deficiency", "false_compliance_certification"],
  },
  {
    id: "fraudulent-manipulative-conduct-broad",
    name: "Fraudulent / Manipulative Conduct Affecting Investors or the Securities Market",
    explanation:
      "A broader fraud or manipulation category for use when the officer is examining a fraudulent or manipulative scheme rather than a pure accounting, governance or disclosure lapse: a device, scheme or artifice to defraud; conduct creating a false or misleading appearance; manipulation affecting securities or investor decision-making; deceptive conduct connected with dealing in securities; or investor inducement based on materially false information. This scenario intentionally lists only the core prohibition clauses — not every clause of Regulation 4(2) of the PFUTP Regulations is treated as universally applicable; which of those more specific clauses apply depends on the particular facts of the scheme under investigation.",
    provisionIds: ["SEBI-ACT-12A-a", "SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-1"],
    // Deliberately no keyConceptIds: this is the intentionally broad
    // catch-all scenario, and giving it a concept match would let it
    // dominate every fraud-adjacent Law Library search rather than the
    // more specific scenario that actually fits the query.
    keyConceptIds: [],
  },
  {
    // Added following the Aug-2026 Debock/Trafiksol/Varanium validation
    // pass (see the pass's Master Reconciliation table). Genuinely new
    // (Category C), not a rewording of an existing scenario: the ICDR
    // Regulations govern the PRE-LISTING issue/offer-document process
    // itself (the DRHP/RHP/Prospectus or Letter of Offer filed to raise
    // capital) -- a distinct instrument, a distinct regulatory moment (at
    // the time of the issue, before or independent of an ongoing listing),
    // and distinct provisions from "false-misleading-incomplete-
    // disclosures" (which is about an ALREADY-LISTED entity's ongoing
    // LODR/stock-exchange disclosures -- Annual Reports, corporate
    // announcements). A materially false or misleading offer document is
    // not automatically the same legal question as a materially false
    // post-listing disclosure, even though both are "disclosure" in a lay
    // sense.
    //
    // Independently evidenced by TWO separate final orders, not derived
    // from one historical co-occurrence: Trafiksol (ICDR Regulation 245(1)
    // established, para 105 -- undisclosed conflict-of-interest financial
    // relationship with the sole Merchant Banker's controlling
    // shareholder's father, omitted from the DRHP) and Varanium Cloud
    // (ICDR Regulation 24(1) established, para 111(v) -- misleading
    // Objects-of-Issue quotation and non-disclosure of pending litigation
    // in the Prospectus/Letter of Offer; LODR Regulation 32 also
    // established, para 111(ii) -- an incorrect Statement of Deviation on
    // utilisation of issue proceeds, itself an issue-proceeds monitoring/
    // disclosure obligation, not proof of diversion). PFUTP-4-2-s ("mis-
    // selling of securities... by knowingly making a false or misleading
    // statement") independently fits an IPO-offer fact pattern on its own
    // terms (an IPO is itself a sale of securities to the public) --
    // established against Trafiksol, para 97.
    //
    // Deliberately NOT included: PFUTP-3/4(1)/12A(a)-(c) core fraud
    // provisions -- both Trafiksol's and Varanium's core financial-
    // statement-misrepresentation PFUTP/12A citations are Category A
    // (already an existing match under financial-statement-
    // misrepresentation above); repeating them here would blur this
    // scenario's distinct identity rather than sharpen it. Also
    // deliberately NOT included: PFUTP-4-2-r (Trafiksol, para 98,
    // expressly found NOT established -- the order distinguishes false/
    // misleading offer-document disclosure from "planting" false news,
    // which is a materially different act; an unsuccessfully alleged
    // provision must not become positive template support merely because
    // it was discussed).
    id: "ipo-prospectus-offer-document-disclosure-irregularities",
    name: "IPO / Prospectus / Offer Document Disclosure Irregularities",
    explanation:
      "Material misstatements or omissions in a Draft Red Herring Prospectus, Red Herring Prospectus, Prospectus, or Letter of Offer filed for an IPO, rights issue, or other public issue of securities — overstated pre-issue revenue or financial position; misrepresented customer/supplier concentration; a misleading Objects-of-Issue quotation; non-disclosure of pending litigation; non-disclosure of a material financial relationship or conflict of interest concerning an issue intermediary (e.g. the Merchant Banker); or an incorrect Statement of Deviation regarding utilisation of issue proceeds. Distinct from ongoing post-listing LODR disclosure lapses (a separate scenario): this scenario concerns the issue/offer-document process itself, governed by the ICDR Regulations. Not every offer-document inaccuracy is fraud — applicability remains fact-dependent, and a finding that a specific PFUTP sub-clause (e.g. 'planting of false news') was NOT established on similar facts in one order does not mean no PFUTP clause can ever apply on different facts.",
    provisionIds: ["ICDR-24-1", "ICDR-245-1", "LODR-32", "PFUTP-4-2-s"],
    // Deliberately empty: no existing concept-tags.ts id specifically
    // distinguishes "IPO/offer document" disclosure from ongoing
    // post-listing disclosure, and adding one carries real regression risk
    // to Part B's negation/polarity logic (see this pass's final report) --
    // out of scope for this validation pass. This scenario is reachable
    // through Part A's direct Fixed Scenario Analysis selection, the same
    // way scenario 8 (the broad catch-all, also keyConceptIds: []) is;
    // it will not yet surface via Law Library free-text concept search or
    // a provision page's "broad CFID scenarios" summary. Flagged in the
    // final report as a follow-up item, not silently worked around here.
    keyConceptIds: [],
  },
];
