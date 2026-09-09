import type { Order } from "@/types/domain";

/** Case Library's default ordering: newest order date first, descending —
 * an officer researching current matters expects the register itself to
 * behave like a chronological case register, not an alphabetical company
 * directory. Deterministic throughout (never relies on whatever order the
 * database happened to return rows in):
 *   1. orderDate descending (a later ISO date sorts first);
 *   2. for two orders sharing the same date, caseName ascending — a
 *      stable, human-meaningful secondary key, not left to insertion order;
 *   3. id ascending as a final tie-breaker in the (in practice never
 *      expected) case two orders share both date and caseName.
 * Orders with no orderDate yet (not yet retrieved/dated) are NOT dropped
 * (unlike Home's pickRecentOrders, which only ever shows a short "latest 5"
 * feed) — the Case Library must remain a complete register — they are
 * placed after every dated order, again ordered by caseName then id so
 * their relative position is itself deterministic. A standalone module
 * (not inlined in the page) so it stays independently unit-testable
 * without pulling in the server-only Supabase data layer. */
export function sortOrdersNewestFirst<T extends Pick<Order, "id" | "orderDate" | "caseName">>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    if (a.orderDate && b.orderDate) {
      const dateCompare = b.orderDate.localeCompare(a.orderDate);
      if (dateCompare !== 0) return dateCompare;
    } else if (a.orderDate || b.orderDate) {
      return a.orderDate ? -1 : 1;
    }
    const nameCompare = a.caseName.localeCompare(b.caseName);
    if (nameCompare !== 0) return nameCompare;
    return a.id.localeCompare(b.id);
  });
}
