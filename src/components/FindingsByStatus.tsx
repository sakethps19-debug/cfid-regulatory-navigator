import type { ScenarioFinding } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { SourceLink } from "@/components/Card";

const GROUPS: { title: string; statuses: ScenarioFinding["findingStatus"][]; hint: string }[] = [
  { title: "Prima facie findings", statuses: ["Prima facie"], hint: "Interim-stage findings only — not a final determination." },
  { title: "Final findings — upheld", statuses: ["Upheld"], hint: "Confirmed in a final order." },
  { title: "Partly upheld findings", statuses: ["Partly upheld"], hint: "Upheld in part; see the qualification for what was excluded." },
  { title: "Findings not upheld", statuses: ["Not upheld"], hint: "Rejected in a final order — an important contrary/negative precedent." },
];

function FindingRow({ finding }: { finding: ScenarioFinding }) {
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={finding.findingStatus} />
        <span className="text-sm font-semibold text-slate-900">{finding.recordId}</span>
        <span className="text-sm text-slate-600">{finding.caseName}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-800">{finding.scenarioTitle}</p>
      <p className="mt-1 text-sm text-slate-600">{finding.factualPattern}</p>
      {finding.qualification && <p className="mt-1 text-xs italic text-slate-500">{finding.qualification}</p>}
      <p className="mt-1 text-xs text-slate-500">
        {finding.interimParagraphReferences && <span>Interim: {finding.interimParagraphReferences}. </span>}
        {finding.finalParagraphReferences && <span>Final: {finding.finalParagraphReferences}.</span>}
      </p>
      <div className="mt-1">
        <SourceLink href={finding.officialSourceUrl} />
      </div>
    </li>
  );
}

export function FindingsByStatus({ findings }: { findings: ScenarioFinding[] }) {
  if (findings.length === 0) {
    return <p className="text-sm text-slate-500">No scenario findings are linked to this item in the pilot data.</p>;
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {GROUPS.map((group) => {
        const items = findings.filter((f) => group.statuses.includes(f.findingStatus));
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
            <p className="text-xs text-slate-500">{group.hint}</p>
            <ul className="mt-2 space-y-2">
              {items.map((f) => (
                <FindingRow key={f.recordId} finding={f} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
