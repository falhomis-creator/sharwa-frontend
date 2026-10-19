/**
 * Functional + visual check for Phase 7 T159 — M28 marketplaces (Amazon / noon):
 *   - plan gate: with `marketplaces` off the hub shows the feature-off state and the BFF 403s;
 *     the console override (M46) turns it on for `noor` (restored at the end);
 *   - hub: two ROWS with their connection; noon connects with an API key never shown back;
 *     Amazon goes through the server redirect and comes back «مربوط»;
 *   - settings: saving returns the server's price preview (no local markup/FX);
 *   - listings: `needs_identifier` filter in the URL; a GTIN moves the row to `pending`;
 *     price override shows «يدوي» next to the computed price and can be removed;
 *     bulk push previews the count and creates a `catalog_push` job;
 *   - jobs: a `completed_with_errors` job offers the errors CSV; live jobs settle;
 *   - orders: FBA rows read «ينفّذه السوق»; a failed confirmation can be re-confirmed.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/marketplaces-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const CONSOLE = `http://console.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "28-marketplaces");
const ROOT = "/dashboard/channels/marketplaces";
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

async function page(browser: Browser, opts: { admin?: boolean; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768, acceptDownloads: true });
  if (opts.admin) await ctx.addCookies([{ name: "sharwa_mock_admin", value: "superuser", domain: "console.localhost", path: "/" }]);
  else await ctx.addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409|410)/.test(m.text())) consoleErrors.push(`${p.url()} :: ${m.text().slice(0, 1500)}`);
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
      return { status: r.status, json: json as Record<string, unknown>, type: r.headers.get("content-type") ?? "" };
    },
    { method, path, body },
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const admin = await page(browser, { admin: true });
  await admin.goto(`${CONSOLE}/`, { waitUntil: "domcontentloaded" });
  const override = (on: boolean | null) => api(admin, "POST", "/api/bff/platform/feature-overrides/bulk", { feature_code: "marketplaces", schema_names: ["noor"], is_enabled: on, notes: on ? "phase7 marketplaces check" : "" });

  try {
    // ── plan gate ─────────────────────────────────────────────────────────────────
    await override(false);
    const p = await page(browser);
    await p.goto(`${NOOR}${ROOT}`, { waitUntil: "load" });
    check((await p.textContent("main"))?.includes("غير متاحة في خطتك") === true, "feature off → the plan state, not the screen");
    check((await api(p, "GET", "/api/bff/marketplaces")).status === 403, "feature off → the BFF answers 403");
    await override(true);
    await p.reload({ waitUntil: "load" });
    await p.waitForSelector("[data-testid=market-row]");
    check((await p.locator("[data-testid=market-row]").count()) === 2, "the hub lists two market rows");
    await p.screenshot({ path: join(OUT, "hub-desktop.png") });

    // ── noon: API key ─────────────────────────────────────────────────────────────
    const noonRow = p.locator("[data-testid=market-row][data-market=noon]");
    if ((await noonRow.locator("[data-testid=market-conn]").getAttribute("data-status")) !== "connected") {
      await p.click("[data-testid=connect-noon]");
      await p.fill("[data-testid=noon-key]", "short");
      await p.click("[data-testid=noon-save]");
      await p.waitForSelector("[data-testid=noon-dialog] [role=alert]");
      check(true, "a short key → the server's field error");
      await p.fill("[data-testid=noon-key]", "NOON-PARTNER-KEY-1234567890");
      await p.click("[data-testid=noon-save]");
      await p.waitForSelector("[data-testid=market-row][data-market=noon] [data-testid=market-conn][data-status=connected]");
    }
    check(!(await p.textContent("main"))?.includes("1234567890"), "noon is connected and the key is not shown");

    // ── amazon: OAuth redirect ────────────────────────────────────────────────────
    await api(p, "POST", "/api/bff/marketplaces/amazon/disconnect");
    await p.reload({ waitUntil: "load" });
    await p.click("[data-testid=connect-amazon]");
    await p.waitForURL(new RegExp(`${ROOT}`));
    await p.waitForSelector("[data-testid=market-row][data-market=amazon] [data-testid=market-conn][data-status=connected]");
    check(true, "Amazon connects through the server redirect and returns «مربوط»");

    // ── settings (US-28.2) ────────────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/amazon?tab=settings`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=price-preview]");
    const before = (await p.textContent("[data-testid=price-preview]")) ?? "";
    await p.fill("[data-testid=settings-markup]", "40");
    await p.click("[data-testid=settings-save]");
    await p.waitForFunction((b) => (document.querySelector("[data-testid=price-preview]")?.textContent ?? "") !== b, before);
    const s = (await api(p, "GET", "/api/bff/marketplaces/amazon/settings")).json as { preview: { display_sample_price: string } };
    check((await p.textContent("[data-testid=price-preview]"))?.includes(s.preview.display_sample_price) === true, "the preview shown is the server's after save");
    await p.screenshot({ path: join(OUT, "settings-desktop.png") });
    await api(p, "PUT", "/api/bff/marketplaces/amazon/settings", { currency: "SAR", markup_percent: "15", fx_rate: "1", auto_push: false, inventory_sync: true, stock_buffer: 2, order_pull: true, default_order_status_id: null });

    // ── listings (US-28.3) ────────────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/amazon?tab=listings&sync_status=needs_identifier`, { waitUntil: "load" });
    // `tbody tr` also matches the skeleton rows — wait for real data.
    await p.waitForSelector("[data-testid=listings-table] [data-testid=listing-status]");
    const statuses = await p.locator("[data-testid=listing-status]").evaluateAll((els) => els.map((e) => e.getAttribute("data-status")));
    check(statuses.length > 0 && statuses.every((x) => x === "needs_identifier"), "`needs_identifier` filter from the URL");
    const firstName = await p.locator("[data-testid=listings-table] tbody tr >> nth=0 >> td >> nth=1").textContent();
    await p.locator("[data-testid=identifier-edit]").first().click();
    await p.selectOption("[data-testid=identifier-form] select", "gtin");
    await p.fill("[data-testid=identifier-value]", "6281234567890");
    await p.click("[data-testid=identifier-form] button[type=submit]");
    await p.waitForFunction((n) => !Array.from(document.querySelectorAll("[data-testid=listings-table] tbody tr")).some((tr) => tr.textContent?.includes(n ?? "§")), firstName);
    const moved = (await api(p, "GET", "/api/bff/marketplaces/amazon/listings?identifier_type=gtin&q=6281234567890")).json as { results: Array<{ sync_status: string }> };
    check(moved.results[0]?.sync_status === "pending", "a GTIN moves the listing to `pending`");

    await p.goto(`${NOOR}${ROOT}/amazon?tab=listings&sync_status=synced`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=listings-table] [data-testid=listing-status]");
    const synced = (await api(p, "GET", "/api/bff/marketplaces/amazon/listings?sync_status=synced")).json as unknown as { results: Array<{ id: number; price_override: string | null; product: { sku: string } }> };
    const target = synced.results.find((l) => !l.price_override)!;
    const row = p.locator("[data-testid=listings-table] tbody tr").filter({ hasText: target.product.sku });
    await row.locator("[data-testid=override-edit]").click();
    await row.locator("[data-testid=override-value]").fill("999.50");
    await p.keyboard.press("Enter");
    await row.getByText("يدوي · المحسوب").waitFor();
    const set1 = (await api(p, "GET", `/api/bff/marketplaces/amazon/listings?q=${target.product.sku}`)).json as unknown as { results: Array<{ id: number; price_override: string | null }> };
    check(set1.results.find((l) => l.id === target.id)?.price_override === "999.50", "a price override shows «يدوي» next to the computed price (on that listing)");
    await row.locator("[data-testid=override-remove]").click();
    await row.locator("[data-testid=override-edit]").waitFor();
    const set2 = (await api(p, "GET", `/api/bff/marketplaces/amazon/listings?q=${target.product.sku}`)).json as unknown as { results: Array<{ id: number; price_override: string | null }> };
    check(set2.results.find((l) => l.id === target.id)?.price_override === null, "the override can be removed (on that listing)");

    const boxes = p.locator("[data-testid=listings-table] tbody [aria-label='تحديد الصف']");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await p.click("[data-testid=bulk-push]");
    check((await p.textContent("[role=dialog]"))?.includes("2") === true, "bulk push previews the count");
    await p.screenshot({ path: join(OUT, "listings-push-desktop.png") });
    await p.click("[data-testid=push-confirm]");
    await p.waitForSelector("text=أُنشئت مهمة دفع");
    const jobs = (await api(p, "GET", "/api/bff/marketplaces/jobs?job_type=catalog_push")).json as { results: Array<{ id: number; status: string }> };
    check(["queued", "running"].includes(jobs.results[0]?.status ?? ""), "a `catalog_push` job is queued");

    // ── jobs (US-28.4) ────────────────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/jobs?status=completed_with_errors`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=jobs-table] [data-testid=job-status]");
    await p.locator("[data-testid=jobs-table] [data-testid=job-open]").first().click();
    await p.waitForSelector("[data-testid=job-sheet] [data-testid=job-status]");
    const csvLink = p.locator("[data-testid=job-errors-csv]");
    if (await csvLink.count()) {
      const href = (await csvLink.getAttribute("href"))!;
      const r = await api(p, "GET", href);
      check(r.status === 200 && r.type.includes("text/csv"), "errors CSV downloads through the server link");
    } else check(false, "errors CSV link present for a job with errors");
    await p.screenshot({ path: join(OUT, "job-sheet-desktop.png") });

    // ── orders (US-28.5) ──────────────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/orders`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=market-orders-table] [data-testid=confirm-status]");
    check((await p.locator("[data-testid=fba-tag]").count()) > 0, "FBA orders read «ينفّذه السوق»");
    check((await p.locator("[data-testid=market-order-link]").first().getAttribute("href"))?.startsWith("/dashboard/orders?order=") === true, "orders link to M06");
    const re = p.locator("[data-testid=reconfirm]");
    if (await re.count()) {
      await re.first().click();
      await p.waitForSelector("text=أُعيد تأكيد شحنة");
      check(true, "a failed confirmation can be re-confirmed");
    }
    await p.screenshot({ path: join(OUT, "orders-desktop.png") });

    // ── visual: mobile + dark ─────────────────────────────────────────────────────
    const mobile = await page(browser, { width: 390 });
    await mobile.goto(`${NOOR}${ROOT}/amazon?tab=listings`, { waitUntil: "load" });
    await mobile.locator("[data-testid=listing-status]:visible").first().waitFor();
    check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: listings without horizontal scroll");
    await mobile.screenshot({ path: join(OUT, "listings-mobile.png"), fullPage: true });
    await mobile.goto(`${NOOR}${ROOT}`, { waitUntil: "load" });
    await mobile.waitForSelector("[data-testid=market-row]");
    await mobile.screenshot({ path: join(OUT, "hub-mobile.png"), fullPage: true });
    const dark = await page(browser, { dark: true });
    await dark.goto(`${NOOR}${ROOT}/jobs`, { waitUntil: "load" });
    await dark.waitForSelector("[data-testid=jobs-table] [data-testid=job-status]");
    await dark.screenshot({ path: join(OUT, "jobs-desktop-dark.png") });
  } finally {
    await override(null);
  }

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ marketplaces check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
