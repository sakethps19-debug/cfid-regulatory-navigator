/**
 * Validation command. Reads the generated JSON in src/data/generated/
 * (produced by `npm run import:data`) and writes a validation report to
 * validation-report.md and validation-report.json at the repo root.
 *
 * Usage: npm run validate:data
 */
import fs from "node:fs";
import path from "node:path";
import type { AwaitingAnalysisRow, LegalProvision, Order, ScenarioFinding } from "../src/types/domain";
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
  const awaitingAnalysis = readJson<AwaitingAnalysisRow[]>("awaitingAnalysis.json");

  const invalidOrMissingUrls: string[] = [];
  for (const o of orders) {
    if (!isValidUrl(o.officialUrl)) invalidOrMissingUrls.push(`Order ${o.id}: "${o.officialUrl || "(empty)"}"`);
  }
  for (const f of scenarioFindings) {
    if (!isValidUrl(f.officialSourceUrl)) invalidOrMissingUrls.push(`Scenario finding ${f.recordId}: "${f.officialSourceUrl || "(empty)"}"`);
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
  const duplicateRecords: string[] = [...seenRecordIds.entries()].filter(([, n]) => n > 1).map(([id]) => id);

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

  const rowsRequiringManualReview = awaitingAnalysis.filter((r) => r.reviewFlag).length;
  const nonCfidOrders = awaitingAnalysis.filter((r) => r.status === "links_pending_review").length;
  const rowsMarkedNoOrder = awaitingAnalysis.filter((r) => r.status === "no_order").length;

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
    nonCfidOrders,
    rowsMarkedNoOrder,
  };

  fs.writeFileSync(path.join(REPO_ROOT, "validation-report.json"), JSON.stringify(report, null, 2) + "\n", "utf-8");

  const md = `# CFID Regulatory Navigator — Data Validation Report

Generated: ${report.generatedAt}

This report is produced by \`npm run validate:data\` from the JSON generated
by \`npm run import:data\` out of \`CFID_Precedent_Library_Pilot.xlsx\` and
\`Links.xlsx\`. Neither source workbook is modified by either script.

## Summary

| Metric | Count |
| --- | --- |
| Imported orders | ${report.importedOrders} |
| Scenario findings | ${report.scenarioFindings} |
| Invalid or missing URLs | ${invalidOrMissingUrls.length} |
| Missing paragraph references | ${missingParagraphReferences.length} |
| Unknown provisions | ${unknownProvisions.length} |
| Duplicate records | ${duplicateRecords.length} |
| Conflicting findings | ${conflictingFindings.length} |
| Orders-Awaiting-Analysis rows requiring manual review | ${rowsRequiringManualReview} |
| Non-CFID / unverified orders (Links.xlsx, has link but unverified) | ${nonCfidOrders} |
| Rows marked "No order" | ${rowsMarkedNoOrder} |

## Invalid or missing URLs
${invalidOrMissingUrls.length ? invalidOrMissingUrls.map((s) => `- ${s}`).join("\n") : "None."}

## Missing paragraph references
${missingParagraphReferences.length ? missingParagraphReferences.map((s) => `- ${s}`).join("\n") : "None."}

## Unknown provisions
${unknownProvisions.length ? unknownProvisions.map((s) => `- ${s}`).join("\n") : "None — every Provision Index row maps to a curated id/pattern."}

## Duplicate records
${duplicateRecords.length ? duplicateRecords.map((s) => `- ${s}`).join("\n") : "None — the import script also throws on duplicate Record IDs, so this list will always be empty for a successful import."}

## Conflicting findings
${conflictingFindings.length ? conflictingFindings.map((s) => `- ${s}`).join("\n") : "None — no two findings share a case + scenario title with different statuses."}

## Orders Awaiting Analysis — rows requiring manual review
${rowsRequiringManualReview} of ${awaitingAnalysis.length} rows in Links.xlsx are flagged for manual review before any admission to the precedent library:
- ${nonCfidOrders} row(s) have at least one order link but the order number has not yet been verified to contain "CFID".
- ${rowsMarkedNoOrder} row(s) are marked "No order"/"No CFID Order" or have no link at all.

No row has been deleted. See the "Orders Awaiting Analysis" page in the application for the full register.
`;

  fs.writeFileSync(path.join(REPO_ROOT, "validation-report.md"), md, "utf-8");

  console.log(md);
  console.log("Wrote validation-report.md and validation-report.json");
}

main();
