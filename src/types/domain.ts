// CFID Regulatory Navigator — core domain types
// These types describe the structured data generated from the source
// workbooks: CFID_Precedent_Library_Pilot.xlsx (deep scenario-finding
// analysis for 3 orders), Verified_CFID_Order_Links.xlsx (the authoritative
// list of confirmed CFID orders), and Residual_Order_Links.xlsx (an
// exclusion / pending-link register — never a source of precedent). The
// original Links.xlsx compilation is no longer used. Nothing in this file
// invents facts; it only shapes what the workbooks already contain.

// "Upheld"/"Not upheld" were dropped in favor of final-order language at the
// user's request, after live-demo feedback that "upheld" read as this tool
// passing its own legal judgment rather than describing what the order
// itself records. The underlying database enum (finding_status: 'upheld',
// 'not_upheld', etc.) is unchanged — only this display type and its label
// mapping (FINDING_STATUS_LABELS in data.ts) changed.
export type FindingStatus =
  | "Alleged"
  | "Prima facie"
  | "Confirmed at interim"
  | "Confirmed in Final Order"
  | "Partly Confirmed in Final Order"
  | "Not Confirmed in Final Order"
  | "Withdrawn"
  | "Inconclusive"
  | "Procedural observation";

/** Publication/quarantine lifecycle for a scenario finding, independent of
 * findingStatus (the underlying allegation's own procedural outcome) and
 * the verification flags below (whether the finding's data was checked
 * against the source order). Draft, Quarantined and Withdrawn findings are
 * excluded from the Scenario Analyzer's matching engine entirely; Published
 * with warning is included but must carry a visible caution; Published to
 * search is the ordinary state. See supabase/migrations/0015_publication_status.sql. */
export type PublicationStatus =
  | "Draft"
  | "Quarantined"
  | "Published to search"
  | "Published with warning"
  | "Withdrawn";

export type OrderStage =
  | "Interim order"
  | "Interim order cum show cause notice"
  | "Confirmatory order"
  | "Revocation order"
  | "Final order"
  | "Adjudication order"
  | "Settlement order"
  | "Other";

/** Where an order currently stands in the processing pipeline (see the
 * Admin Processing Dashboard). Mirrors the DB's processing_stage enum.
 *
 * "awaiting_retrieval" and "retrieval_failed" are deliberately distinct and
 * must never be conflated: awaiting_retrieval means no retrieval attempt has
 * been made or recorded for this specific order yet (the normal starting
 * state for most of the register); retrieval_failed means a genuine,
 * individually recorded attempt was made and it failed. An order is never
 * moved to retrieval_failed without an actual per-order attempt, a stored
 * failure reason, and a timestamp. See src/lib/processingStages.ts for the
 * canonical display order and labels. */
export type ProcessingStage =
  | "indexed"
  | "awaiting_retrieval"
  | "retrieval_attempted"
  | "retrieval_failed"
  | "downloaded"
  | "text_extracted"
  | "scenario_findings_extracted"
  | "citations_checked"
  | "legally_reviewed"
  | "needs_manual_review";

/** How CFID origin was established for this order. Absence of "CFID" in the
 * order number is NOT by itself grounds for exclusion — an adjudication
 * order in particular may lack the tag yet still arise from a CFID
 * investigation, so this is tracked independently of cfidVerified. */
export type CfidVerificationBasis =
  | "cfid_tag_in_order_number"
  | "cfid_origin_established_from_official_order"
  | "related_to_verified_cfid_parent_matter"
  | "confirmed_by_authorised_cfid_officer"
  | "needs_manual_verification"
  | "not_cfid";

export interface Order {
  id: string; // DB uuid
  caseName: string;
  orderStage: OrderStage;
  orderDate: string | null; // ISO date — null until the order is retrieved and dated
  orderNumber: string | null;
  authority: string | null;
  noticeesCount: number;
  officialUrl: string;
  /** Whether the order's own identifier/number contains a "CFID" tag —
   * literally that fact, and nothing more. This is NOT the authoritative
   * verification signal and must never be equated with "this order is
   * verified": an order can be genuinely CFID-verified via
   * cfidVerificationBasis even when this is false (e.g. an adjudication
   * order confirmed by an authorised CFID officer, or one established from
   * the official order's own contents). Use cfidVerificationBasis, not
   * this field, to determine and display verification status. */
  cfidVerified: boolean;
  cfidVerificationBasis: CfidVerificationBasis;
  proceduralStatus: string; // human-readable label derived from processingStage
  processingStage: ProcessingStage;
  retrievalStatus: string;
  retrievalFailureReason: string | null;
  scopeNote: string | null;
  /** Matter this order belongs to, when a grouping is already known via
   * order_relationships — never inferred from company/matter-name alone. */
  matterId: string | null;
  /** Exact title as it appears on the official order document. Left null
   * until actually captured from the source — never derived from caseName. */
  officialOrderTitle: string | null;
  /** Consistent name used for grouping/search across an order's siblings. */
  normalizedMatterName: string | null;
}

