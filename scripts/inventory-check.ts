/**
 * Functional check for M21 — المخزون (T118) on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/inventory-check.ts [port]   (default 3000)
 *
 * On `noor` as the merchant: the «منخفض» strip count matches `GET /counters` and the filtered
 * list; the location filter switches the header to «المصدر: مخزون الموقع»; a +12 restock from
 * the adjust panel updates the row at once and lands in the ledger with its note; a decrease
 * without a note is blocked client-side (submit disabled) AND server-side (400 `note`);
 * a write-off request creates a pending approval and bumps the nav count. As staff (cashier):
 * the table is visible, the cost column and CSV export are not, and «طلب إعدام» is disabled
 * (POST → 403). Exit 1 on any failed assertion or console error.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
const DOCS = join(process.cwd(), "docs", "visual-checks", "21-inventory");
const failures: string[] = [];
const consoleErrors: string[] = [];

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  try {
    return await chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
  } catch (err) {
    if (override && existsSync(override)) throw err;
    throw new Error(`Chromium not found — set SHARWA_CHROMIUM. (${String(err)})`);
  }
}

async function context(browser: Browser, session: "merchant" | "staff"): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar" });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: "noor.localhost", path: "/" }]);
  return ctx;
}

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    // The 400/403 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

/** The dev server restarts while other work compiles; retry a refused/reset navigation. */
async function go(page: Page, url: string, opts: Parameters<Page["goto"]>[1] = { waitUntil: "load", timeout: 120_000 }) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await page.goto(url, opts);
    } catch (err) {
      if (attempt >= 4 || !/ERR_CONNECTION_(REFUSED|RESET)|ERR_EMPTY_RESPONSE|Timeout/.test(String(err))) throw err;
      await page.waitForTimeout(8_000 * attempt);
    }
  }
}

async function api<T>(page: Page, method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, text: await r.text() };
    },
    { method, path, body },
  );
  return { status: res.status, data: (res.text ? JSON.parse(res.text) : null) as T };
}

type Counters = { low: number; out: number; in_stock: number; pending_writeoffs: number };
type Unit = { product_id: number; variant_id: number | null; name: string; stock: string; is_serialized: boolean; is_bundle: boolean; is_auction: boolean; variants: Unit[] };
type List = { count: number; multi_location: boolean; source: string; results: Unit[] };

