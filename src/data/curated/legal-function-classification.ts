// Structured legal-function taxonomy (deterministic-engine completion pass).
//
// The prior non-PFUTP remediation pass expressed this only as a
// "[bracketed label]" prefix embedded in each retrieval rule's own
// explanation string — a pragmatic shortcut that worked for gated
// provisions, but (a) was invisible to ungated provisions entirely, (b)
// was prose, not data, so nothing in the engine or UI could actually branch
// on it, and (c) required the reader to find and parse the label out of a
// paragraph rather than reading a first-class field. This file replaces
// that shortcut with an actual data structure: every one of the 99
// provisions currently in the live corpus (PFUTP, SEBI Act, LODR, ICDR,
// Ind AS, Companies Act) is classified here, independent of whether it
// happens to be gated in provision-retrieval-rules.ts.
//
// A provision's legal function is a fact about what KIND of legal norm it
// is (a prohibition, a disclosure duty, a penalty, an attribution
// mechanism, a bare definition...), never a claim about whether the
// entered scenario satisfies it — that remains provision-retrieval-rules.ts
// (the factual gate) and provision-actor-applicability.ts (the actor gate).
// See src/lib/matching/engine.ts (deriveCandidateTier) for how this feeds
// the Primary/Related-ancillary/Requires-additional-fact/Historical-only
// candidate hierarchy: a penalty provision, a bare definition, a general
// principle and a liability-attribution mechanism are never presented as
// candidate VIOLATIONS equivalent to a substantive prohibition, disclosure
// obligation, governance/procedural obligation, accounting/reporting
// requirement or investigation/cooperation obligation.

export type LegalFunctionCategory =
  | "substantive_prohibition"
  | "disclosure_obligation"
  | "governance_procedural_obligation"
  | "accounting_reporting_requirement"
  | "investigation_cooperation_obligation"
  | "liability_attribution_provision"
  | "penalty_provision"
  | "sebi_power_remedial_provision"
  | "definition"
  | "general_principle"
  | "other";

export const LEGAL_FUNCTION_LABELS: Record<LegalFunctionCategory, string> = {
  substantive_prohibition: "Substantive prohibition",
  disclosure_obligation: "Disclosure obligation",
  governance_procedural_obligation: "Governance/procedural obligation",
  accounting_reporting_requirement: "Accounting/reporting requirement",
  investigation_cooperation_obligation: "Investigation/cooperation obligation",
  liability_attribution_provision: "Liability/attribution provision",
  penalty_provision: "Penalty provision",
  sebi_power_remedial_provision: "SEBI power/remedial provision",
  definition: "Definition",
  general_principle: "General principle",
  other: "Other",
};

/** The legal-function categories that can themselves be the PRIMARY basis
 * of a candidate violation — i.e. a provision whose own text states a duty
 * or prohibition an officer could investigate as the substance of a
 * charge. The remaining categories (penalty, attribution, SEBI power,
 * definition, general principle, other) can never anchor a "Primary
 * candidate" tier on their own; they ride on some other substantive
 * violation, or state a threshold/definition, or describe a consequence —
 * see deriveCandidateTier in engine.ts. */
export const PRIMARY_CAPABLE_LEGAL_FUNCTIONS = new Set<LegalFunctionCategory>([
  "substantive_prohibition",
  "disclosure_obligation",
  "governance_procedural_obligation",
  "accounting_reporting_requirement",
  "investigation_cooperation_obligation",
]);

