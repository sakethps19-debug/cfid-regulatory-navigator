import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border border-[var(--color-border)] bg-[var(--color-paper-raised)] p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

// True paragraph- or page-level deep linking into the source document isn't
// possible with the data on file: 86 of 91 scenario findings' official
// source links are SEBI's HTML order-listing page for that order, not the
// PDF itself, and no page-number data exists for any finding's paragraph
// references (interimParagraphReferences/finalParagraphReferences are
// paragraph numbers, e.g. "Para 49-58", not page numbers, and PDF #page=
// fragments only work with a page number). The honest, deliverable
// improvement instead: tell the user up front whether the link opens the
// PDF directly or a page they'll need to navigate from, rather than
// silently labeling every link "View official source" and letting the
// surprise land after the click.
function defaultSourceLinkLabel(href: string): string {
  return /\.pdf(\?|#|$)/i.test(href) ? "Open order PDF" : "View order page (PDF linked from there)";
}

export function SourceLink({ href, children }: { href: string; children?: ReactNode }) {
  if (!href) {
    return <span className="text-xs italic text-[var(--color-ink-300)]">Requires verification, no official link on file</span>;
  }
  const label = children ?? defaultSourceLinkLabel(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-gold-700)] underline decoration-[var(--color-gold-100)] underline-offset-2 hover:text-[var(--color-gold-800)]"
    >
      {label}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 2h6v6M10 2 2 10" />
      </svg>
    </a>
  );
}
