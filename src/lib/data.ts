import type {
  DirectionOutcome,
  LegalProvision,
  LegalTest,
  Order,
  PfutpFocusEntry,
  ResidualOrderRow,
  ScenarioFinding,
  VerifiedCfidOrderRow,
} from "@/types/domain";

import ordersJson from "@/data/generated/orders.json";
import scenarioFindingsJson from "@/data/generated/scenarioFindings.json";
import provisionsJson from "@/data/generated/provisions.json";
import legalTestsJson from "@/data/generated/legalTests.json";
import directionsJson from "@/data/generated/directions.json";
import pfutpFocusJson from "@/data/generated/pfutpFocus.json";
import verifiedCfidOrdersJson from "@/data/generated/verifiedCfidOrders.json";
import residualOrdersJson from "@/data/generated/residualOrders.json";
import metaJson from "@/data/generated/meta.json";

export const orders = ordersJson as Order[];
export const scenarioFindings = scenarioFindingsJson as ScenarioFinding[];
export const provisions = provisionsJson as LegalProvision[];
export const legalTests = legalTestsJson as LegalTest[];
export const directions = directionsJson as DirectionOutcome[];
export const pfutpFocus = pfutpFocusJson as PfutpFocusEntry[];
export const verifiedCfidOrders = verifiedCfidOrdersJson as VerifiedCfidOrderRow[];
export const residualOrders = residualOrdersJson as ResidualOrderRow[];
export const importMeta = metaJson as { generatedAt: string; sourceFiles: string[]; note: string };

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function getProvisionById(id: string): LegalProvision | undefined {
  return provisions.find((p) => p.id === id);
}

export function findingsForProvision(provisionId: string): ScenarioFinding[] {
  return scenarioFindings.filter((f) => f.provisionIds.includes(provisionId));
}

export function findingsForCase(caseName: string): ScenarioFinding[] {
  return scenarioFindings.filter((f) => f.caseName === caseName);
}

export function directionsForCase(caseName: string): DirectionOutcome[] {
  return directions.filter((d) => d.caseName === caseName);
}

export const caseNames = [...new Set(orders.map((o) => o.caseName))];

export const verifiedCasesPendingAnalysis = [
  ...new Map(
    verifiedCfidOrders
      .filter((v) => v.analysisStatus === "verified_pending_analysis")
      .map((v) => [v.caseName, v])
  ).values(),
];
