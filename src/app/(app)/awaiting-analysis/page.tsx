import { PageHeader } from "@/components/PageHeader";
import { AwaitingAnalysisClient } from "@/components/AwaitingAnalysisClient";
import { awaitingAnalysis } from "@/lib/data";

export default function AwaitingAnalysisPage() {
  return (
    <div>
      <PageHeader
        title="Orders Awaiting Analysis"
        description={
          'Register built from Links.xlsx. Not every row is a verified precedent — rows are only admitted to the CFID precedent library after their order number is confirmed to contain "CFID". Rows marked "No order", rows without any link, and rows with unverified order numbers are flagged for manual review below. No row has been deleted; missing links will be added as they become available.'
        }
      />
      <AwaitingAnalysisClient rows={awaitingAnalysis} />
    </div>
  );
}
