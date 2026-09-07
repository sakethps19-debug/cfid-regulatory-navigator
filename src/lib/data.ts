import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  DataChangeLogEntry,
  DirectionOutcome,
  FindingStatus,
  LegalInstrument,
  LegalProvision,
  LegalTest,
  Matter,
  Order,
  OrderRelationship,
  OrderStage,
  ProcessingMetrics,
  ProcessingStage,
  ProvisionVersion,
  PublicationStatus,
  ResidualOrderRow,
  ScenarioFinding,
  StructuredFindingCoverageGap,
  ValidationIssue,
  VerifiedCfidOrderRow,
} from "@/types/domain";
import type { Database } from "@/types/database";
import { isDeepAnalyzed, PROCESSING_STAGE_LABELS } from "@/lib/processingStages";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ScenarioFindingRow = Database["public"]["Tables"]["scenario_findings"]["Row"];
type LegalProvisionRow = Database["public"]["Tables"]["legal_provisions"]["Row"];
type LegalTestRow = Database["public"]["Tables"]["legal_tests"]["Row"];
type OrderDirectionRow = Database["public"]["Tables"]["order_directions"]["Row"];
type ResidualRegisterRow = Database["public"]["Tables"]["residual_register"]["Row"];
type ProvisionVersionRow = Database["public"]["Tables"]["provision_versions"]["Row"];
type LegalInstrumentRow = Database["public"]["Tables"]["legal_instruments"]["Row"];
type ValidationIssueRow = Database["public"]["Tables"]["validation_issues"]["Row"];
type MatterRow = Database["public"]["Tables"]["matters"]["Row"];

const ORDER_STAGE_LABELS: Record<OrderRow["order_type"], OrderStage> = {
  interim_order: "Interim order",
  interim_cum_show_cause_notice: "Interim order cum show cause notice",
  confirmatory_order: "Confirmatory order",
  revocation_order: "Revocation order",
  final_order: "Final order",
  adjudication_order: "Adjudication order",
  settlement_order: "Settlement order",
  other: "Other",
};

const FINDING_STATUS_LABELS: Record<ScenarioFindingRow["finding_status"], FindingStatus> = {
  alleged: "Alleged",
  prima_facie: "Prima facie",
  confirmed_at_interim: "Confirmed at interim",
  upheld: "Confirmed in Final Order",
  partly_upheld: "Partly Confirmed in Final Order",
  not_upheld: "Not Confirmed in Final Order",
  withdrawn: "Withdrawn",
  inconclusive: "Inconclusive",
  procedural_observation: "Procedural observation",
};

const PUBLICATION_STATUS_LABELS: Record<ScenarioFindingRow["publication_status"], PublicationStatus> = {
  draft: "Draft",
  quarantined: "Quarantined",
  published_to_search: "Published to search",
  published_with_warning: "Published with warning",
  withdrawn: "Withdrawn",
};

const VERIFICATION_STATUS_LABELS: Record<LegalProvisionRow["current_text_verification_status"], LegalProvision["currentTextVerificationStatus"]> = {
  requires_verification: "Requires verification",
  order_cited_text_only: "Order-cited text only",
  officially_verified: "Officially verified",
};

function mapOrder(row: OrderRow, noticeesCount: number): Order {
  return {
    id: row.id,
    caseName: row.case_name,
    orderStage: ORDER_STAGE_LABELS[row.order_type] ?? "Other",
    orderDate: row.order_date,
    orderNumber: row.order_number,
    authority: row.passing_authority,
    noticeesCount,
    officialUrl: row.official_url,
    cfidVerified: row.cfid_verified,
    cfidVerificationBasis: row.cfid_verification_basis,
    proceduralStatus: PROCESSING_STAGE_LABELS[row.processing_stage as ProcessingStage] ?? row.processing_stage,
    processingStage: row.processing_stage as ProcessingStage,
    retrievalStatus: row.retrieval_status,
    retrievalFailureReason: row.retrieval_failure_reason,
    scopeNote: row.scope_note,
    matterId: row.matter_id,
    officialOrderTitle: row.official_order_title,
    normalizedMatterName: row.normalized_matter_name,
  };
}

