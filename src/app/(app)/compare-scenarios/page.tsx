import { PageHeader } from "@/components/PageHeader";
import { CompareScenariosLandingClient } from "@/components/CompareScenariosLandingClient";
import { FIXED_SCENARIOS } from "@/data/curated/fixed-scenarios";
import { getMatters, getOrders, getScenarioFindings } from "@/lib/data";
import { buildScenarioComparison, summarizeScenarioComparison } from "@/lib/scenarioComparison";

export default async function CompareScenariosLandingPage() {
  const [orders, findings, matters] = await Promise.all([getOrders(), getScenarioFindings(), getMatters()]);
  const matterById = new Map(matters.map((m) => [m.id, m]));
  const emptyDirections = new Map<string, never[]>();

  const scenarios = FIXED_SCENARIOS.map((scenario) => {
    const rows = buildScenarioComparison(scenario.id, orders, findings, emptyDirections, matterById);
    const summary = summarizeScenarioComparison(rows);
    return { scenario, orderCount: summary.ordersRepresented, matterCount: summary.mattersRepresented };
  });

  return (
    <div>
      <PageHeader
        title="Compare Scenarios"
        description="How has the same broad legal/factual issue been treated across different matters and orders? Select a scenario to compare its captured historical treatment — this is not a cross-order chronology within one matter (see Case Journey for that) and not a legal-rule inference engine."
      />
      <CompareScenariosLandingClient scenarios={scenarios} />
    </div>
  );
}
