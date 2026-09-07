"use client";

import { useState } from "react";
import { CONCEPT_TAGS } from "@/data/curated/concept-tags";
import type { AnalysisResult, ProvisionResult } from "@/lib/matching/types";
import type { LegalProvision } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { SourceLink } from "@/components/Card";
import { compareProvisionNumbers } from "@/lib/provisionOrder";
import { buildViolationParagraph } from "@/lib/provisionCitationParagraph";

/** "SEBI LODR Regulations, 2015" / "Companies Act, 2013" — the instrument
 * name prefixed with its issuing authority only when the name doesn't
 * already carry it (SEBI Act, SEBI ICDR etc. already do). Used to group
 * potentially-applicable provisions by regulatory framework so an officer
 * can scan "everything under LODR" vs "everything under PFUTP" at a glance,
 * rather than one flat list ordered purely by match score. */
function frameworkLabel(provision: LegalProvision): string {
  const { instrument, issuingAuthority } = provision;
  if (issuingAuthority && !instrument.toLowerCase().startsWith(issuingAuthority.toLowerCase())) {
    return `${issuingAuthority} ${instrument}`;
  }
  return instrument;
}

/** Groups provision results by regulatory framework. A group's position is
 * set by the first — i.e. highest-scoring — provision assigned to it, but
 * within each group the provisions are always in ascending order of their
 * own provision number (e.g. Regulation 4 before Regulation 17), never by
 * match score — an officer scanning "everything under LODR" expects the
 * regulations in the order the Act itself numbers them. */
function groupByFramework(provisionResults: ProvisionResult[]): { label: string; items: ProvisionResult[] }[] {
  const groups = new Map<string, ProvisionResult[]>();
  for (const pr of provisionResults) {
    const label = frameworkLabel(pr.provision);
    const list = groups.get(label) ?? [];
    list.push(pr);
    groups.set(label, list);
  }
  return [...groups.entries()].map(([label, items]) => ({
    label,
    items: [...items].sort((a, b) => compareProvisionNumbers(a.provision.provisionNumber, b.provision.provisionNumber)),
  }));
}

const ACTOR_OPTIONS = CONCEPT_TAGS.filter((t) => t.kind === "actor");
// "Scenario type" filters on allegedConduct (the alleged violation/scenario
// category, e.g. "Fraudulent/sham preferential allotment") -- deliberately
// NOT the "transaction" kind tags, which describe transaction subject
// matter (e.g. "Financial statement disclosure") rather than a violation.
// Offering those here read as claiming disclosure itself is a violation.
const SCENARIO_TYPE_OPTIONS = CONCEPT_TAGS.filter((t) => t.kind === "conduct");

const EXAMPLE_SCENARIOS = [
  {
    label: "Fictitious sales/assets",
    text: "For the last three years, the company recorded fictitious sales with counterparties that deny ever transacting with it, and its financial statements show assets that are not genuine and cannot be verified against any underlying delivery, inventory or bank records.",
  },
  {
    label: "Preferential allotment / circular funding",
    text: "A preferential allotment of shares was allegedly financed through a circular chain of loans and advances. The loans are recorded in the company's audited accounts, but it is unclear whether the third-party lenders were ever examined, and the allottees appear to have kept the sale proceeds from the shares.",
  },
  {
    label: "Funds via personal account",
    text: "Company funds, including statutory and operating payments, were routed through the promoter's personal bank account without clear board approval or disclosure.",
  },
  {
    label: "Audit Committee lapse",
    text: "The Audit Committee does not appear to have been properly constituted, and annual reports claim meetings were held for which no agendas or minutes can be produced.",
  },
  {
    label: "Rights issue funds diverted",
    text: "The company raised funds through a rights issue and represented to shareholders that the proceeds would be used for stated objects, but a large portion of the money was moved out to related entities instead of being used for the disclosed purpose.",
  },
  {
    label: "Related-party transaction not disclosed",
    text: "The company entered into a related-party transaction with a counterparty connected to the promoter, but the transaction was not disclosed in the related-party register and appears to have been misrepresented as an arm's-length dealing with an unconnected vendor.",
  },
  {
    label: "Non-disclosure of material information",
    text: "The company failed to disclose material information to the stock exchanges within the time required, and appears to have withheld or delayed disclosure of facts that were known to its board and senior management at the relevant time.",
  },
  {
    label: "False corporate announcement",
    text: "The company made a stock exchange announcement about an acquisition and future revenue projections that turned out to be unsubstantiated, with no supporting documentation for the claims made in the announcement.",
  },
  {
    label: "Compliance Officer vacancy",
    text: "The position of Compliance Officer / Company Secretary remained vacant for an extended period without a proper appointment, and no interim arrangement was disclosed to the stock exchanges.",
  },
  {
    label: "False CEO/CFO certification",
    text: "The Chief Executive Officer and Chief Financial Officer signed the quarterly compliance certification despite being aware of misstatements in the financial statements, and the certificate was not duly signed in accordance with the applicable regulation.",
  },
  {
    label: "Director duties / non-cooperation",
    text: "The independent directors failed to raise concerns despite red flags in the related-party transactions placed before the board, and the company did not cooperate with the investigation, failing to produce records called for by summons.",
  },
  {
    label: "Statutory auditor negligence",
    text: "The statutory auditor certified the company's financial statements for several years without detecting circular transactions between connected entities, despite the volume and repetitive nature of those transactions.",
  },
  {
    label: "Price/market manipulation",
    text: "A group of connected trading accounts executed synchronized trades in the company's shares with no genuine change in beneficial ownership, creating an artificial appearance of trading volume and inducing other investors to deal in the security.",
  },
];

function downloadTextFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resultToText(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push("CFID Regulatory Navigator: Scenario Analysis (research assistance only)");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push("Scenario:");
  lines.push(result.query.freeText);
  lines.push("");
  if (!result.hasResults) {
    lines.push("No potentially relevant provisions were identified from the pilot's analysed precedents.");
  }
  if (result.provisionResults.length > 0) {
    lines.push("Potential regulatory framework(s) implicated (prima facie / potentially relevant only):");
    for (const group of groupByFramework(result.provisionResults)) {
      lines.push(`  ${group.label}:`);
      for (const pr of group.items) {
        lines.push(`    - ${pr.provision.provisionNumber} [${pr.confidence} confidence]: ${pr.provision.subject ?? ""}`);
      }
    }
    lines.push("");

    const violationParagraph = buildViolationParagraph(
      result.provisionResults.map((pr) => ({ instrument: pr.provision.instrument, provisionNumber: pr.provision.provisionNumber })),
    );
    if (violationParagraph.length > 0) {
      lines.push("Potential regulatory framework(s) violated: summary paragraph (prima facie only, not a finding):");
      lines.push(
        `Based on the facts entered, the entity has, prima facie, potentially violated ${violationParagraph
          .map((v) => `${v.sentence} of the ${v.instrument}`)
          .join("; ")}.`,
      );
      lines.push("");
    }
  }
  const sortedForExport = [...result.provisionResults].sort((a, b) =>
    compareProvisionNumbers(a.provision.provisionNumber, b.provision.provisionNumber),
  );
  for (const pr of sortedForExport) {
    lines.push("----------------------------------------");
    lines.push(`${pr.provision.instrument} · ${pr.provision.provisionNumber}`);
    lines.push(`Subject: ${pr.provision.subject}`);
    lines.push(`Retrieval confidence: ${pr.confidence}`);
    lines.push(`Why potentially relevant: ${pr.whyRelevant}`);
    lines.push(`Applicable provision version: ${pr.applicableVersionNote}`);
    lines.push(`Factual ingredients matched: ${pr.matchedFactualIngredients.join("; ") || "none"}`);
    if (pr.upheldPrecedents.length > 0) {
      lines.push("Confirmed in Final Order in prior case(s):");
      for (const u of pr.upheldPrecedents) {
        lines.push(
          `  - [${u.finding.findingStatus}] ${u.finding.recordId} · ${u.finding.scenarioTitle} (${u.finding.finalParagraphReferences ?? u.finding.interimParagraphReferences}) · ${u.finding.officialSourceUrl}`
        );
      }
    } else {
      lines.push("Confirmed in Final Order in prior case(s): none in this pilot's precedent library, treat as unproven on these facts alone.");
    }
    lines.push("Supporting precedent(s):");
    for (const s of pr.supportingPrecedents) {
      lines.push(
        `  - [${s.finding.findingStatus}] ${s.finding.recordId} · ${s.finding.scenarioTitle} (${s.finding.finalParagraphReferences ?? s.finding.interimParagraphReferences}) · ${s.finding.officialSourceUrl}`
      );
      if (s.finding.precedentOutcomeNote) {
        lines.push(`      Outcome in the cited precedent: ${s.finding.precedentOutcomeNote}`);
      }
    }
    if (pr.contraryPrecedents.length > 0) {
      lines.push("Contrary precedent(s):");
      for (const c of pr.contraryPrecedents) {
        lines.push(
          `  - [${c.finding.findingStatus}] ${c.finding.recordId} · ${c.finding.scenarioTitle} (${c.finding.finalParagraphReferences ?? c.finding.interimParagraphReferences}) · ${c.finding.officialSourceUrl}`
        );
      }
    }
    if (pr.missingFacts.length > 0) {
      lines.push("Missing facts / evidence in the present scenario:");
      for (const m of pr.missingFacts) lines.push(`  - ${m}`);
    }
  }
  if (result.globalContraryPrecedents.length > 0) {
    lines.push("----------------------------------------");
    lines.push("Additional contrary precedents retrieved for fund-movement / allotment style facts:");
    for (const c of result.globalContraryPrecedents) {
      lines.push(`  - [${c.finding.findingStatus}] ${c.finding.recordId} · ${c.finding.scenarioTitle} · ${c.finding.officialSourceUrl}`);
    }
  }
  lines.push("");
  const allReferencedFindings = [...new Map(
    [
      ...result.provisionResults.flatMap((pr) => [...pr.supportingPrecedents, ...pr.contraryPrecedents, ...pr.upheldPrecedents]),
      ...result.globalContraryPrecedents,
    ].map((p) => [p.finding.recordId, p.finding])
  ).values()];
  const legallyReviewedCount = allReferencedFindings.filter((f) => f.humanLegalReviewCompleted).length;
  lines.push(
    "This result is based on the currently structured portion of the indexed case register; indexed orders that have not yet been deeply analysed are not represented here."
  );
  lines.push(
    legallyReviewedCount === 0
      ? "No findings in this result have yet been legally reviewed or signed off by a CFID officer."
      : `${legallyReviewedCount} of ${allReferencedFindings.length} referenced finding(s) in this result have been legally reviewed; the rest have not.`
  );
  lines.push(
    "This is research assistance only. It does not conclude that any violation has occurred and must not be treated as a finding of guilt."
  );
  return lines.join("\n");
}

