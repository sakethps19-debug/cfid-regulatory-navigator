import { PageHeader } from "@/components/PageHeader";
import { CaseLibraryClient } from "@/components/CaseLibraryClient";
import { getOrders } from "@/lib/data";

export default async function CaseLibraryPage() {
  const orders = await getOrders();
  return (
    <div>
      <PageHeader
        title="Case Library"
        description="Search the CFID order register by case/company name, order number, or order stage. A case whose findings have been turned into structured research data (see its Research status) links through to full findings, provisions considered, and related orders in the same matter."
      />
      <CaseLibraryClient orders={orders} />
    </div>
  );
}