function mapFinding(
  row: ScenarioFindingRow,
  provisionLinks: { provisionId: string; justifyingTags: string[]; relationship?: string }[],
  orderIds: string[]
): ScenarioFinding {
  return {
    recordId: row.record_id,
    caseName: row.case_name,
    orderIds,
    category: row.category,
    scenarioTitle: row.scenario_title,
    factualPattern: row.factual_pattern,
    allegationText: row.allegation_text,
    provisionsConsideredRaw: row.provisions_considered_raw,
    provisionIds: provisionLinks.map((l) => l.provisionId),
    provisionLinks,
    noticeeActors: row.noticee_actor_names,
    findingStatus: FINDING_STATUS_LABELS[row.finding_status] ?? "Alleged",
    interimParagraphReferences: row.interim_paragraph_references,
    finalParagraphReferences: row.final_paragraph_references,
    qualification: row.qualification,
    officialSourceUrl: row.official_source_url,
    transactionTypes: row.transaction_types,
    actorRoles: row.actor_roles,
    evidenceTypes: row.evidence_types,
    allegedConduct: row.alleged_conduct,
    evidentiaryGaps: row.evidentiary_gaps,
    precedentOutcomeNote: row.precedent_outcome_note,
    ingredientsNotEstablished: row.ingredients_not_established,
    sourceDocumentVerified: row.source_document_verified,
    paragraphCitationVerified: row.paragraph_citation_verified,
    findingStatusVerified: row.finding_status_verified,
    provisionMappingVerified: row.provision_mapping_verified,
    noticeeMappingVerified: row.noticee_mapping_verified,
    humanLegalReviewCompleted: row.human_legal_review_completed,
    publicationStatus: PUBLICATION_STATUS_LABELS[row.publication_status] ?? "Draft",
  };
}

function mapLegalTest(row: LegalTestRow): LegalTest {
  return {
    id: row.id,
    provisionOrIssue: row.provision_or_issue,
    workingPrinciple: row.working_principle,
    paragraphAnchors: row.paragraph_anchors,
    implementationGuardrail: row.implementation_guardrail,
  };
}

function mapDirection(row: OrderDirectionRow): DirectionOutcome {
  return {
    id: row.id,
    caseName: row.case_name,
    stage: row.stage,
    directionOrOutcome: row.direction_or_outcome,
    paragraphReference: row.paragraph_reference,
    officialSourceUrl: row.official_source_url,
  };
}

function mapMatter(row: MatterRow): Matter {
  return {
    id: row.id,
    normalizedMatterName: row.normalized_matter_name,
    description: row.description,
  };
}

function mapResidual(row: ResidualRegisterRow): ResidualOrderRow {
  return {
    id: row.id,
    caseOrOrderName: row.case_or_order_name,
    orderIdentifier: row.order_identifier,
    officialUrl: row.official_url,
    reason: row.reason,
    status: row.status as ResidualOrderRow["status"],
  };
}

/** Fetches every order plus its noticee count in two queries (rather than
 * N+1), and returns them mapped to the app's Order shape. */
export async function getOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const [{ data: orderRows, error: ordersError }, { data: noticeeRows, error: noticeesError }] = await Promise.all([
    supabase.from("orders").select("*").order("case_name", { ascending: true }),
    supabase.from("order_noticees").select("order_id"),
  ]);
  if (ordersError) throw ordersError;
  if (noticeesError) throw noticeesError;

  const counts = new Map<string, number>();
  for (const row of noticeeRows ?? []) {
    counts.set(row.order_id, (counts.get(row.order_id) ?? 0) + 1);
  }
  return (orderRows ?? []).map((row) => mapOrder(row, counts.get(row.id) ?? 0));
}

/** Matters already established via order_relationships — never a guessed
 * grouping by company/matter name alone. */
export async function getMatters(): Promise<Matter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("matters").select("*").order("normalized_matter_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMatter);
}

/** All orders belonging to one matter — the "Individual orders" level of the
 * Matter → Orders → Noticees → Allegations → Provisions → Findings hierarchy. */
export async function ordersForMatter(matterId: string): Promise<Order[]> {
  const all = await getOrders();
  return all.filter((o) => o.matterId === matterId);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOrderById(id: string): Promise<Order | undefined> {
  // orders.id is a uuid column — a non-UUID path segment (a typo, a stale
  // link, someone editing the URL) would otherwise reach Postgres as an
  // invalid-cast error and surface as an unhandled 500, instead of the
  // clean 404 a not-found order gets everywhere else.
  if (!UUID_PATTERN.test(id)) return undefined;
  const supabase = await createClient();
  const [{ data: row, error }, { count }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_noticees").select("*", { count: "exact", head: true }).eq("order_id", id),
  ]);
  if (error) throw error;
  if (!row) return undefined;
  return mapOrder(row, count ?? 0);
}

