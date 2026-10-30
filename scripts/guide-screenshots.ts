/**
 * DOC-285 — regenerates every screenshot of the Arabic user guides (`docs/guides/`) from MOCK data.
 *
 *   npx tsx scripts/guide-screenshots.ts [port] [--only <id-prefix>] [--list]     (port default 3000)
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/guide-screenshots.ts          (browser override)
 *
 * Source of truth: `docs/guides/_assets/shots.json` — one entry per image, written by the guide
 * author (the procedure is in `docs/guides/_screenshots.md`). Each entry becomes
 * `docs/guides/_assets/<id>.png` (desktop 1440×900) and, when it asks for it,
 * `docs/guides/_assets/<id>-mobile.png` (390×844, the bottom-nav layout).
 *
 * Preconditions (the script checks the first one and refuses to run otherwise):
 *   - the dev server answers from fixtures only — every probed BFF route carries
 *     `x-sharwa-mock: 1` (the `requireMocks()` pattern of `b2b-check.ts`). Start it with
 *     `set SHARWA_LIVE_MODULES=none&& npm run dev` (Windows cmd) and keep Django stopped, so the
 *     Django-first screens (landing, storefront, onboarding) fall back to their fixtures too;
 *   - restart the dev server before a full run: mock state lives in the Next.js process, and a
 *     recipe that changes an order works on whatever the previous run left.
 *
 * What every image gets, so guides never show dev chrome or personal data:
 *   - the dev-only «بيانات تجريبية» badge and the Next.js dev indicator are hidden (screenshot `style`);
 *   - phone numbers and personal access tokens (`shw_pat_…`) are masked;
 *   - `caret: "initial"`: Playwright's default writes `caret-color` inline and React then reports a
 *     hydration mismatch (see `bundles-check.ts`).
 *
 * Exit 1 when a module answers live, a page fails to load, a `waitFor` never appears or a recipe fails.
 * Console errors are printed as warnings (the QA scripts own that check).
 */
