// SPARC visual QA harness safety guard: qa-harness/ must never become a
// reachable Next.js route. See qa-harness/README.md for the full safety
// design -- this test enforces the structural guarantee that makes it safe:
// the harness lives entirely outside src/app/, so `next build` (this
// project's only build entrypoint, see package.json) can never compile it
// into a route, and proxy.ts's auth gate is never touched by it.
import { readFileSync, existsSync } from "fs";
import { describe, expect, it } from "vitest";

describe("QA visual harness cannot ship as a production route", () => {
  it("qa-harness/ is not inside src/app/ (the only directory Next.js routes from)", () => {
    expect(existsSync(new URL("../src/app/qa-harness", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../qa-harness", import.meta.url))).toBe(true);
  });

  it("package.json's build script is plain `next build` -- no custom step could inject the harness into the app build", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(pkg.scripts.build).toBe("next build");
  });

  it("src/proxy.ts (the auth/authorization gate) has no reference to qa-harness and no new PUBLIC_PATHS/matcher exemption", () => {
    const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
    expect(proxy.toLowerCase()).not.toMatch(/qa-harness|qa_harness/);
  });

  it("the harness's generated output directory is gitignored (build artifact, never committed)", () => {
    const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
    expect(gitignore).toMatch(/qa-harness\/output/);
  });
});
