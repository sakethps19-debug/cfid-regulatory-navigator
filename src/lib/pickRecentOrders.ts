import type { Order } from "@/types/domain";

/** Home "Recent Orders": strict chronology, latest order first — no status
 * priority, no preference for final over interim, no other selection
 * logic. Orders with no orderDate yet (not yet retrieved/dated) are
 * excluded since they can't be placed in the sequence. One entry per
 * order — never one per scenario finding — regardless of how many
 * findings that order produced. A standalone module (not inlined in the
 * page) so it stays importable from tests without pulling in the
 * server-only Supabase data layer the page itself depends on. */
export function pickRecentOrders(orders: Order[]): Order[] {
  return orders
    .filter((o): o is Order & { orderDate: string } => !!o.orderDate)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .slice(0, 5);
}