import { chromium, type Browser, type Locator, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const ASSETS = join(ROOT, "docs", "guides", "_assets");
const MANIFEST = join(ASSETS, "shots.json");

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const PORT = args.find((a) => /^\d+$/.test(a)) ?? "3000";
const ONLY = flag("--only");
const LIST = args.includes("--list");

type Session = "merchant" | "staff" | "manager";
type ViewportName = "desktop" | "mobile";
type Step = { click: string } | { fill: string; value: string } | { waitFor: string } | { wait: number } | { hover: string };

interface Shot {
  /** `<audience>/<NN-slug>/<page>-<n>` — the image path under `_assets/`, without `.png`. */
  id: string;
  /** Store subdomain (`noor`, `shop`, `glow`) or `""` for the platform origin (landing, Sharwa Pay). */
  host: string;
  /** Mock dashboard session (`sharwa_mock_session` cookie). Omit for public screens. */
  session?: Session;
  path: string;
  /** A Playwright selector that proves the screen has rendered. */
  waitFor?: string;
  steps?: Step[];
  /** A scripted state that plain steps cannot reach (see RECIPES). */
  recipe?: RecipeName;
  /** Capture only this element instead of the viewport. */
  element?: string;
  fullPage?: boolean;
  /** Default `["desktop"]`. */
  viewports?: ViewportName[];
  /** Extra BFF routes that must answer from fixtures for this image. */
  probe?: string[];
  /** Free text for the author: what the image shows and which page uses it. */
  note?: string;
}

const VIEWPORTS: Record<ViewportName, { width: number; height: number; suffix: string; isMobile: boolean }> = {
  desktop: { width: 1440, height: 900, suffix: "", isMobile: false },
  mobile: { width: 390, height: 844, suffix: "-mobile", isMobile: true },
};

/** Always probed on every store host the manifest uses. */
const DEFAULT_STORE_PROBES = ["/api/bff/orders?page_size=1", "/api/bff/staff", "/api/bff/settings"];

/** Hidden in every image: the mock badge (`MockIndicator`) and the Next.js dev indicator. */
const HIDE_DEV_CHROME = `
  div[role="status"].pointer-events-none.fixed.inset-x-0.top-0 { display: none !important; }
  nextjs-portal { display: none !important; }
`;

/** Yemeni / Saudi numbers in international (967…, +966 …) or local (07…, 05…) form. */
const PHONE_RE = /(?:\+?9(?:66|67)[\s-]?\d(?:[\s-]?\d){7,8}|(?<![\d.,])0[57]\d{7,8}(?![\d.,]))/;
const TOKEN_RE = /shw_pat_[A-Za-z0-9_-]+/;

type RecipeName = keyof typeof RECIPES;

const RECIPES = {
  /**
   * The orders 409 panel «حُدِّث الطلب #… من مستخدم آخر»: another user moves the order first
   * (a version bump the page does not know about), then the page tries its own change.
   * Same flow as step 4 of `catalog-orders-check.ts`. Changes one fixture order per run.
   */
  "order-conflict": async (page: Page, base: string) => {
    type Row = { id: number; version: number; locked_reason: string | null; fulfillment_status: { name: string } | null };
    const list = await api<{ results: Row[] }>(page, "GET", "/api/bff/orders?status=new&page_size=20");
    const target = list.results.find((o) => !o.locked_reason && o.fulfillment_status?.name !== "قيد التوصيل");
    if (!target) throw new Error("order-conflict: no editable «new» order left in the fixture — restart the dev server");
    await page.goto(`${base}/dashboard/orders/${target.id}`, { waitUntil: "networkidle" });
    const statuses = await api<Array<{ id: number; name: string }>>(page, "GET", "/api/bff/order-statuses");
    const byName = (name: string) => {
      const s = statuses.find((x) => x.name === name);
      if (!s) throw new Error(`order-conflict: fixture status «${name}» not found`);
      return s;
    };
    const preparing = byName("قيد التجهيز");
    const delivering = byName("قيد التوصيل");
    const other = target.fulfillment_status?.name === preparing.name ? byName("قيد الانتظار") : preparing;
    await api(page, "POST", `/api/bff/orders/${target.id}/fulfillment-status`, { status_id: other.id, version: target.version });
    await page.click(`[data-testid=fulfillment-trigger-${target.id}]`);
    await page.getByRole("menuitem", { name: new RegExp(`^${delivering.name}`) }).click();
    await page.waitForSelector("[data-testid=conflict-panel]", { timeout: 15_000 });
  },
} satisfies Record<string, (page: Page, base: string) => Promise<void>>;

function origin(host: string): string {
  return `http://${host ? `${host}.` : ""}localhost:${PORT}`;
}

async function api<T = unknown>(page: Page, method: string, path: string, body?: unknown): Promise<T> {
  const res = await page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { "content-type": "application/json", accept: "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await r.text();
      return { status: r.status, text };
    },
    { method, path, body },
  );
  if (res.status >= 400) throw new Error(`${method} ${path} → ${res.status}`);
  return (res.text ? JSON.parse(res.text) : null) as T;
}

function readManifest(): Shot[] {
  if (!existsSync(MANIFEST)) {
    console.error(`✗ ${MANIFEST} is missing`);
    process.exit(1);
  }
  const shots = JSON.parse(readFileSync(MANIFEST, "utf8")) as Shot[];
  const ids = new Set<string>();
  for (const s of shots) {
    if (!/^(merchant|buyer|courier|sharwa-pay|console)\/\d{2}-[a-z0-9-]+\/[a-z0-9-]+-\d+$/.test(s.id)) {
      console.error(`✗ bad id «${s.id}» — expected <audience>/<NN-slug>/<page>-<n>`);
      process.exit(1);
    }
    if (ids.has(s.id)) {
      console.error(`✗ duplicate id «${s.id}»`);
      process.exit(1);
    }
    if (s.recipe && !(s.recipe in RECIPES)) {
      console.error(`✗ ${s.id}: unknown recipe «${s.recipe}»`);
      process.exit(1);
    }
    ids.add(s.id);
  }
  return ONLY ? shots.filter((s) => s.id.startsWith(ONLY)) : shots;
}

async function newPage(browser: Browser, shot: Shot, viewport: ViewportName): Promise<Page> {
  const v = VIEWPORTS[viewport];
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.isMobile, locale: "ar" });
  if (shot.session) {
    await ctx.addCookies([{ name: "sharwa_mock_session", value: shot.session, domain: `${shot.host ? `${shot.host}.` : ""}localhost`, path: "/" }]);
  }
  return ctx.newPage();
}

