import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "./env";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase session cookie for the current request/response
 * pair and returns both the Supabase client and the (possibly updated)
 * response. Must be called from the top-level middleware — see
 * https://supabase.com/docs/guides/auth/server-side/nextjs for why the
 * cookie handling has to happen exactly this way (both on the request, so
 * downstream reads see the refreshed session, and on the response, so the
 * browser receives it).
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  return { supabase, getResponse: () => response };
}
