/** Renders an order's own orderStage (derived server-side from
 * orders.order_type — see ORDER_STAGE_LABELS in src/lib/data.ts) verbatim.
 * Never hard-codes an order-type value: once the canonical order_type is
 * corrected in the database, every render of this badge reflects the
 * correction automatically, with no component change required. */
export function OrderStageBadge({ orderStage }: { orderStage: string }) {
  return (
    <span className="inline-block rounded-sm bg-[var(--color-gold-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-600)]/50">
      {orderStage}
    </span>
  );
}
