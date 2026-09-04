import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/security/rateLimit";

const PUBLIC_PATHS = new Set(["/login"]);
const PUBLIC_API_PATHS = new Set(["/api/auth/callback"]);

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Content-Security-Policy",
    [
      // 'unsafe-inline' on script-src is required because Next.js streams
      // its own hydration payload via inline <script> tags on every page.
      // The stricter alternative (a per-request nonce via Proxy) forces
      // every page to render dynamically, losing static optimization for
      // this whole app — not worth it for a single-user pilot that never
      // renders untrusted HTML (no dangerouslySetInnerHTML anywhere, all
      // scenario text is rendered as React text, which is auto-escaped).
      // script-src 'self' still blocks loading any externally-hosted or
      // attacker-injected <script src="..."> — the main CSP protection we
      // want here.
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/assets")
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Sign-in itself now goes directly from the browser to Supabase Auth (which
  // has its own rate limiting), not through a route on this server, so a
  // single general-purpose limiter covers everything this middleware sees.
  const clientKey = clientKeyFromHeaders(request.headers);
  const rateLimit = checkRateLimit(`general:${clientKey}`, 120, 60); // 120 requests / min per client

  if (!rateLimit.allowed) {
    const response = new NextResponse("Too many requests. Please slow down and try again shortly.", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    });
    return applySecurityHeaders(response);
  }

  const isPublicApi = PUBLIC_API_PATHS.has(pathname);
  if (isPublicApi) {
    return applySecurityHeaders(NextResponse.next());
  }

  const { supabase, getResponse } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPage = PUBLIC_PATHS.has(pathname);

  const denyAuth = () => {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(NextResponse.json({ error: "Not authenticated." }, { status: 401 }));
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  };

  if (!user) {
    if (isPublicPage) return applySecurityHeaders(getResponse());
    return denyAuth();
  }

  // Defense in depth: every table's RLS policy already requires
  // is_allowed_user(), so an unlisted email can read nothing regardless —
  // but we also check it here so an authenticated-but-unlisted user is
  // bounced back to /login with a clear reason instead of seeing empty pages.
  const { data: allowed } = await supabase.rpc("is_allowed_user");
  if (!allowed) {
    await supabase.auth.signOut();
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "This email is not authorised for this pilot." }, { status: 403 })
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "not_allowed");
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (isPublicPage) {
    // Already signed in and allowed — no reason to show the login page again.
    return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return applySecurityHeaders(getResponse());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files handled by Next.js
     * internals; those are excluded above too but keeping the matcher tight
     * reduces middleware invocations.
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
