"use client";

import { useState } from "react";
import { CONCEPT_TAGS } from "@/data/curated/concept-tags";
import type { AnalysisResult, ProvisionResult } from "@/lib/matching/types";
import type { LegalProvision } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { LegalReviewBadge } from "@/components/LegalReviewBadge";
import { SourceLink } from "@/components/Card";
import { compareProvisionNumbers } from "@/lib/provisionOrder";
import { buildProvisionCitationSentences } from "@/lib/provisionCitationParagraph";
import { findingStatusLabel } from "@/lib/findingStatusDisplay";
import { matchStrengthLabel, MATCH_STRENGTH_EXPLAINER } from "@/lib/matchStrengthDisplay";
import { legalReviewLabel } from "@/lib/publicationLifecycle";

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
const EVIDENCE_OPTIONS = CONCEPT_TAGS.filter((t) => t.kind === "evidence");

const COMPLETENESS_LABELS: Record<string, string> = {
  transaction: "transaction type",
  actor: "actor / role",
  conduct: "alleged conduct",
  evidence: "evidence indicator",
};

const TEMPLATE_GROUP_ORDER = ["Financial reporting", "Fund flows", "Governance & disclosure"] as const;

const EXAMPLE_SCENARIOS: { label: string; text: string; group: (typeof TEMPLATE_GROUP_ORDER)[number] }[] = [
  {
    label: "Fictitious sales/assets",
    group: "Financial reporting",
    text: "For the last three years, the company recorded fictitious sales with counterparties that deny ever transacting with it, and its financial statements show assets that are not genuine and cannot be verified against any underlying delivery, inventory or bank records.",
  },
  {
    label: "Promoter's personal derivative trades as revenue",
    group: "Financial reporting",
    text: "The promoter's personal derivative transactions were recorded in the company's own standalone financial statements as if they were the company's own sales and purchases, resulting in inflated sales and inflated profit for the company.",
  },
  {
    label: "False corporate announcement",
    group: "Financial reporting",
    text: "The company made a stock exchange announcement about an acquisition and future revenue projections that turned out to be unsubstantiated, with no supporting documentation for the claims made in the announcement.",
  },
  {
    label: "Statutory auditor negligence",
    group: "Financial reporting",
    text: "The statutory auditor certified the company's financial statements for several years without detecting circular transactions between connected entities, despite the volume and repetitive nature of those transactions.",
  },
  {
    label: "Preferential allotment / circular funding",
    group: "Fund flows",
    text: "A preferential allotment of shares was allegedly financed through a circular chain of loans and advances. The loans are recorded in the company's audited accounts, but it is unclear whether the third-party lenders were ever examined, and the allottees appear to have kept the sale proceeds from the shares.",
  },
  {
    label: "Funds via personal account",
    group: "Fund flows",
    text: "Company funds, including statutory and operating payments, were routed through the promoter's personal bank account without clear board approval or disclosure.",
  },
  {
    label: "Rights issue funds diverted",
    group: "Fund flows",
    text: "The company raised funds through a rights issue and represented to shareholders that the proceeds would be used for stated objects, but a large portion of the money was moved out to related entities instead of being used for the disclosed purpose.",
  },
  {
    label: "Audit Committee lapse",
    group: "Governance & disclosure",
    text: "The Audit Committee does not appear to have been properly constituted, and annual reports claim meetings were held for which no agendas or minutes can be produced.",
  },
  {
    label: "Related-party transaction not disclosed",
    group: "Governance & disclosure",
    text: "The company entered into a related-party transaction with a counterparty connected to the promoter, but the transaction was not disclosed in the related-party register and appears to have been misrepresented as an arm's-length dealing with an unconnected vendor.",
  },
  {
    label: "Compliance Officer vacancy",
    group: "Governance & disclosure",
    text: "The position of Compliance Officer / Company Secretary remained vacant for an extended period without a proper appointment, and no interim arrangement was disclosed to the stock exchanges.",
  },
  {
    label: "False CEO/CFO certification",
    group: "Governance & disclosure",
    text: "The Chief Executive Officer and Chief Financial Officer signed the quarterly compliance certification despite being aware of misstatements in the financial statements, and the certificate was not duly signed in accordance with the applicable regulation.",
  },
  {
    label: "Director duties / non-cooperation",
    group: "Governance & disclosure",
    text: "The independent directors failed to raise concerns despite red flags in the related-party transactions placed before the board, and the company did not cooperate with the investigation, failing to produce records called for by summons.",
  },
  {
    label: "Price/market manipulation",
    group: "Governance & disclosure",
    text: "A group of connected trading accounts executed synchronized trades in the company's shares with no genuine change in beneficial ownership, creating an artificial appearance of trading volume and inducing other investors to deal in the security.",
  },
];

