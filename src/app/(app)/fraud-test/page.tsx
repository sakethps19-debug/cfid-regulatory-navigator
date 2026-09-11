import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { getLegalTests, getScenarioFindings } from "@/lib/data";
import { groupAppliedFindingsByOrder } from "@/lib/fraudDoctrineApplication";
import { FraudTestChecklist } from "./FraudTestChecklist";

const DOCTRINE_ISSUE = "PFUTP 2(1)(c): fraud (inducement/intent test)";

// Post-freeze correction pass (Section B): this list previously held
// ["REL-01", "REL-02", "ZEE-PLEDGE-01", "VCL-01"] with no date or content
// check against the data -- a legal-integrity defect, since two of those
// four findings (ZEE-PLEDGE-01, VCL-01) had never actually been confirmed
// to APPLY the Reliance Industries doctrine in SEBI's own reasoning, only
// tagged under the same broad PFUTP fraud issue.
//
// Audit performed this pass, order by order, against the official SEBI
// document (not DB tags):
//   - Rajesh Exports Limited, Interim Order, 03-Jun-2026 (REL-01, REL-02's
//     shared order): the order's own paras 220-221 quote para 175 of
//     Reliance Industries Ltd. & Ors. v. SEBI, 2026 INSC 585 verbatim and
//     the Whole Time Member expressly tests the finding against it --
//     "The threshold laid down by the Hon'ble Supreme Court in the
//     aforesaid judgement ... has been tested in this interim order before
//     holding Noticees prima facie liable ... The instant case satisfies
//     the threshold". Confirmed APPLIED (category A).
//   - Zee Entertainment Enterprises Ltd., Final Order (pledge matter),
//     31-Jul-2026 (ZEE-PLEDGE-01/02's shared order) and Varanium Cloud
//     Limited, Final Order, 25-Aug-2026 (VCL-01's order): both post-date
//     the 29-May-2026 judgment, so a citation is *possible* on dates
//     alone, but the primary order text could not be retrieved in this
//     environment (official SEBI PDF links did not resolve to fetchable
//     document text; a third-party mirror of the Zee order was also
//     unreachable). Multiple independent secondary reports on each matter's
//     substantive PFUTP findings make no mention of the Reliance doctrine.
//     Absent an actual passage in SEBI's own reasoning discussing/applying
//     it, these do not meet the bar for category A -- removed from this
//     list rather than assumed. If genuine document access becomes
//     available, they should be re-audited on their merits, not
//     reinstated on the strength of the earlier assumption.
//   - Debock Industries Limited (Final Order, 28-Aug-2026) and the Max
//     Financial Services matter, both named in this pass's brief: neither
//     has an existing scenario-finding record in this pilot's corpus tied
//     to this doctrine issue, so neither was ever in this list and neither
//     is added speculatively.
//
// This list is deliberately narrower than what it displaced -- exactly
// the posture the product rule already uses elsewhere ("an unverifiable
// proposition is removed rather than kept with a fabricated or
// merely-assumed grounding").
const DOCTRINE_APPLIED_RECORD_IDS = ["REL-01", "REL-02"];