/** Fetches all scenario findings together with their linked provision
 * canonical ids (via finding_provisions), in three bulk queries. */
export async function getScenarioFindings(): Promise<ScenarioFinding[]> {
  const supabase = await createClient();
  const [{ data: findingRows, error: findingsError }, { data: linkRows, error: linksError }] = await Promise.all([
    supabase.from("scenario_findings").select("*").order("record_id", { ascending: true }),
    supabase
      .from("finding_provisions")
      .select("finding_id, provision_id, justifying_tags, relationship, legal_provisions(canonical_id)"),
  ]);
  if (findingsError) throw findingsError;
  if (linksError) throw linksError;

  const provisionLinksByFinding = new Map<string, { provisionId: string; justifyingTags: string[]; relationship?: string }[]>();
  for (const link of linkRows ?? []) {
    const row = link as {
      finding_id: string;
      justifying_tags: string[] | null;
      relationship: string | null;
      legal_provisions: { canonical_id: string } | null;
    };
    const canonicalId = row.legal_provisions?.canonical_id;
    if (!canonicalId) continue;
    const list = provisionLinksByFinding.get(row.finding_id) ?? [];
    list.push({ provisionId: canonicalId, justifyingTags: row.justifying_tags ?? [], relationship: row.relationship ?? undefined });
    provisionLinksByFinding.set(row.finding_id, list);
  }

  return (findingRows ?? []).map((row) => {
    const orderIds = [row.order_id, row.final_order_id].filter((v): v is string => Boolean(v));
    return mapFinding(row, provisionLinksByFinding.get(row.id) ?? [], orderIds);
  });
}

export async function getProvisions(): Promise<LegalProvision[]> {
  const supabase = await createClient();
  const [{ data: provisionRows, error: provisionsError }, findings] = await Promise.all([
    supabase.from("legal_provisions").select("*, legal_instruments(id, name, issuing_authority)").order("canonical_id", { ascending: true }),
    getScenarioFindings(),
  ]);
  if (provisionsError) throw provisionsError;

  const casesByProvision = new Map<string, Set<string>>();
  for (const finding of findings) {
    for (const provisionId of finding.provisionIds) {
      const set = casesByProvision.get(provisionId) ?? new Set<string>();
      set.add(finding.caseName);
      casesByProvision.set(provisionId, set);
    }
  }

  return (provisionRows ?? []).map((row) => {
    const instrumentRow = (row as { legal_instruments: { id: string; name: string; issuing_authority: string } | null }).legal_instruments;
    const casesConsidered = [...(casesByProvision.get(row.canonical_id) ?? [])];
    const findingsCount = findings.filter((f) => f.provisionIds.includes(row.canonical_id)).length;
    return {
      id: row.canonical_id,
      instrument: instrumentRow?.name ?? "",
      instrumentId: instrumentRow?.id ?? "",
      issuingAuthority: instrumentRow?.issuing_authority ?? "",
      provisionNumber: row.provision_number,
      subject: row.subject,
      currentTextVerificationStatus: VERIFICATION_STATUS_LABELS[row.current_text_verification_status] ?? "Requires verification",
      officialSource: row.official_source_url,
      ordersConsidered: casesConsidered,
      treatmentInPilotOrders:
        findingsCount > 0
          ? `Cited in ${findingsCount} scenario finding${findingsCount === 1 ? "" : "s"} across ${casesConsidered.length} order${casesConsidered.length === 1 ? "" : "s"}: ${casesConsidered.join(", ")}.`
          : "Not yet cited in any deep-analyzed scenario finding.",
      lawLibraryNote: row.law_library_note,
    };
  });
}

export async function getProvisionById(id: string): Promise<LegalProvision | undefined> {
  const all = await getProvisions();
  return all.find((p) => p.id === id);
}

export async function getLegalTests(): Promise<LegalTest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("legal_tests").select("*").order("provision_or_issue", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapLegalTest);
}

