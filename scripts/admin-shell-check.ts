/**
 * Functional check for Phase 6 T137 — the platform console shell (M20 US-20.1, FR-20.01,
 * FR-20.08, FR-20.09) and its integration with the merchant side:
 *   - `console.<base>` only: a store host gets 404 on the console BFF, `/_a/*` is never routable;
 *   - login (wrong password → the server sentence; superuser / operator), the gate (no session → /login);
 *   - overview: the number strip from the server, the queues, the last 50 stores;
 *   - ⌘K finds a store by schema/phone and opens `/stores/<schema>`; `G D` opens the dues;
 *   - one source of truth: a platform override flips the merchant's session feature;
 *     a zone edited in the console is the one M15 «شروة شيب» reads.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/admin-shell-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const CONSOLE = `http://console.localhost:${PORT}`;
const NOOR = `http://noor.localhost:${PORT}`;
const GLOW = `http://glow.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "20-admin");
const failures: string[] = [];
const consoleErrors: string[] = [];

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  return chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
}

async function page(browser: Browser, opts: { admin?: "superuser" | "operator"; merchant?: string; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  if (opts.admin) await ctx.addCookies([{ name: "sharwa_mock_admin", value: opts.admin, domain: "console.localhost", path: "/" }]);
  if (opts.merchant) await ctx.addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: `${opts.merchant}.localhost`, path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
  });
  p.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, method: string, path: string, body?: unknown) {
  return p.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as Record<string, unknown> };
    },
    { method, path, body },
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  // ── host isolation (FR-20.01) ─────────────────────────────────────────────────────
  const store = await page(browser, { merchant: "noor" });
  await store.goto(`${NOOR}/dashboard`, { waitUntil: "domcontentloaded" });
  check((await api(store, "GET", "/api/bff/platform/overview")).status === 404, "a store host gets 404 on /api/bff/platform/*");
  const internal = await store.goto(`${NOOR}/_a/`, { waitUntil: "domcontentloaded" });
  check(internal?.status() === 404, "`/_a/` is not routable from a store host");

  // ── gate + login ─────────────────────────────────────────────────────────────────
  const anon = await page(browser);
  await anon.goto(`${CONSOLE}/stores`, { waitUntil: "load" });
  check(new URL(anon.url()).pathname === "/login", "no console session → /login");
  check((await api(anon, "GET", "/api/bff/platform/overview")).status === 401, "the BFF answers 401 without a console session");
  const internal2 = await anon.goto(`${CONSOLE}/_a/`, { waitUntil: "domcontentloaded" });
  check(internal2?.status() === 404, "`/_a/` is not routable on the console host either");
  await anon.goto(`${CONSOLE}/login`, { waitUntil: "load" });
  await anon.fill("#username", "admin");
  await anon.fill("#password", "wrong");
  await anon.click("button[type=submit]");
  await anon.waitForSelector("[data-testid=login-error]");
  check((await anon.textContent("[data-testid=login-error]"))?.includes("غير صحيحة") === true, "wrong password → the server's sentence");
  await anon.fill("#password", "sharwa-local-demo");
  await anon.click("button[type=submit]");
  await anon.waitForURL(`${CONSOLE}/`);
  await anon.waitForSelector("[data-testid=total-stores] [data-mono]");
  check((await anon.textContent("[data-testid=admin-role]"))?.includes("مالك المنصة") === true, "superuser login lands on the overview with its role");
  const merchantCookie = (await anon.context().cookies(NOOR)).some((c) => c.name === "sharwa_mock_session");
  check(!merchantCookie, "the console session is not a merchant session");

  // ── overview (US-20.1) ───────────────────────────────────────────────────────────
  const ov = (await api(anon, "GET", "/api/bff/platform/overview")).json as { total_stores: number; display_total_sales: string; failed_stores: number; recent_stores: unknown[] };
  check((await anon.textContent("[data-testid=total-stores]"))?.replace(/\D/g, "") === String(ov.total_stores), "total stores = the server's number");
  check((await anon.textContent("[data-testid=total-sales]"))?.trim() === ov.display_total_sales, "sales shown exactly as the server formats them");
  check((await anon.locator("[data-testid=recent-stores] tbody tr").count()) === Math.min(50, ov.recent_stores.length), "the last 50 stores are listed");
  check((await anon.locator("[data-testid=failed-stores]").locator("xpath=ancestor::a").getAttribute("href")) === "/stores?status=failed", "the failed count links to the filtered stores list");
  await anon.screenshot({ path: join(OUT, "overview-desktop.png") });

  // ── ⌘K + shortcuts (FR-20.08) ────────────────────────────────────────────────────
  await anon.keyboard.press("Control+k");
  await anon.waitForSelector("[data-testid=admin-palette]");
  await anon.keyboard.type("967770000011");
  await anon.waitForSelector("[data-testid=palette-store]");
  check((await anon.locator("[data-testid=palette-store]").first().textContent())?.includes("noor") === true, "⌘K finds a store by the merchant phone");
  await anon.keyboard.press("Enter");
  await anon.waitForURL(/\/stores\/noor$/);
  check(true, "choosing it opens /stores/noor");
  await anon.locator("body").click({ position: { x: 5, y: 300 } });
  await anon.keyboard.press("g");
  await anon.keyboard.press("d");
  await anon.waitForURL(/\/dues$/);
  check(true, "`G D` opens the dues");

  // ── operator role (FR-20.09) ─────────────────────────────────────────────────────
  const ops = await page(browser, { admin: "operator" });
  await ops.goto(`${CONSOLE}/`, { waitUntil: "load" });
  check((await ops.textContent("[data-testid=admin-role]"))?.includes("مشرف تشغيلي") === true, "operator session shows its role");
  check((await api(ops, "PATCH", "/api/bff/platform/billing-settings", { commission_enabled: true })).status === 403, "operator: a billing write answers 403");
  check((await api(ops, "GET", "/api/bff/platform/plans")).status === 200, "operator: reads stay open");

  // ── one source of truth with the merchant side ──────────────────────────────────
  const merchant = await page(browser, { merchant: "glow" });
  await merchant.goto(`${GLOW}/dashboard`, { waitUntil: "domcontentloaded" });
  const before = ((await api(merchant, "GET", "/api/bff/dashboard/me")).json.features as string[] | undefined) ?? [];
  await api(anon, "POST", "/api/bff/platform/feature-overrides/bulk", { feature_code: "reports", schema_names: ["glow"], is_enabled: false, notes: "phase6 check" });
  const after = ((await api(merchant, "GET", "/api/bff/dashboard/me")).json.features as string[] | undefined) ?? [];
  check(before.includes("reports") && !after.includes("reports"), "an override in the console removes the feature from the merchant's session");
  await api(anon, "POST", "/api/bff/platform/feature-overrides/bulk", { feature_code: "reports", schema_names: ["glow"], is_enabled: null, notes: "" });
  const restored = ((await api(merchant, "GET", "/api/bff/dashboard/me")).json.features as string[] | undefined) ?? [];
  check(restored.includes("reports"), "removing the override gives it back (inherited)");

  const zones = (await api(anon, "GET", "/api/bff/platform/sharwa-ship/zones")).json as unknown as Array<{ id: number; name: string }>;
  const z = zones[0]!;
  await api(anon, "PATCH", `/api/bff/platform/sharwa-ship/zones/${z.id}`, { name: `${z.name} ✱` });
  const noorOwner = await page(browser, { merchant: "noor" });
  await noorOwner.goto(`${NOOR}/dashboard`, { waitUntil: "domcontentloaded" });
  const m15 = (await api(noorOwner, "GET", "/api/bff/shipping/sharwa-ship/zones")).json as { results?: Array<{ name: string }> };
  check(m15.results?.some((r) => r.name === `${z.name} ✱`) === true, "a zone renamed in the console is what M15 «شروة شيب» reads");
  await api(anon, "PATCH", `/api/bff/platform/sharwa-ship/zones/${z.id}`, { name: z.name });

  // ── visual: mobile + dark ───────────────────────────────────────────────────────
  const mobile = await page(browser, { admin: "superuser", width: 390 });
  await mobile.goto(`${CONSOLE}/`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=total-stores] [data-mono]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: no horizontal scroll");
  await mobile.screenshot({ path: join(OUT, "overview-mobile.png"), fullPage: true });
  await mobile.click("[data-testid=admin-drawer-open]");
  await mobile.waitForSelector("[data-testid=admin-drawer] [data-testid=admin-sidebar]");
  await mobile.screenshot({ path: join(OUT, "overview-mobile-drawer.png") });
  const dark = await page(browser, { admin: "superuser", dark: true });
  await dark.goto(`${CONSOLE}/`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=total-stores] [data-mono]");
  await dark.screenshot({ path: join(OUT, "overview-desktop-dark.png") });
  const login = await page(browser, { width: 390 });
  await login.goto(`${CONSOLE}/login`, { waitUntil: "load" });
  await login.screenshot({ path: join(OUT, "login-mobile.png") });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ admin shell check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
