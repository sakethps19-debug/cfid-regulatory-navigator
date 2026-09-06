import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PrecedentCompareClient } from "@/components/PrecedentCompareClient";
import { getScenarioFindings } from "@/lib/data";

export default async function ComparePage() {
  const scenarioFindings = await getScenarioFindings();
  return (
    <div>
      <PageHeader
        title="Precedent Comparison"
        description="Compare any two scenario findings side by side — useful, for example, to see why the 1.50 crore promoter allotment (SSSL-02) was upheld while the 0.52 crore cash allotment (SSSL-03) was not. Search by case name, record ID or scenario text; the two selections are reflected in the URL so a comparison can be bookmarked or shared."
      />
      <Suspense fallback={<p className="text-sm text-[var(--color-ink-500)]">Loading…</p>}>
        <PrecedentCompareClient findings={scenarioFindings} />
      </Suspense>
    </div>
  );
}
