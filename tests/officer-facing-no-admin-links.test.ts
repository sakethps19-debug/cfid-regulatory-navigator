// Release-candidate correction: Source Library and Methodology both linked
// the officer-facing text "Orders Awaiting Analysis" to /awaiting-analysis,
// which now redirects into the admin-gated /admin/awaiting-analysis (see
// adminAuth.ts / admin-auth-boundary.test.ts). A normal, non-admin,
// allow-listed officer clicking that link was silently bounced back to
// /dashboard?error=admin_required -- a dead end presented as ordinary
// research navigation. Fixed by pointing those links at /case-library
// (getOrders() with no processing_stage filter, so it genuinely is the
// complete indexed order register any officer can already reach) or, where
// the surrounding text specifically described the Verified/Residual
// register split that only Admin can see, removing the clickable promise
// rather than overstating what /case-library shows.
//
// This test is the structural guard against the same defect recurring: no
// ordinary officer-facing route under src/app/(app)/ (i.e. everything
// except the /admin/* subtree, which is intentionally allowed to link to
// itself) may contain a hardcoded link into /admin or /awaiting-analysis.
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const APP_DIR = new URL("../src/app/(app)/", import.meta.url).pathname;

function collectOfficerFacingFiles(dir: string, relative = ""): { path: string; relative: string }[] {
  const results: { path: string; relative: string }[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative ? `${relative}/${entry}` : entry;
    if (rel === "admin" || rel.startsWith("admin/")) continue; // Admin may link to itself.
    if (statSync(full).isDirectory()) {
      results.push(...collectOfficerFacingFiles(full, rel));
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      results.push({ path: full, relative: rel });
    }
  }
  return results;
}

describe("Officer-facing pages under src/app/(app)/ (excluding admin/) never link into /admin", () => {
  const files = collectOfficerFacingFiles(APP_DIR);

  it("found a non-trivial set of officer-facing route files to check (sanity check on the walk itself)", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => [f.relative, f.path] as const))("%s has no hardcoded /admin or /awaiting-analysis link", (_rel, path) => {
    const src = readFileSync(path, "utf8");
    expect(src).not.toMatch(/href=["'`]\/admin/);
    expect(src).not.toMatch(/href=["'`]\/awaiting-analysis/);
  });
});
