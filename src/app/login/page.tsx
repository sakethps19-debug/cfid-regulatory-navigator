"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "That email is not authorised for this pilot. Contact the administrator to be added.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    ERROR_MESSAGES[searchParams.get("error") ?? ""] ?? null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    if (mode === "sign_up") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }
      if (!data.session) {
        setNotice(
          "Account created. Check your email to confirm your address, then sign in — access is still limited to " +
            "authorised email addresses even after confirmation."
        );
        setMode("sign_in");
        setSubmitting(false);
        return;
      }
      // Supabase returned a session immediately (email confirmation is
      // disabled on this project). Let the middleware's is_allowed_user()
      // check on the next request decide whether this account may proceed.
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    const next = searchParams.get("next") || "/dashboard";
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-sm bg-white p-8 shadow-lg border border-[var(--color-border)]"
    >
      <div className="flex gap-2 rounded-md bg-[var(--color-neutral-100)] p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => {
            setMode("sign_in");
            setError(null);
            setNotice(null);
          }}
          className={`flex-1 rounded px-3 py-1.5 transition ${
            mode === "sign_in" ? "bg-white text-[var(--color-gold-800)] " : "text-[var(--color-ink-500)]"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sign_up");
            setError(null);
            setNotice(null);
          }}
          className={`flex-1 rounded px-3 py-1.5 transition ${
            mode === "sign_up" ? "bg-white text-[var(--color-gold-800)] " : "text-[var(--color-ink-500)]"
          }`}
        >
          First time (create account)
        </button>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-ink-700)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[var(--color-ink-700)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)]  focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:border-[var(--color-gold-100)]"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-[#f1e3df] px-3 py-2 text-sm text-[#7a2a1f] ring-1 border-[#dcaa9a]">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-[var(--color-gold-50)] px-3 py-2 text-sm text-[var(--color-gold-800)] ring-1 border-[var(--color-gold-100)]">{notice}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[var(--color-gold-700)] px-4 py-2 font-medium text-white transition hover:bg-[var(--color-gold-800)] disabled:opacity-60"
      >
        {submitting ? "Please wait…" : mode === "sign_up" ? "Create account" : "Sign in"}
      </button>
      {mode === "sign_up" && (
        <p className="text-xs text-[var(--color-ink-500)]">
          Account creation only grants access if this email has already been authorised by the administrator
          (ALLOWED_EMAILS). Creating an account with any other email will not grant access to any data.
        </p>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--color-navy-950)] to-[var(--color-navy-800)] px-4 py-12">
      <div className="mb-8 max-w-sm text-center text-white">
        <svg width="40" height="40" viewBox="0 0 30 30" fill="none" className="mx-auto mb-3" aria-hidden>
          <rect x="1" y="1" width="28" height="28" rx="2" stroke="var(--color-gold-100)" strokeWidth="1.25" />
          <path d="M8 8h14M8 13h14M8 18h9" stroke="var(--color-gold-100)" strokeWidth="1.25" strokeLinecap="round" />
          <path d="M8 23.5 12 27l9-10" stroke="var(--color-gold-100)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="text-2xl font-semibold">CFID Regulatory Navigator</h1>
        <p className="mt-2 text-sm text-[var(--color-gold-100)]">Internal legal-research pilot — authorised access only.</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 max-w-sm text-center text-xs text-[var(--color-gold-100)]">
        Enter only information that may lawfully be processed in this pilot. Do not enter confidential, unpublished or
        market-sensitive investigation information.
      </p>
    </main>
  );
}
