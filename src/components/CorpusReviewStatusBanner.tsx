import type { LegalProvision, ScenarioFinding } from "@/types/domain";
import { isSearchableFinding } from "@/lib/publicationLifecycle";

/** Pure count computation behind CorpusReviewStatusBanner, extracted so it
 * is independently unit-testable (this codebase's test suite is
 * pure-logic-only, no component-rendering harness -- see
 * vitest.config.ts). */
export function corpusReviewStatusCounts(findings: ScenarioFinding[], provisions?: LegalProvision[]) {
  const searchable = findings.filter(isSearchableFinding);
  const reviewedCount = searchable.filter((f) => f.humanLegalReviewCompleted).length;
  const officiallyVerifiedCount = provisions?.filter((p) => p.currentTextVerificationStatus === "Officially verified").length ?? 0;
  return {
    searchableCount: searchable.length,
    reviewedCount,
    provisionsTotal: provisions?.length ?? 0,
    officiallyVerifiedCount,
  };
}

/** Corpus-level "how much of what you're about to see has actually been
 * legally reviewed/officially verified" warning, shown wherever unreviewed
 * curated material is surfaced (Analyzer, Cases, Compare Scenarios, Law) --
 * pre-demo remediation requirement. Every count is computed live from the
 * data already fetched for the page it sits on, never cached or hard-coded,
 * so it can never drift from what the page below it actually shows. A
 * finding being searchable/published, or a provision appearing in this
 * library, is never itself a claim of human legal review or official
 * statutory-text verification -- this banner exists specifically to say so
 * plainly, in one place, rather than leaving that distinction implicit. */
export function CorpusReviewStatusBanner({ findings, provisions }: { findings: ScenarioFinding[]; provisions?: LegalProvision[] }) {
  const { searchableCount, reviewedCount, provisionsTotal, officiallyVerifiedCount } = corpusReviewStatusCounts(findings, provisions);

  return (
    <div className="mb-6 rounded-sm bg-[var(--color-gold-50)] p-3.5 text-sm text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
      <p className="font-medium">
        {reviewedCount} of {searchableCount} searchable scenario findings in this pilot have completed human legal
        review by a CFID officer
        {provisions && (
          <>
            ; {officiallyVerifiedCount} of {provisionsTotal} statutory provisions have current text officially
            verified against an official source
          </>
        )}
        .
      </p>
      <p className="mt-1 text-xs opacity-90">
        A finding being searchable, or a provision appearing in this library, is not itself a claim of human legal
        review or official statutory-text verification — check each item&apos;s own review/verification status
        before relying on it.
      </p>
    </div>
  );
}
