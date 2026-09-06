/**
 * Candidate-finder for verbatim provision text quoted inside a CFID order.
 *
 * Background: rather than sourcing regulation text from official websites
 * (unreachable from this environment — see NETWORK_BLOCK_REASON in
 * build-import-sql.ts), the law library's `provision_versions.exact_text`
 * is instead sourced directly from the orders themselves: SEBI orders very
 * often reproduce the "relevant provisions" verbatim (often bracketed by
 * smart quotes “ ”) before applying them to the facts. When a provision is
 * quoted in more than one order on file, the chronologically LATEST order
 * that actually quotes it (not merely cites it) wins.
 *
 * This script is a CANDIDATE FINDER ONLY. It never writes to the database.
 * A first pass at full automation this session (grouping by "base number"
 * and pattern-matching for `shall` / enumerated markers) produced multiple
 * confirmed false positives before a human read the surrounding text:
 *   - Section 12A matched commentary ABOUT the section, not its own text.
 *   - Two different sections both matched the same unrelated paragraph.
 *   - LODR Regulations 33/34/46/48 all wrongly collapsed onto one Reg 46 quote.
 *   - PFUTP's and LODR's both-numbered "Regulation 4" got cross-matched.
 *   - A paraphrase/summary (no quotation marks) was mistaken for a verbatim
 *     quote, and in one case a later order's PARAPHRASE of a sub-clause
 *     described materially different content than an earlier order's actual
 *     verbatim quote of the same sub-clause number (see LODR-4-1-j's
 *     law_library_note for a live example of this exact failure mode).
 *
 * So: treat every candidate below as a lead, not a fact. Before writing
 * anything to provision_versions, open the source order text at the printed
 * line/offset and confirm by reading the surrounding paragraph that:
 *   1. The quoted block is introduced as being THIS provision's own text
 *      (not commentary about it, not a different provision, not a different
 *      instrument's identically-numbered provision).
 *   2. It is an actual quotation (quotation marks, or a clearly indented
 *      block quote), not a paraphrase.
 *   3. It is not truncated or, if the order itself elides a middle portion
 *      (e.g. "………"), that the elision is reproduced rather than papered over.
 *
 * Usage:
 *   pdftotext -layout order.pdf order.txt
 *   npx tsx scripts/db/find-provision-quote-candidates.ts \
 *     --order-id <uuid-of-existing-orders-row> --text order.txt
 *
 * Requires SUPABASE_DB_URL (see run-import.ts) to look up the order's own
 * metadata and the full legal_provisions list to search for.
 *
 * Output: a JSON report on stdout (or --out <file>) of
 *   { canonicalId, provisionNumber, instrument, candidates: [{ contextBefore, quote, contextAfter, charOffset }] }
 * for every provision with at least one candidate. Read it, verify by hand,
 * then write confirmed provisions directly via SQL (see the pattern used
 * throughout this session's commits — update provision_versions.exact_text
 * + status='order_cited_text_only', and legal_provisions
 * .current_text_verification_status + .law_library_note with a citation to
 * this order).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const OPEN_Q = "“";
const CLOSE_Q = "”";
const MIN_QUOTE_LEN = 40;
const MAX_QUOTE_LEN = 4000;
const SEARCH_WINDOW = 600;
const CONTEXT_CHARS = 220;

interface ProvisionRow {
  canonical_id: string;
  provision_number: string;
  instrument: string;
}

interface Candidate {
  contextBefore: string;
  quote: string;
  contextAfter: string;
  charOffset: number;
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      out[a.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

/** Builds a small set of textual variants a provision number might appear as in running prose. */
function citationVariants(provisionNumber: string): string[] {
  const variants = new Set<string>();
  const cleaned = provisionNumber.split(/\s+read with|\s+proviso|\s+and Schedule/)[0].trim();
  variants.add(cleaned);
  // "Regulation 4(1)(a)" -> also try "4(1)(a)" and "4 (1) (a)" spacing variants seen in pdftotext output
  const numMatch = cleaned.match(/^(Regulation|Regulations|Section|Sections)\s+(.+)$/i);
  if (numMatch) {
    const [, , rest] = numMatch;
    variants.add(rest);
    variants.add(rest.replace(/\(/g, " (").replace(/\s+/g, " ").trim());
  }
  return Array.from(variants);
}

function findCandidatesForTerm(text: string, term: string): Candidate[] {
  const candidates: Candidate[] = [];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped + "(?![0-9A-Za-z])", "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const pos = m.index;
    const lookahead = text.slice(pos, pos + SEARCH_WINDOW);
    const qIdx = lookahead.indexOf(OPEN_Q);
    if (qIdx !== -1) {
      const absStart = pos + qIdx;
      const closeIdx = text.indexOf(CLOSE_Q, absStart);
      if (closeIdx !== -1 && closeIdx - absStart > MIN_QUOTE_LEN && closeIdx - absStart < MAX_QUOTE_LEN) {
        candidates.push(makeCandidate(text, absStart + 1, closeIdx));
      }
    }
    const lookbehindStart = Math.max(0, pos - SEARCH_WINDOW);
    const lookbehind = text.slice(lookbehindStart, pos);
    const qIdx2 = lookbehind.lastIndexOf(OPEN_Q);
    if (qIdx2 !== -1) {
      const absStart2 = lookbehindStart + qIdx2;
      const closeIdx2 = text.indexOf(CLOSE_Q, absStart2);
      if (closeIdx2 !== -1 && closeIdx2 > pos - 100 && closeIdx2 - absStart2 > MIN_QUOTE_LEN && closeIdx2 - absStart2 < MAX_QUOTE_LEN) {
        candidates.push(makeCandidate(text, absStart2 + 1, closeIdx2));
      }
    }
  }
  return candidates;
}

