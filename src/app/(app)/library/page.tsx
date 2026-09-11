import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { getOrders, getProvisions, getProvisionVersionsByProvisionId, getVerifiedCfidOrders } from "@/lib/data";
import { isDeepAnalyzed } from "@/lib/processingStages";
import { formatDate } from "@/lib/formatDate";
import { countProvisionTextProvenance, PROVISION_TEXT_PROVENANCE } from "@/lib/provisionTextProvenance";
import { NARRATIVE_JUSTIFY_ONLY } from "@/lib/proseClasses";

export default async function LibraryPage() {
  const [allOrders, provisions, verifiedCfidOrders, versionsByProvisionId] = await Promise.all([
    getOrders(),
    getProvisions(),
    getVerifiedCfidOrders(),
    getProvisionVersionsByProvisionId(),
  ]);
  const orders = allOrders.filter((o) => isDeepAnalyzed(o.processingStage));
  const byInstrument = new Map<string, number>();
  for (const p of provisions) byInstrument.set(p.instrument, (byInstrument.get(p.instrument) ?? 0) + 1);

  // Live-computed, never hardcoded — see provisionTextProvenance.ts. The
  // corpus genuinely contains provisions in all three provenance states plus
  // provisions with no version on file at all; a blanket "always Requires
  // verification" claim would misstate the officially_verified and
  // order_cited_text_only provisions actually on file.
  const provenanceCounts = countProvisionTextProvenance(provisions.length, versionsByProvisionId);

  return (
    <div>
      <PageHeader
        title="Source Library"
        description="Official sources used in this pilot. Only the official SEBI website (orders, Acts, regulations, circulars), the official MCA website, official sources for notified accounting standards, and sources expressly referred to within the SEBI orders themselves are used, never law-firm articles, blogs, news reports, commercial databases, or unofficial reproductions."
      />

      <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Orders in the structured precedent library ({orders.length})</h2>
      <p className={`mb-3 text-sm text-[var(--color-ink-700)] ${NARRATIVE_JUSTIFY_ONLY}`}>
        These orders have been broken down into individual scenario findings with paragraph references. See{" "}
        <Link href="/case-library" className="text-[var(--color-gold-700)] hover:underline">
          the complete indexed order register
        </Link>{" "}
        for all {verifiedCfidOrders.length} confirmed CFID orders, including those not yet broken down.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <Card key={o.id}>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">{o.caseName}</h3>
            <p className="text-sm text-[var(--color-ink-700)]">
              {o.orderStage} · {formatDate(o.orderDate)}
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--color-ink-500)]">{o.orderNumber}</p>
            <p className="mt-2 text-sm text-[var(--color-ink-700)]">{o.authority}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SourceLink href={o.officialUrl} />
              <Link href={`/orders/${o.id}`} className="text-sm font-medium text-[var(--color-gold-700)] hover:underline">
                View full breakdown →
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Provisions indexed by instrument</h2>
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[...byInstrument.entries()].map(([instrument, count]) => (
            <div key={instrument} className="flex items-center justify-between rounded-md bg-[var(--color-neutral-50)] px-3 py-2 text-sm">
              <dt className="text-[var(--color-ink-700)]">{instrument}</dt>
              <dd className="font-semibold text-[var(--color-ink-900)]">{count}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-4 text-xs text-[var(--color-ink-500)] ${NARRATIVE_JUSTIFY_ONLY}`}>
          These {provisions.length} provisions are only the ones actually cited in the orders analysed so far, they
          do not represent the complete CFID law library, and the count will grow as more orders are analysed.
        </p>
        <p className={`mt-2 text-xs text-[var(--color-ink-500)] ${NARRATIVE_JUSTIFY_ONLY}`}>
          Provision text on file, across {provenanceCounts.totalVersions} recorded version
          {provenanceCounts.totalVersions === 1 ? "" : "s"}: {provenanceCounts.officiallyVerifiedVersions}{" "}
          <span className="font-medium">&quot;{PROVISION_TEXT_PROVENANCE.officially_verified.label}&quot;</span>,{" "}
          {provenanceCounts.orderCitedTextOnlyVersions}{" "}
          <span className="font-medium">&quot;{PROVISION_TEXT_PROVENANCE.order_cited_text_only.label}&quot;</span>,{" "}
          {provenanceCounts.requiresVerificationVersions}{" "}
          <span className="font-medium">&quot;{PROVISION_TEXT_PROVENANCE.requires_verification.label}&quot;</span>.{" "}
          {provenanceCounts.provisionsWithNoVersionOnFile > 0 && (
            <>
              A further {provenanceCounts.provisionsWithNoVersionOnFile} provision
              {provenanceCounts.provisionsWithNoVersionOnFile === 1 ? "" : "s"} have no version text on file at all
              yet.{" "}
            </>
          )}
          &quot;{PROVISION_TEXT_PROVENANCE.order_cited_text_only.label}&quot; is text captured from an indexed SEBI
          order that quoted the provision, not an independent verification of the current statutory text. Always
          confirm the current in-force text on the official SEBI or MCA website before relying on it.
        </p>
      </Card>
    </div>
  );
}
