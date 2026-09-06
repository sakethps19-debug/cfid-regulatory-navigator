/** Renders a list of provision numbers as a single prose sentence per
 * instrument, in the compact citation style CFID orders themselves use —
 * e.g. "Section 12A(a), (b) and (c) of the SEBI Act, 1992" rather than
 * repeating "Section 12A(a), Section 12A(b), Section 12A(c)". Provisions
 * that share everything except their final bracketed sub-clause are
 * collapsed onto one shared prefix; anything else (a bare "Section 27", a
 * "Regulation 34(3) read with Schedule V" cross-reference, an "Ind AS 24"
 * accounting-standard reference) is left exactly as stored — never
 * reshaped — since guessing at a citation's structure is how a wrong
 * citation gets produced. This never fabricates a citation: it only
 * reformats provision numbers already on file, grouped ascending (see
 * provisionOrder.ts) so the sentence reads in the same order the
 * instrument itself numbers its provisions.
 */
import { compareProvisionNumbers } from "./provisionOrder";

const TRAILING_BRACKET = /^(.*)(\([^()]+\))$/;

function splitTrailingBracket(provisionNumber: string): { prefix: string; bracket: string | null } {
  const m = provisionNumber.match(TRAILING_BRACKET);
  if (!m) return { prefix: provisionNumber, bracket: null };
  return { prefix: m[1], bracket: m[2] };
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Collapses a sorted (ascending) list of provision numbers that share an
 * instrument into a compact citation string, e.g.
 * ["Regulation 4(1)(a)", "Regulation 4(1)(b)", "Regulation 23(2)"] ->
 * "Regulation 4(1)(a) and (b), Regulation 23(2)". */
export function formatProvisionNumbersForParagraph(provisionNumbers: string[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < provisionNumbers.length) {
    const { prefix, bracket } = splitTrailingBracket(provisionNumbers[i]);
    if (bracket === null) {
      parts.push(provisionNumbers[i]);
      i++;
      continue;
    }
    const brackets = [bracket];
    let j = i + 1;
    while (j < provisionNumbers.length) {
      const next = splitTrailingBracket(provisionNumbers[j]);
      if (next.prefix !== prefix || next.bracket === null) break;
      brackets.push(next.bracket);
      j++;
    }
    parts.push(brackets.length === 1 ? `${prefix}${bracket}` : `${prefix}${joinWithAnd(brackets)}`);
    i = j;
  }
  return parts.join(", ");
}

/** Builds one prose sentence per instrument — "Section 12A(a), (b) and (c)
 * of the SEBI Act, 1992" — from a flat list of { instrument, provisionNumber
 * } pairs, sorted ascending within each instrument first. */
export function buildViolationParagraph(
  items: { instrument: string; provisionNumber: string }[],
): { instrument: string; sentence: string }[] {
  const byInstrument = new Map<string, string[]>();
  for (const { instrument, provisionNumber } of items) {
    const list = byInstrument.get(instrument) ?? [];
    list.push(provisionNumber);
    byInstrument.set(instrument, list);
  }
  return [...byInstrument.entries()].map(([instrument, numbers]) => {
    const sorted = [...numbers].sort(compareProvisionNumbers);
    return { instrument, sentence: formatProvisionNumbersForParagraph(sorted) };
  });
}
