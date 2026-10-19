/**
 * Functional + visual check for Phase 7 T142–T144 — M16 POS (`(pos)` group, mocks):
 *   - gate: no session → the staff login with next=/pos; `/_p/*` is never routable;
 *   - open (US-16.1): registers of the cashier's location only, «مشغول باسم الموظف»,
 *     the force-close notice (US-16.4.4), opening float → the sale screen; resume on return;
 *   - sell (US-16.2): barcode + Enter adds the line (≤ 300ms budget logged), unknown barcode
 *     sentence, the total is the server's quote, discount over the role's ceiling opens the
 *     approval path (SC-16.4) and the manager code completes it, the receipt shows;
 *   - the receipt is an M06 order (`sales_channel=pos`); idempotency: a replayed key returns
 *     the first order (SC-16.3); offline: banner + one re-send on reconnect, no duplicate;
 *   - drawer (US-16.4.1): cash out with a reason appears with its Arabic label and signed amount;
 *   - refund: hidden without `orders.refund`; the manager's large refund asks for an OTP (428);
 *   - close (US-16.4.2): a shortage → «بانتظار اعتماد المدير» + an M18 `shift_shortage`
 *     approval; the owner resolves it and the cashier can open again;
 *   - 0 console errors; no horizontal scroll at 390/768/1440; screenshots.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/pos-check.ts [port]   (default 3000)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "16-pos");
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

type Kind = "merchant" | "staff" | "manager";
async function page(browser: Browser, opts: { session?: Kind; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : width < 1024 ? 1024 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 1024 });
  if (opts.session) await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session, domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409|428|429)|ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
  });
  p.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return p.evaluate(
    async ({ method, path, body, headers }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as any };
    },
    { method, path, body, headers },
  );
}

const noHScroll = (p: Page) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

interface Product { id: number; stock: string; barcode: string; out_of_stock: boolean; has_variants: boolean; is_serialized: boolean; max_quantity: number | null; min_quantity: number | null; display_price: string }

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  // ── reset + gate ─────────────────────────────────────────────────────────────────
  const owner = await page(browser, { session: "merchant" });
  await owner.goto(`${NOOR}/dashboard`, { waitUntil: "domcontentloaded" });
  check((await api(owner, "POST", "/api/bff/pos/__reset")).status === 204, "mock POS state reset (reruns start equal)");

  const anon = await page(browser);
  await anon.goto(`${NOOR}/pos`, { waitUntil: "load" });
  check(new URL(anon.url()).pathname === "/dashboard/login" && new URL(anon.url()).searchParams.get("next") === "/pos", "no session → /dashboard/login?next=/pos");
  const internal = await anon.goto(`${NOOR}/_p/noor/pos`, { waitUntil: "domcontentloaded" });
  check(internal?.status() === 404, "`/_p/*` is not routable from the network");

  // ── open a shift (US-16.1) ──────────────────────────────────────────────────────
  const cashier = await page(browser, { session: "staff", width: 1024 });
  await cashier.goto(`${NOOR}/pos`, { waitUntil: "load" });
  await cashier.waitForSelector("[data-testid=pos-registers]");
  check(await cashier.isVisible("[data-testid=pos-force-closed]"), "a force-closed shift is announced before a new one (US-16.4.4)");
  const busy = (await cashier.textContent("[data-testid=pos-register-2]")) ?? "";
  check(busy.includes("مشغول") && busy.includes("خالد الشهري"), "a register with another cashier's open shift shows «مشغول — <name>»");
  check(await cashier.isDisabled("[data-testid=pos-register-2]"), "…and cannot be opened a second time");
  check((await cashier.locator("[data-testid^=pos-register-]").count()) === 2, "only the active registers of the cashier's location (2) are listed");
  check(!(await cashier.isVisible("[data-testid=pos-register-3]")), "a register of another location is not listed");
  await cashier.screenshot({ path: join(OUT, "open-shift-tablet.png") });
  await cashier.click("[data-testid=pos-register-1]");
  await cashier.fill("#opening-float", "200.00");
  await cashier.click("[data-testid=pos-open-submit]");
  await cashier.waitForURL(/\/pos\/sell$/);
  await cashier.waitForSelector("[data-testid=pos-grid]");
  check(((await cashier.textContent("[data-testid=pos-shift-line]")) ?? "").includes("كاشير 1"), "the sale screen names the register, location and opening time (FR-16.02)");
  await cashier.screenshot({ path: join(OUT, "sell-empty-tablet.png") });
  await cashier.goto(`${NOOR}/pos`, { waitUntil: "load" });
  await cashier.waitForURL(/\/pos\/sell$/);
  check(true, "returning to /pos resumes the open shift (US-16.1.3)");

  // ── sell (US-16.2) ───────────────────────────────────────────────────────────────
  const search = (await api(cashier, "GET", "/api/bff/pos/products?q=&page_size=100")).json as unknown as { results: Product[] };
  const scannable = search.results.find((p) => p.barcode && Number(p.stock) >= 10 && !p.out_of_stock && !p.has_variants && !p.is_serialized && (p.max_quantity ?? 9) >= 2 && !p.min_quantity);
  check(Boolean(scannable), "the fixture has a product with a barcode to scan");
  if (scannable) {
    await api(cashier, "GET", `/api/bff/pos/products?barcode=${scannable.barcode}`); // warm the dev route
    await cashier.click("#pos-search");
    const t0 = Date.now();
    await cashier.fill("#pos-search", scannable.barcode);
    await cashier.press("#pos-search", "Enter");
    await cashier.waitForSelector("[data-testid=pos-cart-line]");
    const ms = Date.now() - t0;
    console.log(`  scan → line: ${ms}ms (SC-16.1 budget 300ms on a real reader; includes Playwright overhead)`);
    check(ms < 1500, "a barcode + Enter adds the line with no extra click");
    await cashier.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await cashier.keyboard.press("+");
    await cashier.waitForFunction(() => (document.querySelector("[data-testid=pos-qty]") as HTMLInputElement | null)?.value === "2");
    check(true, "`+` raises the active line's quantity (FR-16.11)");
  }
  await cashier.fill("#pos-search", "99999999999");
  await cashier.press("#pos-search", "Enter");
  await cashier.waitForSelector("[data-testid=pos-scan-miss]");
  check(((await cashier.textContent("[data-testid=pos-scan-miss]")) ?? "").includes("لا منتج بهذا الباركود"), "an unknown barcode says «لا منتج بهذا الباركود» with the name-search option");
  await cashier.fill("#pos-search", "");
  await cashier.waitForFunction(() => /\d/.test(document.querySelector("[data-testid=pos-totals]")?.textContent ?? ""));
  const items = [{ product_id: scannable?.id ?? 0, variant_id: null, quantity: 2 }];
  const quote = (await api(cashier, "POST", "/api/bff/pos/quote", { items })).json as { display_total: string };
  await cashier.waitForFunction((t) => (document.querySelector("[data-testid=pos-totals]")?.textContent ?? "").includes(t), quote.display_total);
  check(true, "the cart total is the server's quote, verbatim (FR-16.07)");

  // discount over the cashier's 10% ceiling → approval path
  await cashier.fill("[data-testid=pos-cart-discount]", "15");
  await cashier.waitForSelector("[data-testid=pos-discount-approval]");
  check(((await cashier.textContent("[data-testid=pos-discount-approval]")) ?? "").includes("يتجاوز حدّك (10.00%)"), "15% over a 10% ceiling → «يتجاوز حدّك — طلب اعتماد المدير» (SC-16.4)");
  check(await cashier.isDisabled("[data-testid=pos-complete]"), "«إتمام» waits for the approval instead of failing silently");
  await cashier.screenshot({ path: join(OUT, "sell-full-desktop-approval.png") });
  const directExceed = await api(cashier, "POST", "/api/bff/pos/orders", { register_id: 1, items, cart_discount_percent: "15", payment_method: "cash", idempotency_key: "chk-exceed" });
  check(directExceed.status === 403 && directExceed.json.code === "discount_exceeds_limit", "the server re-checks the ceiling (403 discount_exceeds_limit)");
  await cashier.fill("[data-testid=pos-manager-code]", "2468");
  await cashier.click("[data-testid=pos-manager-submit]");
  await cashier.waitForSelector("[data-testid=pos-receipt-dialog] [data-testid=pos-receipt]");
  const number = (await cashier.textContent("[data-testid=pos-receipt-number]")) ?? "";
  check(/^POS-\d{4}-001$/.test(number.trim()), "the manager code completes the sale and the receipt shows its number");
  await cashier.screenshot({ path: join(OUT, "receipt-tablet.png") });
  await cashier.click("[data-testid=pos-new-sale]");
  check((await cashier.locator("[data-testid=pos-cart-line]").count()) === 0, "«بيع جديد» starts from an empty cart (cart cleared after the order)");

  const receipts = (await api(cashier, "GET", "/api/bff/pos/orders")).json as { results: Array<{ id: number }> };
  const orderId = receipts.results[0]?.id ?? 0;
  const owners = (await api(owner, "GET", `/api/bff/orders/${orderId}`)).json as { sales_channel?: string };
  check(owners.sales_channel === "pos", "the receipt is an M06 order with sales_channel=pos");

  // idempotency (SC-16.3)
  const body = { register_id: 1, items: [{ product_id: scannable?.id ?? 0, variant_id: null, quantity: 1 }], payment_method: "cash", idempotency_key: "chk-idem-1" };
  const a = await api(cashier, "POST", "/api/bff/pos/orders", body);
  const b = await api(cashier, "POST", "/api/bff/pos/orders", body);
  check(a.status === 201 && b.status === 200 && a.json.id === b.json.id, "a replayed idempotency_key returns the first order, never a second");

  // offline → banner, unconfirmed complete, one re-send on reconnect
  if (scannable) {
    await cashier.fill("#pos-search", scannable.barcode);
    await cashier.press("#pos-search", "Enter");
    await cashier.waitForSelector("[data-testid=pos-cart-line]");
    await cashier.waitForFunction(() => !(document.querySelector("[data-testid=pos-complete]") as HTMLButtonElement | null)?.disabled);
    const before = ((await api(cashier, "GET", "/api/bff/pos/orders")).json as { results: unknown[] }).results.length;
    await cashier.context().setOffline(true);
    await cashier.waitForSelector("[data-testid=pos-offline]");
    check(true, "offline → the fixed «غير متصل» strip (US-16.5.2)");
    await cashier.screenshot({ path: join(OUT, "sell-offline-tablet.png") });
    await cashier.click("[data-testid=pos-complete]");
    await cashier.waitForFunction(() => (document.querySelector("[data-testid=pos-complete]")?.textContent ?? "").includes("إعادة الإرسال"), undefined, { timeout: 8000 });
    await cashier.context().setOffline(false);
    await cashier.waitForSelector("[data-testid=pos-receipt-dialog] [data-testid=pos-receipt]", { timeout: 10000 });
    const after = ((await api(cashier, "GET", "/api/bff/pos/orders")).json as { results: unknown[] }).results.length;
    check(after === before + 1, "back online → re-sent once with the same key: exactly one new order (US-16.5.1)");
    await cashier.click("[data-testid=pos-new-sale]");
  }

  // ── drawer (US-16.4.1) ───────────────────────────────────────────────────────────
  await cashier.goto(`${NOOR}/pos/drawer`, { waitUntil: "load" });
  await cashier.waitForSelector("[data-testid=pos-shift-summary]");
  await cashier.click("role=radio[name='سحب نقد']");
  await cashier.fill("[data-testid=mv-amount]", "20.00");
  await cashier.fill("[data-testid=mv-note]", "شراء أكياس");
  await cashier.click("[data-testid=mv-submit]");
  await cashier.waitForFunction(() => (document.querySelector("[data-testid=pos-movements]")?.textContent ?? "").includes("شراء أكياس"));
  const mvRow = (await cashier.locator("[data-testid=pos-movements] tbody tr", { hasText: "شراء أكياس" }).textContent()) ?? "";
  check(mvRow.includes("سحب نقد") && mvRow.includes("−20.00"), "a cash-out shows with its Arabic label and a signed Mono amount (FR-16.08)");
  await cashier.screenshot({ path: join(OUT, "drawer-tablet.png") });

  // ── refund hidden for the cashier; OTP for the manager's large refund ───────────
  await cashier.goto(`${NOOR}/pos/receipts/${orderId}`, { waitUntil: "load" });
  await cashier.waitForSelector("[data-testid=pos-receipt]");
  check(!(await cashier.isVisible("[data-testid=pos-refund]")), "no `orders.refund` → the refund path is hidden (FR-16.12)");

  const manager = await page(browser, { session: "manager" });
  await manager.goto(`${NOOR}/pos`, { waitUntil: "load" });
  await manager.waitForSelector("[data-testid=pos-registers]");
  const opened = await api(manager, "POST", "/api/bff/pos/shifts", { register_id: 3, opening_float: "500.00" });
  check(opened.status === 201, "the manager opens a shift on the Jeddah register");
  const big = search.results.find((p) => Number(p.stock) >= 5 && !p.out_of_stock && !p.has_variants && !p.is_serialized && !p.min_quantity && !p.max_quantity) ?? scannable;
  const mOrder = await api(manager, "POST", "/api/bff/pos/orders", { register_id: 3, items: [{ product_id: big?.id ?? 0, variant_id: null, quantity: 3 }], payment_method: "cash", idempotency_key: "chk-mgr-1" });
  const mReceipt = (mOrder.json.receipt ?? {}) as { id?: number; refundable_amount?: string };
  const refundable = Number(mReceipt.refundable_amount ?? 0);
  check(mOrder.status === 201, "the manager sells on the Jeddah register");
  if (refundable > 200) {
    await manager.goto(`${NOOR}/pos/receipts/${mReceipt.id}`, { waitUntil: "load" });
    await manager.waitForSelector("[data-testid=pos-refund]");
    await manager.fill("[data-testid=refund-amount]", mReceipt.refundable_amount!);
    await manager.click("[data-testid=refund-submit]");
    await manager.waitForSelector("[data-testid=refund-otp]");
    check(true, "a large refund answers 428 and asks for the OTP before any movement (US-16.3.2)");
    await manager.screenshot({ path: join(OUT, "refund-otp-desktop.png") });
    await manager.fill("[data-testid=refund-otp]", "123456");
    await manager.click("[data-testid=refund-submit]");
    await manager.waitForFunction(() => !document.querySelector("[data-testid=refund-otp]"));
    await manager.waitForFunction(() => (document.querySelector("[data-testid=pos-receipt]")?.textContent ?? "").includes("المُسترد"));
    check(true, "the right OTP records the refund (the receipt shows «المُسترد»)");
  } else {
    check(false, `the manager's receipt is large enough to need an OTP (got ${refundable})`);
  }

  // ── close with a shortage (US-16.4.2) + the owner resolves it ───────────────────
  await cashier.goto(`${NOOR}/pos/shift/close`, { waitUntil: "load" });
  await cashier.waitForSelector("[data-testid=pos-close] [data-testid=pos-shift-summary]");
  await cashier.fill("[data-testid=pos-actual]", "10.00");
  await cashier.click("[data-testid=pos-close-submit]");
  await cashier.waitForSelector("[data-testid=pos-close-result]");
  check(((await cashier.textContent("[data-testid=pos-close-status]")) ?? "").includes("بانتظار اعتماد المدير"), "a shortage → «بانتظار اعتماد المدير», variance in the semantic colour");
  await cashier.screenshot({ path: join(OUT, "close-shortage-tablet.png") });
  const current = (await api(cashier, "GET", "/api/bff/pos/shifts/current")).json as { shift: { id: number; version: number; approval: { id: number } | null } | null };
  const approvals = (await api(owner, "GET", "/api/bff/approvals?type=shift_shortage&status=pending")).json as { results: Array<{ id: number }> };
  check(approvals.results.some((x) => x.id === current.shift?.approval?.id), "the shortage is an M18 `shift_shortage` approval in the same queue");
  await cashier.goto(`${NOOR}/pos/sell`, { waitUntil: "load" });
  await cashier.waitForSelector("[data-testid=pos-locked]");
  check(true, "a pending shift locks selling and says why (§6)");
  const selfResolve = await api(manager, "POST", `/api/bff/pos/shifts/${current.shift?.id}/resolve-variance`, { decision: "approved", version: current.shift?.version });
  check(selfResolve.status === 403, "a manager of another location cannot resolve this shift (403)");
  await owner.goto(`${NOOR}/pos`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=pos-pending-variances]");
  await owner.screenshot({ path: join(OUT, "pending-variances-desktop.png") });
  await owner.click("[data-testid=pos-pending-variances] button:has-text('اعتماد')");
  await owner.waitForFunction(() => !document.querySelector("[data-testid=pos-pending-variances]"));
  check(true, "the owner resolves the shortage from the till");
  const after = (await api(cashier, "GET", "/api/bff/pos/shifts/current")).json as { shift: unknown };
  check(after.shift === null, "after the decision the cashier's shift is closed and a new one can open");

  // ── visual: widths + dark ───────────────────────────────────────────────────────
  for (const [width, name] of [[390, "mobile"], [768, "tablet"], [1440, "desktop"]] as const) {
    const p = await page(browser, { session: "manager", width });
    await p.goto(`${NOOR}/pos/sell`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=pos-grid]");
    check(await noHScroll(p), `${width}px: no horizontal scroll on the sale screen`);
    await p.screenshot({ path: join(OUT, `sell-${name}.png`) });
    if (width === 390) {
      await p.click("[data-testid=pos-product]:not([disabled])");
      await p.click("[data-testid=pos-cart-open]");
      await p.waitForSelector("[data-testid=pos-cart-sheet] [data-testid=pos-cart-line]");
      await p.screenshot({ path: join(OUT, "sell-mobile-cart-sheet.png") });
    }
  }
  const dark = await page(browser, { session: "manager", width: 768, dark: true });
  await dark.goto(`${NOOR}/pos/sell`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=pos-grid]");
  await dark.click("[data-testid=pos-product]:not([disabled])");
  await dark.waitForSelector("[data-testid=pos-cart-line]");
  await dark.screenshot({ path: join(OUT, "sell-tablet-dark.png") });

  // leave the fixtures as found
  await api(owner, "POST", "/api/bff/pos/__reset");

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ POS check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
