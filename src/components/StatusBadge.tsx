import type { FindingStatus } from "@/types/domain";

const STYLES: Record<FindingStatus, string> = {
  Alleged: "bg-slate-100 text-slate-700 ring-slate-300",
  "Prima facie": "bg-amber-100 text-amber-800 ring-amber-300",
  "Confirmed at interim": "bg-amber-100 text-amber-800 ring-amber-300",
  Upheld: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  "Partly upheld": "bg-sky-100 text-sky-800 ring-sky-300",
  "Not upheld": "bg-rose-100 text-rose-800 ring-rose-300",
  Withdrawn: "bg-slate-100 text-slate-500 ring-slate-300",
  Inconclusive: "bg-slate-100 text-slate-600 ring-slate-300",
  "Procedural observation": "bg-violet-100 text-violet-800 ring-violet-300",
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}>
      {status}
    </span>
  );
}
