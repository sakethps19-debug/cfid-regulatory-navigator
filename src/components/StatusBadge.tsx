import type { FindingStatus } from "@/types/domain";

const STYLES: Record<FindingStatus, string> = {
  Alleged: "bg-[#eeece4] text-[#5a5647] ring-[#d5cfba]",
  "Prima facie": "bg-[#f5ecd9] text-[#7a5310] ring-[#dfc98f]",
  "Confirmed at interim": "bg-[#f5ecd9] text-[#7a5310] ring-[#dfc98f]",
  Upheld: "bg-[#e6ede3] text-[#204a2e] ring-[#a9c2a0]",
  "Partly upheld": "bg-[#e2ecee] text-[#1c4a56] ring-[#a3c6cd]",
  "Not upheld": "bg-[#f1e3df] text-[#7a2a1f] ring-[#dcaa9a]",
  Withdrawn: "bg-[#eeece4] text-[#7a7566] ring-[#d5cfba]",
  Inconclusive: "bg-[#eeece4] text-[#5a5647] ring-[#d5cfba]",
  "Procedural observation": "bg-[#ece3ee] text-[#4a2e5c] ring-[#c7abd1]",
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}>
      {status}
    </span>
  );
}
