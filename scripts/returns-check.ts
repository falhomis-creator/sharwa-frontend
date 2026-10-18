/**
 * Functional check for M24 — المرتجعات والخدمات اللوجستية العكسية (T123–T125) on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/returns-check.ts [port]   (default 3000)
 *
 * Owner on `noor`: the list equals `GET /api/v1/returns/?status&q` and keeps both in the URL;
 * the row opens the sheet; the create form caps quantities locally («المتبقي n», no request
 * leaves), shows the «تقديري» estimate, maps a server 400 `{line_items}` under its line and
 * lands on the new detail; the empty-items order shows the M06 hint; decisions: 409 (a stale
 * version) → the warning bar, no auto retry, «تحديث ثم إعادة المحاولة» succeeds;
 * `CashLiquidityError` verbatim + the suggestion, another location succeeds and writes the
 * `refund_restock` ledger; reject needs a note and locks the buttons; `R` shortcut; the RMA
 * path (7 steps), three keyboard-only scans with the field kept focused, a mismatch, the
 * QA decision; RMA create; the refunds log filter. Gates: `shop` is empty, the cashier is
 * forbidden on the list (403 on the API) but may scan (inventory.adjust).
 * Every return used is created fresh through the API so the check can be re-run.
 * Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = process.argv[2] ?? "3000";
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

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    // 400/403/404/409 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403|404|409)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, store: string, session: "merchant" | "staff", width = 1440) {
  const host = `${store}.localhost`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  watch(page, `${store}/${session}@${width}`);
  return { page, base: `http://${host}:${PORT}` };
}

type Json = Record<string, unknown>;
async function api<T = Json>(page: Page, path: string, init?: { method?: string; body?: Json }) {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, { method: init?.method ?? "GET", headers: { "content-type": "application/json" }, body: init?.body ? JSON.stringify(init.body) : undefined });
      return { status: res.status, body: (await res.json().catch(() => ({}))) as unknown };
    },
    { path, init },
  ) as Promise<{ status: number; body: T }>;
}

interface Item { fulfillment_item_id: number; remaining: number; quantity: number }
interface ReturnRow { id: number; status: string; version: number; order_id: number }

/** A completed order with at least `need` returnable units on one line. */
async function findReturnable(page: Page, need = 1, skip: number[] = []): Promise<{ orderId: number; items: Item[]; item: Item }> {
  const list = await api<{ results: { id: number }[] }>(page, "/api/bff/orders?status=completed&page_size=100");
  for (const o of list.body.results) {
    if (skip.includes(o.id)) continue;
    const items = await api<Item[]>(page, `/api/v1/returns/order/${o.id}/items/`);
    const item = Array.isArray(items.body) ? items.body.find((i) => i.remaining >= need) : undefined;
    if (item) return { orderId: o.id, items: items.body, item };
  }
  throw new Error("no returnable order left in the fixture");
}

