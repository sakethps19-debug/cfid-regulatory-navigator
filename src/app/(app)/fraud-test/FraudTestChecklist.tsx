"use client";

import { useState } from "react";
import type { FactorState } from "@/lib/fraudDoctrineTest";

interface Factor {
  id: string;
  label: string;
  source: string;
}

// Independent-audit correction (P1-3): every factor previously attributed
// to Kanhaiyalal Baldevbhai Patel, SEBI v. Rakhi Trading, SEBI v. Kishore R.
// Ajmera, and Ketan Parekh v. SEBI has been REMOVED from this checklist.
// Those citations could not be traced to any official SEBI-hosted
// source/order this pilot actually captures -- per the product rule ("no
// third-party case-law database, no fabricated doctrinal synthesis"), an
// unverifiable proposition is removed rather than kept with a fabricated or
// merely-assumed grounding. What remains is exactly the two limbs as
// directly quoted from para 175 of Reliance v. SEBI, which is itself now
// grounded in the official SEBI Rajesh Exports Limited interim order (see
// the parent page's "Authority and doctrine" card) -- nothing here states a
// proposition this pilot cannot trace to a captured official source. If any
// of the removed case citations can later be traced to an official
// SEBI-hosted order this pilot holds, they may be reinstated with that
// grounding; until then this checklist stays narrower rather than broader
// than what can be shown.
//
// Limb (i): injury/inducement -- the test is CONJUNCTIVE, not a menu of
// independently sufficient factors: "injury due to wrongful act is
// established, i.e., inducement to deal in securities has caused the other
// person to be adversely affected AND allowed the party accused of fraud to
// gain unlawful profits or avert ordinary losses". The decision logic
// itself lives in src/lib/fraudDoctrineTest.ts (independently unit-tested);
// this file only renders it.
const LIMB_1_FACTORS: Factor[] = [
  {
    id: "l1-injury",
    label: "Dealing in securities caused established injury (loss to investors) or wrongful gain / avoided loss to the person accused",
    source: "Reliance v. SEBI para 175(i), as reproduced in the official SEBI Rajesh Exports Limited interim order",
  },
];

// Limb (ii): deceitful/mala fide intent clear from blatant misconduct or
// attending circumstances, as directly stated in the quoted text -- no
// third-party circumstantial-factor case law is attributed here (see the
// removal note above).
const LIMB_2_FACTORS: Factor[] = [
  {
    id: "l2-blatant",
    label: "Blatant misconduct clear from the attending circumstances, e.g. fabricated documents, deliberately false certifications, concealment inconsistent with any innocent explanation",
    source: "Reliance v. SEBI para 175(ii), as reproduced in the official SEBI Rajesh Exports Limited interim order",
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
        Set the status of each fact below against your scenario. This checklist mirrors exactly the two limbs stated
        in the quoted text of para 175 (see the parent page); it does not interpret free text, match against
        precedent, or call any external service. A factor left as &quot;Not stated&quot; is never read as meaning it
        is actually absent, only that its status has not been set. Nothing is saved.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Limb (i): Injury from inducement</h3>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
            Dealing in securities that caused established injury or wrongful gain, exactly as stated in the quoted
            text — no wrongful-intent element required for this limb.
          </p>
          <FactorList factors={LIMB_1_FACTORS} states={states} onChange={setFactorState} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Limb (ii): Intent from attending circumstances</h3>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
            Blatant misconduct or attending circumstances that cogently establish wrongful intent, exactly as stated
            in the quoted text — no separate proof of injury required for this limb.
          </p>
          <FactorList factors={LIMB_2_FACTORS} states={states} onChange={setFactorState} />
        </div>
      </div>

      {/* Independent-audit correction (P1-3): the para 175 text itself is
          now grounded in the official SEBI Rajesh Exports order (see the
          parent page's "Authority and doctrine" card) rather than presented
          as unverified. This checklist still never computes or displays a
          satisfied/borderline/not-satisfied read from the selections above
          -- that computation (evaluateFraudDoctrineTest, in
          src/lib/fraudDoctrineTest.ts) is retained in code, independently
          tested, and ready to be wired back in once the underlying Supreme
          Court judgment is separately confirmed against an official
          case-law repository -- it is simply not called from this
          officer-facing view until then. */}
      <div className="mt-5 rounded-sm bg-[var(--color-neutral-50)] p-3 text-sm ring-1 ring-inset ring-[var(--color-border)]">
        <p className="font-semibold text-[var(--color-ink-900)]">Automated doctrinal assessment unavailable</p>
        <p className="mt-1 text-[var(--color-ink-700)]">
          This checklist never computes a satisfied/borderline/not-satisfied read from your selections. The
          underlying Supreme Court judgment text has not separately been verified by this pilot against an official
          case-law repository.
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
