// Guards the startup/config-validation behaviour behind the Vercel Internal
// Server Error incident: a missing Supabase env var must throw a clear,
// specific, non-secret error — never an unexplained crash, and never a
// message that echoes any actual configured value.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

describe("supabase env accessors", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws a clear, non-secret error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => supabaseUrl()).toThrowError("NEXT_PUBLIC_SUPABASE_URL is not set.");
  });

  it("throws a clear, non-secret error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => supabaseAnonKey()).toThrowError("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  });

  it("returns the configured value without alteration when present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    expect(supabaseUrl()).toBe("https://example.supabase.co");
    expect(supabaseAnonKey()).toBe("test-anon-key");
  });
});
