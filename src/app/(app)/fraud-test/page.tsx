import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { getLegalTests, getScenarioFindings } from "@/lib/data";
import { FraudTestChecklist } from "./FraudTestChecklist";

const DOCTRINE_ISSUE = "PFUTP 2(1)(c): fraud (inducement/intent test)";

// Findings that have actually applied this test in this pilot's corpus — not
// every finding citing PFUTP, only ones that engage the Reliance v. SEBI
// two-limb reasoning itself.
const APPLIED_IN_RECORD_IDS = ["REL-01", "REL-02", "ZEE-PLEDGE-01", "VCL-01"];

export default async function FraudTestPage() {
  const [legalTests, findings] = await Promise.all([getLegalTests(), getScenarioFindings()]);
  const doctrine = legalTests.find((lt) => lt.provisionOrIssue === DOCTRINE_ISSUE);
  const appliedFindings = APPLIED_IN_RECORD_IDS.map((id) => findings.find((f) => f.recordId === id)).filter(
    (f): f is NonNullable<typeof f> => !!f,
  );
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

      {/* Independent-audit correction (P1-3): the two-limb test text itself
          is now grounded in the official SEBI Rajesh Exports order this
          pilot already holds (see the citation and source link on the
          "Authority and doctrine" card below) -- it is no longer presented
          as unverified. What remains unavailable is AUTOMATED doctrinal
          assessment (a computed satisfied/borderline/not-satisfied read),
          which stays off until the underlying Supreme Court judgment text
          is separately verified against an official case-law repository --
          a narrower, more accurate claim than the previous blanket notice.
          See the module doc comment at the top of
          src/lib/fraudDoctrineTest.ts and FraudTestChecklist.tsx, which
          still does not compute or display that read. */}
      <div className="mb-6 rounded-sm bg-[var(--color-neutral-50)] p-3.5 text-sm ring-1 border-[var(--color-border)]">
        <p className="font-semibold text-[var(--color-ink-900)]">Automated doctrinal assessment unavailable</p>
        <p className="mt-1 text-[var(--color-ink-700)]">
          This tool never computes a satisfied/borderline/not-satisfied read from your selections — the material
          below is reference only, to apply yourself. The two-limb test text is grounded in the official SEBI order
          cited alongside it; the underlying Supreme Court judgment itself has not separately been verified by this
          pilot against an official case-law repository.
        </p>
      </div>

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
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Applied in CFID orders in this register</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          Only orders dated on or after 29 May 2026 could have applied this test; anything earlier relied on the
          pre-Reliance case law (Kanhaiyalal Baldevbhai Patel, Ketan Parekh, Kishore Ajmera, Rakhi Trading) that the
          judgment reconciles.
        </p>
        <ul className="mt-3 space-y-3">
          {appliedFindings.map((f) => (
            <li key={f.recordId} className="rounded-md border border-[var(--color-border)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={f.findingStatus} />
                {f.orderIds[0] ? (
                  <Link href={`/orders/${f.orderIds[0]}`} className="font-medium text-[var(--color-gold-700)] hover:underline">
                    {f.caseName}
                  </Link>
                ) : (
                  <span className="font-medium text-[var(--color-ink-900)]">{f.caseName}</span>
                )}
                <span className="text-xs text-[var(--color-ink-500)]">{f.recordId}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-700)]">{f.scenarioTitle}</p>
              <div className="mt-1">
                <SourceLink href={f.officialSourceUrl} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
