import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { getDataChangeLog, getProcessingMetrics, getScenarioFindings, getStructuredFindingCoverageGaps, getValidationIssues } from "@/lib/data";
import { getBroadFraudProvisionLinkAuditQueue } from "@/lib/provisionLinkAudit";

const COVERAGE_GAP_TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: "Tier 1: matter entirely uncovered",
  2: "Tier 2: confirmatory/revocation order, outcome not yet reflected",
  3: "Tier 3: order within an already-covered matter",
};

export default async function AdminDashboardPage() {
  const [metrics, issues, changeLog, coverageGaps, scenarioFindings] = await Promise.all([
    getProcessingMetrics(),
    getValidationIssues(),
    getDataChangeLog(),
    getStructuredFindingCoverageGaps(),
    getScenarioFindings(),
  ]);
  const unresolvedIssues = issues.filter((i) => !i.resolved).length;
  const provisionLinkAuditQueue = getBroadFraudProvisionLinkAuditQueue(scenarioFindings);

  // Grouped under Corpus / Processing / Review, per the same distinction
  // the rest of the app draws between "how much is indexed", "where each
  // order stands in the pipeline", and "has a human actually signed off" —
  // three genuinely different questions that a single flat grid of ten
  // equally-weighted numbers made harder to tell apart at a glance.
  const corpusRows: { label: string; value: number; hint?: string }[] = [
    { label: "Total orders indexed", value: metrics.totalIndexed, hint: "Every row in Verified_CFID_Order_Links.xlsx, not a claim this is every CFID order that exists" },
    {
      label: "Orders contributing structured findings",
      value: metrics.ordersContributingStructuredFindings,
      hint: `Of the ${metrics.totalIndexed} indexed above, only these actually contribute at least one finding to Scenario Analyzer retrieval; an indexed order is not automatically one the analyzer can match against, see "Deep-analyzed" below for where the remainder currently stand`,
    },
    { label: "Scenario findings created", value: metrics.scenarioFindingsCreated },
    { label: "Legal provisions identified", value: metrics.legalProvisionsIdentified, hint: "Only from orders analysed so far, not the complete CFID law library" },
  ];

  const processingRows: { label: string; value: number; hint?: string }[] = [
    { label: "Deep-analyzed", value: metrics.deepAnalyzedCount, hint: "Actually opened, read, and broken into scenario findings with paragraph citations, this is what powers the Scenario Analyzer for these orders" },
    { label: "Awaiting retrieval", value: metrics.awaitingRetrieval, hint: "Indexed and CFID-tag-checked, but no retrieval attempt has been made or recorded for these specific orders yet, not a failure" },
    { label: "Retrieval failed", value: metrics.retrievalFailures, hint: "A genuine, individually recorded retrieval attempt was made and failed, distinct from \"awaiting retrieval\"" },
    { label: "Retrieved but not yet deep-analyzed", value: metrics.midPipelineCount, hint: "Document retrieved and in progress (attempted / downloaded / text extracted / scenario findings extracted), but citations have not yet been checked, genuinely earlier-stage than \"Deep-analyzed\" above" },
    { label: "Needs manual review", value: metrics.needsManualReview },
  ];

  const reviewRows: { label: string; value: number; hint?: string }[] = [
    {
      label: "Orders at \"legally reviewed\" pipeline stage",
      value: metrics.fullyExtracted,
      hint: "An order-level processing-pipeline stage: this order's document work is complete, not itself a claim about any individual finding, see the finding-level row below for that",
    },
    {
      label: "Scenario findings human-legally-reviewed",
      value: metrics.findingsHumanLegallyReviewed,
      hint: `${metrics.findingsHumanLegallyReviewed} of ${metrics.searchableFindingsCount} searchable scenario findings have completed human legal review by a CFID officer; a finding can be searchable in the Scenario Analyzer long before it has been legally reviewed, this is the per-finding fact, not the order-pipeline stage above`,
    },
    { label: "Official law texts verified", value: metrics.officialLawTextsVerified, hint: "provision_versions confirmed against an official source" },
  ];

  const linkVerificationRows: { label: string; value: number; hint?: string }[] = [
    { label: "Official SEBI URL supplied", value: metrics.officialUrlSupplied, hint: "A link is on file for the order, nothing more" },
    { label: "URL format validated", value: metrics.urlFormatValidated, hint: "The supplied link is a well-formed http(s) URL, not a claim the page was opened" },
    { label: "CFID identifier present in record", value: metrics.cfidIdentifierPresent, hint: 'The order’s own identifier/number contains "CFID", a claim about the record, not the document' },
    { label: "CFID identifier absent from record", value: metrics.cfidVerificationFailures, hint: "Tracked, never silently dropped; absence alone is not exclusionary (see cfid_verification_basis)" },
    { label: "Document actually opened/retrieved", value: metrics.documentActuallyRetrieved, hint: "The only stage that reflects a completed retrieval, not merely a supplied or validated link" },
    { label: "Document metadata confirmed from source", value: metrics.documentMetadataConfirmed, hint: "Date/number/authority confirmed directly from the opened document, not just the source workbook" },
    { label: "Complete document on file (audit record)", value: metrics.completeDocumentOnFile, hint: "A formal source_documents row recording a successful retrieval, with checksum and retrieval timestamp" },
  ];

  const residualRows: { label: string; value: number; hint?: string }[] = [
    { label: "Residual: awaiting link", value: metrics.residualPendingLink, hint: "Exclusion/pending-link register, never a precedent source" },
    { label: "Residual: confirmed duplicates", value: metrics.residualDuplicates, hint: "Same verified order referenced twice in the source workbook" },
    { label: "Residual: confirmed not CFID", value: metrics.residualNotCfid, hint: "Order number does not identify a CFID investigation" },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Processing Dashboard"
        description="Live counts computed directly from the database on every page load; nothing here is cached or estimated."
      />
      <p className="mb-6 text-xs text-[var(--color-ink-500)]">
        This dashboard, the validation-issues list, and the change log below are read-only: nothing on these pages
        writes to the database. The only browser-side write path in this tool is the &quot;Flag this result&quot;
        control on the Scenario Analyzer, which records an officer&apos;s note in the validation-issues register;
        every other correction shown here (conduct tags, transaction types, and similar curated fields) was made
        directly against the database outside this application and is recorded in the change log purely for record.
      </p>

      <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Corpus</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {corpusRows.map((r) => (
          <Card key={r.label}>
            <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-[var(--color-ink-700)]">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-[var(--color-ink-500)]">{r.hint}</div>}
          </Card>
        ))}
      </div>

      {coverageGaps.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">
            Structured-finding coverage gaps: prioritized queue ({coverageGaps.length})
          </h3>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
            The {coverageGaps.length} orders behind &quot;Orders contributing structured findings&quot; above, computed
            by actual presence in scenario_findings, never by processing_stage alone: every one of these currently
            carries processing_stage &quot;Citations checked&quot;, the stage isDeepAnalyzed() otherwise treats as
            complete, yet none has a linked finding. Ordered by genuine priority tier, not insertion order or a
            mass-generated default; within a tier, most recently dated order first.
          </p>
          <div className="mt-3 space-y-2">
            {coverageGaps.map((g) => (
              <Card key={g.order.id} className="text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--color-ink-900)]">{g.order.caseName}</span>
                  <span className="rounded-sm bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs text-[var(--color-ink-700)]">
                    {COVERAGE_GAP_TIER_LABELS[g.priorityTier]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                  {g.order.orderStage}
                  {g.order.orderNumber ? ` (${g.order.orderNumber})` : ""}
                  {g.order.orderDate ? ` · ${g.order.orderDate}` : " · no order date on file"}
                </p>
                <p className="mt-1.5 text-xs text-[var(--color-ink-700)]">{g.priorityReason}</p>
                <div className="mt-1.5">
                  <SourceLink href={g.order.officialUrl} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">PFUTP / SEBI Act 12A link legal-review queue</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-700)]">
              {provisionLinkAuditQueue.length} findings link to at least one PFUTP/SEBI Act 12A provision with an
              empty justifying-tags value (currently treated as universal). The Scenario Analyzer&apos;s
              provision-level retrieval gate (P0 provision-precision remediation) is a global, query-time backstop;
              it is not a certification that any individual link below is correctly attributed. Read-only.
            </p>
          </div>
          <Link
            href="/admin/provision-link-audit"
            className="rounded-md bg-[var(--color-gold-700)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-800)]"
          >
            Open link audit queue →
          </Link>
        </div>
      </Card>

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Processing</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {processingRows.map((r) => (
          <Card key={r.label}>
            <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-[var(--color-ink-700)]">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-[var(--color-ink-500)]">{r.hint}</div>}
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Review</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviewRows.map((r) => (
          <Card key={r.label}>
            <div className="text-2xl font-semibold text-[var(--color-gold-800)] sm:text-3xl">{r.value}</div>
            <div className="mt-1 text-sm text-[var(--color-ink-700)]">{r.label}</div>
            {r.hint && <div className="mt-1 text-xs text-[var(--color-ink-500)]">{r.hint}</div>}
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Legal Review Queue</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-700)]">
              Every scenario finding with its full verification and review record, filterable by review-pending or
              unverified status, so a human legal reviewer can validate each finding without needing raw table
              access. Read-only.
            </p>
          </div>
          <Link
            href="/admin/legal-review-queue"
            className="rounded-md bg-[var(--color-gold-700)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-800)]"
          >
            Open Legal Review Queue →
          </Link>
        </div>
      </Card>

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Processing: official-link verification stages</h2>
      <p className="mb-3 text-sm text-[var(--color-ink-700)]">
        &quot;89 official links verified&quot; is not one fact, it collapses several distinct checkpoints. Each row
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
        Kept as three separate counts, never combined with the verified case-library counts above; a residual entry
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

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Validation</h2>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Validation issues</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-700)]">
              {issues.length} recorded, {unresolvedIssues} unresolved, each traceable back to a specific order or
              source row. Issues are marked resolved once their underlying condition no longer holds (e.g. an
              &quot;awaiting retrieval&quot; note once that order&apos;s retrieval succeeds); the remainder are
              genuinely open items such as residual-register entries still awaiting a link.
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

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Curated-data change log</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-700)]">
              {changeLog.length} corrections recorded: every conduct tag, transaction type, or similar curated field
              changed directly against the database, with what it was, what it became, and why.
            </p>
          </div>
          <Link
            href="/admin/change-log"
            className="rounded-md bg-[var(--color-gold-700)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-800)]"
          >
            View change log →
          </Link>
        </div>
      </Card>
    </div>
  );
}
