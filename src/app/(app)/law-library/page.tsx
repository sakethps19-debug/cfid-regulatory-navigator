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
      <PageHeader
        title="Law Library"
        description='Every legal instrument and provision actually cited or applied in the orders analysed for this pilot — sourced from the official SEBI website, the official MCA website, official sources for notified accounting standards, or (where noted) quoted verbatim in a CFID order on file. Never law-firm articles, blogs, news reports, or commercial legal databases. Browse by regulator, then instrument, then provision — or search directly by provision, instrument, or the underlying facts (e.g. "related party transactions", "diversion of issue proceeds", "Audit Committee composition") and filter by finding status to jump straight to the provisions and cases that matter, across every instrument.'
      />
      <LawLibraryClient instruments={instruments} provisions={provisions} findings={findings} />
    </div>
  );
}
