// A static stand-in for src/components/NavBar.tsx, needed ONLY because the
// real NavBar calls usePathname()/useRouter() from next/navigation, which
// throw outside a real Next.js request. This is a byte-for-byte copy of
// NavBar's JSX/Tailwind classes with just those two hook calls replaced by
// fixed values -- see qa-harness/README.md, "What is and isn't
// pixel-faithful", for why this exists and its one known limitation (it can
// silently drift from the real NavBar.tsx if that file's markup changes).
import Link from "next/link";

const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/analyzer", label: "Analyze" },
  { href: "/case-library", label: "Cases" },
  { href: "/law-library", label: "Law" },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/case-journey", label: "Case Journey" },
  { href: "/compare-scenarios", label: "Compare Scenarios" },
  { href: "/fraud-test", label: "Fraud Doctrine" },
  { href: "/library", label: "Source Library" },
  { href: "/methodology", label: "Methodology & Limitations" },
];

const ADMIN_NAV_ITEM = { href: "/admin", label: "Admin Dashboard" };

function Emblem() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
      <rect x="1" y="1" width="28" height="28" rx="2" stroke="var(--color-gold-100)" strokeWidth="1.25" />
      <path d="M8 8h14M8 13h14M8 18h9" stroke="var(--color-gold-100)" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M8 23.5 12 27l9-10" stroke="var(--color-gold-100)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
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

export function NavBarStatic({ isAdmin, pathname }: { isAdmin: boolean; pathname: string }) {
  const secondaryItems = isAdmin ? [...SECONDARY_NAV_ITEMS, ADMIN_NAV_ITEM] : SECONDARY_NAV_ITEMS;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const secondaryActive = secondaryItems.some((item) => isActive(item.href));

  return (
    <header className="app-header sticky top-0 z-40 border-b border-[var(--color-gold-600)]/40 bg-[var(--color-navy-950)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 xl:max-w-[85rem] 2xl:max-w-[100rem] 3xl:max-w-[130rem]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Emblem />
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-base font-semibold tracking-wide text-white">SPARC</span>
            <span className="text-[10px] font-normal text-[var(--color-gold-100)]">CFID Regulatory Research Platform (Pilot)</span>
          </span>
        </Link>
        <button type="button" className="flex min-h-11 min-w-11 items-center justify-center rounded-sm text-white md:hidden" aria-label="Toggle navigation menu" aria-expanded={false}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
          ))}
          <div className="relative">
            <button
              type="button"
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
          </div>
          <button
            type="button"
            className="ml-2 min-h-11 rounded-sm border border-[var(--color-gold-100)]/30 px-3 py-2 text-sm font-medium text-[var(--color-gold-50)]/80 hover:bg-[var(--color-navy-800)] hover:text-white"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