/** A Matter is distinct from an Order: one matter/investigation can span
 * several individual orders (interim, confirmatory, final, adjudication,
 * etc.). Populated only from relationships already established via
 * order_relationships — never a guessed grouping. */
export interface Matter {
  id: string;
  normalizedMatterName: string;
  description: string | null;
}

export interface ScenarioFinding {
  recordId: string; // e.g. "REL-01", "SSSL-03"
  caseName: string;
  orderIds: string[]; // which Order records this finding draws on (interim/final)
  category: string | null;
  scenarioTitle: string;
  factualPattern: string;
  /** The specific legal allegation/charge text (scenario_findings.
   * allegation_text) — distinct from factualPattern (what happened) and
   * provisionsConsideredRaw (which provisions were cited): this is what the
   * order alleges was done wrong. Null where not yet transcribed. Optional
   * (rather than a plain string | null) so the many existing test fixtures
   * built before this field existed remain valid without updating all of
   * them — same reasoning as provisionLinks[].relationship. */
  allegationText?: string | null;
  provisionsConsideredRaw: string | null; // original text from workbook
  provisionIds: string[]; // parsed canonical provision ids, instrument-qualified — every provision this finding cites, for display/listing purposes
  /** Same links as provisionIds, but each carries justifyingTags: the
   * specific concept-tag ids (see concept-tags.ts) that justify THIS
   * particular provision for THIS finding. An empty array means the link
   * is universal — it applies whenever any of the finding's own tags match
   * a query. A non-empty array narrows it: the matching engine only
   * surfaces this provision via this finding when the query's detected
   * concepts intersect justifyingTags. Used at query time instead of
   * provisionIds so that a multi-issue finding (e.g. one bundling
   * fictitious sales together with an unrelated Compliance Officer
   * vacancy) doesn't surface a narrow, topically-specific provision for a
   * query that only matched on the OTHER, unrelated conduct.
   *
   * relationship (from finding_provisions.relationship) says how THIS
   * provision specifically was treated within this finding: "alleged"
   * means it was cited/considered but is not itself the basis of the
   * finding's disposition; "upheld"/"not_upheld" means this particular
   * provision was the one the order's disposition actually turned on.
   * A single finding routinely cites several provisions where only one or
   * two are "upheld" and the rest are contextual "alleged" citations, so
   * this is a per-provision distinction, not the same thing as the
   * finding's overall findingStatus. Optional because many existing test
   * fixtures construct provisionLinks without it. */
  provisionLinks: { provisionId: string; justifyingTags: string[]; relationship?: string }[];
  noticeeActors: string[];
  findingStatus: FindingStatus;
  interimParagraphReferences: string | null;
  finalParagraphReferences: string | null;
  qualification: string | null;
  officialSourceUrl: string;
  // curated fact-element tags (added by the pilot's curation layer, not the
  // workbook itself) used only for deterministic keyword/concept matching
  transactionTypes: string[];
  actorRoles: string[];
  evidenceTypes: string[];
  allegedConduct: string[];
  /** Genuine outstanding evidence/facts relevant to comparing this precedent
   * against a NEW scenario — never the precedent's own historical outcome.
   * See precedentOutcomeNote for that. */
  evidentiaryGaps: string[];
  /** How THIS precedent's own allegation was resolved (e.g. "this allegation
   * was resolved in the final order") — a fact about the cited precedent's
   * history, not about the user's present scenario, and never merged into
   * evidentiaryGaps or any missing-facts checklist. Null when not
   * applicable/not recorded. */
  precedentOutcomeNote: string | null;
  // computed at query time: concepts present in this finding's own tags that
  // did NOT match the query scenario — used to show "ingredients not
  // established" for a candidate precedent (see the matching engine).
  ingredientsNotEstablished: string[];
  // Independent review flags. A finding is never described as "verified"
  // merely because it was script-generated — each of these is tracked and
  // set separately; a finding with any flag false still "Needs manual
  // review" regardless of its findingStatus.
  sourceDocumentVerified: boolean;
  paragraphCitationVerified: boolean;
  findingStatusVerified: boolean;
  provisionMappingVerified: boolean;
  noticeeMappingVerified: boolean;
  humanLegalReviewCompleted: boolean;
  publicationStatus: PublicationStatus;
}