/** Every probed route must carry `x-sharwa-mock: 1`; otherwise a guide would show live data. */
async function requireMocks(browser: Browser, shots: Shot[]) {
  const probes = new Map<string, Set<string>>();
  for (const s of shots) {
    const set = probes.get(s.host) ?? new Set<string>(s.host ? DEFAULT_STORE_PROBES : []);
    for (const p of s.probe ?? []) set.add(p);
    probes.set(s.host, set);
  }
  const live: string[] = [];
  for (const [host, paths] of probes) {
    if (paths.size === 0) continue;
    const page = await newPage(browser, { id: "", host, session: "merchant", path: "/" }, "desktop");
    await page.goto(`${origin(host)}/dashboard`, { waitUntil: "load", timeout: 120_000 });
    for (const path of paths) {
      const r = await page.evaluate(async (u) => {
        const res = await fetch(u, { headers: { accept: "application/json" } });
        return { status: res.status, mock: res.headers.get("x-sharwa-mock") };
      }, path);
      if (r.mock !== "1") live.push(`${host || "platform"} ${path} → ${r.status}, not the fixture`);
    }
    await page.context().close();
  }
  if (live.length) {
    console.error(
      `✗ guide screenshots come from mocks only, but these routes did not answer from a fixture:\n  - ${live.join("\n  - ")}\n` +
        "  Restart the dev server with no live module, e.g. in cmd:  set SHARWA_LIVE_MODULES=none&& npm run dev\n" +
        "  and keep Django stopped (Django-first screens otherwise show live data).",
    );
    await browser.close();
    process.exit(1);
  }
}

async function runSteps(page: Page, steps: Step[]) {
  for (const step of steps) {
    if ("click" in step) await page.click(step.click);
    else if ("fill" in step) await page.fill(step.fill, step.value);
    else if ("waitFor" in step) await page.waitForSelector(step.waitFor, { timeout: 30_000 });
    else if ("hover" in step) await page.hover(step.hover);
    else await page.waitForTimeout(step.wait);
  }
}

async function capture(browser: Browser, shot: Shot, viewport: ViewportName): Promise<string> {
  const page = await newPage(browser, shot, viewport);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    // A recipe provokes its 409 on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !(shot.recipe && /status of 409/.test(m.text()))) consoleErrors.push(m.text().slice(0, 200));
  });
  const base = origin(shot.host);
  try {
    await page.goto(`${base}${shot.path}`, { waitUntil: "networkidle", timeout: 180_000 });
    if (shot.recipe) await RECIPES[shot.recipe](page, base);
    if (shot.waitFor) await page.waitForSelector(shot.waitFor, { timeout: 30_000 });
    if (shot.steps) await runSteps(page, shot.steps);
    await page.waitForTimeout(600);
    const mask: Locator[] = [page.getByText(PHONE_RE), page.getByText(TOKEN_RE)];
    const file = join(ASSETS, `${shot.id}${VIEWPORTS[viewport].suffix}.png`);
    mkdirSync(dirname(file), { recursive: true });
    const options = { path: file, caret: "initial" as const, animations: "disabled" as const, style: HIDE_DEV_CHROME, mask, maskColor: "#cbd5e1" };
    if (shot.element) await page.locator(shot.element).first().screenshot(options);
    else await page.screenshot({ ...options, fullPage: shot.fullPage ?? false });
    if (consoleErrors.length) console.warn(`  ! ${shot.id} (${viewport}): ${consoleErrors.length} console error(s), first: ${consoleErrors[0]}`);
    return file;
  } finally {
    await page.context().close();
  }
}

async function main() {
  const shots = readManifest();
  if (LIST) {
    for (const s of shots) console.log(`${s.id}  ←  ${s.session ?? "public"}@${s.host || "platform"}${s.path}${s.recipe ? `  [${s.recipe}]` : ""}`);
    return;
  }
  if (shots.length === 0) {
    console.error(ONLY ? `✗ no entry starts with «${ONLY}»` : "✗ the manifest is empty");
    process.exit(1);
  }
  // Same override as the QA scripts: a Chromium already on disk when the bundled one is missing.
  const override = process.env.SHARWA_CHROMIUM;
  const browser = await chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
  const failures: string[] = [];
  try {
    await requireMocks(browser, shots);
    for (const shot of shots) {
      for (const viewport of shot.viewports ?? ["desktop"]) {
        try {
          const file = await capture(browser, shot, viewport);
          console.log(`✓ ${file.slice(ROOT.length + 1)}`);
        } catch (err) {
          failures.push(`${shot.id} (${viewport}): ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
          console.log(`✗ ${shot.id} (${viewport})`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(`\n${failures.length} image(s) failed:\n  - ${failures.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`\n${shots.length} entr${shots.length === 1 ? "y" : "ies"} captured from mocks.`);
}

void main();
