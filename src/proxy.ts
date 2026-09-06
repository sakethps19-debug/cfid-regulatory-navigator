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
      // Supabase Auth/PostgREST/Realtime calls go directly from the browser
      // to this specific Supabase project — scoped by exact origin, never a
      // wildcard, so no other host can be reached even if injected.
      "connect-src 'self' https://aytcrvaagqxyetqckbvb.supabase.co wss://aytcrvaagqxyetqckbvb.supabase.co",
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
  // has its own rate limiting), not through a route on this server. The
  // general limiter below is keyed by authenticated user id where one is
  // available (looked up further down) rather than client IP: many officers
  // sharing one office network share one public IP, and an IP-keyed limit
  // sized for a single pilot user would let one officer's normal browsing
  // exhaust the whole office's shared budget. Only pre-auth traffic (the
  // login page itself, the public callback route) has no user id yet and
  // falls back to IP-keying, which is fine since Supabase Auth's own
  // rate limiting is the real defence for the sign-in flow itself.
  const clientKey = clientKeyFromHeaders(request.headers);

  const isPublicApi = PUBLIC_API_PATHS.has(pathname);
  if (isPublicApi) {
    const rateLimit = checkRateLimit(`general:ip:${clientKey}`, 120, 60);
    if (!rateLimit.allowed) {
      const response = new NextResponse("Too many requests. Please slow down and try again shortly.", {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
      return applySecurityHeaders(response);
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // Everything from here on touches the Supabase client, which reads
  // NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and throws a
  // plain, non-secret configuration error if either is missing (see
  // src/lib/supabase/env.ts). That must never surface as an unhandled
  // platform-level crash — every request gets a controlled response, and
  // the exact (non-secret) error is logged server-side for diagnosis.
  try {
    const { supabase, getResponse } = createMiddlewareClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Each authenticated officer gets their own 120-requests/minute budget,
    // independent of every other officer on the same network. Only a request
    // with no session yet (e.g. loading /login itself) falls back to an
    // IP-keyed budget.
    const rateLimitKey = user ? `general:user:${user.id}` : `general:ip:${clientKey}`;
    const rateLimit = checkRateLimit(rateLimitKey, 120, 60);
    if (!rateLimit.allowed) {
      const response = new NextResponse("Too many requests. Please slow down and try again shortly.", {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
      return applySecurityHeaders(response);
    }

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
  } catch (error) {
    // Never leak the error message, a stack trace, or any env value to the
    // browser — only a generic, safe notice. The real (non-secret) reason
    // still goes to server-side runtime logs via console.error.
    console.error("proxy: Supabase client/auth error —", error instanceof Error ? error.message : error);
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Service temporarily unavailable. Please try again shortly." }, { status: 503 })
      );
    }
    return applySecurityHeaders(
      new NextResponse("Service temporarily unavailable. Please try again shortly.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
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
