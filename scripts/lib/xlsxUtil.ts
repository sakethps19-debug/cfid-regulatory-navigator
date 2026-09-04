import * as XLSX from "xlsx";
import path from "node:path";

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const PRECEDENT_WORKBOOK_PATH = path.join(REPO_ROOT, "CFID_Precedent_Library_Pilot.xlsx");
export const LINKS_WORKBOOK_PATH = path.join(REPO_ROOT, "Links.xlsx");

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
