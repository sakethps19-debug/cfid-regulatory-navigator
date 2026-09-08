import type { ConceptKind } from "@/data/curated/concept-tags";
import type { LegalFunctionCategory } from "@/data/curated/legal-function-classification";
import type { FindingStatus, LegalProvision, ProvisionVersion, ScenarioFinding } from "@/types/domain";
import type { WordCorrection } from "./fuzzyMatch";

/** The officer-facing candidate hierarchy (deterministic-engine completion
 * pass): a provision shown at all is placed in exactly one of these tiers,
 * so a penalty provision, a bare definition, a general principle, a
 * liability-attribution mechanism and a substantive prohibition are never
 * presented as equivalent candidate violations.
 *   - "primary_candidate": the entered facts independently satisfy this
 *     provision's own retrieval prerequisite (or it is ungated), AND its
 *     legal function is one that can itself anchor a charge (see
 *     PRIMARY_CAPABLE_LEGAL_FUNCTIONS).
 *   - "related_ancillary": the entered facts satisfy the prerequisite, but
 *     the provision's own legal function (general principle, penalty,
 *     liability-attribution, SEBI power, definition) means it rides on
 *     some OTHER substantive violation rather than standing on its own.
 *   - "requires_additional_fact": a factually-overlapping historical
 *     finding cites this provision, but either its own factual retrieval
 *     prerequisite or its actor-applicability check is not satisfied by
 *     the entered facts (see GateBlockedProvisionResult).
 *   - "historical_precedent_only": the only precedent found for this
 *     provision on these facts is contrary (not confirmed/withdrawn) — see
 *     ContraryOnlyProvisionResult — or (in the historical-treatment view
 *     only) the provision was considered in comparable CFID matters but is
 *     not a current-scenario candidate at all. */
export type CandidateTier = "primary_candidate" | "related_ancillary" | "requires_additional_fact" | "historical_precedent_only";

/** Result of checking a provision's own actor-applicability rule (see
 * data/curated/provision-actor-applicability.ts) against the entered
 * scenario's stated actors. Never a liability determination — only whether
 * the CANDIDATE itself should be shown as applicable, flagged, or withheld.
 *   - "not_actor_specific": this provision has no actor-applicability rule
 *     (most provisions — a company-wide obligation with no narrower actor
 *     nexus this corpus's vocabulary distinguishes).
 *   - "compatible": the scenario names at least one actor within this
 *     provision's applicable set.
 *   - "requires_verification": this provision IS actor-specific, but the
 *     scenario names no actor at all — shown, never suppressed, with a
 *     note rather than an invented attribution.
 *   - "incompatible": the scenario names at least one actor, and NONE of
 *     the named actors fall within this provision's applicable set (e.g.
 *     only a promoter is named for a Compliance Officer-specific
 *     provision) — this provision is withheld as a full candidate. */
export interface ActorApplicability {
  status: "not_actor_specific" | "compatible" | "requires_verification" | "incompatible";
  note: string | null;
}

export interface ScenarioQuery {
  freeText: string;
  /** Optional dropdown selection from the curated actor-role vocabulary
   * (e.g. "Related party"). Despite the UI grouping it under "Optional
   * filters", this is architecturally a SIGNAL, not an exclusionary
   * filter: selecting it asserts that fact about the entered scenario
   * exactly as if the officer had typed it, and is folded into the same
   * canonical concept set free-text detection produces (see
   * buildEffectiveScenarioConcepts in engine.ts) — it never removes a
   * finding that fails to match it. Renamed from the former
   * `actorFilter` for this reason. */
  actorSignal?: string | null;
  /** Optional dropdown selection from the curated alleged-conduct
   * vocabulary (the "Scenario type" dropdown in the UI, e.g.
   * "Fraudulent/sham preferential allotment") — never the underlying
   * transactionTypes field, which describes transaction subject matter
   * (e.g. "financial statement disclosure") rather than a
   * violation/scenario category. Same signal-not-filter semantics as
   * actorSignal above; renamed from the former `scenarioTypeFilter`. */
  scenarioTypeSignal?: string | null;
  /** Optional dropdown selection from the curated evidence-type
   * vocabulary (the "Evidence indicator" dropdown in the UI) — lets an
   * officer who already knows what documentary evidence exists assert it
   * directly, rather than relying only on free-text detection. Same
   * signal-not-filter semantics as actorSignal above; renamed from the
   * former `evidenceFilter`. */
  evidenceSignal?: string | null;
  /** Descriptive-only fields carried through to the result and any export,
   * never used in scoring: there is no curated data to reliably match a
   * conduct period, entity name or amount against, and attempting fuzzy
   * date/amount matching risked implying a precision this pilot does not
   * have. Included so an officer's own record of the scenario is complete
   * without silently discarding what they typed. */
  conductPeriod?: string | null;
  entityOrIssuer?: string | null;
  amountInvolved?: string | null;
}

