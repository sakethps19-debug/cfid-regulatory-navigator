import type { ConceptKind } from "@/data/curated/concept-tags";
import type { LegalFunctionCategory } from "@/data/curated/legal-function-classification";
import type { FindingStatus, LegalProvision, ProvisionVersion, ScenarioFinding } from "@/types/domain";
import type { WordCorrection } from "./fuzzyMatch";

/** The officer-facing candidate hierarchy (deterministic-engine completion
 * pass): a provision shown at all is placed in exactly one of these tiers,
 * so a penalty provision, a bare definition, a general principle, a
 * liability-attribution mechanism and a substantive prohibition are never
 * presented as equivalent candidate violations. NOTE (checkpoint
 * correction 2, item 5): this engine never "establishes" a violation — a
 * primary_candidate means an independently retrieved, potentially
 * applicable provision whose own retrieval prerequisite is satisfied, not
 * an adjudicatory conclusion that any contravention has been proven.
 *   - "primary_candidate": the entered facts independently satisfy this
 *     provision's own curated retrieval prerequisite, AND its legal
 *     function is one that can itself anchor a charge (see
 *     PRIMARY_CAPABLE_LEGAL_FUNCTIONS). Checkpoint correction B: an
 *     UNGATED provision (no curated retrieval rule at all) can no longer
 *     reach primary_candidate or related_ancillary purely through a
 *     linked precedent's own conduct-tag overlap with the entered facts —
 *     that produced a "no_independent_retrieval_rule" GoverningProvisionResult
 *     instead (see QuestionAPolarityClass), never a ProvisionResult.
 *   - "related_ancillary": the entered facts satisfy the prerequisite, but
 *     the provision's own legal function (general principle, penalty,
 *     liability-attribution, SEBI power, definition) means it rides on
 *     some OTHER independently retrieved substantive provision rather than
 *     standing on its own.
 *   - "requires_additional_fact": a factually-overlapping historical
 *     finding cites this provision, but either its own factual retrieval
 *     prerequisite or its actor-applicability check is not satisfied by
 *     the entered facts (see GateBlockedProvisionResult).
 *   - "historical_precedent_only": the only precedent found for this
 *     provision on these facts is contrary (not confirmed/withdrawn) — see
 *     ContraryOnlyProvisionResult — or (in the historical-treatment view
 *     only) the provision was considered in comparable CFID matters but is
 *     not a current-scenario candidate at all.
 *   - "governing_relevant" (Question-A polarity correction pass): the
 *     provision's own subject matter/topic IS present in the entered
 *     facts (a factually-overlapping precedent cites it, and — for gated
 *     provisions — the retrieval-topic is satisfied), but NO adverse
 *     conduct-tag was positively matched between the entered facts and
 *     that topic — either because the entered facts affirmatively state
 *     compliance, because the provision is purely definitional/a bare
 *     SEBI power with no adverse predicate of its own, or because the
 *     breach fact is simply unstated. See GoverningProvisionResult and
 *     QuestionAPolarityClass for the finer governing/additional-fact/
 *     contradicted distinction this tier's own entries carry. NEVER
 *     presented as, and structurally distinct from, "this provision may
 *     have been contravened" — a new officer must never confuse "this
 *     provision governs the transaction" with "there may be a violation
 *     of this provision". */
export type CandidateTier = "primary_candidate" | "related_ancillary" | "requires_additional_fact" | "historical_precedent_only" | "governing_relevant";

