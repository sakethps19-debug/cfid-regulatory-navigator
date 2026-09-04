import { PageHeader } from "@/components/PageHeader";
import { ScenarioAnalyzerClient } from "@/components/analyzer/ScenarioAnalyzerClient";

export default function AnalyzerPage() {
  return (
    <div>
      <PageHeader
        title="Scenario Analyzer"
        description="Describe a factual scenario to see potentially relevant SEBI Act sections, regulations and other provisions, matched against this pilot's analysed CFID orders. This tool identifies prima facie similarity only — it does not conclude that a violation has occurred."
      />
      <ScenarioAnalyzerClient />
    </div>
  );
}
