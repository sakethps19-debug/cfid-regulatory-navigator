/**
 * Generates supabase/generated/import.sql — a single idempotent SQL script
 * (upserts throughout) that populates the CFID Regulatory Navigator schema
 * from:
 *   - CFID_Precedent_Library_Pilot.xlsx (3 orders, 34 scenario findings,
 *     25 provisions, 6 legal tests, 11 directions — already human-curated
 *     and legally reviewed)
 *   - Verified_CFID_Order_Links.xlsx (89 authoritative CFID orders; the 86
 *     not covered by the pilot library are recorded at stage "indexed" and
 *     then "retrieval_failed", per the network-egress finding recorded in
 *     validation_issues/processing_runs — never fabricated)
 *   - Residual_Order_Links.xlsx (37 rows → residual_register ONLY, never
 *     orders/scenario_findings)
 *
 * This script does not connect to any database — it only reads the local
 * workbooks (via the existing parser modules) and prints SQL text. Feeding
 * that SQL to Postgres is a separate, explicit step (scripts/db/run-import.ts
 * for a live DATABASE_URL, or pasted into the Supabase SQL editor / MCP
 * execute_sql during development).
 *
 * Usage: npx tsx scripts/db/build-import-sql.ts > supabase/generated/import.sql
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parsePrecedentWorkbook } from "../lib/parsePrecedentWorkbook";
import { parseVerifiedOrdersWorkbook } from "../lib/parseVerifiedOrdersWorkbook";
import { parseResidualWorkbook } from "../lib/parseResidualWorkbook";
import { REPO_ROOT } from "../lib/xlsxUtil";
import { orderPeriodHintFromUrl, orderTypeFromUrl } from "./urlMetadata";
import { sqlBool, sqlDate, sqlEnum, sqlString, sqlTextArray } from "./sqlUtil";
import type { FindingStatus, OrderStage } from "../../src/types/domain";

const OUT_FILE = path.join(REPO_ROOT, "supabase", "generated", "import.sql");

const NETWORK_BLOCK_REASON =
  "EGRESS_BLOCKED: sebi.gov.in unreachable from this environment (confirmed via curl and WebFetch, incl. a control domain). Not retrieved; nothing fabricated. Full explanation in processing_runs (run_type=import_verified_orders).";

const INSTRUMENTS: { name: string; issuingAuthority: string; officialSourceUrl: string | null }[] = [
  { name: "SEBI Act, 1992", issuingAuthority: "SEBI", officialSourceUrl: "https://www.sebi.gov.in/legal/acts/mar-2023/securities-and-exchange-board-of-india-act-1992_69519.html" },
  { name: "PFUTP Regulations, 2003", issuingAuthority: "SEBI", officialSourceUrl: "https://www.sebi.gov.in/legal/regulations/mar-2019/sebi-prohibition-of-fraudulent-and-unfair-trade-practices-relating-to-securities-market-regulations-2003-_28054.html" },
  { name: "LODR Regulations, 2015", issuingAuthority: "SEBI", officialSourceUrl: "https://www.sebi.gov.in/legal/regulations/jan-2024/securities-and-exchange-board-of-india-listing-obligations-and-disclosure-requirements-regulations-2015-last-amended-on-january-05-2024-_66336.html" },
  { name: "Companies Act, 2013", issuingAuthority: "MCA", officialSourceUrl: "https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/acts.html" },
  { name: "Indian Accounting Standards", issuingAuthority: "MCA (notified)", officialSourceUrl: "https://www.mca.gov.in/content/mca/global/en/acts-rules/ind-as.html" },
];

const ORDER_STAGE_TO_TYPE: Partial<Record<OrderStage, string>> = {
  "Interim order": "interim_order",
  "Interim order cum show cause notice": "interim_cum_show_cause_notice",
  "Final order": "final_order",
};

const FINDING_STATUS_TO_ENUM: Partial<Record<FindingStatus, string>> = {
  Alleged: "alleged",
  "Prima facie": "prima_facie",
  Upheld: "upheld",
  "Partly upheld": "partly_upheld",
  "Not upheld": "not_upheld",
};

function provisionRelationshipForFinding(status: FindingStatus): string {
  switch (status) {
    case "Upheld":
    case "Partly upheld":
      return "upheld";
    case "Not upheld":
      return "not_upheld";
    case "Prima facie":
    case "Alleged":
    default:
      return "alleged";
  }
}

// Named individuals/entities we can confidently attribute to a specific
// order from the curated scenario-finding text (never a bare "Noticee N").
const NAMED_NOTICEES: { name: string; entityType: string; caseNamePattern: RegExp; role: string }[] = [
  { name: "Rajesh Exports Limited", entityType: "company", caseNamePattern: /rajesh exports/i, role: "Company" },
  { name: "Rajesh Mehta", entityType: "individual", caseNamePattern: /rajesh exports/i, role: "Promoter" },
  { name: "Siddharth Mehta", entityType: "individual", caseNamePattern: /rajesh exports/i, role: "Promoter family member" },
  { name: "Seacoast Shipping Services Limited", entityType: "company", caseNamePattern: /seacoast shipping/i, role: "Company" },
  { name: "Manish Shah", entityType: "individual", caseNamePattern: /seacoast shipping/i, role: "Managing Director / Promoter" },
  { name: "Sameer Shah", entityType: "individual", caseNamePattern: /seacoast shipping/i, role: "Executive Director" },
];

function main() {
  const precedent = parsePrecedentWorkbook();
  const verified = parseVerifiedOrdersWorkbook(precedent.orders);
  const residual = parseResidualWorkbook();

  const lines: string[] = [];
  const push = (s: string) => lines.push(s);

  push("-- Generated by scripts/db/build-import-sql.ts — do not hand-edit.");
  push(`-- Generated at ${new Date().toISOString()}`);
  push("begin;");
  push("");

  // ---- legal_instruments ------------------------------------------------
  push("-- legal_instruments");
  for (const inst of INSTRUMENTS) {
    push(
      `insert into legal_instruments (name, issuing_authority, official_source_url) values (${sqlString(inst.name)}, ${sqlString(inst.issuingAuthority)}, ${sqlString(inst.officialSourceUrl)}) on conflict (name) do update set issuing_authority = excluded.issuing_authority, official_source_url = excluded.official_source_url;`
    );
  }
  push("");

  // ---- legal_provisions ---------------------------------------------------
  push("-- legal_provisions (from Provision Index, curated ids/patterns)");
  for (const p of precedent.provisions) {
    if (p.id.startsWith("UNMAPPED-")) continue; // never happened in this pilot, but guard anyway
    push(
      `insert into legal_provisions (canonical_id, instrument_id, provision_number, subject, current_text_verification_status, official_source_url, law_library_note) values (${sqlString(
        p.id
      )}, (select id from legal_instruments where name = ${sqlString(p.instrument)}), ${sqlString(
        p.provisionNumber
      )}, ${sqlString(p.subject)}, 'requires_verification', NULL, ${sqlString(
        p.lawLibraryNote
      )}) on conflict (canonical_id) do update set subject = excluded.subject, law_library_note = excluded.law_library_note;`
    );
  }
  push("");

  push("-- provision_versions (placeholder — current text not independently verified this session)");
  for (const p of precedent.provisions) {
    if (p.id.startsWith("UNMAPPED-")) continue;
    push(
      `insert into provision_versions (provision_id, version_label, status, source_url) values ((select id from legal_provisions where canonical_id = ${sqlString(
        p.id
      )}), 'Current text (unverified)', 'requires_verification', NULL) on conflict do nothing;`
    );
  }
  push("");

  // ---- legal_tests --------------------------------------------------------
  push("-- legal_tests");
  push("delete from legal_tests;"); // small, static set — safe to replace wholesale each run
  for (const lt of precedent.legalTests) {
    push(
      `insert into legal_tests (provision_or_issue, working_principle, paragraph_anchors, implementation_guardrail) values (${sqlString(
        lt.provisionOrIssue
      )}, ${sqlString(lt.workingPrinciple)}, ${sqlString(lt.paragraphAnchors)}, ${sqlString(lt.implementationGuardrail)});`
    );
  }
  push("");

  // ---- orders: assign a stable client-side UUID per verified-order row --
  const orderUuidByUrl = new Map<string, string>();
  for (const v of verified.rows) orderUuidByUrl.set(v.officialUrl, crypto.randomUUID());

  // The 3 pilot Order Master rows are matched to their Verified-workbook row
  // by exact official URL (already confirmed 1:1 in the previous session).
  const pilotOrderIdByOrderId = new Map<string, string>(); // pilot Order.id -> uuid used in this SQL
  for (const o of precedent.orders) {
    const uuid = orderUuidByUrl.get(o.officialUrl);
    if (uuid) pilotOrderIdByOrderId.set(o.id, uuid);
  }

  push("-- orders (89 verified CFID orders)");
  for (const v of verified.rows) {
    const uuid = orderUuidByUrl.get(v.officialUrl)!;
    const pilotOrder = precedent.orders.find((o) => o.officialUrl === v.officialUrl);
    const { orderType, matched } = orderTypeFromUrl(v.officialUrl);
    const periodHint = orderPeriodHintFromUrl(v.officialUrl);

    // cfid_verification_basis records HOW CFID origin was established — for
    // every row here that is literally a "CFID" tag matched in the order's
    // own identifier/order number, never inferred or assumed for any row
    // that didn't actually match.
    const verificationBasis = v.cfidConfirmed ? "cfid_tag_in_order_number" : "needs_manual_verification";

    if (pilotOrder) {
      push(
        `insert into orders (id, case_name, listed_entity, order_type, order_type_source, order_date, order_period_hint, order_number, passing_authority, official_url, cfid_verified, cfid_verification_source, cfid_verification_basis, normalized_matter_name, scope_note, processing_stage, retrieval_status, source_row_ref) values (` +
          [
            sqlString(uuid),
            sqlString(pilotOrder.caseName),
            sqlString(pilotOrder.caseName),
            sqlEnum(ORDER_STAGE_TO_TYPE[pilotOrder.orderStage]!),
            sqlEnum("document_confirmed"),
            sqlDate(pilotOrder.orderDate),
            sqlString(periodHint),
            sqlString(pilotOrder.orderNumber),
            sqlString(pilotOrder.authority),
            sqlString(pilotOrder.officialUrl),
            sqlBool(pilotOrder.cfidVerified),
            sqlEnum("document_confirmed"),
            sqlEnum(verificationBasis),
            sqlString(pilotOrder.caseName),
            sqlString(pilotOrder.scopeNote),
            sqlEnum("legally_reviewed"),
            sqlEnum("success"),
            sqlString(`${v.caseName} — ${v.orderIdentifier}`),
          ].join(", ") +
          `) on conflict (official_url) do update set case_name = excluded.case_name, order_type = excluded.order_type, order_date = excluded.order_date, order_number = excluded.order_number, passing_authority = excluded.passing_authority, cfid_verified = excluded.cfid_verified, cfid_verification_source = excluded.cfid_verification_source, cfid_verification_basis = excluded.cfid_verification_basis, normalized_matter_name = excluded.normalized_matter_name, scope_note = excluded.scope_note, processing_stage = excluded.processing_stage, retrieval_status = excluded.retrieval_status;`
      );
    } else {
      push(
        `insert into orders (id, case_name, order_type, order_type_source, order_period_hint, order_number, official_url, cfid_verified, cfid_verification_source, cfid_verification_basis, normalized_matter_name, processing_stage, retrieval_status, retrieval_failure_reason) values (` +
          [
            sqlString(uuid),
            sqlString(v.caseName),
            sqlEnum(orderType),
            sqlEnum(matched ? "official_url_slug" : "unspecified"),
            sqlString(periodHint),
            sqlString(v.orderIdentifier),
            sqlString(v.officialUrl),
            sqlBool(v.cfidConfirmed),
            sqlEnum("verified_workbook"),
            sqlEnum(verificationBasis),
            sqlString(v.caseName),
            sqlEnum("retrieval_failed"),
            sqlEnum("failed"),
            sqlString(NETWORK_BLOCK_REASON),
          ].join(", ") +
          `) on conflict (official_url) do update set processing_stage = excluded.processing_stage, retrieval_status = excluded.retrieval_status, cfid_verification_basis = excluded.cfid_verification_basis, normalized_matter_name = excluded.normalized_matter_name;`
      );
    }
  }
  push("");

  // ---- order_relationships (only where confidently known) ----------------
  push("-- order_relationships");
  const sssl = precedent.orders.filter((o) => /seacoast/i.test(o.caseName));
  const sslInterim = sssl.find((o) => o.orderStage !== "Final order");
  const sslFinal = sssl.find((o) => o.orderStage === "Final order");
  if (sslInterim && sslFinal) {
    const fromId = pilotOrderIdByOrderId.get(sslInterim.id);
    const toId = pilotOrderIdByOrderId.get(sslFinal.id);
    if (fromId && toId) {
      push(
        `insert into order_relationships (from_order_id, to_order_id, relationship_type, note) values (${sqlString(
          fromId
        )}, ${sqlString(toId)}, 'interim_to_final', 'Seacoast Shipping Services Limited interim order cum show cause notice resolved by the final order.') on conflict do nothing;`
      );
    }
  }
  push("");

  // ---- noticees / order_noticees (named parties only) ---------------------
  push("-- noticees");
  const uniqueNames = [...new Set(NAMED_NOTICEES.map((n) => n.name))];
  for (const name of uniqueNames) {
    const def = NAMED_NOTICEES.find((n) => n.name === name)!;
    push(
      `insert into noticees (full_name, entity_type) values (${sqlString(name)}, ${sqlString(
        def.entityType
      )}) on conflict (full_name) do nothing;`
    );
  }
  push("");
  push("-- order_noticees (linking named parties to the orders that name them)");
  for (const o of precedent.orders) {
    const uuid = pilotOrderIdByOrderId.get(o.id);
    if (!uuid) continue;
    for (const def of NAMED_NOTICEES) {
      if (def.caseNamePattern.test(o.caseName)) {
        push(
          `insert into order_noticees (order_id, noticee_id, role) values (${sqlString(uuid)}, (select id from noticees where full_name = ${sqlString(
            def.name
          )}), ${sqlString(def.role)}) on conflict (order_id, noticee_id) do nothing;`
        );
      }
    }
  }
  push("");

  // ---- scenario_findings ---------------------------------------------------
  const findingUuidByRecordId = new Map<string, string>();
  for (const f of precedent.scenarioFindings) findingUuidByRecordId.set(f.recordId, crypto.randomUUID());

  push("-- scenario_findings");
  for (const f of precedent.scenarioFindings) {
    const uuid = findingUuidByRecordId.get(f.recordId)!;
    const orderId = f.orderIds.length > 0 ? pilotOrderIdByOrderId.get(f.orderIds[0]) : undefined;
    const finalOrderId = f.orderIds
      .map((id) => precedent.orders.find((o) => o.id === id))
      .find((o) => o?.orderStage === "Final order");
    const finalOrderUuid = finalOrderId ? pilotOrderIdByOrderId.get(finalOrderId.id) : undefined;

    push(
      `insert into scenario_findings (id, record_id, order_id, final_order_id, case_name, category, scenario_title, factual_pattern, allegation_text, provisions_considered_raw, noticee_actor_names, finding_status, interim_paragraph_references, final_paragraph_references, qualification, official_source_url, transaction_types, actor_roles, evidence_types, alleged_conduct, evidentiary_gaps) values (` +
        [
          sqlString(uuid),
          sqlString(f.recordId),
          orderId ? sqlString(orderId) : "NULL",
          finalOrderUuid ? sqlString(finalOrderUuid) : "NULL",
          sqlString(f.caseName),
          sqlString(f.category),
          sqlString(f.scenarioTitle),
          sqlString(f.factualPattern),
          sqlString(f.factualPattern),
          sqlString(f.provisionsConsideredRaw),
          sqlTextArray(f.noticeeActors),
          sqlEnum(FINDING_STATUS_TO_ENUM[f.findingStatus]!),
          sqlString(f.interimParagraphReferences),
          sqlString(f.finalParagraphReferences),
          sqlString(f.qualification),
          sqlString(f.officialSourceUrl),
          sqlTextArray(f.transactionTypes),
          sqlTextArray(f.actorRoles),
          sqlTextArray(f.evidenceTypes),
          sqlTextArray(f.allegedConduct),
          sqlTextArray(f.evidentiaryGaps),
        ].join(", ") +
        `) on conflict (record_id) do update set factual_pattern = excluded.factual_pattern, finding_status = excluded.finding_status, interim_paragraph_references = excluded.interim_paragraph_references, final_paragraph_references = excluded.final_paragraph_references, qualification = excluded.qualification;`
    );
  }
  push("");

  push("-- finding_provisions");
  for (const f of precedent.scenarioFindings) {
    const relationship = provisionRelationshipForFinding(f.findingStatus);
    for (const provisionId of f.provisionIds) {
      push(
        `insert into finding_provisions (finding_id, provision_id, relationship) values ((select id from scenario_findings where record_id = ${sqlString(
          f.recordId
        )}), (select id from legal_provisions where canonical_id = ${sqlString(provisionId)}), ${sqlEnum(
          relationship
        )}) on conflict (finding_id, provision_id) do update set relationship = excluded.relationship;`
      );
    }
  }
  push("");

  // ---- order_directions -----------------------------------------------------
  push("-- order_directions");
  push("delete from order_directions;");
  for (const d of precedent.directions) {
    const order = precedent.orders.find(
      (o) => o.caseName === d.caseName && o.orderStage.toLowerCase().startsWith(d.stage.toLowerCase())
    );
    const orderUuid = order ? pilotOrderIdByOrderId.get(order.id) : undefined;
    push(
      `insert into order_directions (order_id, case_name, stage, direction_or_outcome, paragraph_reference, official_source_url) values (${
        orderUuid ? sqlString(orderUuid) : "NULL"
      }, ${sqlString(d.caseName)}, ${sqlString(d.stage)}, ${sqlString(d.directionOrOutcome)}, ${sqlString(
        d.paragraphReference
      )}, ${sqlString(d.officialSourceUrl)});`
    );
  }
  push("");

  // ---- residual_register -----------------------------------------------------
  push("-- residual_register (exclusion / pending-link only — never orders/scenario_findings)");
  push("delete from residual_register;");
  for (const r of residual.rows) {
    push(
      `insert into residual_register (case_or_order_name, order_identifier, official_url, reason, status) values (${sqlString(
        r.caseOrOrderName
      )}, ${sqlString(r.orderIdentifier)}, ${sqlString(r.officialUrl)}, ${sqlString(r.reason)}, ${sqlEnum(
        r.status
      )});`
    );
  }
  push("");

  // ---- validation_issues -------------------------------------------------
  push("-- validation_issues");
  for (const v of verified.rows) {
    const pilotOrder = precedent.orders.find((o) => o.officialUrl === v.officialUrl);
    if (pilotOrder) continue; // no issue for the 3 already legally-reviewed orders
    const uuid = orderUuidByUrl.get(v.officialUrl)!;
    push(
      `insert into validation_issues (order_id, issue_type, severity, description, source_row_ref) values (${sqlString(
        uuid
      )}, 'retrieval_failed', 'warning', ${sqlString(NETWORK_BLOCK_REASON)}, ${sqlString(
        `${v.caseName} — ${v.orderIdentifier}`
      )});`
    );
  }
  for (const r of residual.rows) {
    if (r.status === "pending_link") {
      push(
        `insert into validation_issues (issue_type, severity, description, source_row_ref) values ('residual_pending_link', 'info', ${sqlString(
          r.reason
        )}, ${sqlString(r.caseOrOrderName)});`
      );
    }
  }
  push("");

  // ---- processing_runs ----------------------------------------------------
  push("-- processing_runs");
  push(
    `insert into processing_runs (run_type, finished_at, orders_processed, successes, failures, summary) values ('import_verified_orders', now(), ${verified.rows.length}, ${
      verified.rows.filter((v) => precedent.orders.some((o) => o.officialUrl === v.officialUrl)).length
    }, ${verified.rows.filter((v) => !precedent.orders.some((o) => o.officialUrl === v.officialUrl)).length}, 'Imported all 89 rows from Verified_CFID_Order_Links.xlsx as orders. 3 orders matched the pre-existing deep-analyzed pilot library (stage=legally_reviewed). The remaining 86 could not be retrieved: sebi.gov.in is not reachable from this execution environment (network egress policy denial), so they are recorded as stage=retrieval_failed rather than fabricated.');`
  );
  push(
    `insert into processing_runs (run_type, finished_at, orders_processed, successes, failures, summary) values ('import_residual', now(), ${residual.rows.length}, ${residual.rows.length}, 0, 'Imported all 37 rows from Residual_Order_Links.xlsx into residual_register as an exclusion/pending-link register only. None were imported as orders or scenario_findings.');`
  );
  push(
    `insert into processing_runs (run_type, finished_at, orders_processed, successes, failures, summary) values ('import_pilot_library', now(), ${precedent.orders.length}, ${precedent.orders.length}, 0, 'Migrated the existing human-curated CFID_Precedent_Library_Pilot.xlsx analysis (3 orders, 34 scenario findings, 25 provisions, 6 legal tests, 11 directions) into the relational schema, stage=legally_reviewed.');`
  );

  push("");
  push("commit;");

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join("\n") + "\n", "utf-8");
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Orders: ${verified.rows.length} | Findings: ${precedent.scenarioFindings.length} | Provisions: ${precedent.provisions.length} | Residual: ${residual.rows.length}`);
}

main();
