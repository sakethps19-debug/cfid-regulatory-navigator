import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "./env";
import type { Database } from "@/types/database";

/** Browser-side Supabase client. Safe to use in Client Components — the anon
 * key grants no access beyond what Row-Level Security policies allow. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
