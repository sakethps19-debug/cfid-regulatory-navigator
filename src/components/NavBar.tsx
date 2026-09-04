"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyzer", label: "Scenario Analyzer" },
  { href: "/case-library", label: "Case Library" },
  { href: "/provisions", label: "Provision Explorer" },
  { href: "/law-library", label: "Law Library" },
  { href: "/compare", label: "Precedent Comparison" },
  { href: "/orders", label: "Search by Order" },
  { href: "/library", label: "Source Library" },
  { href: "/awaiting-analysis", label: "Orders Awaiting Analysis" },
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/methodology", label: "Methodology & Limitations" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="app-header sticky top-0 z-40 bg-[#0f2a4d] shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-base font-semibold text-white">
          CFID Regulatory Navigator
        </Link>
        <button
          type="button"
          className="rounded-md p-2 text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-blue-700 text-white" : "text-blue-100 hover:bg-[#12345f] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="ml-2 rounded-md border border-blue-300/40 px-3 py-2 text-sm font-medium text-blue-100 hover:bg-[#12345f] hover:text-white"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </nav>
      </div>
      {open && (
        <nav className="border-t border-blue-900/40 bg-[#0f2a4d] px-4 pb-4 md:hidden" aria-label="Main navigation mobile">
          <div className="flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    active ? "bg-blue-700 text-white" : "text-blue-100 hover:bg-[#12345f] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="mt-1 rounded-md border border-blue-300/40 px-3 py-2 text-left text-sm font-medium text-blue-100 hover:bg-[#12345f] hover:text-white"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
