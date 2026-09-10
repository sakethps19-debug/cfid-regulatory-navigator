import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/adminAuth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Admin-status lookup for NavBar's own display only (hide the link from a
  // non-admin so it never reads as a dead/forbidden destination) -- the
  // actual authorization boundary is enforced server-side in proxy.ts on
  // every request, independent of what NavBar chooses to render here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar isAdmin={isAdmin} />
      <DisclaimerBanner />
      {/* Tiered workspace width, not a flat cap: 1280px through tablet/laptop
          (unchanged from before), widening at xl/2xl/3xl so a normal desktop
          and a large display actually use the extra room instead of leaving
          it blank either side of a fixed 1280px column. Kept in lockstep
          with NavBar's header wrapper below so header and content width
          never diverge. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:max-w-[85rem] 2xl:max-w-[100rem] 3xl:max-w-[130rem]">
        {children}
      </main>
      <footer className="no-print border-t border-[var(--color-border)] bg-[var(--color-paper-raised)] px-4 py-4 text-center text-xs text-[var(--color-ink-500)]">
        CFID Regulatory Navigator, internal research-assistance pilot. Not a determination of any violation.
      </footer>
    </div>
  );
}