// One entry per live provision id, grouped by instrument for reviewability.
// A provision NOT in this map falls back to "other" (see
// legalFunctionForProvision) — every one of the 99 live provisions is
// listed below, so that fallback should never actually be exercised for
// current data; kept only so a future provision added to the corpus before
// this file is updated fails safe (visibly "Other", never silently
// mis-classified as something narrower).
export const LEGAL_FUNCTION_BY_PROVISION: Record<string, LegalFunctionCategory> = {
  // ----- PFUTP Regulations, 2003 -----
  "PFUTP-3-a": "substantive_prohibition",
  "PFUTP-3-b": "substantive_prohibition",
  "PFUTP-3-c": "substantive_prohibition",
  "PFUTP-3-d": "substantive_prohibition",
  "PFUTP-3-a-d": "substantive_prohibition", // legacy pre-split fixture id
  "PFUTP-4-1": "substantive_prohibition",
  "PFUTP-4-2-a": "substantive_prohibition",
  "PFUTP-4-2-b": "substantive_prohibition",
  "PFUTP-4-2-c": "substantive_prohibition",
  "PFUTP-4-2-e": "substantive_prohibition",
  "PFUTP-4-2-f": "substantive_prohibition",
  "PFUTP-4-2-k": "substantive_prohibition",
  "PFUTP-4-2-r": "substantive_prohibition",
  // Checkpoint correction 2, item 1: PFUTP-4-2-h and PFUTP-4-2-s previously
  // had no entry here. Independently verified against the current official
  // SEBI PFUTP Regulations, 2003 text (consolidated to June 28, 2024,
  // confirmed current against the corpus's own official_source_url dates):
  // 4(2)(h) prohibits "selling, dealing or pledging of stolen, counterfeit
  // or fraudulently issued securities"; 4(2)(s) prohibits "mis-selling of
  // securities or services relating to securities market" (defined via a
  // false/misleading statement, concealment of material facts, concealment
  // of risk, or failure to ensure suitability). Both sit in the same
  // Regulation 4(2) deeming-clause family as the already-classified
  // siblings immediately above (each an independent, self-contained
  // prohibited-conduct clause an officer could investigate on its own),
  // genuinely substantive_prohibition — no basis to treat them differently
  // from 4(2)(a)/(b)/(c)/(e)/(f)/(k)/(r).
  "PFUTP-4-2-h": "substantive_prohibition",
  "PFUTP-4-2-s": "substantive_prohibition",

  // ----- SEBI Act, 1992 -----
  "SEBI-ACT-12A-a": "substantive_prohibition",
  "SEBI-ACT-12A-b": "substantive_prohibition",
  "SEBI-ACT-12A-c": "substantive_prohibition",
  "SEBI-ACT-12A": "substantive_prohibition", // legacy pre-split fixture id
  "SEBI-ACT-11-2-e": "sebi_power_remedial_provision",
  "SEBI-ACT-11-2-gen": "sebi_power_remedial_provision",
  "SEBI-ACT-11-2-i": "sebi_power_remedial_provision",
  "SEBI-ACT-11-2-ia": "sebi_power_remedial_provision",
  "SEBI-ACT-11C-2": "investigation_cooperation_obligation",
  "SEBI-ACT-11C-3": "investigation_cooperation_obligation",
  "SEBI-ACT-11C-5": "investigation_cooperation_obligation",
  "SEBI-ACT-11C-gen": "investigation_cooperation_obligation",
  "SEBI-ACT-15HA": "penalty_provision",
  "SEBI-ACT-15HB": "penalty_provision",
  "SEBI-ACT-27": "liability_attribution_provision",

  // ----- LODR Regulations, 2015 -----
  "LODR-16-1-b": "definition",
  "LODR-17-8": "governance_procedural_obligation",
  "LODR-18-1-b": "governance_procedural_obligation",
  "LODR-18-1-d": "governance_procedural_obligation",
  "LODR-18-2": "governance_procedural_obligation",
  "LODR-18-3-schedule-II": "governance_procedural_obligation",
  "LODR-2-zc": "definition",
  "LODR-23-1": "definition",
  "LODR-23-2": "governance_procedural_obligation",
  "LODR-23-4": "governance_procedural_obligation",
  "LODR-27-2-a": "disclosure_obligation",
  "LODR-30": "disclosure_obligation",
  "LODR-31-statement": "disclosure_obligation",
  "LODR-32": "disclosure_obligation",
  // Checkpoint correction 2, item 1: LODR-32-1/4/5 previously had no entry
  // here — added to the corpus after this map was built. Independently
  // verified against the current official SEBI LODR Regulations, 2015 text
  // (amended to July 14, 2026; /tmp/lodr_2026_full.txt, Regulation 32 —
  // "Statement of deviation(s) or variation(s)"), read directly: 32(1)
  // requires a quarterly statement to the stock exchange of deviation
  // between disclosed issue objects and actual utilisation of proceeds
  // (required every quarter, "if any" deviation exists); 32(4) requires
  // the listed entity to furnish an explanation for that variation in the
  // directors' report in the Annual Report; 32(5) requires an annual
  // statement of funds used for OTHER purposes, certified by the
  // statutory auditors, placed before the Audit Committee. Checkpoint
  // correction 3 corrected a mischaracterization of 32(4) in this
  // comment's earlier revision (it has no Audit Committee-involvement
  // text of its own — that is 32(3), not separately indexed in this
  // corpus; 32(5) is the sub-regulation that combines auditor
  // certification with Audit Committee placement). All three remain
  // reporting/monitoring sub-duties of the SAME underlying obligation
  // (accurate accounting for how issue proceeds were actually applied) —
  // cumulative sub-clauses of one Regulation, not chapter-specific
  // alternatives the way ICDR-24-1/245-1 are — so all three genuinely
  // share accounting_reporting_requirement, consistent with their own
  // sibling LODR-32 (bare/legacy id) above. Checkpoint correction 3, P0-2:
  // "cumulative" describes how these three duties relate to EACH OTHER
  // (none supersedes or subsumes another), never a licence to gate all
  // three on one shared factual predicate — each still independently
  // requires its OWN sub-duty-specific retrieval prerequisite; see
  // provision-retrieval-rules.ts.
  "LODR-32-1": "accounting_reporting_requirement",
  "LODR-32-4": "accounting_reporting_requirement",
  "LODR-32-5": "accounting_reporting_requirement",
  "LODR-33-1-a": "accounting_reporting_requirement",
  "LODR-33-1-c": "accounting_reporting_requirement",
  "LODR-33-1-d": "accounting_reporting_requirement",
  "LODR-33-1-gen": "accounting_reporting_requirement",
  "LODR-33-2-a": "governance_procedural_obligation",
  "LODR-33-3-b": "accounting_reporting_requirement",
  "LODR-33-3-c": "accounting_reporting_requirement",
  "LODR-33-3-d": "accounting_reporting_requirement",
  "LODR-33-3-gen": "accounting_reporting_requirement",
  "LODR-33-3-i": "accounting_reporting_requirement",
  "LODR-33-5": "accounting_reporting_requirement",
  "LODR-34-2-a": "accounting_reporting_requirement",
  "LODR-34-2-b": "accounting_reporting_requirement",
  "LODR-34-3": "disclosure_obligation",
  "LODR-37A": "governance_procedural_obligation",
  "LODR-4-1": "general_principle",
  "LODR-4-1-a": "general_principle",
  "LODR-4-1-b": "general_principle",
  "LODR-4-1-c": "general_principle",
  "LODR-4-1-d": "general_principle",
  "LODR-4-1-e": "general_principle",
  "LODR-4-1-g": "general_principle",
  "LODR-4-1-h": "general_principle",
  "LODR-4-1-i": "general_principle",
  "LODR-4-1-j": "general_principle",
  "LODR-4-2-e-i": "accounting_reporting_requirement",
  "LODR-4-2-f": "general_principle",
  "LODR-4-2-f-i": "general_principle",
  "LODR-4-2-f-ii": "general_principle",
  "LODR-4-2-f-iii": "general_principle",
  "LODR-46-2-s": "disclosure_obligation",
  "LODR-48": "accounting_reporting_requirement",
  "LODR-6-1": "governance_procedural_obligation",
  "LODR-6-1A": "governance_procedural_obligation",
  "LODR-6-2-a": "governance_procedural_obligation",
  "LODR-6-2-b": "governance_procedural_obligation",
  "LODR-6-2-c": "governance_procedural_obligation",
  "LODR-6-2-gen": "governance_procedural_obligation",
  "LODR-6-gen": "governance_procedural_obligation",
  "LODR-SCHEDULE-V-A-1": "disclosure_obligation",

  // ----- SEBI (ICDR) Regulations, 2018 -----
  "ICDR-158-CH-V": "substantive_prohibition",
  "ICDR-160": "substantive_prohibition",
  "ICDR-167": "substantive_prohibition",
  // Checkpoint correction 2, item 1: ICDR-24-1 and ICDR-245-1 previously had
  // no entry here (silently "other") — LEGAL_FUNCTION_BY_PROVISION predated
  // their addition to the corpus. Independently verified against the
  // current official SEBI ICDR Regulations, 2018 text (consolidated to
  // March 21, 2026; /tmp/icdr_2026_full.txt lines 1663-1665 and
  // 9123-9125), read directly, not via this map, prior app labels, or any
  // secondary source: Regulation 24(1) ("Disclosures in the draft offer
  // document and offer document", Part VI Chapter III, main-board issues)
  // and Regulation 245(1) (the textually identical SME-chapter counterpart,
  // Chapter IX) both state "[the draft] offer document shall contain all
  // material disclosures which are true and adequate ... to enable the
  // applicants to take an informed investment decision" — an affirmative
  // disclosure duty an officer could independently investigate as the
  // substance of a charge, genuinely disclosure_obligation, not "other".
  // The two ids are chapter-specific alternatives (main-board vs SME issue),
  // never simultaneously applicable to the same offer document.
  "ICDR-24-1": "disclosure_obligation",
  "ICDR-245-1": "disclosure_obligation",

  // ----- Indian Accounting Standards -----
  "IND-AS-1": "accounting_reporting_requirement",
  "IND-AS-7": "accounting_reporting_requirement",
  "IND-AS-21": "accounting_reporting_requirement",
  "IND-AS-23": "accounting_reporting_requirement",
  "IND-AS-24": "accounting_reporting_requirement",
  "IND-AS-28": "accounting_reporting_requirement",
  "IND-AS-32": "accounting_reporting_requirement",
  "IND-AS-107": "accounting_reporting_requirement",
  "IND-AS-109": "accounting_reporting_requirement",
  "IND-AS-110": "accounting_reporting_requirement",
  "IND-AS-115": "accounting_reporting_requirement",

  // ----- Legacy, pre-split fixture-only ids (tests/fixtures.ts JSON only;
  // never present in the live database) — mapped to the same legal
  // function as their split successors above, so a test running against
  // the older fixture set is never silently mis-classified as "other". -----
  "LODR-6-compliance-officer": "governance_procedural_obligation",
  "LODR-4-1-general": "general_principle",
  "LODR-33": "accounting_reporting_requirement",
  "LODR-34": "disclosure_obligation",
  // Checkpoint correction 2, item 1's new structural regression caught a
  // pre-existing key-name mismatch here: this fixture id is actually
  // "LODR-audit-committee" (see provision-retrieval-rules.ts and
  // src/data/generated/provisions.json/scenarioFindings.json), not
  // "LODR-18-audit-committee-bundle" — the latter was never a real id
  // anywhere in the codebase, so it silently satisfied nothing while the
  // real id silently fell back to "other". Fixed to the real id.
  "LODR-audit-committee": "governance_procedural_obligation",

  // ----- Companies Act, 2013 -----
  "COMPANIES-ACT-136": "disclosure_obligation",
  "COMPANIES-ACT-139": "governance_procedural_obligation",
  "COMPANIES-ACT-141-3-d": "substantive_prohibition",
  "COMPANIES-ACT-141-3-e": "substantive_prohibition",
  "COMPANIES-ACT-180-1-a": "governance_procedural_obligation",
  "COMPANIES-ACT-24": "sebi_power_remedial_provision",
  "COMPANIES-ACT-67-2": "substantive_prohibition",
};

export function legalFunctionForProvision(provisionId: string): LegalFunctionCategory {
  return LEGAL_FUNCTION_BY_PROVISION[provisionId] ?? "other";
}

export function isPrimaryCapable(fn: LegalFunctionCategory): boolean {
  return PRIMARY_CAPABLE_LEGAL_FUNCTIONS.has(fn);
}
