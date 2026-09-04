import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import type { FindingStatus, ScenarioFinding } from "@/types/domain";
import {
  getImportMeta,
  getMatters,
  getOrderRelationships,
  getOrders,
  getProvisions,
  getResidualOrders,
  getScenarioFindings,
  getVerifiedCfidOrders,
} from "@/lib/data";

const STAT_ITEMS = [
  { label: "Orders indexed (case-library universe)", href: "/case-library" },
  { label: "Orders deeply analysed", href: "/library" },
  { label: "Scenario findings", href: "/provisions" },
  { label: "Provisions currently indexed", href: "/provisions" },
];

// A balanced, status-diverse sample rather than any single case: at most one
// finding per distinct status actually present in the data, preferring a
// finding drawn from a final order within each status. Purely mechanical —
// no case or provision is ever hardcoded here.
const STATUS_PRIORITY: FindingStatus[] = [
  "Upheld",
  "Not upheld",
  "Partly upheld",
  "Confirmed at interim",
  "Prima facie",
  "Procedural observation",
  "Alleged",
  "Withdrawn",
  "Inconclusive",
];

function pickRecentAndSignificant(findings: ScenarioFinding[]): ScenarioFinding[] {
  const picked: ScenarioFinding[] = [];
  for (const status of STATUS_PRIORITY) {
    const candidates = findings.filter((f) => f.findingStatus === status);
    if (candidates.length === 0) continue;
    const best = candidates.find((f) => f.finalParagraphReferences) ?? candidates[0];
    picked.push(best);
    if (picked.length >= 6) break;
  }
  return picked;
}

export default async function DashboardPage() {
  const [orders, provisions, residualOrders, scenarioFindings, verifiedCfidOrders, importMeta, matters, orderRelationships] =
    await Promise.all([
      getOrders(),
      getProvisions(),
      getResidualOrders(),
      getScenarioFindings(),
      getVerifiedCfidOrders(),
      getImportMeta(),
      getMatters(),
      getOrderRelationships(),
    ]);
  const deepAnalyzedOrders = orders.filter((o) => o.processingStage === "legally_reviewed");
  const counts = [orders.length, deepAnalyzedOrders.length, scenarioFindings.length, provisions.length];
  const statusCounts = scenarioFindings.reduce<Record<string, number>>((acc, f) => {
    acc[f.findingStatus] = (acc[f.findingStatus] ?? 0) + 1;
    return acc;
  }, {});
  const verifiedPendingCount = verifiedCfidOrders.filter((v) => v.analysisStatus === "verified_pending_analysis").length;
  const residualPendingCount = residualOrders.filter((r) => r.status === "pending_link").length;
  const residualDuplicateCount = residualOrders.filter((r) => r.status === "duplicate_of_verified").length;
  const residualNotCfidCount = residualOrders.filter((r) => r.status === "not_cfid").length;
  const recentAndSignificant = pickRecentAndSignificant(scenarioFindings);

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
        description={`${orders.length} verified CFID order links are currently indexed as the case-library universe — this is not a claim that every CFID matter or every related order has been found; the count will grow as residual entries are resolved and related orders are identified. ${deepAnalyzedOrders.length} of them have been deeply analysed into scenario findings so far. This is a research-assistance tool — it does not make findings of guilt.`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_ITEMS.map((item, i) => (
          <Link key={item.label} href={item.href}>
            <Card className="h-full transition hover:ring-blue-400">
              <div className="text-2xl font-semibold text-blue-800 sm:text-3xl">{counts[i]}</div>
              <div className="mt-1 text-sm text-slate-600">{item.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-slate-900">Scenario finding status breakdown</h2>
          <dl className="mt-4 space-y-2">
            {(Object.keys(statusCounts) as FindingStatus[])
              .sort((a, b) => statusCounts[b] - statusCounts[a])
              .map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <dt className="text-slate-600">{s}</dt>
                  <dd className="font-semibold text-slate-900">{statusCounts[s]}</dd>
                </div>
              ))}
          </dl>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">Recent and significant findings</h2>
          <p className="mt-1 text-xs text-slate-500">
            One example per finding status currently represented in the data — not a ranking, and no single case,
            provision or transaction type is treated as the application&apos;s focus.
          </p>
          <ul className="mt-3 space-y-2">
            {recentAndSignificant.map((f) => (
              <li key={f.recordId} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={f.findingStatus} />
                  <span className="font-medium text-slate-900">{f.caseName}</span>
                </div>
                <p className="mt-1 text-slate-600">{f.scenarioTitle}</p>
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
            <div className="text-2xl font-semibold text-blue-800 sm:text-3xl">{s.value}</div>
            <div className="mt-1 text-sm text-slate-600">{s.label}</div>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        A matter can span several individual orders (interim, confirmatory, final, adjudication, or otherwise); most
        orders are not yet linked to a matter, and that count grows only as relationships already known from official
        sources are recorded — never guessed from company name or order dates.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Get started</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/analyzer" className="font-medium text-blue-700 hover:underline">
                Analyze a scenario →
              </Link>{" "}
              <span className="text-slate-600">
                describe the facts and get every potentially relevant provision, across every instrument, with
                supporting and contrary precedents.
              </span>
            </li>
            <li>
              <Link href="/provisions" className="font-medium text-blue-700 hover:underline">
                Browse the Provision Explorer →
              </Link>{" "}
              <span className="text-slate-600">search any provision by number, instrument, or the underlying facts.</span>
            </li>
            <li>
              <Link href="/case-library" className="font-medium text-blue-700 hover:underline">
                {verifiedPendingCount} verified orders await extraction →
              </Link>{" "}
              <span className="text-slate-600">confirmed CFID orders not yet turned into scenario findings.</span>
            </li>
            <li>
              <Link href="/awaiting-analysis" className="font-medium text-blue-700 hover:underline">
                {residualPendingCount} residual entries await a link →
              </Link>{" "}
              <span className="text-slate-600">
                plus {residualDuplicateCount} confirmed duplicates and {residualNotCfidCount} confirmed non-CFID,
                excluded but never deleted.
              </span>
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-slate-900">Data provenance</h2>
          <p className="mt-2 text-xs text-slate-500">
            Generated {new Date(importMeta.generatedAt).toLocaleString()} from {importMeta.sourceFiles.join(" and ")}.
          </p>
          <Link href="/methodology" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">
            Methodology &amp; Limitations →
          </Link>
        </Card>
      </div>
    </div>
  );
}