export async function getDirections(): Promise<DirectionOutcome[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("order_directions").select("*").order("case_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapDirection);
}

export async function directionsForCase(caseName: string): Promise<DirectionOutcome[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("order_directions").select("*").eq("case_name", caseName);
  if (error) throw error;
  return (data ?? []).map(mapDirection);
}

export async function findingsForProvision(provisionId: string): Promise<ScenarioFinding[]> {
  const all = await getScenarioFindings();
  return all.filter((f) => f.provisionIds.includes(provisionId));
}

export async function getResidualOrders(): Promise<ResidualOrderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("residual_register").select("*").order("case_or_order_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapResidual);
}

/** The full 89-order universe, shaped for the "Orders Awaiting Analysis" /
 * Case Library views: every row from `orders`, marked deep_analyzed once its
 * processing has reached citations_checked (broken down into scenario
 * findings with paragraph citations) or beyond, verified_pending_analysis
 * otherwise. legally_reviewed is a further, distinct stage reserved for
 * actual human/CFID-officer sign-off and is not required for deep_analyzed —
 * see src/lib/processingStages.ts. */
export async function getVerifiedCfidOrders(): Promise<VerifiedCfidOrderRow[]> {
  const orders = await getOrders();
  return orders.map((o) => ({
    id: o.id,
    caseName: o.caseName,
    orderIdentifier: o.orderNumber ?? "",
    officialUrl: o.officialUrl,
    cfidConfirmed: o.cfidVerified,
    analysisStatus: isDeepAnalyzed(o.processingStage) ? "deep_analyzed" : "verified_pending_analysis",
    linkedOrderIds: isDeepAnalyzed(o.processingStage) ? [o.id] : [],
  }));
}


export interface ImportMeta {
  generatedAt: string;
  sourceFiles: string[];
  note: string;
}

export async function getImportMeta(): Promise<ImportMeta> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("processing_runs")
    .select("*")
    .order("finished_at", { ascending: false });
  if (error) throw error;
  const runs = data ?? [];
  const generatedAt = runs[0]?.finished_at ?? new Date().toISOString();
  return {
    generatedAt,
    sourceFiles: runs.map((r) => r.run_type),
    note: runs.map((r) => r.summary).filter(Boolean).join(" "),
  };
}

function mapProvisionVersion(row: ProvisionVersionRow, provisionCanonicalId: string): ProvisionVersion {
  return {
    id: row.id,
    provisionId: provisionCanonicalId,
    versionLabel: row.version_label,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    exactText: row.exact_text,
    sourceUrl: row.source_url,
    status:
      row.status === "officially_verified" || row.status === "order_cited_text_only"
        ? row.status
        : "requires_verification",
  };
}

/** All recorded versions of a provision's text, in effective-date order.
 * Used to surface the historically-applicable version (rather than
 * assuming current text applied) — see the matching engine and the Law
 * Library. Every provision in this pilot currently has exactly one
 * unverified placeholder version; the shape supports adding verified,
 * dated versions later without a schema change. */
export async function getProvisionVersions(provisionCanonicalId: string): Promise<ProvisionVersion[]> {
  const supabase = await createClient();
  const { data: provisionRow, error: provisionError } = await supabase
    .from("legal_provisions")
    .select("id")
    .eq("canonical_id", provisionCanonicalId)
    .maybeSingle();
  if (provisionError) throw provisionError;
  if (!provisionRow) return [];

  const { data, error } = await supabase
    .from("provision_versions")
    .select("*")
    .eq("provision_id", provisionRow.id)
    .order("effective_from", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapProvisionVersion(row, provisionCanonicalId));
}

/** All provision versions, grouped by the provision's canonical id, in a
 * single bulk query — for callers (like the matching engine) that need
 * every provision's version history at once rather than one at a time. */
export async function getProvisionVersionsByProvisionId(): Promise<Map<string, ProvisionVersion[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("provision_versions")
    .select("*, legal_provisions(canonical_id)")
    .order("effective_from", { ascending: true, nullsFirst: false });
  if (error) throw error;

  const byProvision = new Map<string, ProvisionVersion[]>();
  for (const row of data ?? []) {
    const canonicalId = (row as { legal_provisions: { canonical_id: string } | null }).legal_provisions?.canonical_id;
    if (!canonicalId) continue;
    const list = byProvision.get(canonicalId) ?? [];
    list.push(mapProvisionVersion(row, canonicalId));
    byProvision.set(canonicalId, list);
  }
  return byProvision;
}

/** Words that appear in over half of all scenario_findings' factual text
 * (measured via ts_stat over search_vector) — SEBI/regulatory-narrative
 * boilerplate ("company", "found", "regulation", "alleged", statute/
 * regulation citation tokens) that Postgres's own English stopword list
 * doesn't catch because they're not generic English stopwords, just
 * non-discriminating within this specific corpus. Left in an OR query
 * they swamp genuinely distinctive terms with noise matches. */