/** Which of the four fact-element categories were detected at all in the
 * entered scenario (by free text or an explicit filter) versus not stated —
 * surfaced as a plain completeness summary, never as a claim that a
 * "not stated" category is actually absent from the underlying facts, only
 * that this scenario, as entered, did not mention it. */
export interface ScenarioCompleteness {
  detected: ConceptKind[];
  notStated: ConceptKind[];
}

export type ConfidenceLevel = "High" | "Medium" | "Low";

/** matchedFactualIngredients split back out by the kind of fact each
 * ingredient is — surfaced in the UI's "Why was this result retrieved?"
 * panel (see engine.ts scoreFinding) so a match is shown as what kind of
 * thing it is (a transaction type, an actor role, an alleged-conduct
 * category, or an evidence type), not just a flat list of labels. */
export interface MatchedByCategory {
  transactionTypes: string[];
  actorRoles: string[];
  allegedConduct: string[];
  evidenceTypes: string[];
}

export interface PrecedentRef {
  finding: ScenarioFinding;
  /** The procedural/merits status to treat THIS SPECIFIC provision-finding
   * link as carrying, for support/contrary classification and display.
   * Defaults to finding.findingStatus, but is downgraded when the specific
   * link's own finding_provisions.relationship curation ("alleged"/
   * "not_upheld") shows that THIS provision's own disposition within a
   * multi-provision finding differs from the finding's overall status — e.g.
   * a finding "Partly Confirmed in Final Order" overall because its LODR
   * provision was confirmed, while its PFUTP link is separately recorded as
   * "alleged" (cited/considered, not the basis of the disposition) or
   * "not_upheld" (this specific charge was NOT established). Never invert
   * the other direction: a link with no curated relationship, or with
   * relationship "upheld", uses finding.findingStatus unchanged. See P0
   * provision-precision remediation v2, section 11 (supporting precedent
   * must mean supporting for THIS provision, not merely part of a bundled
   * finding where some other allegation was upheld). */
  effectiveStatus: FindingStatus;
  score: number;
  matchedFactualIngredients: string[];
  matchedByCategory: MatchedByCategory;
  /** MECHANICAL tag subtraction: this precedent's own curated fact-element
   * TAGS (transaction type / actor role / conduct / evidence — bare
   * vocabulary labels, e.g. "Related party") that the entered scenario did
   * NOT establish, i.e. what else this precedent's own record touches on
   * that the query doesn't mention. Read as "not (yet) established by your
   * facts", not as a statement that the entered scenario lacks these
   * elements. Deliberately distinct from, and never a substitute for,
   * finding.ingredientsNotEstablished — the curated, human-written "legal
   * ingredients not established" explanation for THIS precedent's own
   * outcome (scenario_findings.ingredients_not_established), which is a
   * reasoned legal analysis, not a tag list. See
   * additionalPrecedentFactsNotMatched in engine.ts. */
  additionalPrecedentFactsNotMatched: string[];
  /** Present only for contrary (status "Not Confirmed in Final Order"/"Withdrawn") precedents:
   * a plain-language note on why this precedent may be distinguishable on
   * its facts, built from its own qualification text and evidentiary gaps. */
  distinguishingNote?: string;
  /** Present only on entries in AnalysisResult.globalContraryPrecedents: a
   * human-readable explanation of the material-relevance test this specific
   * contrary precedent passed (which factual categories overlap, and the
   * resulting score) — see requireMaterialContraryRelevance in engine.ts.
   * Never present for a contrary precedent that failed that test, since
   * those are excluded from the result entirely rather than shown with a
   * caveat. */
  materialRelevanceNote?: string;
}

