import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { getLegalTests, getOrders, getScenarioFindings } from "@/lib/data";
import { groupAppliedFindingsByOrder } from "@/lib/fraudDoctrineApplication";
import { FraudTestChecklist } from "./FraudTestChecklist";

const DOCTRINE_ISSUE = "PFUTP 2(1)(c): fraud (inducement/intent test)";

// SPARC final surgical correction: this list is now grounded in the
// completed post-deployment official-source audit, which obtained and
// read the actual SEBI order PDF for every post-29-May-2026 CFID order in
// the corpus (not DB tags, not secondary reports) and classified each one
// against the Reliance Industries Ltd. & Ors. v. SEBI, 2026 INSC 585
// judgment on that basis alone. Seven orders were confirmed as SEBI
// itself applying/adopting the para 175 two-limb test in its own
// reasoning (category A) -- including two the prior pass had wrongly
// excluded for "unreachable primary text" (Zee, Varanium) and two it
// wrongly believed had no linked scenario-finding record at all (Debock,
// Max Financial Services):
//   - Rajesh Exports Limited, Interim Order, 03-Jun-2026 (REL-01, REL-02):
//     paras 219-222, SEBI's own reasoning, applied.
//   - Hexa Tradex Limited, Final Order, 24-Jul-2026 (HEXA-01): paras
//     85-87, 111-113, SEBI's own reasoning, applied -- NEGATIVE/exonerating
//     (SCN disposed without penalty; do not read "applied" as "contravention
//     established").
//   - Zee Entertainment Enterprises Ltd., Final Order (pledge matter),
//     31-Jul-2026 (ZEE-PLEDGE-01, ZEE-PLEDGE-02): Noticee No. 3 cites the
//     judgment at para 234 (submission only, standing alone), but SEBI's
//     own reasoning at paras 235-240 independently applies the same
//     two-limb framework to decide the issue -- an "applied via rebuttal"
//     pattern that crosses from noticee-submission-only into category A.
//   - Max Financial Services Limited, Final Order, 24-Aug-2026 (MFS-01):
//     paras 149-158, SEBI's own reasoning, applied -- NEGATIVE/exonerating
//     (fraud held not established).
//   - Varanium Cloud Limited, Final Order, 25-Aug-2026 (VCL-01, VCL-02,
//     VCL-03): paras 109-111, SEBI's own reasoning, applied.
//   - Debock Industries Limited, Final Order, 28-Aug-2026 (DBK-01): paras
//     66-68, SEBI's own reasoning, applied.
//   - Trafiksol ITS Technologies Ltd., Final Order, 28-Aug-2026 (TRF-01):
//     paras 96-97, SEBI's own reasoning, applied.
//
// Nalwa Sons Investments Limited (Final Order, 24-Jul-2026) is
// deliberately NOT included: its own order text does not independently
// reproduce/apply the doctrine -- it incorporates the Hexa order's
// findings by reference ("mutatis mutandis... shall also form part of
// this order"). That is legally relevant but materially different from
// the seven orders above, which each apply the test in their own text;
// resolving whether incorporation-by-reference itself qualifies is left
// for a dedicated pass, not decided here by default inclusion.
//
// Suzlon Energy Limited, Nirman Agri Genetics Limited, Bharat Global
// Developers Limited, and Tarapur Transformers Limited were confirmed to
// contain no discussion of the doctrine at all (full-text searched,
// including generic "Supreme Court" mentions, not just exact-phrase
// matches) and remain excluded.
//
// A temporal safety guard (see DOCTRINE_JUDGMENT_DATE in
// fraudDoctrineApplication.ts) independently rejects any group whose own
// order predates the judgment even if a finding id is added here by
// mistake in a future pass -- this curated list remains the sole
// inclusion authority; the guard is a defensive backstop, not a discovery
// mechanism.
const DOCTRINE_APPLIED_RECORD_IDS = [
  "REL-01",
  "REL-02",
  "HEXA-01",
  "ZEE-PLEDGE-01",
  "ZEE-PLEDGE-02",
  "MFS-01",
  "VCL-01",
  "VCL-02",
  "VCL-03",
  "DBK-01",
  "TRF-01",
];

export default async function FraudTestPage() {
  const [legalTests, findings, orders] = await Promise.all([getLegalTests(), getScenarioFindings(), getOrders()]);
  const doctrine = legalTests.find((lt) => lt.provisionOrIssue === DOCTRINE_ISSUE);
  const appliedFindings = DOCTRINE_APPLIED_RECORD_IDS.map((id) => findings.find((f) => f.recordId === id)).filter(
    (f): f is NonNullable<typeof f> => !!f,
  );
  // One order = one authority card, with its relevant findings nested
  // underneath -- REL-01 and REL-02 (and similarly Zee's two findings,
  // Varanium's three) belong to the SAME order and must not read as
  // separate authorities. See src/lib/fraudDoctrineApplication.ts
  // (independently unit-tested) for the grouping logic and the temporal
  // safety guard applied alongside it.
  const orderDateById = new Map(orders.map((o) => [o.id, o.orderDate]));
  const appliedOrders = groupAppliedFindingsByOrder(appliedFindings, orderDateById);
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
          This list reflects a completed audit of every CFID order in this register dated on or after 29 May 2026,
          each checked against its own official SEBI order text. An order applying the doctrine to conclude a
          contravention was NOT established is listed here on the same footing as one concluding it was — see each
          finding&apos;s own status above, which is never itself the claim &quot;the doctrine was applied.&quot;
        </p>
      </Card>
    </div>
  );
}
