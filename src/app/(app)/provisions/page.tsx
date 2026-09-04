import { PageHeader } from "@/components/PageHeader";
import { ProvisionExplorerClient } from "@/components/ProvisionExplorerClient";
import { getProvisions, getScenarioFindings } from "@/lib/data";

export default async function ProvisionExplorerPage() {
  const [provisions, findings] = await Promise.all([getProvisions(), getScenarioFindings()]);
  return (
    <div>
      <PageHeader
        title="Provision Explorer"
        description="Every SEBI Act section, PFUTP/LODR/ICDR/PIT/Takeover Regulation, Companies Act provision and accounting standard actually cited or applied in the analysed CFID orders — searchable by provision, instrument, or the underlying facts (e.g. related-party transactions, diversion of issue proceeds, Audit Committee composition). Select any provision to see its alleged, prima facie, upheld, partly upheld, not-upheld and procedural findings separately. This page works identically for every provision — none is treated as more central than another."
      />
      <ProvisionExplorerClient provisions={provisions} findings={findings} />
    </div>
  );
}
