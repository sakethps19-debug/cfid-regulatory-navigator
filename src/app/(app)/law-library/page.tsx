import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { getLegalInstruments, getProvisions } from "@/lib/data";

export default async function LawLibraryPage() {
  const [instruments, provisions] = await Promise.all([getLegalInstruments(), getProvisions()]);
  const provisionsByInstrument = new Map<string, typeof provisions>();
  for (const p of provisions) {
    const list = provisionsByInstrument.get(p.instrument) ?? [];
    list.push(p);
    provisionsByInstrument.set(p.instrument, list);
  }

  return (
    <div>
      <PageHeader
        title="Law Library"
        description="Every legal instrument and provision actually cited or applied in the orders analysed for this pilot — sourced only from the official SEBI website, the official MCA website, and official sources for notified accounting standards. Never law-firm articles, blogs, news reports, or commercial legal databases."
      />

      <div className="space-y-8">
        {instruments.map((instrument) => {
          const instrumentProvisions = provisionsByInstrument.get(instrument.name) ?? [];
          if (instrumentProvisions.length === 0) return null;
          return (
            <section key={instrument.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{instrument.name}</h2>
                <span className="text-xs text-[var(--color-ink-500)]">{instrument.issuingAuthority}</span>
              </div>
              {instrument.officialSourceUrl && (
                <div className="mt-1">
                  <SourceLink href={instrument.officialSourceUrl}>Official source for this instrument</SourceLink>
                </div>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...instrumentProvisions]
                  .sort((a, b) => b.ordersConsidered.length - a.ordersConsidered.length)
                  .map((p) => (
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
            </section>
          );
        })}
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
