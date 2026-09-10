import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { NARRATIVE_JUSTIFY_ONLY } from "@/lib/proseClasses";

// Global text-alignment requirement (live-officer-review correction):
// Methodology is entirely substantive explanatory prose, so both wrappers
// justify their content in one shared place rather than scattering
// text-justify across dozens of individual <p>/<li> tags on this page.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{title}</h2>
      <div className={`mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-ink-700)] ${NARRATIVE_JUSTIFY_ONLY}`}>{children}</div>
    </Card>
  );
}

/** A collapsed-by-default variant of Section, for material that's useful
 * reference but not what a first-time reader needs to see immediately —
 * native <details>/<summary>, no JS state needed. */
function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <details>
        <summary className="cursor-pointer text-base font-semibold text-[var(--color-ink-900)] marker:text-[var(--color-gold-600)]">
          {title}
        </summary>
        <div className={`mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-ink-700)] ${NARRATIVE_JUSTIFY_ONLY}`}>{children}</div>
      </details>
    </Card>
  );
}

const FLOW_STEPS = [
  "Scenario entered",
  "Concepts detected",
  "Provisions matched",
  "Supporting / contrary precedents",
  "Missing evidence checklist",
  "Qualified, non-conclusive output",
];

export default function MethodologyPage() {
  return (
    <div>
      <PageHeader title="Methodology &amp; Limitations" description="How this pilot works, what it does not do, and how to extend it." />

      <div className="mb-6 rounded-sm bg-[var(--color-gold-50)] p-3.5 text-sm text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
        <strong>This is a research-assistance tool, not a legal decision-maker.</strong> It does not make findings of
        guilt and does not conclude that a violation has occurred merely because a scenario resembles an earlier
        order. Every output is a deterministic research aid based on the entered facts and the currently indexed
        corpus; it must be reviewed against the underlying official sources before any reliance is placed on it.
      </div>

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">How a scenario becomes an output</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {FLOW_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-sm bg-[var(--color-neutral-50)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-700)] ring-1 border-[var(--color-border)]">
                {step}
              </span>
              {i < FLOW_STEPS.length - 1 && <span className="text-[var(--color-ink-300)]" aria-hidden>→</span>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-500)]">
          Every step is deterministic (see &quot;How the Scenario Analyzer works&quot; below) — no step is an
          unexplained black box, and no step concludes that a violation occurred.
        </p>
      </Card>

      <Section title="Purpose and scope">
        <p>
          CFID Regulatory Navigator is an internal legal-research assistant for CFID officers, each signed in with
          their own allow-listed email. Given a factual scenario, it identifies potentially applicable SEBI Act
          sections, regulations and other provisions; matching factual ingredients; supporting CFID orders with
          paragraph references; contrary or negative precedents; the procedural status of each finding; missing facts
          or evidence; a factual-overlap level; and links to official source documents.
        </p>
        <p>
          All output uses careful language such as &quot;potentially relevant&quot; and &quot;prima facie
          similarity&quot; and never asserts that a regulation has definitely been violated.
        </p>
      </Section>

      <Section title="Precedent database">
        <p>
          Every order in the{" "}
          <a href="/awaiting-analysis" className="text-[var(--color-gold-700)] underline">
            Verified CFID Orders
          </a>{" "}
          register has been confirmed to contain &quot;CFID&quot; in its own order number, then opened, read, and
          broken down into individual scenario findings with paragraph citations, see the{" "}
          <a href="/dashboard" className="text-[var(--color-gold-700)] underline">
            Dashboard
          </a>{" "}
          for the current, live order/finding/provision counts rather than a number fixed here, since this corpus
          grows as new orders are added and analysed. A new order is added to the corpus by the same process
          described below, whether it is the first order added or the hundred-and-first.
        </p>
        <p>
          Where a final order exists, its finding is treated as controlling and is displayed prominently; an interim
          order is used to explain the original allegation and how the case developed. Findings are stored at the
          level of an individual allegation, not the order as a whole, because one transaction may be confirmed in
          the final order while another under the same provision is not.
        </p>
      </Section>

      <CollapsibleSection title="Verified CFID Orders and the Residual register">
        <p>
          <strong>Verified_CFID_Order_Links.xlsx</strong> is the authoritative starting list of confirmed CFID orders
          for this pilot: every order identifier in it has already been confirmed to contain &quot;CFID&quot;. Each
          row is either <strong>broken down into the full scenario-finding analysis</strong> that powers the
          Scenario Analyzer, or still <strong>awaiting that analysis</strong>; a row awaiting analysis is not
          treated as a source of scenario findings or provision matches until that analysis is done.
          The{" "}
          <a href="/awaiting-analysis" className="text-[var(--color-gold-700)] underline">
            Orders Awaiting Analysis
          </a>{" "}
          page shows the current split.
        </p>
        <p>
          <strong>Residual_Order_Links.xlsx</strong> is an exclusion and pending-link register only. It records cases
          that were removed from an earlier working compilation, each with a reason: still awaiting a link from the
          user, a duplicate of an order already counted once in the verified list, or a case confirmed{" "}
          <em>not</em> to be a CFID order (e.g. an adjudication order, a legacy pre-CFID order, or an IVD order). None
          of these residual entries are ever used as a source of substantive CFID precedent unless a row is
          subsequently verified and moved into Verified_CFID_Order_Links.xlsx. The original Links.xlsx compilation
          that both of these were refined from is no longer used by this application.
        </p>
        <p>
          Both registers are shown in full on the{" "}
          <a href="/awaiting-analysis" className="text-[var(--color-gold-700)] underline">
            Orders Awaiting Analysis
          </a>{" "}
          page. No row is ever deleted from either register.
        </p>
        <p>
          <strong>Procedure for adding a newly analysed order later:</strong> confirm the order number contains
          &quot;CFID&quot; from the order document itself, retrieve the order from the official SEBI website, extract
          its scenario findings, provisions and paragraph references exactly as they appear in the order (never
          inferred or invented), and insert them into the relational database (see{" "}
          <code>scripts/db/build-import-sql.ts</code> and <code>scripts/db/run-import.ts</code>) with{" "}
          <code>processing_stage</code> updated to <code>citations_checked</code>, reached once findings and their
          paragraph citations have been checked against the source order. Every write goes through the service role
          and is subject to the same validation the pilot library was: a citation without a paragraph reference or
          official URL is recorded as a <code>validation_issues</code> row rather than shown as settled.{" "}
          <strong>This procedure never sets <code>processing_stage</code> to <code>legally_reviewed</code></strong> —
          that value is reserved for a separate corpus-maintenance step outside the scope of this import procedure,
          and is not a precondition for this analysis. A newly imported order&apos;s findings appear in the
          structured library once its citations have been checked, independently of that separate step.
        </p>
      </CollapsibleSection>

      <Section title="Permitted sources">
        <p>Only the following are used as sources of legal or factual content in this pilot:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>The official SEBI website, for SEBI orders, Acts, regulations and circulars.</li>
          <li>The official MCA website, for the Companies Act and rules.</li>
          <li>Official sources for notified accounting standards / Ind AS.</li>
          <li>Official sources expressly referred to within the SEBI orders themselves.</li>
          <li>
            The CFID orders in this register themselves, where an order reproduces a provision&apos;s text verbatim
            (see &quot;Statutory text sourced from orders&quot; below).
          </li>
        </ul>
        <p>
          Law-firm articles, blogs, news reports, commercial legal databases and unofficial reproductions or summaries
          are never used. Anything that cannot be verified against an official source, and that has not been quoted
          verbatim in an order on file, is marked &quot;Requires verification&quot; rather than presented as settled.
        </p>
      </Section>

      <CollapsibleSection title="Statutory text sourced from orders">
        <p>
          Many CFID orders reproduce the &quot;relevant provisions&quot; verbatim before applying them to the facts.
          For every provision in the Law Library, this tool prefers a real quotation from an order on file over an
          absent or generic description. Where a provision has been quoted verbatim in more than one order, the
          chronologically <strong>latest</strong> order that actually quotes it (not merely cites it) is used.
        </p>
        <p>
          Each such entry is labelled <strong>&quot;As reproduced verbatim in a CFID order&quot;</strong>, visibly
          distinct from an <strong>&quot;officially verified&quot;</strong> entry sourced and checked directly
          against the official SEBI/MCA source, and from a provision still marked &quot;Requires verification&quot;
          because no verbatim quote has yet been found anywhere in the register. Order-sourced text is not
          independently checked against the official source and should not be assumed to be the current in-force
          text without that check.
        </p>
        <p>
          <strong>Process for new orders:</strong> after a new order is added to the register (and converted to
          searchable text, e.g. via <code>pdftotext -layout</code>), run{" "}
          <code>npx tsx scripts/db/find-provision-quote-candidates.ts --order-id &lt;id&gt; --text &lt;file&gt;</code>{" "}
          to surface candidate quotations near each provision&apos;s citation. This script only ever produces a
          report; it never writes to the database. A first automated pass at this extraction, done without
          per-candidate human review, produced multiple confirmed false positives (commentary mistaken for the
          provision&apos;s own text, one provision&apos;s citation matching a different provision&apos;s quote,
          a paraphrase mistaken for a verbatim quote). Every candidate must therefore be read in its full
          surrounding context and confirmed before being written to <code>provision_versions</code>, following the
          same standard described above for any other source.
        </p>
      </CollapsibleSection>

      <Section title="Critical legal safeguards">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <span className="font-medium">Identical-numbering data-integrity check.</span> Whenever two provisions
            from different instruments share or overlap in their numbering, the Law Library flags this
            automatically as coincidental similar numbering, never as a parent/sub-clause relationship, which is
            only ever reported when both provisions belong to the <em>same</em> instrument. PFUTP Regulation 4(2)(e)
            (manipulation of the price of a security) and LODR Regulation 4(2)(e)(i) (board and management
            responsibility for true and fair financial statements) are one instance of this generic check, not a
            special case: the same logic runs for every provision pair in the library, regardless of instrument or
            clause number.
          </li>
          <li>Observations in interim orders are always treated as prima facie findings only.</li>
          <li>Where a final order exists, it is displayed prominently and takes precedence over an inconsistent interim finding.</li>
          <li>
            Circular movement of funds is treated as an indicator, not a complete conclusion. The engine always
            surfaces the guardrail checklist: commercial purpose, accounting treatment, bank-flow evidence, timing,
            counterparty identity, third-party examination, recording in audited accounts, flow-back, ultimate
            economic benefit, and whether distinct transactions were improperly clubbed.
          </li>
          <li>
            <span className="font-medium">Contrary-precedent retrieval is a universal feature, not a special case
            for any one order.</span> Any finding with a negative or partly-negative status (not confirmed in
            final order, partly confirmed in final order, withdrawn, inconclusive) is eligible to surface as a contrary precedent whenever a query
            scenario materially matches its facts. The Seacoast final order&apos;s rejection of the ₹0.52 crore cash
            preferential-allotment allegation is one example of this: it surfaces for scenarios involving
            preferential allotment, circular funding, alleged front entities, or unexplained fund movements, and is
            never forced into results it does not factually match.
          </li>
        </ul>
      </Section>

      <Section title="How the Scenario Analyzer works (zero-cost architecture)">
        <p>
          The matching engine is entirely deterministic: there is no call to any paid AI API and no external network
          request at analysis time. It works in the following steps:
        </p>
        <ol className="list-inside list-decimal space-y-1">
          <li>Normalize the entered scenario text (lowercase, strip punctuation, collapse whitespace).</li>
          <li>
            Semantic-assist pre-pass: correct likely typos against the curated concept vocabulary, a bounded
            edit-distance spelling fix (e.g. &quot;prefrential&quot; → &quot;preferential&quot;), never a guess at
            meaning, applied only to correct spelling of a word the matcher already recognizes. Every correction made
            is disclosed in the results (&quot;Read as…&quot;); the text displayed back to you is never altered. See{" "}
            <code>src/lib/matching/fuzzyMatch.ts</code>.
          </li>
          <li>
            Detect factual concepts (transaction types, actor roles, evidence types, alleged conduct) using a
            controlled synonym dictionary of keyword and phrase matches.
          </li>
          <li>Score every scenario finding in the structured library by weighted overlap with the detected concepts and any selected actor/transaction-type filters.</li>
          <li>Prefer findings drawn from a final order over an interim-only finding.</li>
          <li>Group findings that cleared a minimum relevance threshold by the specific provision(s) they were actually tagged with, a provision is never suggested merely because it appeared elsewhere in the same order.</li>
          <li>Retrieve supporting precedents (status Confirmed in Final Order / Prima facie / Partly Confirmed in Final Order) and contrary precedents (status Not Confirmed in Final Order) for each provision, plus an independent contrary-precedent search for fund-movement and allotment scenarios.</li>
          <li>Assemble a missing-facts checklist from each matched finding&apos;s recorded evidentiary gaps.</li>
          <li>
            Derive a factual-overlap level (displayed as &quot;Strong&quot;, &quot;Moderate&quot; or &quot;Limited&quot; factual overlap;
            internally still scored High/Medium/Low) from how many independent factual categories overlap ONLY,
            namely transaction type, actor role, conduct, and evidence. This measures how strongly the entered facts overlap
            with a precedent&apos;s recorded facts, not the likelihood that a violation occurred, deliberately not
            labelled &quot;confidence&quot; on screen, since that reads too easily as an assessment of legal
            likelihood. This tool deliberately treats factual overlap, procedural stage (final / interim / allegation
            only, etc.), and historical disposition (confirmed / not confirmed / no merits determination) as three
            independent dimensions, shown separately: a precedent&apos;s procedural stage or disposition never
            changes its factual-overlap figure, only how much weight an officer should give that overlap. Where two
            precedents have identical factual overlap, the one from a final order is listed first as a display
            preference only, never as a boost to the overlap figure itself.
          </li>
        </ol>
        <p>
          The underlying data (orders, scenario findings, provisions, legal tests, directions, and the fact-element
          tags used for matching) lives in a Postgres database (Supabase), reachable only by an authenticated,
          allow-listed user via Row-Level Security; there is no anonymous read or write access, and no service-role
          key is ever present in browser code. <code>src/lib/data.ts</code> is the single data-access boundary the
          rest of the app calls through; every page fetches through it rather than querying Supabase directly.
        </p>
      </Section>

      <Section title="Architecture (zero-cost, no paid LLM dependency)">
        <p>
          The matching engine itself is entirely deterministic: analyzing a scenario never calls any paid AI API and
          makes no external network request beyond the database query for candidate findings. An LLM may assist a
          human during development or one-off data extraction, but the deployed application does not depend on paid
          LLM API credits to function: the same deterministic engine that ran against the static pilot library runs
          unchanged against the live database. The one addition since the pilot launch, the semantic-assist
          typo-correction pre-pass described above, is itself a bounded, deterministic, zero-cost edit-distance check
          against the existing curated vocabulary (not an LLM call), and every correction it makes is disclosed
          rather than applied silently. The code is structured so an optional LLM re-ranking or explanation step
          could be added later behind a feature flag, called only if an API key is configured, while keeping the
          deterministic engine as the default and as the safeguard against fabricated citations.
        </p>
      </Section>

      <Section title="Known limitations">
        <ul className="list-inside list-disc space-y-1">
          <li>The structured scenario-finding library covers only the orders whose findings have already been broken down, per the <a href="/awaiting-analysis" className="text-[var(--color-gold-700)] underline">Orders Awaiting Analysis</a> page; any order still awaiting that work contributes no scenario findings yet. Results for facts outside the indexed corpus will correctly show no match rather than a fabricated one.</li>
          <li>Always verify the cited provision and order against the official source before relying on the output.</li>
          <li>Keyword/synonym matching cannot capture every phrasing of a scenario, try adding more specific detail (transaction type, actors, evidence) if no results appear.</li>
          <li>Provision &quot;current text&quot; is not reproduced or guaranteed current, always verify against the official SEBI/MCA source before relying on it.</li>
          <li>The in-memory rate limiter operates per server instance; on a platform running multiple instances it is a best-effort, not a strict global, limit.</li>
          <li>No user data, scenario queries, or analytics are stored or transmitted anywhere by this application.</li>
        </ul>
      </Section>

      <Section title="Security">
        <ul className="list-inside list-disc space-y-1">
          <li>Each officer signs in with their own Supabase Auth email/password; only emails on the server-configured allow-list can access any page or data, enforced both in the application and by Postgres Row-Level Security.</li>
          <li>Sessions are managed by signed, HTTP-only Supabase Auth cookies (not readable from browser JavaScript).</li>
          <li>All application routes and API endpoints are protected by server-side middleware; unauthenticated requests are redirected to sign-in.</li>
          <li>Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS in production) are applied to every response.</li>
          <li>Basic rate limiting is applied to every route, keyed per signed-in officer rather than per network address, so officers sharing an office network do not share one budget. Sign-in itself goes directly from the browser to Supabase Auth, which applies its own rate limiting there.</li>
          <li>No scenario queries are stored, no analytics or third-party trackers are included, and there is no facility to upload confidential investigation records.</li>
        </ul>
      </Section>
    </div>
  );
}
