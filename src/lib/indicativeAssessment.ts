/**
 * The FIRST substantive result the officer sees after pressing Analyze: a
 * short, deterministic "Indicative Regulatory Assessment" paragraph
 * answering "based on the facts I entered, what regulatory issues should I
 * examine?" — built entirely from the analysis already computed by
 * analyzeScenario (primary_candidate provisions, then related_ancillary
 * ones), reusing the same citation-formatting plumbing the rest of the app
 * uses for provision numbers (buildProvisionCitationSentences). ZERO LLM /
 * ZERO generative API: this is pure string assembly over the engine's own
 * structured output, never free-form generation.
 *
 * Deliberately conservative in what it asserts: it names only provisions
 * that already passed the engine's own factual/actor-applicability gates
 * (result.provisionResults), never a gate-blocked or governing-only
 * provision, and always closes with the same "not a finding" qualification
 * every other officer-facing result in this app carries.
 */
import type { AnalysisResult, ProvisionResult } from "./matching/types";
import { buildProvisionCitationSentences } from "./provisionCitationParagraph";

export interface IndicativeRegulatoryAssessment {
  paragraph: string;
  primaryCount: number;
  relatedAncillaryCount: number;
  requiresAdditionalFactsCount: number;
}

/** One prose clause per instrument — "Regulation 4(1) of the PFUTP
 * Regulations, 2003; Section 27 of the SEBI Act, 1992" — built purely from
 * citation formatting already on file, never from any per-provision
 * "why relevant" narrative (that stays in the detailed provision cards
 * below, not this summary paragraph). */
function citationClause(items: ProvisionResult[]): string {
  const sentences = buildProvisionCitationSentences(items.map((pr) => ({ instrument: pr.provision.instrument, provisionNumber: pr.provision.provisionNumber })));
  return sentences.map((s) => `${s.sentence} of the ${s.instrument}`).join("; ");
}

const NO_RESULT_PARAGRAPH =
  "On the facts entered, no potentially relevant provisions were identified from the pilot's analysed precedents. This is not a finding that no issue exists — only that the currently structured corpus does not identify one on the specific facts entered.";

export function buildIndicativeRegulatoryAssessment(result: AnalysisResult): IndicativeRegulatoryAssessment {
  const primary = result.provisionResults.filter((pr) => pr.candidateTier === "primary_candidate");
  const relatedAncillary = result.provisionResults.filter((pr) => pr.candidateTier === "related_ancillary");
  const requiresAdditionalFactsCount = result.gateBlockedProvisionResults.length;

  if (primary.length === 0 && relatedAncillary.length === 0) {
    return { paragraph: NO_RESULT_PARAGRAPH, primaryCount: 0, relatedAncillaryCount: 0, requiresAdditionalFactsCount };
  }

  const sentences: string[] = [];
  const totalCount = primary.length + relatedAncillary.length;
  // A handful of related/ancillary provisions can be named directly
  // alongside the primary ones; a longer list (e.g. LODR Regulation 4(1)'s
  // own lettered general-principle sub-clauses, which can run to a dozen
  // entries) is summarised by COUNT instead — naming every one of them
  // would be exactly the "dump every provision number into prose" this
  // paragraph is required to avoid. The full list is never lost; it is
  // shown in the detailed results directly below this paragraph.
  const RELATED_ANCILLARY_NAME_LIMIT = 3;
  const relatedAncillarySummary =
    relatedAncillary.length === 0
      ? ""
      : relatedAncillary.length <= RELATED_ANCILLARY_NAME_LIMIT
        ? citationClause(relatedAncillary)
        : `${relatedAncillary.length} further related/ancillary provision${relatedAncillary.length === 1 ? "" : "s"}`;

  if (primary.length > 0) {
    sentences.push(`On the facts entered, ${citationClause(primary)} may warrant examination.`);
    if (relatedAncillary.length > 0) {
      sentences.push(`${relatedAncillarySummary} may also be relevant, and ${relatedAncillary.length === 1 ? "is" : "are"} identified below.`);
    }
  } else {
    // No primary_candidate provision, but related/ancillary provisions did
    // surface (e.g. general-principle or attribution provisions riding on
    // a breach found elsewhere) — stated plainly, without implying either
    // one independently anchors a candidate breach on its own.
    sentences.push(
      `On the facts entered, ${relatedAncillarySummary} may be relevant to the transaction, though none of these independently anchors a candidate breach on the present facts.`
    );
  }

  sentences.push(
    `${totalCount === 1 ? "This is an indicative provision" : "These are indicative provisions"} for regulatory examination based on the facts entered and indexed CFID precedents; this output is not a finding that any violation has occurred.`
  );

  return { paragraph: sentences.join(" "), primaryCount: primary.length, relatedAncillaryCount: relatedAncillary.length, requiresAdditionalFactsCount };
}
