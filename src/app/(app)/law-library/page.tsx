import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getLegalInstruments, getProvisions } from "@/lib/data";
import { REGULATOR_LABELS, regulatorSlugForAuthority, type RegulatorSlug } from "@/lib/regulators";

export default async function LawLibraryPage() {
  const [instruments, provisions] = await Promise.all([getLegalInstruments(), getProvisions()]);

  const provisionCountByInstrument = new Map<string, number>();
  for (const p of provisions) {
    provisionCountByInstrument.set(p.instrument, (provisionCountByInstrument.get(p.instrument) ?? 0) + 1);
  }

  const byRegulator = new Map<RegulatorSlug, { instrumentCount: number; provisionCount: number }>();
  for (const instrument of instruments) {
    const provisionCount = provisionCountByInstrument.get(instrument.name) ?? 0;
    if (provisionCount === 0) continue; // instrument with nothing cited yet — not a browsable shelf
    const slug = regulatorSlugForAuthority(instrument.issuingAuthority);
    const existing = byRegulator.get(slug) ?? { instrumentCount: 0, provisionCount: 0 };
    byRegulator.set(slug, { instrumentCount: existing.instrumentCount + 1, provisionCount: existing.provisionCount + provisionCount });
  }

  return (
    <div>
      <PageHeader
        title="Law Library"
        description="Every legal instrument and provision actually cited or applied in the orders analysed for this pilot — sourced from the official SEBI website, the official MCA website, official sources for notified accounting standards, or (where noted) quoted verbatim in a CFID order on file. Never law-firm articles, blogs, news reports, or commercial legal databases. Browse by regulator, then instrument, then provision."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(REGULATOR_LABELS) as RegulatorSlug[]).map((slug) => {
          const stats = byRegulator.get(slug);
          if (!stats) return null;
          return (
            <Link key={slug} href={`/law-library/${slug}`}>
              <Card className="h-full transition hover:ring-1 hover:ring-[var(--color-gold-600)]">
                <h2 className="font-serif text-xl font-semibold text-[var(--color-ink-900)]">{REGULATOR_LABELS[slug]}</h2>
                <p className="mt-2 text-sm text-[var(--color-ink-700)]">
                  {stats.instrumentCount} instrument{stats.instrumentCount === 1 ? "" : "s"} · {stats.provisionCount}{" "}
                  provision{stats.provisionCount === 1 ? "" : "s"} cited
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
