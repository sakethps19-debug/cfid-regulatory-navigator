// Screen composers: each function returns the JSX for one fixture screen,
// reusing REAL shared presentational components and REAL pure business
// logic, wrapped with fixture props instead of a Supabase fetch. See
// qa-harness/README.md for the safety design and known limitations.
import type { ReactNode } from "react";
import { Card, SourceLink } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import { OrderBroadScenarios } from "@/components/OrderBroadScenarios";
import { ProvisionOrderList } from "@/components/ProvisionOrderList";
import { CaseLibraryClient } from "@/components/CaseLibraryClient";
import { CaseJourneyStageCard } from "@/components/CaseJourneyStageCard";
import { CompareScenariosResultClient } from "@/components/CompareScenariosResultClient";
import { FixedScenarioAnalyzer } from "@/components/analyzer/FixedScenarioAnalyzer";
import { LawLibraryClient } from "@/components/LawLibraryClient";
import { FraudTestChecklist } from "@/app/(app)/fraud-test/FraudTestChecklist";
import MethodologyPage from "@/app/(app)/methodology/page";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { NavBarStatic } from "./shims/NavBarStatic";
import { countProvisionTextProvenance } from "@/lib/provisionTextProvenance";
import { isDeepAnalyzed } from "@/lib/processingStages";
import { resolveAllFixedScenarios } from "@/lib/fixedScenarioResolver";
import { relevantScenarioRecords, groupRelevantRecordsByOrder } from "@/lib/fixedScenarioRelevantRecords";
import { retrievalRuleForProvision } from "@/data/curated/provision-retrieval-rules";
import { formatDate } from "@/lib/formatDate";
import { orderGist } from "@/lib/orderGist";
import { parseScopeNoteSections } from "@/lib/scopeNoteSections";
import { groupAppliedFindingsByOrder } from "@/lib/fraudDoctrineApplication";
import { StatusBadge } from "@/components/StatusBadge";
import { pickRecentOrders } from "@/lib/pickRecentOrders";
import { orderBroadScenarios } from "@/lib/orderBroadScenarios";
import { provisionsConsideredForOrder } from "@/lib/orderProvisionsConsidered";
import { cfidVerificationDisplayText } from "@/lib/cfidVerification";
import { resolveOrderNoticees } from "@/lib/orderNoticees";
import { groupProvisionFindingsByOrder } from "@/lib/provisionOrderHistory";
import { PROVISION_TEXT_PROVENANCE } from "@/lib/provisionTextProvenance";
import { buildCaseJourney } from "@/lib/caseJourney";
import { NARRATIVE_PROSE_CLASSES, NARRATIVE_JUSTIFY_ONLY } from "@/lib/proseClasses";
import type { Order, OrderRelationship, ScenarioFinding, Matter } from "@/types/domain";
import * as F from "./fixtures";

/** Every screen shares this app shell (NavBar + DisclaimerBanner + main
 * width tiering + footer) -- copied from src/app/(app)/layout.tsx so the
 * chrome around each screenshot matches production. */
