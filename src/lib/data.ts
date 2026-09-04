import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  DirectionOutcome,
  FindingStatus,
  LegalInstrument,
  LegalProvision,
  LegalTest,
  Order,
  OrderRelationship,
  OrderStage,
  ProcessingMetrics,
  ProcessingStage,
  ProvisionVersion,
  ResidualOrderRow,
  ScenarioFinding,
  ValidationIssue,
  VerifiedCfidOrderRow,
} from "@/types/domain";
import type { Database } from "@/types/database";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ScenarioFindingRow = Database["public"]["Tables"]["scenario_findings"]["Row"];
type LegalProvisionRow = Database["public"]["Tables"]["legal_provisions"]["Row"];
type LegalTestRow = Database["public"]["Tables"]["legal_tests"]["Row"];
type OrderDirectionRow = Database["public"]["Tables"]["order_directions"]["Row"];
type ResidualRegisterRow = Database["public"]["Tables"]["residual_register"]["Row"];
type ProvisionVersionRow = Database["public"]["Tables"]["provision_versions"]["Row"];
type LegalInstrumentRow = Database["public"]["Tables"]["legal_instruments"]["Row"];
type ValidationIssueRow = Database["public"]["Tables"]["validation_issues"]["Row"];

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

const PROCESSING_STAGE_LABELS: Record<ProcessingStage, string> = {
  indexed: "Indexed only",
  downloaded: "Downloaded",
  text_extracted: "Text extracted",
  scenario_findings_extracted: "Scenario findings extracted",
  legally_reviewed: "Legally reviewed (deep-analyzed)",
  needs_manual_review: "Needs manual review",
  retrieval_failed: "Retrieval failed",
};

const FINDING_STATUS_LABELS: Record<ScenarioFindingRow["finding_status"], FindingStatus> = {
  alleged: "Alleged",
  prima_facie: "Prima facie",
  confirmed_at_interim: "Confirmed at interim",
  upheld: "Upheld",
  partly_upheld: "Partly upheld",
  not_upheld: "Not upheld",
  withdrawn: "Withdrawn",
  inconclusive: "Inconclusive",
  procedural_observation: "Procedural observation",
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
    proceduralStatus: PROCESSING_STAGE_LABELS[row.processing_stage as ProcessingStage] ?? row.processing_stage,
    processingStage: row.processing_stage as ProcessingStage,
    retrievalStatus: row.retrieval_status,
    retrievalFailureReason: row.retrieval_failure_reason,
    scopeNote: row.scope_note,
  };
}

function mapFinding(row: ScenarioFindingRow, provisionIds: string[], orderIds: string[]): ScenarioFinding {
  return {
    recordId: row.record_id,
    caseName: row.case_name,
    orderIds,
    category: row.category,
    scenarioTitle: row.scenario_title,
    factualPattern: row.factual_pattern,
    provisionsConsideredRaw: row.provisions_considered_raw,
    provisionIds,
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
    ingredientsNotEstablished: row.ingredients_not_established,
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

export async function getOrderById(id: string): Promise<Order | undefined> {
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
    supabase.from("finding_provisions").select("finding_id, provision_id, legal_provisions(canonical_id)"),
  ]);
  if (findingsError) throw findingsError;
  if (linksError) throw linksError;

  const provisionIdsByFinding = new Map<string, string[]>();
  for (const link of linkRows ?? []) {
    const canonicalId = (link as { legal_provisions: { canonical_id: string } | null }).legal_provisions?.canonical_id;
    if (!canonicalId) continue;
    const list = provisionIdsByFinding.get(link.finding_id) ?? [];
    list.push(canonicalId);
    provisionIdsByFinding.set(link.finding_id, list);
  }

  return (findingRows ?? []).map((row) => {
    const orderIds = [row.order_id, row.final_order_id].filter((v): v is string => Boolean(v));
    return mapFinding(row, provisionIdsByFinding.get(row.id) ?? [], orderIds);
  });
}

