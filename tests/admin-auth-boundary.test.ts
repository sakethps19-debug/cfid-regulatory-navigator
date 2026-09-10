// Independent-audit correction, P0-1: before this pass, /admin and every
// /admin/* route were reachable by any authenticated, allow-listed research
// user -- NavBar merely hid the link under "More", which was information
// architecture, not a security boundary. These tests cover the real,
// server-side boundary now in place: src/lib/adminAuth.ts (the allowlist
// parser and predicates), src/proxy.ts (the middleware gate, checked on
// every request before any page or API route runs), src/app/(app)/admin/
// layout.tsx (defense-in-depth, a second server-side check independent of
// the middleware matcher), and src/components/NavBar.tsx (the conditional
// Admin Dashboard link, now presentation-only -- it is never the security
// boundary itself).
import { readFileSync } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ENV_KEY = "ADMIN_ALLOWED_EMAILS";
const ORIGINAL = process.env[ENV_KEY];

async function freshAdminAuth() {
  // isAdminEmail() reads process.env.ADMIN_ALLOWED_EMAILS at call time via a
  // module-level function (not a top-level constant), so re-importing after
  // changing the env var and resetting the module registry is sufficient --
  // no need for vi.doMock or similar.
  const mod = await import("@/lib/adminAuth");
  return mod;
}

