"use client";

import { useState } from "react";
import type { ScenarioFinding } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { SourceLink } from "@/components/Card";

const FIELDS: { label: string; render: (f: ScenarioFinding) => React.ReactNode }[] = [
  { label: "Case", render: (f) => f.caseName },
  { label: "Category", render: (f) => f.category },
  { label: "Scenario title", render: (f) => f.scenarioTitle },
  { label: "Factual pattern", render: (f) => f.factualPattern },
  { label: "Provisions considered", render: (f) => f.provisionsConsideredRaw },
  { label: "Noticees / actors", render: (f) => f.noticeeActors.join("; ") },
  { label: "Finding status", render: (f) => <StatusBadge status={f.findingStatus} /> },
  { label: "Interim paragraph references", render: (f) => f.interimParagraphReferences ?? "—" },
  { label: "Final paragraph references", render: (f) => f.finalParagraphReferences ?? "—" },
  { label: "Qualification / note", render: (f) => f.qualification ?? "—" },
  { label: "Missing facts / evidence (present-scenario gaps)", render: (f) => (f.evidentiaryGaps.length ? f.evidentiaryGaps.join("; ") : "—") },
  { label: "Outcome in this precedent", render: (f) => f.precedentOutcomeNote ?? "—" },
  { label: "Official source", render: (f) => <SourceLink href={f.officialSourceUrl} /> },
];

function FindingPicker({
  findings,
  value,
  onChange,
  label,
}: {
  findings: ScenarioFinding[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-ink-700)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
      >
        <option value="">Select a scenario finding…</option>
        {findings.map((f) => (
          <option key={f.recordId} value={f.recordId}>
            {f.recordId} — {f.scenarioTitle}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PrecedentCompareClient({ findings }: { findings: ScenarioFinding[] }) {
  const [leftId, setLeftId] = useState("SSSL-02");
  const [rightId, setRightId] = useState("SSSL-03");

  const left = findings.find((f) => f.recordId === leftId);
  const right = findings.find((f) => f.recordId === rightId);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FindingPicker findings={findings} value={leftId} onChange={setLeftId} label="Finding A" />
        <FindingPicker findings={findings} value={rightId} onChange={setRightId} label="Finding B" />
      </div>

      {left && right && (
        <div className="mt-6 overflow-x-auto rounded-sm bg-white border border-[var(--color-border)]">
          <table className="w-full min-w-[640px] divide-y divide-[var(--color-border)] text-sm">
            <thead>
              <tr className="bg-[var(--color-neutral-50)]">
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-700)]">Field</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-700)]">{left.recordId}</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-700)]">{right.recordId}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {FIELDS.map((field) => (
                <tr key={field.label}>
                  <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-[var(--color-ink-700)]">{field.label}</td>
                  <td className="px-4 py-3 align-top text-[var(--color-ink-900)]">{field.render(left)}</td>
                  <td className="px-4 py-3 align-top text-[var(--color-ink-900)]">{field.render(right)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
