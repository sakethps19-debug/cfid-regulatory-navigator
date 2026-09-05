import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border border-[var(--color-border)] bg-[var(--color-paper-raised)] p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SourceLink({ href, children = "View official source" }: { href: string; children?: ReactNode }) {
  if (!href) {
    return <span className="text-xs italic text-[var(--color-ink-300)]">Requires verification — no official link on file</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-gold-700)] underline decoration-[var(--color-gold-100)] underline-offset-2 hover:text-[var(--color-gold-800)]"
    >
      {children}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 2h6v6M10 2 2 10" />
      </svg>
    </a>
  );
}
