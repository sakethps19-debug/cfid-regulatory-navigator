import { PageHeader } from "@/components/PageHeader";
import { CaseLibraryClient } from "@/components/CaseLibraryClient";
import { getOrders, getProvisions, getScenarioFindings } from "@/lib/data";

export default async function CaseLibraryPage() {
  const [orders, findings, provisions] = await Promise.all([getOrders(), getScenarioFindings(), getProvisions()]);
  const provisionSearchTextById = new Map(provisions.map((p) => [p.id, `${p.instrument} ${p.provisionNumber}`.toLowerCase()]));
  // Which provisions (as searchable "instrument + number" text) each order's
  // own findings cite — reuses the existing structured finding/provision
  // relationships already loaded elsewhere in the app, not a new search
  // backend. Built here (server-side, once) rather than in the client so
  // the client component only ever receives plain, already-joined strings.
  const provisionSearchTextByOrderId = new Map<string, string>();
  for (const finding of findings) {
    const text = finding.provisionIds.map((id) => provisionSearchTextById.get(id)).filter((t): t is string => !!t).join(" ");
    if (!text) continue;
    for (const orderId of finding.orderIds) {
      const existing = provisionSearchTextByOrderId.get(orderId);
      provisionSearchTextByOrderId.set(orderId, existing ? `${existing} ${text}` : text);
    }
  }
  const ordersWithProvisionSearchText = orders.map((o) => ({ ...o, provisionSearchText: provisionSearchTextByOrderId.get(o.id) ?? "" }));
  return (
    <div>
      <PageHeader
        title="Case Library"
        description={'Search the CFID order register by case/company name, order number, order stage, or provision (e.g. "Regulation 23", "23(2)", "Ind AS 24"). A case whose findings have been turned into structured research data links through to full findings, provisions considered, and related orders in the same matter.'}
      />
      <CaseLibraryClient orders={ordersWithProvisionSearchText} />
    </div>
  );
}
