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
import { orderProvisionsConsidered } from "@/lib/orderProvisionsConsidered";

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
  const provisionsConsidered = orderProvisionsConsidered(findings)
    .flatMap((summary) => {
      const provision = provisionById.get(summary.provisionId);
      return provision ? [{ summary, provision }] : [];
    })
    .sort((a, b) => a.provision.provisionNumber.localeCompare(b.provision.provisionNumber));

  // Noticees: structured order_noticees data first (curated, named party by
  // named party — "against whom was this proceeding actually directed"),
  // never inferred/backfilled from a finding's free-text actor list, an
  // auditor/banker/counterparty merely mentioned in the narrative, or a
  // subsidiary/director who was not themselves a noticee. Where structured
  // data isn't yet on file for this order (most of the corpus, as of this
  // pass — a full reconstruction is a separate, out-of-scope workstream),
  // fall back to the existing curated noticeeActors on this order's own
  // findings (already scoped to noticee names, not a generic actor list,
  // by the field's own curation convention) rather than showing nothing;
  // if neither exists, say so plainly instead of inventing a name.
  const structuredNoticees = allOrderNoticees.filter((n) => n.orderId === order.id);
  const fallbackNoticeeNames = [...new Set(findings.flatMap((f) => f.noticeeActors))];

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
          <p className="mb-4 text-left text-sm text-[var(--color-ink-700)]">
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
        <dl className="grid gap-4 sm:grid-cols-2">
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
              {structuredNoticees.length > 0 ? (
                <ul className="space-y-0.5">
                  {structuredNoticees.map((n, i) => (
                    <li key={`${n.fullName}-${i}`}>
                      {n.fullName}
                      {n.role && <span className="text-[var(--color-ink-500)]"> — {n.role}</span>}
                    </li>
                  ))}
                </ul>
              ) : fallbackNoticeeNames.length > 0 ? (
                <>
                  <p className="text-xs italic text-[var(--color-ink-500)]">
                    Structured noticee list not yet captured for this order — names below are recorded in this
                    order&apos;s structured findings, not independently verified as the complete noticee list.
                  </p>
                  <p className="mt-1">{fallbackNoticeeNames.join(", ")}</p>
                </>
              ) : (
                "Not yet captured for this order"
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Scope note</dt>
            <dd className="mt-1 text-left text-sm text-[var(--color-ink-700)]">{orderGist(order, findings) ?? "Not yet captured for this order"}</dd>
          </div>
          {issuesExamined.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Issues examined</dt>
              <dd className="mt-1 text-left text-sm text-[var(--color-ink-700)]">{issuesExamined.join("; ")}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4">
          <SourceLink href={order.officialUrl}>Official SEBI source (PDF/HTML)</SourceLink>
        </div>
      </Card>

      {provisionsConsidered.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Provisions considered</h2>
          <p className="mb-3 text-left text-xs text-[var(--color-ink-500)]">
            Every provision this order&apos;s findings actually cite — substantive prohibitions, disclosure and
            governance obligations, and the penalty/power/attribution provisions the order itself invoked. This is
            historical-order research, not a claim that each is a violation.
          </p>
          <ul className="flex flex-wrap gap-2">
            {provisionsConsidered.map(({ summary, provision: p }) => (
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
                      not upheld
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
                <p className="text-left text-[var(--color-ink-900)]">{d.directionOrOutcome}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-500)]">{d.paragraphReference}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Broad scenarios arising from this order</h2>
        <p className="mb-4 text-left text-xs text-[var(--color-ink-500)]">
          Consolidated CFID fact-pattern categories, not one row per underlying research record.
        </p>
        <OrderBroadScenarios findings={findings} />
      </Card>
    </div>
  );
}