export function AppShell({ children, pathname }: { children: ReactNode; pathname: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBarStatic isAdmin={false} pathname={pathname} />
      <DisclaimerBanner />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:max-w-[85rem] 2xl:max-w-[100rem] 3xl:max-w-[130rem]">
        {children}
      </main>
      <footer className="no-print border-t border-[var(--color-border)] bg-[var(--color-paper-raised)] px-4 py-4 text-center text-xs text-[var(--color-ink-500)]">
        SPARC — CFID Regulatory Research Platform, internal research-assistance pilot. Not a determination of any violation.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------
// HOME
// ---------------------------------------------------------------------
export function HomeScreen() {
  const orders = [F.SEACOAST_FINAL, F.SEACOAST_INTERIM, F.REL_ORDER];
  const findings = [...F.SEACOAST_FINDINGS, ...F.REL_FINDINGS];
  const recentOrders = pickRecentOrders(orders);
  const findingsByOrder = new Map<string, ScenarioFinding[]>();
  for (const f of findings) for (const id of f.orderIds) findingsByOrder.set(id, [...(findingsByOrder.get(id) ?? []), f]);

  return (
    <div>
      <PageHeader
        title="Officer Research Home"
        description="A research-assistance tool for CFID investigation and adjudication support — it identifies potentially relevant provisions and historical treatment from the facts you enter; it does not determine whether a violation occurred. Do not enter confidential, unpublished, or market-sensitive investigation information into this pilot environment."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Analyze a Scenario", description: "Enter the facts as you understand them and identify the regulatory issues and provisions that warrant examination.", cta: "Analyze a scenario →" },
          { title: "Search Cases", description: "Research indexed CFID matters, orders and the structured findings extracted from them.", cta: "Search cases →" },
          { title: "Explore Law", description: "Research a provision's text, verification status, and how CFID has historically considered it.", cta: "Explore the Law Library →" },
        ].map((task, i) => (
          <Card key={task.title} className={`h-full ${i === 0 ? "ring-1 ring-[var(--color-gold-600)]/60" : ""}`}>
            <h2 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">{task.title}</h2>
            <p className="mt-1.5 text-sm text-[var(--color-ink-700)]">{task.description}</p>
            <span className="mt-3 inline-block text-sm font-medium text-[var(--color-gold-700)]">{task.cta}</span>
          </Card>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Recent orders</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">The most recently dated indexed orders, latest first, strict chronology only.</p>
        <ul className="mt-3 space-y-2">
          {recentOrders.map((o) => (
            <li key={o.id} className="rounded-lg border border-[var(--color-border)] p-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <OrderStageBadge orderStage={o.orderStage} />
                <span className="font-medium text-[var(--color-ink-900)]">{o.caseName}</span>
                <span className="text-xs text-[var(--color-ink-500)]">{formatDate(o.orderDate)}</span>
              </div>
              {(() => {
                const gist = orderGist(o, findingsByOrder.get(o.id) ?? []);
                return gist && <p className="mt-1 text-[var(--color-ink-700)]">{gist}</p>;
              })()}
              <div className="mt-1"><SourceLink href={o.officialUrl} /></div>
            </li>
          ))}
        </ul>
      </Card>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Other research tools</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="font-medium text-[var(--color-gold-700)]">Fraud Doctrine Analyser →</span>{" "}
              <span className="text-[var(--color-ink-700)]">apply, to your own facts, the fraud test under PFUTP Regulation 2(1)(c) as reproduced in an official SEBI order — a reference aid, not an automated determination.</span></li>
            <li><span className="font-medium text-[var(--color-gold-700)]">Source Library →</span>{" "}
              <span className="text-[var(--color-ink-700)]">the official SEBI/MCA sources this tool is built from.</span></li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">About this tool</h2>
          <p className="mt-2 text-xs text-[var(--color-ink-500)]">
            Every result is produced by deterministic rule-based matching over this pilot&apos;s curated records —
            never generated or inferred by AI — and every source is a specific official SEBI/MCA document or indexed
            CFID order. That does not mean the underlying corpus is complete: some provision citations, statutory
            text, and order titles carry their own documented verification or completeness caveats, shown alongside
            each result. See how the analysis is built, what it does and does not do, and its known limitations.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-[var(--color-gold-700)]">Methodology &amp; Limitations →</span>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// FIXED ANALYZER
// ---------------------------------------------------------------------
export function FixedAnalyzerGridScreen() {
  return (
    <div>
      <PageHeader title="Analyze a Scenario" description="Identify potentially relevant provisions and historical treatment from the facts you enter." />
      <FixedScenarioAnalyzer provisions={F.DIVERSION_SCENARIO_PROVISIONS} findings={[]} orders={[]} onSwitchToFreeForm={() => {}} />
    </div>
  );
}

function fixedScenarioResultJsx(scenarioProvisions = F.DIVERSION_SCENARIO_PROVISIONS, findings: ScenarioFinding[], orders: Order[]) {
  const scenarios = resolveAllFixedScenarios(scenarioProvisions);
  const scenario = scenarios.find((s) => s.name.includes("Diversion"))!;
  const records = relevantScenarioRecords(scenario.id, findings, [...scenario.provisionGroups.flatMap((g) => g.items)], orders);
  const groups = groupRelevantRecordsByOrder(records);
  const visible = groups.slice(0, 5);

  return (
    <div>
      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Scenario</span>
          <h3 className="font-serif text-lg font-semibold text-[var(--color-ink-900)]">{scenario.name}</h3>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">What this covers</span>
          <p className={`text-sm text-[var(--color-ink-700)] ${NARRATIVE_PROSE_CLASSES}`}>{scenario.explanation}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Potentially relevant regulatory provisions</span>
          <div className="columns-1 gap-8 xl:columns-2">
            {scenario.provisionGroups.map((group) => (
              <div key={group.instrument} className="mb-4">
                <div className="break-inside-avoid text-sm font-semibold text-[var(--color-ink-900)]">{group.instrument}</div>
                <ul className="mt-1 flex flex-col gap-1">
                  {group.items.map((p) => {
                    const rule = retrievalRuleForProvision(p.id);
                    return (
                      <li key={p.id} className="break-inside-avoid text-sm text-[var(--color-ink-700)]">
                        <span className="font-medium text-[var(--color-gold-700)]">{p.provisionNumber}</span>
                        {p.subject && <span> — {p.subject}</span>}
                        {rule && <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">Why potentially relevant: {rule.explanation}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex w-full items-center justify-between text-left">
          <h3 className="font-serif text-base font-semibold text-[var(--color-ink-900)]">
            Relevant CFID Orders <span className="font-sans text-sm font-normal text-[var(--color-ink-500)]">({groups.length})</span>
          </h3>
          {groups.length > 0 && <span className="text-sm text-[var(--color-gold-700)]">Hide</span>}
        </div>
        {groups.length === 0 ? (
          <p className={`mt-2 text-sm text-[var(--color-ink-700)] ${NARRATIVE_JUSTIFY_ONLY}`}>
            No captured CFID precedent is currently mapped to this fact pattern. This means only that the current captured corpus does not provide a
            structured, provision-linked precedent for this scenario — it does not mean no violation exists, that SEBI has never considered such
            conduct, or that the allegation is legally unsustainable.
          </p>
        ) : (
          <>
            <p className={`mt-1 text-xs text-[var(--color-ink-500)] ${NARRATIVE_JUSTIFY_ONLY}`}>
              One card per captured order whose own structured findings touch this theme AND whose finding-provision link cites one of the provisions
              listed above.
            </p>
            <p className={`mt-1 text-xs text-[var(--color-ink-500)] ${NARRATIVE_JUSTIFY_ONLY}`}>
              Being listed under this theme means an order&apos;s findings examine that subject matter — not that any amount named in a finding&apos;s
              title is itself an established quantum of diversion, siphoning or misutilisation.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {visible.map((g) => {
                const dispositions = g.findings.filter((f) => f.dispositionLabel);
                return (
                  <div key={g.order.id} className="rounded-sm border border-[var(--color-border)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--color-ink-900)]">{g.order.caseName}</span>
                      <OrderStageBadge orderStage={g.order.orderStage} />
                      <span className="text-xs text-[var(--color-ink-500)]">{formatDate(g.order.orderDate) || "date not on file"}</span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Relevant findings/scenarios in this order</span>
                      <ul className="flex flex-col gap-1">
                        {g.findings.map((f) => (
                          <li key={f.finding.recordId} className="text-sm text-[var(--color-ink-700)]">
                            <span className="font-mono text-xs text-[var(--color-ink-500)]">{f.finding.recordId}</span> — {f.scenarioTitle}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {dispositions.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-300)]">Outcome / historical treatment</span>
                        <ul className="flex flex-col gap-0.5">
                          {dispositions.map((f) => (
                            <li key={f.finding.recordId} className="text-sm text-[var(--color-ink-700)]">{f.finding.recordId}: {f.dispositionLabel}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <SourceLink href={g.order.officialUrl} />
                      <span className="font-medium text-[var(--color-gold-700)]">View Case →</span>
                    </div>
                  </div>
                );
              })}
              {groups.length > 5 && <span className="self-start text-xs font-medium text-[var(--color-gold-700)]">Show all {groups.length} orders →</span>}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export function FixedAnalyzerResultScreen() {
  return (
    <div>
      <PageHeader title="Analyze a Scenario" description="Identify potentially relevant provisions and historical treatment from the facts you enter." />
      {fixedScenarioResultJsx(F.DIVERSION_SCENARIO_PROVISIONS, [...F.REL_FINDINGS, ...F.SEACOAST_FINDINGS], [F.REL_ORDER, F.SEACOAST_INTERIM, F.SEACOAST_FINAL])}
    </div>
  );
}

export function FixedAnalyzerResultManyOrdersScreen() {
  return (
    <div>
      <PageHeader title="Analyze a Scenario" description="Identify potentially relevant provisions and historical treatment from the facts you enter." />
      {fixedScenarioResultJsx(F.DIVERSION_SCENARIO_PROVISIONS, F.MANY_DIVERSION_FINDINGS, F.MANY_DIVERSION_ORDERS)}
    </div>
  );
}

export function FixedAnalyzerResultZeroOrdersScreen() {
  return (
    <div>
      <PageHeader title="Analyze a Scenario" description="Identify potentially relevant provisions and historical treatment from the facts you enter." />
      {fixedScenarioResultJsx(F.DIVERSION_SCENARIO_PROVISIONS, [], [])}
    </div>
  );
}

// ---------------------------------------------------------------------
// CASE LIBRARY
// ---------------------------------------------------------------------
export function CaseLibraryScreen() {
  const orders = F.CASE_LIBRARY_ORDERS;
  const findings = F.CASE_LIBRARY_FINDINGS;
  const findingsByOrderId = new Map<string, ScenarioFinding[]>();
  for (const f of findings) for (const id of f.orderIds) {
    const list = findingsByOrderId.get(id);
    if (list) list.push(f); else findingsByOrderId.set(id, [f]);
  }
  const clOrders = orders.map((o) => ({
    ...o,
    provisionSearchText: "",
    issuesExamined: orderBroadScenarios(findingsByOrderId.get(o.id) ?? []).map((s) => ({ id: s.scenario.id, name: s.scenario.name })),
  }));
  return (
    <div>
      <PageHeader title="Case Library" description="Research indexed CFID matters, orders and the structured findings extracted from them." />
      <CaseLibraryClient orders={clOrders} />
    </div>
  );
}

// ---------------------------------------------------------------------
// CASE DETAIL (Rajesh-style, and an empty-findings/no-noticee variant)
// ---------------------------------------------------------------------
export function CaseDetailRajeshScreen() {
  const order = F.REL_ORDER;
  const findings = F.REL_FINDINGS;
  const resolvedNoticees = resolveOrderNoticees(order.id, F.REL_NOTICEES);
  const { provisions: rawProvisionsConsidered, hasFindingLevelOnlyProvisionLinkage } = provisionsConsideredForOrder(findings);
  const provisionById = new Map(F.REL_PROVISIONS.map((p) => [p.id, p]));
  const provisionsConsidered = rawProvisionsConsidered.flatMap((summary) => {
    const provision = provisionById.get(summary.provisionId);
    return provision ? [{ summary, provision, orderSpecific: summary.orderSpecific }] : [];
  });
  const issuesExamined = [...new Set(findings.map((f) => f.category).filter((c): c is string => !!c))];

  return (
    <div>
      <PageHeader title={order.caseName} description={`${order.orderStage} · ${formatDate(order.orderDate)}`} />
      <Card className="mb-6">
        {/* Field order/col-span mirrors the real orders/[id]/page.tsx dl
            exactly (7 regular cells, then Scope note and Issues examined
            each full-row-span) -- an earlier qa-harness draft reordered
            these and accidentally put Scope Note in the same grid row as
            Order Number, producing a large dead-space artifact that was a
            harness bug, not a real product defect. Corrected here after
            comparing this screenshot against the real page's source. */}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">CFID authority</dt><dd className="mt-1 text-sm text-[var(--color-ink-700)]">{cfidVerificationDisplayText(order.cfidVerificationBasis)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order number</dt><dd className="mt-1 font-mono text-sm text-[var(--color-ink-700)]">{order.orderNumber ?? "-"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order date</dt><dd className="mt-1 text-sm text-[var(--color-ink-700)]">{formatDate(order.orderDate) || "-"}</dd></div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order type / stage</dt>
            <dd className="mt-1"><OrderStageBadge orderStage={order.orderStage} /></dd>
          </div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Authority</dt><dd className="mt-1 text-sm text-[var(--color-ink-700)]">{order.authority ?? "-"}</dd></div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Noticees</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">
              {resolvedNoticees.source === "structured" ? (
                <ul className="space-y-0.5">
                  {resolvedNoticees.noticees.map((n, i) => (
                    <li key={`${n.fullName}-${i}`}>{n.fullName}{n.role && <span className="text-[var(--color-ink-500)]"> — {n.role}</span>}</li>
                  ))}
                </ul>
              ) : (
                <><p>Noticee list not yet captured for this order. Refer to the official order.</p><div className="mt-1"><SourceLink href={order.officialUrl} /></div></>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Scope note</dt>
            {/* Post-freeze correction pass (Section I): mirrors the real
                page's parseScopeNoteSections rendering (see
                src/app/(app)/orders/[id]/page.tsx) -- harness debt if this
                drifts from that source, per this file's own header note. */}
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">
              {(() => {
                const gist = orderGist(order, findings);
                if (!gist) return "Not yet captured for this order";
                const { intro, listItems, directions } = parseScopeNoteSections(gist);
                if (listItems.length === 0) {
                  return <p className={NARRATIVE_PROSE_CLASSES}>{intro}</p>;
                }
                return (
                  <div className="space-y-3">
                    <p className={NARRATIVE_PROSE_CLASSES}>{intro}</p>
                    <ul className={`list-disc space-y-1.5 pl-5 ${NARRATIVE_PROSE_CLASSES}`}>
                      {listItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                    {directions && (
                      <p className={NARRATIVE_PROSE_CLASSES}>
                        <span className="font-semibold text-[var(--color-ink-900)]">Directions: </span>
                        {directions}
                      </p>
                    )}
                  </div>
                );
              })()}
            </dd>
          </div>
          {issuesExamined.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Issues examined</dt>
              <dd className="mt-1 max-w-3xl text-left text-sm text-[var(--color-ink-700)] xl:max-w-4xl 2xl:max-w-5xl">{issuesExamined.join("; ")}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4"><SourceLink href={order.officialUrl}>Official SEBI source (PDF/HTML)</SourceLink></div>
      </Card>

      {provisionsConsidered.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">
            {hasFindingLevelOnlyProvisionLinkage ? "Provisions linked to this order's finding(s)" : "Provisions considered in this order"}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {provisionsConsidered.map(({ summary, provision: p }) => (
              <li key={p.id}>
                <span className="inline-flex flex-wrap items-center gap-1.5 rounded-sm bg-[var(--color-neutral-50)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-900)] ring-1 ring-inset ring-[var(--color-border)]">
                  {p.instrument} · {p.provisionNumber}
                  <span className="rounded-sm bg-[var(--color-neutral-100)] px-1.5 py-0.5 text-xs font-normal text-[var(--color-ink-500)]">{summary.legalFunctionLabel}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Broad scenarios arising from this order</h2>
        <OrderBroadScenarios findings={findings} />
      </Card>
    </div>
  );
}

export function CaseDetailEmptyScreen() {
  const order = F.EMPTY_METADATA_ORDER;
  return (
    <div>
      <PageHeader title={order.caseName} description={`${order.orderStage} · ${formatDate(order.orderDate)}`} />
      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order type / stage</dt><dd className="mt-1"><OrderStageBadge orderStage={order.orderStage} /></dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Noticees</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">
              <p>Noticee list not yet captured for this order. Refer to the official order.</p>
              <div className="mt-1"><SourceLink href={order.officialUrl} /></div>
            </dd>
          </div>
        </dl>
      </Card>
      <Card>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Broad scenarios arising from this order</h2>
        <p className="text-sm text-[var(--color-ink-700)]">
          No structured findings currently captured for this order. The metadata, order type/stage, noticees (where
          captured) and official source above are accurate as far as they go; this order has not yet been broken
          down into scenario findings.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------
// PROVISION DETAIL
// ---------------------------------------------------------------------
export function ProvisionDetailScreen() {
  const provision = F.PROVISION_DETAIL_SUBJECT;
  const versions = F.PROVISION_VERSIONS;
  const ordersById = new Map([F.REL_ORDER, F.SEACOAST_FINAL].map((o) => [o.id, o]));
  const findings = F.REL_FINDINGS.filter((f) => f.provisionIds.includes(provision.id));
  const orderHistory = groupProvisionFindingsByOrder(findings, ordersById);

  return (
    <div>
      <PageHeader title={`${provision.instrument} · ${provision.provisionNumber}`} description={provision.subject ?? undefined} />
      <Card className="mb-6">
        <h2 className="mb-2 text-base font-semibold text-[var(--color-ink-900)]">Statutory text</h2>
        <ul className="space-y-4">
          {versions.map((v) => {
            const provenance = PROVISION_TEXT_PROVENANCE[v.status];
            const toneClass =
              provenance.tone === "positive" ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)] ring-[var(--status-green-ring)]"
              : provenance.tone === "caution" ? "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]"
              : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] ring-[var(--status-neutral-ring)]";
            return (
              <li key={v.id} className="rounded-md border border-[var(--color-border)] p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-500)]">
                  <span className="font-semibold">{v.versionLabel}</span>
                  <span>{v.effectiveFrom ? `Effective from ${formatDate(v.effectiveFrom)}` : ""}{v.effectiveTo ? ` to ${formatDate(v.effectiveTo)}` : v.effectiveFrom ? " (current)" : ""}</span>
                </div>
                <div className="mb-2 flex flex-wrap items-start gap-2">
                  <span className={`inline-flex shrink-0 items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneClass}`}>{provenance.label}</span>
                  <span className="text-xs text-[var(--color-ink-500)]">{provenance.description}</span>
                </div>
                {v.exactText ? (
                  // Post-freeze correction pass (Section H): mirrors the
                  // real page's widened measure (see
                  // src/app/(app)/provisions/[id]/page.tsx).
                  <blockquote className="max-w-3xl whitespace-pre-wrap border-l-2 border-[var(--color-gold-600)] pl-3 text-sm text-[var(--color-ink-900)] sm:max-w-4xl xl:max-w-5xl">{v.exactText}</blockquote>
                ) : v.sourceUrl ? (
                  <p className="text-sm text-[var(--color-ink-500)]">No text on file for this version yet — read it directly at the official source link below.</p>
                ) : (
                  <p className="text-sm text-[var(--color-ink-500)]">Not yet transcribed from the official source into this tool.</p>
                )}
                {v.sourceUrl && <div className="mt-2"><SourceLink href={v.sourceUrl}>Official source (PDF)</SourceLink></div>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Historical treatment in captured orders</h2>
        <p className={`mt-1 text-sm text-[var(--color-ink-700)] ${NARRATIVE_JUSTIFY_ONLY}`}>
          Cited in {findings.length} scenario finding{findings.length === 1 ? "" : "s"} in this pilot&apos;s precedent
          library, across {orderHistory.length} captured order{orderHistory.length === 1 ? "" : "s"} below — not a
          claim about how this provision has fared across every SEBI order, only the ones analysed here.
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {orderHistory.map((entry) => {
            const dispositions = entry.findings.filter((f) => f.dispositionLabel);
            return (
              <li key={entry.order.id} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-ink-900)]">{entry.order.caseName}</span>
                  <OrderStageBadge orderStage={entry.order.orderStage} />
                  <span className="text-xs text-[var(--color-ink-500)]">{formatDate(entry.order.orderDate) || "date not on file"}</span>
                </div>
                {dispositions.length > 0 && (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {dispositions.map((f) => <li key={f.finding.recordId} className="text-sm text-[var(--color-ink-700)]">{f.finding.recordId}: {f.dispositionLabel}</li>)}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3"><SourceLink href={entry.order.officialUrl} /><span className="text-sm font-medium text-[var(--color-gold-700)]">View Case →</span></div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink-900)]">Orders citing this provision</h2>
        <p className="mb-4 text-sm text-[var(--color-ink-700)]">Orders that expressly cite this exact provision, most recent first.</p>
        <ProvisionOrderList findings={findings} ordersById={ordersById} />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------
// CASE JOURNEY (Seacoast-style, interim -> final)
// ---------------------------------------------------------------------
export function CaseJourneySeacoastScreen() {
  const matter: Matter = { id: "60bbd426-879c-47e7-bd4d-038c148b416c", normalizedMatterName: "Seacoast Shipping Services Limited", description: null };
  const orders = [F.SEACOAST_INTERIM, F.SEACOAST_FINAL];
  const relationships: OrderRelationship[] = [
    {
      id: "rel-1",
      fromOrderId: F.SEACOAST_INTERIM.id,
      fromCaseName: F.SEACOAST_INTERIM.caseName,
      toOrderId: F.SEACOAST_FINAL.id,
      toCaseName: F.SEACOAST_FINAL.caseName,
      relationshipType: "interim_to_final",
      note: null,
    },
  ];
  const journey = buildCaseJourney(matter, orders, F.SEACOAST_FINDINGS, [], relationships);

  return (
    <div>
      <PageHeader title={matter.normalizedMatterName} description="Procedural evolution of this matter across every captured order, in strict chronological order." />
      <div className="grid gap-4 lg:grid-cols-2">
        {journey.stages.map((stage, i) => (
          <CaseJourneyStageCard key={stage.order.id} stage={stage} stageNumber={i + 1} totalStages={journey.stages.length} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// COMPARE SCENARIOS
// ---------------------------------------------------------------------
export function CompareScenariosScreen() {
  return (
    <div>
      <PageHeader title="Compare Scenarios" description="How has the same broad legal/factual issue been treated across different matters and orders?" />
      <CompareScenariosResultClient rows={F.COMPARE_SCENARIOS_ROWS} provisions={F.COMPARE_SCENARIOS_PROVISIONS} />
    </div>
  );
}

export function CompareScenariosEmptyScreen() {
  return (
    <div>
      <PageHeader title="Compare Scenarios" description="How has the same broad legal/factual issue been treated across different matters and orders?" />
      <CompareScenariosResultClient rows={[]} provisions={F.COMPARE_SCENARIOS_PROVISIONS} />
    </div>
  );
}

// ---------------------------------------------------------------------
// LAW LIBRARY
// ---------------------------------------------------------------------
export function LawLibraryScreen() {
  return (
    <div>
      {/* Post-freeze correction pass (Section F): mirrors the real page --
          no CorpusReviewStatusBanner, no "filter by finding status"
          wording (see src/app/(app)/law-library/page.tsx). */}
      <PageHeader
        title="Law Library"
        description="Every legal instrument and provision actually cited or applied in the orders analysed for this pilot. Browse by regulator, then instrument, then provision, or search by provision, instrument, or a recognised CFID fact pattern."
      />
      <LawLibraryClient instruments={F.LAW_LIBRARY_INSTRUMENTS} provisions={F.LAW_LIBRARY_PROVISIONS} findings={F.LAW_LIBRARY_FINDINGS} />
    </div>
  );
}

// ---------------------------------------------------------------------
// SOURCE LIBRARY
// ---------------------------------------------------------------------
export function SourceLibraryScreen() {
  const allOrders = [F.REL_ORDER, F.SEACOAST_INTERIM, F.SEACOAST_FINAL, F.EMPTY_METADATA_ORDER];
  const orders = allOrders.filter((o) => isDeepAnalyzed(o.processingStage));
  const provisions = F.LAW_LIBRARY_PROVISIONS;
  const byInstrument = new Map<string, number>();
  for (const p of provisions) byInstrument.set(p.instrument, (byInstrument.get(p.instrument) ?? 0) + 1);
  const versionsByProvisionId = new Map([[F.PROVISION_DETAIL_SUBJECT.id, F.PROVISION_VERSIONS]]);
  const provenanceCounts = countProvisionTextProvenance(provisions.length, versionsByProvisionId);

  return (
    <div>
      <PageHeader
        title="Source Library"
        description="Official sources used in this pilot. Only the official SEBI website (orders, Acts, regulations, circulars), the official MCA website, official sources for notified accounting standards, and sources expressly referred to within the SEBI orders themselves are used, never law-firm articles, blogs, news reports, commercial databases, or unofficial reproductions."
      />
      <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Orders in the structured precedent library ({orders.length})</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <Card key={o.id}>
            <h3 className="text-base font-semibold text-[var(--color-ink-900)]">{o.caseName}</h3>
            <p className="text-sm text-[var(--color-ink-700)]">{o.orderStage} · {formatDate(o.orderDate)}</p>
            <p className="mt-1 font-mono text-xs text-[var(--color-ink-500)]">{o.orderNumber}</p>
            <div className="mt-3 flex flex-wrap gap-2"><SourceLink href={o.officialUrl} /></div>
          </Card>
        ))}
      </div>
      <h2 className="mt-8 mb-3 text-base font-semibold text-[var(--color-ink-900)]">Provisions indexed by instrument</h2>
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[...byInstrument.entries()].map(([instrument, count]) => (
            <div key={instrument} className="flex items-center justify-between rounded-md bg-[var(--color-neutral-50)] px-3 py-2 text-sm">
              <dt className="text-[var(--color-ink-700)]">{instrument}</dt>
              <dd className="font-semibold text-[var(--color-ink-900)]">{count}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[var(--color-ink-500)]">
          These {provisions.length} provisions are only the ones actually cited in the orders analysed so far, they
          do not represent the complete CFID law library, and the count will grow as more orders are analysed.
        </p>
        <p className="mt-2 text-xs text-[var(--color-ink-500)]">
          Provision text on file, across {provenanceCounts.totalVersions} recorded version{provenanceCounts.totalVersions === 1 ? "" : "s"}:{" "}
          {provenanceCounts.officiallyVerifiedVersions} &quot;{PROVISION_TEXT_PROVENANCE.officially_verified.label}&quot;,{" "}
          {provenanceCounts.orderCitedTextOnlyVersions} &quot;{PROVISION_TEXT_PROVENANCE.order_cited_text_only.label}&quot;,{" "}
          {provenanceCounts.requiresVerificationVersions} &quot;{PROVISION_TEXT_PROVENANCE.requires_verification.label}&quot;.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------
// FRAUD DOCTRINE
// ---------------------------------------------------------------------
export function FraudDoctrineScreen() {
  const doctrine = F.FRAUD_DOCTRINE_LEGAL_TEST;
  const appliedFindings = F.REL_FINDINGS.filter((f) => f.recordId === "REL-01" || f.recordId === "REL-02");
  const relFinding = appliedFindings.find((f) => f.recordId.startsWith("REL-"));
  const relOrderId = relFinding?.orderIds[0];
  const appliedOrders = groupAppliedFindingsByOrder(appliedFindings);

  return (
    <div>
      <PageHeader
        title="Fraud Doctrine Analyser"
        description={
          'A doctrinal aid for testing a fact pattern against the Supreme Court’s "fraud" test under PFUTP Regulation 2(1)(c) ' +
          "(Reliance Industries Ltd. v. SEBI, 2026 INSC 585), distinct from the Scenario Analyzer, which matches facts against " +
          "this pilot's precedent findings."
        }
      />
      <div className="mb-6 rounded-sm bg-[var(--color-gold-50)] p-3.5 text-sm text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
        This checklist organises considerations relevant to the cited doctrine. It does not determine whether fraud
        or any violation occurred, and it is entirely independent of the Scenario Analyzer&apos;s precedent matching.
      </div>
      {/* Post-freeze correction pass (Section A): the "Automated doctrinal
          assessment unavailable" static banner is gone from the real page
          -- FraudTestChecklist (the real component, imported below) now
          renders a computed read itself. Removed here to match, rather
          than let this harness screen show a defect that no longer
          exists in production. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Authority and doctrine</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-900)]">{doctrine.workingPrinciple}</p>
          <div className="mt-3 rounded-sm bg-[var(--color-gold-50)] p-3 text-xs text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
            {doctrine.implementationGuardrail}
          </div>
          <p className="mt-3 text-xs text-[var(--color-ink-500)]">{doctrine.paragraphAnchors}</p>
          <blockquote className="mt-4 whitespace-pre-wrap border-l-2 border-[var(--color-gold-600)] pl-3 text-sm leading-relaxed text-[var(--color-ink-700)]">
            {'"175. … in situations where injury due to wrongful act is established, i.e, inducement to deal in securities has caused the other person to be adversely affected and allowed the party accused of fraud to gain unlawful profits or avert ordinary losses at the former’s expense, there would be no requirement on the respondent authority to prove deceitful intention."'}
          </blockquote>
          <p className="mt-2 text-xs text-[var(--color-ink-500)]">
            As reproduced and applied in the official SEBI Interim Order in the matter of Rajesh Exports Limited (03-Jun-2026), paras 219–222{relOrderId && " — see the official order below"}.
          </p>
          {relOrderId && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-[var(--color-gold-700)]">View this order in Case Detail →</span>
              <SourceLink href={relFinding!.officialSourceUrl}>Official SEBI order (PDF/HTML)</SourceLink>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Apply it to your facts</h2>
          <FraudTestChecklist />
        </Card>
      </div>
      {/* Post-freeze correction pass (Section B): mirrors the real page's
          one-card-per-order grouping (see
          src/app/(app)/fraud-test/page.tsx). */}
      <Card className="mt-6">
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Orders applying this doctrine</h2>
        <ul className="mt-3 space-y-3">
          {appliedOrders.map((o) => (
            <li key={o.orderId} className="rounded-md border border-[var(--color-border)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[var(--color-gold-700)]">{o.caseName}</span>
              </div>
              <ul className="mt-2 space-y-2">
                {o.findings.map((f) => (
                  <li key={f.recordId} className="border-l-2 border-[var(--color-border)] pl-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={f.findingStatus} />
                      <span className="text-xs text-[var(--color-ink-500)]">{f.recordId}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-ink-700)]">{f.scenarioTitle}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-2">
                <SourceLink href={o.officialSourceUrl} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------
// METHODOLOGY (zero fixture cost -- no data dependency in the real page)
// ---------------------------------------------------------------------
export function MethodologyScreen() {
  return <MethodologyPage />;
}

export const SCREENS: { name: string; render: () => ReactNode; pathname: string }[] = [
  { name: "home", render: HomeScreen, pathname: "/dashboard" },
  { name: "compare-scenarios", render: CompareScenariosScreen, pathname: "/compare-scenarios/diversion" },
  { name: "compare-scenarios-empty", render: CompareScenariosEmptyScreen, pathname: "/compare-scenarios/diversion" },
  { name: "law-library", render: LawLibraryScreen, pathname: "/law-library" },
  { name: "source-library", render: SourceLibraryScreen, pathname: "/library" },
  { name: "fraud-doctrine", render: FraudDoctrineScreen, pathname: "/fraud-test" },
  { name: "methodology", render: MethodologyScreen, pathname: "/methodology" },
  { name: "fixed-analyzer-grid", render: FixedAnalyzerGridScreen, pathname: "/analyzer" },
  { name: "fixed-analyzer-result", render: FixedAnalyzerResultScreen, pathname: "/analyzer" },
  { name: "fixed-analyzer-result-many-orders", render: FixedAnalyzerResultManyOrdersScreen, pathname: "/analyzer" },
  { name: "fixed-analyzer-result-zero-orders", render: FixedAnalyzerResultZeroOrdersScreen, pathname: "/analyzer" },
  { name: "case-library", render: CaseLibraryScreen, pathname: "/case-library" },
  { name: "case-detail-rajesh", render: CaseDetailRajeshScreen, pathname: "/orders/fixture-rel-order" },
  { name: "case-detail-empty", render: CaseDetailEmptyScreen, pathname: "/orders/fixture-empty-metadata" },
  { name: "provision-detail", render: ProvisionDetailScreen, pathname: "/provisions/PFUTP-2-1-c" },
  { name: "case-journey-seacoast", render: CaseJourneySeacoastScreen, pathname: "/case-journey/seacoast" },
];
