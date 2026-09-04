import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}>{children}</div>;
}

export function SourceLink({ href, children = "View official source" }: { href: string; children?: ReactNode }) {
  if (!href) {
    return <span className="text-xs italic text-slate-400">Requires verification — no official link on file</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
    >
      {children}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 2h6v6M10 2 2 10" />
      </svg>
    </a>
  );
}
