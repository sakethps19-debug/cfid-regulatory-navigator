import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-serif text-xl font-semibold text-[var(--color-ink-900)] sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-700)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
