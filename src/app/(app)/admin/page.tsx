import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getProcessingMetrics, getValidationIssues } from "@/lib/data";

export default async function AdminDashboardPage() {
  const [metrics, issues] = await Promise.all([getProcessingMetrics(), getValidationIssues()]);
  const unresolvedIssues = issues.filter((i) => !i.resolved).length;

  const rows: { label: string; value: number; hint?: string }[] = [
    { label: "Total orders indexed", value: metrics.totalIndexed, hint: "Every row in Verified_CFID_Order_Links.xlsx — not a claim this is every CFID order that exists" },
    { label: "Successfully retrieved", value: metrics.successfullyRetrieved, hint: "Document fetched from sebi.gov.in" },
    { label: "Retrieval failures", value: metrics.retrievalFailures, hint: "sebi.gov.in unreachable from this environment" },
    { label: "CFID verification failures", value: metrics.cfidVerificationFailures, hint: 'Order number did not contain "CFID"' },
    { label: "Fully extracted (legally reviewed)", value: metrics.fullyExtracted, hint: "Broken into scenario findings with paragraph citations" },
    { label: "Verified orders awaiting extraction", value: metrics.verifiedAwaitingExtraction, hint: "Confirmed CFID orders, retrieval in progress but not yet legally reviewed" },
    { label: "Needs manual review", value: metrics.needsManualReview },
    { label: "Scenario findings created", value: metrics.scenarioFindingsCreated },
    { label: "Legal provisions identified", value: metrics.legalProvisionsIdentified, hint: "Only from orders analysed so far — not the complete CFID law library" },
    { label: "Official law texts verified", value: metrics.officialLawTextsVerified, hint: "provision_versions confirmed against an official source" },
  ];

  const residualRows: { label: string; value: number; hint?: string }[] = [
    { label: "Residual: awaiting link", value: metrics.residualPendingLink, hint: "Exclusion/pending-link register — never a precedent source" },
    { label: "Residual: confirmed duplicates", value: metrics.residualDuplicates, hint: "Same verified order referenced twice in the source workbook" },
    { label: "Residual: confirmed not CFID", value: metrics.residualNotCfid, hint: "Order number does not identify a CFID investigation" },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Processing Dashboard"
        description="Live counts computed directly from the database on every page load — nothing here is cached or estimated."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.label}>
            <div className="text-2xl font-semibold text-blue-800 sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-slate-700">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-slate-500">{r.hint}</div>}
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-slate-900">Residual register (never a source of case-library orders)</h2>
      <p className="mb-3 text-sm text-slate-600">
        Kept as three separate counts, never combined with the verified case-library counts above — a residual entry
        only ever becomes a case-library order if it is subsequently verified and moved.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {residualRows.map((r) => (
          <Card key={r.label}>
            <div className="text-2xl font-semibold text-blue-800 sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-slate-700">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-slate-500">{r.hint}</div>}
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Validation issues</h2>
            <p className="mt-1 text-sm text-slate-600">
              {issues.length} recorded, {unresolvedIssues} unresolved — retrieval failures, missing citations, and
              register housekeeping notes, each traceable back to a specific order or source row.
            </p>
          </div>
          <Link
            href="/admin/validation-issues"
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            View all validation issues →
          </Link>
        </div>
      </Card>
    </div>
  );
}
