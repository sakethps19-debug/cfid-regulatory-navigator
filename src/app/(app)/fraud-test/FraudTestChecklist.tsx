"use client";

import { useState } from "react";
import type { FactorState } from "@/lib/fraudDoctrineTest";

interface Factor {
  id: string;
  label: string;
  source: string;
}

// Limb (i): injury/inducement. Per the quoted text of Reliance v. SEBI
// para 175(i) (quoted in full on the parent page -- see that page's own
// official-source-verification-pending notice; this transcription has NOT
// been confirmed against the primary judgment), the test is CONJUNCTIVE,
// not a menu of independently sufficient factors: "injury due to wrongful
// act is established, i.e., inducement to deal in securities has caused the
// other person to be adversely affected AND allowed the party accused of
// fraud to gain unlawful profits or avert ordinary losses" -- dealing alone,
// without established injury/wrongful gain/avoided loss, does not complete
// the limb. l1-dealt and l1-manipulation-established each supply only the
// inducement/dealing half of that conjunction (the latter via Rakhi
// Trading's presumption of inducement once manipulation is cogently
// established) -- neither, on its own, is shown by that quoted text to also
// supply the injury/gain half, so neither is treated as independently
// sufficient here. l1-injury's own label already states the complete
// conjunction (dealing THAT CAUSED injury/gain), so it alone carries the
// citation. The decision logic itself lives in src/lib/fraudDoctrineTest.ts
// (independently unit-tested); this file only renders it.
const LIMB_1_FACTORS: Factor[] = [
  {
    id: "l1-dealt",
    label:
      "Investors or the counterparty are shown to have actually dealt in securities (bought/sold/subscribed) as a result of the conduct (inducement component only -- see note below)",
    source: "Kanhaiyalal Baldevbhai Patel, paras 30, 56",
  },
  {
    id: "l1-injury",
    label: "That dealing caused established injury (loss to investors) or wrongful gain / avoided loss to the person accused",
    source: "Reliance v. SEBI para 175(i)",
  },
  {
    id: "l1-manipulation-established",
    label:
      "The factum of manipulation itself is cogently and sufficiently established from the facts (non-genuine transactions, artificial price/volume) -- presumes inducement only, not injury/gain (inducement component only -- see note below)",
    source: "SEBI v. Rakhi Trading (P) Ltd., (2018) 13 SCC 753, para 78, inducement then presumed, no separate proof required",
  },
];

// Limb (ii): deceitful/mala fide intent clear from blatant misconduct or
// attending circumstances. These are the factors the Supreme Court itself
// drew from Ketan Parekh and Kishore R. Ajmera for gauging intent
// circumstantially, since direct evidence of intent is rarely available.
const LIMB_2_FACTORS: Factor[] = [
  {
    id: "l2-volume",
    label: "Volume of the trade / transactions effected is disproportionate to any legitimate explanation",
    source: "SEBI v. Kishore R. Ajmera, (2016) 6 SCC 368, para 31",
  },
  {
    id: "l2-persistence",
    label: "Persistence in the conduct over a period of time, or repeated across the same scrip/entity",
    source: "Kishore R. Ajmera para 31",
  },
  {
    id: "l2-proximity",
    label: "Close proximity in time between related orders/transactions (e.g. same-day buy and sell, back-to-back transfers)",
    source: "Kishore R. Ajmera para 31; Ketan Parekh para 20",
  },
  {
    id: "l2-circular",
    label: "Circular trading or no genuine change of beneficial ownership",
    source: "Ketan Parekh v. SEBI, 2006 SCC OnLine SAT 221, para 20",
  },
  {
    id: "l2-blatant",
    label: "Blatant misconduct clear from the attending circumstances, e.g. fabricated documents, deliberately false certifications, concealment inconsistent with any innocent explanation",
    source: "Reliance v. SEBI para 175(ii)",
  },
  {
    id: "l2-noeconomicsense",
    label: "The conduct makes no commercial sense except as an attempt to manipulate the market or defeat its mechanism",
    source: "Ketan Parekh para 20",
  },
];

