import { PageHeader } from "@/components/PageHeader";
import { CaseLibraryClient } from "@/components/CaseLibraryClient";
import { CorpusReviewStatusBanner } from "@/components/CorpusReviewStatusBanner";
import { getOrders, getProvisions, getScenarioFindings } from "@/lib/data";
import { sortOrdersNewestFirst } from "@/lib/sortOrdersNewestFirst";
import { orderBroadScenarios } from "@/lib/orderBroadScenarios";

export default async function CaseLibraryPage() {
  const [orders, findings, provisions] = await Promise.all([getOrders(), getScenarioFindings(), getProvisions()]);
  const provisionSearchTextById = new Map(provisions.map((p) => [p.id, `${p.instrument} ${p.provisionNumber}`.toLowerCase()]));
  // Which provisions (as searchable "instrument + number" text) each order's
  // own findings cite — reuses the existing structured finding/provision
  // relationships already loaded elsewhere in the app, not a new search
  // backend. Built here (server-side, once) rather than in the client so
  // the client component only ever receives plain, already-joined strings.
  const provisionSearchTextByOrderId = new Map<string, string>();
  // "Issues Examined" (live-officer-review overhaul, item 7): the same
  // findings belonging to an order, grouped by order.id and run through
  // orderBroadScenarios -- the exact deterministic, canonical-taxonomy
  // mechanism Order Detail's own "Broad scenarios arising from this order"
  // already uses (see orderBroadScenarios.ts). No new issue vocabulary is
  // invented here: "Issues Examined" means subject matter considered, not
  // violation established, so a Final Order that examined an issue and
  // found the contravention not established still lists that issue.
  const findingsByOrderId = new Map<string, typeof findings>();
  for (const finding of findings) {
    for (const orderId of finding.orderIds) {
      const list = findingsByOrderId.get(orderId);
      if (list) list.push(finding);
      else findingsByOrderId.set(orderId, [finding]);
    }
  }
  const issuesByOrderId = new Map<string, { id: string; name: string }[]>();
  for (const [orderId, orderFindings] of findingsByOrderId) {
    issuesByOrderId.set(
      orderId,
      orderBroadScenarios(orderFindings).map((s) => ({ id: s.scenario.id, name: s.scenario.name }))
    );
  }
  for (const finding of findings) {
    const text = finding.provisionIds.map((id) => provisionSearchTextById.get(id)).filter((t): t is string => !!t).join(" ");
    if (!text) continue;
    for (const orderId of finding.orderIds) {
      const existing = provisionSearchTextByOrderId.get(orderId);
      provisionSearchTextByOrderId.set(orderId, existing ? `${existing} ${text}` : text);
    }
  }
  // Newest order first, deterministic tie-break — see
  // sortOrdersNewestFirst's own doc comment. Sorted once, server-side,
  // before filtering/search ever touches the list, so every filtered view
  // stays in the same chronological order.
  const ordersWithProvisionSearchText = sortOrdersNewestFirst(
    orders.map((o) => ({
      ...o,
      provisionSearchText: provisionSearchTextByOrderId.get(o.id) ?? "",
      issuesExamined: issuesByOrderId.get(o.id) ?? [],
    }))
  );
  return (
    <div>
      <PageHeader
        title="Case Library"
        description={'Search the CFID order register by case/company name, order number, order stage, or provision (e.g. "Regulation 23", "23(2)", "Ind AS 24"). Newest order first. A case whose findings have been turned into structured research data links through to full findings, provisions considered, and related orders in the same matter.'}
      />
      <CorpusReviewStatusBanner findings={findings} provisions={provisions} />
      <CaseLibraryClient orders={ordersWithProvisionSearchText} />
    </div>
  );
}