/** One supporting precedent's own genuine outstanding evidentiary gaps
 * (relative to the ENTERED SCENARIO), kept attributed to it by record id
 * rather than merged anonymously with every other precedent's gaps under
 * the same provision — see ProvisionResult.missingFacts. */
export interface MissingFactsForPrecedent {
  recordId: string;
  scenarioTitle: string;
  gaps: string[];
}

export interface ProvisionResult {
  provision: LegalProvision;
  whyRelevant: string;
  matchedFactualIngredients: string[];
  matchedByCategory: MatchedByCategory;
  supportingPrecedents: PrecedentRef[];
  contraryPrecedents: PrecedentRef[];
  /** Matching precedents whose outcome was actually "Confirmed in Final
   * Order" or "Partly Confirmed in Final Order" — pulled out from supportingPrecedents (which mixes in weaker
   * statuses like Alleged/Prima facie) so an officer can see at a glance
   * whether this provision has ever actually been confirmed on similar
   * facts, not just alleged. Drawn from every matching finding for this
   * provision, not only the top-3 shown under supportingPrecedents. */
  upheldPrecedents: PrecedentRef[];
  statusesSeen: FindingStatus[];
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  /** Outstanding evidentiary gaps, kept attributed to the specific
   * supporting precedent each gap was recorded against — never merged
   * into one flat, deduplicated, unattributed list. A precedent's own
   * evidentiaryGaps describe what that precedent's own record shows as
   * outstanding for comparing the ENTERED SCENARIO against it, not a
   * universal requirement every precedent in this provision shares; two
   * different precedents can (and often do) require different things.
   * Empty entries (a supporting precedent with no genuine evidentiary
   * gaps recorded) are omitted, not shown as an empty group. */
  missingFacts: MissingFactsForPrecedent[];
  /** The provision's recorded text version(s) — surfaced so the officer
   * never assumes the current statutory text applied at the time of the
   * conduct without checking. */
  provisionVersions: ProvisionVersion[];
  applicableVersionNote: string;
  /** See legal-function-classification.ts — what KIND of legal norm this
   * provision is, independent of whether the entered facts satisfy it. */
  legalFunction: LegalFunctionCategory;
  /** See CandidateTier above — always "primary_candidate" or
   * "related_ancillary" for an entry in provisionResults (a provision here
   * has, by construction, already passed both the factual and
   * actor-applicability gates). */
  candidateTier: CandidateTier;
  /** See ActorApplicability above — "compatible"/"not_actor_specific" for
   * every entry here except where actor identity is unverified (status
   * "requires_verification"): the provision is still shown, but the
   * officer should confirm which actor's obligation is actually in play
   * before relying on it. */
  actorApplicability: ActorApplicability;
}

/** A provision that matched ONLY contrary (not-confirmed/withdrawn)
 * findings for this scenario — no supporting precedent exists, so it is
 * never listed in AnalysisResult.provisionResults (which represents
 * "potentially relevant, with supporting precedent"). Previously such a
 * provision was silently dropped entirely: an officer investigating facts
 * materially similar to a matter where this exact provision was
 * considered and NOT confirmed had no way to learn that from this tool.
 * Surfaced separately here instead, as a caution/contrary-treatment
 * signal rather than a "this may apply" one — see
 * AnalysisResult.contraryOnlyProvisionResults. */
export interface ContraryOnlyProvisionResult {
  provision: LegalProvision;
  contraryPrecedents: PrecedentRef[];
  note: string;
  legalFunction: LegalFunctionCategory;
  /** Always "historical_precedent_only": no supporting precedent exists,
   * only a materially comparable finding where this provision was
   * considered and NOT confirmed. */
  candidateTier: CandidateTier;
}

/** A provision that WOULD otherwise have surfaced (a factually-overlapping
 * finding cites it, and any per-link justifyingTags gate passed) but was
 * blocked by the provision-level retrieval gate (see
 * data/curated/provision-retrieval-rules.ts): the provision's own text
 * requires a specific minimum nexus (e.g. PFUTP requires a securities
 * dealing/issue fact and a deceptive/fraudulent-conduct fact) that the
 * entered scenario does not state. Never merged into provisionResults
 * ("potentially relevant") or silently dropped — an officer should still
 * know that a factually similar historical matter also involved this
 * provision, just not that the provision itself is a candidate on the
 * present facts. See P0 provision-precision remediation. */
