import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getProcessingMetrics, getValidationIssues } from "@/lib/data";

export default async function AdminDashboardPage() {
  const [metrics, issues] = await Promise.all([getProcessingMetrics(), getValidationIssues()]);
  const unresolvedIssues = issues.filter((i) => !i.resolved).length;

  const rows: { label: string; value: number; hint?: string }[] = [
    { label: "Total orders indexed", value: metrics.totalIndexed, hint: "Every row in Verified_CFID_Order_Links.xlsx" },
    { label: "Successfully retrieved", value: metrics.successfullyRetrieved, hint: "Document fetched from sebi.gov.in" },
    { label: "Retrieval failures", value: metrics.retrievalFailures, hint: "sebi.gov.in unreachable from this environment" },
    { label: "CFID verification failures", value: metrics.cfidVerificationFailures, hint: 'Order number did not contain "CFID"' },
    { label: "Fully extracted (legally reviewed)", value: metrics.fullyExtracted, hint: "Broken into scenario findings with paragraph citations" },
    { label: "Needs manual review", value: metrics.needsManualReview },
    { label: "Residual register: awaiting link", value: metrics.residualPendingLink, hint: "Exclusion register, never a precedent source" },
    { label: "Scenario findings created", value: metrics.scenarioFindingsCreated },
    { label: "Legal provisions identified", value: metrics.legalProvisionsIdentified },
    { label: "Official law texts verified", value: metrics.officialLawTextsVerified, hint: "provision_versions confirmed against an official source" },
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
