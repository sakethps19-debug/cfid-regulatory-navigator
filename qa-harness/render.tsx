// Renders every fixture screen to static HTML under output/*.html. See
// qa-harness/README.md for the safety design: this never starts a Next.js
// server, never touches proxy.ts, and never creates a route.
import { mkdirSync, writeFileSync } from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell, SCREENS } from "./screens";

const OUT_DIR = new URL("./output/", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

function page(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html lang="en" class="h-full antialiased">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<link rel="stylesheet" href="app.css" />
<style>body{min-height:100%}</style>
</head>
<body class="min-h-full flex flex-col font-sans">${bodyHtml}</body>
</html>`;
}

let count = 0;
for (const screen of SCREENS) {
  const html = renderToStaticMarkup(<AppShell pathname={screen.pathname}>{screen.render()}</AppShell>);
  writeFileSync(new URL(`${screen.name}.html`, OUT_DIR), page(html, `QA harness — ${screen.name}`));
  count++;
  console.log(`rendered ${screen.name}.html`);
}
console.log(`\n${count} screens rendered to qa-harness/output/`);
