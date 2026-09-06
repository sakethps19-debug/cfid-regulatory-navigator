import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card, SourceLink } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { getLegalTests, getScenarioFindings } from "@/lib/data";
import { FraudTestChecklist } from "./FraudTestChecklist";

const DOCTRINE_ISSUE = "PFUTP 2(1)(c): fraud — inducement/intent test";

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

  return (
    <div>
      <PageHeader
        title="Fraud Doctrine Analyser"
        description={
          'A doctrinal aid for testing a fact pattern against the Supreme Court’s "fraud" test under PFUTP Regulation 2(1)(c) ' +
          "(Reliance Industries Ltd. v. SEBI, 2026 INSC 585) — distinct from the Scenario Analyzer, which matches facts against " +
          "this pilot's precedent findings. This page never matches your facts against precedent automatically; it only helps you " +
          "apply the test yourself and shows how CFID orders in this register have applied it."
        }
      />

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">The test</h2>
        {doctrine ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-900)]">{doctrine.workingPrinciple}</p>
            <div className="mt-3 rounded-sm bg-[var(--color-gold-50)] p-3 text-xs text-[#7a5310] ring-1 border-[#dfc98f]">
              {doctrine.implementationGuardrail}
            </div>
            <p className="mt-3 text-xs text-[var(--color-ink-500)]">{doctrine.paragraphAnchors}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-ink-500)]">Doctrine record not found.</p>
        )}
        <blockquote className="mt-4 whitespace-pre-wrap border-l-2 border-[var(--color-gold-600)] pl-3 text-sm text-[var(--color-ink-700)]">
          {'"175. … We find it apposite to purposively interpret Regulation 2(1)(c). In our considered view, both mens rea and actus reus cannot be made into irrelevant factors for deciding fraud. Therefore, we may outline the following scenarios for a more purposive approach to Regulation 2(1)(c):\n\ni. in situations where injury due to wrongful act is established, i.e, inducement to deal in securities has caused the other person to be adversely affected and allowed the party accused of fraud to gain unlawful profits or avert ordinary losses at the former’s expense, there would be no requirement on the respondent authority to prove deceitful intention. In other words, where injury is impossible to be proved, the requirement of wrongful intention becomes mandatory.\n\nii. Secondly, similarly, in situations where deceitful or mala fide intention to defraud and manipulate the securities market is clear from the blatant misconduct or attending circumstances that cogently establish wrongful intention, then injury would not be required."'}
        </blockquote>
        <p className="mt-2 text-xs text-[var(--color-ink-500)]">
          Reliance Industries Ltd. &amp; Ors. v. SEBI, 2026 INSC 585, para 175 (Civil Appeal No. 4015 of 2020, decided 29 May 2026)
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-[var(--color-ink-900)]">Apply it to your facts</h2>
        <FraudTestChecklist />
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Applied in CFID orders in this register</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          Only orders dated on or after 29 May 2026 could have applied this test — anything earlier relied on the
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
