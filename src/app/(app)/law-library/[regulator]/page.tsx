import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getLegalInstruments, getProvisions } from "@/lib/data";
import { REGULATOR_LABELS, isRegulatorSlug, regulatorSlugForAuthority } from "@/lib/regulators";

export default async function LawLibraryRegulatorPage({ params }: { params: Promise<{ regulator: string }> }) {
  const { regulator } = await params;
  if (!isRegulatorSlug(regulator)) notFound();

  const [instruments, provisions] = await Promise.all([getLegalInstruments(), getProvisions()]);
  const provisionCountByInstrument = new Map<string, number>();
  for (const p of provisions) {
    provisionCountByInstrument.set(p.instrument, (provisionCountByInstrument.get(p.instrument) ?? 0) + 1);
  }

  const instrumentsForRegulator = instruments
    .filter((i) => regulatorSlugForAuthority(i.issuingAuthority) === regulator)
    .map((i) => ({ ...i, provisionCount: provisionCountByInstrument.get(i.name) ?? 0 }))
    .filter((i) => i.provisionCount > 0)
    .sort((a, b) => b.provisionCount - a.provisionCount);

  if (instrumentsForRegulator.length === 0) notFound();

  return (
    <div>
      <Link href="/law-library" className="text-sm text-[var(--color-gold-700)] hover:underline">
        ← Law Library
      </Link>
      <PageHeader
        title={REGULATOR_LABELS[regulator]}
        description="Instruments under this regulator with at least one provision actually cited or applied in an order analysed for this pilot."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instrumentsForRegulator.map((instrument) => (
          <Link key={instrument.id} href={`/law-library/${regulator}/${instrument.id}`}>
            <Card className="h-full transition hover:ring-1 hover:ring-[var(--color-gold-600)]">
              <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{instrument.name}</h2>
              <p className="mt-1 text-xs text-[var(--color-ink-500)]">{instrument.issuingAuthority}</p>
              <p className="mt-2 text-sm text-[var(--color-ink-700)]">
                {instrument.provisionCount} provision{instrument.provisionCount === 1 ? "" : "s"}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
