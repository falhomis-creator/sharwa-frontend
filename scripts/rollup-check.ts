/**
 * Functional + visual check for Phase 7 T184–T186 — M43 multi-store rollup (mocks):
 *   - `/dashboard/stores`: one row per linked store, sorted by revenue by the server, the
 *     totals row equals the server's `totals` verbatim (FR-43.03 — never summed here);
 *   - a store without snapshots shows zeros + «لا بيانات مجمَّعة بعد»; provisioning → «غير متاح», no link;
 *   - the date range lives in the URL: the same link shows the same numbers (US-43.1.2);
 *   - the topbar switcher reads the same contract, marks the current store, links «كل متاجري»;
 *     switching is a full navigation to the other host (no store id in a query string);
 *   - a single-store owner: empty state, no switcher (US-43.3); staff: 403 + forbidden;
 *   - 0 console errors; no horizontal scroll at 390; screenshots.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/rollup-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const host = (s: string) => `http://${s}.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "43-stores");
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

async function page(browser: Browser, store: string, opts: { session?: "merchant" | "staff"; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session ?? "merchant", domain: `${store}.localhost`, path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (401|403|404)/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
  });
  p.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, path: string) {
  return p.evaluate(async (path) => {
    const r = await fetch(path, { headers: { accept: "application/json" } });
    return { status: r.status, json: (await r.json()) as Record<string, unknown> };
  }, path);
}

interface Rollup {
  has_account: boolean;
  stores: Array<{ schema: string; orders: number; display_revenue_sar: string; last_snapshot_date: string | null; is_available: boolean }>;
  totals: { orders: number; display_revenue_sar: string };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  const owner = await page(browser, "noor");
  await owner.goto(`${host("noor")}/dashboard/stores`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=rollup-table] [data-testid=rollup-row]");
  const data = (await api(owner, "/api/bff/merchant/stores")).json as unknown as Rollup;
  check(data.has_account && data.stores.length === 3, "the account links 3 stores");
  check((await owner.locator("[data-testid=rollup-table] [data-testid=rollup-row]").count()) === 3, "3 rows in the table");
  const firstRow = (await owner.locator("[data-testid=rollup-row]").first().textContent()) ?? "";
  check(firstRow.includes(data.stores[0]!.display_revenue_sar), "rows follow the server's order (revenue, descending)");
  check((await owner.textContent("[data-testid=rollup-total-orders]"))?.trim() === String(data.totals.orders), "the totals row = the server's `totals.orders` verbatim");
  check((await owner.textContent("[data-testid=rollup-total-revenue]"))?.trim() === data.totals.display_revenue_sar, "the revenue total = the server's text verbatim");
  const pending = owner.locator("[data-testid=rollup-row]", { hasText: "pending1" });
  const pendingText = (await pending.textContent()) ?? "";
  check(pendingText.includes("لا بيانات مجمَّعة بعد") && pendingText.includes("غير متاح"), "a store without snapshots: zeros + «لا بيانات مجمَّعة بعد», «غير متاح»");
  check((await pending.locator("[data-testid=rollup-store-link]").count()) === 0, "…and no link to it");
  const shopLink = await owner.locator("[data-testid=rollup-row]", { hasText: "shop" }).locator("[data-testid=rollup-store-link]").getAttribute("href");
  check(shopLink === `${host("shop")}/dashboard`, "another store opens on its own host (no store id in a query string)");
  await owner.screenshot({ path: join(OUT, "desktop.png"), fullPage: true });

  // URL range (FR-43.04)
  await owner.goto(`${host("noor")}/dashboard/stores?from=2026-09-01&to=2026-09-30`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=rollup-total-orders]");
  const ranged = (await api(owner, "/api/bff/merchant/stores?from=2026-09-01&to=2026-09-30")).json as unknown as Rollup;
  const shown = (await owner.textContent("[data-testid=rollup-total-orders]"))?.trim();
  check(shown === String(ranged.totals.orders) && ranged.totals.orders !== data.totals.orders, "a shared ?from&to link shows that range's server totals");
  await owner.reload({ waitUntil: "load" });
  await owner.waitForSelector("[data-testid=rollup-total-orders]");
  check((await owner.textContent("[data-testid=rollup-total-orders]"))?.trim() === shown, "…and the same numbers after a reload");

  // switcher (FR-43.05)
  await owner.goto(`${host("noor")}/dashboard`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=store-switcher]");
  await owner.click("[data-testid=store-switcher] summary");
  check((await owner.locator("[data-testid=switcher-store]").count()) === 3, "the switcher lists the account's 3 stores (same contract)");
  check((await owner.locator("[data-testid=switcher-store][aria-current]").count()) === 1, "the current store is marked");
  await owner.screenshot({ path: join(OUT, "switcher-open-desktop.png") });
  await owner.click("[data-testid=switcher-all-stores]");
  await owner.waitForURL(/\/dashboard\/stores$/);
  check(true, "«كل متاجري» opens the rollup");

  // single-store owner + staff
  const single = await page(browser, "glow");
  await single.goto(`${host("glow")}/dashboard/stores`, { waitUntil: "load" });
  await single.waitForSelector("text=هذه الصفحة لمالكي أكثر من متجر");
  check((await single.locator("[data-testid=rollup-table]").count()) === 0, "no account → the empty state, no table (US-43.3)");
  await single.screenshot({ path: join(OUT, "empty-desktop.png") });
  await single.goto(`${host("glow")}/dashboard`, { waitUntil: "load" });
  await single.waitForSelector("[data-testid=open-palette]");
  check((await single.locator("[data-testid=store-switcher]").count()) === 0, "a single-store owner gets the store name, no switcher (US-43.2.2)");
  const staff = await page(browser, "noor", { session: "staff" });
  await staff.goto(`${host("noor")}/dashboard/stores`, { waitUntil: "load" });
  await staff.waitForSelector("[data-testid=forbidden]");
  check((await api(staff, "/api/bff/merchant/stores")).status === 403, "staff: the BFF answers 403 and the page says owner-only");

  // visual
  const mobile = await page(browser, "noor", { width: 390 });
  await mobile.goto(`${host("noor")}/dashboard/stores`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=rollup-list]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: rows instead of a table, no horizontal scroll");
  await mobile.screenshot({ path: join(OUT, "mobile.png"), fullPage: true });
  const tablet = await page(browser, "noor", { width: 768 });
  await tablet.goto(`${host("noor")}/dashboard/stores`, { waitUntil: "load" });
  await tablet.waitForSelector("[data-testid=rollup-table] [data-testid=rollup-row]");
  await tablet.screenshot({ path: join(OUT, "tablet.png"), fullPage: true });
  const dark = await page(browser, "noor", { dark: true });
  await dark.goto(`${host("noor")}/dashboard/stores`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=rollup-table] [data-testid=rollup-row]");
  await dark.screenshot({ path: join(OUT, "desktop-dark.png"), fullPage: true });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ rollup check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
