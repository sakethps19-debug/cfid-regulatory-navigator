import { PageHeader } from "@/components/PageHeader";
import { AnalyzerLanding } from "@/components/analyzer/AnalyzerLanding";
import { getProvisions } from "@/lib/data";

export default async function AnalyzerPage() {
  const provisions = await getProvisions();
  return (
    <div>
      <PageHeader
        title="Scenario Analyzer"
        description="Start from a recognised CFID investigation theme to see the substantive regulatory provisions an officer would typically examine, or analyze your own scenario against this pilot's indexed CFID orders. Neither path concludes that a violation has occurred."
      />
      <AnalyzerLanding provisions={provisions} />
    </div>
  );
}
