import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { FindingsByStatus } from "@/components/FindingsByStatus";
import { findingsForProvision, getProvisionById, getProvisions } from "@/lib/data";
import { findSimilarlyNumberedProvisions } from "@/lib/provisionSimilarity";

const RELATION_TEXT: Record<string, string> = {
  same_number_different_instrument: "shares the same number under a different instrument",
  sub_clause_of: "is a sub-clause of this provision",
  parent_of: "this provision is a sub-clause of",
};

export default async function ProvisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provision = await getProvisionById(id);
  if (!provision) notFound();

  const [findings, allProvisions] = await Promise.all([findingsForProvision(provision.id), getProvisions()]);
  const similar = findSimilarlyNumberedProvisions(provision, allProvisions);

  return (
    <div>
      <Link href="/provisions" className="text-sm text-blue-700 hover:underline">
        ← Back to Provision Explorer
      </Link>
      <PageHeader title={`${provision.instrument} — ${provision.provisionNumber}`} description={provision.subject ?? undefined} />

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">How this provision has been treated</dt>
            <dd className="mt-1 text-sm text-slate-700">{provision.treatmentInPilotOrders}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orders in which considered</dt>
            <dd className="mt-1 text-sm text-slate-700">{provision.ordersConsidered.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current-text verification status</dt>
            <dd className="mt-1 text-sm text-slate-700">{provision.currentTextVerificationStatus}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Law-library note</dt>
            <dd className="mt-1 text-sm text-slate-700">{provision.lawLibraryNote}</dd>
          </div>
        </dl>
        {provision.officialSource && (
          <div className="mt-4">
            <SourceLink href={provision.officialSource}>Official statutory source</SourceLink>
          </div>
        )}
        {similar.length > 0 && (
          <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
            <strong>Data-integrity check — similarly-numbered provisions:</strong> the following{" "}
            {similar.length === 1 ? "provision is" : "provisions are"} distinct from this one and must not be
            conflated with it, even though the numbering looks alike:
            <ul className="mt-1.5 list-inside list-disc space-y-0.5">
              {similar.map((s) => (
                <li key={s.provision.id}>
                  <Link href={`/provisions/${s.provision.id}`} className="underline">
                    {s.provision.instrument} — {s.provision.provisionNumber}
                  </Link>{" "}
                  ({RELATION_TEXT[s.relation]})
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Scenario findings under this provision</h2>
        <FindingsByStatus findings={findings} />
      </Card>
    </div>
  );
}
