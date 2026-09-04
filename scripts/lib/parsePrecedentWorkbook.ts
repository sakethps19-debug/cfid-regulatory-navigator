import type {
  Order,
  ScenarioFinding,
  LegalProvision,
  LegalTest,
  DirectionOutcome,
  FindingStatus,
  OrderStage,
} from "../../src/types/domain";
import { SCENARIO_TAG_OVERLAY } from "../../src/data/curated/scenario-tags";
import { PROVISION_PATTERNS } from "../../src/data/curated/provision-patterns";
import { cellText, findHeaderRowIndex, isUrl, isoDate, PRECEDENT_WORKBOOK_PATH, readWorkbook, sheetRows } from "./xlsxUtil";

export interface PrecedentWorkbookResult {
  orders: Order[];
  scenarioFindings: ScenarioFinding[];
  provisions: LegalProvision[];
  legalTests: LegalTest[];
  directions: DirectionOutcome[];
  warnings: string[];
}

const ORDER_STAGE_MAP: Record<string, OrderStage> = {
  "interim order": "Interim order",
  "interim order cum show cause notice": "Interim order cum show cause notice",
  "final order": "Final order",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function caseSlug(caseName: string): string {
  if (/rajesh exports/i.test(caseName)) return "rel";
  if (/seacoast/i.test(caseName)) return "sssl";
  return slugify(caseName).slice(0, 12);
}

function parseOrders(workbook: ReturnType<typeof readWorkbook>, warnings: string[]): Order[] {
  const rows = sheetRows(workbook, "Order Master");
  const headerIdx = findHeaderRowIndex(rows, "Case");
  const orders: Order[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const caseName = cellText(row[0]);
    if (!caseName) continue;
    const stageRaw = cellText(row[1]) ?? "";
    const stage = ORDER_STAGE_MAP[stageRaw.toLowerCase()];
    if (!stage) {
      warnings.push(`Order Master: unrecognized order stage "${stageRaw}" for case "${caseName}"`);
    }
    const orderNumber = cellText(row[3]) ?? "";
    const officialUrl = cellText(row[7]) ?? "";
    const id = `${caseSlug(caseName)}-${slugify(stage ?? stageRaw)}`.toUpperCase();
    orders.push({
      id,
      caseName,
      orderStage: stage ?? (stageRaw as OrderStage),
      orderDate: isoDate(row[2]) ?? "",
      orderNumber,
      authority: cellText(row[4]) ?? "",
      noticeesCount: Number(cellText(row[5]) ?? 0) || 0,
      officialUrl,
      cfidVerified: /CFID/.test(orderNumber),
      cfidVerificationBasis: /CFID/.test(orderNumber) ? "cfid_tag_in_order_number" : "needs_manual_verification",
      proceduralStatus: cellText(row[6]) ?? "",
      processingStage: "legally_reviewed",
      retrievalStatus: "retrieved",
      retrievalFailureReason: null,
      scopeNote: cellText(row[8]) ?? "",
      matterId: null,
      officialOrderTitle: null,
      normalizedMatterName: caseName,
    });
    if (!isUrl(officialUrl)) {
      warnings.push(`Order Master: missing/invalid official URL for "${caseName}" (${stage ?? stageRaw})`);
    }
    if (!/CFID/.test(orderNumber)) {
      warnings.push(`Order Master: order number for "${caseName}" (${stage ?? stageRaw}) does not contain "CFID" — should not be in the verified library`);
    }
  }
  return orders;
}

function matchedProvisionIds(text: string): string[] {
  return PROVISION_PATTERNS.filter((p) => new RegExp(p.matchPattern, "i").test(text)).map((p) => p.id);
}

function parseScenarioFindings(
  workbook: ReturnType<typeof readWorkbook>,
  orders: Order[],
  warnings: string[]
): ScenarioFinding[] {
  const rows = sheetRows(workbook, "Scenario Findings");
  const headerIdx = findHeaderRowIndex(rows, "Record ID");
  const findings: ScenarioFinding[] = [];
  const seenIds = new Set<string>();
  const validStatuses: FindingStatus[] = ["Alleged", "Prima facie", "Upheld", "Partly upheld", "Not upheld"];

  for (const row of rows.slice(headerIdx + 1)) {
    const recordId = cellText(row[0]);
    if (!recordId) continue;
    if (seenIds.has(recordId)) {
      throw new Error(`Duplicate Record ID in Scenario Findings: ${recordId}`);
    }
    seenIds.add(recordId);

    const caseName = cellText(row[1]) ?? "";
    const statusRaw = cellText(row[7]) ?? "";
    if (!validStatuses.includes(statusRaw as FindingStatus)) {
      warnings.push(`Scenario Findings ${recordId}: unrecognized status "${statusRaw}"`);
    }

    // The workbook has a data-entry quirk: rows for Rajesh Exports Limited
    // (which has no final order yet) carry the source URL in the
    // "Qualification / note" column (index 10) instead of "Official SEBI
    // source" (index 11), because no qualification text was needed. Detect
    // which column actually holds the URL rather than assuming a fixed
    // position, so no data is lost or misplaced.
    const col10 = cellText(row[10]);
    const col11 = cellText(row[11]);
    let officialSourceUrl: string;
    let qualification: string | null;
    if (col11 && isUrl(col11)) {
      officialSourceUrl = col11;
      qualification = col10;
    } else if (col10 && isUrl(col10)) {
      officialSourceUrl = col10;
      qualification = null;
    } else {
      officialSourceUrl = "";
      qualification = col10;
      warnings.push(`Scenario Findings ${recordId}: no official source URL found`);
    }

    const interimRefs = cellText(row[8]);
    const finalRefs = cellText(row[9]);
    if (!interimRefs && !finalRefs) {
      warnings.push(`Scenario Findings ${recordId}: missing both interim and final paragraph references`);
    }

    const orderIds = orders.filter((o) => o.caseName === caseName && (
      (o.orderStage === "Final order" && finalRefs) ||
      (o.orderStage !== "Final order" && interimRefs)
    )).map((o) => o.id);

    const provisionsConsideredRaw = cellText(row[5]) ?? "";
    const overlay = SCENARIO_TAG_OVERLAY.find((o) => o.recordId === recordId);
    if (!overlay) {
      warnings.push(`Scenario Findings ${recordId}: no curated fact-element tag overlay found`);
    }

    findings.push({
      recordId,
      caseName,
      orderIds,
      category: cellText(row[2]) ?? "",
      scenarioTitle: cellText(row[3]) ?? "",
      factualPattern: cellText(row[4]) ?? "",
      provisionsConsideredRaw,
      provisionIds: matchedProvisionIds(provisionsConsideredRaw),
      noticeeActors: (cellText(row[6]) ?? "").split(";").map((s) => s.trim()).filter(Boolean),
      findingStatus: (statusRaw as FindingStatus) ?? "Alleged",
      interimParagraphReferences: interimRefs,
      finalParagraphReferences: finalRefs,
      qualification,
      officialSourceUrl,
      transactionTypes: overlay?.transactionTypes ?? [],
      actorRoles: overlay?.actorRoles ?? [],
      evidenceTypes: overlay?.evidenceTypes ?? [],
      allegedConduct: overlay?.allegedConduct ?? [],
      evidentiaryGaps: overlay?.evidentiaryGaps ?? [],
      ingredientsNotEstablished: [],
      // These 34 findings come from the human-curated, already
      // legally-reviewed CFID_Precedent_Library_Pilot.xlsx — recording that
      // existing status as explicit flags, not a new claim.
      sourceDocumentVerified: true,
      paragraphCitationVerified: true,
      findingStatusVerified: true,
      provisionMappingVerified: true,
      noticeeMappingVerified: true,
      humanLegalReviewCompleted: true,
    });
  }
  return findings;
}

function parseProvisionIndex(workbook: ReturnType<typeof readWorkbook>, warnings: string[]): LegalProvision[] {
  const rows = sheetRows(workbook, "Provision Index");
  const headerIdx = findHeaderRowIndex(rows, "Instrument");
  const provisions: LegalProvision[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const instrument = cellText(row[0]);
    if (!instrument) continue;
    const provisionText = cellText(row[1]) ?? "";
    const curated = PROVISION_PATTERNS.find((p) => p.provisionColumnText === provisionText);
    if (!curated) {
      warnings.push(`Provision Index: unknown provision "${provisionText}" — no curated pattern/id found`);
    }
    provisions.push({
      id: curated?.id ?? `UNMAPPED-${slugify(provisionText)}`,
      instrument,
      provisionNumber: provisionText,
      subject: cellText(row[2]) ?? "",
      currentTextVerificationStatus: "Requires verification",
      officialSource: null,
      ordersConsidered: (cellText(row[3]) ?? "").split(";").map((s) => s.trim()).filter(Boolean),
      treatmentInPilotOrders: cellText(row[4]) ?? "",
      lawLibraryNote: cellText(row[5]) ?? "",
    });
  }
  return provisions;
}

function parseLegalTests(workbook: ReturnType<typeof readWorkbook>): LegalTest[] {
  const rows = sheetRows(workbook, "Legal Tests");
  const headerIdx = findHeaderRowIndex(rows, "Test / issue");
  return rows
    .slice(headerIdx + 1)
    .filter((row) => cellText(row[0]))
    .map((row, i) => ({
      id: `LT-${i + 1}`,
      provisionOrIssue: cellText(row[0]) ?? "",
      workingPrinciple: cellText(row[1]) ?? "",
      paragraphAnchors: cellText(row[2]) ?? "",
      implementationGuardrail: cellText(row[3]) ?? "",
    }));
}

function parseDirections(workbook: ReturnType<typeof readWorkbook>, warnings: string[]): DirectionOutcome[] {
  const rows = sheetRows(workbook, "Directions");
  const headerIdx = findHeaderRowIndex(rows, "Case");
  return rows
    .slice(headerIdx + 1)
    .filter((row) => cellText(row[0]))
    .map((row, i) => {
      const url = cellText(row[4]) ?? "";
      if (!isUrl(url)) warnings.push(`Directions row ${i + 1}: missing/invalid official URL`);
      return {
        id: `DIR-${i + 1}`,
        caseName: cellText(row[0]) ?? "",
        stage: cellText(row[1]) ?? "",
        directionOrOutcome: cellText(row[2]) ?? "",
        paragraphReference: cellText(row[3]) ?? "",
        officialSourceUrl: url,
      };
    });
}

export function parsePrecedentWorkbook(filePath: string = PRECEDENT_WORKBOOK_PATH): PrecedentWorkbookResult {
  const workbook = readWorkbook(filePath);
  const warnings: string[] = [];
  const orders = parseOrders(workbook, warnings);
  const scenarioFindings = parseScenarioFindings(workbook, orders, warnings);
  const provisions = parseProvisionIndex(workbook, warnings);
  const legalTests = parseLegalTests(workbook);
  const directions = parseDirections(workbook, warnings);
  return { orders, scenarioFindings, provisions, legalTests, directions, warnings };
}
