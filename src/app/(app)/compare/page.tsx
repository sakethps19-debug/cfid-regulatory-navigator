import { redirect } from "next/navigation";

// Legacy "Precedent Comparison" tool retired as an officer-facing product
// (final pre-merge correction pass): the generic pairwise-comparison model
// no longer exists. Its two functions were deliberately superseded and
// their capability now belongs elsewhere -- see the residual-capability
// note in the reconciliation report for where each should be migrated if
// ever revisited:
//   - interim -> final reversals (a finding raised at an earlier stage and
//     not confirmed in the final order): a same-matter evolution concern,
//     belongs in Case Journey.
//   - arbitrary two-finding side-by-side comparison + deterministic diff
//     summary: a cross-matter same-issue concern, belongs in Compare
//     Scenarios.
// Neither was migrated in this pass (no new feature work here) -- this
// route now only exists so an old bookmark lands on its closest current
// equivalent instead of exposing a third, obsolete comparison surface.
export default function ComparePage() {
  redirect("/compare-scenarios");
}
