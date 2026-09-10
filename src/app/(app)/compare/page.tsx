import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PrecedentCompareClient } from "@/components/PrecedentCompareClient";
import { InterimFinalReversalsClient } from "@/components/InterimFinalReversalsClient";
import { getOrders, getScenarioFindings } from "@/lib/data";
import { interimFinalReversals } from "@/lib/precedentShifts";

// Deliberately unreachable from navigation (reconciliation pass, Task 2):
// this tool's own two functions have been superseded by purpose-built
// views elsewhere -- Case Journey (evolution within one matter) and
// Compare Scenarios (the same broad issue across matters/orders) -- so
// this page is no longer linked from anywhere in the app. It is NOT
// deleted or redirected: an existing bookmark to this URL, or its own
// pairwise-comparison URLs, still resolves and still works, since deleting
// working functionality is a larger, more destructive step than simply
// not linking to it. The notice below exists so a visitor arriving via an
// old bookmark understands where the current equivalents live.
export default async function ComparePage() {
  const [scenarioFindings, orders] = await Promise.all([getScenarioFindings(), getOrders()]);
  const reversals = interimFinalReversals(scenarioFindings);

  return (
    <div>
      <PageHeader
        title="Precedent Comparison"
        description="Compare any two scenario findings side by side, or see every scenario that was raised at the interim stage and then not confirmed in the final order. Search by case name, record ID or scenario text; the two selections in the pairwise tool are reflected in the URL so a comparison can be bookmarked or shared."
      />

      <div className="mb-6 rounded-sm bg-[var(--color-neutral-50)] px-4 py-3 text-sm text-[var(--color-ink-700)] ring-1 border-[var(--color-border)]">
        This page is no longer linked from the app&apos;s navigation. For most research it has been superseded by{" "}
        <Link href="/case-journey" className="font-medium text-[var(--color-gold-700)] hover:underline">
          Case Journey
        </Link>{" "}
        (how a single matter&apos;s captured orders evolved) and{" "}
        <Link href="/compare-scenarios" className="font-medium text-[var(--color-gold-700)] hover:underline">
          Compare Scenarios
        </Link>{" "}
        (how the same broad issue has been treated across different matters). The two ad hoc tools below remain
        functional for the specific case-by-case comparisons neither of those covers.
      </div>

      <section>
        <h2 className="font-serif text-xl font-semibold text-[var(--color-ink-900)]">Interim → final reversals</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-700)]">
          Every scenario in the register that was actually raised at an earlier stage (a genuine paragraph citation
          from that earlier order is on file, not just a note that no such order exists in this register), and then
          not confirmed in the final disposition, shown side by side with what changed between the two. {reversals.length}{" "}
          of {scenarioFindings.length} scenario findings meet both conditions; a negative final outcome with nothing
          comparable on file for an earlier stage (e.g. an allegation raised for the first time in the final order) is
          not shown here, since there is nothing on file to compare it against.
        </p>
        <div className="mt-4">
          <InterimFinalReversalsClient findings={reversals} orders={orders} />
        </div>
      </section>

      <section className="mt-10 border-t border-[var(--color-border)] pt-8">
        <h2 className="font-serif text-xl font-semibold text-[var(--color-ink-900)]">Compare any two findings</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-700)]">
          Useful, for example, to see why the 1.50 crore-share promoter allotment (SSSL-02) was confirmed in the final
          order while the 0.52 crore-share non-promoter allotment (SSSL-03) was not.
        </p>
        <div className="mt-4">
          <Suspense fallback={<p className="text-sm text-[var(--color-ink-500)]">Loading…</p>}>
            <PrecedentCompareClient findings={scenarioFindings} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
