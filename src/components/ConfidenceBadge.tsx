import type { ConfidenceLevel } from "@/lib/matching/types";

const STYLES: Record<ConfidenceLevel, string> = {
  High: "bg-blue-100 text-blue-800 ring-blue-300",
  Medium: "bg-amber-100 text-amber-800 ring-amber-300",
  Low: "bg-slate-100 text-slate-600 ring-slate-300",
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[level]}`}>
      {level} confidence
    </span>
  );
}
