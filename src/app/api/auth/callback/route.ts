import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges a Supabase email-confirmation / magic-link code for a session,
 * then sends the user on to /login (the middleware takes it from there —
 * redirecting to /dashboard if the email is authorised, or back to /login
 * with an explanation if it is not). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
