import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/adminAuth";

/** Defense in depth for the /admin route tree (independent-audit
 * correction, P0-1): proxy.ts middleware already blocks a non-admin before
 * any admin page renders, but this layout re-checks server-side too, the
 * same "belt and suspenders" pattern this app already uses for
 * is_allowed_user() (enforced by both middleware and every table's RLS
 * policy) -- so a future change to the middleware matcher can never quietly
 * reopen /admin to every research user. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    redirect("/dashboard?error=admin_required");
  }
  return <>{children}</>;
}