const CORPUS_BOILERPLATE_TERMS = new Set([
  "alleged", "alleges", "alleging", "regulation", "regulations", "violated", "violation", "violations",
  "sebi", "pfutp", "act", "acts", "found", "company", "companies", "section", "sections", "promoter",
  "promoters", "lodr", "ltd", "financial", "audit", "audited", "report", "reports", "reported", "notice",
  "noticee", "noticees", "statement", "statements", "transaction", "transactions", "entity", "entities", "via",
]);

const MAX_FULL_TEXT_SUPPLEMENTAL_FINDINGS = 8;

/** Tokenizes free text into the distinct, non-boilerplate, non-numeric
 * words a full-text OR query should search on. Returns the empty array
 * when nothing meaningful survives filtering (e.g. an all-numeric or
 * all-boilerplate query), signalling the caller to skip the search
 * entirely. */
function tokenizeForFullTextQuery(freeText: string): string[] {
  const tokens = freeText
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3 && !CORPUS_BOILERPLATE_TERMS.has(t));
  return [...new Set(tokens)].slice(0, 40);
}

/** Postgres full-text search over scenario findings' free text (title,
 * factual pattern, allegation text), as a complement to the curated-tag
 * deterministic matching engine — surfaces candidates whose wording falls
 * outside the synonym dictionary. Never used in place of the deterministic
 * engine's own scoring, only alongside it.
 *
 * Built as an OR of individual terms (via a plain to_tsquery, not
 * websearch_to_tsquery on the whole paragraph) because websearch_to_tsquery
 * ANDs every bare word together — a multi-sentence scenario description
 * routinely produces 20+ ANDed terms that no single precedent's text will
 * ever contain all of, so the search silently returns nothing.
 *
 * The Postgres query itself is unranked — an OR match on any one term is
 * enough to return a row — so every match is fetched (this corpus is a few
 * dozen findings; there is no pagination cost to worry about) and then
 * ranked here by how many distinct query terms each finding's own text
 * actually contains, before the top MAX_FULL_TEXT_SUPPLEMENTAL_FINDINGS are
 * kept. Without this, the 8 rows shown to the officer were whichever 8 the
 * database happened to return first, not the 8 most relevant to what they
 * typed - a real finding could be dropped in favour of one that only
 * matched on a single, incidental shared word. */
export async function searchScenarioFindingsFullText(query: string): Promise<ScenarioFinding[]> {
  const terms = tokenizeForFullTextQuery(query);
  if (terms.length === 0) return [];
  const orQuery = terms.join(" | ");
  const supabase = await createClient();
  const [{ data: findingRows, error: findingsError }, { data: linkRows, error: linksError }] = await Promise.all([
    supabase.from("scenario_findings").select("*").textSearch("search_vector", orQuery, { config: "english" }),
    supabase
      .from("finding_provisions")
      .select("finding_id, provision_id, justifying_tags, relationship, legal_provisions(canonical_id)"),
  ]);
  if (findingsError) throw findingsError;
  if (linksError) throw linksError;

  const provisionLinksByFinding = new Map<string, { provisionId: string; justifyingTags: string[]; relationship?: string }[]>();
  for (const link of linkRows ?? []) {
    const row = link as {
      finding_id: string;
      justifying_tags: string[] | null;
      relationship: string | null;
      legal_provisions: { canonical_id: string } | null;
    };
    const canonicalId = row.legal_provisions?.canonical_id;
    if (!canonicalId) continue;
    const list = provisionLinksByFinding.get(row.finding_id) ?? [];
    list.push({ provisionId: canonicalId, justifyingTags: row.justifying_tags ?? [], relationship: row.relationship ?? undefined });
    provisionLinksByFinding.set(row.finding_id, list);
  }

  const matchedTermCount = (row: ScenarioFindingRow): number => {
    const text = [row.case_name, row.scenario_title, row.factual_pattern, row.category].filter(Boolean).join(" ").toLowerCase();
    return terms.filter((t) => text.includes(t)).length;
  };

  return (findingRows ?? [])
    .map((row) => ({ row, rank: matchedTermCount(row) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_FULL_TEXT_SUPPLEMENTAL_FINDINGS)
    .map(({ row }) => {
      const orderIds = [row.order_id, row.final_order_id].filter((v): v is string => Boolean(v));
      return mapFinding(row, provisionLinksByFinding.get(row.id) ?? [], orderIds);
    });
}

/** Every order_relationships row (interim<->final, confirmatory, corrigendum,
 * related-matter links), resolved to both orders' case names. The Order
 * Detail page uses this to warn when an interim finding has since been
 * resolved by a final order — never overwrite an interim analysis with a
 * final outcome silently; always show both, in relationship order. */
export async function getOrderRelationships(): Promise<OrderRelationship[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_relationships")
    .select("*, from_order:orders!order_relationships_from_order_id_fkey(case_name), to_order:orders!order_relationships_to_order_id_fkey(case_name)");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const fromOrder = (row as { from_order: { case_name: string } | null }).from_order;
    const toOrder = (row as { to_order: { case_name: string } | null }).to_order;
    return {
      id: row.id,
      fromOrderId: row.from_order_id,
      fromCaseName: fromOrder?.case_name ?? "",
      toOrderId: row.to_order_id,
      toCaseName: toOrder?.case_name ?? "",
      relationshipType: row.relationship_type,
      note: row.note,
    };
  });
}