/** Question-A polarity correction pass: the fine-grained reason a
 * provision landed in GoverningProvisionResult rather than
 * ProvisionResult, distinct from mere prose — an officer-facing consumer
 * (or a test) can branch on this directly.
 *   - "governing_no_breach": the entered facts affirmatively state
 *     COMPLIANCE with this provision's own adverse predicate (e.g. "duly
 *     approved by the Audit Committee" for LODR 23), or the provision has
 *     no adverse predicate of its own at all (a bare definition/threshold,
 *     or a SEBI power/remedial provision) — either way, the provision
 *     governs the subject matter but shows no apparent breach.
 *   - "additional_fact_required": the provision's own topic is present,
 *     and its adverse predicate is genuinely UNKNOWN — neither stated as
 *     a breach nor affirmatively stated as compliant. Silence is never
 *     converted into either a breach or a compliance finding.
 *   - "not_triggered_contradicted": the entered scenario affirmatively
 *     negates the SAME adverse fact this provision's own precedent record
 *     independently carries, even though the provision's own gate/topic
 *     match did not itself require that fact (e.g. PFUTP on a scenario
 *     that names no securities dealing at all, but explicitly rules out
 *     "securities trading, price manipulation... ").
 *   - "no_independent_retrieval_rule" (checkpoint correction B): this
 *     provision has NO curated retrieval rule of its own (see
 *     retrievalRuleForProvision) — whatever overlap exists between the
 *     entered facts and a linked precedent's own conduct tags is real,
 *     but is not an independently-curated legal prerequisite for THIS
 *     provision, so it is never presented as a current-scenario
 *     applicability candidate (ProvisionResult). The provision may still
 *     be genuinely relevant to comparable historical matters — see
 *     Historical Treatment (historicalTreatment.ts), which surfaces it
 *     there independently of this classification.
 *   - "rides_on_unretrieved_primary_dependency" (checkpoint correction C;
 *     renamed from "rides_on_unestablished_violation" in checkpoint
 *     correction 2, item 5, to stop implying this engine adjudicates a
 *     violation as "established"): this provision's own curated retrieval
 *     rule carries dependency: "requires_independently_retrieved_substantive_candidate"
 *     (see requiresIndependentlyRetrievedSubstantivePrimary,
 *     provision-retrieval-rules.ts; checkpoint correction 2, item 4 —
 *     explicit structured metadata, never JavaScript array reference
 *     equality) — a rule whose OWN explanation text states it is shown
 *     once some OTHER substantive provision has independently satisfied
 *     its own retrieval prerequisite, never an independent trigger. The
 *     gate itself only checks that the query's text MENTIONS a qualifying
 *     adverse concept, not that any such OTHER provision actually cleared
 *     its own gate (a real primary_candidate) elsewhere in the same
 *     result. When no primary_candidate exists in the result at all, the
 *     rule's own stated legal basis is unmet, so this provision is never
 *     presented as a current-scenario applicability candidate here — do
 *     not confuse with "additional_fact_required" (topic present, breach
 *     genuinely unknown): here the provision's entire premise is that it
 *     rides on ANOTHER provision, and none was independently retrieved as
 *     a candidate. */
export type QuestionAPolarityClass =
  | "governing_no_breach"
  | "additional_fact_required"
  | "not_triggered_contradicted"
  | "no_independent_retrieval_rule"
  | "rides_on_unretrieved_primary_dependency";

export const QUESTION_A_POLARITY_LABELS: Record<QuestionAPolarityClass, string> = {
  governing_no_breach: "Governing / relevant — no apparent breach on stated facts",
  additional_fact_required: "Additional fact required — breach status unknown",
  not_triggered_contradicted: "Not triggered — contradicted by stated facts",
  no_independent_retrieval_rule: "No independent legal-retrieval rule — not a current-scenario applicability candidate",
  rides_on_unretrieved_primary_dependency: "Rides on another provision — none independently retrieved as a candidate in this result",
};

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
  /** Checkpoint correction 4 (diversion/PFUTP recall + additional-fact
   * architecture): true when the entered scenario's facts satisfy a
   * curated, provision-specific "topic anchor" this provision's own
   * retrieval rule declares (see ProvisionRetrievalRule.topicAnchor /
   * alternateRoutes[].topicAnchor in provision-retrieval-rules.ts) — a
   * narrow concept subset marking genuine statutory engagement with a
   * route the provision's own text expressly contemplates, as distinct
   * from a provision that only appears here because it happens to be
   * co-cited by the same historical finding record as something else. Only
   * ever true for a rule that opts in with a declared topicAnchor; every
   * other gated provision leaves this undefined and is completely
   * unaffected. Never promotes a provision to provisionResults on its own
   * — it only (a) lets a topically-engaged provision surface here even
   * when the live corpus has NO scoring precedent finding linked to it at
   * all, so precision work never destroys legally useful recall, and (b)
   * lets the UI/report surface it ahead of merely-co-cited entries with a
   * SPECIFIC missing-fact note rather than generic boilerplate. */
  topicAnchorSatisfied?: boolean;
}

/** Question-A polarity correction pass: a provision whose SUBJECT MATTER
 * governs the entered facts, but which shows NO apparent breach on those
 * facts — structurally distinct from ProvisionResult ("candidate breach")
 * and from GateBlockedProvisionResult ("additional fact required only",
 * now reserved for genuinely UNKNOWN breach status — see
 * QuestionAPolarityClass). Populated in two ways:
 *   1. A provision that would otherwise have landed in provisionResults
 *      (a factually-overlapping precedent cites it, any gate passed) but
 *      where NO adverse conduct-tag was positively matched between the
 *      entered facts and that precedent — only topic/actor/evidence
 *      overlap. polarityClass is "governing_no_breach" (compliance
 *      affirmatively stated, or the provision has no adverse predicate of
 *      its own — a bare definition or SEBI power) or
 *      "additional_fact_required" (breach status genuinely unstated).
 *   2. A provision that would otherwise have landed in
 *      gateBlockedProvisionResults, but where the entered scenario
 *      affirmatively CONTRADICTS the specific adverse fact this
 *      provision's own retrieval gate requires. polarityClass is always
 *      "not_triggered_contradicted" here.
 * Never merged into provisionResults, and never silently dropped — an
 * officer must be able to see, structurally (not merely from prose), that
 * this provision governs the transaction WITHOUT being told there may be a
 * violation of it. */
