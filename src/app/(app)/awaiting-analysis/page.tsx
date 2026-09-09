import { redirect } from "next/navigation";

// Consolidated into the Admin Dashboard (application-wide demo-readiness
// sprint): "Orders Awaiting Analysis" is corpus-management information, not
// a regular-officer research task — keep this route alive as a redirect so
// old links and bookmarks still resolve.
export default function AwaitingAnalysisPage() {
  redirect("/admin/awaiting-analysis");
}
