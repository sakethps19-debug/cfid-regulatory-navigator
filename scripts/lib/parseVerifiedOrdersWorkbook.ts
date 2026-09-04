import type { Order, VerifiedCfidOrderRow } from "../../src/types/domain";
import {
  cellText,
  DEEP_ANALYZED_CASE_PATTERNS,
  findHeaderRowIndex,
  isUrl,
  readWorkbook,
  sheetRows,
  splitCaseAndOrderIdentifier,
  VERIFIED_ORDERS_WORKBOOK_PATH,
} from "./xlsxUtil";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseVerifiedOrdersWorkbook(
  orders: Order[],
  filePath: string = VERIFIED_ORDERS_WORKBOOK_PATH
): { rows: VerifiedCfidOrderRow[]; warnings: string[] } {
  const workbook = readWorkbook(filePath);
  const rows = sheetRows(workbook, "Verified CFID Orders");
  const headerIdx = findHeaderRowIndex(rows, "Order name / CFID identifier");
  const warnings: string[] = [];
  const out: VerifiedCfidOrderRow[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(headerIdx + 1)) {
    const combined = cellText(row[0]);
    if (!combined) continue;
    const officialUrl = cellText(row[1]) ?? "";
    if (!isUrl(officialUrl)) {
      warnings.push(`Verified CFID Orders: missing/invalid official URL for "${combined}"`);
    }

    const { caseName, orderIdentifier } = splitCaseAndOrderIdentifier(combined);
    if (!orderIdentifier) {
      warnings.push(`Verified CFID Orders: could not split case name / order identifier for "${combined}"`);
    }
    const cfidConfirmed = /CFID/i.test(orderIdentifier ?? "");
    if (!cfidConfirmed) {
      warnings.push(`Verified CFID Orders: order identifier does not contain "CFID" for "${combined}" — should not be in this workbook`);
    }

    const isDeepAnalyzed = DEEP_ANALYZED_CASE_PATTERNS.some((p) => p.test(caseName));
    const linkedOrderIds = isDeepAnalyzed
      ? orders.filter((o) => o.orderNumber.trim() === (orderIdentifier ?? "").trim()).map((o) => o.id)
      : [];
    if (isDeepAnalyzed && linkedOrderIds.length === 0) {
      warnings.push(`Verified CFID Orders: "${combined}" looks deep-analyzed by case name but its order identifier did not match any Order Master row`);
    }

    // Truncate the case-name portion (not the order-identifier portion) so
    // two rows for the same long-named case with different order numbers
    // don't collapse to the same id once truncated.
    const id = `${slugify(caseName).slice(0, 60)}-${slugify(orderIdentifier ?? combined)}`;
    if (seen.has(id)) {
      warnings.push(`Verified CFID Orders: duplicate row id "${id}" for "${combined}"`);
    }
    seen.add(id);

    out.push({
      id,
      caseName,
      orderIdentifier: orderIdentifier ?? combined,
      officialUrl,
      cfidConfirmed,
      analysisStatus: isDeepAnalyzed ? "deep_analyzed" : "verified_pending_analysis",
      linkedOrderIds,
    });
  }

  return { rows: out, warnings };
}
