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
// Two sub-clauses proposed during scoping do not exist as their own row in
// the live provisions corpus and have been omitted rather than invented:
// LODR Regulation 18(2) (only 18(1)(d) and 18(3)-with-Schedule-II exist as
// separate rows) and LODR Regulation 6(1A) (only 6(1), 6(2)(a) and 6(2)(c)
// exist as separate rows; 6(1A)'s subject matter — filling a Compliance
// Officer vacancy within the prescribed period — is not currently indexed
// as its own citable provision).

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
  },
  {
    id: "related-party-transaction-irregularities",
    name: "Related Party Transaction Irregularities",
    explanation:
      "Non-disclosure of related party transactions; incorrect or misleading RPT disclosures; non-disclosure of outstanding related-party balances; transactions with promoter or promoter-controlled entities; company funds routed through related parties; failure to place RPTs before the Audit Committee; or failure to obtain required prior approval. Kept conceptually separate from fund diversion: the same underlying facts may involve both, but selecting this scenario does not automatically generate PFUTP findings merely because a related party is involved.",
    provisionIds: ["IND-AS-24", "LODR-23-2", "LODR-34-3", "LODR-SCHEDULE-V-A-1", "LODR-4-1-a", "LODR-4-1-b", "LODR-4-2-e-i", "LODR-48"],
  },
  {
    id: "false-misleading-incomplete-disclosures",
    name: "False / Misleading / Incomplete Corporate Disclosures",
    explanation:
      "False or misleading stock-exchange disclosures; incomplete Annual Reports; a misleading description of business operations; incorrect disclosures regarding investments; misleading disclosures regarding audit qualifications; concealment or omission of material information; or other materially false or incomplete corporate disclosures. Not every delayed or incomplete disclosure is fraud — applicability remains fact-dependent.",
    provisionIds: ["PFUTP-4-2-f", "PFUTP-4-2-k", "PFUTP-4-2-r", "LODR-4-1-c", "LODR-33-3-d", "LODR-34-2-a"],
  },
  {
    id: "audit-committee-governance-irregularities",
    name: "Audit Committee / Corporate Governance Irregularities",
    explanation:
      "Improper constitution of the Audit Committee; failure to convene Audit Committee meetings; the Audit Committee failing to discharge its responsibilities; directors or independent directors failing their governance duties; a failure of Board/Audit-Committee oversight; signing or certifying compliance despite known material deficiencies; or other material Board/Audit-Committee governance failures. The exact provision engaged depends on the specific governance failure at issue — not every provision listed here applies to every governance lapse.",
    provisionIds: ["LODR-16-1-b", "LODR-17-8", "LODR-18-1-d", "LODR-18-3-schedule-II", "LODR-4-2-f"],
  },
  {
    id: "compliance-officer-irregularities",
    name: "Compliance Officer Irregularities",
    explanation:
      "Failure to appoint a Compliance Officer; failure to fill a Compliance Officer vacancy within the prescribed period; appointment of an ineligible or non-compliant person as Compliance Officer; the Compliance Officer failing prescribed responsibilities; or failure to ensure regulatory conformity. The exact provision text/version depends on when the conduct occurred — an earlier version of the LODR Regulations may govern conduct predating a later amendment.",
    provisionIds: ["LODR-6-1", "LODR-6-2-a", "LODR-6-2-c"],
  },
  {
    id: "fraudulent-manipulative-conduct-broad",
    name: "Fraudulent / Manipulative Conduct Affecting Investors or the Securities Market",
    explanation:
      "A broader fraud or manipulation category for use when the officer is examining a fraudulent or manipulative scheme rather than a pure accounting, governance or disclosure lapse: a device, scheme or artifice to defraud; conduct creating a false or misleading appearance; manipulation affecting securities or investor decision-making; deceptive conduct connected with dealing in securities; or investor inducement based on materially false information. This scenario intentionally lists only the core prohibition clauses — not every clause of Regulation 4(2) of the PFUTP Regulations is treated as universally applicable; which of those more specific clauses apply depends on the particular facts of the scheme under investigation.",
    provisionIds: ["SEBI-ACT-12A-a", "SEBI-ACT-12A-b", "SEBI-ACT-12A-c", "PFUTP-3-a", "PFUTP-3-b", "PFUTP-3-c", "PFUTP-3-d", "PFUTP-4-1"],
  },
];
