import { redirect } from "next/navigation";

// Provision Explorer was merged into Law Library (same underlying provision
// index, now searchable/filterable from the Law Library home page) — keep
// this route alive as a redirect so old links and bookmarks still resolve.
export default function ProvisionsPage() {
  redirect("/law-library");
}
