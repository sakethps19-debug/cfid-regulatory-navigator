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
        description={`Verified_CFID_Order_Links.xlsx is the authoritative list of confirmed CFID orders — every order identifier here has been confirmed to contain "CFID". ${deepAnalyzedCount} of ${verifiedCfidOrders.length} have been turned into full scenario findings so far; every other verified order is genuine but still awaiting detailed analysis. Residual_Order_Links.xlsx is an exclusion and pending-link register only — it is never used as a source of substantive CFID precedent unless a row is subsequently verified and moved into the list above. No row has been deleted from either register.`}
      />
      <AwaitingAnalysisClient verifiedRows={verifiedCfidOrders} residualRows={residualOrders} />
    </div>
  );
}
