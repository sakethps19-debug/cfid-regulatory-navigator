import type { AwaitingAnalysisRow } from "../../src/types/domain";
import { cellText, findHeaderRowIndex, LINKS_WORKBOOK_PATH, readWorkbook, sheetRows } from "./xlsxUtil";

const NO_ORDER_MARKERS = ["no order", "no cfid order"];

// Cases already admitted into the verified precedent library from the pilot
// workbook — Links.xlsx rows for these cases are cross-referenced rather than
// re-queued for manual review.
const VERIFIED_LIBRARY_CASE_PATTERNS = [/rajesh exports/i, /seacoast shipping/i];

export function parseLinksWorkbook(filePath: string = LINKS_WORKBOOK_PATH): {
  rows: AwaitingAnalysisRow[];
  warnings: string[];
} {
  const workbook = readWorkbook(filePath);
  const rows = sheetRows(workbook, "Sheet1");
  const headerIdx = findHeaderRowIndex(rows, "Sr. No.");
  const warnings: string[] = [];
  const out: AwaitingAnalysisRow[] = [];
  const seenCaseIds = new Set<number>();

  for (const row of rows.slice(headerIdx + 1)) {
    const srNoText = cellText(row[0]);
    if (!srNoText) continue;
    const srNo = Number(srNoText);
    const caseId = Number(cellText(row[1]) ?? NaN);
    const caseName = cellText(row[2]) ?? "";
    const orderType = cellText(row[3]) ?? "";

    if (Number.isFinite(caseId)) {
      if (seenCaseIds.has(caseId)) {
        warnings.push(`Links.xlsx: duplicate Case ID ${caseId} (${caseName})`);
      }
      seenCaseIds.add(caseId);
    }

    const linkCells = [row[4], row[5], row[6], row[7], row[8]]
      .map((c) => cellText(c))
      .filter((c): c is string => !!c);
    const realLinks = linkCells.filter((c) => /^https?:\/\//i.test(c));
    const markedNoOrder = linkCells.some((c) => NO_ORDER_MARKERS.includes(c.toLowerCase()));

    const isAlreadyInLibrary = VERIFIED_LIBRARY_CASE_PATTERNS.some((p) => p.test(caseName));

    let status: AwaitingAnalysisRow["status"];
    let reviewFlag: boolean;
    let reviewReason: string | null;

    if (isAlreadyInLibrary) {
      status = "already_in_library";
      reviewFlag = false;
      reviewReason = "Already analysed and admitted to the verified CFID precedent library for this pilot (see Source Library).";
    } else if (realLinks.length === 0) {
      status = "no_order";
      reviewFlag = true;
      reviewReason = markedNoOrder
        ? "Source register marks this case as having no (CFID) order available."
        : "No order link is present in the source register.";
    } else {
      status = "links_pending_review";
      reviewFlag = true;
      reviewReason = "Order number not yet verified to contain \"CFID\"; requires manual verification before admission to the precedent library.";
    }

    out.push({
      srNo,
      caseId: Number.isFinite(caseId) ? caseId : -1,
      caseName,
      orderType,
      links: realLinks,
      status,
      reviewFlag,
      reviewReason,
    });
  }

  return { rows: out, warnings };
}
