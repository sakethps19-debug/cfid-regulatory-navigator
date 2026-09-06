"use client";

import { useMemo, useState } from "react";

interface Factor {
  id: string;
  label: string;
  source: string;
}

// Limb (i): injury/inducement. Any ONE of these being present is enough on
// its own — Rakhi Trading held that once manipulation itself is cogently
// established, inducement is presumed and need not be separately proved.
const LIMB_1_FACTORS: Factor[] = [
  {
    id: "l1-dealt",
    label: "Investors or the counterparty are shown to have actually dealt in securities (bought/sold/subscribed) as a result of the conduct",
    source: "Kanhaiyalal Baldevbhai Patel, paras 30, 56",
  },
  {
    id: "l1-injury",
    label: "That dealing caused established injury (loss to investors) or wrongful gain / avoided loss to the person accused",
    source: "Reliance v. SEBI para 175(i)",
  },
  {
    id: "l1-manipulation-established",
    label: "The factum of manipulation itself is cogently and sufficiently established from the facts (non-genuine transactions, artificial price/volume)",
    source: "SEBI v. Rakhi Trading (P) Ltd., (2018) 13 SCC 753, para 78 — inducement then presumed, no separate proof required",
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
    label: "Blatant misconduct clear from the attending circumstances — e.g. fabricated documents, deliberately false certifications, concealment inconsistent with any innocent explanation",
    source: "Reliance v. SEBI para 175(ii)",
  },
  {
    id: "l2-noeconomicsense",
    label: "The conduct makes no commercial sense except as an attempt to manipulate the market or defeat its mechanism",
    source: "Ketan Parekh para 20",
  },
];

function FactorList({ factors, checked, onToggle }: { factors: Factor[]; checked: Set<string>; onToggle: (id: string) => void }) {
  return (
    <ul className="mt-3 space-y-2">
      {factors.map((f) => (
        <li key={f.id}>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-sm p-1.5 hover:bg-[var(--color-gold-50)]">
            <input
              type="checkbox"
              checked={checked.has(f.id)}
              onChange={() => onToggle(f.id)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-gold-700)]"
            />
            <span className="text-sm text-[var(--color-ink-900)]">
              {f.label}
              <span className="ml-1.5 text-xs text-[var(--color-ink-500)]">({f.source})</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function FraudTestChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const limb1Count = LIMB_1_FACTORS.filter((f) => checked.has(f.id)).length;
  const limb2Count = LIMB_2_FACTORS.filter((f) => checked.has(f.id)).length;

  const result = useMemo(() => {
    const limb1Satisfied = limb1Count > 0;
    const limb2Satisfied = limb2Count > 0;
    if (limb1Satisfied && limb2Satisfied) {
      return {
        tone: "satisfied" as const,
        text: "Both limbs have at least one selection — on these selections the fraud test may be satisfied without needing to fall back on the other limb.",
      };
    }
    if (limb1Satisfied) {
      return {
        tone: "satisfied" as const,
        text: "Limb (i) — injury/inducement — has a selection. Per Reliance v. SEBI para 175(i), that alone is enough; deceitful intent does not additionally need to be proved.",
      };
    }
    if (limb2Satisfied) {
      return {
        tone: limb2Count >= 2 ? ("satisfied" as const) : ("borderline" as const),
        text:
          limb2Count >= 2
            ? "Limb (ii) — intent from attending circumstances — has multiple selections. Per Reliance v. SEBI para 175(ii), cogent circumstantial intent alone is enough; injury does not additionally need to be proved."
            : "Only one limb (ii) factor is selected. The Supreme Court treated intent as something to be inferred from the cumulative effect of several factors (Ketan Parekh para 20) — a single factor alone may be a weak signal.",
      };
    }
    return {
      tone: "not-satisfied" as const,
      text: "Neither limb has a selection. Per Reliance v. SEBI, manipulation, cornering, or an accounting irregularity alone — without established injury/inducement or cogent evidence of intent — does not by itself establish fraud under PFUTP Regulation 2(1)(c).",
    };
  }, [limb1Count, limb2Count]);

  const toneClasses = {
    satisfied: "bg-[#e6ede3] text-[#204a2e] ring-[#a9c2a0]",
    borderline: "bg-[#f5ecd9] text-[#7a5310] ring-[#dfc98f]",
    "not-satisfied": "bg-[#f1e3df] text-[#7a2a1f] ring-[#dcaa9a]",
  }[result.tone];

  return (
    <div>
      <p className="text-xs text-[var(--color-ink-500)]">
        Tick whichever of the facts below are actually present in your scenario. This checklist mirrors the specific
        factors the Supreme Court and the case law it cites used to decide the two limbs — it does not interpret free
        text, match against precedent, or call any external service. Nothing is saved.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Limb (i) — Injury from inducement</h3>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">Any one of these, on its own, is sufficient for this limb.</p>
          <FactorList factors={LIMB_1_FACTORS} checked={checked} onToggle={toggle} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Limb (ii) — Intent from attending circumstances</h3>
          <p className="mt-1 text-xs text-[var(--color-ink-500)]">
            No single factor is automatically decisive — the court draws an inference from their cumulative effect.
          </p>
          <FactorList factors={LIMB_2_FACTORS} checked={checked} onToggle={toggle} />
        </div>
      </div>

      <div className={`mt-5 rounded-sm p-3 text-sm ring-1 ring-inset ${toneClasses}`}>
        <p className="font-semibold">{result.text}</p>
        <p className="mt-1.5 text-xs opacity-90">
          This is a prima facie doctrinal read of your own selections only — not a finding, not a match against this
          pilot&apos;s precedents, and not a substitute for a CFID officer&apos;s own legal judgment.
        </p>
      </div>

      {checked.size > 0 && (
        <button
          type="button"
          onClick={() => setChecked(new Set())}
          className="mt-3 rounded-sm border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-neutral-50)]"
        >
          Clear selections
        </button>
      )}
    </div>
  );
}
