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

/** Corpus-level source-verification disclosure, shown wherever curated
 * precedent/provision material is surfaced (Analyzer, Cases, Compare
 * Scenarios, Law). Every count is computed live from the data already
 * fetched for the page it sits on, never cached or hard-coded, so it can
 * never drift from what the page below it actually shows.
 *
 * Post-checkpoint-4 UI/terminology hardening: this banner previously also
 * surfaced an "X of Y findings have completed [officer sign-off]" count --
 * an internal data-governance/workflow signal, not something material to
 * an officer interpreting a single result, and exactly the kind of
 * admin-review-status language that must not appear on a normal officer
 * screen (see LegalReviewBadge/findingMaturityTier, which remain
 * Admin-only). Removed from this banner's rendered text; the
 * underlying count is still computed by corpusReviewStatusCounts (used by
 * Admin) but no longer shown here. What remains -- current statutory text
 * officially verified against an official source -- is legitimate,
 * material source-provenance information an officer needs to correctly
 * weigh a provision citation, not an internal workflow state. */
export function CorpusReviewStatusBanner({ findings, provisions }: { findings: ScenarioFinding[]; provisions?: LegalProvision[] }) {
  const { provisionsTotal, officiallyVerifiedCount } = corpusReviewStatusCounts(findings, provisions);
  if (!provisions) return null;

  return (
    <div className="mb-6 rounded-sm bg-[var(--color-gold-50)] p-3.5 text-sm text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
      <p className="font-medium">
        {officiallyVerifiedCount} of {provisionsTotal} statutory provisions in this library have current text
        officially verified against an official source.
      </p>
      <p className="mt-1 text-xs opacity-90">
        A provision appearing in this library is not itself a claim that its current text is officially verified —
        check each provision&apos;s own verification status, and always verify against the official SEBI/MCA source
        before relying on it.
      </p>
    </div>
  );
}
