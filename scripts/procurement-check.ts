/**
 * Functional + visual check for Phase 7 T150 — M23 suppliers & purchase orders:
 *   - suppliers: list, create through the sheet, search by name, a supplier with orders
 *     cannot be deleted (409 with the count), the detail page offers a prefilled new order;
 *   - board: six columns whose Mono counts add up to the list, view toggle lives in the URL;
 *   - draft → «إرسال للموافقة» refuses an empty draft; a draft with a line is submitted,
 *     shows the approval id and becomes `pending_approval` (and an M18 `po_approval` exists);
 *   - decision sends `version` (stale → 409 «حُدِّث الأمر من مستخدم آخر»), approve shows
 *     the approver in the timeline;
 *   - partial receive 4 of 10 → `partially_received`, «استُلم 4 من 10», and an M21
 *     `po_received` movement referencing the order; receiving the rest → `received`;
 *   - the manager (no `suppliers.approve`) sees no approve button and gets 403 from the BFF.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/procurement-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "23-procurement");
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

async function page(browser: Browser, opts: { session?: "merchant" | "staff" | "manager"; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session ?? "merchant", domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)/.test(m.text())) consoleErrors.push(`${p.url()} :: ${m.text().slice(0, 1500)}`);
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
  const p = await page(browser);

  // ── suppliers (US-23.1) ──────────────────────────────────────────────────────────
  await p.goto(`${NOOR}/dashboard/suppliers`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=suppliers-table] [data-testid=supplier-link]");
  check((await p.locator("[data-testid=suppliers-table] tbody tr").count()) >= 5, "suppliers list renders the seeded suppliers");
  await p.click("[data-testid=new-supplier]");
  await p.waitForSelector("[data-testid=supplier-form]");
  const name = `مورد الفحص ${Date.now() % 10000}`;
  await p.fill("[data-testid=supplier-form] input >> nth=0", name);
  await p.click("[data-testid=supplier-save]");
  await p.waitForSelector(`text=${name}`);
  check(true, "a supplier created in the sheet appears in the list");
  const list = (await api(p, "GET", `/api/bff/suppliers?q=${encodeURIComponent(name)}`)).json as { count: number; results: Array<{ id: number; orders_count: number }> };
  check(list.count === 1, "searching by name finds it");
  const newId = list.results[0]!.id;
  await p.goto(`${NOOR}/dashboard/suppliers/${newId}`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=supplier-new-po]");
  const zero = await p.waitForSelector("text=لا أوامر شراء لهذا المورد", { timeout: 10_000 }).then(() => true).catch(() => false);
  check(zero, "a new supplier shows 0 orders");
  check((await p.getAttribute("[data-testid=supplier-new-po]", "href")) === `/dashboard/purchase-orders/new?supplier=${newId}`, "«أمر شراء جديد» is prefilled with the supplier");
  const del = await api(p, "DELETE", "/api/bff/suppliers/1");
  check(del.status === 409 && /مرتبط بـ \d+/.test(String(del.json.detail)), "a supplier with live orders cannot be deleted (409 with the count)");

  // ── board (US-23.5) ──────────────────────────────────────────────────────────────
  await p.goto(`${NOOR}/dashboard/purchase-orders`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=po-board] [data-testid=po-card]");
  check((await p.locator("[data-testid=po-column]").count()) === 6, "six status columns");
  const counts = await p.locator("[data-testid=po-column-count]").allTextContents();
  const sum = counts.reduce((s, c) => s + Number(c.replace(/\D/g, "") || 0), 0);
  const all = (await api(p, "GET", "/api/bff/purchase-orders?page_size=200")).json as { count: number };
  check(sum === all.count, "column counts add up to the server's total");
  await p.screenshot({ path: join(OUT, "board-desktop.png") });
  await p.click("[data-testid=view-table]");
  await p.waitForSelector("[data-testid=po-table] [data-testid=po-status]");
  check(new URL(p.url()).searchParams.get("view") === "table", "the table view is kept in the URL");

  // ── draft → submit (US-23.2) ─────────────────────────────────────────────────────
  const empty = (await api(p, "POST", "/api/bff/purchase-orders", { supplier_id: 2, location_id: 1, lines: [] })).json as { id: number; version: number };
  const emptySubmit = await api(p, "POST", `/api/bff/purchase-orders/${empty.id}/submit`, { version: empty.version });
  check(emptySubmit.status === 400 && JSON.stringify(emptySubmit.json).includes("أضف سطراً واحداً على الأقل"), "an empty draft cannot be submitted");
  await api(p, "POST", `/api/bff/purchase-orders/${empty.id}/cancel`, { version: empty.version });

  await p.goto(`${NOOR}/dashboard/purchase-orders/new?supplier=2`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=po-form]");
  // Form options (suppliers + whether the store is multi-location) load after the form mounts.
  await p.waitForSelector("[data-testid=po-supplier] option:nth-child(2)", { state: "attached" });
  const loc = p.locator("[data-testid=po-location]");
  if (await loc.count()) await loc.selectOption({ index: 1 });
  await p.click("[data-testid=po-product-search]");
  await p.waitForSelector("[data-testid=po-product-option]");
  await p.locator("[data-testid=po-product-option]").first().click();
  await p.fill("[data-testid=po-line-qty]", "10");
  await p.screenshot({ path: join(OUT, "new-po-desktop.png") });
  await p.click("[data-testid=po-save-submit]");
  await p.waitForURL(/\/dashboard\/purchase-orders\/\d+$/);
  await p.waitForSelector("[data-testid=po-status][data-status=pending_approval]", { timeout: 10_000 }).catch(() => undefined);
  const poId = Number(new URL(p.url()).pathname.split("/").at(-1));
  check((await p.getAttribute("[data-testid=po-status]", "data-status")) === "pending_approval", "submitted draft is `pending_approval`");
  check((await p.locator("[data-testid=po-approval-link]").count()) === 1, "the approval id is shown");
  const approvals = (await api(p, "GET", "/api/bff/approvals?status=pending&type=po_approval")).json as { results?: Array<{ request_type: string; entity?: { id: number } | null }> };
  check(approvals.results?.some((a) => a.request_type === "po_approval" && a.entity?.id === poId) === true, "an M18 `po_approval` request exists for it");

  // ── decision with version (US-23.3) ─────────────────────────────────────────────
  const stale = await api(p, "POST", `/api/bff/purchase-orders/${poId}/resolve`, { decision: "approve", version: 1 });
  check(stale.status === 409 && String(stale.json.detail).includes("حُدِّث الأمر من مستخدم آخر"), "a stale `version` answers 409");
  await p.click("[data-testid=po-approve]");
  await p.waitForSelector("[data-testid=po-status][data-status=approved]");
  check((await p.locator("[data-testid=po-timeline] [data-kind=approved]").count()) === 1, "approval lands in the timeline with the approver");

  // ── partial receive (US-23.4) ───────────────────────────────────────────────────
  await p.click("[data-testid=po-receive]");
  await p.waitForSelector("[data-testid=receive-line]");
  await p.fill("[data-testid=receive-qty] >> nth=0", "4");
  await p.screenshot({ path: join(OUT, "receive-desktop.png") });
  await p.click("[data-testid=receive-submit]");
  await p.waitForURL(new RegExp(`/purchase-orders/${poId}$`));
  await p.waitForSelector("[data-testid=po-status][data-status=partially_received]");
  check(true, "4 of 10 → `partially_received`");
  check((await p.textContent("[data-testid=po-line-progress]"))?.replace(/\s+/g, " ").includes("استُلم 4 من 10") === true, "«استُلم 4 من 10» per line");
  const moves = (await api(p, "GET", "/api/bff/inventory/movements?reason=po_received&page_size=50")).json as { results?: Array<{ reference?: { type: string; id: number } | null; delta: string }> };
  check(moves.results?.some((m) => m.reference?.type === "purchase_order" && m.reference.id === poId && Number(m.delta) === 4) === true, "an M21 `po_received` movement of 4 references the order");
  await p.screenshot({ path: join(OUT, "detail-desktop.png"), fullPage: true });
  const fresh = (await api(p, "GET", `/api/bff/purchase-orders/${poId}`)).json as { version: number; lines: Array<{ id: number; quantity_ordered: number; quantity_received: number }> };
  const rest = await api(p, "POST", `/api/bff/purchase-orders/${poId}/receive`, { version: fresh.version, lines: fresh.lines.map((l) => ({ line_id: l.id, quantity_received_now: l.quantity_ordered - l.quantity_received })) });
  check(rest.status === 200 && rest.json.status === "received", "receiving the remainder → `received`");
  const over = await api(p, "POST", `/api/bff/purchase-orders/${poId}/receive`, { version: (rest.json as { version: number }).version, lines: [{ line_id: fresh.lines[0]!.id, quantity_received_now: 1 }] });
  check(over.status === 409, "a received order is closed to further receipts");

  // ── manager: manage without approve ─────────────────────────────────────────────
  const mgr = await page(browser, { session: "manager" });
  await mgr.goto(`${NOOR}/dashboard/purchase-orders/31`, { waitUntil: "load" });
  await mgr.waitForSelector("[data-testid=po-status]");
  check((await mgr.locator("[data-testid=po-approve]").count()) === 0, "manager (no `suppliers.approve`) sees no approve button");
  const v = ((await api(mgr, "GET", "/api/bff/purchase-orders/31")).json as { version: number }).version;
  check((await api(mgr, "POST", "/api/bff/purchase-orders/31/resolve", { decision: "approve", version: v })).status === 403, "…and the BFF answers 403");
  const staff = await page(browser, { session: "staff" });
  await staff.goto(`${NOOR}/dashboard/suppliers`, { waitUntil: "load" });
  await staff.waitForSelector("[data-testid=forbidden]");
  check(true, "a cashier without supplier keys gets the forbidden state");

  // ── visual: mobile + dark ───────────────────────────────────────────────────────
  const mobile = await page(browser, { width: 390 });
  await mobile.goto(`${NOOR}/dashboard/purchase-orders`, { waitUntil: "load" });
  await mobile.waitForSelector("[role=tablist] [role=tab]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: no horizontal scroll on the board");
  await mobile.screenshot({ path: join(OUT, "board-mobile.png"), fullPage: true });
  await mobile.goto(`${NOOR}/dashboard/purchase-orders/${poId}`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=po-status]");
  await mobile.screenshot({ path: join(OUT, "detail-mobile.png"), fullPage: true });
  const tablet = await page(browser, { width: 820 });
  await tablet.goto(`${NOOR}/dashboard/purchase-orders`, { waitUntil: "load" });
  await tablet.waitForSelector("[data-testid=po-board]");
  await tablet.screenshot({ path: join(OUT, "board-tablet.png") });
  const dark = await page(browser, { dark: true });
  await dark.goto(`${NOOR}/dashboard/purchase-orders`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=po-board] [data-testid=po-card]");
  await dark.screenshot({ path: join(OUT, "board-desktop-dark.png") });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ procurement check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
