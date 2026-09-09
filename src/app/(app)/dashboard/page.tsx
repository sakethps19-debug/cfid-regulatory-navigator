import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import type { ScenarioFinding } from "@/types/domain";
import { getOrders, getScenarioFindings } from "@/lib/data";
import { formatDate } from "@/lib/formatDate";
import { orderGist } from "@/lib/orderGist";
import { pickRecentOrders } from "@/lib/pickRecentOrders";

// Officer Research Home (application-wide demo-readiness sprint): this page
// used to be a corpus-statistics dashboard (orders indexed, findings
// created, provisions catalogued, structured-analysis coverage percentages,
// matter-linking counts). Those are administrative corpus-management facts,
// not research tasks, and they told an investigating officer nothing about
// what to DO here. All of that now lives exclusively on the Admin
// Dashboard (/admin) for an authorized administrator. This page is
// reconceived as a task-first research home: what an officer can do, not
// how big the underlying corpus is.
//
// The "recent" list is genuine research content (what was recently
// indexed, at what procedural stage) and stays, but as a Recent Orders
// feed rather than one card per scenario finding — an order is this
// screen's unit of presentation. A single order that produced several
// scenario findings (e.g. Seacoast's 5) must appear once, not once per
// finding; the underlying findings remain fully broken out on the order's
// own detail page and throughout Analyze/Case Library/Admin, which is
// where that granularity belongs.
interface PrimaryTask {
  title: string;
  description: string;
  href: string;
  cta: string;
}

const PRIMARY_TASKS: PrimaryTask[] = [
  {
    title: "Analyze a Scenario",
    description: "Enter the facts as you understand them and identify the regulatory issues and provisions that warrant examination.",
    href: "/analyzer",
    cta: "Analyze a scenario →",
  },
  {
    title: "Search Cases",
    description: "Research indexed CFID matters, orders and the structured findings extracted from them.",
    href: "/case-library",
    cta: "Search cases →",
  },
  {
    title: "Explore Law",
    description: "Research a provision's text, verification status, and how CFID has historically considered it.",
    href: "/law-library",
    cta: "Explore the Law Library →",
  },
  {
    title: "Compare Precedents",
    description: "Compare factual patterns and outcomes side by side across two findings or orders.",
    href: "/compare",
    cta: "Compare precedents →",
  },
];

export default async function DashboardPage() {
  const [orders, scenarioFindings] = await Promise.all([getOrders(), getScenarioFindings()]);
  const recentOrders = pickRecentOrders(orders);
  const findingsByOrder = new Map<string, ScenarioFinding[]>();
  for (const f of scenarioFindings) {
    for (const orderId of f.orderIds) {
      findingsByOrder.set(orderId, [...(findingsByOrder.get(orderId) ?? []), f]);
    }
  }

  return (
    <div>
      <PageHeader
        title="Officer Research Home"
        description="A research-assistance tool for CFID investigation and adjudication support — it identifies potentially relevant provisions and historical treatment from the facts you enter; it does not determine whether a violation occurred. Do not enter confidential, unpublished, or market-sensitive investigation information into this pilot environment."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {PRIMARY_TASKS.map((task, i) => (
          <Link key={task.href} href={task.href}>
            <Card
              className={`h-full transition hover:ring-[var(--color-gold-600)] ${
                i === 0 ? "ring-1 ring-[var(--color-gold-600)]/60" : ""
              }`}
            >
              <h2 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">{task.title}</h2>
              <p className="mt-1.5 text-sm text-[var(--color-ink-700)]">{task.description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-[var(--color-gold-700)]">{task.cta}</span>
            </Card>
          </Link>
        ))}
      </div>

      {recentOrders.length > 0 && (
        <Card className="mt-8">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Recent orders</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">The most recently dated indexed orders, latest first, strict chronology only.</p>
          <ul className="mt-3 space-y-2">
            {recentOrders.map((o) => (
              <li key={o.id} className="rounded-lg border border-[var(--color-border)] p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <OrderStageBadge orderStage={o.orderStage} />
                  <Link href={`/orders/${o.id}`} className="font-medium text-[var(--color-ink-900)] hover:underline">
                    {o.caseName}
                  </Link>
                  <span className="text-xs text-[var(--color-ink-500)]">{formatDate(o.orderDate)}</span>
                </div>
                {(() => {
                  const gist = orderGist(o, findingsByOrder.get(o.id) ?? []);
                  return gist && <p className="mt-1 text-[var(--color-ink-700)]">{gist}</p>;
                })()}
                <div className="mt-1">
                  <SourceLink href={o.officialUrl} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Other research tools</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/fraud-test" className="font-medium text-[var(--color-gold-700)] hover:underline">
                Fraud Doctrine Analyser →
              </Link>{" "}
              <span className="text-[var(--color-ink-700)]">apply the Supreme Court&apos;s PFUTP Regulation 2(1)(c) &quot;fraud&quot; test to a fact pattern.</span>
            </li>
            <li>
              <Link href="/library" className="font-medium text-[var(--color-gold-700)] hover:underline">
                Source Library →
              </Link>{" "}
              <span className="text-[var(--color-ink-700)]">the official SEBI/MCA sources this tool is built from.</span>
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">About this tool</h2>
          <p className="mt-2 text-xs text-[var(--color-ink-500)]">
            Every result is deterministic and traceable to an official SEBI/MCA source or an indexed CFID order —
            never generated or inferred by AI. See how the analysis is built, what it does and does not do, and its
            known limitations.
          </p>
          <Link href="/methodology" className="mt-3 inline-block text-sm font-medium text-[var(--color-gold-700)] hover:underline">
            Methodology &amp; Limitations →
          </Link>
        </Card>
      </div>
    </div>
  );
}
