# QA harness — safety design

## Why this exists

This environment has no real officer session: no email inbox to click a
Supabase Auth magic link, and no `service_role` key to mint one. Without a
way to render the authenticated officer UI, visual QA could only ever be
inference from Tailwind class names, never real pixels.

## Architecture chosen: Option D — direct component rendering into a local
test shell (never a Next.js route, never proxy.ts, never Vercel)

`qa-harness/` renders real presentational React components with synthetic
fixture props via `react-dom/server`'s `renderToStaticMarkup`, producing
plain static HTML files under the gitignored `qa-harness/output/`
directory. Those files are opened directly (`file://…`) by a Playwright
script and screenshotted at several viewport widths. That is the entire
mechanism.

## Why this cannot weaken production security

- **It is not a Next.js route.** Nothing under `qa-harness/` is inside
  `src/app/`, so `next build` never compiles it and no URL path on the
  deployed site can ever reach it — there is no route to accidentally
  leave public.
- **`src/proxy.ts` (the auth/authorization middleware) is untouched.** No
  new `PUBLIC_PATHS` entry, no matcher change, no `isAdminPath`/`isAdminEmail`
  change. The real app's auth gate is exactly what it was.
- **No bypass, no cookie, no token.** The harness never talks to the running
  app, never calls `supabase.auth`, never fabricates a session or JWT. It
  imports plain React components as JavaScript modules and calls them as
  functions with fixture props — the same thing `vitest` already does for
  every other test file in `tests/`, just rendered to markup instead of
  asserted against with `expect()`.
- **No new dependency, no route, no env flag shipped.** `package.json`,
  `next.config.ts` and `src/proxy.ts` are unmodified by this harness (the
  render/screenshot scripts use the `playwright` package that is already
  globally available in this sandbox via `/opt/node22`, referenced by
  absolute path — nothing was added to this repo's own dependency tree).
- **No live/confidential data.** Fixtures are synthetic objects shaped like
  the real domain types (`src/types/domain.ts`), populated with values
  modeled on already-public, already-official-source SEBI order content
  this repository's own commit history and test fixtures already reference
  (e.g. Rajesh Exports Limited, Seacoast Shipping Services Limited) — never
  a raw dump of confidential/unpublished/market-sensitive material, and
  never written back to Supabase.

## What is and isn't pixel-faithful

The harness reuses the REAL shared presentational components verbatim
(`Card`, `PageHeader`, `OrderStageBadge`, `SourceLink`, `StatusBadge`,
`CaseLibraryClient`, `CompareScenariosResultClient`, `LawLibraryClient`,
`FraudTestChecklist`, `CaseJourneyStageCard`, `ProvisionOrderList`,
`OrderBroadScenarios`, etc.) and the REAL compiled Tailwind CSS from the
last `npm run build` output, so spacing/typography/color are the real
production values, not a re-implementation.

Two things are NOT pixel-faithful and are disclosed rather than silently
assumed correct:

1. **`NavBar` needed a static stand-in** (`shims/NavBarStatic.tsx`) because
   the real `NavBar.tsx` calls `usePathname()`/`useRouter()` from
   `next/navigation`, which throw outside a real Next.js app-router request
   — there is no way to satisfy that context without an actual Next.js
   request cycle (i.e. without exactly the routing/auth machinery this
   design deliberately avoids). The shim is a byte-for-byte copy of
   NavBar's JSX/Tailwind classes with only those two hook calls replaced by
   fixed values (a `pathname` prop, no-op handlers). If NavBar's markup
   changes later, this shim needs a matching update or it will silently
   drift — flagged as harness debt, not hidden.
2. **Interactivity is not exercised.** `renderToStaticMarkup` produces the
   *initial* render only — clicking a filter, expanding a scenario tile,
   or submitting the free-text Analyzer form does nothing in these static
   files. Different UI *states* (e.g. "Diversion scenario selected", "5
   Relevant CFID Orders") are therefore built as separate fixture screens
   with the post-interaction data already baked into props, not captured
   by simulating a real click.

## Files

- `fixtures/` — synthetic `Order`/`ScenarioFinding`/`LegalProvision`/etc.
  objects, one file per case family (Rajesh Exports-shaped, Seacoast-shaped,
  generic/empty-state shaped).
- `screens/` — one module per screen, composing real components + fixtures
  into the same JSX structure as the real page.
- `shims/` — the one NavBar stand-in described above.
- `render.mjs` — renders every screen to static HTML under `output/*.html`,
  linking the real compiled CSS (`output/app.css`, copied from the last
  production build) and fonts (`output/media/`).
- `screenshot.mjs` — opens each HTML file with Playwright Chromium at each
  target viewport and saves PNGs under `output/screenshots/`.

## Regenerating

```
npm run build                    # refresh output/app.css + output/media if styles changed
node qa-harness/render.mjs
node qa-harness/screenshot.mjs
```

Nothing here is wired into `npm test`, `npm run build`, or CI — it is a
manual, opt-in tool, consistent with keeping it out of normal product
build/deploy paths entirely.
