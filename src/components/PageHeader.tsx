import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-serif text-xl font-semibold text-[var(--color-ink-900)] sm:text-2xl">{title}</h1>
        {description && (
          // Widens modestly at larger breakpoints (never full shell width --
          // the shell itself reaches up to 130rem at 3xl, see (app)/layout.tsx
          // -- a single short paragraph stretched that wide would be
          // unreadable) so a brief page-introduction sentence doesn't read as
          // a narrow, floating column inside a much wider workspace at
          // desktop/large-display sizes (reconciliation pass, Task 3). Long-
          // form statutory/prose content elsewhere in the app intentionally
          // keeps the tighter character-based max-w-prose measure instead --
          // this only widens brief introductory copy.
          <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-700)] xl:max-w-4xl 2xl:max-w-5xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
