import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-ink-700)]">{children}</div>
    </Card>
  );
}

export default function MethodologyPage() {
  return (
    <div>
      <PageHeader title="Methodology &amp; Limitations" description="How this pilot works, what it does not do, and how to extend it." />

      <Section title="Purpose and scope">
        <p>
          CFID Regulatory Navigator is an internal legal-research assistant for CFID officers, each signed in with
          their own allow-listed email. Given a factual scenario, it identifies potentially applicable SEBI Act
          sections, regulations and other provisions; matching factual ingredients; supporting CFID orders with
          paragraph references; contrary or negative precedents; the procedural status of each finding; missing facts
          or evidence; a confidence level; and links to official source documents.
        </p>
        <p>
          <strong>This is a research-assistance tool.</strong> It does not make findings of guilt and does not
          conclude that a violation has occurred merely because a scenario resembles an earlier order. All output uses
          careful language such as &quot;potentially relevant&quot; and &quot;prima facie similarity&quot; and never
          asserts that a regulation has definitely been violated.
        </p>
      </Section>

      <Section title="Precedent database">
        <p>
          Every order in the{" "}
          <a href="/awaiting-analysis" className="text-[var(--color-gold-700)] underline">
            Verified CFID Orders
          </a>{" "}
          register has been confirmed to contain &quot;CFID&quot; in its own order number, then opened, read, and
          broken down into individual scenario findings with paragraph citations — see the{" "}
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
          level of an individual allegation, not the order as a whole, because one transaction may be upheld while
          another under the same provision is not.
        </p>
      </Section>

      <Section title="Verified CFID Orders and the Residual register">
        <p>
          <strong>Verified_CFID_Order_Links.xlsx</strong> is the authoritative starting list of confirmed CFID orders
          for this pilot — every order identifier in it has already been confirmed to contain &quot;CFID&quot;. Each
          row is either <strong>deep-analyzed</strong> (broken down into the full scenario-finding analysis that
          powers the Scenario Analyzer) or still <strong>awaiting detailed analysis</strong> — a row awaiting
          analysis is not treated as a source of scenario findings or provision matches until that analysis is done.
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
          its scenario findings, provisions and paragraph references exactly as they appear in the order — never
          inferred or invented — and insert them into the relational database (see{" "}
          <code>scripts/db/build-import-sql.ts</code> and <code>scripts/db/run-import.ts</code>) with{" "}
          <code>processing_stage</code> updated to <code>legally_reviewed</code>. Every write goes through the
          service role and is subject to the same validation the pilot library was: a citation without a paragraph
          reference or official URL is recorded as a <code>validation_issues</code> row rather than shown as
          settled.
        </p>
      </Section>

      <Section title="Permitted sources">
        <p>Only the following are used as sources of legal or factual content in this pilot:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>The official SEBI website, for SEBI orders, Acts, regulations and circulars.</li>
          <li>The official MCA website, for the Companies Act and rules.</li>
          <li>Official sources for notified accounting standards / Ind AS.</li>
          <li>Official sources expressly referred to within the SEBI orders themselves.</li>
        </ul>
        <p>
          Law-firm articles, blogs, news reports, commercial legal databases and unofficial reproductions or summaries
          are never used. Anything that cannot be verified against an official source is marked &quot;Requires
          verification&quot; rather than presented as settled.
        </p>
      </Section>

      <Section title="Critical legal safeguards">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <span className="font-medium">Identical-numbering data-integrity check.</span> Whenever two provisions
            from different instruments share or overlap in their numbering, the Provision Explorer flags this
            automatically as coincidental similar numbering — never as a parent/sub-clause relationship, which is
            only ever reported when both provisions belong to the <em>same</em> instrument. PFUTP Regulation 4(2)(e)
            (manipulation of the price of a security) and LODR Regulation 4(2)(e)(i) (board and management
            responsibility for true and fair financial statements) are one instance of this generic check, not a
            special case — the same logic runs for every provision pair in the library, regardless of instrument or
            clause number.
          </li>
          <li>Observations in interim orders are always treated as prima facie findings only.</li>
          <li>Where a final order exists, it is displayed prominently and controls over an inconsistent interim finding.</li>
          <li>
            Circular movement of funds is treated as an indicator, not a complete conclusion. The engine always
            surfaces the guardrail checklist — commercial purpose, accounting treatment, bank-flow evidence, timing,
            counterparty identity, third-party examination, recording in audited accounts, flow-back, ultimate
            economic benefit, and whether distinct transactions were improperly clubbed.
          </li>
          <li>
            <span className="font-medium">Contrary-precedent retrieval is a universal feature, not a special case
            for any one order.</span> Any finding with a negative or partly-negative status (not upheld, partly
            upheld, withdrawn, inconclusive) is eligible to surface as a contrary precedent whenever a query
            scenario materially matches its facts. The Seacoast final order&apos;s rejection of the ₹0.52 crore cash
            preferential-allotment allegation is one example of this — it surfaces for scenarios involving
            preferential allotment, circular funding, alleged front entities, or unexplained fund movements, and is
            never forced into results it does not factually match.
          </li>
        </ul>
      </Section>

      <Section title="How the Scenario Analyzer works (zero-cost architecture)">
        <p>
          The matching engine is entirely deterministic — there is no call to any paid AI API and no external network
          request at analysis time. It works in the following steps:
        </p>
        <ol className="list-inside list-decimal space-y-1">
          <li>Normalize the entered scenario text (lowercase, strip punctuation, collapse whitespace).</li>
          <li>
            Detect factual concepts (transaction types, actor roles, evidence types, alleged conduct) using a
            controlled synonym dictionary of keyword and phrase matches.
          </li>
          <li>Score every deep-analyzed scenario finding by weighted overlap with the detected concepts and any selected actor/transaction-type filters.</li>
          <li>Prefer findings drawn from a final order over an interim-only finding.</li>
          <li>Group findings that cleared a minimum relevance threshold by the specific provision(s) they were actually tagged with — a provision is never suggested merely because it appeared elsewhere in the same order.</li>
          <li>Retrieve supporting precedents (status Upheld / Prima facie / Partly upheld) and contrary precedents (status Not upheld) for each provision, plus an independent contrary-precedent search for fund-movement and allotment scenarios.</li>
          <li>Assemble a missing-facts checklist from each matched finding&apos;s recorded evidentiary gaps.</li>
          <li>Derive a High / Medium / Low confidence level from how many independent factual categories overlap and whether the best match is a final or interim-only finding.</li>
        </ol>
        <p>
          The underlying data (orders, scenario findings, provisions, legal tests, directions, and the fact-element
          tags used for matching) lives in a Postgres database (Supabase), reachable only by an authenticated,
          allow-listed user via Row-Level Security — there is no anonymous read or write access, and no service-role
          key is ever present in browser code. <code>src/lib/data.ts</code> is the single data-access boundary the
          rest of the app calls through; every page fetches through it rather than querying Supabase directly.
        </p>
      </Section>

      <Section title="Architecture (zero-cost, no paid LLM dependency)">
        <p>
          The matching engine itself is entirely deterministic — analyzing a scenario never calls any paid AI API and
          makes no external network request beyond the database query for candidate findings. An LLM may assist a
          human during development or one-off data extraction, but the deployed application does not depend on paid
          LLM API credits to function: the same deterministic engine that ran against the static pilot library runs
          unchanged against the live database. The code is structured so an optional LLM re-ranking or explanation
          step could be added later behind a feature flag, called only if an API key is configured, while keeping the
          deterministic engine as the default and as the safeguard against fabricated citations.
        </p>
      </Section>

      <Section title="Known limitations">
        <ul className="list-inside list-disc space-y-1">
          <li>The deep-analyzed scenario-finding library covers only the orders marked &quot;deep-analyzed&quot; on the <a href="/awaiting-analysis" className="text-[var(--color-gold-700)] underline">Orders Awaiting Analysis</a> page — any order still awaiting analysis contributes no scenario findings yet. Results for facts outside the analysed corpus will correctly show no match rather than a fabricated one.</li>
          <li>None of this analysis has yet been legally reviewed and signed off by a CFID officer — that is a separate, further step (see the Dashboard and Admin Processing Dashboard for the current legally-reviewed count).</li>
          <li>Keyword/synonym matching cannot capture every phrasing of a scenario — try adding more specific detail (transaction type, actors, evidence) if no results appear.</li>
          <li>Provision &quot;current text&quot; is not reproduced or guaranteed current — always verify against the official SEBI/MCA source before relying on it.</li>
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
          <li>Basic rate limiting is applied to every route, keyed per signed-in officer rather than per network address — so officers sharing an office network do not share one budget. Sign-in itself goes directly from the browser to Supabase Auth, which applies its own rate limiting there.</li>
          <li>No scenario queries are stored, no analytics or third-party trackers are included, and there is no facility to upload confidential investigation records.</li>
        </ul>
      </Section>
    </div>
  );
}
