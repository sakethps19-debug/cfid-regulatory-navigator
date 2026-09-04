import { NextResponse, type NextRequest } from "next/server";
import { analyzeScenario } from "@/lib/matching/engine";
import {
  getLegalTests,
  getProvisionVersionsByProvisionId,
  getProvisions,
  getScenarioFindings,
  searchScenarioFindingsFullText,
} from "@/lib/data";

const MAX_SCENARIO_LENGTH = 4000;

export async function POST(request: NextRequest) {
  let body: { freeText?: unknown; actorFilter?: unknown; transactionTypeFilter?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const freeText = typeof body.freeText === "string" ? body.freeText.slice(0, MAX_SCENARIO_LENGTH) : "";
  if (!freeText.trim()) {
    return NextResponse.json({ error: "Please describe a factual scenario." }, { status: 400 });
  }
  const actorFilter = typeof body.actorFilter === "string" && body.actorFilter ? body.actorFilter : null;
  const transactionTypeFilter =
    typeof body.transactionTypeFilter === "string" && body.transactionTypeFilter ? body.transactionTypeFilter : null;

  const [scenarioFindings, provisions, legalTests, provisionVersionsByProvisionId, fullTextCandidates] = await Promise.all([
    getScenarioFindings(),
    getProvisions(),
    getLegalTests(),
    getProvisionVersionsByProvisionId(),
    searchScenarioFindingsFullText(freeText),
  ]);
  const result = analyzeScenario(
    { freeText, actorFilter, transactionTypeFilter },
    scenarioFindings,
    provisions,
    legalTests,
    provisionVersionsByProvisionId,
    fullTextCandidates
  );
  return NextResponse.json(result);
}
