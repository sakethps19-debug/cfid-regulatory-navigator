import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { importMeta, orders, provisions, residualOrders, scenarioFindings, verifiedCfidOrders } from "@/lib/data";

const STAT_ITEMS = [
  { label: "Orders deep-analyzed", hrefLabel: "Source Library", href: "/library" },
  { label: "Scenario findings", hrefLabel: "Search by Regulation", href: "/regulations" },
  { label: "Provisions indexed", hrefLabel: "Search by Regulation", href: "/regulations" },
  { label: "Verified CFID orders", hrefLabel: "Orders Awaiting Analysis", href: "/awaiting-analysis" },
];

export default function DashboardPage() {
  const counts = [orders.length, scenarioFindings.length, provisions.length, verifiedCfidOrders.length];
  const statusCounts = scenarioFindings.reduce<Record<string, number>>((acc, f) => {
    acc[f.findingStatus] = (acc[f.findingStatus] ?? 0) + 1;
    return acc;
  }, {});
  const verifiedPendingCount = verifiedCfidOrders.filter((v) => v.analysisStatus === "verified_pending_analysis").length;
  const residualPendingCount = residualOrders.filter((r) => r.status === "pending_link").length;
  const reviewCount = verifiedPendingCount + residualPendingCount;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Pilot scope: three deep-analysed CFID orders (Rajesh Exports Limited interim order; Seacoast Shipping Services Limited interim and final orders), out of ${verifiedCfidOrders.length} confirmed CFID orders in the authoritative Verified CFID Order Links register. This is a research-assistance tool — it does not make findings of guilt.`}
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
            {(["Prima facie", "Upheld", "Partly upheld", "Not upheld", "Alleged"] as const)
              .filter((s) => statusCounts[s])
              .map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <dt className="text-slate-600">{s}</dt>
                  <dd className="font-semibold text-slate-900">{statusCounts[s]}</dd>
                </div>
              ))}
          </dl>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">Important negative precedent</h2>
          <p className="mt-2 text-sm text-slate-600">
            The Seacoast Shipping Services Limited final order did <strong>not uphold</strong> the allegation that the
            ₹0.52 crore cash preferential allotment was financed through circular transactions — loans/advances were
            found to be supported and recorded in audited accounts, third parties were not examined, and sale proceeds
            remained with the allottees. The Scenario Analyzer retrieves this contrary precedent automatically for
            comparable facts.
          </p>
          <Link href="/regulations?highlight=SSSL-03" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">
            View this finding →
          </Link>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Get started</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/analyzer" className="font-medium text-blue-700 hover:underline">
                Analyze a scenario →
              </Link>{" "}
              <span className="text-slate-600">describe the facts and get potentially relevant provisions with precedents.</span>
            </li>
            <li>
              <Link href="/pfutp" className="font-medium text-blue-700 hover:underline">
                PFUTP Regulation 4(2)(e) focused page →
              </Link>{" "}
              <span className="text-slate-600">kept strictly distinct from LODR Regulation 4(2)(e)(i).</span>
            </li>
            <li>
              <Link href="/awaiting-analysis" className="font-medium text-blue-700 hover:underline">
                {reviewCount} rows await manual review →
              </Link>{" "}
              <span className="text-slate-600">
                verified CFID orders not yet turned into scenario findings, plus residual entries awaiting a link.
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
