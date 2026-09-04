import type { ResidualEntryStatus, ResidualOrderRow } from "../../src/types/domain";
import { cellText, findHeaderRowIndex, readWorkbook, RESIDUAL_ORDERS_WORKBOOK_PATH, sheetRows, splitCaseAndOrderIdentifier } from "./xlsxUtil";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function classify(reason: string): ResidualEntryStatus {
  if (/^awaiting link/i.test(reason)) return "pending_link";
  if (/^duplicate reference/i.test(reason)) return "duplicate_of_verified";
  return "not_cfid";
}

export function parseResidualWorkbook(filePath: string = RESIDUAL_ORDERS_WORKBOOK_PATH): {
  rows: ResidualOrderRow[];
  warnings: string[];
} {
  const workbook = readWorkbook(filePath);
  const rows = sheetRows(workbook, "Residual");
  const headerIdx = findHeaderRowIndex(rows, "Order / case name");
  const warnings: string[] = [];
  const out: ResidualOrderRow[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(headerIdx + 1)) {
    const combined = cellText(row[0]);
    if (!combined) continue;
    const officialUrl = cellText(row[1]);
    const reason = cellText(row[2]);
    if (!reason) {
      warnings.push(`Residual: missing exclusion/pending reason for "${combined}"`);
    }

    const { caseName, orderIdentifier } = splitCaseAndOrderIdentifier(combined);
    const status = classify(reason ?? "");

    const id = `${slugify(caseName)}-${slugify(orderIdentifier ?? "")}`.slice(0, 120);
    const dedupedId = seen.has(id) ? `${id}-${seen.size}` : id;
    seen.add(dedupedId);

    out.push({
      id: dedupedId,
      caseOrOrderName: combined,
      orderIdentifier,
      officialUrl,
      reason: reason ?? "No reason recorded — flagged for manual review.",
      status,
    });
  }

  return { rows: out, warnings };
}
