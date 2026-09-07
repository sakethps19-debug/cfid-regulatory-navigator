import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { LegalReviewQueueClient, type QueueRow } from "@/components/LegalReviewQueueClient";
import { getOrders, getScenarioFindings, getValidationIssues } from "@/lib/data";

export default async function LegalReviewQueuePage() {
  const [findings, orders, validationIssues] = await Promise.all([getScenarioFindings(), getOrders(), getValidationIssues()]);

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const issuesByFindingRecordId = new Map<string, typeof validationIssues>();
  for (const issue of validationIssues) {
    if (!issue.findingRecordId) continue;
    const list = issuesByFindingRecordId.get(issue.findingRecordId) ?? [];
    list.push(issue);
    issuesByFindingRecordId.set(issue.findingRecordId, list);
  }

  const rows: QueueRow[] = findings.map((finding) => {
    const linkedOrders = finding.orderIds.map((id) => orderById.get(id)).filter((o): o is NonNullable<typeof o> => Boolean(o));
    // The matter/case grouping shown is drawn from whichever linked order
    // actually has one recorded (order_relationships-derived), not guessed
    // from company name — most orders in this pilot have no matter link yet.
    const matterName = linkedOrders.find((o) => o.normalizedMatterName)?.normalizedMatterName ?? null;
    return {
      finding,
      orders: linkedOrders.map((o) => ({ id: o.id, caseName: o.caseName, orderStage: o.orderStage, orderNumber: o.orderNumber })),
      matterName,
      linkedValidationIssues: issuesByFindingRecordId.get(finding.recordId) ?? [],
    };
  });

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-gold-700)] hover:underline">
        ← Back to Admin Processing Dashboard
      </Link>
      <PageHeader
        title="Legal Review Queue"
        description={`Every one of this pilot's ${findings.length} scenario findings, with the full verification/review record for each, so a human legal reviewer can validate a finding without needing Admin access to the underlying tables. Read-only: nothing on this page writes to the database.`}
      />
      <LegalReviewQueueClient rows={rows} />
    </div>
  );
}