export interface LegalProvision {
  id: string; // canonical id, e.g. "PFUTP-4-2-e", "LODR-4-2-e-i"
  instrument: string;
  instrumentId?: string;
  issuingAuthority?: string;
  provisionNumber: string;
  subject: string | null;
  currentTextVerificationStatus: "Requires verification" | "Order-cited text only" | "Officially verified";
  officialSource: string | null;
  ordersConsidered: string[]; // case names
  treatmentInPilotOrders: string;
  lawLibraryNote: string | null;
}

export interface ProvisionVersion {
  id: string;
  provisionId: string; // legal_provisions.canonical_id
  versionLabel: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  exactText: string | null;
  sourceUrl: string | null;
  status: "requires_verification" | "order_cited_text_only" | "officially_verified";
}

export interface LegalTest {
  id: string;
  provisionOrIssue: string;
  workingPrinciple: string;
  paragraphAnchors: string | null;
  implementationGuardrail: string;
}

export interface DirectionOutcome {
  id: string;
  caseName: string;
  stage: string;
  directionOrOutcome: string;
  paragraphReference: string | null;
  officialSourceUrl: string;
}

// ----- Verified CFID Order Links.xlsx (authoritative order list) -----

export type VerifiedOrderAnalysisStatus = "deep_analyzed" | "verified_pending_analysis";

export interface VerifiedCfidOrderRow {
  id: string;
  caseName: string;
  /** Order identifier as given in the source workbook, verbatim. */
  orderIdentifier: string;
  officialUrl: string;
  /** True if orderIdentifier contains "CFID" — checked defensively even though every row in this workbook is expected to. */
  cfidConfirmed: boolean;
  analysisStatus: VerifiedOrderAnalysisStatus;
  /** Order.id values this row corresponds to, when analysisStatus is "deep_analyzed". */
  linkedOrderIds: string[];
}

// ----- Residual_Order_Links.xlsx (exclusion / pending-link register only) -----

export type ResidualEntryStatus = "pending_link" | "duplicate_of_verified" | "not_cfid";

export interface ResidualOrderRow {
  id: string;
  /** Case name, or "Case name — order identifier" when a link/order number was captured before exclusion. */
  caseOrOrderName: string;
  orderIdentifier: string | null;
  officialUrl: string | null;
  /** Verbatim reason text from the workbook. */
  reason: string;
  status: ResidualEntryStatus;
}


export type OrderRelationshipType =
  | "interim_to_final"
  | "interim_to_confirmatory"
  | "confirmatory_to_revocation"
  | "corrigendum_to"
  | "related_matter"
  | "same_matter"
  | "precedes"
  | "confirms"
  | "modifies"
  | "revokes"
  | "finalises"
  | "adjudication_arising_from"
  | "same_investigation"
  | "different_noticee_group";

export interface OrderRelationship {
  id: string;
  fromOrderId: string;
  fromCaseName: string;
  toOrderId: string;
  toCaseName: string;
  relationshipType: OrderRelationshipType;
  note: string | null;
}

export interface ValidationIssue {
  id: string;
  orderId: string | null;
  orderCaseName: string | null;
  findingId: string | null;
  /** scenario_findings.record_id (e.g. "SSSL-03") for findingId, resolved
   * for display — never itself the join key, findingId (the raw uuid)
   * remains that. Null when findingId is null or resolution failed. */
  findingRecordId: string | null;
  issueType: string;
  severity: "error" | "warning" | "info";
  description: string;
  sourceRowRef: string | null;
  resolved: boolean;
  createdAt: string;
}

/** An audit-trail entry for a curated-data correction (a conduct tag fixed,
 * a transaction type restored, etc.) applied directly against the
 * database. See supabase/migrations/0012_data_change_log.sql. */
export interface DataChangeLogEntry {
  id: string;
  tableName: string;
  recordRef: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface LegalInstrument {
  id: string;
  name: string;
  issuingAuthority: string;
  officialSourceUrl: string | null;
}

export interface ProcessingMetrics {
  totalIndexed: number;

