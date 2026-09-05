import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getProcessingMetrics, getValidationIssues } from "@/lib/data";

export default async function AdminDashboardPage() {
  const [metrics, issues] = await Promise.all([getProcessingMetrics(), getValidationIssues()]);
  const unresolvedIssues = issues.filter((i) => !i.resolved).length;

  const rows: { label: string; value: number; hint?: string }[] = [
    { label: "Total orders indexed", value: metrics.totalIndexed, hint: "Every row in Verified_CFID_Order_Links.xlsx — not a claim this is every CFID order that exists" },
    { label: "Fully extracted (legally reviewed)", value: metrics.fullyExtracted, hint: "Broken into scenario findings with paragraph citations — the only orders actually opened, read, and deep-analysed" },
    { label: "Awaiting retrieval", value: metrics.awaitingRetrieval, hint: "Indexed and CFID-tag-checked, but no retrieval attempt has been made or recorded for these specific orders yet — not a failure" },
    { label: "Retrieval failed", value: metrics.retrievalFailures, hint: "A genuine, individually recorded retrieval attempt was made and failed — distinct from \"awaiting retrieval\"" },
    { label: "In an active intermediate stage", value: metrics.midPipelineCount, hint: "Retrieval attempted / downloaded / text extracted / scenario findings extracted / citations checked, but not yet legally reviewed" },
    { label: "Needs manual review", value: metrics.needsManualReview },
    { label: "Scenario findings created", value: metrics.scenarioFindingsCreated },
    { label: "Legal provisions identified", value: metrics.legalProvisionsIdentified, hint: "Only from orders analysed so far — not the complete CFID law library" },
    { label: "Official law texts verified", value: metrics.officialLawTextsVerified, hint: "provision_versions confirmed against an official source" },
  ];

  const linkVerificationRows: { label: string; value: number; hint?: string }[] = [
    { label: "Official SEBI URL supplied", value: metrics.officialUrlSupplied, hint: "A link is on file for the order — nothing more" },
    { label: "URL format validated", value: metrics.urlFormatValidated, hint: "The supplied link is a well-formed http(s) URL — not a claim the page was opened" },
    { label: "CFID identifier present in record", value: metrics.cfidIdentifierPresent, hint: 'The order’s own identifier/number contains "CFID" — a claim about the record, not the document' },
    { label: "CFID identifier absent from record", value: metrics.cfidVerificationFailures, hint: "Tracked, never silently dropped — absence alone is not exclusionary (see cfid_verification_basis)" },
    { label: "Document actually opened/retrieved", value: metrics.documentActuallyRetrieved, hint: "The only stage that reflects a completed retrieval, not merely a supplied or validated link" },
    { label: "Document metadata confirmed from source", value: metrics.documentMetadataConfirmed, hint: "Date/number/authority confirmed directly from the opened document, not just the source workbook" },
    { label: "Complete document on file (audit record)", value: metrics.completeDocumentOnFile, hint: "A formal source_documents row with checksum/timestamp — currently 0 even for the deeply-analysed orders; a known gap, not fabricated" },
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
            <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-[var(--color-ink-700)]">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-[var(--color-ink-500)]">{r.hint}</div>}
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Official-link verification stages</h2>
      <p className="mb-3 text-sm text-[var(--color-ink-700)]">
        &quot;89 official links verified&quot; is not one fact — it collapses several distinct checkpoints. Each row
        below is a separate, honestly-tracked stage; a high count at one stage is never a claim that a later stage
        has also happened.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {linkVerificationRows.map((r) => (
          <Card key={r.label}>
            <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-[var(--color-ink-700)]">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-[var(--color-ink-500)]">{r.hint}</div>}
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Residual register (never a source of case-library orders)</h2>
      <p className="mb-3 text-sm text-[var(--color-ink-700)]">
        Kept as three separate counts, never combined with the verified case-library counts above — a residual entry
        only ever becomes a case-library order if it is subsequently verified and moved.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {residualRows.map((r) => (
          <Card key={r.label}>
            <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-[var(--color-ink-700)]">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-[var(--color-ink-500)]">{r.hint}</div>}
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Validation issues</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-700)]">
              {issues.length} recorded, {unresolvedIssues} unresolved — mostly orders awaiting retrieval, plus missing
              citations and register housekeeping notes, each traceable back to a specific order or source row.
            </p>
          </div>
          <Link
            href="/admin/validation-issues"
            className="rounded-md bg-[var(--color-gold-700)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-800)]"
          >
            View all validation issues →
          </Link>
        </div>
      </Card>
    </div>
  );
}
