import { PageHeader } from "@/components/PageHeader";
import { OrdersSearchClient } from "@/components/OrdersSearchClient";
import { getOrders } from "@/lib/data";
import { isDeepAnalyzed } from "@/lib/processingStages";

export default async function OrdersPage() {
  const allOrders = await getOrders();
  const orders = allOrders.filter((o) => isDeepAnalyzed(o.processingStage));
  return (
    <div>
      <PageHeader
        title="Search by Order"
        description={`Every order that has actually been opened, read, and broken down into scenario findings with paragraph citations (${orders.length} of ${allOrders.length} indexed orders). Most are citation-checked but not yet legally reviewed by a CFID officer — still ready for research use. See the Admin Processing Dashboard for the remaining orders and why they haven't been analysed yet.`}
      />
      <OrdersSearchClient orders={orders} />
    </div>
  );
}