async function main() {
  mkdirSync(DOCS, { recursive: true });
  const browser = await launch();
  const merchant = await context(browser, "merchant");
  const page = await merchant.newPage();
  watch(page, "merchant");

  // ── 1. Strip counts = counters = filtered list ─────────────────────────────────────────
  await go(page, `${BASE}/dashboard/inventory`);
  await page.waitForSelector("[data-testid=inventory-table]");
  await page.waitForFunction(() => /\d/.test(document.querySelector("nav[aria-label=\"ملخص المخزون\"]")?.textContent ?? ""), undefined, { timeout: 60_000 });
  const counters = (await api<Counters>(page, "GET", "/api/bff/inventory/counters")).data;
  const stripLow = await page.getByRole("button", { name: /^منخفض/ }).innerText();
  check(stripLow.replace(/\D/g, "") === String(counters.low), `strip «منخفض» shows ${counters.low} (counters)`);
  await page.getByRole("button", { name: /^منخفض/ }).click();
  await page.waitForURL(/status=low/);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("[data-testid=inventory-table] tbody tr");
  const lowList = (await api<List>(page, "GET", "/api/bff/inventory?status=low")).data;
  check(lowList.count === counters.low, `GET ?status=low count ${lowList.count} = counters.low`);
  check(lowList.results.every((r) => Number(r.stock) > 0), "every low row still has stock > 0");
  const rows = await page.locator("[data-testid=inventory-table] tbody tr").count();
  check(rows === lowList.count, `table shows ${rows} rows for the low filter`);

  // ── 2. Location filter → location source ──────────────────────────────────────────────
  await go(page, `${BASE}/dashboard/inventory?location=2`);
  await page.waitForSelector("[data-testid=source-hint]", { timeout: 60_000 }).catch(() => undefined);
  check((await page.locator("[data-testid=source-hint]").count()) === 1, "location filter shows «المصدر: مخزون الموقع»");
  check((await page.getByRole("columnheader", { name: "المتاح" }).count()) === 1, "location view has the «المتاح» column");

  // ── 3. Expand variants without a request ──────────────────────────────────────────────
  await go(page, `${BASE}/dashboard/inventory`);
  await page.waitForSelector("[data-testid=expand-variants]");
  const before = await page.locator("[data-testid=inventory-table] tbody tr").count();
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/bff/inventory?")) requests += 1;
  });
  await page.locator("[data-testid=expand-variants]").first().click();
  await page.waitForTimeout(300);
  const after = await page.locator("[data-testid=inventory-table] tbody tr").count();
  check(after > before && requests === 0, `expanding a parent adds ${after - before} variant rows with no list request`);

  // ── 4. Restock +12 from the panel: row + ledger ───────────────────────────────────────
  const list = (await api<List>(page, "GET", "/api/bff/inventory?page_size=100")).data;
  const simple = list.results.find((r) => !r.variants.length && !r.is_serialized && !r.is_bundle && !r.is_auction && Number(r.stock) > 5)!;
  await go(page, `${BASE}/dashboard/inventory?q=${encodeURIComponent(simple.name)}`);
  await page.waitForSelector("[data-testid=qty-button]");
  await page.locator("[data-testid=qty-button]").first().click();
  await page.waitForSelector("[data-testid=adjust-sheet]");
  await page.fill("[data-testid=adjust-value]", "+12");
  await page.selectOption("[data-testid=adjust-reason]", "restock");
  await page.fill("[data-testid=adjust-note]", "وصلت شحنة المورد");
  await page.screenshot({ path: join(DOCS, "adjust-filled.png") });
  await page.click("[data-testid=adjust-submit]");
  await page.waitForSelector("[data-testid=adjust-sheet]", { state: "detached", timeout: 60_000 });
  const expected = String(Math.trunc(Number(simple.stock)) + 12);
  await page.waitForFunction((v) => document.querySelector("[data-testid=qty-button]")?.textContent?.trim() === v, expected);
  check(true, `row shows ${expected} right after +12 (${simple.name})`);
  const fresh = (await api<List>(page, "GET", `/api/bff/inventory?q=${encodeURIComponent(simple.name)}`)).data.results[0];
  check(Math.trunc(Number(fresh.stock)) === Number(expected), "server quantity matches after refetch");
  await go(page, `${BASE}/dashboard/inventory/movements?product=${simple.product_id}`);
  await page.waitForSelector("[data-testid=movements-table] tbody tr [data-testid=delta]", { timeout: 60_000 });
  const firstRow = page.locator("[data-testid=movements-table] tbody tr").first();
  const firstText = await firstRow.innerText();
  check(/\+12/.test(firstText) && firstText.includes("إعادة تعبئة") && firstText.includes("وصلت شحنة المورد"), "ledger's newest row is the +12 restock with its note");
  await page.screenshot({ path: join(DOCS, "movements-after-restock.png") });

  // ── 5. Decrease without a note is blocked (client + server) ──────────────────────────
  await go(page, `${BASE}/dashboard/inventory?q=${encodeURIComponent(simple.name)}`);
  await page.waitForSelector("[data-testid=qty-button]");
  await page.locator("[data-testid=qty-button]").first().click();
  await page.waitForSelector("[data-testid=adjust-sheet]");
  await page.fill("[data-testid=adjust-value]", "-3");
  check(await page.locator("[data-testid=adjust-submit]").isDisabled(), "decrease without a note: submit disabled client-side");
  const dec = await api<{ note?: string[] }>(page, "POST", "/api/bff/inventory/adjustments", { product_id: simple.product_id, location_id: 1, delta: "-3", reason: "manual_adjust", note: "" });
  check(dec.status === 400 && Array.isArray(dec.data?.note), "server rejects a decrease without a note (400 note)");
  await page.keyboard.press("Escape");

  // ── 6. Serialized products are managed by units ──────────────────────────────────────
  const serialized = list.results.find((r) => r.is_serialized)!;
  await go(page, `${BASE}/dashboard/inventory?q=${encodeURIComponent(serialized.name)}`);
  await page.waitForSelector("[data-testid=inventory-table] tbody tr", { timeout: 60_000 });
  await page.getByRole("link", { name: "إدارة الوحدات" }).waitFor({ timeout: 60_000 }).catch(() => undefined);
  check((await page.locator("[data-testid=qty-button]").count()) === 0 && (await page.getByRole("link", { name: "إدارة الوحدات" }).count()) === 1, "serialized row has no adjust button, offers «إدارة الوحدات»");
  await page.getByRole("link", { name: "إدارة الوحدات" }).click();
  await page.waitForURL(/inventory\/items\?product=/);
  await page.waitForSelector("[data-testid=serial]", { timeout: 60_000 });
  check((await page.locator("[data-testid=serial]").count()) > 0, "items screen lists the product's serials");

  // ── 7. Write-off → pending approval ───────────────────────────────────────────────────
  await go(page, `${BASE}/dashboard/inventory/writeoffs`);
  await page.waitForSelector("[data-testid=writeoffs-summary]");
  const pendingBefore = (await api<Counters>(page, "GET", "/api/bff/inventory/counters")).data.pending_writeoffs;
  await page.click("[data-testid=new-writeoff]");
  await page.waitForSelector("[data-testid=writeoff-sheet]");
  await page.waitForFunction(() => ((document.querySelector("[data-testid=writeoff-unit]") as HTMLSelectElement | null)?.options.length ?? 0) > 1);
  await page.selectOption("[data-testid=writeoff-unit]", `${simple.product_id}:0`);
  await page.fill("[data-testid=writeoff-quantity]", "2");
  await page.click("[data-testid=writeoff-submit]");
  check((await page.locator("[data-testid=writeoff-form] [role=alert], [data-testid=writeoff-form] p.text-destructive").count()) >= 1, "write-off without a note is blocked");
  await page.fill("[data-testid=writeoff-note]", "تالف أثناء النقل");
  await page.click("[data-testid=writeoff-submit]");
  await page.waitForSelector("[data-testid=writeoff-sheet]", { state: "detached", timeout: 60_000 });
  await page.waitForFunction((n) => (document.querySelector("[data-testid=writeoffs-summary]")?.textContent ?? "").includes(String(n)), pendingBefore + 1);
  const pendingAfter = (await api<Counters>(page, "GET", "/api/bff/inventory/counters")).data.pending_writeoffs;
  check(pendingAfter === pendingBefore + 1, `write-off created a pending approval (${pendingBefore} → ${pendingAfter})`);
  const approvals = (await api<{ results?: Array<{ request_type: string; status: string }> } | Array<{ request_type: string; status: string }>>(page, "GET", "/api/bff/approvals?status=pending")).data;
  const items = Array.isArray(approvals) ? approvals : (approvals?.results ?? []);
  check(items.some((a) => a.request_type === "stock_writeoff" && a.status === "pending"), "the approval shows under /api/bff/approvals as stock_writeoff");
  check((await page.locator("[data-testid=writeoff-status]").first().innerText()) === "بانتظار الموافقة", "newest write-off row is «بانتظار الموافقة»");
  await page.screenshot({ path: join(DOCS, "writeoffs-after-request.png"), fullPage: true });
  const stockAfter = (await api<List>(page, "GET", `/api/bff/inventory?q=${encodeURIComponent(simple.name)}`)).data.results[0];
  check(stockAfter.stock === fresh.stock, "a pending write-off does not touch the quantity");

  // ── 8. Empty store ────────────────────────────────────────────────────────────────────
  const shop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar" });
  await shop.addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: "shop.localhost", path: "/" }]);
  const sp0 = await shop.newPage();
  watch(sp0, "shop");
  await go(sp0, `http://shop.localhost:${PORT}/dashboard/inventory`);
  await sp0.waitForSelector("text=لا منتجات بعد", { timeout: 60_000 });
  check((await sp0.getByText("لا منتجات بعد").count()) === 1, "empty store shows the first-product empty state");
  await shop.close();

  // ── 9. Staff (cashier) ────────────────────────────────────────────────────────────────
  const staff = await context(browser, "staff");
  const sp = await staff.newPage();
  watch(sp, "staff");
  await go(sp, `${BASE}/dashboard/inventory`);
  await sp.waitForSelector("[data-testid=inventory-table] tbody tr", { timeout: 60_000 });
  check((await sp.getByRole("columnheader", { name: "التكلفة" }).count()) === 0, "staff without reports.profit.view sees no cost column");
  check((await sp.locator("[data-testid=export-csv]").count()) === 0, "staff without reports.export has no CSV link");
  await sp.waitForSelector("[data-testid=qty-button]", { timeout: 60_000 }).catch(() => undefined);
  check((await sp.locator("[data-testid=qty-button]").count()) > 0, "staff with inventory.adjust can open the panel");
  await go(sp, `${BASE}/dashboard/inventory/writeoffs`);
  await sp.waitForSelector("[data-testid=writeoffs-summary]");
  check((await sp.locator("[data-testid=new-writeoff-disabled]").count()) === 1, "staff without inventory.writeoff sees «طلب إعدام» disabled");
  const forbidden = await api(sp, "POST", "/api/bff/inventory/writeoffs", { product_id: simple.product_id, location_id: 1, quantity: "1", note: "x" });
  check(forbidden.status === 403, "POST writeoffs as staff → 403");
  const csv = await api(sp, "GET", "/api/bff/inventory/export.csv");
  check(csv.status === 403, "GET export.csv as staff → 403");
  await sp.screenshot({ path: join(DOCS, "staff-writeoffs.png"), fullPage: true });

  await browser.close();

  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  if (failures.length || consoleErrors.length) {
    console.log(`\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
    process.exit(1);
  }
  console.log("\n✓ M21 inventory check passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
