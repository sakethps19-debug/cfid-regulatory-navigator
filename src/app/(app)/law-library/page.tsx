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
                <h2 className="text-base font-semibold text-slate-900">{instrument.name}</h2>
                <span className="text-xs text-slate-500">{instrument.issuingAuthority}</span>
              </div>
              {instrument.officialSourceUrl && (
                <div className="mt-1">
                  <SourceLink href={instrument.officialSourceUrl}>Official source for this instrument</SourceLink>
                </div>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {instrumentProvisions.map((p) => (
                  <Card key={p.id}>
                    <Link href={`/regulations/${p.id}`} className="text-sm font-semibold text-blue-700 hover:underline">
                      {p.provisionNumber}
                    </Link>
                    <p className="mt-1 text-sm text-slate-700">{p.subject ?? "Subject not recorded."}</p>
                    <p className="mt-2 text-xs text-slate-500">{p.currentTextVerificationStatus}</p>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Card className="mt-8">
        <p className="text-xs text-slate-500">
          &quot;Requires verification&quot; means the current statutory text has not been independently confirmed
          against the official source in this pilot — always check the official SEBI or MCA website before relying
          on any provision text. See the{" "}
          <Link href="/methodology" className="text-blue-700 underline">
            Methodology &amp; Limitations
          </Link>{" "}
          page for the full sourcing policy.
        </p>
      </Card>
    </div>
  );
}