export async function getProvisions(): Promise<LegalProvision[]> {
  const supabase = await createClient();
  const [{ data: provisionRows, error: provisionsError }, findings] = await Promise.all([
    supabase.from("legal_provisions").select("*, legal_instruments(name)").order("canonical_id", { ascending: true }),
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
    const instrumentName = (row as { legal_instruments: { name: string } | null }).legal_instruments?.name ?? "";
    const casesConsidered = [...(casesByProvision.get(row.canonical_id) ?? [])];
    const findingsCount = findings.filter((f) => f.provisionIds.includes(row.canonical_id)).length;
    return {
      id: row.canonical_id,
      instrument: instrumentName,
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
 * Case Library views: every row from `orders`, marked deep_analyzed when its
 * processing has reached legally_reviewed, verified_pending_analysis
 * otherwise. */
export async function getVerifiedCfidOrders(): Promise<VerifiedCfidOrderRow[]> {
  const orders = await getOrders();
  return orders.map((o) => ({
    id: o.id,
    caseName: o.caseName,
    orderIdentifier: o.orderNumber ?? "",
    officialUrl: o.officialUrl,
    cfidConfirmed: o.cfidVerified,
    analysisStatus: o.processingStage === "legally_reviewed" ? "deep_analyzed" : "verified_pending_analysis",
    linkedOrderIds: o.processingStage === "legally_reviewed" ? [o.id] : [],
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
    status: row.status === "officially_verified" ? "officially_verified" : "requires_verification",
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

/** Postgres full-text search over scenario findings' free text (title,
 * factual pattern, allegation text), as a complement to the curated-tag
 * deterministic matching engine — surfaces candidates whose wording falls
 * outside the synonym dictionary. Never used in place of the deterministic
 * engine's own scoring, only alongside it. */
export async function searchScenarioFindingsFullText(query: string): Promise<ScenarioFinding[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const supabase = await createClient();
  const [{ data: findingRows, error: findingsError }, { data: linkRows, error: linksError }] = await Promise.all([
    supabase
      .from("scenario_findings")
      .select("*")
      .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
      .limit(20),
    supabase.from("finding_provisions").select("finding_id, provision_id, legal_provisions(canonical_id)"),
  ]);
  if (findingsError) throw findingsError;
  if (linksError) throw linksError;

  const provisionIdsByFinding = new Map<string, string[]>();
  for (const link of linkRows ?? []) {
    const canonicalId = (link as { legal_provisions: { canonical_id: string } | null }).legal_provisions?.canonical_id;
    if (!canonicalId) continue;
    const list = provisionIdsByFinding.get(link.finding_id) ?? [];
    list.push(canonicalId);
    provisionIdsByFinding.set(link.finding_id, list);
  }

  return (findingRows ?? []).map((row) => {
    const orderIds = [row.order_id, row.final_order_id].filter((v): v is string => Boolean(v));
    return mapFinding(row, provisionIdsByFinding.get(row.id) ?? [], orderIds);
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

function mapValidationIssue(row: ValidationIssueRow, orderCaseName: string | null): ValidationIssue {
  return {
    id: row.id,
    orderId: row.order_id,
    orderCaseName,
    findingId: row.finding_id,
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
  const [{ data: issueRows, error: issuesError }, { data: orderRows, error: ordersError }] = await Promise.all([
    supabase.from("validation_issues").select("*").order("severity", { ascending: true }),
    supabase.from("orders").select("id, case_name"),
  ]);
  if (issuesError) throw issuesError;
  if (ordersError) throw ordersError;
  const caseNameById = new Map((orderRows ?? []).map((o) => [o.id, o.case_name]));
  return (issueRows ?? []).map((row) => mapValidationIssue(row, row.order_id ? (caseNameById.get(row.order_id) ?? null) : null));
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
    { count: successfullyRetrieved },
    { count: retrievalFailures },
    { count: cfidVerificationFailures },
    { count: fullyExtracted },
    { count: needsManualReview },
    { count: verifiedAwaitingExtraction },
    { count: residualPendingLink },
    { count: residualDuplicates },
    { count: residualNotCfid },
    { count: scenarioFindingsCreated },
    { count: legalProvisionsIdentified },
    { count: officialLawTextsVerified },
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("retrieval_status", "success"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("retrieval_status", "failed"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("cfid_verified", false),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("processing_stage", "legally_reviewed"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("processing_stage", "needs_manual_review"),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .not("processing_stage", "in", "(legally_reviewed,retrieval_failed,needs_manual_review)"),
    supabase.from("residual_register").select("*", { count: "exact", head: true }).eq("status", "pending_link"),
    supabase.from("residual_register").select("*", { count: "exact", head: true }).eq("status", "duplicate_of_verified"),
    supabase.from("residual_register").select("*", { count: "exact", head: true }).eq("status", "not_cfid"),
    supabase.from("scenario_findings").select("*", { count: "exact", head: true }),
    supabase.from("legal_provisions").select("*", { count: "exact", head: true }),
    supabase.from("provision_versions").select("*", { count: "exact", head: true }).eq("status", "officially_verified"),
  ]);
  return {
    totalIndexed: totalIndexed ?? 0,
    successfullyRetrieved: successfullyRetrieved ?? 0,
    retrievalFailures: retrievalFailures ?? 0,
    cfidVerificationFailures: cfidVerificationFailures ?? 0,
    fullyExtracted: fullyExtracted ?? 0,
    needsManualReview: needsManualReview ?? 0,
    verifiedAwaitingExtraction: verifiedAwaitingExtraction ?? 0,
    residualPendingLink: residualPendingLink ?? 0,
    residualDuplicates: residualDuplicates ?? 0,
    residualNotCfid: residualNotCfid ?? 0,
    scenarioFindingsCreated: scenarioFindingsCreated ?? 0,
    legalProvisionsIdentified: legalProvisionsIdentified ?? 0,
    officialLawTextsVerified: officialLawTextsVerified ?? 0,
  };
}