export default async function FraudTestPage() {
  const [legalTests, findings] = await Promise.all([getLegalTests(), getScenarioFindings()]);
  const doctrine = legalTests.find((lt) => lt.provisionOrIssue === DOCTRINE_ISSUE);
  const appliedFindings = DOCTRINE_APPLIED_RECORD_IDS.map((id) => findings.find((f) => f.recordId === id)).filter(
    (f): f is NonNullable<typeof f> => !!f,
  );
  // One order = one authority card, with its relevant findings nested
  // underneath -- REL-01 and REL-02 are two findings belonging to the SAME
  // order (the Rajesh Exports interim order) and must not read as two
  // separate authorities. See src/lib/fraudDoctrineApplication.ts
  // (independently unit-tested) for the grouping logic.
  const appliedOrders = groupAppliedFindingsByOrder(appliedFindings);
  // Independent-audit correction (P1-3): re-ground the doctrine primarily in
  // the official SEBI Rajesh Exports Limited interim order (03-Jun-2026),
  // which this pilot already holds as a captured, official-source-verified
  // order (see legal_tests.paragraph_anchors: "applied in REL interim paras
  // 219-222") -- rather than presenting the raw Supreme Court judgment
  // citation as the primary, unverified source. Looked up from the same
  // appliedFindings this page already computes, not hardcoded, so it stays
  // correct if the underlying data changes.
  const relFinding = appliedFindings.find((f) => f.recordId.startsWith("REL-"));
  const relOrderId = relFinding?.orderIds[0];

  return (
    <div>
      <PageHeader
        title="Fraud Doctrine Analyser"
        description={
          'A doctrinal aid for testing a fact pattern against the Supreme Court’s "fraud" test under PFUTP Regulation 2(1)(c) ' +
          "(Reliance Industries Ltd. v. SEBI, 2026 INSC 585), distinct from the Scenario Analyzer, which matches facts against " +
          "this pilot's precedent findings. This page never matches your facts against precedent automatically; it only helps you " +
          "apply the test yourself and shows how CFID orders in this register have applied it."
        }
      />

      <div className="mb-6 rounded-sm bg-[var(--color-gold-50)] p-3.5 text-sm text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
        This checklist organises considerations relevant to the cited doctrine. It does not determine whether fraud
        or any violation occurred, and it is entirely independent of the Scenario Analyzer&apos;s precedent matching.
      </div>

      {/* Post-freeze correction pass (Section A): the computed
          satisfied/borderline/not-satisfied read is restored (see
          FraudTestChecklist.tsx and src/lib/fraudDoctrineTest.ts). It was
          suppressed pending independent confirmation that the encoded
          two-limb logic is faithful to para 175's actual holding. That
          confirmation is now available: the quoted text below is grounded
          in the official SEBI Rajesh Exports Limited interim order
          (03-Jun-2026, paras 219-222), which this pilot already treats as a
          verified official source, and independent secondary case-law
          commentary on 2026 INSC 585 para 175 (relied on only to
          corroborate, never cited as authority in this UI) describes the
          same injury-or-intent disjunctive holding the quoted text and the
          checklist logic already reflect. The disclaimer below the quote
          still says, unchanged, that the Supreme Court judgment itself has
          not separately been verified against an official case-law
          repository -- restoring the computed read does not change that.
          See fraudDoctrineTest.ts's own module comment for the retrieval
          history behind this decision. */}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Authority and doctrine</h2>
          {doctrine ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-900)]">{doctrine.workingPrinciple}</p>
              <div className="mt-3 rounded-sm bg-[var(--color-gold-50)] p-3 text-xs text-[var(--status-amber-text)] ring-1 border-[var(--status-amber-ring)]">
                {doctrine.implementationGuardrail}
              </div>
              <p className="mt-3 text-xs text-[var(--color-ink-500)]">{doctrine.paragraphAnchors}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-ink-500)]">Doctrine record not found.</p>
          )}
          <blockquote className="mt-4 whitespace-pre-wrap border-l-2 border-[var(--color-gold-600)] pl-3 text-sm leading-relaxed text-[var(--color-ink-700)]">
            {'"175. … We find it apposite to purposively interpret Regulation 2(1)(c). In our considered view, both mens rea and actus reus cannot be made into irrelevant factors for deciding fraud. Therefore, we may outline the following scenarios for a more purposive approach to Regulation 2(1)(c):\n\ni. in situations where injury due to wrongful act is established, i.e, inducement to deal in securities has caused the other person to be adversely affected and allowed the party accused of fraud to gain unlawful profits or avert ordinary losses at the former’s expense, there would be no requirement on the respondent authority to prove deceitful intention. In other words, where injury is impossible to be proved, the requirement of wrongful intention becomes mandatory.\n\nii. Secondly, similarly, in situations where deceitful or mala fide intention to defraud and manipulate the securities market is clear from the blatant misconduct or attending circumstances that cogently establish wrongful intention, then injury would not be required."'}
          </blockquote>
          <p className="mt-2 text-xs text-[var(--color-ink-500)]">
            As reproduced and applied by the tribunal in the official SEBI Interim Order in the matter of Rajesh
            Exports Limited (03-Jun-2026), paras 219–222{relOrderId && " — see the official order below"}. Originally
            from Reliance Industries Ltd. &amp; Ors. v. SEBI, 2026 INSC 585, para 175 (Civil Appeal No. 4015 of 2020,
            decided 29 May 2026).
          </p>
          {relOrderId && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link href={`/orders/${relOrderId}`} className="text-xs font-medium text-[var(--color-gold-700)] hover:underline">
                View this order in Case Detail →
              </Link>
              <SourceLink href={relFinding!.officialSourceUrl}>Official SEBI order (PDF/HTML)</SourceLink>
            </div>
          )}
          <p className="mt-2 text-xs italic text-[var(--color-ink-500)]">
            The official SEBI order&apos;s own recitation of this test (grounding the passage above) is the pilot&apos;s
            verified source. The underlying Supreme Court judgment text has not separately been independently
            verified by this pilot against an official case-law repository — confirm it there before relying on the
            exact wording.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Apply it to your facts</h2>
          <FraudTestChecklist />
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Orders applying this doctrine</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          Only an order dated on or after 29 May 2026, whose own text actually discusses and applies the Reliance v.
          SEBI two-limb test in SEBI&apos;s own reasoning, is listed here — not merely an order that could have
          applied it on dates alone, and not an order where the test is mentioned only because a noticee cited it in
          submissions. One card per order; every relevant finding from that order is nested underneath it.
        </p>
        {appliedOrders.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {appliedOrders.map((o) => (
              <li key={o.orderId} className="rounded-md border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/orders/${o.orderId}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                    {o.caseName}
                  </Link>
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
        ) : (
          <p className="mt-3 text-sm italic text-[var(--color-ink-300)]">No order in this register is currently confirmed to apply this doctrine.</p>
        )}
        <p className="mt-3 text-xs italic text-[var(--color-ink-500)]">
          This list reflects only orders this pilot could independently confirm actually discuss and apply the
          doctrine, from the specific orders reviewed on this pass — it is not a claim that every CFID order dated on
          or after 29 May 2026 has been checked.
        </p>
      </Card>
    </div>
  );
}