export interface GateBlockedProvisionResult {
  provision: LegalProvision;
  relatedFactualPrecedents: PrecedentRef[];
  /** The retrieval rule's own plain-language statement of the minimum
   * facts required — never a legal-ingredients test, only a retrieval
   * prerequisite. Empty string when this provision was blocked ONLY by the
   * actor-applicability layer (see blockReason) and carries no factual
   * retrieval rule of its own. */
  gateExplanation: string;
  note: string;
  legalFunction: LegalFunctionCategory;
  /** Always "requires_additional_fact". */
  candidateTier: CandidateTier;
  /** Which gate(s) blocked this provision from provisionResults — a
   * provision can be blocked on facts, on actor identity, or both (this
   * corpus currently produces "both" only where a scenario states neither
   * the required nexus nor a compatible actor). Never conflated in the
   * displayed note: an officer reading "actor_incompatibility" should
   * understand the FACTS may otherwise be sufficient, just not against the
   * actor named. */
  blockReason: "factual_prerequisite" | "actor_incompatibility" | "both";
}

export interface GuardrailNote {
  id: string;
  provisionOrIssue: string;
  workingPrinciple: string;
  implementationGuardrail: string;
  paragraphAnchors: string | null;
}

// ----- Historical treatment across CFID cases (Question B — deterministic
// engine completion pass) -----
//
// The precision engine above (provisionResults/gateBlockedProvisionResults/
// contraryOnlyProvisionResults) answers "what provisions are potentially
// relevant to MY facts?" — only provisions independently justified by the
// entered scenario ever appear there. This section answers a DIFFERENT
// question an officer also needs: "how has CFID historically treated
// materially similar facts?" — a broader, ungated view of every provision a
// materially-similar finding has cited, for awareness of regulatory
// practice and precedent, NEVER as a second route to "this provision
// applies here". See buildHistoricalTreatment in
// lib/matching/historicalTreatment.ts, and its own header comment for the
// full architecture (matter-level dedup, order-stage classification,
// the critical "historical frequency never determines legal applicability"
// invariant).

/** Order-stage classification for one historical case entry. Derived from
 * Order.orderStage when Order data is supplied to buildHistoricalTreatment
 * (the precise classification); falls back to a coarser classification from
 * the finding's own status/paragraph-reference fields when no Order data is
 * available, in which case "unresolved_or_not_independently_classified" is
 * used rather than fabricating a stage the source data doesn't establish. */
export type HistoricalOrderStageClass =
  | "interim_or_ex_parte"
  | "confirmatory"
  | "final_wtm"
  | "adjudication"
  | "settlement"
  | "sat_or_supreme_court"
  | "unresolved_or_not_independently_classified";

export const HISTORICAL_ORDER_STAGE_LABELS: Record<HistoricalOrderStageClass, string> = {
  interim_or_ex_parte: "Interim / ex-parte order",
  confirmatory: "Confirmatory order",
  final_wtm: "Final WTM order",
  adjudication: "Adjudication order",
  settlement: "Settlement order",
  sat_or_supreme_court: "SAT / Supreme Court outcome",
  unresolved_or_not_independently_classified: "Stage not independently determined from source order metadata",
};

/** How a case entry's matterKey was resolved (deterministic-engine
 * historical-treatment correction pass). "matter_id" means the entry was
 * grouped by the canonical orders.matter_id — a real, curated foreign key
 * (see data.ts's mapOrder) — resolved via the finding's own orderIds.
 * "case_name_fallback" means no linked order carried a matter_id, so the
 * entry fell back to a normalized case-name key, a DISCLOSED, weaker
 * proxy: it can undercount (two different matters sharing a case-name
 * string get merged) but never overcounts a single matter's own sibling
 * orders as independent precedents in the way the case-name-only scheme
 * this replaces could when matter_id data existed but went unused. */
export type MatterIdentityBasis = "matter_id" | "case_name_fallback";

