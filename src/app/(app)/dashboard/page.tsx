import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import type { FindingStatus, Order, ScenarioFinding } from "@/types/domain";
import {
  getMatters,
  getOrderRelationships,
  getOrders,
  getProvisions,
  getScenarioFindings,
  getVerifiedCfidOrders,
} from "@/lib/data";
import { isDeepAnalyzed } from "@/lib/processingStages";

const STAT_ITEMS = [
  { label: "Orders indexed (case-library universe)", href: "/case-library" },
  { label: "Orders deeply analysed", href: "/library" },
  { label: "Scenario findings", href: "/provisions" },
  { label: "Provisions currently indexed", href: "/provisions" },
];

// Strict chronology, latest order first — no status priority, no preference
// for final over interim, no other selection logic. A finding's date is the
// latest orderDate among the orders it draws on; findings with no dated
// order (orderDate not yet captured) are excluded since they can't be placed
// in the sequence.
function pickRecentAndSignificant(
  findings: ScenarioFinding[],
  orders: Order[],
): { finding: ScenarioFinding; latestDate: string }[] {
  const orderDateById = new Map(orders.map((o) => [o.id, o.orderDate]));
  return findings
    .map((f) => {
      const dates = f.orderIds.map((id) => orderDateById.get(id)).filter((d): d is string => !!d);
      const latestDate = dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
      return { finding: f, latestDate };
    })
    .filter((x): x is { finding: ScenarioFinding; latestDate: string } => x.latestDate !== null)
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate))
    .slice(0, 6);
}

export default async function DashboardPage() {
  const [orders, provisions, scenarioFindings, verifiedCfidOrders, matters, orderRelationships] =
    await Promise.all([
      getOrders(),
      getProvisions(),
      getScenarioFindings(),
      getVerifiedCfidOrders(),
      getMatters(),
      getOrderRelationships(),
    ]);
  const deepAnalyzedOrders = orders.filter((o) => isDeepAnalyzed(o.processingStage));
  const counts = [orders.length, deepAnalyzedOrders.length, scenarioFindings.length, provisions.length];
  const statusCounts = scenarioFindings.reduce<Record<string, number>>((acc, f) => {
    acc[f.findingStatus] = (acc[f.findingStatus] ?? 0) + 1;
    return acc;
  }, {});
  const verifiedPendingCount = verifiedCfidOrders.filter((v) => v.analysisStatus === "verified_pending_analysis").length;
  const recentAndSignificant = pickRecentAndSignificant(scenarioFindings, orders);

  const ordersPerMatter = new Map<string, number>();
  for (const o of orders) {
    if (!o.matterId) continue;
    ordersPerMatter.set(o.matterId, (ordersPerMatter.get(o.matterId) ?? 0) + 1);
  }
  const mattersWithMultipleOrders = [...ordersPerMatter.values()].filter((n) => n > 1).length;
  const matterLinkingStats = [
    { label: "Matters indexed", value: matters.length },
    { label: "Matters with more than one order", value: mattersWithMultipleOrders },
    { label: "Related-order links recorded", value: orderRelationships.length },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${orders.length} orders are currently indexed as the case-library universe, each with a supplied official SEBI source link — this is not a claim that every related order has been found. ${deepAnalyzedOrders.length} of them have actually been opened, read, and deeply analysed into ${scenarioFindings.length} scenario findings with paragraph citations so far — none of that AI-assisted analysis has yet been legally reviewed by a CFID officer, which is a separate, further step. This is a research-assistance tool — it does not make findings of guilt.`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_ITEMS.map((item, i) => (
          <Link key={item.label} href={item.href}>
            <Card className="h-full transition hover:ring-[var(--color-gold-600)]">
              <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{counts[i]}</div>
              <div className="mt-1 text-sm text-[var(--color-ink-700)]">{item.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Scenario finding status breakdown</h2>
          <dl className="mt-4 space-y-2">
            {(Object.keys(statusCounts) as FindingStatus[])
              .sort((a, b) => statusCounts[b] - statusCounts[a])
              .map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <dt className="text-[var(--color-ink-700)]">{s}</dt>
                  <dd className="font-semibold text-[var(--color-ink-900)]">{statusCounts[s]}</dd>
                </div>
              ))}
          </dl>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Recent and significant findings</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
            The 6 most recently dated findings across all analysed orders, latest first — strict chronology only, no
            other ordering.
          </p>
          <ul className="mt-3 space-y-2">
            {recentAndSignificant.map(({ finding: f, latestDate }) => (
              <li key={f.recordId} className="rounded-lg border border-[var(--color-border)] p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={f.findingStatus} />
                  <span className="font-medium text-[var(--color-ink-900)]">{f.caseName}</span>
                  <span className="text-xs text-[var(--color-ink-500)]">{latestDate}</span>
                </div>
                <p className="mt-1 text-[var(--color-ink-700)]">{f.scenarioTitle}</p>
                <div className="mt-1">
                  <SourceLink href={f.officialSourceUrl} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {matterLinkingStats.map((s) => (
          <Card key={s.label}>
            <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{s.value}</div>
            <div className="mt-1 text-sm text-[var(--color-ink-700)]">{s.label}</div>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-ink-500)]">
        A matter can span several individual orders (interim, confirmatory, final, adjudication, or otherwise); most
        orders are not yet linked to a matter, and that count grows only as relationships already known from official
        sources are recorded — never guessed from company name or order dates.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Get started</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/analyzer" className="font-medium text-[var(--color-gold-700)] hover:underline">
                Analyze a scenario →
              </Link>{" "}
              <span className="text-[var(--color-ink-700)]">
                describe the facts and get every potentially relevant provision, across every instrument, with
                supporting and contrary precedents.
              </span>
            </li>
            <li>
              <Link href="/provisions" className="font-medium text-[var(--color-gold-700)] hover:underline">
                Browse the Provision Explorer →
              </Link>{" "}
              <span className="text-[var(--color-ink-700)]">search any provision by number, instrument, or the underlying facts.</span>
            </li>
            {verifiedPendingCount > 0 ? (
              <li>
                <Link href="/case-library" className="font-medium text-[var(--color-gold-700)] hover:underline">
                  {verifiedPendingCount} verified orders await extraction →
                </Link>{" "}
                <span className="text-[var(--color-ink-700)]">confirmed CFID orders not yet turned into scenario findings.</span>
              </li>
            ) : (
              <li>
                <span className="font-medium text-[var(--color-ink-700)]">All indexed orders are deep-analyzed.</span>{" "}
                <span className="text-[var(--color-ink-700)]">
                  Newly added orders go through the same process — see{" "}
                  <Link href="/awaiting-analysis" className="font-medium text-[var(--color-gold-700)] hover:underline">
                    Orders Awaiting Analysis
                  </Link>
                  .
                </span>
              </li>
            )}
          </ul>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">About this data</h2>
          <p className="mt-2 text-xs text-[var(--color-ink-500)]">
            Every count on this page is a live, uncached query against the database. The underlying orders,
            provisions and case law are sourced only from the official SEBI website, the official MCA website,
            official sources for notified accounting standards, and Supreme Court/SAT judgments obtained from their
            official sources — never law-firm articles, blogs, news reports, or commercial databases. See how the
            analysis is built, what it does and does not do, and its known limitations.
          </p>
          <Link href="/methodology" className="mt-3 inline-block text-sm font-medium text-[var(--color-gold-700)] hover:underline">
            Methodology &amp; Limitations →
          </Link>
        </Card>
      </div>
    </div>
  );
}
