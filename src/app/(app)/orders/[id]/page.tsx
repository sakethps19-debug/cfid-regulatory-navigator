import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { OrderStageBadge } from "@/components/OrderStageBadge";
import { OrderBroadScenarios } from "@/components/OrderBroadScenarios";
import { directionsForOrderIds, getOrderById, getOrderNoticees, getOrders, getProvisions, getScenarioFindings, orderRelationshipsForOrder } from "@/lib/data";
import { orderRelationshipSentence, siblingOrdersInMatter } from "@/lib/matterRelationships";
import { formatDate } from "@/lib/formatDate";
import { cfidVerificationDisplayText } from "@/lib/cfidVerification";
import { orderGist } from "@/lib/orderGist";
import { parseScopeNoteSections } from "@/lib/scopeNoteSections";
import { provisionsConsideredForOrder } from "@/lib/orderProvisionsConsidered";
import { resolveOrderNoticees } from "@/lib/orderNoticees";
import { NARRATIVE_PROSE_CLASSES, NARRATIVE_JUSTIFY_ONLY } from "@/lib/proseClasses";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const [allFindings, relationships, allOrders, allProvisions, allOrderNoticees, directions] = await Promise.all([
    getScenarioFindings(),
    orderRelationshipsForOrder(order.id),
    getOrders(),
    getProvisions(),
    getOrderNoticees(),
    // This order's OWN directions only — order_id is a verified foreign
    // key (see directionsForOrderIds's own docstring), so no further
    // filtering by stage/case-name is needed or safe: a previous version
    // of this page additionally filtered by guessing "final" vs "interim"
    // from order.orderStage, which silently dropped this order's own
    // directions whenever its stage was anything other than literally
    // "Final order" (Adjudication/Confirmatory/Settlement/Revocation/Other
    // orders were all forced into the "interim" bucket) and could equally
    // have pulled in a sibling order's directions by stage-label
    // coincidence. Sibling orders' own directions remain one click away via
    // "Other orders in the same matter" below, each linking to that
    // order's own detail page.
    directionsForOrderIds([order.id]),
  ]);
  const findings = allFindings.filter((f) => f.orderIds.includes(order.id));
  const siblingOrders = siblingOrdersInMatter(order, allOrders, relationships);
  const issuesExamined = [...new Set(findings.map((f) => f.category).filter((c): c is string => !!c))];
  const provisionById = new Map(allProvisions.map((p) => [p.id, p]));
  const { provisions: rawProvisionsConsidered, hasFindingLevelOnlyProvisionLinkage } = provisionsConsideredForOrder(findings);
  const provisionsConsidered = rawProvisionsConsidered
    .flatMap((summary) => {
      const provision = provisionById.get(summary.provisionId);
      return provision ? [{ summary, provision, orderSpecific: summary.orderSpecific }] : [];
    })
    .sort((a, b) => a.provision.provisionNumber.localeCompare(b.provision.provisionNumber));

  // Noticees: resolveOrderNoticees enforces the hard rule that a
  // person/entity appears here only where the order's own structured
  // order_noticees data names them a noticee — never inferred from a
  // finding's free-text actor list, factual discussion, related-party
  // status, bank-account ownership, transaction involvement, or
  // promoter-family relationship. Follow-up independent-audit correction:
  // the previous version of this function also had a caveated fallback to
  // finding actors when no structured data existed — that path is now
  // removed entirely (PERSON MENTIONED IN FINDINGS != NOTICEE, no
  // exceptions); resolveOrderNoticees no longer takes findings at all. See
  // orderNoticees.ts for the full rationale.
  const resolvedNoticees = resolveOrderNoticees(order.id, allOrderNoticees);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        <Link href="/case-library" className="text-[var(--color-gold-700)] hover:underline">
          ← Back to Case Library
        </Link>
      </div>
      <PageHeader title={order.caseName} description={`${order.orderStage} · ${formatDate(order.orderDate)}`} />

      {relationships.map((r) => {
        const otherOrderId = r.fromOrderId === order.id ? r.toOrderId : r.fromOrderId;
        const otherOrder = allOrders.find((o) => o.id === otherOrderId);
        if (!otherOrder) return null; // referenced order not in the provided set — skip rather than guess
        const sentence = orderRelationshipSentence(order, otherOrder, r);
        return (
          <div
            key={r.id}
            className="mb-4 rounded-md bg-[var(--color-gold-50)] p-3 text-sm text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]"
          >
            {sentence}
            {r.note && <span className="mt-1 block text-left text-xs text-[var(--status-amber-text)]">{r.note}</span>}
            <Link href={`/orders/${otherOrderId}`} className="mt-1 inline-block font-medium text-[var(--status-amber-text)] underline">
              View the linked order →
            </Link>
          </div>
        );
      })}

      {siblingOrders.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Other orders in the same matter</h2>
          <p className={`mb-4 text-sm text-[var(--color-ink-700)] ${NARRATIVE_PROSE_CLASSES}`}>
            One matter/investigation can span several individual orders (interim, confirmatory, final, adjudication,
            or otherwise). Each stays independently visible with its own order type; a later order is never treated
            as silently overwriting an earlier one.
          </p>
          <ul className="space-y-3">
            {siblingOrders.map(({ order: sibling, relationshipLabel }) => (
              <li key={sibling.id} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                      {sibling.officialOrderTitle ?? sibling.caseName}
                    </p>
                    {!sibling.officialOrderTitle && (
                      <p className="text-xs italic text-[var(--color-ink-300)]">
                        Exact official order title not yet captured, showing the matter/case name.
                      </p>
                    )}
                    <p className="mt-1 text-sm text-[var(--color-ink-700)]">
                      {sibling.orderStage} · {sibling.orderDate ? formatDate(sibling.orderDate) : "Date not yet confirmed"}
                    </p>
                  </div>
                  <span className="whitespace-nowrap rounded-sm bg-[var(--color-gold-50)] px-2 py-1 text-xs font-medium text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-100)]">
                    {relationshipLabel}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href={`/orders/${sibling.id}`} className="text-sm font-medium text-[var(--color-gold-700)] hover:underline">
                    View this order →
                  </Link>
                  <SourceLink href={sibling.officialUrl} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">CFID authority</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{cfidVerificationDisplayText(order.cfidVerificationBasis)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order number</dt>
            <dd className="mt-1 font-mono text-sm text-[var(--color-ink-700)]">{order.orderNumber ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order date</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{formatDate(order.orderDate) || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Order type / stage</dt>
            <dd className="mt-1">
              <OrderStageBadge orderStage={order.orderStage} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Authority</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">{order.authority ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Noticees</dt>
            <dd className="mt-1 text-sm text-[var(--color-ink-700)]">
              {resolvedNoticees.source === "structured" ? (
                <ul className="space-y-0.5">
                  {resolvedNoticees.noticees.map((n, i) => (
                    <li key={`${n.fullName}-${i}`}>
                      {n.fullName}
                      {n.role && <span className="text-[var(--color-ink-500)]"> — {n.role}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p>Noticee list not yet captured for this order. Refer to the official order.</p>
                  <div className="mt-1">
                    <SourceLink href={order.officialUrl} />
                  </div>
                </>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Scope note</dt>
            {/* Substantive narrative prose: widens on large displays via
                the shared tiered measure instead of staying trapped in a
                fixed max-w-prose column (live-officer-review correction —
                Rajesh Exports Case Detail review), and is justified for a
                professional report-like reading experience.
                Post-freeze correction pass (Section I): a dense scope note
                that follows the "intro: (1) ...; (2) ..." / "Directions:
                ..." convention (Rajesh Exports' own, among others) is now
                broken into an intro paragraph, a bulleted findings list,
                and a directions paragraph -- purely a display-layer parse
                (parseScopeNoteSections, generic, never Rajesh-Exports-
                specific) of the exact same stored text, never a rewrite of
                it. An order whose scope note doesn't follow that
                convention falls back to the identical single-paragraph
                rendering as before. */}
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
              {/* A short semicolon-joined label list, not paragraph prose —
                  widened for the same wide-screen reason as Scope Note
                  above, but deliberately not justified (justify has no
                  benefit on compact list-style text; see proseClasses.ts). */}
              <dd className="mt-1 max-w-3xl text-left text-sm text-[var(--color-ink-700)] xl:max-w-4xl 2xl:max-w-5xl">{issuesExamined.join("; ")}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4">
          <SourceLink href={order.officialUrl}>Official SEBI source (PDF/HTML)</SourceLink>
        </div>
      </Card>

      {provisionsConsidered.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">
            {hasFindingLevelOnlyProvisionLinkage ? "Provisions linked to this order's finding(s)" : "Provisions considered in this order"}
          </h2>
          <p className={`mb-1 text-xs text-[var(--color-ink-500)] ${NARRATIVE_JUSTIFY_ONLY}`}>
            Every provision cited by this order&apos;s linked finding(s) — substantive prohibitions, disclosure and
            governance obligations, and the penalty/power/attribution provisions cited in connection with them. This
            is historical-order research, not a claim that each is a violation.
          </p>
          {hasFindingLevelOnlyProvisionLinkage && (
            <p className={`mb-3 text-xs italic text-[var(--color-ink-500)] ${NARRATIVE_PROSE_CLASSES}`}>
              Provision linkage is recorded at finding level in the current corpus and may span more than one
              captured order — a &quot;Finding-level&quot; provision below is not proven specific to this order alone.
            </p>
          )}
          <ul className="flex flex-wrap gap-2">
            {provisionsConsidered.map(({ summary, provision: p, orderSpecific }) => (
              <li key={p.id}>
                <Link
                  href={`/provisions/${p.id}`}
                  className="inline-flex flex-wrap items-center gap-1.5 rounded-sm bg-[var(--color-neutral-50)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-900)] ring-1 ring-inset ring-[var(--color-border)] hover:bg-[var(--color-gold-50)] hover:text-[var(--color-gold-800)]"
                >
                  {p.instrument} · {p.provisionNumber}
                  <span className="rounded-sm bg-[var(--color-neutral-100)] px-1.5 py-0.5 text-xs font-normal text-[var(--color-ink-500)]">
                    {summary.legalFunctionLabel}
                  </span>
                  {summary.notUpheldOnly && (
                    <span className="rounded-sm bg-[var(--color-neutral-100)] px-1.5 py-0.5 text-xs font-normal text-[var(--color-ink-500)]">
                      Contravention not established
                    </span>
                  )}
                  {!orderSpecific && (
                    <span
                      className="rounded-sm bg-[var(--color-neutral-100)] px-1.5 py-0.5 text-xs font-normal text-[var(--color-ink-500)]"
                      title="This citation is traceable to a finding that also spans another captured order -- not proven specific to this order alone."
                    >
                      Finding-level
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {directions.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Directions &amp; outcomes</h2>
          <ul className="space-y-2">
            {directions.map((d) => (
              <li key={d.id} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
                <p className={`text-[var(--color-ink-900)] ${NARRATIVE_PROSE_CLASSES}`}>{d.directionOrOutcome}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-500)]">{d.paragraphReference}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Broad scenarios arising from this order</h2>
        {findings.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-700)]">
            No structured findings currently captured for this order. The metadata, order type/stage, noticees (where
            captured) and official source above are accurate as far as they go; this order has not yet been broken
            down into scenario findings.
          </p>
        ) : (
          <>
            <p className="mb-4 text-left text-xs text-[var(--color-ink-500)]">
              Consolidated CFID fact-pattern categories, not one row per underlying research record.
            </p>
            <OrderBroadScenarios findings={findings} />
          </>
        )}
      </Card>
    </div>
  );
}