export interface HistoricalTreatmentCaseEntry {
  recordId: string;
  caseName: string;
  /** The matter-level dedup key this case entry was grouped under — a
   * matter_id-based key when resolvable, a case-name-based fallback key
   * otherwise (see matterIdBasis). The two key spaces are disjoint by
   * construction (differently prefixed) so a fallback key can never
   * collide with a real matter_id key. */
  matterKey: string;
  matterIdBasis: MatterIdentityBasis;
  findingStatus: FindingStatus;
  /** This specific provision-finding link's effective status (honors
   * finding_provisions.relationship — see effectiveLinkStatus in
   * engine.ts), never the finding's bare overall status. */
  effectiveStatus: FindingStatus;
  orderStageClass: HistoricalOrderStageClass;
  noticeeActors: string[];
  /** Matched-ingredient labels shared with the entered scenario (bare
   * factual overlap, computed the same way as scoreFinding — never a legal
   * analysis). */
  factualSimilarities: string[];
  /** This precedent's own recorded tags NOT shared with the entered
   * scenario — same MECHANICAL subtraction as
   * PrecedentRef.additionalPrecedentFactsNotMatched, not a legal analysis. */
  factualDifferences: string[];
  /** Whether THIS SPECIFIC provision link's own finding_provisions.
   * justifying_tags positively connects it to the entered scenario's
   * detected concepts ("attributed"), or whether that curation is empty/
   * unreviewed so no such connection can be claimed ("unverified") — see
   * historicalTreatment.ts's header comment. A link whose justifying_tags
   * ARE populated but do NOT overlap the entered scenario is excluded
   * from this provision's case list entirely (positive curated evidence
   * that this specific link concerns a different fact within the same
   * finding), so every case entry that does appear is one of these two
   * states, never a claim that goes beyond what the underlying data
   * supports. */
  attributionStatus: "attributed" | "unverified";
  paragraphReference: string | null;
  officialSourceUrl: string;
}

/** Historical comparability of ONE finding (and, aggregated, one matter) to
 * the entered scenario — a DIFFERENT, stricter question than the precision
 * engine's MIN_FINDING_SCORE bar. A single generic tag match (e.g. only the
 * "related-party transaction" transaction tag, nothing else) is real
 * factual overlap and still clears the base bar, but must never by itself
 * read as "strongly comparable" — see buildHistoricalComparability in
 * historicalTreatment.ts. */
export type HistoricalComparabilityTier = "strongly_comparable" | "moderately_comparable" | "contextually_related" | "weak_excluded";

export const HISTORICAL_COMPARABILITY_LABELS: Record<HistoricalComparabilityTier, string> = {
  strongly_comparable: "Strongly comparable",
  moderately_comparable: "Moderately comparable",
  contextually_related: "Contextually related",
  weak_excluded: "Weak / excluded",
};

/** The outcome across every case entry sharing one (matter, provision)
 * pair. "mixed" — never silently collapsed to whichever status wins a
 * finality ranking — means different noticees (or different findings
 * within the same matter) carried genuinely different dispositions for
 * THIS provision, and the officer must be shown that split, not one
 * representative figure. */
export type MatterProvisionOutcomeKind =
  | "uniformly_confirmed_final"
  | "uniformly_partly_upheld"
  | "uniformly_not_upheld"
  | "uniformly_confirmed_interim"
  | "uniformly_alleged_or_unresolved"
  | "uniformly_withdrawn"
  | "mixed_noticee_outcome";

export const MATTER_PROVISION_OUTCOME_LABELS: Record<MatterProvisionOutcomeKind, string> = {
  uniformly_confirmed_final: "Uniformly confirmed in final order",
  uniformly_partly_upheld: "Uniformly partly confirmed in final order",
  uniformly_not_upheld: "Uniformly not confirmed in final order",
  uniformly_confirmed_interim: "Uniformly confirmed at interim (no final disposition yet)",
  uniformly_alleged_or_unresolved: "Uniformly alleged / unresolved (no merits determination)",
  uniformly_withdrawn: "Uniformly withdrawn",
  mixed_noticee_outcome: "Mixed outcome across noticees/findings — see individual cases",
};

/** One matter's own case entries for one provision, grouped so a mixed
 * outcome across noticees is an explicit, first-class state rather than
 * being collapsed by a finality-priority pick. */
export interface HistoricalTreatmentMatterOutcome {
  matterKey: string;
  matterIdBasis: MatterIdentityBasis;
  /** Representative case name for display — the first case entry's own
   * caseName; different sibling orders of the same matter should share
   * one, but this is never used as the dedup key itself. */
  caseName: string;
  comparabilityTier: HistoricalComparabilityTier;
  outcome: MatterProvisionOutcomeKind;
  cases: HistoricalTreatmentCaseEntry[];
}

