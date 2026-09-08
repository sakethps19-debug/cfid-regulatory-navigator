// Standalone, temporary trace script (NOT part of the app, not committed) run via tsx.
// Task #105 of the non-PFUTP provision-precision remediation pass: trace >=40 scenarios
// against the REAL production corpus (91 scenario_findings, 99 legal_provisions), each
// scenario's free text drawn directly from an actual finding's own factual_pattern (not
// synthetic), and print the FULL trace chain for every candidate provision returned:
//   scenario (source finding) -> detected concepts -> matched finding(s) -> per-provision
//   gate status -> justifying tags on the SOURCE finding's own link (if any) -> per-link
//   relationship/effectiveStatus -> confidence tier -> gate-blocked ("MAY show") tier.
//
// This never mutates production data; it only reads the same JSON snapshots the leakage
// probe script used and runs them through the (now-remediated) matching engine in-process.
import { readFileSync } from "fs";
import { analyzeScenario } from "@/lib/matching/engine";
import { detectConcepts } from "@/lib/matching/conceptExtraction";
import { retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";
import type { LegalProvision, ScenarioFinding, FindingStatus, PublicationStatus } from "@/types/domain";

const SCRATCH = "/tmp/claude-0/-home-user-cfid-regulatory-navigator/3f0534b9-4b60-5afe-bd07-443935964238/scratchpad";

const FINDING_STATUS_LABELS: Record<string, FindingStatus> = {
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
const PUBLICATION_STATUS_LABELS: Record<string, PublicationStatus> = {
  draft: "Draft",
  quarantined: "Quarantined",
  published_to_search: "Published to search",
  published_with_warning: "Published with warning",
  withdrawn: "Withdrawn",
};
const VERIFICATION_STATUS_LABELS: Record<string, LegalProvision["currentTextVerificationStatus"]> = {
  requires_verification: "Requires verification",
  order_cited_text_only: "Order-cited text only",
  officially_verified: "Officially verified",
};

interface RawFinding {
  record_id: string;
  case_name: string;
  category: string | null;
  scenario_title: string;
  factual_pattern: string;
  provisions_considered_raw: string | null;
  provision_links: { provisionId: string; justifyingTags: string[]; relationship?: string }[] | null;
  noticee_actor_names: string[] | null;
  finding_status: string;
  interim_paragraph_references: string | null;
  final_paragraph_references: string | null;
  qualification: string | null;
  official_source_url: string | null;
  transaction_types: string[] | null;
  actor_roles: string[] | null;
  evidence_types: string[] | null;
  alleged_conduct: string[] | null;
  evidentiary_gaps: string[] | null;
  precedent_outcome_note: string | null;
  ingredients_not_established: string[] | null;
  source_document_verified: boolean;
  paragraph_citation_verified: boolean;
  finding_status_verified: boolean;
  provision_mapping_verified: boolean;
  noticee_mapping_verified: boolean;
  human_legal_review_completed: boolean;
  publication_status: string;
}
interface RawProvision {
  id: string;
  instrument: string;
  provision_number: string;
  subject: string | null;
  current_text_verification_status: string;
  official_source: string | null;
}

const rawFindings: RawFinding[] = JSON.parse(readFileSync(`${SCRATCH}/live-findings-full-v3.json`, "utf8"));
const rawProvisions: RawProvision[] = JSON.parse(readFileSync(`${SCRATCH}/live-provisions-raw.json`, "utf8"));

const LIVE_FINDINGS: ScenarioFinding[] = rawFindings.map((row) => ({
  recordId: row.record_id,
  caseName: row.case_name,
  orderIds: [],
  category: row.category,
  scenarioTitle: row.scenario_title,
  factualPattern: row.factual_pattern,
  allegationText: null,
  provisionsConsideredRaw: row.provisions_considered_raw,
  provisionIds: (row.provision_links ?? []).map((l) => l.provisionId),
  provisionLinks: row.provision_links ?? [],
  noticeeActors: row.noticee_actor_names ?? [],
  findingStatus: FINDING_STATUS_LABELS[row.finding_status] ?? "Alleged",
  interimParagraphReferences: row.interim_paragraph_references,
  finalParagraphReferences: row.final_paragraph_references,
  qualification: row.qualification,
  officialSourceUrl: row.official_source_url ?? "",
  transactionTypes: row.transaction_types ?? [],
  actorRoles: row.actor_roles ?? [],
  evidenceTypes: row.evidence_types ?? [],
  allegedConduct: row.alleged_conduct ?? [],
  evidentiaryGaps: row.evidentiary_gaps ?? [],
  precedentOutcomeNote: row.precedent_outcome_note,
  ingredientsNotEstablished: row.ingredients_not_established ?? [],
  sourceDocumentVerified: row.source_document_verified,
  paragraphCitationVerified: row.paragraph_citation_verified,
  findingStatusVerified: row.finding_status_verified,
  provisionMappingVerified: row.provision_mapping_verified,
  noticeeMappingVerified: row.noticee_mapping_verified,
  humanLegalReviewCompleted: row.human_legal_review_completed,
  publicationStatus: PUBLICATION_STATUS_LABELS[row.publication_status] ?? "Draft",
}));

const LIVE_PROVISIONS: LegalProvision[] = rawProvisions.map((row) => ({
  id: row.id,
  instrument: row.instrument,
  instrumentId: row.instrument,
  issuingAuthority: "",
  provisionNumber: row.provision_number,
  subject: row.subject,
  currentTextVerificationStatus: VERIFICATION_STATUS_LABELS[row.current_text_verification_status] ?? "Requires verification",
  officialSource: row.official_source,
  ordersConsidered: [],
  treatmentInPilotOrders: "",
  lawLibraryNote: null,
}));

console.log(`Loaded ${LIVE_FINDINGS.length} live scenario_findings, ${LIVE_PROVISIONS.length} live legal_provisions.\n`);

// 42 real production findings spanning every family this pass gated, chosen for
// category diversity (RPT, financial-statement misstatement, Audit Committee,
// preferential allotment, investigation cooperation, fund-diversion-to-related-entity,
// price manipulation, corporate disclosure, auditor conduct, investments, director
// duties) rather than re-using the earlier PFUTP-focused trace's record set.
const RECORD_IDS = [
  // Related-party transaction disclosure
  "ADANI-AC-01", "ADANI-MR-01", "BDMCL-01", "CDEL-02", "DBRL-01", "GENSOL-02", "HEXA-01", "LINDE-01",
  // Financial statement misstatement
  "ASERL-WOAL-01", "MAGNUM-01", "OMAXE-01", "ONECAL-01", "ROHL-01", "SHARON-01",
  // Audit Committee deficiency / oversight
  "BGL-AC-01", "BGL-PREF-04", "MBL-02", "ONECAL-02", "SSSL-05",
  // Preferential allotment
  "BGL-PREF-01", "PIFL-01", "BGL-PREF-02", "BGL-PREF-03", "SSSL-02", "SSSL-03",
  // Investigation cooperation
  "BHSL-PROC-01", "CITL-02", "FRL-02", "MBL-03", "SICL-03", "ZEE-PLEDGE-02",
  // Fund diversion to related/connected entities
  "CGPOWER-01", "SSSL-04",
  // Price manipulation (negative control: PFUTP-family, not this pass's focus)
  "DAIL-01", "LSIL-01",
  // Corporate disclosure / financial statements / auditor / investments / director duties
  "GENSOL-03", "REL-02", "REL-06", "SICL-01", "SICL-02",
  // Related-party transaction concerns
  "FRL-01", "REL-04",
];

console.log(`Tracing ${RECORD_IDS.length} real production findings.\n`);

let totalScenarios = 0;
let sourceFindingProvisionsRecovered = 0;
let sourceFindingProvisionsTotal = 0;

for (const recordId of RECORD_IDS) {
  const source = LIVE_FINDINGS.find((f) => f.recordId === recordId);
  if (!source) {
    console.log(`!! MISSING record_id ${recordId} in live corpus snapshot -- skipped.`);
    continue;
  }
  totalScenarios++;
  console.log("=".repeat(110));
  console.log(`SCENARIO ${totalScenarios}: source finding ${source.recordId} (${source.caseName}) [status=${source.findingStatus}]`);
  console.log(`FREE TEXT (verbatim factual_pattern): ${source.factualPattern.slice(0, 400)}${source.factualPattern.length > 400 ? "..." : ""}`);

  const concepts = detectConcepts(source.factualPattern);
  console.log(`\n-- detected concepts (${concepts.length}) --`);
  console.log(`  ${concepts.map((c) => c.id).join(", ") || "(none)"}`);

  const result = analyzeScenario({ freeText: source.factualPattern }, LIVE_FINDINGS, LIVE_PROVISIONS, []);

  console.log(`\n-- source finding's OWN provision links (ground truth, ${source.provisionLinks?.length ?? 0}) --`);
  for (const link of source.provisionLinks ?? []) {
    sourceFindingProvisionsTotal++;
    const rule = retrievalRuleForProvision(link.provisionId);
    const recovered = result.provisionResults.some((pr) => pr.provision.id === link.provisionId);
    const blocked = result.gateBlockedProvisionResults.find((g) => g.provision.id === link.provisionId);
    if (recovered) sourceFindingProvisionsRecovered++;
    console.log(
      `  ${link.provisionId}: justifyingTags=[${(link.justifyingTags ?? []).join(",") || "(empty)"}] relationship=${link.relationship ?? "(none)"} gated=${rule ? "yes" : "no"} ` +
        `recoveredAsCandidate=${recovered ? "YES" : blocked ? "NO (gate-blocked/MAY-show)" : "NO"}`,
    );
  }

  console.log(`\n-- candidate provisions returned (${result.provisionResults.length}) --`);
  for (const pr of result.provisionResults) {
    const rule = retrievalRuleForProvision(pr.provision.id);
    const own = pr.supportingPrecedents.find((p) => p.finding.recordId === recordId);
    console.log(
      `  ${pr.provision.id} (${pr.provision.instrument} ${pr.provision.provisionNumber}) gated=${rule ? "yes" : "no"} confidence=${pr.confidence} ` +
        `ownFindingPresent=${own ? `yes[effectiveStatus=${own.effectiveStatus}]` : "no"} ` +
        `otherSupportingPrecedents=${pr.supportingPrecedents.filter((p) => p.finding.recordId !== recordId).map((p) => `${p.finding.recordId}[${p.effectiveStatus}]`).join(",") || "(none)"}`,
    );
  }

  if (result.gateBlockedProvisionResults.length > 0) {
    console.log(`\n-- gate-blocked ("MAY show, requires additional fact") provisions (${result.gateBlockedProvisionResults.length}) --`);
    for (const g of result.gateBlockedProvisionResults) {
      console.log(`  ${g.provision.id}: ${g.gateExplanation}`);
    }
  }
  console.log();
}

console.log("=".repeat(110));
console.log(`SUMMARY: ${totalScenarios} real production findings traced.`);
console.log(
  `Source findings' own provision links recovered as candidates on their own factual_pattern text: ${sourceFindingProvisionsRecovered}/${sourceFindingProvisionsTotal} ` +
    `(${((sourceFindingProvisionsRecovered / sourceFindingProvisionsTotal) * 100).toFixed(1)}%). A miss here is expected and NOT a defect when the missing link's ` +
    `justifyingTags are empty and the provision is gated -- that is the gate correctly declining to treat an untagged historical link as self-proving; see the ` +
    `per-provision detail above for which misses are gate-appropriate vs. genuine vocabulary gaps.`,
);
