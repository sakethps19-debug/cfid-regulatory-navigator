import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { FindingsByStatus } from "@/components/FindingsByStatus";
import { findingsForProvision, getProvisionById } from "@/lib/data";

export default async function RegulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provision = getProvisionById(id);
  if (!provision) notFound();

  const findings = findingsForProvision(provision.id);

  return (
    <div>
      <Link href="/regulations" className="text-sm text-blue-700 hover:underline">
        ← Back to Search by Regulation
      </Link>
      <PageHeader title={`${provision.instrument} — ${provision.provisionNumber}`} description={provision.subject} />

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Treatment in pilot orders</dt>
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
        {provision.id === "PFUTP-4-2-e" && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
            Do not confuse with LODR Regulation 4(2)(e)(i) (financial statements: true and fair view), which is a
            separate provision. See the dedicated{" "}
            <Link href="/pfutp" className="underline">
              PFUTP 4(2)(e) page
            </Link>
            .
          </p>
        )}
        {provision.id === "LODR-4-2-e-i" && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
            Do not confuse with PFUTP Regulation 4(2)(e) (act/omission amounting to manipulation of security price),
            which is a separate provision.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Scenario findings under this provision</h2>
        <FindingsByStatus findings={findings} />
      </Card>
    </div>
  );
}
