import { PageHeader } from "@/components/PageHeader";
import { LawLibraryClient } from "@/components/LawLibraryClient";
import { getLegalInstruments, getProvisions, getScenarioFindings } from "@/lib/data";

export default async function LawLibraryPage() {
  const [instruments, provisions, findings] = await Promise.all([
    getLegalInstruments(),
    getProvisions(),
    getScenarioFindings(),
  ]);

  return (
    <div>
      {/* Post-freeze correction pass (Section F): the corpus-wide statutory-
          verification banner (CorpusReviewStatusBanner) and the historical
          finding-status filter buttons (below, in LawLibraryClient) are
          removed from this normal officer view -- both made this read as a
          case-outcome dashboard rather than a law research screen.
          Provenance is NOT removed globally: search, regulator/instrument
          navigation, and each provision's own verification state (badge,
          effective-date info, official-source link) on Provision Detail all
          remain exactly as before. See CorpusReviewStatusBanner.tsx's own
          doc comment -- it is still used, unmodified, on Analyzer and
          Compare Scenarios, where a corpus-wide verification disclosure
          remains appropriate. */}
      <PageHeader
        title="Law Library"
        description="Every legal instrument and provision actually cited or applied in the orders analysed for this pilot. Browse by regulator, then instrument, then provision, or search by provision, instrument, or a recognised CFID fact pattern."
      />
      <LawLibraryClient instruments={instruments} provisions={provisions} findings={findings} />
    </div>
  );
}
