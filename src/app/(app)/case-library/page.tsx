import { PageHeader } from "@/components/PageHeader";
import { CaseLibraryClient } from "@/components/CaseLibraryClient";
import { getOrders } from "@/lib/data";
import { isDeepAnalyzed } from "@/lib/processingStages";

export default async function CaseLibraryPage() {
  const orders = await getOrders();
  const deepAnalyzedCount = orders.filter((o) => isDeepAnalyzed(o.processingStage)).length;
  const pendingCount = orders.length - deepAnalyzedCount;
  const pendingClause =
    pendingCount > 0
      ? ` The remaining ${pendingCount} ${pendingCount === 1 ? "is" : "are"} genuine, CFID-verified orders whose text has not yet been retrieved and analysed in this environment (see the stage badge and the Admin Processing Dashboard for why).`
      : " Every order in the register has now reached that stage; none has yet been legally reviewed and signed off by a CFID officer — see the Admin Processing Dashboard for the current count.";
  return (
    <div>
      <PageHeader
        title="Case Library"
        description={`All ${orders.length} orders from the authoritative Verified_CFID_Order_Links.xlsx register, with their current processing stage. ${deepAnalyzedCount} of ${orders.length} are at "Citations checked" or "Legally reviewed" — broken down into scenario findings with paragraph citations ("Legally reviewed" additionally means a CFID officer has signed off).${pendingClause}`}
      />
      <CaseLibraryClient orders={orders} />
    </div>
  );
}
