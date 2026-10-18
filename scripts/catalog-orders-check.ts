/**
 * Functional check for Phase 3D (T081) — M04 · M05 · M06 · M48 · M49 on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/catalog-orders-check.ts [port]   (default 3000)
 *
 * The US1 scenario end to end, on the `noor` store as the merchant:
 *   1. a product with variants (quick add → generate S/M × colour → stock per variant),
 *   2. a phone order for one of its variants from `/dashboard/orders/new`,
 *   3. the order is in the list (`?q=<id>`), its fulfilment moves قيد التجهيز → قيد التوصيل
 *      → مكتمل and the financial axis follows to «مكتمل».
 * Then the edges a screenshot cannot prove: the 409 conflict panel and its retry (FR-06.06),
 * the category tree (pointer nesting + keyboard reorder, aria-live), staff read-only,
 * Ctrl+K by `event.code` (Arabic layout), `#id` → Enter, Tab → order commands, Esc, and the
 * bell (optimistic read, `?kind=` filter, focus back to the bell).
 *
 * Screenshots of the interactive states → docs/visual-checks/{05-organization,06-orders,
 * 48-command-palette,49-notifications}/. Exit 1 on any failed assertion or console error.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const HOST = `noor.localhost:${PORT}`;
const BASE = `http://${HOST}`;
const DOCS = join(process.cwd(), "docs", "visual-checks");
const failures: string[] = [];
const consoleErrors: string[] = [];

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

function out(slug: string, name: string) {
  const dir = join(DOCS, slug);
  mkdirSync(dir, { recursive: true });
  return join(dir, `${name}.png`);
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

async function context(browser: Browser, session: "merchant" | "staff", width = 1440): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: "noor.localhost", path: "/" }]);
  return ctx;
}

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    // The 409 of step 4 is provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of 409/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

/** Browser-side fetch (Node cannot resolve `*.localhost`; Chromium can) — same cookies. */
async function api<T>(page: Page, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { ok: r.ok, status: r.status, text: await r.text() };
    },
    { method, path, body },
  );
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${res.text}`);
  return JSON.parse(res.text) as T;
}

async function pickFulfillment(page: Page, orderId: number, name: string) {
  await page.click(`[data-testid=fulfillment-trigger-${orderId}]`);
  await page.getByRole("menuitem", { name: new RegExp(`^${name}`) }).click();
}

async function main() {
  const browser = await launch();
  const merchant = await context(browser, "merchant");
  const page = await merchant.newPage();
  watch(page, "merchant");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });

  // ── 1. Product with variants (API — the editor itself is covered by M04's own screens) ──
  const productName = `قميص فحص ${Date.now() % 100000}`;
  const { id: productId } = await api<{ id: number }>(page, "POST", "/api/bff/products/quick", { name: productName, price: "120.00", stock: "0" });
  const attrs = await api<Array<{ id: number; name: string; options: Array<{ id: number; value: string }> }>>(page, "GET", "/api/bff/products/variant-attributes");
  const size = attrs.find((a) => a.name === "المقاس") ?? attrs[0]!;
  const optionIds = size.options.slice(0, 2).map((o) => o.id);
  const variants = await api<Array<{ id: number; label: string }>>(page, "POST", `/api/bff/products/${productId}/variants/generate`, {
    attribute_ids: [size.id],
    option_ids: optionIds,
    exclude: [],
  });
  check(variants.length === 2, `product #${productId} has 2 generated variants (${variants.map((v) => v.label).join(", ")})`);
  await api(page, "POST", `/api/bff/products/${productId}/variants/bulk`, { variants: variants.map((v) => ({ id: v.id, stock: "5" })) });

  // ── 2. Phone order for that variant ────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/orders/new`, { waitUntil: "networkidle" });
  await page.getByLabel("بحث عن منتج").fill(productName);
  const resultRow = page.locator("[data-testid=new-order-results] li", { hasText: productName });
  await resultRow.waitFor({ timeout: 10_000 });
  await resultRow.getByRole("button").click();
  await page.getByLabel(`متغير «${productName}»`).selectOption({ index: 1 });
  await page.fill("#o-phone", "0501234567");
  await page.fill("#o-name", "عميل الفحص");
  await page.fill("#o-address", "الرياض، حي الملقا، شارع 5");
  await page.screenshot({ path: out("06-orders", "new-order-filled"), fullPage: true });
  await page.click("[data-testid=create-order]");
  await page.waitForURL(/\/dashboard\/orders\/\d+$/, { timeout: 15_000 });
  const orderId = Number(/orders\/(\d+)$/.exec(page.url())![1]);
  await page.waitForSelector("[data-testid=order-detail]");
  check(orderId > 0, `phone order #${orderId} created and opened`);
  check((await page.locator("[data-testid=order-items]").textContent())?.includes(productName) ?? false, "order lists the variant product");

  // ── 3. In the list, then through the workflow to «مكتمل» ───────────────────────────────
  const listPage = await merchant.newPage();
  watch(listPage, "list");
  await listPage.goto(`${BASE}/dashboard/orders?q=${orderId}`, { waitUntil: "networkidle" });
  check((await listPage.locator(`[data-testid=orders-table] >> text=#${orderId}`).count()) > 0, "new order appears in the orders list");
  await listPage.close();

  for (const step of ["قيد التجهيز", "قيد التوصيل", "مكتمل"]) {
    await pickFulfillment(page, orderId, step);
    await page.waitForFunction((n) => document.querySelector("[data-testid=order-detail] [data-testid=fulfillment-status]")?.getAttribute("data-status-name") === n, step, { timeout: 8_000 });
  }
  const financial = await page.locator("header [data-testid=financial-status]").first().getAttribute("data-status");
  check(financial === "completed", `financial axis followed «مكتمل» (status=${financial})`);
  await page.screenshot({ path: out("06-orders", "order-completed"), fullPage: true });

  // ── 4. 409 conflict panel + retry ──────────────────────────────────────────────────────
  const candidates = await api<{ results: Array<{ id: number; version: number; locked_reason: string | null; fulfillment_status: { name: string } | null }> }>(
    page,
    "GET",
    "/api/bff/orders?status=new&page_size=20",
  );
  const target = candidates.results.find((o) => !o.locked_reason && o.id !== orderId && o.fulfillment_status?.name !== "قيد التوصيل")!;
  await page.goto(`${BASE}/dashboard/orders/${target.id}`, { waitUntil: "networkidle" });
  const statuses = await api<Array<{ id: number; name: string }>>(page, "GET", "/api/bff/order-statuses");
  const preparing = statuses.find((s) => s.name === "قيد التجهيز")!;
  const delivering = statuses.find((s) => s.name === "قيد التوصيل")!;
  // Another user moves the order first (version bump the page does not know about).
  const other = target.fulfillment_status?.name === preparing.name ? statuses.find((s) => s.name === "قيد الانتظار")! : preparing;
  await api(page, "POST", `/api/bff/orders/${target.id}/fulfillment-status`, { status_id: other.id, version: target.version });
  await pickFulfillment(page, target.id, delivering.name);
  await page.waitForSelector("[data-testid=conflict-panel]", { timeout: 8_000 });
  check(true, "409 → conflict panel «حُدِّث الطلب من مستخدم آخر»");
  await page.screenshot({ path: out("06-orders", "conflict-409"), fullPage: false });
  await page.click("[data-testid=conflict-retry]");
  await page.waitForSelector("[data-testid=conflict-panel]", { state: "detached", timeout: 8_000 });
  const finalName = await page.locator("[data-testid=order-detail] [data-testid=fulfillment-status]").first().getAttribute("data-status-name");
  check(finalName === "قيد التوصيل", `retry re-applied the change on the fresh version (now «${finalName}»)`);

  // ── 5. Category tree: pointer nesting, keyboard reorder, aria-live ─────────────────────
  await page.goto(`${BASE}/dashboard/products/categories`, { waitUntil: "networkidle" });
  // Mock state lives as long as the dev server, so the rows are picked live.
  const rows = await page.locator("[data-testid=category-row]").evaluateAll((els) =>
    els.map((e) => ({ name: e.getAttribute("data-name")!, depth: Number(e.getAttribute("data-depth")) })),
  );
  // A leaf (next row not deeper) whose row above is at least as deep → it can go one level down.
  const leafIndex = rows.findLastIndex((r, i) => i > 0 && (rows[i + 1]?.depth ?? 0) <= r.depth && rows[i - 1]!.depth >= r.depth);
  const startDepth = rows[leafIndex]!.depth;
  const leafName = rows[leafIndex]!.name;
  const leaf = page.locator(`[data-testid=category-row][data-name="${leafName}"]`);
  const handle = leaf.locator("[data-testid=drag-handle]");
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 6, box.y + 12, { steps: 3 });
  await page.mouse.move(box.x - 30, box.y + 12, { steps: 8 }); // RTL: deeper = towards the left
  await page.waitForTimeout(150);
  check((await page.locator("[data-testid=drop-indicator]").count()) === 1, "drag shows the 1px drop indicator");
  await page.screenshot({ path: out("05-organization", "tree-dragging") });
  await page.mouse.up();
  await page.waitForTimeout(900);
  check(Number(await leaf.getAttribute("data-depth")) === startDepth + 1, `dragging «${leafName}» towards the indent nests it one level`);
  const names = () => page.locator("[data-testid=category-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-name")));
  const beforeOrder = await names();
  const mover = beforeOrder.find((n, i) => i > 1 && n !== leafName && n !== beforeOrder[0])!;
  const kh = page.locator(`[data-testid=category-row][data-name="${mover}"] [data-testid=drag-handle]`);
  await kh.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");
  await page.waitForTimeout(800);
  const afterOrder = await names();
  check(afterOrder.join("|") !== beforeOrder.join("|"), `keyboard Space/↑/Space moves «${mover}»`);
  const live = (await page.locator("[id^=DndLiveRegion]").allTextContents()).join(" ");
  check(/أُفلت/.test(live), "the drop is announced in Arabic through aria-live");

  // ── 6. Command palette ─────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/products`, { waitUntil: "networkidle" });
  // An Arabic layout types «ن» on the K key — the shortcut listens to `event.code`.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ن", code: "KeyK", ctrlKey: true, bubbles: true })));
  await page.waitForSelector("[data-testid=palette-input]", { timeout: 5_000 });
  check(true, "Ctrl+K opens the palette by event.code (Arabic layout)");
  await page.keyboard.type(`#${orderId}`);
  await page.locator("[data-testid=palette-order]").first().waitFor({ timeout: 5_000 });
  await page.screenshot({ path: out("48-command-palette", "order-results") });
  await page.keyboard.press("Enter");
  await page.waitForURL(new RegExp(`/dashboard/orders/${orderId}$`), { timeout: 8_000 });
  check(true, "`#id` → Enter opens the order");
  await page.waitForSelector("[data-testid=order-detail]");
  await page.keyboard.press("Control+KeyK");
  await page.waitForSelector("[data-testid=palette-input]");
  await page.keyboard.press("Tab");
  await page.locator("[data-testid=palette-status]").first().waitFor({ timeout: 5_000 });
  check((await page.locator("[data-testid=palette-status]").count()) >= 3, "Tab on an order page → contextual fulfilment commands");
  await page.screenshot({ path: out("48-command-palette", "order-commands") });
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(150);
  check((await page.locator("[data-testid=palette-status]").count()) === 0, "Backspace on an empty query goes back to the root");
  await page.keyboard.type("zzqqxx");
  await page.waitForSelector("[data-testid=palette-no-server]", { timeout: 5_000 });
  await page.screenshot({ path: out("48-command-palette", "no-results") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check((await page.locator("[data-testid=palette-input]").count()) === 0, "Esc closes the palette");

  // ── 7. Notifications ───────────────────────────────────────────────────────────────────
  const before = Number((await page.locator("[data-testid=bell-count]").textContent())?.replace(/\D/g, "") ?? 0);
  await page.click("[data-testid=notification-bell]");
  await page.waitForSelector("[data-testid=notification-list]");
  await page.screenshot({ path: out("49-notifications", "panel-open") });
  const kindFilter = page.locator('[data-testid^=notif-filter-]:not([data-testid$="-all"]):not([data-testid$="-unread"])').first();
  const kindKey = (await kindFilter.getAttribute("data-testid"))!.replace("notif-filter-", "");
  await kindFilter.click();
  await page.waitForTimeout(400);
  check(page.url().includes(`kind=${kindKey}`), `kind filter lives in the URL (?kind=${kindKey})`);
  await page.click("[data-testid=read-all]");
  await page.waitForTimeout(300);
  const after = Number((await page.locator("[data-testid=bell-count]").textContent().catch(() => "0"))?.replace(/\D/g, "") ?? 0);
  check(after < before, `read-all (${kindKey}) updates the count optimistically (${before} → ${after})`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check((await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) === "notification-bell", "Esc returns focus to the bell");

  // ── 8. Staff read-only ─────────────────────────────────────────────────────────────────
  const staff = await context(browser, "staff");
  const sp = await staff.newPage();
  watch(sp, "staff");
  await sp.goto(`${BASE}/dashboard/products/categories`, { waitUntil: "networkidle" });
  await sp.waitForSelector("[data-testid=category-row]");
  check((await sp.locator("[data-testid=drag-handle]").count()) === 0 && (await sp.locator("[data-testid=new-category]").count()) === 0, "staff (cashier) sees the tree read-only");
  await sp.screenshot({ path: out("05-organization", "staff-readonly"), fullPage: true });
  await sp.goto(`${BASE}/dashboard/orders`, { waitUntil: "networkidle" });
  check((await sp.locator("[data-testid=orders-table]").count()) === 1, "cashier with orders.view sees the orders list");

  await browser.close();

  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  if (failures.length || consoleErrors.length) {
    console.log(`\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
    process.exit(1);
  }
  console.log("\n✓ Phase 3D functional check passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