export interface HistoricalTreatmentDispositionBreakdown {
  alleged: number;
  primaFacie: number;
  confirmedAtInterim: number;
  confirmedFinal: number;
  partlyUpheld: number;
  notUpheld: number;
  withdrawn: number;
  inconclusive: number;
  proceduralObservation: number;
  /** Count of (matter, provision) groups whose outcome is
   * "mixed_noticee_outcome" — see MatterProvisionOutcomeKind. Every other
   * field above counts only UNIFORM groups; a mixed group is tallied here
   * and nowhere else, so the bare-status counts can never silently absorb
   * a split outcome under whichever status happened to rank highest. */
  mixedNoticeeOutcome: number;
}

export interface HistoricalTreatmentProvisionEntry {
  provision: LegalProvision;
  legalFunction: LegalFunctionCategory;
  /** Distinct matters, at strongly_comparable or moderately_comparable
   * tier only, whose case entries contributed to this provision — the
   * count an officer should read as "N comparable matters". Matters at
   * contextually_related tier are tracked separately
   * (contextuallyRelatedMatterCount) and never contribute provision
   * entries at all — see historicalTreatment.ts's header comment for why
   * a merely generic (actor/evidence-only) overlap cannot support
   * attributing a specific provision to the entered facts. Never
   * totalFindingsCount below, which can overstate the same matter's
   * multiple order stages/noticees as independent precedents. */
  comparableMatterCount: number;
  /** Of comparableMatterCount, how many were strongly vs. moderately
   * comparable — never merged into one figure, since the two tiers rest
   * on materially different strength of overlap (see
   * HistoricalComparabilityTier). */
  stronglyComparableMatterCount: number;
  moderatelyComparableMatterCount: number;
  /** Matters whose ONLY overlap with the entered scenario was generic
   * (actor and/or evidence-type overlap, no transaction or conduct
   * match) — reported for awareness, but these matters never contribute
   * any case entry to this provision: a bare shared actor role (e.g.
   * "promoter") or evidence type is too generic to support attributing
   * this SPECIFIC provision to the entered facts, even though the matter
   * as a whole may still be worth an officer's attention. */
  contextuallyRelatedMatterCount: number;
  /** Raw finding-row count contributing case entries, kept for
   * transparency only — always >= comparableMatterCount, and never the
   * number displayed as the headline "N comparable matters" figure. */
  totalFindingsCount: number;
  /** Of totalFindingsCount, how many carry a case-level
   * attributionStatus of "attributed" (this specific provision link's own
   * justifyingTags positively connect it to the matching facts) vs.
   * "unverified" (empty/unreviewed justifyingTags — cited in the matter,
   * but this specific link's own factual basis has not been
   * independently confirmed). Never conflated: "this provision was cited
   * somewhere in a historically comparable matter" is not the same claim
   * as "this provision was historically invoked for the matching fact". */
  attributedFindingsCount: number;
  unverifiedFindingsCount: number;
  dispositionBreakdown: HistoricalTreatmentDispositionBreakdown;
  /** Case entries grouped by matter, each carrying its own explicit
   * uniform/mixed outcome — the structural fix for noticee-specific
   * outcomes being silently collapsed by a finality-priority pick. */
  matterOutcomes: HistoricalTreatmentMatterOutcome[];
  /** Flat, ungrouped case list — every case entry across every
   * contributing matter, kept for simple iteration/export; matterOutcomes
   * above is the structurally correct view for anything that needs to
   * reason about outcomes per matter. */
  cases: HistoricalTreatmentCaseEntry[];
  /** Cross-reference into the CURRENT precision-engine result for this same
   * provision on the SAME entered scenario — "not_currently_a_candidate"
   * when the provision does not appear in provisionResults,
   * gateBlockedProvisionResults or contraryOnlyProvisionResults at all.
   * This is the field the critical invariant depends on: historical
   * frequency (comparableMatterCount) must never be read as if it were
   * this field. */
  currentCandidateTier: CandidateTier | "not_currently_a_candidate";
  /** Plain-language "why" note combining the historical count with the
   * current-scenario tier, e.g. "Historically considered in N comparable
   * matters. On the present facts, this provision is not presently a
   * candidate: [gate explanation]." */
  currentApplicabilityNote: string;
}