const EVIDENCE_LABEL_BY_ID = new Map(EVIDENCE_OPTIONS.map((o) => [o.id, o.label]));

function evidenceLabel(id: string): string {
  return EVIDENCE_LABEL_BY_ID.get(id) ?? id.replace(/_/g, " ");
}

type EvidenceMatrixRecordKind = "upheld" | "supporting" | "contrary";

interface EvidenceMatrix {
  /** kind reflects which list(s) this record was drawn from — a record
   * appearing in more than one (e.g. both upheld and supporting) keeps
   * whichever is listed first in the precedence upheld > supporting >
   * contrary, since a genuinely upheld precedent is the strongest fact
   * worth flagging in the column header, never left ambiguous as to
   * whether the column is a supporting or a contrary record. */
  records: { recordId: string; kind: EvidenceMatrixRecordKind }[];
  rows: { evidenceId: string; evidenceLabel: string; presentInYourFacts: boolean; presentByRecordId: Record<string, boolean> }[];
}

/** Which evidence indicators are recorded against each precedent cited for
 * this provision, and which of those the entered scenario itself touched
 * on — built entirely from each precedent's own curated evidenceTypes tags
 * (never inferred) and the provision result's already-computed
 * matchedByCategory.evidenceTypes for the "your facts" column. Only shown
 * when there are at least two cited precedents to compare and at least one
 * recorded evidence tag between them; a single precedent already has its
 * evidence indicators listed under "Matched evidence indicators" above, and
 * a table with nothing to compare would just be noise. */
export function buildEvidenceMatrix(pr: ProvisionResult): EvidenceMatrix | null {
  const seen = new Map<string, { record: ProvisionResult["upheldPrecedents"][number]; kind: EvidenceMatrixRecordKind }>();
  const grouped: [ProvisionResult["upheldPrecedents"], EvidenceMatrixRecordKind][] = [
    [pr.upheldPrecedents, "upheld"],
    [pr.supportingPrecedents, "supporting"],
    [pr.contraryPrecedents, "contrary"],
  ];
  for (const [group, kind] of grouped) {
    for (const p of group) {
      if (!seen.has(p.finding.recordId)) seen.set(p.finding.recordId, { record: p, kind });
    }
  }
  const records = [...seen.values()];
  if (records.length < 2) return null;
  const evidenceIds = [...new Set(records.flatMap(({ record }) => record.finding.evidenceTypes))];
  if (evidenceIds.length === 0) return null;
  return {
    records: records.map(({ record, kind }) => ({ recordId: record.finding.recordId, kind })),
    rows: evidenceIds.map((id) => {
      const label = evidenceLabel(id);
      return {
        evidenceId: id,
        evidenceLabel: label,
        presentInYourFacts: pr.matchedByCategory.evidenceTypes.includes(label),
        presentByRecordId: Object.fromEntries(records.map(({ record }) => [record.finding.recordId, record.finding.evidenceTypes.includes(id)])),
      };
    }),
  };
}

/** Caution shown on a precedent card whose finding carries
 * publicationStatus "Published with warning" — this status is deliberately
 * still surfaced by the matching engine (see EXCLUDED_PUBLICATION_STATUSES
 * in engine.ts), so the caution itself is how that warning reaches the
 * officer, rather than the finding being silently dropped. Renders nothing
 * for the ordinary "Published to search" status. */
function PublicationWarningNote({ status }: { status: string }) {
  if (status !== "Published with warning") return null;
  return (
    <p className="mt-1 text-xs font-semibold text-[var(--status-amber-text)]">
      Published with warning: this finding has a recorded caution attached, review it directly before relying on it.
    </p>
  );
}

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

