/**
 * Validation command. Reads the generated JSON in src/data/generated/
 * (produced by `npm run import:data`) and writes a validation report to
 * validation-report.md and validation-report.json at the repo root.
 *
 * Usage: npm run validate:data
 */
import fs from "node:fs";
import path from "node:path";
import type { LegalProvision, Order, ResidualOrderRow, ScenarioFinding, VerifiedCfidOrderRow } from "../src/types/domain";
import { REPO_ROOT } from "./lib/xlsxUtil";

const GENERATED_DIR = path.join(REPO_ROOT, "src", "data", "generated");

function readJson<T>(fileName: string): T {
  const filePath = path.join(GENERATED_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${fileName} not found — run \`npm run import:data\` first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function isValidUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  return /sebi\.gov\.in/i.test(url);
}

function main() {
  const orders = readJson<Order[]>("orders.json");
  const scenarioFindings = readJson<ScenarioFinding[]>("scenarioFindings.json");
  const provisions = readJson<LegalProvision[]>("provisions.json");
  const verifiedCfidOrders = readJson<VerifiedCfidOrderRow[]>("verifiedCfidOrders.json");
  const residualOrders = readJson<ResidualOrderRow[]>("residualOrders.json");

  const invalidOrMissingUrls: string[] = [];
  for (const o of orders) {
    if (!isValidUrl(o.officialUrl)) invalidOrMissingUrls.push(`Order ${o.id}: "${o.officialUrl || "(empty)"}"`);
  }
  for (const f of scenarioFindings) {
    if (!isValidUrl(f.officialSourceUrl)) invalidOrMissingUrls.push(`Scenario finding ${f.recordId}: "${f.officialSourceUrl || "(empty)"}"`);
  }
  for (const v of verifiedCfidOrders) {
    if (!isValidUrl(v.officialUrl)) invalidOrMissingUrls.push(`Verified CFID order "${v.caseName} — ${v.orderIdentifier}": "${v.officialUrl || "(empty)"}"`);
  }

  const missingParagraphReferences: string[] = scenarioFindings
    .filter((f) => !f.interimParagraphReferences && !f.finalParagraphReferences)
    .map((f) => f.recordId);

  const unknownProvisions: string[] = provisions
    .filter((p) => p.id.startsWith("UNMAPPED-"))
    .map((p) => `${p.instrument} ${p.provisionNumber}`);

  const seenRecordIds = new Map<string, number>();
  for (const f of scenarioFindings) {
    seenRecordIds.set(f.recordId, (seenRecordIds.get(f.recordId) ?? 0) + 1);
  }
  const seenVerifiedIds = new Map<string, number>();
  for (const v of verifiedCfidOrders) {
    seenVerifiedIds.set(v.id, (seenVerifiedIds.get(v.id) ?? 0) + 1);
  }
  const duplicateRecords: string[] = [
    ...[...seenRecordIds.entries()].filter(([, n]) => n > 1).map(([id]) => `scenario finding ${id}`),
    ...[...seenVerifiedIds.entries()].filter(([, n]) => n > 1).map(([id]) => `verified order ${id}`),
  ];

  const byTitle = new Map<string, ScenarioFinding[]>();
  for (const f of scenarioFindings) {
    const key = `${f.caseName}::${f.scenarioTitle}`.toLowerCase();
    byTitle.set(key, [...(byTitle.get(key) ?? []), f]);
  }
  const conflictingFindings: string[] = [];
  for (const [key, group] of byTitle.entries()) {
    if (group.length > 1) {
      const statuses = new Set(group.map((g) => g.findingStatus));
      if (statuses.size > 1) {
        conflictingFindings.push(`${key}: ${group.map((g) => `${g.recordId}=${g.findingStatus}`).join(", ")}`);
      }
    }
  }

  const nonCfidVerifiedRows = verifiedCfidOrders.filter((v) => !v.cfidConfirmed).length;
  const verifiedCasesPendingAnalysis = verifiedCfidOrders.filter((v) => v.analysisStatus === "verified_pending_analysis").length;
  const residualPendingLink = residualOrders.filter((r) => r.status === "pending_link").length;
  const residualDuplicates = residualOrders.filter((r) => r.status === "duplicate_of_verified").length;
  const residualNotCfid = residualOrders.filter((r) => r.status === "not_cfid").length;
  const rowsRequiringManualReview = verifiedCasesPendingAnalysis + residualPendingLink;

  if (nonCfidVerifiedRows > 0) {
    invalidOrMissingUrls.push(`${nonCfidVerifiedRows} row(s) in Verified_CFID_Order_Links.xlsx do not actually contain "CFID" in their order identifier — review this workbook.`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    importedOrders: orders.length,
    scenarioFindings: scenarioFindings.length,
    invalidOrMissingUrls,
    missingParagraphReferences,
    unknownProvisions,
    duplicateRecords,
    conflictingFindings,
    rowsRequiringManualReview,
    verifiedCfidOrderRows: verifiedCfidOrders.length,
    verifiedCasesPendingAnalysis,
    residualPendingLink,
    residualDuplicates,
    residualNotCfid,
  };

  fs.writeFileSync(path.join(REPO_ROOT, "validation-report.json"), JSON.stringify(report, null, 2) + "\n", "utf-8");

  const md = `# CFID Regulatory Navigator — Data Validation Report

Generated: ${report.generatedAt}

This report is produced by \`npm run validate:data\` from the JSON generated
by \`npm run import:data\` out of \`CFID_Precedent_Library_Pilot.xlsx\`,
\`Verified_CFID_Order_Links.xlsx\` (authoritative CFID order list) and
\`Residual_Order_Links.xlsx\` (exclusion / pending-link register only). The
original \`Links.xlsx\` compilation is no longer used. None of the source
workbooks are modified by either script.

## Summary

| Metric | Count |
| --- | --- |
| Imported orders (deep scenario-finding analysis) | ${report.importedOrders} |
| Scenario findings | ${report.scenarioFindings} |
| Verified CFID order rows (Verified_CFID_Order_Links.xlsx) | ${report.verifiedCfidOrderRows} |
| Verified cases awaiting detailed scenario analysis | ${report.verifiedCasesPendingAnalysis} |
| Residual — awaiting link from user | ${report.residualPendingLink} |
| Residual — duplicate of a verified order | ${report.residualDuplicates} |
| Residual — confirmed not a CFID order | ${report.residualNotCfid} |
| Invalid or missing URLs | ${invalidOrMissingUrls.length} |
| Missing paragraph references | ${missingParagraphReferences.length} |
| Unknown provisions | ${unknownProvisions.length} |
| Duplicate records | ${duplicateRecords.length} |
| Conflicting findings | ${conflictingFindings.length} |
| Rows requiring manual review | ${rowsRequiringManualReview} |

## Invalid or missing URLs
${invalidOrMissingUrls.length ? invalidOrMissingUrls.map((s) => `- ${s}`).join("\n") : "None."}

## Missing paragraph references
${missingParagraphReferences.length ? missingParagraphReferences.map((s) => `- ${s}`).join("\n") : "None."}

## Unknown provisions
${unknownProvisions.length ? unknownProvisions.map((s) => `- ${s}`).join("\n") : "None — every Provision Index row maps to a curated id/pattern."}

## Duplicate records
${duplicateRecords.length ? duplicateRecords.map((s) => `- ${s}`).join("\n") : "None — the import script also throws on duplicate scenario-finding Record IDs, so this list will always be empty for a successful import."}

## Conflicting findings
${conflictingFindings.length ? conflictingFindings.map((s) => `- ${s}`).join("\n") : "None — no two findings share a case + scenario title with different statuses."}

## Rows requiring manual review
${rowsRequiringManualReview} row(s) require manual review before any admission to the deep-analyzed precedent library:
- ${report.verifiedCasesPendingAnalysis} verified CFID order(s) confirmed genuine but not yet turned into scenario findings.
- ${report.residualPendingLink} residual entr(y/ies) still awaiting a link from the user.

${report.residualDuplicates} residual row(s) are duplicates of an order already counted once in the verified list (informational only, not a review item). ${report.residualNotCfid} residual row(s) were confirmed **not** CFID orders and are excluded from precedent use.

No row has been deleted. See the "Orders Awaiting Analysis" page in the application for the full register.
`;

  fs.writeFileSync(path.join(REPO_ROOT, "validation-report.md"), md, "utf-8");

  console.log(md);
  console.log("Wrote validation-report.md and validation-report.json");
}

main();