export interface HistoricalTreatmentResult {
  /** Discloses the matter-identity and similarity methodology actually
   * used, so the comparableMatterCount figures are never read as more
   * precise than they are — see historicalTreatment.ts's header comment. */
  matterDedupBasis: string;
  /** How many CASE ENTRIES (not matters) resolved their matterKey via a
   * real orders.matter_id vs. the disclosed case-name fallback — see
   * MatterIdentityBasis. */
  matterIdentityStats: {
    resolvedViaMatterId: number;
    resolvedViaFallback: number;
    /** record_ids of every case entry that used the fallback, for
     * data-quality follow-up — never silently absorbed into an aggregate
     * figure alone. */
    fallbackRecordIds: string[];
  };
  /** Distinct-matter counts across the WHOLE query (every provision
   * combined, matters deduplicated by matterKey), independent of any
   * single provision's own breakdown above — the figures an officer
   * should read for "how many comparable matters did this scenario as a
   * whole surface". weakExcluded matters cleared no bar at all (below the
   * base MIN_FINDING_SCORE-style threshold) and contribute nothing
   * anywhere else in this result. */
  overallMatterCounts: {
    stronglyComparable: number;
    moderatelyComparable: number;
    contextuallyRelated: number;
    weakExcluded: number;
  };
  entries: HistoricalTreatmentProvisionEntry[];
}

export interface AnalysisResult {
  query: ScenarioQuery;
  detectedConceptLabels: string[];
  provisionResults: ProvisionResult[];
  /** Provisions whose ONLY materially-relevant matches were contrary
   * (not-confirmed/withdrawn) findings — see ContraryOnlyProvisionResult.
   * Never merged into provisionResults, which represents "potentially
   * relevant, with supporting precedent"; this is a distinct "warranting
   * caution" signal. */
  contraryOnlyProvisionResults: ContraryOnlyProvisionResult[];
  /** See GateBlockedProvisionResult — provisions a factually-overlapping
   * finding cites but whose own minimum-nexus retrieval prerequisite the
   * entered scenario does not satisfy (e.g. PFUTP/SEBI Act 12A without a
   * securities dealing/deceptive-conduct fact). Never merged into
   * provisionResults. */
  gateBlockedProvisionResults: GateBlockedProvisionResult[];
  globalContraryPrecedents: PrecedentRef[];
  /** Set only when the independent contrary-precedent safeguard actually ran
   * (the scenario contains a broad trigger concept such as preferential
   * allotment or circular fund movement) but found zero negative findings
   * that pass the material-relevance test — i.e. globalContraryPrecedents is
   * empty NOT because the safeguard didn't apply, but because nothing
   * currently on file is materially comparable. Null whenever the safeguard
   * either didn't trigger at all or did find results (shown instead). */
  contraryPrecedentSearchNote: string | null;
  applicableGuardrails: GuardrailNote[];
  hasResults: boolean;
  /** Findings surfaced by Postgres full-text search on the free-text query
   * that the deterministic tag-based engine above did NOT already surface
   * (i.e. not already present in provisionResults or globalContraryPrecedents).
   * A complement, never a replacement, for the deterministic engine — shown
   * separately in the UI as "also worth reviewing", not scored or ranked. */
  fullTextSupplementalFindings: ScenarioFinding[];
  /** Likely-typo spelling corrections applied to the entered free text
   * before concept detection ran (see lib/matching/fuzzyMatch.ts) — a
   * bounded-edit-distance fix against the curated concept vocabulary, never
   * a guess at meaning. Shown to the user for transparency; the matching
   * itself remains fully deterministic and this never changes what is
   * displayed back as the entered scenario. Empty when no correction was
   * needed. */
  semanticAssist: WordCorrection[];
  /** See ScenarioCompleteness — which fact-element categories this scenario
   * touched on at all, versus which it did not mention. */
  completeness: ScenarioCompleteness;
  /** See HistoricalTreatmentResult above — Question B ("how has CFID
   * historically treated materially similar facts?"), architecturally
   * separate from provisionResults (Question A). Never used to decide
   * what appears in provisionResults, and never the other way around. */
  historicalTreatment: HistoricalTreatmentResult;
}