async function freshReturn(page: Page, body: Partial<{ refund_method: string; restock: boolean }> = {}, skip: number[] = []): Promise<ReturnRow> {
  const { orderId, item } = await findReturnable(page, 1, skip);
  const res = await api<ReturnRow>(page, "/api/v1/returns/", {
    method: "POST",
    body: { order_id: orderId, reason: "فحص آلي", refund_method: body.refund_method ?? "store_credit", line_items: [{ fulfillment_item_id: item.fulfillment_item_id, quantity_returned: 1, restock: body.restock ?? true }] },
  });
  if (res.status !== 201) throw new Error(`create failed ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function main() {
  const browser = await launch();
  const { page, base } = await newPage(browser, "noor", "merchant");

  // ── list ↔ API, URL state, sheet ─────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/returns`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=returns-table] tbody tr");
  const all = await api<{ count: number }>(page, "/api/v1/returns/");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=returns-table] tbody tr").length === n, Math.min(20, all.body.count)).catch(() => undefined);
  const rows = await page.locator("[data-testid=returns-table] tbody tr").count();
  check(rows === Math.min(20, all.body.count), `the list renders the first DRF page of returns (${rows}/${all.body.count})`);

  const requested = await api<{ count: number; results: { customer_phone: string }[] }>(page, "/api/v1/returns/?status=requested");
  await page.locator("nav[aria-label='ملخص المرتجعات'] button", { hasText: "مطلوب" }).click();
  await page.waitForURL((u) => u.searchParams.get("status") === "requested");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=returns-table] tbody tr").length === Math.min(20, n), requested.body.count);
  check(true, `the strip's «مطلوب» lands status=requested in the URL and narrows to the API's ${requested.body.count}`);
  const phone = (requested.body.results.find((r) => r.customer_phone.startsWith("967")) ?? requested.body.results[0]!).customer_phone;
  const q = `0${phone.slice(3, 6)}`; // a local prefix like «0777» (US-24.1's Independent Test)
  const api2 = await api<{ count: number; results: { id: number }[] }>(page, `/api/v1/returns/?status=requested&q=${q}`);
  await page.getByRole("searchbox", { name: "بحث في المرتجعات" }).fill(q);
  await page.waitForURL((u) => u.searchParams.get("q") === q && u.searchParams.get("status") === "requested");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=returns-table] tbody tr").length === n, api2.body.count);
  const uiIds = await page.locator("[data-testid=returns-table] tbody tr td:first-child").allInnerTexts();
  check(api2.body.count > 0 && api2.body.results.every((r) => uiIds.some((t) => t.includes(String(r.id)))), `?status=requested&q=${q} — the UI shows the same rows as the API (${api2.body.count})`);

  await page.locator("[data-testid=returns-table] tbody tr [data-testid=return-open]").first().click();
  await page.waitForURL((u) => u.searchParams.has("return"));
  await page.waitForSelector("[data-testid=return-sheet] [data-testid=return-detail] [data-testid=return-lines]");
  check(true, "a row opens the `?return=` sheet with the lines from `returns/<pk>/`");
  await page.keyboard.press("Escape");

  // ── create: local cap, estimate, server 400 under the line, 201 → detail ──────────
  const target = await findReturnable(page, 1);
  await page.goto(`${base}/dashboard/returns/new?order=${target.orderId}`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=returnable-item]");
  const idx = target.items.findIndex((i) => i.fulfillment_item_id === target.item.fulfillment_item_id);
  const row = page.locator("[data-testid=returnable-item]").nth(idx);
  await row.locator("[data-testid=item-select]").check();
  await row.locator("[data-testid=item-qty]").fill(String(target.item.remaining + 1));
  await page.fill("[data-testid=return-reason]", "المقاس غير مناسب");
  await page.selectOption("[data-testid=return-method]", "store_credit");
  let posted = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/v1/returns/")) posted++;
  });
  await page.click("[data-testid=return-submit]");
  await row.locator("[data-testid=item-error]").waitFor();
  check((await row.locator("[data-testid=item-error]").innerText()).includes(`المتبقي ${target.item.remaining}`) && posted === 0, `quantity above remaining is stopped locally «المتبقي ${target.item.remaining}» — nothing sent`);
  await row.locator("[data-testid=item-qty]").fill("1");
  const est = await page.locator("[data-testid=return-estimate]").innerText();
  check(est.includes("تقديري — المبلغ النهائي من الخادم") && /\d+\.\d{2}/.test(est), "the estimate is shown in Mono and labelled «تقديري — المبلغ النهائي من الخادم»");

  // A concurrent return consumes the line → the server's 400 {line_items:[…]} lands under it.
  if (target.item.remaining === 1) {
    await api(page, "/api/v1/returns/", { method: "POST", body: { order_id: target.orderId, reason: "منافس", refund_method: "store_credit", line_items: [{ fulfillment_item_id: target.item.fulfillment_item_id, quantity_returned: 1, restock: false }] } });
    const [resp] = await Promise.all([page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/api/v1/returns/")), page.click("[data-testid=return-submit]")]);
    await row.locator("[data-testid=item-error]").waitFor();
    const msg = await row.locator("[data-testid=item-error]").innerText();
    check(resp.status() === 400 && /أُرجع|المتبقي/.test(msg), `a server 400 \`{line_items:[…]}\` is shown under the line it belongs to («${msg}»)`);
  } else {
    await page.click("[data-testid=return-submit]");
    await page.waitForURL(/\/dashboard\/returns\/\d+$/);
    await page.waitForSelector("[data-testid=return-detail]");
    check((await page.locator("[data-testid=return-status]").first().getAttribute("data-status")) === "requested", "201 → the new return's detail in status `requested`");
  }
  if (target.item.remaining === 1) {
    const other = await findReturnable(page, 1);
    await page.goto(`${base}/dashboard/returns/new?order=${other.orderId}`, { waitUntil: "load" });
    await page.waitForSelector("[data-testid=returnable-item]");
    const j = other.items.findIndex((i) => i.fulfillment_item_id === other.item.fulfillment_item_id);
    await page.locator("[data-testid=returnable-item]").nth(j).locator("[data-testid=item-select]").check();
    await page.fill("[data-testid=return-reason]", "المقاس غير مناسب");
    await page.selectOption("[data-testid=return-method]", "store_credit");
    await page.click("[data-testid=return-submit]");
    await page.waitForURL(/\/dashboard\/returns\/\d+$/);
    await page.waitForSelector("[data-testid=return-detail]");
    check((await page.locator("[data-testid=return-status]").first().getAttribute("data-status")) === "requested", "201 → the new return's detail in status `requested`");
  }

  const openOrder = (await api<{ results: { id: number }[] }>(page, "/api/bff/orders?status=new&page_size=1")).body.results[0]!.id;
  await page.goto(`${base}/dashboard/returns/new?order=${openOrder}`, { waitUntil: "load" });
  await page.getByText("لا عناصر قابلة للإرجاع — استخدم استرجاع المبلغ من الطلب").waitFor();
  check(true, "an order without fulfilment items → «لا عناصر قابلة للإرجاع — استخدم استرجاع المبلغ من الطلب»");

  // ── 409: a stale local version → warning bar, no auto retry, refresh-then-retry ───
  const r409 = await freshReturn(page);
  // The browser holds version n-1 while the server is at n (US-24.3 acceptance 1).
  let stale = true;
  await page.goto(`${base}/dashboard/returns`, { waitUntil: "load" });
  const snapshot = (await api<ReturnRow>(page, `/api/v1/returns/${r409.id}/`)).body;
  await page.route(`**/api/v1/returns/${r409.id}/`, async (route) => {
    if (!stale || route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", json: { ...snapshot, version: snapshot.version - 1 } });
  });
  let decisions = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes(`/returns/${r409.id}/approve/`)) decisions++;
  });
  await page.goto(`${base}/dashboard/returns/${r409.id}?decide=approve`, { waitUntil: "load" });
  await page.click("[data-testid=approve-confirm]");
  await page.waitForSelector("[data-testid=return-conflict]");
  await page.waitForTimeout(800);
  check((await page.locator("[data-testid=return-conflict]").innerText()).includes("حُدِّث الطلب من مستخدم آخر") && decisions === 1, "version behind the server → 409 bar «حُدِّث الطلب من مستخدم آخر», no automatic retry");
  check((await page.locator("[data-testid=approve-location]").inputValue()) !== "", "the chosen restock location is kept after the 409");
  stale = false;
  await page.click("[data-testid=return-conflict-retry]");
  await page.waitForSelector("[data-testid=return-status][data-status=approved]");
  check(decisions === 2, "«تحديث ثم إعادة المحاولة» reloads and resends once → approved");
  await page.unroute(`**/api/v1/returns/${r409.id}/`);
  const ledger = await api<{ results: { reason: string; reference: { type: string; id: number } | null }[] }>(page, "/api/bff/inventory/movements?reason=refund_restock&page_size=100");
  check(ledger.body.results.some((m) => m.reference?.type === "return" && m.reference.id === r409.id), "the approval wrote a `refund_restock` movement in the M21 ledger");

  // ── CashLiquidityError at location 2, another location succeeds ───────────────────
  const rCash = await freshReturn(page, { refund_method: "cash" });
  await page.goto(`${base}/dashboard/returns/${rCash.id}?decide=approve`, { waitUntil: "load" });
  await page.selectOption("[data-testid=approve-location]", "2");
  await page.click("[data-testid=approve-confirm]");
  await page.waitForSelector("[data-testid=return-liquidity]");
  const liq = await page.locator("[data-testid=return-liquidity]").innerText();
  check(liq.includes("CashLiquidityError") && liq.includes("غيّر الطريقة إلى محفظة العميل أو اختر موقعاً آخر"), "`CashLiquidityError` shown as the server sent it, with the suggestion");
  await page.selectOption("[data-testid=approve-location]", "1");
  await page.click("[data-testid=approve-confirm]");
  await page.waitForSelector("[data-testid=return-status][data-status=approved]");
  check(true, "choosing another location approves the cash return");

  // ── reject needs a note; final state shows no buttons; R shortcut ─────────────────
  const rRej = await freshReturn(page);
  await page.goto(`${base}/dashboard/returns/${rRej.id}`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=return-decision]");
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("r");
  await page.waitForSelector("[data-testid=reject-form]");
  check(true, "`R` opens the reject panel");
  await page.click("[data-testid=reject-confirm]");
  check(await page.getByText("اكتب سبب الرفض.").isVisible(), "reject without a note is refused under the field");
  await page.fill("[data-testid=reject-note]", "المنتج مستعمل");
  await page.click("[data-testid=reject-confirm]");
  await page.waitForSelector("[data-testid=return-status][data-status=rejected]");
  check((await page.locator("[data-testid=return-approve], [data-testid=return-reject]").count()) === 0, "a rejected return shows the note and no decision buttons (final)");

  // ── RMA: path, keyboard-only scans, mismatch, QA ─────────────────────────────────
  const transit = await api<{ results: { id: number; destination_location: { id: number } }[] }>(page, "/api/bff/returns/rma?status=in_transit_back&page_size=100");
  const atMain = transit.body.results.filter((r) => r.destination_location.id === 1).slice(0, 3);
  const elsewhere = transit.body.results.find((r) => r.destination_location.id !== 1);
  await page.goto(`${base}/dashboard/returns/rma`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=rma-table] tbody tr");
  check((await page.locator("[data-testid=rma-table] tbody tr").count()) > 0, "the RMA list renders");
  await page.goto(`${base}/dashboard/returns/rma/scan`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=scan-input]");
  check(await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "scan-input"), "the scan field is focused on load");
  let focusedAfterEach = true;
  for (const r of atMain) {
    await page.keyboard.type(`RMA-${r.id}`, { delay: 8 });
    await page.keyboard.press("Enter");
    await page.waitForFunction((id) => document.querySelector("[data-testid=scan-result]")?.textContent?.includes(`RMA-${id}`) ?? false, r.id);
    focusedAfterEach &&= await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "scan-input");
  }
  const okRows = await page.locator("[data-testid=scan-log-row][data-ok=true]").count();
  check(atMain.length === 3 && okRows === 3 && focusedAfterEach, `three scans in a row without the mouse — all received, field kept focus (${okRows})`);
  if (elsewhere) {
    await page.keyboard.type(String(elsewhere.id));
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-testid=scan-result][data-ok=false]");
    check(await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "scan-input"), "a mismatched destination shows the server message and the field stays focused");
  }
  const scanned = atMain[0]!.id;
  const detail = await api<{ status: string }>(page, `/api/bff/returns/rma/${scanned}`);
  check(detail.body.status === "qa_pending", "a scanned RMA moved in_transit_back → received_at_warehouse → qa_pending");
  await page.goto(`${base}/dashboard/returns/rma/${scanned}`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=rma-progress]");
  const steps = await page.locator("[data-testid=rma-progress] li").count();
  const current = await page.locator("[data-testid=rma-progress] li[aria-current=step]").getAttribute("data-step");
  check(steps === 7 && current === "qa_pending", "the detail draws the 7-step path with qa_pending as the current step");
  await page.click("[data-testid=qa-restock]");
  await page.waitForSelector("[data-testid=rma-restock-link]");
  check((await page.locator("[data-testid=rma-detail]").getAttribute("data-status")) === "restocked", "QA «إعادة للمخزون» → restocked with a link to the refund_restock movement");

  // RMA create through the sheet
  const forRma = await findReturnable(page, 1);
  await page.goto(`${base}/dashboard/returns/rma`, { waitUntil: "load" });
  await page.click("[data-testid=rma-new]");
  await page.fill("[data-testid=rma-order]", String(forRma.orderId));
  await page.click("[data-testid=rma-order-load]");
  await page.waitForSelector(`[data-testid=rma-item] option[value="${forRma.item.fulfillment_item_id}"]`, { state: "attached" });
  await page.selectOption("[data-testid=rma-item]", String(forRma.item.fulfillment_item_id));
  await page.selectOption("[data-testid=rma-reason]", "damaged");
  await page.click("[data-testid=rma-submit]");
  await page.waitForSelector("[data-testid=rma-sheet] [data-testid=rma-detail][data-status=requested]");
  check(true, "«RMA جديد» posts `returns/rma/create/` and opens the new RMA in `requested`");

  // ── refunds log ────────────────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/returns/refunds-log`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=refunds-table] tbody tr");
  const walletCount = (await api<{ count: number }>(page, "/api/bff/orders/refunds?method=wallet")).body.count;
  await page.selectOption("[data-testid=filter-method]", "wallet");
  await page.waitForURL((u) => u.searchParams.get("method") === "wallet");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=refunds-table] tbody tr").length === Math.min(50, n), walletCount);
  check(true, `the refunds log filters by method in the URL (${walletCount} wallet rows)`);

  // ── gates ────────────────────────────────────────────────────────────────────────
  const shop = await newPage(browser, "shop", "merchant");
  await shop.page.goto(`${shop.base}/dashboard/returns`, { waitUntil: "load" });
  await shop.page.getByText("لا طلبات إرجاع — تُنشأ من تفاصيل الطلب").waitFor();
  check(true, "the empty store shows «لا طلبات إرجاع — تُنشأ من تفاصيل الطلب»");

  const staff = await newPage(browser, "noor", "staff");
  await staff.page.goto(`${staff.base}/dashboard/returns`, { waitUntil: "load" });
  await staff.page.waitForSelector("[data-testid=forbidden]");
  const staffList = await api(staff.page, "/api/v1/returns/");
  check(staffList.status === 403, "the cashier sees the forbidden state and the API answers 403");
  await staff.page.goto(`${staff.base}/dashboard/returns/rma/scan`, { waitUntil: "load" });
  check(await staff.page.locator("[data-testid=scan-input]").isVisible(), "the cashier (inventory.adjust) may use the scan screen");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  console.log(`\n${failures.length === 0 && consoleErrors.length === 0 ? "ALL PASSED" : `${failures.length} failed, ${consoleErrors.length} console errors`}`);
  process.exit(failures.length || consoleErrors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
