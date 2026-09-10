// SPARC pre-presentation hardening pass: product identity changed from the
// bare working title "CFID Regulatory Navigator" to "SPARC" (Scenario,
// Provision & Regulatory Case Analysis), a CFID Regulatory Research
// Platform. The old name is retained only as a descriptor alongside SPARC
// (never as the primary displayed name), and every surface makes clear this
// is an internal pilot, never an officially approved production system.
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), "utf8");
}

describe("SPARC branding: consistent across every visible surface", () => {
  it("the browser tab title names SPARC", () => {
    const src = read("src/app/layout.tsx");
    expect(src).toMatch(/title:\s*"SPARC/);
  });

  it("NavBar shows SPARC as the primary mark, not the old bare product name", () => {
    const src = read("src/components/NavBar.tsx");
    expect(src).toMatch(/>SPARC</);
  });

  it("the login page names SPARC, its descriptor, and that this is an internal pilot", () => {
    const src = read("src/app/login/page.tsx");
    expect(src).toMatch(/>SPARC</);
    expect(src).toMatch(/Scenario, Provision/);
    expect(src.toLowerCase()).toMatch(/pilot/);
  });

  it("the app footer and Methodology both name SPARC, never only the bare old name", () => {
    const footer = read("src/app/(app)/layout.tsx");
    const methodology = read("src/app/(app)/methodology/page.tsx");
    expect(footer).toMatch(/SPARC/);
    expect(methodology).toMatch(/SPARC/);
  });

  it("no source file still displays only the bare old product name as the primary identity", () => {
    const files = [
      "src/app/layout.tsx",
      "src/components/NavBar.tsx",
      "src/app/login/page.tsx",
      "src/app/(app)/layout.tsx",
      "src/app/(app)/methodology/page.tsx",
    ];
    for (const f of files) {
      expect(read(f)).not.toMatch(/CFID Regulatory Navigator/);
    }
  });

  it("nothing implies SPARC is an officially approved SEBI/government production system", () => {
    for (const f of ["src/components/NavBar.tsx", "src/app/login/page.tsx", "src/app/(app)/layout.tsx"]) {
      expect(read(f).toLowerCase()).not.toMatch(/official(ly)? (approved|sanctioned)/);
    }
  });
});