  // ---- Link-verification stages (deliberately separate — "official link
  // verified" is never a single blanket claim). Each is a distinct, honest
  // checkpoint; a count here does NOT imply the later stages have happened. ----
  /** Orders with a non-null official SEBI URL on file. */
  officialUrlSupplied: number;
  /** Of those, how many are a well-formed http(s) URL (computed live, not
   * merely asserted at import time). */
  urlFormatValidated: number;
  /** Orders whose supplied order identifier/number contains a "CFID" tag —
   * a claim about the *record*, not about the document itself. */
  cfidIdentifierPresent: number;
  /** Orders whose number does NOT contain "CFID" — tracked, never silently
   * dropped; per cfid_verification_basis, absence alone is not exclusionary. */
  cfidVerificationFailures: number;
  /** Orders whose SEBI order document was actually opened/retrieved
   * (retrieval_status = success) — this is the only stage that reflects a
   * real, completed retrieval, not merely a supplied/validated link. */
  documentActuallyRetrieved: number;
  /** Of those, orders whose metadata (date, order number, authority) was
   * confirmed directly from the opened document itself, not just claimed by
   * the source workbook. */
  documentMetadataConfirmed: number;
  /** Orders with a recorded source_documents row (a formal retrieval audit
   * entry with checksum/timestamp) — kept separate because even a
   * documentActuallyRetrieved order may not yet have this formal record. */
  completeDocumentOnFile: number;

  // ---- Processing-pipeline stages ----
  /** processing_stage = awaiting_retrieval: indexed and CFID-tag-checked,
   * but no retrieval attempt has been made or recorded for this specific
   * order yet. This is NOT a failure — see retrievalFailures below. */
  awaitingRetrieval: number;
  /** processing_stage = retrieval_failed: a genuine, individually recorded
   * retrieval attempt was made for this specific order and it failed
   * (distinct from awaitingRetrieval, where no attempt has been made). */
  retrievalFailures: number;
  /** processing_stage = citations_checked OR legally_reviewed — i.e.
   * isDeepAnalyzed(): the order has actually been opened, read, and broken
   * down into scenario findings with paragraph citations. Kept separate
   * from fullyExtracted (legal sign-off) since those are two different,
   * sequential facts, not one. */
  deepAnalyzedCount: number;
  /** processing_stage = legally_reviewed only: a CFID officer has signed
   * off on the AI-assisted analysis. This is the separate, further step
   * after deep analysis, not a synonym for it. */
  fullyExtracted: number;
  needsManualReview: number;
  /** Orders in a genuinely early/mid pipeline stage (retrieval_attempted,
   * downloaded, text_extracted, scenario_findings_extracted) — i.e. NOT
   * yet deep-analyzed. Deliberately excludes citations_checked, which
   * counts as deep-analyzed (see deepAnalyzedCount), so this bucket never
   * lumps a complete analysis in with one barely started. */
  midPipelineCount: number;

  residualPendingLink: number;
  residualDuplicates: number;
  residualNotCfid: number;
  scenarioFindingsCreated: number;
  legalProvisionsIdentified: number;
  officialLawTextsVerified: number;

  // ---- Corpus-vs-matching-coverage transparency: an indexed order is not
  // necessarily one that actually participates in Scenario Analyzer
  // retrieval, and a searchable finding is not necessarily one a human has
  // legally reviewed. Both are easy to conflate with the numbers above if
  // not shown explicitly. ----
  /** Distinct orders referenced by at least one scenario_findings row (via
   * either order_id or final_order_id) — i.e. orders that actually
   * contribute to Scenario Analyzer retrieval, as opposed to merely being
   * indexed in the case register. Always <= totalIndexed. */
  ordersContributingStructuredFindings: number;
  /** scenario_findings rows not excluded from ordinary retrieval by the
   * publication lifecycle (publication_status not in Draft/Quarantined/
   * Withdrawn) — mirrors EXCLUDED_PUBLICATION_STATUSES in engine.ts. */
  searchableFindingsCount: number;
  /** scenario_findings.human_legal_review_completed = true — a per-finding
   * fact, distinct from fullyExtracted above (an order-level processing
   * stage). A finding can be searchable long before it is legally reviewed;
   * this is the count that answers "has a human actually signed off on
   * this specific finding", not "has this order's document-pipeline work
   * completed". */
  findingsHumanLegallyReviewed: number;
}

export interface ValidationReport {
  generatedAt: string;
  importedOrders: number;
  scenarioFindings: number;
  invalidOrMissingUrls: string[];
  missingParagraphReferences: string[];
  unknownProvisions: string[];
  duplicateRecords: string[];
  conflictingFindings: string[];
  rowsRequiringManualReview: number;
  verifiedCfidOrderRows: number;
  verifiedCasesPendingAnalysis: number;
  residualPendingLink: number;
  residualDuplicates: number;
  residualNotCfid: number;
}
