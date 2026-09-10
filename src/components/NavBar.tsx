"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Rebalanced around the three primary officer tasks (pre-demo remediation,
// Section 11): Analyze, Cases, Law.
const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/analyzer", label: "Analyze" },
  { href: "/case-library", label: "Cases" },
  { href: "/law-library", label: "Law" },
];

// Research Tools and admin/reference routes, all one tap away under "More"
// rather than cluttering primary navigation. The Admin Dashboard entry is
// appended conditionally in NavBar below, only for an isAdmin caller
// (independent-audit correction, P0-1) -- /admin is now a real server-side
// authorization boundary (see src/lib/adminAuth.ts and proxy.ts), so a
// non-admin never even sees the link, rather than seeing it and being
// bounced on click.
//
// The legacy pairwise "Compare" tool (/compare) is deliberately NOT listed
// here or anywhere else in navigation (reconciliation pass, Task 2): its
// functions were intentionally separated into Case Journey (evolution
// within one matter) and Compare Scenarios (the same issue across
// matters/orders), both listed below, and leaving /compare independently
// discoverable — even relabeled, even under "More" — would still read as a
// third competing comparison model. As of the reconciliation pass's final
// pre-merge correction, /compare itself now performs a server-side redirect
// to /compare-scenarios (see src/app/(app)/compare/page.tsx) rather than
// rendering its own retired UI, so an old bookmark still lands somewhere
// useful even though the route is unreachable from navigation.
const SECONDARY_NAV_ITEMS = [
  { href: "/case-journey", label: "Case Journey" },
  { href: "/compare-scenarios", label: "Compare Scenarios" },
  { href: "/fraud-test", label: "Fraud Doctrine" },
  { href: "/library", label: "Source Library" },
  { href: "/methodology", label: "Methodology & Limitations" },
];

const ADMIN_NAV_ITEM = { href: "/admin", label: "Admin Dashboard" };

/** Original abstract mark — a bound register/ledger with a verification
 * check, not a reproduction of any official government or SEBI emblem. */
function Emblem() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
      <rect x="1" y="1" width="28" height="28" rx="2" stroke="var(--color-gold-100)" strokeWidth="1.25" />
      <path d="M8 8h14M8 13h14M8 18h9" stroke="var(--color-gold-100)" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M8 23.5 12 27l9-10" stroke="var(--color-gold-100)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex min-h-11 items-center rounded-sm px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--color-navy-800)] text-white ring-1 ring-inset ring-[var(--color-gold-600)]/60"
          : "text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function NavBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const secondaryItems = isAdmin ? [...SECONDARY_NAV_ITEMS, ADMIN_NAV_ITEM] : SECONDARY_NAV_ITEMS;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const secondaryActive = secondaryItems.some((item) => isActive(item.href));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMoreOpen(false);
      setOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  async function handleLogout() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="app-header sticky top-0 z-40 border-b border-[var(--color-gold-600)]/40 bg-[var(--color-navy-950)]">
      {/* Same tiered width as the app-shell <main> in (app)/layout.tsx — kept
          in sync so the header never reads narrower or wider than the
          content below it. */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 xl:max-w-[85rem] 2xl:max-w-[100rem] 3xl:max-w-[130rem]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Emblem />
          {/* SPARC branding (pre-presentation hardening pass): "SPARC" is the
              product name; the line beneath it names both what the letters
              stand for and, in the same breath, that this is an internal
              pilot -- never a bare "SPARC" that could read as an officially
              approved production system on its own. */}
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-base font-semibold tracking-wide text-white">SPARC</span>
            <span className="text-[10px] font-normal text-[var(--color-gold-100)]">CFID Regulatory Research Platform (Pilot)</span>
          </span>
        </Link>
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-sm text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
          ))}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className={`inline-flex min-h-11 items-center gap-1 rounded-sm px-3 py-2 text-sm font-medium transition ${
                secondaryActive
                  ? "bg-[var(--color-navy-800)] text-white ring-1 ring-inset ring-[var(--color-gold-600)]/60"
                  : "text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
              }`}
            >
              More
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 5l3 3 3-3" />
              </svg>
            </button>
            {moreOpen && (
              <div className="absolute right-0 z-50 mt-1 w-56 rounded-sm border border-[var(--color-border)] bg-[var(--color-paper-raised)] py-1 shadow-lg">
                {secondaryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-11 items-center px-3 py-2 text-sm ${
                      isActive(item.href)
                        ? "bg-[var(--color-gold-50)] font-medium text-[var(--color-gold-800)]"
                        : "text-[var(--color-ink-700)] hover:bg-[var(--color-gold-50)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="ml-2 min-h-11 rounded-sm border border-[var(--color-gold-100)]/30 px-3 py-2 text-sm font-medium text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </nav>
      </div>
      {open && (
        <nav className="border-t border-[var(--color-navy-800)] bg-[var(--color-navy-950)] px-4 pb-4 md:hidden" aria-label="Main navigation mobile">
          <div className="flex flex-col gap-1 pt-2">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} onClick={() => setOpen(false)} />
            ))}
            <div className="mt-2 border-t border-[var(--color-navy-800)] pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-gold-100)]/60">
              More
            </div>
            {secondaryItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} onClick={() => setOpen(false)} />
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="mt-1 min-h-11 rounded-sm border border-[var(--color-gold-100)]/30 px-3 py-2 text-left text-sm font-medium text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