export async function orderRelationshipsForOrder(orderId: string): Promise<OrderRelationship[]> {
  const all = await getOrderRelationships();
  return all.filter((r) => r.fromOrderId === orderId || r.toOrderId === orderId);
}

function mapValidationIssue(row: ValidationIssueRow, orderCaseName: string | null, findingRecordId: string | null): ValidationIssue {
  return {
    id: row.id,
    orderId: row.order_id,
    orderCaseName,
    findingId: row.finding_id,
    findingRecordId,
    issueType: row.issue_type,
    severity: row.severity === "error" || row.severity === "info" ? row.severity : "warning",
    description: row.description,
    sourceRowRef: row.source_row_ref,
    resolved: row.resolved,
    createdAt: row.created_at,
  };
}

export async function getValidationIssues(): Promise<ValidationIssue[]> {
  const supabase = await createClient();
  const [{ data: issueRows, error: issuesError }, { data: orderRows, error: ordersError }, { data: findingRows, error: findingsError }] =
    await Promise.all([
      supabase.from("validation_issues").select("*").order("severity", { ascending: true }),
      supabase.from("orders").select("id, case_name"),
      supabase.from("scenario_findings").select("id, record_id"),
    ]);
  if (issuesError) throw issuesError;
  if (ordersError) throw ordersError;
  if (findingsError) throw findingsError;
  const caseNameById = new Map((orderRows ?? []).map((o) => [o.id, o.case_name]));
  const findingRecordIdById = new Map((findingRows ?? []).map((f) => [f.id, f.record_id]));
  return (issueRows ?? []).map((row) =>
    mapValidationIssue(
      row,
      row.order_id ? (caseNameById.get(row.order_id) ?? null) : null,
      row.finding_id ? (findingRecordIdById.get(row.finding_id) ?? null) : null
    )
  );
}

const MAX_FLAG_NOTE_LENGTH = 2000;

/** Lets a logged-in, allowlisted user flag a Scenario Analyzer result as
 * looking wrong, writing straight into validation_issues so it appears on
 * the existing Admin Validation Issues page. Guarded by the
 * validation_issues_insert_user_flag RLS policy (see migration
 * 0011_validation_issues_user_flag_insert.sql), which only allows inserting
 * this exact shape (issue_type/severity fixed, resolved=false) — a user can
 * never mark an issue resolved or write any other kind of row. */
export async function flagScenarioResult(input: {
  findingRecordId: string;
  provisionCanonicalId: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: findingRow, error: findingError } = await supabase
    .from("scenario_findings")
    .select("id, record_id, case_name")
    .eq("record_id", input.findingRecordId)
    .maybeSingle();
  if (findingError) throw findingError;
  if (!findingRow) return { ok: false, error: "That finding could not be found." };

  const note = input.note.trim().slice(0, MAX_FLAG_NOTE_LENGTH);
  const description = `User-reported: ${note || "(no note provided)"}, flagged by ${
    user.email ?? "unknown user"
  } against provision ${input.provisionCanonicalId}, finding ${findingRow.record_id} (${findingRow.case_name}).`;

  const { error: insertError } = await supabase.from("validation_issues").insert({
    finding_id: findingRow.id,
    order_id: null,
    issue_type: "user_flagged_result",
    severity: "warning",
    description,
    source_row_ref: input.provisionCanonicalId,
    resolved: false,
  });
  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true };
}

/** Audit trail of curated-data corrections (conduct-tag fixes, restored
 * transaction types, etc.) — see supabase/migrations/0012_data_change_log.sql. */
