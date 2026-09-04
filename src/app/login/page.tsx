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
      className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-lg ring-1 ring-slate-200"
    >
      <div className="flex gap-2 rounded-md bg-slate-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => {
            setMode("sign_in");
            setError(null);
            setNotice(null);
          }}
          className={`flex-1 rounded px-3 py-1.5 transition ${
            mode === "sign_in" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"
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
            mode === "sign_up" ? "bg-white text-blue-800 shadow-sm" : "text-slate-500"
          }`}
        >
          First time (create account)
        </button>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
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
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
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
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 ring-1 ring-blue-200">{notice}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-700 px-4 py-2 font-medium text-white transition hover:bg-blue-800 disabled:opacity-60"
      >
        {submitting ? "Please wait…" : mode === "sign_up" ? "Create account" : "Sign in"}
      </button>
      {mode === "sign_up" && (
        <p className="text-xs text-slate-500">
          Account creation only grants access if this email has already been authorised by the administrator
          (ALLOWED_EMAILS). Creating an account with any other email will not grant access to any data.
        </p>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0f2a4d] to-[#1d4ed8] px-4 py-12">
      <div className="mb-8 max-w-sm text-center text-white">
        <h1 className="text-2xl font-semibold">CFID Regulatory Navigator</h1>
        <p className="mt-2 text-sm text-blue-100">Internal legal-research pilot — authorised access only.</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 max-w-sm text-center text-xs text-blue-100">
        Enter only information that may lawfully be processed in this pilot. Do not enter confidential, unpublished or
        market-sensitive investigation information.
      </p>
    </main>
  );
}
