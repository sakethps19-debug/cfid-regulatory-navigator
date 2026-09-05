import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { FindingsByStatus } from "@/components/FindingsByStatus";
import { findingsForProvision, getProvisionById, getProvisionVersions, getProvisions } from "@/lib/data";
import { findSimilarlyNumberedProvisions } from "@/lib/provisionSimilarity";
import { REGULATOR_LABELS, regulatorSlugForAuthority } from "@/lib/regulators";

const RELATION_TEXT: Record<string, string> = {
  similarly_numbered_different_instrument: "distinct similarly-numbered provision in a different instrument",
  sub_clause_of: "is a sub-clause of this provision (same instrument)",
  parent_of: "this provision is a sub-clause of (same instrument)",
};

export default async function ProvisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provision = await getProvisionById(id);
  if (!provision) notFound();

  const [findings, allProvisions, versions] = await Promise.all([
    findingsForProvision(provision.id),
    getProvisions(),
    getProvisionVersions(provision.id),
  ]);
  const similar = findSimilarlyNumberedProvisions(provision, allProvisions);
  const regulatorSlug = provision.issuingAuthority ? regulatorSlugForAuthority(provision.issuingAuthority) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--color-ink-500)]">
        <Link href="/law-library" className="text-[var(--color-gold-700)] hover:underline">
          Law Library
        </Link>
        {regulatorSlug && (
          <>
            <span>/</span>
            <Link href={`/law-library/${regulatorSlug}`} className="text-[var(--color-gold-700)] hover:underline">
              {REGULATOR_LABELS[regulatorSlug]}
            </Link>
          </>
        )}
        {provision.instrumentId && (
          <>
            <span>/</span>
            <Link href={`/law-library/${regulatorSlug}/${provision.instrumentId}`} className="text-[var(--color-gold-700)] hover:underline">
              {provision.instrument}
            </Link>
          </>
        )}
        <span>/</span>
        <span>{provision.provisionNumber}</span>
        <span className="mx-1 text-[var(--color-border)]">·</span>
        <Link href="/provisions" className="text-[var(--color-gold-700)] hover:underline">
          Search all provisions
        </Link>
      </div>
      <PageHeader title={`${provision.instrument} — ${provision.provisionNumber}`} description={provision.subject ?? undefined} />

      <Card className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-[var(--color-ink-900)]">Statutory text</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-500)]">
            The verbatim current text of this provision has not yet been transcribed from the official source into
            this tool. Use the official source link below to read it directly.
          </p>
        ) : (
          <ul className="space-y-4">
            {versions.map((v) => (
              <li key={v.id} className="rounded-md border border-[var(--color-border)] p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-500)]">
                  <span className="font-semibold">{v.versionLabel}</span>
                  <span>
                    {v.effectiveFrom ? `Effective from ${v.effectiveFrom}` : ""}
                    {v.effectiveTo ? ` to ${v.effectiveTo}` : v.effectiveFrom ? " (current)" : ""}
                  </span>
                </div>
                {v.exactText ? (
                  <blockquote className="whitespace-pre-wrap border-l-2 border-[var(--color-gold-600)] pl-3 text-sm text-[var(--color-ink-900)]">
                    {v.exactText}
                  </blockquote>
                ) : (
                  <p className="text-sm text-[var(--color-ink-500)]">
                    Not yet transcribed from the official source into this tool.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      v.status === "officially_verified" ? "text-[#204a2e]" : "text-[var(--color-gold-700)]"
                    }`}
                  >
                    {v.status === "officially_verified" ? "✓ Verified against official source" : "⚠ Requires verification"}
                  </span>
                  {v.sourceUrl && <SourceLink href={v.sourceUrl}>Official source (PDF)</SourceLink>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">How this provision has been treated</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{provision.treatmentInPilotOrders}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Orders in which considered</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{provision.ordersConsidered.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Current-text verification status</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{provision.currentTextVerificationStatus}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Law-library note</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{provision.lawLibraryNote}</dd>
          </div>
        </dl>
        {provision.officialSource && (
          <div className="mt-4">
            <SourceLink href={provision.officialSource}>Official statutory source</SourceLink>
          </div>
        )}
        {similar.length > 0 && (
          <div className="mt-4 rounded-md bg-[var(--color-gold-50)] p-3 text-xs text-[#7a5310] ring-1 border-[#dfc98f]">
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
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink-900)]">Scenario findings under this provision</h2>
        <FindingsByStatus findings={findings} />
      </Card>
    </div>
  );
}