/** Escapes a single CSV field per RFC 4180: wrap in quotes and double any
 * embedded quote whenever the value contains a comma, quote, or newline. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvRow(values: string[]): string {
  return values.map(csvField).join(",");
}

/** One row per provision result — the structured, spreadsheet-importable
 * counterpart to resultToText's narrative report. Deliberately omits the
 * upheld/contrary precedent breakdown and missing-facts detail that the
 * text export carries (those don't collapse into flat rows cleanly);
 * "Export as text" or "Print" remain the complete record. */
function resultToCsv(result: AnalysisResult): string {
  const rows: string[] = [];
  rows.push(
    csvRow([
      "Instrument",
      "Provision number",
      "Subject",
      "Retrieval confidence",
      "Supporting precedent count",
      "Matched factual ingredients",
      "Supporting precedent record IDs",
      "Missing facts / evidence",
    ])
  );
  const sorted = [...result.provisionResults].sort((a, b) =>
    compareProvisionNumbers(a.provision.provisionNumber, b.provision.provisionNumber)
  );
  for (const pr of sorted) {
    rows.push(
      csvRow([
        pr.provision.instrument,
        pr.provision.provisionNumber,
        pr.provision.subject ?? "",
        pr.confidence,
        String(pr.supportingPrecedents.length),
        pr.matchedFactualIngredients.join("; "),
        pr.supportingPrecedents.map((s) => s.finding.recordId).join("; "),
        pr.missingFacts.join("; "),
      ])
    );
  }
  return rows.join("\r\n");
}