describe("adminAuth.ts: isAdminEmail — fails closed", () => {
  beforeEach(() => {
    delete process.env[ENV_KEY];
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = ORIGINAL;
  });

  it("returns false for every email when the env var is unset -- unset must never mean 'everyone is admin'", async () => {
    const { isAdminEmail } = await freshAdminAuth();
    expect(isAdminEmail("someone@example.com")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("returns false for every email when the env var is empty or whitespace-only", async () => {
    process.env[ENV_KEY] = "";
    const { isAdminEmail: isAdminEmail1 } = await freshAdminAuth();
    expect(isAdminEmail1("someone@example.com")).toBe(false);

    process.env[ENV_KEY] = "   ,  ,";
    const { isAdminEmail: isAdminEmail2 } = await freshAdminAuth();
    expect(isAdminEmail2("someone@example.com")).toBe(false);
  });

  it("returns true only for an email in the comma-separated allowlist, matched case-insensitively", async () => {
    process.env[ENV_KEY] = "admin@example.com, Second.Admin@Example.com";
    const { isAdminEmail } = await freshAdminAuth();
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("ADMIN@EXAMPLE.COM")).toBe(true);
    expect(isAdminEmail("second.admin@example.com")).toBe(true);
    expect(isAdminEmail("not-admin@example.com")).toBe(false);
  });

  it("tolerates surrounding whitespace around each listed address", async () => {
    process.env[ENV_KEY] = "  admin@example.com  ,   other@example.com ";
    const { isAdminEmail } = await freshAdminAuth();
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("other@example.com")).toBe(true);
  });
});

describe("adminAuth.ts: isAdminPath", () => {
  it("matches /admin exactly, and every /admin/* and /api/admin/* subpath", async () => {
    const { isAdminPath } = await freshAdminAuth();
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/")).toBe(true);
    expect(isAdminPath("/admin/validation-issues")).toBe(true);
    expect(isAdminPath("/api/admin/some-route")).toBe(true);
  });

  it("does not match unrelated paths, including ones that merely start with the same letters", async () => {
    const { isAdminPath } = await freshAdminAuth();
    expect(isAdminPath("/dashboard")).toBe(false);
    expect(isAdminPath("/adminish")).toBe(false);
    expect(isAdminPath("/administration")).toBe(false);
    expect(isAdminPath("/api/other")).toBe(false);
  });
});

describe("adminAuth.ts: the admin allowlist env var is never NEXT_PUBLIC_-prefixed", () => {
  it("adminAuth.ts reads process.env.ADMIN_ALLOWED_EMAILS, never a NEXT_PUBLIC_ variant -- a NEXT_PUBLIC_ prefix would bundle admin emails into client JavaScript", () => {
    const src = readFileSync(new URL("../src/lib/adminAuth.ts", import.meta.url), "utf8");
    expect(src).toMatch(/process\.env\.ADMIN_ALLOWED_EMAILS/);
    expect(src).not.toMatch(/NEXT_PUBLIC_ADMIN/);
  });
});

describe("proxy.ts: the /admin gate runs in server-side middleware, before any page or route handler", () => {
  const src = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");

  it("imports and calls isAdminEmail/isAdminPath from the shared adminAuth module -- no ad hoc duplicate check", () => {
    expect(src).toMatch(/import\s*\{\s*isAdminEmail,\s*isAdminPath\s*\}\s*from\s*"@\/lib\/adminAuth"/);
    expect(src).toMatch(/isAdminPath\(pathname\)\s*&&\s*!isAdminEmail\(user\.email\)/);
  });

  it("a non-admin hitting an /admin page is redirected to /dashboard with an explanatory error code, never shown an admin page", () => {
    expect(src).toMatch(/deniedUrl\.searchParams\.set\("error",\s*"admin_required"\)/);
    expect(src).toMatch(/NextResponse\.redirect\(deniedUrl\)/);
  });

  it("a non-admin hitting an /api/admin/* route gets a 403 JSON error, never a redirect (APIs should not 3xx)", () => {
    expect(src).toMatch(/pathname\.startsWith\("\/api\/"\)/);
    expect(src).toMatch(/Not authorised for Admin\.[\s\S]{0,40}status:\s*403/);
  });

  it("the admin gate runs only after the existing allow-listed-user check, never before it -- an unlisted user is still bounced to /login first", () => {
    const allowedIdx = src.indexOf('await supabase.rpc("is_allowed_user")');
    const adminGateIdx = src.indexOf("isAdminPath(pathname)");
    expect(allowedIdx).toBeGreaterThan(-1);
    expect(adminGateIdx).toBeGreaterThan(-1);
    expect(adminGateIdx).toBeGreaterThan(allowedIdx);
  });
});

describe("admin/layout.tsx: defense-in-depth server check, independent of the middleware matcher", () => {
  const src = readFileSync(new URL("../src/app/(app)/admin/layout.tsx", import.meta.url), "utf8");

  it("re-checks isAdminEmail server-side and redirects a non-admin to /dashboard, rather than trusting middleware alone", () => {
    expect(src).toMatch(/import\s*\{\s*isAdminEmail\s*\}\s*from\s*"@\/lib\/adminAuth"/);
    expect(src).toMatch(/if\s*\(!isAdminEmail\(user\?\.email\)\)/);
    expect(src).toMatch(/redirect\("\/dashboard\?error=admin_required"\)/);
  });

  it("fetches the user itself via a server-side Supabase client (cookie session), not a client-only prop or context", () => {
    expect(src).toMatch(/createClient/);
    expect(src).toMatch(/supabase\.auth\.getUser\(\)/);
  });
});

describe("(app)/layout.tsx: NavBar's isAdmin prop is computed server-side, never left for the client to assert", () => {
  it("looks up the user server-side and passes a computed isAdmin boolean into NavBar -- NavBar itself never independently decides admin status", () => {
    const src = readFileSync(new URL("../src/app/(app)/layout.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/import\s*\{\s*isAdminEmail\s*\}\s*from\s*"@\/lib\/adminAuth"/);
    expect(src).toMatch(/const isAdmin = isAdminEmail\(user\?\.email\)/);
    expect(src).toMatch(/<NavBar isAdmin=\{isAdmin\}\s*\/>/);
  });
});

describe("NavBar.tsx: the Admin Dashboard link is presentation-only, appended only for an isAdmin caller", () => {
  const src = readFileSync(new URL("../src/components/NavBar.tsx", import.meta.url), "utf8");

  it("requires an isAdmin prop (no default), and the Admin Dashboard item is not in the always-rendered SECONDARY_NAV_ITEMS array", () => {
    expect(src).toMatch(/export function NavBar\(\{\s*isAdmin\s*\}:\s*\{\s*isAdmin:\s*boolean\s*\}\)/);
    const secondaryBlockMatch = src.match(/const SECONDARY_NAV_ITEMS = \[[\s\S]*?\];/);
    expect(secondaryBlockMatch).not.toBeNull();
    expect(secondaryBlockMatch![0]).not.toMatch(/\/admin/);
  });

  it("only appends ADMIN_NAV_ITEM to the rendered list when isAdmin is true", () => {
    expect(src).toMatch(/const secondaryItems = isAdmin \? \[\.\.\.SECONDARY_NAV_ITEMS, ADMIN_NAV_ITEM\] : SECONDARY_NAV_ITEMS/);
  });

  it("both the desktop dropdown and the mobile menu render from the conditional secondaryItems list, never the raw SECONDARY_NAV_ITEMS constant", () => {
    const renderCalls = [...src.matchAll(/(SECONDARY_NAV_ITEMS|secondaryItems)\.map\(/g)].map((m) => m[1]);
    expect(renderCalls.length).toBeGreaterThanOrEqual(2);
    expect(renderCalls.every((name) => name === "secondaryItems")).toBe(true);
  });
});

describe("Known, documented limitation (must not be silently 'fixed' by relabeling without a real RLS change)", () => {
  it("adminAuth.ts's own doc comment discloses that RLS still grants SELECT to any is_allowed_user() on admin-only tables -- this file only closes the Next.js application boundary, not the database boundary", () => {
    const src = readFileSync(new URL("../src/lib/adminAuth.ts", import.meta.url), "utf8");
    expect(src.toLowerCase()).toMatch(/known limitation/);
    expect(src).toMatch(/is_admin_user/);
  });
});