// A factor is never simply "checked" or "unchecked" — that binary reads
// silence as "No", which is exactly the misreading this pilot's own
// guardrails forbid elsewhere. Five states let an officer distinguish a
// fact that is genuinely present in the record from one that is merely
// unclear, or one still awaiting verification or further evidence, rather
// than collapsing all of those into a single unchecked box.
const FACTOR_STATE_OPTIONS: { value: FactorState; label: string }[] = [
  { value: "not-stated", label: "Not stated" },
  { value: "present", label: "Present" },
  { value: "unclear", label: "Unclear" },
  { value: "requires-verification", label: "Requires verification" },
  { value: "additional-evidence-required", label: "Additional evidence required" },
];

const FACTOR_STATE_STYLES: Record<FactorState, string> = {
  "not-stated": "bg-white text-[var(--color-ink-500)] ring-[var(--color-border)]",
  present: "bg-[var(--status-green-bg)] text-[var(--status-green-text)] ring-[var(--status-green-ring)]",
  unclear: "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  "requires-verification": "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
  "additional-evidence-required": "bg-[var(--status-amber-bg)] text-[var(--status-amber-text)] ring-[var(--status-amber-ring)]",
};

function FactorList({
  factors,
  states,
  onChange,
}: {
  factors: Factor[];
  states: Map<string, FactorState>;
  onChange: (id: string, state: FactorState) => void;
}) {
  return (
    <ul className="mt-3 space-y-2">
      {factors.map((f) => {
        const state = states.get(f.id) ?? "not-stated";
        return (
          <li key={f.id} className="rounded-sm p-1.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-sm text-[var(--color-ink-900)]">
                {f.label}
                <span className="ml-1.5 text-xs text-[var(--color-ink-500)]">({f.source})</span>
              </span>
              <select
                aria-label={`Status for: ${f.label}`}
                value={state}
                onChange={(e) => onChange(f.id, e.target.value as FactorState)}
                className={`shrink-0 rounded-sm px-2 py-1 text-xs font-medium ring-1 ring-inset ${FACTOR_STATE_STYLES[state]}`}
              >
                {FACTOR_STATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function FraudTestChecklist() {
  const [states, setStates] = useState<Map<string, FactorState>>(new Map());

  function setFactorState(id: string, state: FactorState) {
    setStates((prev) => {
      const next = new Map(prev);
      if (state === "not-stated") next.delete(id);
      else next.set(id, state);
      return next;
    });
  }

  return (
    <div>
      <p className="text-xs text-[var(--color-ink-500)]">
        Set the status of each fact below against your scenario. This checklist mirrors the specific factors the
        Supreme Court and the case law it cites used to decide the two limbs; it does not interpret free text, match
        against precedent, or call any external service. A factor left as &quot;Not stated&quot; is never read as
        meaning it is actually absent, only that its status has not been set. Nothing is saved.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Limb (i): Injury from inducement</h3>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
            This limb requires the established-injury/wrongful-gain/avoided-loss factor. The other two factors
            establish only the dealing/inducement component and do not complete the limb on their own.
          </p>
          <FactorList factors={LIMB_1_FACTORS} states={states} onChange={setFactorState} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Limb (ii): Intent from attending circumstances</h3>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
            No single factor is automatically decisive; the court draws an inference from their cumulative effect.
          </p>
          <FactorList factors={LIMB_2_FACTORS} states={states} onChange={setFactorState} />
        </div>
      </div>

      {/* Final pre-merge correction: this checklist no longer computes or
          displays a satisfied/borderline/not-satisfied read from the
          selections above. That computation (evaluateFraudDoctrineTest, in
          src/lib/fraudDoctrineTest.ts) is retained in code, independently
          tested, and ready to be wired back in once the governing para 175
          text is confirmed against an official source -- it is simply not
          called from this officer-facing view until then. */}
      <div className="mt-5 rounded-sm bg-[var(--color-neutral-50)] p-3 text-sm ring-1 ring-inset ring-[var(--color-border)]">
        <p className="font-semibold text-[var(--color-ink-900)]">Official-source verification pending</p>
        <p className="mt-1 text-[var(--color-ink-700)]">
          The governing judicial text used for this doctrinal checklist has not yet been independently verified
          against the official judgment. Automated doctrinal assessment is therefore temporarily unavailable.
        </p>
      </div>

      {states.size > 0 && (
        <button
          type="button"
          onClick={() => setStates(new Map())}
          className="mt-3 rounded-sm border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
        >
          Clear selections
        </button>
      )}
    </div>
  );
}
