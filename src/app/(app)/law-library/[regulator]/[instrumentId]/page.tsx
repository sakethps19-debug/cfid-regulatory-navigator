import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { getLegalInstruments, getProvisions } from "@/lib/data";
import { REGULATOR_LABELS, isRegulatorSlug, regulatorSlugForAuthority } from "@/lib/regulators";

export default async function LawLibraryInstrumentPage({
  params,
}: {
  params: Promise<{ regulator: string; instrumentId: string }>;
}) {
  const { regulator, instrumentId } = await params;
  if (!isRegulatorSlug(regulator)) notFound();

  const [instruments, provisions] = await Promise.all([getLegalInstruments(), getProvisions()]);
  const instrument = instruments.find((i) => i.id === instrumentId);
  if (!instrument || regulatorSlugForAuthority(instrument.issuingAuthority) !== regulator) notFound();

  const instrumentProvisions = provisions
    .filter((p) => p.instrument === instrument.name)
    .sort((a, b) => b.ordersConsidered.length - a.ordersConsidered.length);
  if (instrumentProvisions.length === 0) notFound();

  return (
    <div>
      <Link href={`/law-library/${regulator}`} className="text-sm text-[var(--color-gold-700)] hover:underline">
        ← {REGULATOR_LABELS[regulator]}
      </Link>
      <PageHeader
        title={instrument.name}
        description={`${instrument.issuingAuthority} · ${instrumentProvisions.length} provision${
          instrumentProvisions.length === 1 ? "" : "s"
        } cited or applied in orders analysed for this pilot, sorted by how often each is cited.`}
        action={
          instrument.officialSourceUrl ? (
            <SourceLink href={instrument.officialSourceUrl}>Official source for this instrument</SourceLink>
          ) : undefined
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {instrumentProvisions.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/provisions/${p.id}`} className="text-sm font-semibold text-[var(--color-gold-700)] hover:underline">
                {p.provisionNumber}
              </Link>
              <span
                className="whitespace-nowrap rounded-sm bg-[var(--color-neutral-100)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-ink-700)]"
                title={`Cited or applied in ${p.ordersConsidered.length} case(s) analysed in this pilot`}
              >
                {p.ordersConsidered.length} case{p.ordersConsidered.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 flex-1 text-sm text-[var(--color-ink-700)]">{p.subject ?? "Subject not recorded."}</p>
            {p.currentTextVerificationStatus !== "Officially verified" && (
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-gold-700)]">
                ⚠ {p.currentTextVerificationStatus}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <p className="text-xs text-[var(--color-ink-500)]">
          &quot;Requires verification&quot; means the current statutory text has not been independently confirmed
          against the official source in this pilot — always check the official SEBI or MCA website before relying
          on any provision text. See the{" "}
          <Link href="/methodology" className="text-[var(--color-gold-700)] underline">
            Methodology &amp; Limitations
          </Link>{" "}
          page for the full sourcing policy.
        </p>
      </Card>
    </div>
  );
}
