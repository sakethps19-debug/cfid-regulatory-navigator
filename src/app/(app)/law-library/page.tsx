import { PageHeader } from "@/components/PageHeader";
import { LawLibraryClient } from "@/components/LawLibraryClient";
import { CorpusReviewStatusBanner } from "@/components/CorpusReviewStatusBanner";
import { getLegalInstruments, getProvisions, getScenarioFindings } from "@/lib/data";

export default async function LawLibraryPage() {
  const [instruments, provisions, findings] = await Promise.all([
    getLegalInstruments(),
    getProvisions(),
    getScenarioFindings(),
  ]);

  return (
    <div>
      <PageHeader
        title="Law Library"
        description="Every legal instrument and provision actually cited or applied in the orders analysed for this pilot. Browse by regulator, then instrument, then provision, or search by provision, instrument, or a recognised CFID fact pattern, and filter by finding status to jump straight to the provisions and cases that matter."
      />
      <CorpusReviewStatusBanner findings={findings} provisions={provisions} />
      <LawLibraryClient instruments={instruments} provisions={provisions} findings={findings} />
    </div>
  );
}
