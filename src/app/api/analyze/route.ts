import { NextResponse, type NextRequest } from "next/server";
import { analyzeScenario } from "@/lib/matching/engine";
import { applySemanticAssist } from "@/lib/matching/fuzzyMatch";
import {
  getLegalTests,
  getOrders,
  getProvisionVersionsByProvisionId,
  getProvisions,
  getScenarioFindings,
  searchScenarioFindingsFullText,
} from "@/lib/data";

const MAX_SCENARIO_LENGTH = 4000;

export async function POST(request: NextRequest) {
  let body: {
    freeText?: unknown;
    actorSignal?: unknown;
    scenarioTypeSignal?: unknown;
    evidenceSignal?: unknown;
    conductPeriod?: unknown;
    entityOrIssuer?: unknown;
    amountInvolved?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const freeText = typeof body.freeText === "string" ? body.freeText.slice(0, MAX_SCENARIO_LENGTH) : "";
  if (!freeText.trim()) {
    return NextResponse.json({ error: "Please describe a factual scenario." }, { status: 400 });
  }
  const actorSignal = typeof body.actorSignal === "string" && body.actorSignal ? body.actorSignal : null;
  const scenarioTypeSignal =
    typeof body.scenarioTypeSignal === "string" && body.scenarioTypeSignal ? body.scenarioTypeSignal : null;
  const evidenceSignal = typeof body.evidenceSignal === "string" && body.evidenceSignal ? body.evidenceSignal : null;
  const MAX_DESCRIPTIVE_FIELD_LENGTH = 200;
  const conductPeriod =
    typeof body.conductPeriod === "string" && body.conductPeriod ? body.conductPeriod.slice(0, MAX_DESCRIPTIVE_FIELD_LENGTH) : null;
  const entityOrIssuer =
    typeof body.entityOrIssuer === "string" && body.entityOrIssuer ? body.entityOrIssuer.slice(0, MAX_DESCRIPTIVE_FIELD_LENGTH) : null;
  const amountInvolved =
    typeof body.amountInvolved === "string" && body.amountInvolved ? body.amountInvolved.slice(0, MAX_DESCRIPTIVE_FIELD_LENGTH) : null;

  // Same typo-correction pre-pass the matching engine applies internally
  // (see lib/matching/fuzzyMatch.ts) is applied here too, so the Postgres
  // full-text fallback search benefits from it as well — a misspelled
  // "prefrential allotment" should not silently skip the full-text
  // supplemental search just because the raw query doesn't match anything.
  const { correctedText } = applySemanticAssist(freeText);

  const [scenarioFindings, provisions, legalTests, provisionVersionsByProvisionId, fullTextCandidates, orders] = await Promise.all([
    getScenarioFindings(),
    getProvisions(),
    getLegalTests(),
    getProvisionVersionsByProvisionId(),
    searchScenarioFindingsFullText(correctedText),
    getOrders(),
  ]);
  const result = analyzeScenario(
    { freeText, actorSignal, scenarioTypeSignal, evidenceSignal, conductPeriod, entityOrIssuer, amountInvolved },
    scenarioFindings,
    provisions,
    legalTests,
    provisionVersionsByProvisionId,
    fullTextCandidates,
    orders
  );
  return NextResponse.json(result);
}
