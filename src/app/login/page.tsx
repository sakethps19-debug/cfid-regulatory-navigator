"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "That email is not authorised for this pilot. Contact the administrator to be added.",
};

// Self-registration was removed: this is an allow-listed internal pilot,
// and account creation is not required to be self-service (see the UI/UX
// architecture review). Accounts are provisioned by an administrator;
// authorisation is still enforced server-side against ALLOWED_EMAILS on
// every request regardless of how a session was created.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    ERROR_MESSAGES[searchParams.get("error") ?? ""] ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
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
      className="w-full max-w-sm space-y-5 rounded-sm border border-[var(--color-border)] bg-[var(--color-paper-raised)] p-8 shadow-lg"
    >
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-slate-700)]">
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
          className="mt-1.5 block w-full min-h-11 rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-100)]"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[var(--color-slate-700)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 block w-full min-h-11 rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink-900)] focus:border-[var(--color-gold-600)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-100)]"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-[var(--status-red-bg)] px-3 py-2 text-sm text-[var(--status-red-text)] ring-1 ring-inset ring-[var(--status-red-ring)]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 w-full rounded-md bg-[var(--color-gold-700)] px-4 py-2 font-medium text-white transition hover:bg-[var(--color-gold-800)] disabled:opacity-60"
      >
        {submitting ? "Please wait…" : "Sign in"}
      </button>
      <p className="text-xs leading-relaxed text-[var(--color-muted)]">
        Access is not self-service. Contact the administrator to be added as an authorised officer and to receive
        account credentials.
      </p>
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
        <h1 className="font-serif text-2xl font-semibold">CFID Regulatory Navigator</h1>
        <p className="mt-2 text-sm text-[var(--color-gold-100)]">Internal legal-research pilot, authorised access only.</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-[var(--color-gold-100)]">
        Enter only information that may lawfully be processed in this pilot. Do not enter confidential, unpublished or
        market-sensitive investigation information.
      </p>
    </main>
  );
}
