// Guards the fix making the CSP's connect-src Supabase origin
// environment-driven (derived from NEXT_PUBLIC_SUPABASE_URL) instead of
// hardcoded to one project id in src/proxy.ts — and that it fails closed
// (empty, never a wildcard) on anything but a clean https:// origin.
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseConnectSrcOrigins } from "@/proxy";

describe("supabaseConnectSrcOrigins", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("derives https:// and wss:// origins from NEXT_PUBLIC_SUPABASE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example-project.supabase.co");
    expect(supabaseConnectSrcOrigins()).toBe("https://example-project.supabase.co wss://example-project.supabase.co");
  });

  it("fails closed to an empty string for a non-https origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://example-project.supabase.co");
    expect(supabaseConnectSrcOrigins()).toBe("");
  });

  it("fails closed to an empty string when the env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(supabaseConnectSrcOrigins()).toBe("");
  });

  it("fails closed to an empty string for an unparseable value", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");
    expect(supabaseConnectSrcOrigins()).toBe("");
  });
});
