import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { CompareScenariosResultClient } from "@/components/CompareScenariosResultClient";
import { directionsForOrderIds, getMatters, getOrders, getProvisions, getScenarioFindings } from "@/lib/data";
import { buildScenarioComparison, findingsForScenario, getComparableScenario, summarizeScenarioComparison } from "@/lib/scenarioComparison";

export default async function CompareScenariosResultPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const scenario = getComparableScenario(scenarioId);
  if (!scenario) notFound();

  const [orders, findings, matters, provisions] = await Promise.all([getOrders(), getScenarioFindings(), getMatters(), getProvisions()]);
  const matterById = new Map(matters.map((m) => [m.id, m]));
  const matched = findingsForScenario(scenario.id, findings);
  const matchedOrderIds = [...new Set(matched.flatMap((f) => f.orderIds))];
  const directions = await directionsForOrderIds(matchedOrderIds);
  const directionsByOrderId = new Map<string, typeof directions>();
  for (const d of directions) {
    if (!d.orderId) continue;
    const list = directionsByOrderId.get(d.orderId) ?? [];
    list.push(d);
    directionsByOrderId.set(d.orderId, list);
  }

  const rows = buildScenarioComparison(scenario.id, orders, findings, directionsByOrderId, matterById);
  const summary = summarizeScenarioComparison(rows);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        <Link href="/compare-scenarios" className="text-[var(--color-gold-700)] hover:underline">
          ← Compare Scenarios
        </Link>
      </div>
      <PageHeader title={scenario.name} description={scenario.explanation} />

      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Corpus counts (descriptive only)</p>
        <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-xs text-[var(--color-ink-500)]">Matters</dt>
            <dd className="text-lg font-semibold text-[var(--color-ink-900)]">{summary.mattersRepresented}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-500)]">Orders</dt>
            <dd className="text-lg font-semibold text-[var(--color-ink-900)]">{summary.ordersRepresented}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-500)]">Final orders</dt>
            <dd className="text-lg font-semibold text-[var(--color-ink-900)]">{summary.finalOrders}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-500)]">Interim/confirmatory/special</dt>
            <dd className="text-lg font-semibold text-[var(--color-ink-900)]">{summary.interimConfirmatorySpecialOrders}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-500)]">Established / partly established</dt>
            <dd className="text-lg font-semibold text-[var(--color-ink-900)]">{summary.establishedOrPartlyEstablishedFindings}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-500)]">Not established</dt>
            <dd className="text-lg font-semibold text-[var(--color-ink-900)]">{summary.notEstablishedFindings}</dd>
          </div>
        </dl>
        <p className="mt-3 max-w-3xl text-xs text-[var(--color-ink-500)] xl:max-w-4xl 2xl:max-w-5xl">
          Descriptive corpus counts only, not a rate or a legal probability. Historical treatment is context-specific: inclusion of a matter in
          this comparison does not mean the same provision or outcome applies to another factual scenario.
        </p>
      </Card>

      <CompareScenariosResultClient rows={rows} provisions={provisions} />
    </div>
  );
}
