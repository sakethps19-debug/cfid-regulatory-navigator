"use client";

import { useState } from "react";
import { FixedScenarioAnalyzer } from "@/components/analyzer/FixedScenarioAnalyzer";
import { ScenarioAnalyzerClient } from "@/components/analyzer/ScenarioAnalyzerClient";
import type { LegalProvision, Order, ScenarioFinding } from "@/types/domain";

/** Landing switcher for the redesigned Scenario Analyzer. Part A (the fixed
 * curated scenarios) is the default, front-door experience; Part B (the
 * existing fact-specific free-text Analyzer) is reached only through the
 * explicit "Analyze my own scenario" path, never shown first. Nothing about
 * Part B itself is changed by this redesign — ScenarioAnalyzerClient is
 * rendered exactly as before (it fetches its own data client-side via
 * /api/analyze). findings/orders are new props (Part 6, "Relevant CFID
 * orders and scenarios") passed through to Part A only. */
export function AnalyzerLanding({ provisions, findings, orders }: { provisions: LegalProvision[]; findings: ScenarioFinding[]; orders: Order[] }) {
  const [mode, setMode] = useState<"fixed" | "freeform">("fixed");

  if (mode === "freeform") {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setMode("fixed")}
          className="self-start text-sm font-medium text-[var(--color-gold-700)] underline decoration-[var(--color-gold-100)] underline-offset-2 hover:text-[var(--color-gold-800)]"
        >
          ← Back to scenario categories
        </button>
        <ScenarioAnalyzerClient />
      </div>
    );
  }

  return <FixedScenarioAnalyzer provisions={provisions} findings={findings} orders={orders} onSwitchToFreeForm={() => setMode("freeform")} />;
}
