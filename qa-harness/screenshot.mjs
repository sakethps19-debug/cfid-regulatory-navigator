// Screenshots every rendered screen at each target viewport, opening the
// static HTML files directly via file:// -- no server, no Next.js, no auth.
// Uses the `playwright` package already globally available in this sandbox
// (see qa-harness/README.md) rather than adding it to this repo's own
// dependency tree.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readdirSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const OUT_DIR = fileURLToPath(new URL("./output/", import.meta.url));
const SHOT_DIR = path.join(OUT_DIR, "screenshots");
mkdirSync(SHOT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "laptop-1366", width: 1366, height: 900 },
  { name: "wide-1920", width: 1920, height: 1080 },
];

const CRITICAL_SCREENS = new Set([
  "home",
  "fixed-analyzer-grid",
  "fixed-analyzer-result",
  "case-library",
  "case-detail-rajesh",
  "provision-detail",
  "case-journey-seacoast",
]);

const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".html"));

const browser = await chromium.launch();
const page = await browser.newPage();

for (const file of files) {
  const name = file.replace(/\.html$/, "");
  const viewports = CRITICAL_SCREENS.has(name) ? VIEWPORTS : [VIEWPORTS[1]]; // non-critical screens: laptop only
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`file://${path.join(OUT_DIR, file)}`);
    await page.waitForTimeout(150);
    const outPath = path.join(SHOT_DIR, `${name}--${vp.name}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`shot ${name} @ ${vp.name}`);
  }
}

await browser.close();
console.log(`\ndone, screenshots in ${SHOT_DIR}`);
