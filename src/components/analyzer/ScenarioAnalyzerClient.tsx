"use client";

import { useState } from "react";
import { CONCEPT_TAGS } from "@/data/curated/concept-tags";
import type { AnalysisResult } from "@/lib/matching/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { SourceLink } from "@/components/Card";

const ACTOR_OPTIONS = CONCEPT_TAGS.filter((t) => t.kind === "actor");
const TRANSACTION_OPTIONS = CONCEPT_TAGS.filter((t) => t.kind === "transaction");

const EXAMPLE_SCENARIOS = [
  {
    label: "Fictitious sales/assets",
    text: "The company's financial statements for the last three years appear to show sales and assets that cannot be verified — a large proportion of recorded revenue and assets may not be genuine.",
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
];

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
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
  lines.push("CFID Regulatory Navigator — Scenario Analysis (research assistance only)");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push("Scenario:");
  lines.push(result.query.freeText);
  lines.push("");
  if (!result.hasResults) {
    lines.push("No potentially relevant provisions were identified from the pilot's analysed precedents.");
  }
  for (const pr of result.provisionResults) {
    lines.push("----------------------------------------");
    lines.push(`${pr.provision.instrument} — ${pr.provision.provisionNumber}`);
    lines.push(`Subject: ${pr.provision.subject}`);
    lines.push(`Confidence: ${pr.confidence}`);
    lines.push(`Why potentially relevant: ${pr.whyRelevant}`);
    lines.push(`Applicable provision version: ${pr.applicableVersionNote}`);
    lines.push(`Factual ingredients matched: ${pr.matchedFactualIngredients.join("; ") || "none"}`);
    lines.push("Supporting precedent(s):");
    for (const s of pr.supportingPrecedents) {
      lines.push(
        `  - [${s.finding.findingStatus}] ${s.finding.recordId} — ${s.finding.scenarioTitle} (${s.finding.finalParagraphReferences ?? s.finding.interimParagraphReferences}) — ${s.finding.officialSourceUrl}`
      );
      if (s.finding.precedentOutcomeNote) {
        lines.push(`      Outcome in the cited precedent: ${s.finding.precedentOutcomeNote}`);
      }
    }
    if (pr.contraryPrecedents.length > 0) {
      lines.push("Contrary precedent(s):");
      for (const c of pr.contraryPrecedents) {
        lines.push(
          `  - [${c.finding.findingStatus}] ${c.finding.recordId} — ${c.finding.scenarioTitle} (${c.finding.finalParagraphReferences ?? c.finding.interimParagraphReferences}) — ${c.finding.officialSourceUrl}`
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
      lines.push(`  - [${c.finding.findingStatus}] ${c.finding.recordId} — ${c.finding.scenarioTitle} — ${c.finding.officialSourceUrl}`);
    }
  }
  lines.push("");
  lines.push(
    "This is research assistance only. It does not conclude that any violation has occurred and must not be treated as a finding of guilt."
  );
  return lines.join("\n");
}

export function ScenarioAnalyzerClient() {
  const [freeText, setFreeText] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText, actorFilter, transactionTypeFilter }),
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
    setTransactionTypeFilter("");
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
    <div className="space-y-6">
      <form onSubmit={handleAnalyze} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <label htmlFor="scenario" className="block text-sm font-medium text-slate-700">
          Describe the factual scenario
        </label>
        <textarea
          id="scenario"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={7}
          maxLength={4000}
          placeholder="Describe the facts you want to research — e.g. transactions, actors involved, disclosures made or omitted, and any evidence you already have..."
          className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_SCENARIOS.map((ex) => (
            <button
              type="button"
              key={ex.label}
              onClick={() => setFreeText(ex.text)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="actorFilter" className="block text-sm font-medium text-slate-700">
              Actor / role (optional)
            </label>
            <select
              id="actorFilter"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
            <label htmlFor="txFilter" className="block text-sm font-medium text-slate-700">
              Transaction type (optional)
            </label>
            <select
              id="txFilter"
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Any</option>
              {TRANSACTION_OPTIONS.map((o) => (
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
            className="rounded-md bg-blue-700 px-5 py-2 font-medium text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear / reset
          </button>
          {result && (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile("cfid-scenario-analysis.txt", resultToText(result))}
                className="rounded-md border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Export as text
              </button>
            </>
          )}
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {result.detectedConceptLabels.length > 0 && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-200">
              <span className="font-semibold">Concepts detected in your scenario: </span>
              {result.detectedConceptLabels.join(", ")}
            </div>
          )}

          {!result.hasResults && (
            <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
              No potentially relevant provisions were identified from this pilot&apos;s three analysed orders using the
              facts entered. This does not mean no provision applies — it means the pilot&apos;s limited precedent
              library does not contain a comparable factual pattern. Try adding more detail about the transaction type,
              actors involved, or the nature of the alleged conduct.
            </div>
          )}

          {result.provisionResults.map((pr) => {
            const key = `${pr.provision.id}`;
            const isExpanded = expanded.has(key);
            return (
              <article key={key} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {pr.provision.instrument} — {pr.provision.provisionNumber}
                    </h3>
                    <p className="text-sm text-slate-600">{pr.provision.subject}</p>
                  </div>
                  <ConfidenceBadge level={pr.confidence} />
                </div>

                <p className="mt-3 text-sm text-slate-700">{pr.whyRelevant}</p>
                <p className="mt-2 text-xs italic text-slate-500">{pr.applicableVersionNote}</p>

                {pr.matchedFactualIngredients.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Factual ingredients matched
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {pr.matchedFactualIngredients.map((ing) => (
                        <span key={ing} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supporting precedent(s)</h4>
                    <ul className="mt-2 space-y-2">
                      {pr.supportingPrecedents.map((s) => (
                        <li key={s.finding.recordId} className="rounded-lg bg-emerald-50/60 p-3 ring-1 ring-emerald-200">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={s.finding.findingStatus} />
                            <span className="text-sm font-medium text-slate-900">{s.finding.recordId}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{s.finding.scenarioTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {s.finding.finalParagraphReferences ?? s.finding.interimParagraphReferences}
                          </p>
                          {s.ingredientsNotEstablished.length > 0 && (
                            <p className="mt-1 text-xs text-amber-700">
                              Also required in this precedent (not established by your facts):{" "}
                              {s.ingredientsNotEstablished.join("; ")}
                            </p>
                          )}
                          {s.finding.precedentOutcomeNote && (
                            <p className="mt-1 text-xs italic text-emerald-700">
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
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contrary precedent(s)</h4>
                    {pr.contraryPrecedents.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">None identified for this provision.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {pr.contraryPrecedents.map((c) => (
                          <li key={c.finding.recordId} className="rounded-lg bg-rose-50/60 p-3 ring-1 ring-rose-200">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={c.finding.findingStatus} />
                              <span className="text-sm font-medium text-slate-900">{c.finding.recordId}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">{c.finding.scenarioTitle}</p>
                            {c.distinguishingNote && (
                              <p className="mt-1 text-xs font-medium text-rose-800">{c.distinguishingNote}</p>
                            )}
                            <p className="mt-1 text-xs text-slate-500">
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
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Missing facts / evidence in the present scenario
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Outstanding evidence relevant to comparing your scenario against these precedents — never a
                      cited precedent&apos;s own historical outcome, which is shown separately under that precedent
                      above.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {pr.missingFacts.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
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
                  className="mt-4 text-sm font-medium text-blue-700 hover:underline"
                >
                  {isExpanded ? "Hide reasoning" : "Show reasoning / confidence basis"}
                </button>
                {isExpanded && (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                    {pr.confidenceReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}

          {result.globalContraryPrecedents.length > 0 && (
            <article className="rounded-xl bg-rose-50 p-4 shadow-sm ring-1 ring-rose-200 sm:p-6">
              <h3 className="text-base font-semibold text-rose-900">
                Additional contrary precedent(s) — fund-movement / allotment facts
              </h3>
              <p className="mt-1 text-sm text-rose-800">
                Because the scenario involves preferential allotment, circular funding, alleged front entities, or
                unexplained fund movements, the following negative precedents are retrieved independently, even where
                they did not otherwise rank as a top match:
              </p>
              <ul className="mt-3 space-y-2">
                {result.globalContraryPrecedents.map((c) => (
                  <li key={c.finding.recordId} className="rounded-lg bg-white p-3 ring-1 ring-rose-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={c.finding.findingStatus} />
                      <span className="text-sm font-medium text-slate-900">{c.finding.recordId}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{c.finding.scenarioTitle}</p>
                    {c.distinguishingNote && <p className="mt-1 text-xs font-medium text-rose-800">{c.distinguishingNote}</p>}
                    <div className="mt-1">
                      <SourceLink href={c.finding.officialSourceUrl} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {result.fullTextSupplementalFindings.length > 0 && (
            <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">Also worth reviewing (full-text search)</h3>
              <p className="mt-1 text-sm text-slate-600">
                These findings matched the words of your scenario in a full-text search of the database but did not
                score highly enough on the curated fact-element tags above to be ranked as a match. They are not
                scored or ordered by relevance — review them yourself before relying on them.
              </p>
              <ul className="mt-3 space-y-2">
                {result.fullTextSupplementalFindings.map((f) => (
                  <li key={f.recordId} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={f.findingStatus} />
                      <span className="text-sm font-medium text-slate-900">{f.recordId}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{f.scenarioTitle}</p>
                    <div className="mt-1">
                      <SourceLink href={f.officialSourceUrl} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {result.applicableGuardrails.length > 0 && (
            <article className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">Applicable analytical guardrails</h3>
              <ul className="mt-3 space-y-3">
                {result.applicableGuardrails.map((g) => (
                  <li key={g.id} className="text-sm">
                    <p className="font-medium text-slate-900">{g.provisionOrIssue}</p>
                    <p className="text-slate-700">{g.workingPrinciple}</p>
                    <p className="mt-1 text-xs italic text-slate-500">Guardrail: {g.implementationGuardrail}</p>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