export interface GoverningProvisionResult {
  provision: LegalProvision;
  relatedPrecedents: PrecedentRef[];
  polarityClass: QuestionAPolarityClass;
  note: string;
  legalFunction: LegalFunctionCategory;
  /** Always "governing_relevant". */
  candidateTier: CandidateTier;
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
 * historical-treatment correction pass, round 2 — three tiers, strongest
 * first):
 *   - "matter_id": grouped by the canonical orders.matter_id — a real,
 *     curated foreign key (see data.ts's mapOrder) — resolved via the
 *     finding's own orderIds. As of the round-2 remediation migration
 *     (0016_matter_identity_remediation.sql), this covers every finding in
 *     the live corpus; the two weaker tiers below exist for data added
 *     later that has not yet been through that curation step.
 *   - "order_metadata_fallback": no linked order carries a matter_id, but
 *     at least one linked order carries its own curated
 *     orders.normalized_matter_name — an ORDER-level field (never the
 *     finding's own case_name text), used as the grouping key instead.
 *     This is what fixes the concrete round-2 defect: two findings can
 *     carry genuinely different case_name strings (e.g. "... Adicorp
 *     Enterprises)" vs "... Milestone Tradelinks / Rehvar Infrastructure)")
 *     while their linked orders already agree, in the order's OWN curated
 *     metadata, that they concern one investigation.
 *   - "case_name_fallback": the last resort — no linked order at all, or a
 *     linked order with neither matter_id nor normalized_matter_name. A
 *     normalized case-name key, the weakest and most easily wrong of the
 *     three (two different matters sharing a case-name string would
 *     merge), never silently treated as equivalent to the two tiers
 *     above. */
export type MatterIdentityBasis = "matter_id" | "order_metadata_fallback" | "case_name_fallback";

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
  /** The date of the specific linked order orderStageClass was actually
   * derived from (see resolveOrderDate in historicalTreatment.ts) — null
   * when no linked order at that stage carries a structured date on file.
   * Never fabricated, and never derived from a filename or free-text
   * string when no structured orders.order_date exists. */
  orderDate: string | null;
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
  /** Which Order record(s) this finding draws on — see
   * ScenarioFinding.orderIds — so the UI can link this historical case
   * entry to its own Order Detail page(s), not only the external official
   * source. */
  orderIds: string[];
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

/** Historical Treatment correction pass, round 2 (defect #3 — "reduce
 * historical noise without deleting useful awareness"): the officer-facing
 * presentation hierarchy for ONE provision entry, distinct from (but built
 * on top of) HistoricalComparabilityTier. A provision entry is placed in
 * exactly one of these four tiers:
 *   - "fact_attributed": at least one case has attributionStatus
 *     "attributed" (its own justifying_tags positively connect it to the
 *     entered facts) — the strongest section, and the only one an officer
 *     should treat as answering "what was historically INVOKED for this
 *     fact pattern".
 *   - "comparable_unverified": the matter(s) are genuinely
 *     strongly/moderately comparable, but every case's own
 *     justifying_tags are empty/unreviewed — cited in a comparable matter,
 *     factual attribution not yet curated. Secondary/collapsed by default
 *     in the UI, never mixed into the headline "historically invoked"
 *     answer.
 *   - "contextually_related": comparableMatterCount is 0 and
 *     contextuallyRelatedMatterCount > 0 — generic actor/evidence overlap
 *     only. Lower-priority research leads, never headline regulatory
 *     treatment.
 *   - "excluded_different": the provision cleared no bar at all on the
 *     current query (weak_excluded tier, or every case a contradiction
 *     penalty demoted below the comparable bar) — normally never rendered,
 *     kept only in HistoricalTreatmentResult.excludedForAudit for
 *     methodology/audit inspection. */
export type HistoricalPresentationTier = "fact_attributed" | "comparable_unverified" | "contextually_related" | "excluded_different";

export const HISTORICAL_PRESENTATION_TIER_LABELS: Record<HistoricalPresentationTier, string> = {
  fact_attributed: "Provisions attributed to the matching factual issue",
  comparable_unverified: "Comparable matters — provision attribution not yet verified",
  contextually_related: "Contextually related matters (generic overlap only)",
  excluded_different: "Excluded / materially different (audit view only)",
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
  /** Plain-language, deterministically-generated explanation of WHY this
   * matter reached its comparabilityTier — which specific overlapping
   * transaction/conduct tags counted, whether a specificity cap applied
   * (a single generic transaction+conduct pair alone cannot reach
   * "strongly comparable" — see assessComparability in
   * historicalTreatment.ts), and which contradiction (if any) demoted it.
   * Never a single opaque confidence number — every tier decision here is
   * inspectable in this string. */
  comparabilityRationale: string;
  /** A comparable-strength score (the same finding-level factual-overlap
   * score scoreFinding computes), used ONLY to rank matters of equal
   * comparabilityTier against each other — e.g. within one provision, a
   * matter matching BOTH diversion and concealed-financial-misstatement
   * facts ranks ahead of one matching diversion alone. Never crosses tier
   * boundaries: a lower-tier matter is never ranked above a higher-tier
   * one regardless of this score. */
  comparabilityScore: number;
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
  /** See HistoricalPresentationTier — the officer-facing display hierarchy
   * this entry belongs in. Derived purely from this entry's own counts
   * (never a separate judgment call), so it is always consistent with
   * attributedFindingsCount/comparableMatterCount/
   * contextuallyRelatedMatterCount above. */
  presentationTier: HistoricalPresentationTier;
}

export interface HistoricalTreatmentResult {
  /** Discloses the matter-identity and similarity methodology actually
   * used, so the comparableMatterCount figures are never read as more
   * precise than they are — see historicalTreatment.ts's header comment. */
  matterDedupBasis: string;
  /** How many CASE ENTRIES (not matters) resolved their matterKey via each
   * of the three tiers — see MatterIdentityBasis. This is a whole-query
   * figure (identical regardless of which provision is being viewed),
   * since it reflects the CORPUS's own matter-identity data quality, not
   * anything specific to the entered scenario. */
  matterIdentityStats: {
    resolvedViaMatterId: number;
    resolvedViaOrderMetadata: number;
    resolvedViaCaseName: number;
    /** record_ids of every case entry that used the WEAKEST (case-name)
     * tier, for data-quality follow-up — never silently absorbed into an
     * aggregate figure alone. Does NOT include order-metadata-fallback
     * record ids, which are a real (if less-curated) order-level signal,
     * not a bare string guess. */
    caseNameFallbackRecordIds: string[];
  };
  /** Distinct-matter counts across the WHOLE query (every provision
   * combined, matters deduplicated by matterKey), independent of any
   * single provision's own breakdown above — the figures an officer
   * should read for "how many comparable matters did this scenario as a
   * whole surface". weakExcluded matters cleared no bar at all (below the
   * base MIN_FINDING_SCORE-style threshold, or were demoted below it by a
   * contradiction penalty — see assessComparability) and contribute
   * nothing anywhere else in this result except excludedForAudit below. */
  overallMatterCounts: {
    stronglyComparable: number;
    moderatelyComparable: number;
    contextuallyRelated: number;
    weakExcluded: number;
  };
  /** Matters that cleared no comparability bar at all on this query
   * (weak_excluded tier, including any matter a contradiction penalty
   * demoted all the way down) — normally never rendered as part of the
   * historical-treatment answer (see HistoricalPresentationTier
   * "excluded_different"), kept here ONLY for methodology/audit
   * inspection, e.g. "why isn't matter X showing up here". */
  excludedForAudit: { matterKey: string; caseName: string; reason: string }[];
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
  /** Question-A polarity correction pass: provisions whose subject matter
   * governs the entered facts but show no apparent breach — either because
   * compliance is affirmatively stated, the provision has no adverse
   * predicate of its own (a bare definition or SEBI power), or the breach
   * fact is genuinely unstated. See GoverningProvisionResult and
   * QuestionAPolarityClass. Never merged into provisionResults — the
   * "candidate breach" list requires a positively-matched adverse
   * conduct-tag; this is the structurally separate "topically relevant,
   * no apparent breach" list. */
  governingProvisionResults: GoverningProvisionResult[];
  /** Question-A polarity correction pass: provisions that would otherwise
   * have landed in gateBlockedProvisionResults ("additional fact
   * required"), but where the entered scenario affirmatively CONTRADICTS
   * the specific adverse fact this provision's own retrieval gate
   * requires (polarityClass is always "not_triggered_contradicted") —
   * kept structurally separate from gateBlockedProvisionResults so
   * "breach status unknown" (silence) is never conflated with "breach
   * status affirmatively ruled out" (contradiction). See item 7 of the
   * Question-A polarity correction pass: silence must never be converted
   * into compliance, and compliance must never be read as mere silence. */
  contradictedProvisionResults: GoverningProvisionResult[];
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
