/**
 * Visual self-verification (constitution IV).
 *
 *   npm run visual-check -- --slug 01-landing --url http://localhost:3000/ [--no-dark] [--name extra]
 *
 * Captures docs/visual-checks/<slug>/{desktop,tablet,mobile,desktop-dark}.png and FAILS (exit 1) when:
 *   - any console.error, or a console.warning mentioning hydration, is emitted
 *   - the document scrolls horizontally on any viewport
 *   - an interactive element is shorter than 44px on the mobile viewport
 *   - the page responds with status >= 400
 */
import { chromium, type Browser, type ConsoleMessage } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Prefer the browser revision bundled with the installed Playwright; if it is missing
 * (no `npx playwright install` yet), fall back to any Chromium already present in the
 * ms-playwright cache so the check never requires a fresh download.
 */
function findFallbackChromium(): string | undefined {
  const override = process.env.SHARWA_CHROMIUM;
  if (override && existsSync(override)) return override;
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? "", "AppData", "Local"), "ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    for (const sub of ["chrome-win64", "chrome-win", "chrome-linux", "chrome-mac"]) {
      const exe = join(cache, d, sub, process.platform === "win32" ? "chrome.exe" : "chrome");
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (err) {
    const fallback = findFallbackChromium();
    if (!fallback) throw err;
    console.warn(`! bundled Chromium missing — using ${fallback}`);
    return chromium.launch({ executablePath: fallback });
  }
}

type Viewport = { name: string; width: number; height: number; colorScheme: "light" | "dark" };

const VIEWPORTS: Viewport[] = [
  { name: "desktop", width: 1440, height: 900, colorScheme: "light" },
  { name: "tablet", width: 768, height: 1024, colorScheme: "light" },
  { name: "mobile", width: 390, height: 844, colorScheme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, colorScheme: "dark" },
];

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const slug = arg("--slug");
const url = arg("--url");
const extraName = arg("--name"); // optional suffix, e.g. "login" → desktop-login.png
const noDark = process.argv.includes("--no-dark");

if (!slug || !url) {
  console.error("Usage: visual-check --slug <NN-slug> --url <http://…> [--no-dark] [--name <suffix>]");
  process.exit(2);
}

const outDir = join(process.cwd(), "docs", "visual-checks", slug);
mkdirSync(outDir, { recursive: true });

type Failure = { viewport: string; kind: string; detail: string };

async function checkViewport(browser: Browser, vp: Viewport): Promise<Failure[]> {
  const failures: Failure[] = [];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    colorScheme: vp.colorScheme,
    locale: "ar",
    deviceScaleFactor: 1,
    hasTouch: vp.width < 768,
    isMobile: vp.width < 768,
  });
  const page = await context.newPage();

  const consoleIssues: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    if (msg.type() === "error") consoleIssues.push(`error: ${text}`);
    else if (msg.type() === "warning" && /hydrat/i.test(text)) consoleIssues.push(`hydration: ${text}`);
  });
  page.on("pageerror", (err) => consoleIssues.push(`pageerror: ${err.message}`));

  const response = await page.goto(url!, { waitUntil: "networkidle" });
  if (response && response.status() >= 400) {
    failures.push({ viewport: vp.name, kind: "http", detail: `status ${response.status()}` });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400); // let reveal animations settle (they are ≤ 300ms)

  const metrics = await page.evaluate(() => {
    const se = document.scrollingElement ?? document.documentElement;
    const horizontalOverflow = se.scrollWidth - se.clientWidth;
    const smallTargets: string[] = [];
    const candidates = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]',
    );
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden") continue;
      // inline links inside running text are exempt (prose)
      if (el.tagName === "A" && el.closest("p, li, td")) continue;
      if (rect.height < 44) {
        const label = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
        smallTargets.push(`${el.tagName.toLowerCase()} "${label}" h=${Math.round(rect.height)}px`);
      }
    }
    return { horizontalOverflow, smallTargets };
  });

  if (metrics.horizontalOverflow > 0) {
    failures.push({ viewport: vp.name, kind: "overflow-x", detail: `${metrics.horizontalOverflow}px` });
  }
  if (vp.name === "mobile" && metrics.smallTargets.length > 0) {
    failures.push({ viewport: vp.name, kind: "touch-target<44", detail: metrics.smallTargets.join(" | ") });
  }
  for (const issue of consoleIssues) {
    failures.push({ viewport: vp.name, kind: "console", detail: issue });
  }

  const file = join(outDir, `${vp.name}${extraName ? `-${extraName}` : ""}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${vp.name.padEnd(13)} ${vp.width}×${vp.height} → ${file}`);

  await context.close();
  return failures;
}

(async () => {
  const browser = await launchBrowser();
  const all: Failure[] = [];
  for (const vp of VIEWPORTS) {
    if (noDark && vp.colorScheme === "dark") continue;
    all.push(...(await checkViewport(browser, vp)));
  }
  await browser.close();

  if (all.length > 0) {
    console.error(`\n✗ ${all.length} failure(s):`);
    for (const f of all) console.error(`  [${f.viewport}] ${f.kind}: ${f.detail}`);
    process.exit(1);
  }
  console.log(`\n✓ visual check passed for ${slug} (${url})`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
