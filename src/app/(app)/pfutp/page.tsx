import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { pfutpFocus } from "@/lib/data";

const STATUS_STYLES: Record<string, string> = {
  "Prima facie violated": "bg-amber-100 text-amber-800 ring-amber-300",
  Upheld: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  "Not upheld": "bg-rose-100 text-rose-800 ring-rose-300",
  "Partly upheld": "bg-sky-100 text-sky-800 ring-sky-300",
};

export default function PfutpPage() {
  return (
    <div>
      <PageHeader
        title="PFUTP Regulation 4(2)(e) — Focused View"
        description="An act or omission amounting to manipulation of the price of a security (PFUTP Regulations, 2003)."
      />

      <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-300">
        <strong>Critical distinction:</strong> PFUTP Regulation 4(2)(e) is not the same provision as LODR Regulation
        4(2)(e)(i) (board and management responsibility for financial statements presenting a true and fair view).
        These two provisions are never conflated in this pilot, even though both are frequently cited together in the
        same order.
      </div>

      <div className="space-y-4">
        {pfutpFocus.map((entry) => (
          <Card key={entry.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{entry.caseName}</h2>
                <p className="text-sm text-slate-600">
                  {entry.orderStage} · {entry.scenario}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  STATUS_STYLES[entry.findingOnPfutp42e] ?? "bg-slate-100 text-slate-700 ring-slate-300"
                }`}
              >
                {entry.findingOnPfutp42e}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{entry.reasoning}</p>
            <p className="mt-2 text-xs text-slate-500">{entry.paragraphReferences}</p>
            <div className="mt-2">
              <SourceLink href={entry.officialSourceUrl} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
