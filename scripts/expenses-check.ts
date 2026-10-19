/**
 * Functional + visual check for Phase 7 T168 — M33 operating expenses:
 *   - grouped by month; a month with two currencies shows TWO server totals (never one sum);
 *   - client validation («قيمة المصروف موجبة دائماً») sends nothing;
 *   - keyboard entry: `N` → amount, Enter saves, toast, the form empties but keeps date/currency;
 *   - `category`/`from` in the URL reproduce the same rows in a new tab;
 *   - no edit/delete affordance; staff get the owner-only state and a 403;
 *   - 390px: «مصروف جديد» opens the bottom drawer.
 * Writes go to `glow` so the `noor` screenshots stay stable.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/expenses-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const GLOW = `http://glow.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "33-expenses");
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

async function page(browser: Browser, opts: { store: string; session?: "merchant" | "staff" | "manager"; width?: number; dark?: boolean }): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session ?? "merchant", domain: `${opts.store}.localhost`, path: "/" }]);
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
      return { status: r.status, json: (await r.json().catch(() => null)) as never };
    },
    { method, path, body },
  );
}

type List = { count: number; months: Array<{ month: string; totals: Array<{ currency: string; display_total: string }>; rows: Array<{ id: number; category: string }> }> };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  // ── ledger (US-33.2) ─────────────────────────────────────────────────────────────
  const owner = await page(browser, { store: "noor" });
  await owner.goto(`${NOOR}/dashboard/wallet/expenses`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=expense-month]");
  const list = (await api(owner, "GET", "/api/bff/expenses")).json as List;
  check((await owner.locator("[data-testid=expense-month]").count()) === list.months.length, "one section per month the server sent");
  const multi = list.months.find((m) => m.totals.length > 1)!;
  const header = owner.locator(`[data-testid=expense-month][data-month="${multi.month}"] [data-testid=month-total]`);
  check((await header.count()) === multi.totals.length && multi.totals.length > 1, "a month with two currencies shows two separate totals");
  check((await header.first().textContent())?.includes(multi.totals[0]!.display_total) === true, "the month totals are the server's strings");
  check((await owner.locator("[data-testid=expense-ledger] button", { hasText: /حذف|تعديل/ }).count()) === 0, "no edit/delete affordance (FR-33.06)");
  check((await owner.locator("[data-testid=report-link]").getAttribute("href")) === "/dashboard/reports/operating_expenses", "«عرض في التقارير» links to the M25 report");
  await owner.screenshot({ path: join(OUT, "desktop.png") });

  // ── validation + keyboard entry (US-33.1) ────────────────────────────────────────
  const writer = await page(browser, { store: "glow" });
  await writer.goto(`${GLOW}/dashboard/wallet/expenses`, { waitUntil: "load" });
  await writer.waitForSelector("[data-testid=expense-form]");
  let posted = 0;
  writer.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/api/bff/expenses")) posted++;
  });
  await writer.fill("[data-testid=expense-amount]", "0");
  await writer.click("[data-testid=expense-save]");
  await writer.waitForSelector("#expense-amount-error");
  check((await writer.textContent("#expense-amount-error"))?.includes("موجبة") === true && posted === 0, "amount 0 → «قيمة المصروف موجبة دائماً» and nothing is sent");
  await writer.fill("[data-testid=expense-amount]", "");
  await writer.locator("body").click({ position: { x: 5, y: 600 } });
  await writer.keyboard.press("n");
  check(await writer.evaluate(() => document.activeElement?.getAttribute("data-testid") === "expense-amount"), "`N` focuses the amount");
  await writer.keyboard.type("125.50");
  await writer.selectOption("[data-testid=expense-currency]", "YER_NEW");
  await writer.focus("[data-testid=expense-note]");
  await writer.keyboard.type("فحص لوحة المفاتيح");
  const date = await writer.inputValue("[data-testid=expense-date]");
  await writer.keyboard.press("Enter");
  await writer.waitForSelector("text=تم تسجيل المصروف التشغيلي.");
  check(posted === 1, "Enter in the last field saves (one POST)");
  check((await writer.inputValue("[data-testid=expense-amount]")) === "" && (await writer.inputValue("[data-testid=expense-currency]")) === "YER_NEW" && (await writer.inputValue("[data-testid=expense-date]")) === date, "the form empties but keeps the date and the currency");
  const glow = (await api(writer, "GET", "/api/bff/expenses")).json as List;
  check(glow.months.some((m) => m.rows.length > 0) && (await writer.locator("[data-testid=expense-row]", { hasText: "فحص لوحة المفاتيح" }).count()) === 1, "the new row is in the ledger");

  // ── filters in the URL (US-33.2.2) ───────────────────────────────────────────────
  const from = list.months.at(-1)!.month + "-01";
  await owner.goto(`${NOOR}/dashboard/wallet/expenses?category=rent&from=${from}`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=expense-row]");
  const rentRows = await owner.locator("[data-testid=expense-row]").allTextContents();
  const rentApi = (await api(owner, "GET", `/api/bff/expenses?category=rent&from=${from}`)).json as List;
  check(rentRows.length === rentApi.months.reduce((a, m) => a + m.rows.length, 0) && rentRows.every((t) => t.includes("إيجار")), "category=rent&from=… shows the server's rent rows only");
  const tab = await page(browser, { store: "noor" });
  await tab.goto(owner.url(), { waitUntil: "load" });
  await tab.waitForSelector("[data-testid=expense-row]");
  check((await tab.locator("[data-testid=expense-row]").count()) === rentRows.length, "the same link in a new tab gives the same rows");

  // ── staff (§10) ──────────────────────────────────────────────────────────────────
  const staff = await page(browser, { store: "noor", session: "manager" });
  await staff.goto(`${NOOR}/dashboard/wallet/expenses`, { waitUntil: "load" });
  await staff.waitForSelector("[data-testid=forbidden]");
  check((await api(staff, "GET", "/api/bff/expenses")).status === 403, "staff: owner-only screen and a 403 from the BFF");

  // ── visual: mobile drawer, tablet, dark, empty ──────────────────────────────────
  const mobile = await page(browser, { store: "noor", width: 390 });
  await mobile.goto(`${NOOR}/dashboard/wallet/expenses`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=expense-item]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: no horizontal scroll");
  await mobile.screenshot({ path: join(OUT, "mobile.png") });
  await mobile.click("[data-testid=new-expense-mobile]");
  await mobile.waitForSelector("[data-testid=expense-drawer] [data-testid=expense-form]");
  await mobile.waitForTimeout(300);
  await mobile.screenshot({ path: join(OUT, "mobile-drawer.png") });
  const tablet = await page(browser, { store: "noor", width: 820 });
  await tablet.goto(`${NOOR}/dashboard/wallet/expenses`, { waitUntil: "load" });
  await tablet.waitForSelector("[data-testid=expense-month]");
  await tablet.screenshot({ path: join(OUT, "tablet.png") });
  const dark = await page(browser, { store: "noor", dark: true });
  await dark.goto(`${NOOR}/dashboard/wallet/expenses`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=expense-month]");
  await dark.screenshot({ path: join(OUT, "desktop-dark.png") });
  const empty = await page(browser, { store: "shop" });
  await empty.goto(`http://shop.localhost:${PORT}/dashboard/wallet/expenses`, { waitUntil: "load" });
  await empty.waitForSelector("text=لا مصروفات مسجَّلة بعد");
  await empty.screenshot({ path: join(OUT, "desktop-empty.png") });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ expenses check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
