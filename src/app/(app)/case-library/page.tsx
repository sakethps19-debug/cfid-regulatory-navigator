import { PageHeader } from "@/components/PageHeader";
import { CaseLibraryClient } from "@/components/CaseLibraryClient";
import { getOrders } from "@/lib/data";

export default async function CaseLibraryPage() {
  const orders = await getOrders();
  return (
    <div>
      <PageHeader
        title="Case Library"
        description={`All ${orders.length} orders from the authoritative Verified_CFID_Order_Links.xlsx register, with their current processing stage. Only orders at "Legally reviewed" have been broken down into scenario findings; every other row is a genuine, CFID-verified order whose text has not yet been retrieved and analysed in this environment (see the stage badge and the Admin Processing Dashboard for why).`}
      />
      <CaseLibraryClient orders={orders} />
    </div>
  );
}
