import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { CaseJourneyStageCard } from "@/components/CaseJourneyStageCard";
import { directionsForOrderIds, getMatters, getOrderRelationships, getScenarioFindings, ordersForMatter } from "@/lib/data";
import { buildCaseJourney } from "@/lib/caseJourney";

export default async function CaseJourneyPage({ params }: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await params;

  const matters = await getMatters();
  const matter = matters.find((m) => m.id === matterId);
  if (!matter) notFound();

  const matterOrders = await ordersForMatter(matter.id);
  // A matter with zero currently-captured orders has nothing to open — the
  // landing page already excludes these (mattersWithAtLeastOneOrder), but a
  // direct URL visit must not render an empty/misleading journey either.
  if (matterOrders.length === 0) notFound();

  const [allFindings, directions, allRelationships] = await Promise.all([
    getScenarioFindings(),
    directionsForOrderIds(matterOrders.map((o) => o.id)),
    getOrderRelationships(),
  ]);

  const journey = buildCaseJourney(matter, matterOrders, allFindings, directions, allRelationships);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        <Link href="/case-journey" className="text-[var(--color-gold-700)] hover:underline">
          ← Case Journey
        </Link>
      </div>
      <PageHeader
        title={matter.normalizedMatterName}
        description="The matter's captured orders, in chronological procedural sequence. This is a lifecycle summary, not a substitute for each order's own Case Detail page."
      />

      {journey.singleOrder && (
        <Card className="mb-6 bg-[var(--color-gold-50)]">
          <p className="text-sm text-[var(--status-amber-text)]">
            Only one order is currently captured for this matter. This does not mean no further order exists
            procedurally — it means no additional order has yet been indexed and linked to this matter in this
            pilot&apos;s corpus.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {journey.stages.map((stage, i) => (
          <CaseJourneyStageCard key={stage.order.id} stage={stage} stageNumber={i + 1} totalStages={journey.stages.length} />
        ))}
      </div>
    </div>
  );
}
