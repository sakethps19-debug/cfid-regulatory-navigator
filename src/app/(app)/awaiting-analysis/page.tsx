import { PageHeader } from "@/components/PageHeader";
import { AwaitingAnalysisClient } from "@/components/AwaitingAnalysisClient";
import { getResidualOrders, getVerifiedCfidOrders } from "@/lib/data";

export default async function AwaitingAnalysisPage() {
  const [verifiedCfidOrders, residualOrders] = await Promise.all([getVerifiedCfidOrders(), getResidualOrders()]);
  const deepAnalyzedCount = verifiedCfidOrders.filter((o) => o.analysisStatus === "deep_analyzed").length;
  return (
    <div>
      <PageHeader
        title="Orders Awaiting Analysis"
        description={`The verified CFID order register is the authoritative list of confirmed CFID orders — every order identifier here has been confirmed to contain "CFID" (see Methodology for how it's compiled). ${deepAnalyzedCount} of ${verifiedCfidOrders.length} have been turned into full scenario findings so far; every other verified order is genuine but still awaiting detailed analysis. The residual register is a separate exclusion and pending-link list — it is never used as a source of substantive CFID precedent unless a row is subsequently verified and moved into the list above. No row has been deleted from either register.`}
      />
      <AwaitingAnalysisClient verifiedRows={verifiedCfidOrders} residualRows={residualOrders} />
    </div>
  );
}
