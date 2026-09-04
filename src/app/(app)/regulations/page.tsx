import { PageHeader } from "@/components/PageHeader";
import { RegulationSearchClient } from "@/components/RegulationSearchClient";
import { provisions } from "@/lib/data";

export default function RegulationsPage() {
  return (
    <div>
      <PageHeader
        title="Search by Regulation"
        description="Browse SEBI Act sections, PFUTP and LODR Regulations, Companies Act provisions and Ind AS referenced in the pilot's analysed orders. Select a provision to see prima facie, upheld, partly upheld and not-upheld findings separately."
      />
      <RegulationSearchClient provisions={provisions} />
    </div>
  );
}
