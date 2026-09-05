import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <DisclaimerBanner />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <footer className="no-print border-t border-[var(--color-border)] bg-[var(--color-paper-raised)] px-4 py-4 text-center text-xs text-[var(--color-ink-500)]">
        CFID Regulatory Navigator — internal research-assistance pilot. Not a determination of any violation.
      </footer>
    </div>
  );
}
