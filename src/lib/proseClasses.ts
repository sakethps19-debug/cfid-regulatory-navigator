/** Shared classes for substantive officer-facing narrative/explanatory
 * prose (live-officer-review correction: global text-alignment
 * requirement). Justifies the text for a professional, report-like reading
 * experience and widens on large displays via the app's standard tiered
 * measure (matching PageHeader's description pattern) instead of staying
 * trapped in a fixed narrow column.
 *
 * Apply to: Scope Note, scenario explanations, "What this covers", case-
 * detail narrative, finding narratives, broad-scenario descriptions,
 * methodology explanatory prose, provenance caveats, and other substantive
 * explanatory paragraphs inside cards/panels.
 *
 * Do NOT apply to: headings, labels, badges, buttons, short metadata
 * values, dates, tables/table headers, provision citations, code, compact
 * list labels, navigation, or one-line status messages -- text-justify on
 * short non-prose text does nothing useful and can look odd on the last
 * (only) line. */
export const NARRATIVE_PROSE_CLASSES = "text-justify max-w-3xl xl:max-w-4xl 2xl:max-w-5xl";

/** Same justification, without the width tiering -- for narrative prose
 * that already lives in a container with no width defect (e.g. a Card that
 * doesn't itself get wider) and only needs the alignment change. */
export const NARRATIVE_JUSTIFY_ONLY = "text-justify";
