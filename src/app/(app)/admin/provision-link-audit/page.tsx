import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { getScenarioFindings } from "@/lib/data";
import { getGatedProvisionLinkAuditQueue } from "@/lib/provisionLinkAudit";

export default async function ProvisionLinkAuditPage() {
  const findings = await getScenarioFindings();
  const queue = getGatedProvisionLinkAuditQueue(findings);
  const reviewedCount = queue.filter((entry) => entry.humanLegalReviewCompleted).length;

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-gold-700)] hover:underline">
        ← Back to Admin Processing Dashboard
      </Link>
      <PageHeader
        title="Gated provision link legal-review queue"
        description="Every scenario finding that links to a provision with a provision-level retrieval rule (PFUTP, SEBI Act, LODR, ICDR or Ind AS) and an empty justifying-tags value (currently treated as universal by the matching engine), so a reviewer can work through each one against its source order. Read-only: nothing here writes to the database."
      />
      <p className="mb-6 text-sm text-[var(--color-ink-700)]">
        The provision-level retrieval gate (see the Scenario Analyzer&apos;s Methodology page) now stops a query from
        surfacing a gated provision as a candidate unless the entered facts state the minimum nexus that provision&apos;s
        own text requires. That is a global, query-time safeguard, not a substitute for reviewing each individual
        link below: for each finding, a reviewer should confirm, against the source order, exactly which of that
        finding&apos;s own facts justify each listed provision, and curate finding_provisions.justifying_tags
        accordingly (narrowing it the same way LODR Regulation 6/Audit Committee/CEO-CFO-certification links are
        already narrowed). {reviewedCount} of {queue.length} findings listed here have completed human legal review;
        the rest have not.
      </p>
      {queue.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-700)]">No findings currently link to a gated provision with an unreviewed (empty justifying-tags) link.</p>
      ) : (
        <div className="space-y-3">
          {queue.map((entry) => (
            <Card key={entry.recordId} className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-[var(--color-ink-900)]">
                  {entry.recordId} · {entry.caseName}
                </span>
                <span
                  className={`rounded-sm px-2 py-0.5 text-xs ${
                    entry.humanLegalReviewCompleted
                      ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)]"
                      : "bg-[var(--color-neutral-100)] text-[var(--color-ink-700)]"
                  }`}
                >
                  {entry.humanLegalReviewCompleted ? "Human-reviewed" : "Human review pending"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-700)]">{entry.scenarioTitle}</p>
              <p className="mt-1.5 text-xs text-[var(--color-ink-500)]">
                Unreviewed gated links ({entry.unreviewedGatedProvisionIds.length}): {entry.unreviewedGatedProvisionIds.join(", ")}
              </p>
              <div className="mt-1.5">
                <SourceLink href={entry.officialSourceUrl} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