export function resultToText(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push("CFID Regulatory Navigator: Scenario Analysis (research assistance only)");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push("Scenario:");
  lines.push(result.query.freeText);
  lines.push("");
  if (result.query.conductPeriod || result.query.entityOrIssuer || result.query.amountInvolved) {
    lines.push("Scenario details entered (for record only, not matched against the precedent library):");
    if (result.query.conductPeriod) lines.push(`  Conduct period: ${result.query.conductPeriod}`);
    if (result.query.entityOrIssuer) lines.push(`  Entity/issuer: ${result.query.entityOrIssuer}`);
    if (result.query.amountInvolved) lines.push(`  Amount involved: ${result.query.amountInvolved}`);
    lines.push("");
  }
  const completenessLabels: Record<string, string> = {
    transaction: "transaction type",
    actor: "actor / role",
    conduct: "alleged conduct",
    evidence: "evidence indicator",
  };
  lines.push(
    `Scenario completeness: ${result.completeness.detected.length > 0 ? `touches on ${result.completeness.detected.map((k) => completenessLabels[k]).join(", ")}` : "no recognized category detected"}${result.completeness.notStated.length > 0 ? `; ${result.completeness.notStated.map((k) => completenessLabels[k]).join(", ")} not stated (not established as absent, simply not mentioned)` : ""}.`
  );
  lines.push("");
  if (!result.hasResults) {
    lines.push("No potentially relevant provisions were identified from the pilot's analysed precedents.");
  }
  if (result.provisionResults.length > 0) {
    lines.push("Potentially relevant regulatory provisions (prima facie factual similarity only):");
    for (const group of groupByFramework(result.provisionResults)) {
      lines.push(`  ${group.label}:`);
      for (const pr of group.items) {
        lines.push(`    - ${pr.provision.provisionNumber} [${matchStrengthLabel(pr.confidence)}]: ${pr.provision.subject ?? ""}`);
      }
    }
    lines.push("");

    const citedProvisionSentences = buildProvisionCitationSentences(
      result.provisionResults.map((pr) => ({ instrument: pr.provision.instrument, provisionNumber: pr.provision.provisionNumber })),
    );
    if (citedProvisionSentences.length > 0) {
      lines.push("Potentially relevant provisions: summary paragraph (not a finding):");
      lines.push(
        `Based on the facts entered and the factual similarity identified in the precedent library, ${citedProvisionSentences
          .map((v) => `${v.sentence} of the ${v.instrument}`)
          .join("; ")} may warrant examination. This does not indicate that the ingredients of any violation have been established.`,
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
    lines.push(`Factual overlap: ${matchStrengthLabel(pr.confidence)} (${MATCH_STRENGTH_EXPLAINER})`);
    lines.push(`Why potentially relevant: ${pr.whyRelevant}`);
    lines.push(`Applicable provision version: ${pr.applicableVersionNote}`);
    lines.push(`Factual ingredients matched: ${pr.matchedFactualIngredients.join("; ") || "none"}`);
    if (pr.upheldPrecedents.length > 0) {
      lines.push("Confirmed in Final Order in prior case(s):");
      for (const u of pr.upheldPrecedents) {
        lines.push(
          `  - [${findingStatusLabel(u.finding.findingStatus)} · ${legalReviewLabel(u.finding.humanLegalReviewCompleted)}] ${u.finding.recordId} · ${u.finding.scenarioTitle} (${u.finding.finalParagraphReferences ?? u.finding.interimParagraphReferences}) · ${u.finding.officialSourceUrl}`
        );
      }
    } else {
      lines.push("Confirmed in Final Order in prior case(s): none in this pilot's precedent library, treat as unproven on these facts alone.");
    }
    lines.push("Supporting precedent(s):");
    for (const s of pr.supportingPrecedents) {
      lines.push(
        `  - [${findingStatusLabel(s.finding.findingStatus)} · ${legalReviewLabel(s.finding.humanLegalReviewCompleted)}] ${s.finding.recordId} · ${s.finding.scenarioTitle} (${s.finding.finalParagraphReferences ?? s.finding.interimParagraphReferences}) · ${s.finding.officialSourceUrl}`
      );
      if (s.finding.precedentOutcomeNote) {
        lines.push(`      Outcome in the cited precedent: ${s.finding.precedentOutcomeNote}`);
      }
    }
    if (pr.contraryPrecedents.length > 0) {
      lines.push("Contrary precedent(s):");
      for (const c of pr.contraryPrecedents) {
        lines.push(
          `  - [${findingStatusLabel(c.finding.findingStatus)} · ${legalReviewLabel(c.finding.humanLegalReviewCompleted)}] ${c.finding.recordId} · ${c.finding.scenarioTitle} (${c.finding.finalParagraphReferences ?? c.finding.interimParagraphReferences}) · ${c.finding.officialSourceUrl}`
        );
      }
    }
    if (pr.missingFacts.length > 0) {
      lines.push("Missing facts / evidence in the present scenario:");
      for (const m of pr.missingFacts) lines.push(`  - ${m}`);
    }
  }
  if (result.globalContraryPrecedents.length > 0 || result.contraryPrecedentSearchNote) {
    lines.push("----------------------------------------");
    lines.push("Additional contrary precedents retrieved for fund-movement / allotment style facts:");
    if (result.contraryPrecedentSearchNote) {
      lines.push(`  ${result.contraryPrecedentSearchNote}`);
    } else {
      for (const c of result.globalContraryPrecedents) {
        lines.push(`  - [${findingStatusLabel(c.finding.findingStatus)} · ${legalReviewLabel(c.finding.humanLegalReviewCompleted)}] ${c.finding.recordId} · ${c.finding.scenarioTitle} · ${c.finding.officialSourceUrl}`);
        if (c.materialRelevanceNote) lines.push(`      ${c.materialRelevanceNote}`);
      }
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
 * "Export as text" or "Print" remain the complete record.
 *
 * Carries the same research-only / not-a-finding-of-guilt disclaimer and
 * legal-review status as the text export, as leading single-column rows
 * before the header row — a CSV is routinely forwarded, pasted into a
 * spreadsheet, or viewed on its own, detached from the page it came from,
 * so it must not read as a bare violation table with no caveat attached. */
export function resultToCsv(result: AnalysisResult): string {
  const rows: string[] = [];
  rows.push(csvRow(["CFID Regulatory Navigator: Scenario Analysis (research assistance only)"]));
  rows.push(csvRow([`Generated: ${new Date().toLocaleString()}`]));
  const sorted = [...result.provisionResults].sort((a, b) =>
    compareProvisionNumbers(a.provision.provisionNumber, b.provision.provisionNumber)
  );
  const referencedFindings = [...new Map(sorted.flatMap((pr) => pr.supportingPrecedents).map((s) => [s.finding.recordId, s.finding])).values()];
  const legallyReviewedCount = referencedFindings.filter((f) => f.humanLegalReviewCompleted).length;
  rows.push(
    csvRow([
      legallyReviewedCount === 0
        ? "No findings in this result have yet been legally reviewed or signed off by a CFID officer."
        : `${legallyReviewedCount} of ${referencedFindings.length} referenced finding(s) in this result have been legally reviewed; the rest have not.`,
    ])
  );
  rows.push(
    csvRow(["This is research assistance only. It does not conclude that any violation has occurred and must not be treated as a finding of guilt."])
  );
  rows.push(csvRow([]));
  rows.push(
    csvRow([
      "Instrument",
      "Provision number",
      "Subject",
      "Factual overlap (not a legal-confidence rating)",
      "Supporting precedent count",
      "Supporting precedents human-legally-reviewed",
      "Matched factual ingredients",
      "Supporting precedent record IDs",
      "Missing facts / evidence",
    ])
  );
  for (const pr of sorted) {
    const reviewedCount = pr.supportingPrecedents.filter((s) => s.finding.humanLegalReviewCompleted).length;
    rows.push(
      csvRow([
        pr.provision.instrument,
        pr.provision.provisionNumber,
        pr.provision.subject ?? "",
        matchStrengthLabel(pr.confidence),
        String(pr.supportingPrecedents.length),
        `${reviewedCount} of ${pr.supportingPrecedents.length}`,
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
  const [evidenceFilter, setEvidenceFilter] = useState("");
  const [conductPeriod, setConductPeriod] = useState("");
  const [entityOrIssuer, setEntityOrIssuer] = useState("");
  const [amountInvolved, setAmountInvolved] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);
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
        body: JSON.stringify({
          freeText,
          actorFilter,
          scenarioTypeFilter,
          evidenceFilter,
          conductPeriod,
          entityOrIssuer,
          amountInvolved,
        }),
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
    setEvidenceFilter("");
    setConductPeriod("");
    setEntityOrIssuer("");
    setAmountInvolved("");
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
      <form onSubmit={handleAnalyze} className="rounded-sm bg-white p-5 border border-[var(--color-border)] sm:p-7">
        <div className="flex items-baseline gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy-900)] text-[10px] font-semibold text-white">
            1
          </span>
          <label htmlFor="scenario" className="text-sm font-semibold text-[var(--color-ink-900)]">
            Describe the scenario
          </label>
        </div>
        <p className="mt-1 pl-7 text-xs leading-relaxed text-[var(--color-muted)]">
          Enter only information that may lawfully be processed in this pilot. Include, where you know them: the
          actors involved, transactions, timing, disclosures made or omitted, accounting treatment, and any evidence
          already available.
        </p>
        <textarea
          id="scenario"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="e.g. Company funds were routed through the promoter's personal bank account between FY2021-22 and FY2023-24 without Board approval, and the transaction was not disclosed as a related-party transaction in the annual report..."
          className="mt-2.5 block w-full rounded-md border border-[var(--color-border)] px-3 py-2.5 text-[0.95rem] leading-relaxed text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-100)]"
        />

        <div className="mt-5">
          <div className="flex items-baseline gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy-900)] text-[10px] font-semibold text-white">
              2
            </span>
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">Templates (optional)</span>
          </div>
          <div className="mt-2 space-y-3 pl-7">
            {TEMPLATE_GROUP_ORDER.map((group) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{group}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {EXAMPLE_SCENARIOS.filter((ex) => ex.group === group).map((ex) => (
                    <button
                      type="button"
                      key={ex.label}
                      onClick={() => setFreeText(ex.text)}
                      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:border-[var(--color-gold-600)] hover:bg-[var(--color-gold-50)] hover:text-[var(--color-gold-700)]"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy-900)] text-[10px] font-semibold text-white">
              3
            </span>
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">Optional filters</span>
          </div>
        </div>

        <div className="mt-2 grid gap-4 pl-7 sm:grid-cols-3">
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
          <div>
            <label htmlFor="evidenceFilter" className="block text-sm font-medium text-[var(--color-ink-700)]">
              Evidence indicator (optional)
            </label>
            <select
              id="evidenceFilter"
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
            >
              <option value="">Any</option>
              {EVIDENCE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 pl-7">
          <button
            type="button"
            onClick={() => setShowOptionalFields((v) => !v)}
            className="min-h-11 text-xs font-medium text-[var(--color-ink-500)] underline decoration-dotted hover:text-[var(--color-ink-700)]"
          >
            {showOptionalFields ? "Hide" : "Add"} conduct period / entity / amount (optional, for your own record)
          </button>
          {showOptionalFields && (
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="conductPeriod" className="block text-sm font-medium text-[var(--color-ink-700)]">
                  Conduct period
                </label>
                <input
                  id="conductPeriod"
                  type="text"
                  value={conductPeriod}
                  onChange={(e) => setConductPeriod(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. FY 2019-20 to FY 2021-22"
                  className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
                />
              </div>
              <div>
                <label htmlFor="entityOrIssuer" className="block text-sm font-medium text-[var(--color-ink-700)]">
                  Entity / issuer
                </label>
                <input
                  id="entityOrIssuer"
                  type="text"
                  value={entityOrIssuer}
                  onChange={(e) => setEntityOrIssuer(e.target.value)}
                  maxLength={200}
                  placeholder="Name of the listed entity, if known"
                  className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
                />
              </div>
              <div>
                <label htmlFor="amountInvolved" className="block text-sm font-medium text-[var(--color-ink-700)]">
                  Amount involved
                </label>
                <input
                  id="amountInvolved"
                  type="text"
                  value={amountInvolved}
                  onChange={(e) => setAmountInvolved(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Rs. 42 crore (approx.)"
                  className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
                />
              </div>
              <p className="sm:col-span-3 text-xs text-[var(--color-ink-500)]">
                These three fields are kept with your scenario in the printed/exported record only. They are not
                matched against the precedent library, there is no curated data to reliably compare a period, entity
                name or amount against.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || !freeText.trim()}
            className="min-h-11 rounded-md bg-[var(--color-gold-700)] px-6 py-2.5 text-[0.95rem] font-semibold text-white shadow-sm transition hover:bg-[var(--color-gold-800)] disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-11 rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
          >
            Clear / reset
          </button>
          {result && (
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-11 rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile("cfid-scenario-analysis.txt", resultToText(result))}
                className="min-h-11 rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
              >
                Export as text
              </button>
              {result.provisionResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadTextFile("cfid-scenario-analysis.csv", resultToCsv(result), "text/csv;charset=utf-8")}
                  className="min-h-11 rounded-md border border-[var(--color-border)] px-5 py-2 font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
                >
                  Export as CSV
                </button>
              )}
            </>
          )}
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-md bg-[var(--status-red-bg)] px-4 py-3 text-sm text-[var(--status-red-text)] ring-1 border-[var(--status-red-ring)]">
          {error}
        </div>
      )}

      {result && (() => {
        const frameworkGroups = groupByFramework(result.provisionResults);
        const citedProvisionSentences = buildProvisionCitationSentences(
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

          {(result.query.conductPeriod || result.query.entityOrIssuer || result.query.amountInvolved) && (
            <div className="rounded-sm bg-[var(--color-neutral-50)] px-4 py-2.5 text-xs text-[var(--color-ink-700)] ring-1 border-[var(--color-border)]">
              <span className="font-semibold">Scenario details entered: </span>
              {[
                result.query.conductPeriod && `Conduct period: ${result.query.conductPeriod}`,
                result.query.entityOrIssuer && `Entity/issuer: ${result.query.entityOrIssuer}`,
                result.query.amountInvolved && `Amount involved: ${result.query.amountInvolved}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              {" "}(kept for your record only, not matched against the precedent library).
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

          <div className="rounded-sm bg-[var(--color-neutral-50)] px-4 py-2.5 text-xs text-[var(--color-ink-700)] ring-1 border-[var(--color-border)]">
            <span className="font-semibold">Scenario completeness: </span>
            {result.completeness.detected.length > 0 && (
              <>your scenario touches on {result.completeness.detected.map((k) => COMPLETENESS_LABELS[k]).join(", ")}</>
            )}
            {result.completeness.detected.length > 0 && result.completeness.notStated.length > 0 && "; "}
            {result.completeness.notStated.length > 0 && (
              <>{result.completeness.notStated.map((k) => COMPLETENESS_LABELS[k]).join(", ")} not stated</>
            )}
            <p className="mt-1 text-[var(--color-ink-500)]">
              &quot;Not stated&quot; means this category was not mentioned in the facts entered or the filters
              selected above, it is never read as meaning that category is actually absent.
            </p>
          </div>

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
                  Potentially relevant regulatory provisions:{" "}
                  {result.provisionResults.length} provision{result.provisionResults.length === 1 ? "" : "s"} across{" "}
                  {frameworkGroups.length} instrument{frameworkGroups.length === 1 ? "" : "s"}
                  {" · "}
                  {result.provisionResults.filter((pr) => pr.upheldPrecedents.length > 0).length} with a prior case confirmed in a final order
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Prima facie factual similarity only, not a finding that the entered scenario has violated any
                  provision or that the ingredients of any violation have been established. The badge shown on
                  each provision below {MATCH_STRENGTH_EXPLAINER}
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
                                <span className="rounded-sm bg-[var(--status-green-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--status-green-text)] ring-1 ring-inset border-[var(--status-green-ring)]">
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

          {citedProvisionSentences.length > 0 && (
            <div className="rounded-sm border border-[var(--color-border)] bg-white p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                Potentially relevant provisions: summary paragraph
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-900)]">
                Based on the facts entered and the factual similarity identified in the precedent library,{" "}
                {citedProvisionSentences.map((v, i) => (
                  <span key={v.instrument}>
                    {i > 0 && (i === citedProvisionSentences.length - 1 ? "; and " : "; ")}
                    {v.sentence} of the {v.instrument}
                  </span>
                ))}
                {" "}may warrant examination.
              </p>
              <p className="mt-2 text-xs text-[var(--color-ink-500)]">
                This does not indicate that the ingredients of any violation have been established, built only from
                the provisions listed above, this is prima facie factual similarity only. See the detailed analysis
                below for each provision&apos;s own supporting and contrary precedents before relying on this
                summary.
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
                      {flagError && <p className="mt-1 text-xs text-[var(--status-red-text)]">{flagError}</p>}
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

                <div className="mt-4 rounded-lg bg-[var(--status-green-bg)] p-3 ring-1 border-[var(--status-green-ring)]">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--status-green-text)]">
                    {pr.upheldPrecedents.length > 0
                      ? `Confirmed in Final Order in ${pr.upheldPrecedents.length} prior case${pr.upheldPrecedents.length > 1 ? "s" : ""}`
                      : "Not yet confirmed in a final order in this pilot's precedent library"}
                  </h4>
                  {pr.upheldPrecedents.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {pr.upheldPrecedents.map((u) => (
                        <li key={u.finding.recordId} className="rounded-lg bg-white p-3 ring-1 border-[var(--status-green-ring)]">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={u.finding.findingStatus} />
                            <LegalReviewBadge reviewed={u.finding.humanLegalReviewCompleted} />
                            <span className="text-sm font-medium text-[var(--color-ink-900)]">{u.finding.recordId}</span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--color-ink-700)]">{u.finding.scenarioTitle}</p>
                          <PublicationWarningNote status={u.finding.publicationStatus} />
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
                    <p className="mt-1 text-sm text-[var(--status-green-text)]">
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
                        <li key={s.finding.recordId} className="rounded-lg bg-[var(--status-green-bg)]/60 p-3 ring-1 border-[var(--status-green-ring)]">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={s.finding.findingStatus} />
                            <LegalReviewBadge reviewed={s.finding.humanLegalReviewCompleted} />
                            <span className="text-sm font-medium text-[var(--color-ink-900)]">{s.finding.recordId}</span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--color-ink-700)]">{s.finding.scenarioTitle}</p>
                          <PublicationWarningNote status={s.finding.publicationStatus} />
                          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                            {s.finding.finalParagraphReferences ?? s.finding.interimParagraphReferences}
                          </p>
                          {s.ingredientsNotEstablished.length > 0 && (
                            <p
                              className="mt-1 text-xs text-[var(--status-amber-text)]"
                              title="This does not mean the fact is absent. It means the current scenario does not establish or mention it."
                            >
                              Facts not stated in the entered scenario, also required in this precedent:{" "}
                              {s.ingredientsNotEstablished.join("; ")}
                            </p>
                          )}
                          {s.finding.precedentOutcomeNote && (
                            <p className="mt-1 text-xs italic text-[var(--status-green-text)]">
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
                          <li key={c.finding.recordId} className="rounded-lg bg-[var(--status-red-bg)]/60 p-3 ring-1 border-[var(--status-red-ring)]">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={c.finding.findingStatus} />
                              <LegalReviewBadge reviewed={c.finding.humanLegalReviewCompleted} />
                              <span className="text-sm font-medium text-[var(--color-ink-900)]">{c.finding.recordId}</span>
                            </div>
                            <p className="mt-1 text-sm text-[var(--color-ink-700)]">{c.finding.scenarioTitle}</p>
                            <PublicationWarningNote status={c.finding.publicationStatus} />
                            {c.distinguishingNote && (
                              <p className="mt-1 text-xs font-medium text-[var(--status-red-text)]">{c.distinguishingNote}</p>
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
                    {(() => {
                      const matrix = buildEvidenceMatrix(pr);
                      if (!matrix) return null;
                      return (
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                            Evidence matrix across cited precedents
                          </span>
                          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                            Which evidence indicators are recorded against each precedent below, drawn from this
                            pilot&apos;s curated tagging of those findings, not from the facts you entered. The
                            &quot;Your facts&quot; column shows only what your own scenario touched on; every other
                            column is labelled Confirmed / Supporting / Contrary so it is never ambiguous which kind
                            of precedent that evidence was recorded against.
                          </p>
                          <div className="mt-1.5 overflow-x-auto">
                            <table className="min-w-full border-collapse text-xs">
                              <thead>
                                <tr>
                                  <th className="border-b border-[var(--color-border)] px-2 py-1 text-left font-semibold text-[var(--color-ink-700)]">
                                    Evidence indicator
                                  </th>
                                  <th className="border-b border-[var(--color-border)] px-2 py-1 text-left font-semibold text-[var(--color-ink-700)]">
                                    Your facts
                                  </th>
                                  {matrix.records.map((r) => (
                                    <th
                                      key={r.recordId}
                                      className="border-b border-[var(--color-border)] px-2 py-1 text-left font-semibold text-[var(--color-ink-700)]"
                                    >
                                      {r.recordId}
                                      <span
                                        className={`ml-1 font-normal normal-case ${
                                          r.kind === "contrary"
                                            ? "text-[var(--status-red-text)]"
                                            : r.kind === "upheld"
                                              ? "text-[var(--status-green-text)]"
                                              : "text-[var(--color-ink-500)]"
                                        }`}
                                      >
                                        ({r.kind === "upheld" ? "confirmed" : r.kind})
                                      </span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {matrix.rows.map((row) => (
                                  <tr key={row.evidenceId}>
                                    <td className="border-b border-[var(--color-border)]/60 px-2 py-1 text-[var(--color-ink-700)]">
                                      {row.evidenceLabel}
                                    </td>
                                    <td className="border-b border-[var(--color-border)]/60 px-2 py-1 text-center font-semibold text-[var(--color-gold-700)]">
                                      {row.presentInYourFacts ? "✓" : ""}
                                    </td>
                                    {matrix.records.map((r) => (
                                      <td key={r.recordId} className="border-b border-[var(--color-border)]/60 px-2 py-1 text-center text-[var(--color-ink-700)]">
                                        {row.presentByRecordId[r.recordId] ? "✓" : ""}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Match source</span>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-[var(--color-ink-700)]">
                        <li>Matched from the entered scenario text against the curated concept vocabulary (never an external search).</li>
                        {actorFilter && <li>The &quot;Actor / role&quot; filter was set and may have added to this result&apos;s score.</li>}
                        {scenarioTypeFilter && <li>The &quot;Scenario type&quot; filter was set and may have added to this result&apos;s score.</li>}
                        {evidenceFilter && <li>The &quot;Evidence indicator&quot; filter was set and may have added to this result&apos;s score.</li>}
                        {result.semanticAssist.length > 0 && <li>One or more terms in the entered text were spelling-corrected before matching (see &quot;Read as&quot; above).</li>}
                      </ul>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Factual-overlap basis</span>
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

          {(result.globalContraryPrecedents.length > 0 || result.contraryPrecedentSearchNote) && (
            <article className="rounded-sm bg-[var(--status-red-bg)] p-4  ring-1 border-[var(--status-red-ring)] sm:p-6">
              <h3 className="text-base font-semibold text-[var(--status-red-text)]">
                Additional contrary precedent(s): fund-movement / allotment facts
              </h3>
              <p className="mt-1 text-sm text-[var(--status-red-text)]">
                Because the scenario involves preferential allotment, circular funding, alleged front entities, or
                unexplained fund movements, this is an independent search for negative precedents materially relevant
                to those specific facts, even where they did not otherwise rank as a top match. This is a potentially
                relevant contrary precedent. Its weight depends on whether the factual and evidentiary features are
                materially comparable.
              </p>
              {result.contraryPrecedentSearchNote ? (
                <p className="mt-3 rounded-lg bg-white p-3 text-sm font-medium text-[var(--status-red-text)] ring-1 ring-inset ring-[var(--status-red-ring)]">
                  {result.contraryPrecedentSearchNote}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {result.globalContraryPrecedents.map((c) => (
                    <li key={c.finding.recordId} className="rounded-lg bg-white p-3 ring-1 border-[var(--status-red-ring)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={c.finding.findingStatus} />
                        <LegalReviewBadge reviewed={c.finding.humanLegalReviewCompleted} />
                        <span className="text-sm font-medium text-[var(--color-ink-900)]">{c.finding.recordId}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-ink-700)]">{c.finding.scenarioTitle}</p>
                      <PublicationWarningNote status={c.finding.publicationStatus} />
                      {c.materialRelevanceNote && (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                          Comparable features
                        </p>
                      )}
                      {c.materialRelevanceNote && <p className="mt-0.5 text-xs text-[var(--color-ink-700)]">{c.materialRelevanceNote}</p>}
                      {c.ingredientsNotEstablished.length > 0 && (
                        <>
                          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                            Potentially distinguishing features
                          </p>
                          <p
                            className="mt-0.5 text-xs text-[var(--status-red-text)]"
                            title="This does not mean the fact is absent. It means the current scenario does not establish or mention it."
                          >
                            Facts not stated in the entered scenario, also on record for this precedent:{" "}
                            {c.ingredientsNotEstablished.join("; ")}
                          </p>
                        </>
                      )}
                      {c.distinguishingNote && <p className="mt-1 text-xs font-medium text-[var(--status-red-text)]">{c.distinguishingNote}</p>}
                      <div className="mt-1">
                        <SourceLink href={c.finding.officialSourceUrl} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
                    <PublicationWarningNote status={f.publicationStatus} />
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