export async function getDataChangeLog(): Promise<DataChangeLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("data_change_log").select("*").order("changed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    tableName: row.table_name,
    recordRef: row.record_ref,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    reason: row.reason,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
  }));
}

export async function getLegalInstruments(): Promise<LegalInstrument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("legal_instruments").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: LegalInstrumentRow) => ({
    id: row.id,
    name: row.name,
    issuingAuthority: row.issuing_authority,
    officialSourceUrl: row.official_source_url,
  }));
}

/** Aggregate counts for the Admin Processing Dashboard. Every count is a
 * direct query against the live tables — nothing here is cached or
 * estimated, so the dashboard always reflects the current database state. */
export async function getProcessingMetrics(): Promise<ProcessingMetrics> {
  const supabase = await createClient();
  const [
    { count: totalIndexed },
    { count: officialUrlSupplied },
    { count: urlFormatValidated },
    { count: cfidIdentifierPresent },
    { count: cfidVerificationFailures },
    { count: documentActuallyRetrieved },
    { count: documentMetadataConfirmed },
    { count: completeDocumentOnFile },
    { count: awaitingRetrieval },
    { count: retrievalFailures },
    { count: deepAnalyzedCount },
    { count: fullyExtracted },
    { count: needsManualReview },
    { count: midPipelineCount },
    { count: residualPendingLink },
    { count: residualDuplicates },
    { count: residualNotCfid },
    { count: scenarioFindingsCreated },
    { count: legalProvisionsIdentified },
    { count: officialLawTextsVerified },
    { count: searchableFindingsCount },
    { count: findingsHumanLegallyReviewed },
    { data: orderRefRows },
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).not("official_url", "is", null),
    supabase.from("orders").select("*", { count: "exact", head: true }).like("official_url", "http%"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("cfid_verified", true),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("cfid_verified", false),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("retrieval_status", "success"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("cfid_verification_source", "document_confirmed"),
    supabase.from("source_documents").select("*", { count: "exact", head: true }).eq("retrieval_status", "success"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("processing_stage", "awaiting_retrieval"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("processing_stage", "retrieval_failed"),
    supabase.from("orders").select("*", { count: "exact", head: true }).in("processing_stage", ["citations_checked", "legally_reviewed"]),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("processing_stage", "legally_reviewed"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("processing_stage", "needs_manual_review"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("processing_stage", ["retrieval_attempted", "downloaded", "text_extracted", "scenario_findings_extracted"]),
    supabase.from("residual_register").select("*", { count: "exact", head: true }).eq("status", "pending_link"),
    supabase.from("residual_register").select("*", { count: "exact", head: true }).eq("status", "duplicate_of_verified"),
    supabase.from("residual_register").select("*", { count: "exact", head: true }).eq("status", "not_cfid"),
    supabase.from("scenario_findings").select("*", { count: "exact", head: true }),
    supabase.from("legal_provisions").select("*", { count: "exact", head: true }),
    supabase.from("provision_versions").select("*", { count: "exact", head: true }).eq("status", "officially_verified"),
    supabase
      .from("scenario_findings")
      .select("*", { count: "exact", head: true })
      .in("publication_status", ["published_to_search", "published_with_warning"]),
    supabase.from("scenario_findings").select("*", { count: "exact", head: true }).eq("human_legal_review_completed", true),
    // Distinct orders actually contributing a structured finding — via
    // EITHER order_id (interim) or final_order_id (final), matching how
    // getScenarioFindings() itself computes a finding's orderIds. Counting
    // order_id alone undercounts: a finding recorded only against its final
    // order still means that final order participates in retrieval.
    supabase.from("scenario_findings").select("order_id, final_order_id"),
  ]);
  const ordersContributingStructuredFindings = new Set(
    (orderRefRows ?? []).flatMap((r) => [r.order_id, r.final_order_id].filter((v): v is string => Boolean(v)))
  ).size;
  return {
    totalIndexed: totalIndexed ?? 0,
    officialUrlSupplied: officialUrlSupplied ?? 0,
    urlFormatValidated: urlFormatValidated ?? 0,
    cfidIdentifierPresent: cfidIdentifierPresent ?? 0,
    cfidVerificationFailures: cfidVerificationFailures ?? 0,
    documentActuallyRetrieved: documentActuallyRetrieved ?? 0,
    documentMetadataConfirmed: documentMetadataConfirmed ?? 0,
    completeDocumentOnFile: completeDocumentOnFile ?? 0,
    awaitingRetrieval: awaitingRetrieval ?? 0,
    retrievalFailures: retrievalFailures ?? 0,
    deepAnalyzedCount: deepAnalyzedCount ?? 0,
    fullyExtracted: fullyExtracted ?? 0,
    needsManualReview: needsManualReview ?? 0,
    midPipelineCount: midPipelineCount ?? 0,
    residualPendingLink: residualPendingLink ?? 0,
    residualDuplicates: residualDuplicates ?? 0,
    residualNotCfid: residualNotCfid ?? 0,
    scenarioFindingsCreated: scenarioFindingsCreated ?? 0,
    legalProvisionsIdentified: legalProvisionsIdentified ?? 0,
    officialLawTextsVerified: officialLawTextsVerified ?? 0,
    ordersContributingStructuredFindings,
    searchableFindingsCount: searchableFindingsCount ?? 0,
    findingsHumanLegallyReviewed: findingsHumanLegallyReviewed ?? 0,
  };
}

/** A prioritized (never mass-generated/arbitrary-order) queue of orders
 * that currently contribute ZERO structured findings to Scenario Analyzer
 * retrieval — computed the same way ProcessingMetrics.
 * ordersContributingStructuredFindings is (by actual presence in
 * scenario_findings.order_id/final_order_id), never by processing_stage
 * alone. A live audit found this matters: all 89 orders currently carry
 * processing_stage "citations_checked" (which isDeepAnalyzed() treats as
 * complete), yet 10 of them have no linked finding at all — the stage
 * label cannot be trusted on its own to answer "does this order actually
 * contribute anything an officer can retrieve".
 *
 * Priority is genuinely reasoned, not an arbitrary/default ordering:
 *   1. The entire matter (by caseName) is unrepresented — no other order
 *      for this case contributes a finding either. Highest priority: an
 *      officer researching this company gets nothing at all right now.
 *   2. A confirmatory/revocation order for an otherwise-covered matter —
 *      this specific order may finalize or supersede an outcome the app
 *      currently only reflects via an earlier order, a real correctness
 *      risk (a stale interim/original status shown after a final outcome
 *      exists), not merely an incompleteness.
 *   3. Any other order within an already-covered matter — lowest
 *      priority, since the matter itself is already represented.
 * Within a tier, most recently dated order first (more likely to be
 * queried against current facts). */
export async function getStructuredFindingCoverageGaps(): Promise<StructuredFindingCoverageGap[]> {
  const supabase = await createClient();
  const [allOrders, { data: orderRefRows, error }] = await Promise.all([
    getOrders(),
    supabase.from("scenario_findings").select("order_id, final_order_id"),
  ]);
  if (error) throw error;

  const coveredOrderIds = new Set(
    (orderRefRows ?? []).flatMap((r) => [r.order_id, r.final_order_id].filter((v): v is string => Boolean(v)))
  );
  const coveredCaseNames = new Set(allOrders.filter((o) => coveredOrderIds.has(o.id)).map((o) => o.caseName));

  return allOrders
    .filter((o) => !coveredOrderIds.has(o.id))
    .map((order): StructuredFindingCoverageGap => {
      const caseHasOtherStructuredFindings = coveredCaseNames.has(order.caseName);
      if (!caseHasOtherStructuredFindings) {
        return {
          order,
          caseHasOtherStructuredFindings,
          priorityTier: 1,
          priorityReason:
            "No structured finding exists yet for this matter at all: not merely this specific order, the entire case is currently unrepresented in the Scenario Analyzer.",
        };
      }
      if (order.orderStage === "Confirmatory order" || order.orderStage === "Revocation order") {
        return {
          order,
          caseHasOtherStructuredFindings,
          priorityTier: 2,
          priorityReason: `This ${order.orderStage.toLowerCase()} may finalize or supersede an outcome the app currently only reflects via an earlier order in the same matter; its own outcome has not yet been captured as a structured finding.`,
        };
      }
      return {
        order,
        caseHasOtherStructuredFindings,
        priorityTier: 3,
        priorityReason:
          "An earlier order in this matter already contributes structured findings; this specific order's own outcome has not yet been separately analysed.",
      };
    })
    .sort((a, b) => {
      if (a.priorityTier !== b.priorityTier) return a.priorityTier - b.priorityTier;
      return (b.order.orderDate ?? "").localeCompare(a.order.orderDate ?? "");
    });
}
