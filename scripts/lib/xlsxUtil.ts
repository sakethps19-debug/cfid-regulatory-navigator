import * as XLSX from "xlsx";
import path from "node:path";

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const PRECEDENT_WORKBOOK_PATH = path.join(REPO_ROOT, "CFID_Precedent_Library_Pilot.xlsx");
export const VERIFIED_ORDERS_WORKBOOK_PATH = path.join(REPO_ROOT, "Verified_CFID_Order_Links.xlsx");
export const RESIDUAL_ORDERS_WORKBOOK_PATH = path.join(REPO_ROOT, "Residual_Order_Links.xlsx");

export function readWorkbook(filePath: string): XLSX.WorkBook {
  return XLSX.readFile(filePath, { cellDates: true });
}

export function sheetRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][];
}

export function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isoDate(value);
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function isoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = typeof value === "string" ? value.trim() : null;
  if (text && /^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return null;
}

/** Cases with a full scenario-finding analysis in CFID_Precedent_Library_Pilot.xlsx. */
export const DEEP_ANALYZED_CASE_PATTERNS = [/rajesh exports/i, /seacoast shipping/i];

export function isUrl(value: unknown): boolean {
  const text = cellText(value);
  return !!text && /^https?:\/\//i.test(text);
}

/**
 * Find the header row index within `rows` whose first cell equals one of
 * `expectedFirstCell` (case-insensitive). Throws if not found, so a workbook
 * layout change is caught immediately rather than silently mis-parsed.
 */
export function findHeaderRowIndex(rows: unknown[][], expectedFirstCell: string): number {
  const idx = rows.findIndex((row) => cellText(row[0])?.toLowerCase() === expectedFirstCell.toLowerCase());
  if (idx === -1) {
    throw new Error(`Header row starting with "${expectedFirstCell}" not found`);
  }
  return idx;
}

/**
 * Verified_CFID_Order_Links.xlsx and Residual_Order_Links.xlsx encode
 * "Case name — Order identifier" in a single cell, separated by an em dash
 * (U+2014) with surrounding spaces. Splits on the first occurrence (order
 * identifiers never contain an em dash in these workbooks). Returns
 * orderIdentifier: null when the cell has no em dash (case name only).
 */
export function splitCaseAndOrderIdentifier(text: string): { caseName: string; orderIdentifier: string | null } {
  const idx = text.indexOf("—");
  if (idx === -1) return { caseName: text.trim(), orderIdentifier: null };
  return {
    caseName: text.slice(0, idx).trim(),
    orderIdentifier: text.slice(idx + 1).trim(),
  };
}
