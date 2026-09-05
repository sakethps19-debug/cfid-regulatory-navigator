import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ValidationIssuesClient } from "@/components/ValidationIssuesClient";
import { getValidationIssues } from "@/lib/data";

export default async function ValidationIssuesPage() {
  const issues = await getValidationIssues();
  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-gold-700)] hover:underline">
        ← Back to Admin Processing Dashboard
      </Link>
      <PageHeader
        title="Validation Issues"
        description="Every recorded data-integrity issue, each traceable to a specific order or source workbook row — orders awaiting retrieval, missing citations, and register housekeeping notes. Nothing here is silently dropped or hidden. Most rows here are informational (an order has not yet been retrieved), not defects — see severity."
      />
      <ValidationIssuesClient issues={issues} />
    </div>
  );
}
