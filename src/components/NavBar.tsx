"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyzer", label: "Scenario Analyzer" },
  { href: "/case-library", label: "Case Library" },
  { href: "/law-library", label: "Law Library" },
  { href: "/provisions", label: "Provision Explorer" },
  { href: "/compare", label: "Precedent Comparison" },
  { href: "/fraud-test", label: "Fraud Doctrine" },
  { href: "/orders", label: "Search by Order" },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/library", label: "Source Library" },
  { href: "/awaiting-analysis", label: "Orders Awaiting Analysis" },
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/methodology", label: "Methodology & Limitations" },
];

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
      className={`rounded-sm px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--color-navy-800)] text-white ring-1 ring-inset ring-[var(--color-gold-600)]/60"
          : "text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const secondaryActive = SECONDARY_NAV_ITEMS.some((item) => isActive(item.href));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="app-header sticky top-0 z-40 border-b border-[var(--color-gold-600)]/40 bg-[var(--color-navy-950)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Emblem />
          <span className="font-serif text-base font-semibold leading-tight text-white">
            CFID <span className="font-normal text-[var(--color-gold-100)]">Regulatory Navigator</span>
          </span>
        </Link>
        <button
          type="button"
          className="rounded-sm p-2 text-white md:hidden"
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
              className={`inline-flex items-center gap-1 rounded-sm px-3 py-2 text-sm font-medium transition ${
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
                {SECONDARY_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`block px-3 py-2 text-sm ${
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
            className="ml-2 rounded-sm border border-[var(--color-gold-100)]/30 px-3 py-2 text-sm font-medium text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
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
              Admin &amp; reference
            </div>
            {SECONDARY_NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} onClick={() => setOpen(false)} />
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="mt-1 rounded-sm border border-[var(--color-gold-100)]/30 px-3 py-2 text-left text-sm font-medium text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
