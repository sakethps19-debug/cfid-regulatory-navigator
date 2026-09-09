import { PageHeader } from "@/components/PageHeader";
import { CaseJourneyLandingClient } from "@/components/CaseJourneyLandingClient";
import { getMatters, getOrders } from "@/lib/data";
import { mattersWithAtLeastOneOrder } from "@/lib/caseJourney";

export default async function CaseJourneyLandingPage() {
  const [matters, orders] = await Promise.all([getMatters(), getOrders()]);
  const mattersWithOrders = mattersWithAtLeastOneOrder(matters, orders);

  return (
    <div>
      <PageHeader
        title="Case Journey"
        description="What happened across the different orders/stages in the same matter — grouped strictly by the corpus's own recorded matter identity, never by company name or fuzzy case-title matching."
      />
      <CaseJourneyLandingClient matters={mattersWithOrders} />
    </div>
  );
}
