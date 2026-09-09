import Link from "next/link";
import type { FixedScenario } from "@/data/curated/fixed-scenarios";
import { Card } from "@/components/Card";

/** Compare Scenarios landing: officer selects the broad legal/factual
 * issue to compare across matters. Reuses FIXED_SCENARIOS verbatim (the
 * same taxonomy Fixed Scenario Analysis, Case Detail, and Case Journey
 * already draw on) -- no second taxonomy, no search-as-filter, just the
 * existing curated list. A scenario with zero currently-mapped orders is
 * still shown (never hidden), with an honest "no captured orders" count
 * rather than being silently omitted -- an officer should be able to see
 * that a scenario exists in the taxonomy even where the corpus doesn't
 * yet evidence it. */
export function CompareScenariosLandingClient({
  scenarios,
}: {
  scenarios: { scenario: FixedScenario; orderCount: number; matterCount: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {scenarios.map(({ scenario, orderCount, matterCount }) => (
        <Link key={scenario.id} href={`/compare-scenarios/${scenario.id}`}>
          <Card className="flex h-full flex-col transition hover:ring-1 hover:ring-[var(--color-gold-600)]">
            {scenario.product && (
              <span className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">{scenario.product}</span>
            )}
            <h2 className="font-serif text-base font-semibold text-[var(--color-ink-900)]">{scenario.name}</h2>
            <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-[var(--color-ink-700)]">{scenario.explanation}</p>
            <p className="mt-3 text-xs text-[var(--color-ink-500)]">
              {orderCount === 0
                ? "No captured orders currently mapped to this scenario"
                : `${orderCount} order${orderCount === 1 ? "" : "s"} across ${matterCount} matter${matterCount === 1 ? "" : "s"}`}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
