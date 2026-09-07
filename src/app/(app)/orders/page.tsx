import { redirect } from "next/navigation";

// Search by Order was merged into Case Library (same underlying order
// register, now searchable/filterable in one place) — keep this route
// alive as a redirect so old links and bookmarks still resolve.
export default function OrdersPage() {
  redirect("/case-library");
}
