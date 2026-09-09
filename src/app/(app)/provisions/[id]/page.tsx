import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { GROUP_INFO, GROUP_ORDER } from "@/components/FindingsByStatus";
import { ProvisionOrderList } from "@/components/ProvisionOrderList";
import { findingsForProvision, getOrders, getProvisionById, getProvisionVersions, getProvisions } from "@/lib/data";
import { findSimilarlyNumberedProvisions } from "@/lib/provisionSimilarity";
import { compareProvisionNumbers } from "@/lib/provisionOrder";
import { REGULATOR_LABELS, regulatorSlugForAuthority } from "@/lib/regulators";
import { formatDate } from "@/lib/formatDate";
import { broadScenariosForProvision } from "@/lib/broadScenarioMatch";

const RELATION_TEXT: Record<string, string> = {
  similarly_numbered_different_instrument: "distinct similarly-numbered provision in a different instrument",
  sub_clause_of: "is a sub-clause of this provision (same instrument)",
  parent_of: "this provision is a sub-clause of (same instrument)",
};

export default async function ProvisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provision = await getProvisionById(id);
  if (!provision) notFound();

  const [findings, allProvisions, versions, orders] = await Promise.all([
    findingsForProvision(provision.id),
    getProvisions(),
    getProvisionVersions(provision.id),
    getOrders(),
  ]);
  const similar = findSimilarlyNumberedProvisions(provision, allProvisions).sort((a, b) =>
    compareProvisionNumbers(a.provision.provisionNumber, b.provision.provisionNumber),
  );
  const regulatorSlug = provision.issuingAuthority ? regulatorSlugForAuthority(provision.issuingAuthority) : null;
  const ordersById = new Map(orders.map((o) => [o.id, o]));

  // In what broad CFID fact patterns has this provision actually been
  // invoked, across every finding that cites it — a small, descriptive
  // summary (Part 6/7), not the prescriptive "what should an officer
  // examine for this scenario" question Fixed Scenario Analysis answers.
  // Never implies the provision automatically applies whenever that
  // scenario recurs; see broadScenarioMatch.ts.
  const broadScenarios = broadScenariosForProvision(findings);

  // Most recent first, by the latest date among each finding's own linked
  // orders — same chronology convention as Home's Recent Orders.
  const findingsByRecency = [...findings].sort((a, b) => {
    const latest = (f: typeof a) =>
      f.orderIds
        .map((id) => ordersById.get(id)?.orderDate)
        .filter((d): d is string => !!d)
        .reduce((x, y) => (x > y ? x : y), "");
    return latest(b).localeCompare(latest(a));
  });

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
        <Link href="/law-library" className="text-[var(--color-gold-700)] hover:underline">
          Search all provisions
        </Link>
      </div>
      <PageHeader title={`${provision.instrument} · ${provision.provisionNumber}`} description={provision.subject ?? undefined} />

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
                    {v.effectiveFrom ? `Effective from ${formatDate(v.effectiveFrom)}` : ""}
                    {v.effectiveTo ? ` to ${formatDate(v.effectiveTo)}` : v.effectiveFrom ? " (current)" : ""}
                  </span>
                </div>
                {v.exactText ? (
                  // Prose measure: the workspace around this card may be wide
                  // on a large display, but the regulation text itself must
                  // stay at a readable line length rather than stretching
                  // edge-to-edge.
                  <blockquote className="max-w-prose whitespace-pre-wrap border-l-2 border-[var(--color-gold-600)] pl-3 text-sm text-[var(--color-ink-900)]">
                    {v.exactText}
                  </blockquote>
                ) : (
                  <p className="text-sm text-[var(--color-ink-500)]">
                    Not yet transcribed from the official source into this tool.
                  </p>
                )}
                {v.sourceUrl && (
                  <div className="mt-2">
                    <SourceLink href={v.sourceUrl}>Official source (PDF)</SourceLink>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">How this provision has been treated</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{provision.treatmentInPilotOrders}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Orders in which considered</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{provision.ordersConsidered.join(", ") || "-"}</dd>
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
          <div className="mt-4 rounded-md bg-[var(--color-gold-50)] p-3 text-xs text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
            <strong>Data-integrity check: similarly-numbered provisions.</strong> The following{" "}
            {similar.length === 1 ? "provision is" : "provisions are"} distinct from this one and must not be
            conflated with it, even though the numbering looks alike:
            <ul className="mt-1.5 list-inside list-disc space-y-0.5">
              {similar.map((s) => (
                <li key={s.provision.id}>
                  <Link href={`/provisions/${s.provision.id}`} className="underline">
                    {s.provision.instrument} · {s.provision.provisionNumber}
                  </Link>{" "}
                  ({RELATION_TEXT[s.relation]})
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Track record</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-700)]">
          Cited in {findings.length} scenario finding{findings.length === 1 ? "" : "s"} in this pilot&apos;s precedent
          library, by outcome, not a claim about how this provision has fared across every SEBI order, only the
          ones analysed here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GROUP_ORDER.map((status) => {
            const count = findings.filter((f) => f.findingStatus === status).length;
            if (count === 0) return null;
            return (
              <span
                key={status}
                className="rounded-sm bg-[var(--color-neutral-100)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-700)]"
                title={GROUP_INFO[status].hint}
              >
                {GROUP_INFO[status].title}: {count}
              </span>
            );
          })}
        </div>
      </Card>

      {broadScenarios.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Broad CFID scenarios</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-700)]">
            This provision has been invoked in orders involving these broad CFID fact patterns. Descriptive only —
            historical frequency is not legal applicability; this never means the provision automatically applies
            whenever one of these scenarios recurs.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {broadScenarios.map((s) => (
              <li key={s.id} className="rounded-sm bg-[var(--color-neutral-100)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-700)]" title={s.explanation}>
                {s.name}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink-900)]">Orders citing this provision</h2>
        <p className="mb-4 text-sm text-[var(--color-ink-700)]">Orders that expressly cite this exact provision, most recent first.</p>
        <ProvisionOrderList findings={findingsByRecency} ordersById={ordersById} />
      </Card>
    </div>
  );
}