function makeCandidate(text: string, start: number, end: number): Candidate {
  return {
    contextBefore: text.slice(Math.max(0, start - CONTEXT_CHARS), start).trim(),
    quote: text.slice(start, end).trim(),
    contextAfter: text.slice(end, Math.min(text.length, end + CONTEXT_CHARS)).trim(),
    charOffset: start,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args["order-id"] || !args.text) {
    console.error(
      "Usage: npx tsx scripts/db/find-provision-quote-candidates.ts --order-id <uuid> --text <pdftotext-output.txt> [--out <report.json>]",
    );
    process.exit(1);
  }
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("SUPABASE_DB_URL is required (see scripts/db/run-import.ts for where to find it).");
    process.exit(1);
  }

  const text = readFileSync(args.text, "utf8");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const orderRes = await client.query("SELECT order_number, order_date, case_name FROM orders WHERE id = $1", [
      args["order-id"],
    ]);
    if (orderRes.rowCount === 0) {
      console.error(`No order found with id ${args["order-id"]}`);
      process.exit(1);
    }
    const order = orderRes.rows[0];

    const provisionsRes = await client.query<ProvisionRow>(
      `SELECT lp.canonical_id, lp.provision_number, i.name AS instrument
       FROM legal_provisions lp JOIN legal_instruments i ON i.id = lp.instrument_id
       ORDER BY i.name, lp.provision_number`,
    );

    const report: {
      order: { id: string; number: string; date: string; caseName: string };
      results: { canonicalId: string; provisionNumber: string; instrument: string; candidates: Candidate[] }[];
    } = {
      order: { id: args["order-id"], number: order.order_number, date: order.order_date, caseName: order.case_name },
      results: [],
    };

    for (const p of provisionsRes.rows) {
      const seen = new Set<number>();
      const candidates: Candidate[] = [];
      for (const variant of citationVariants(p.provision_number)) {
        for (const c of findCandidatesForTerm(text, variant)) {
          if (!seen.has(c.charOffset)) {
            seen.add(c.charOffset);
            candidates.push(c);
          }
        }
      }
      if (candidates.length > 0) {
        report.results.push({
          canonicalId: p.canonical_id,
          provisionNumber: p.provision_number,
          instrument: p.instrument,
          candidates,
        });
      }
    }

    const json = JSON.stringify(report, null, 2);
    if (args.out) {
      writeFileSync(args.out, json);
      console.error(`Wrote ${report.results.length} provision(s) with candidates to ${args.out}.`);
      console.error("Read every candidate in full context before trusting it — see the file header for known failure modes.");
    } else {
      console.log(json);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("find-provision-quote-candidates failed:", err);
  process.exit(1);
});
