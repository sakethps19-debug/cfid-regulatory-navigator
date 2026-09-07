import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { DataChangeLogClient } from "@/components/DataChangeLogClient";
import { getDataChangeLog } from "@/lib/data";

export default async function DataChangeLogPage() {
  const entries = await getDataChangeLog();
  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-gold-700)] hover:underline">
        ← Back to Admin Processing Dashboard
      </Link>
      <PageHeader
        title="Curated-Data Change Log"
        description="Every correction made directly to curated fields (conduct tags, transaction types, and similar) outside the normal import pipeline — what changed, from what to what, and why. Nothing here is silently overwritten: a record's tagging history stays visible even after it's corrected."
      />
      <DataChangeLogClient entries={entries} />
    </div>
  );
}
