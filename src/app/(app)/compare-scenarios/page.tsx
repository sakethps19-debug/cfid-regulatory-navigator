import { PageHeader } from "@/components/PageHeader";
import { CompareScenariosLandingClient } from "@/components/CompareScenariosLandingClient";
import { CorpusReviewStatusBanner } from "@/components/CorpusReviewStatusBanner";
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
        description="How has the same broad legal/factual issue been treated — across different matters, and across different stages/orders of the same matter? Select a scenario for a side-by-side comparison of every matched order, one row per order (so a matter with both an interim and a final order, e.g. Seacoast, shows both). Complementary to Case Journey, not a substitute for it: Case Journey follows one matter's own procedural chronology in depth; this page compares a chosen scenario across whichever orders and matters matched it, side by side. Not a legal-rule inference engine."
      />
      <CorpusReviewStatusBanner findings={findings} />
      <CompareScenariosLandingClient scenarios={scenarios} />
    </div>
  );
}