export function ScenarioAnalyzerClient() {
  const [freeText, setFreeText] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [scenarioTypeFilter, setScenarioTypeFilter] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [flagOpenKey, setFlagOpenKey] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [flagError, setFlagError] = useState<string | null>(null);

  async function handleFlagSubmit(pr: ProvisionResult) {
    const findingRecordId = pr.supportingPrecedents[0]?.finding.recordId;
    if (!findingRecordId) return;
    setFlagSubmitting(true);
    setFlagError(null);
    try {
      const res = await fetch("/api/flag-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingRecordId, provisionCanonicalId: pr.provision.id, note: flagNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFlagError(data.error ?? "Could not submit this flag, please try again.");
        return;
      }
      setFlagged((prev) => new Set(prev).add(pr.provision.id));
      setFlagOpenKey(null);
      setFlagNote("");
    } catch {
      setFlagError("Could not submit this flag, please try again.");
    } finally {
      setFlagSubmitting(false);
    }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText, actorFilter, scenarioTypeFilter }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        setResult(null);
      } else {
        setResult(data as AnalysisResult);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFreeText("");
    setActorFilter("");
    setScenarioTypeFilter("");
    setResult(null);
    setError(null);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div id="scenario-analyzer-top" className="space-y-6">
      <form onSubmit={handleAnalyze} className="rounded-sm bg-white p-4 border border-[var(--color-border)] sm:p-6">
        <label htmlFor="scenario" className="block text-sm font-medium text-[var(--color-ink-700)]">
          Describe the factual scenario
        </label>
        <textarea
          id="scenario"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Describe the facts you want to research, e.g. transactions, actors involved, disclosures made or omitted, and any evidence you already have..."
          className="mt-2 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_SCENARIOS.map((ex) => (
            <button
              type="button"
              key={ex.label}
              onClick={() => setFreeText(ex.text)}
              className="rounded-sm border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-700)] hover:border-[var(--color-gold-600)] hover:text-[var(--color-gold-700)]"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="actorFilter" className="block text-sm font-medium text-[var(--color-ink-700)]">
              Actor / role (optional)
            </label>
            <select
              id="actorFilter"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
            >
              <option value="">Any</option>
              {ACTOR_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="scenarioTypeFilter" className="block text-sm font-medium text-[var(--color-ink-700)]">
              Scenario type (optional)
            </label>
            <select
              id="scenarioTypeFilter"
              value={scenarioTypeFilter}
              onChange={(e) => setScenarioTypeFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
            >
              <option value="">Any</option>
              {SCENARIO_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || !freeText.trim()}
            className="rounded-md bg-[var(--color-gold-700)] px-5 py-2 font-medium text-white transition hover:bg-[var(--color-gold-800)] disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
          >
            Clear / reset
          </button>
          {result && (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile("cfid-scenario-analysis.txt", resultToText(result))}
                className="rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
              >
                Export as text
              </button>
              {result.provisionResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadTextFile("cfid-scenario-analysis.csv", resultToCsv(result), "text/csv;charset=utf-8")}
                  className="rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
                >
                  Export as CSV
                </button>
              )}
            </>
          )}
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-md bg-[#f1e3df] px-4 py-3 text-sm text-[#7a2a1f] ring-1 border-[#dcaa9a]">
          {error}
        </div>
      )}

      {result && (() => {
        const frameworkGroups = groupByFramework(result.provisionResults);
        const violationParagraph = buildViolationParagraph(
          result.provisionResults.map((pr) => ({ instrument: pr.provision.instrument, provisionNumber: pr.provision.provisionNumber })),
        );
        // Every finding referenced anywhere in this result, deduplicated —
        // used only to check whether ANY of them has actually been legally
        // reviewed, never to claim the result as a whole "is reviewed".
        const allReferencedFindings = [...new Map(
          [
            ...result.provisionResults.flatMap((pr) => [...pr.supportingPrecedents, ...pr.contraryPrecedents, ...pr.upheldPrecedents]),
            ...result.globalContraryPrecedents,
          ].map((p) => [p.finding.recordId, p.finding])
        ).values()];
        const legallyReviewedCount = allReferencedFindings.filter((f) => f.humanLegalReviewCompleted).length;
        return (
        <div className="space-y-6">
          {result.hasResults && (
            <div className="rounded-sm bg-[var(--color-neutral-50)] px-4 py-2.5 text-xs text-[var(--color-ink-500)] ring-1 border-[var(--color-border)]">
              This result is based on the currently structured portion of the indexed case register; indexed orders
              that have not yet been deeply analysed are not represented here.{" "}
              {legallyReviewedCount === 0
                ? "No findings in this result have yet been legally reviewed or signed off by a CFID officer."
                : `${legallyReviewedCount} of ${allReferencedFindings.length} referenced finding(s) in this result have been legally reviewed; the rest have not.`}
            </div>
          )}

          {result.semanticAssist.length > 0 && (
            <div className="rounded-sm bg-[var(--color-neutral-50)] px-4 py-2.5 text-xs text-[var(--color-ink-500)] ring-1 border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-ink-700)]">Read as: </span>
              {result.semanticAssist.map((c, i) => (
                <span key={`${c.original}-${i}`}>
                  {i > 0 && ", "}
                  &quot;{c.original}&quot; → &quot;{c.corrected}&quot;
                </span>
              ))}
              {" "}(for matching only; your text as entered is unchanged below).
            </div>
          )}

          {result.detectedConceptLabels.length > 0 && (
            <div className="rounded-sm bg-[var(--color-gold-50)] p-4 text-sm text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-100)]">
              <span className="font-semibold">Concepts detected in your scenario: </span>
              {result.detectedConceptLabels.join(", ")}
              <p className="mt-1 text-xs font-normal text-[var(--color-gold-800)]/80">
                This is a classification of the entered text by the engine, not an established fact.
              </p>
            </div>
          )}

          {!result.hasResults && (
            <div className="rounded-sm bg-white p-6 text-sm text-[var(--color-ink-700)] border border-[var(--color-border)]">
              No potentially relevant provisions were identified from this pilot&apos;s analysed precedents using the
              facts entered. This does not mean no provision applies, it means the pilot&apos;s precedent library
              does not contain a comparable factual pattern. Try adding more detail about the transaction type,
              actors involved, or the nature of the alleged conduct.
            </div>
          )}

          {result.provisionResults.length > 0 && (
            <div className="rounded-sm border border-[var(--color-border)] bg-white">
              <div className="border-b border-[var(--color-border)] bg-[var(--color-navy-950)] px-4 py-2.5 sm:px-6">
                <p className="text-sm font-semibold text-white">
                  Potential regulatory framework{frameworkGroups.length === 1 ? "" : "s"} implicated:{" "}
                  {result.provisionResults.length} provision{result.provisionResults.length === 1 ? "" : "s"} across{" "}
                  {frameworkGroups.length} instrument{frameworkGroups.length === 1 ? "" : "s"}
                  {" · "}
                  {result.provisionResults.filter((pr) => pr.upheldPrecedents.length > 0).length} with a prior case confirmed in a final order
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Prima facie / potentially relevant only, not a finding that any provision has actually been violated.
                </p>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {frameworkGroups.map((group) => (
                  <div key={group.label} className="px-4 py-2.5 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">{group.label}</p>
                    <ul className="mt-1.5 divide-y divide-[var(--color-border)]/60">
                      {group.items.map((pr) => (
                        <li key={pr.provision.id}>
                          <a
                            href={`#provision-${pr.provision.id}`}
                            className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm hover:text-[var(--color-gold-700)]"
                          >
                            <span className="font-medium text-[var(--color-ink-900)]">{pr.provision.provisionNumber}</span>
                            <span className="flex items-center gap-2">
                              {pr.upheldPrecedents.length > 0 && (
                                <span className="rounded-sm bg-[#e6ede3] px-2 py-0.5 text-xs font-semibold text-[#204a2e] ring-1 ring-inset border-[#a9c2a0]">
                                  Final Order ×{pr.upheldPrecedents.length}
                                </span>
                              )}
                              <ConfidenceBadge level={pr.confidence} />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {violationParagraph.length > 0 && (
            <div className="rounded-sm border border-[var(--color-border)] bg-white p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                Potential regulatory framework(s) violated: summary paragraph
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-900)]">
                Based on the facts entered, the entity has, prima facie, potentially violated{" "}
                {violationParagraph.map((v, i) => (
                  <span key={v.instrument}>
                    {i > 0 && (i === violationParagraph.length - 1 ? "; and " : "; ")}
                    {v.sentence} of the {v.instrument}
                  </span>
                ))}
                .
              </p>
              <p className="mt-2 text-xs text-[var(--color-ink-500)]">
                Phrased the way a CFID order states its provisions-violated summary, built only from the provisions
                listed above, this is still prima facie similarity only, not a finding that any provision has
                actually been violated. See the detailed analysis below for each provision&apos;s own supporting and
                contrary precedents before relying on this summary.
              </p>
            </div>
          )}

          {frameworkGroups.map((group) => (
            <div key={group.label} className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                {group.label}
              </h3>
              {group.items.map((pr) => {
            const key = `${pr.provision.id}`;
            const isExpanded = expanded.has(key);
            return (
              <article
                key={key}
                id={`provision-${pr.provision.id}`}
                className="scroll-mt-20 rounded-sm bg-white p-4 border border-[var(--color-border)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-ink-900)]">
                      {pr.provision.instrument} · {pr.provision.provisionNumber}
                    </h3>
                    <p className="text-sm text-[var(--color-ink-700)]">{pr.provision.subject}</p>
                  </div>
                  <ConfidenceBadge level={pr.confidence} />
                </div>

                <p className="mt-3 text-sm text-[var(--color-ink-700)]">{pr.whyRelevant}</p>
                <p className="mt-2 text-xs italic text-[var(--color-ink-500)]">{pr.applicableVersionNote}</p>

                <div className="mt-2">
                  {flagged.has(pr.provision.id) ? (
                    <p className="text-xs text-[var(--color-ink-500)]">
                      Flagged for review, thank you. An officer will check this provision against the facts above.
                    </p>
                  ) : flagOpenKey === key ? (
                    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-neutral-50)] p-2.5">
                      <label className="text-xs font-medium text-[var(--color-ink-700)]" htmlFor={`flag-note-${key}`}>
                        What looks wrong about this provision for your facts? (optional)
                      </label>
                      <textarea
                        id={`flag-note-${key}`}
                        value={flagNote}
                        onChange={(e) => setFlagNote(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-sm border border-[var(--color-border)] px-2 py-1.5 text-sm text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
                        placeholder="e.g. this provision's subject has nothing to do with the facts I entered"
                      />
                      {flagError && <p className="mt-1 text-xs text-[#7a2a1f]">{flagError}</p>}
                      <div className="mt-1.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleFlagSubmit(pr)}
                          disabled={flagSubmitting}
                          className="rounded-sm bg-[var(--color-gold-700)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--color-gold-800)] disabled:opacity-60"
                        >
                          {flagSubmitting ? "Submitting…" : "Submit flag"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFlagOpenKey(null);
                            setFlagError(null);
                          }}
                          className="rounded-sm px-2.5 py-1 text-xs font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFlagOpenKey(key);
                        setFlagNote("");
                        setFlagError(null);
                      }}
                      className="text-xs font-medium text-[var(--color-ink-500)] underline decoration-dotted hover:text-[var(--color-ink-700)]"
                    >
                      This doesn&apos;t look right, flag for review
                    </button>
                  )}
                </div>

                {pr.matchedFactualIngredients.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                      Factual ingredients matched
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {pr.matchedFactualIngredients.map((ing) => (
                        <span key={ing} className="rounded-sm bg-[var(--color-neutral-100)] px-2.5 py-0.5 text-xs text-[var(--color-ink-700)]">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-lg bg-[#e6ede3] p-3 ring-1 border-[#a9c2a0]">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[#204a2e]">
                    {pr.upheldPrecedents.length > 0
                      ? `Confirmed in Final Order in ${pr.upheldPrecedents.length} prior case${pr.upheldPrecedents.length > 1 ? "s" : ""}`
                      : "Not yet confirmed in a final order in this pilot's precedent library"}
                  </h4>
                  {pr.upheldPrecedents.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {pr.upheldPrecedents.map((u) => (
                        <li key={u.finding.recordId} className="rounded-lg bg-white p-3 ring-1 border-[#a9c2a0]">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={u.finding.findingStatus} />
                            <span className="text-sm font-medium text-[var(--color-ink-900)]">{u.finding.recordId}</span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--color-ink-700)]">{u.finding.scenarioTitle}</p>
                          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                            {u.finding.finalParagraphReferences ?? u.finding.interimParagraphReferences}
                          </p>
                          <div className="mt-1">
                            <SourceLink href={u.finding.officialSourceUrl} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-[#204a2e]">
                      Only alleged, interim, or otherwise-not-yet-confirmed findings exist for this provision in the
                      pilot&apos;s precedent library, treat as unproven on these facts alone until a final order is
                      on record.
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Supporting precedent(s)</h4>
                    <ul className="mt-2 space-y-2">
                      {pr.supportingPrecedents.map((s) => (
                        <li key={s.finding.recordId} className="rounded-lg bg-[#e6ede3]/60 p-3 ring-1 border-[#a9c2a0]">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={s.finding.findingStatus} />
                            <span className="text-sm font-medium text-[var(--color-ink-900)]">{s.finding.recordId}</span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--color-ink-700)]">{s.finding.scenarioTitle}</p>
                          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                            {s.finding.finalParagraphReferences ?? s.finding.interimParagraphReferences}
                          </p>
                          {s.ingredientsNotEstablished.length > 0 && (
                            <p className="mt-1 text-xs text-[#7a5310]">
                              Also required in this precedent (not established by your facts):{" "}
                              {s.ingredientsNotEstablished.join("; ")}
                            </p>
                          )}
                          {s.finding.precedentOutcomeNote && (
                            <p className="mt-1 text-xs italic text-[#204a2e]">
                              Outcome in the cited precedent: {s.finding.precedentOutcomeNote}
                            </p>
                          )}
                          <div className="mt-1">
                            <SourceLink href={s.finding.officialSourceUrl} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Contrary precedent(s)</h4>
                    {pr.contraryPrecedents.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--color-ink-500)]">None identified for this provision.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {pr.contraryPrecedents.map((c) => (
                          <li key={c.finding.recordId} className="rounded-lg bg-[#f1e3df]/60 p-3 ring-1 border-[#dcaa9a]">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={c.finding.findingStatus} />
                              <span className="text-sm font-medium text-[var(--color-ink-900)]">{c.finding.recordId}</span>
                            </div>
                            <p className="mt-1 text-sm text-[var(--color-ink-700)]">{c.finding.scenarioTitle}</p>
                            {c.distinguishingNote && (
                              <p className="mt-1 text-xs font-medium text-[#7a2a1f]">{c.distinguishingNote}</p>
                            )}
                            <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                              {c.finding.finalParagraphReferences ?? c.finding.interimParagraphReferences}
                            </p>
                            <div className="mt-1">
                              <SourceLink href={c.finding.officialSourceUrl} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {pr.missingFacts.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                      Missing facts / evidence in the present scenario
                    </h4>
                    <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                      Outstanding evidence relevant to comparing your scenario against these precedents, never a
                      cited precedent&apos;s own historical outcome, which is shown separately under that precedent
                      above.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {pr.missingFacts.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-ink-700)]">
                          <input type="checkbox" className="mt-1" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleExpanded(key)}
                  className="mt-4 text-sm font-medium text-[var(--color-gold-700)] hover:underline"
                >
                  {isExpanded ? "Hide" : "Why was this result retrieved?"}
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-neutral-50)] p-3">
                    {(
                      [
                        ["Matched transaction type", pr.matchedByCategory.transactionTypes],
                        ["Matched actor / role", pr.matchedByCategory.actorRoles],
                        ["Matched alleged conduct", pr.matchedByCategory.allegedConduct],
                        ["Matched evidence indicators", pr.matchedByCategory.evidenceTypes],
                      ] as const
                    )
                      .filter(([, items]) => items.length > 0)
                      .map(([label, items]) => (
                        <div key={label}>
                          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">{label}</span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {items.map((i) => (
                              <span key={i} className="rounded-sm bg-white px-2 py-0.5 text-xs text-[var(--color-ink-700)] ring-1 ring-inset ring-[var(--color-border)]">
                                {i}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Match source</span>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-[var(--color-ink-700)]">
                        <li>Matched from the entered scenario text against the curated concept vocabulary (never an external search).</li>
                        {actorFilter && <li>The &quot;Actor / role&quot; filter was set and may have added to this result&apos;s score.</li>}
                        {scenarioTypeFilter && <li>The &quot;Scenario type&quot; filter was set and may have added to this result&apos;s score.</li>}
                        {result.semanticAssist.length > 0 && <li>One or more terms in the entered text were spelling-corrected before matching (see &quot;Read as&quot; above).</li>}
                      </ul>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Retrieval confidence basis</span>
                      <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-[var(--color-ink-700)]">
                        {pr.confidenceReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            );
              })}
            </div>
          ))}

          {result.globalContraryPrecedents.length > 0 && (
            <article className="rounded-sm bg-[#f1e3df] p-4  ring-1 border-[#dcaa9a] sm:p-6">
              <h3 className="text-base font-semibold text-[#7a2a1f]">
                Additional contrary precedent(s): fund-movement / allotment facts
              </h3>
              <p className="mt-1 text-sm text-[#7a2a1f]">
                Because the scenario involves preferential allotment, circular funding, alleged front entities, or
                unexplained fund movements, the following negative precedents are retrieved independently, even where
                they did not otherwise rank as a top match:
              </p>
              <ul className="mt-3 space-y-2">
                {result.globalContraryPrecedents.map((c) => (
                  <li key={c.finding.recordId} className="rounded-lg bg-white p-3 ring-1 border-[#dcaa9a]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={c.finding.findingStatus} />
                      <span className="text-sm font-medium text-[var(--color-ink-900)]">{c.finding.recordId}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-ink-700)]">{c.finding.scenarioTitle}</p>
                    {c.distinguishingNote && <p className="mt-1 text-xs font-medium text-[#7a2a1f]">{c.distinguishingNote}</p>}
                    <div className="mt-1">
                      <SourceLink href={c.finding.officialSourceUrl} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {result.fullTextSupplementalFindings.length > 0 && (
            <article className="rounded-sm bg-white p-4 border border-[var(--color-border)] sm:p-6">
              <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Also worth reviewing (full-text search)</h3>
              <p className="mt-1 text-sm text-[var(--color-ink-700)]">
                These findings matched the words of your scenario in a full-text search of the database but did not
                score highly enough on the curated fact-element tags above to be ranked as a match. They are not
                scored or ordered by relevance, review them yourself before relying on them.
              </p>
              <ul className="mt-3 space-y-2">
                {result.fullTextSupplementalFindings.map((f) => (
                  <li key={f.recordId} className="rounded-lg bg-[var(--color-neutral-50)] p-3 border border-[var(--color-border)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={f.findingStatus} />
                      <span className="text-sm font-medium text-[var(--color-ink-900)]">{f.recordId}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-ink-700)]">{f.scenarioTitle}</p>
                    <div className="mt-1">
                      <SourceLink href={f.officialSourceUrl} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {result.applicableGuardrails.length > 0 && (
            <article className="rounded-sm bg-[var(--color-neutral-50)] p-4 border border-[var(--color-border)] sm:p-6">
              <h3 className="text-base font-semibold text-[var(--color-ink-900)]">Applicable analytical guardrails</h3>
              <ul className="mt-3 space-y-3">
                {result.applicableGuardrails.map((g) => (
                  <li key={g.id} className="text-sm">
                    <p className="font-medium text-[var(--color-ink-900)]">{g.provisionOrIssue}</p>
                    <p className="text-[var(--color-ink-700)]">{g.workingPrinciple}</p>
                    <p className="mt-1 text-xs italic text-[var(--color-ink-500)]">Guardrail: {g.implementationGuardrail}</p>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>
        );
      })()}
      {result && result.provisionResults.length > 5 && (
        <a
          href="#scenario-analyzer-top"
          className="fixed bottom-6 right-6 z-30 rounded-full bg-[var(--color-navy-950)] px-4 py-2.5 text-sm font-medium text-white shadow-lg ring-1 ring-inset ring-[var(--color-gold-600)]/60 hover:bg-[var(--color-navy-800)]"
        >
          ↑ Back to top
        </a>
      )}
    </div>
  );
}
