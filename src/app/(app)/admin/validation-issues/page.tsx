import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ValidationIssuesClient } from "@/components/ValidationIssuesClient";
import { getValidationIssues } from "@/lib/data";

export default async function ValidationIssuesPage() {
  const issues = await getValidationIssues();
  return (
    <div>
      <Link href="/admin" className="text-sm text-blue-700 hover:underline">
        ← Back to Admin Processing Dashboard
      </Link>
      <PageHeader
        title="Validation Issues"
        description="Every recorded data-integrity issue, each traceable to a specific order or source workbook row — retrieval failures, missing citations, and register housekeeping notes. Nothing here is silently dropped or hidden."
      />
      <ValidationIssuesClient issues={issues} />
    </div>
  );
}
