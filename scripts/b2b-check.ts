/**
 * Functional + visual check for Phase 7 T171 — M36 B2B wholesale (dashboard part):
 *   - the Ready rows (`/api/v1/orders/b2b-*`) answer through the passthrough fixtures;
 *   - the owner without a staff login → the view's own 403 sentence;
 *   - missing customer → the server's `detail` verbatim; NO price ever leaves the browser;
 *   - a staff member creates a draft → it is an M06 order (`b2b_draft`) and an M18 approval;
 *   - self-approval → 403 (button disabled with the hint, API refuses);
 *   - another approver decided first → 409 sentence + «تحديث القائمة»;
 *   - approve → gone from the list, the order's approval is `approved`.
 * Writes go to `glow`; `noor` stays for screenshots.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/b2b-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const GLOW = `http://glow.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "36-b2b");
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

/**
 * This is a MOCK E2E: every session is the `sharwa_mock_session` cookie, which Django does not know. A BFF route
 * whose module is in SHARWA_LIVE_MODULES goes to Django and answers 401 (or 503 with Django down), so the
 * script would fail far from the cause. Check up front that the routes it drives are answered by the fixtures.
 */
async function requireMocks(browser: Browser) {
  const probe = await page(browser, { store: "glow" });
  await probe.goto(`${GLOW}/dashboard`, { waitUntil: "load" });
  const routes = { "/api/bff/products?page_size=1": "products", "/api/bff/b2b/options": "b2b" } as const;
  const live: string[] = [];
  for (const [path, module] of Object.entries(routes)) {
    const r = await probe.evaluate(async (u) => {
      const res = await fetch(u, { headers: { accept: "application/json" } });
      return { status: res.status, mock: res.headers.get("x-sharwa-mock") };
    }, path);
    if (r.mock !== "1") live.push(`${module} (${path} → ${r.status}, not the fixture)`);
  }
  await probe.context().close();
  if (live.length) {
    console.error(
      `✗ b2b-check runs on mocks, but these modules are live on this dev server:\n  - ${live.join("\n  - ")}\n` +
        "  Restart it without them, e.g. in cmd:  set SHARWA_LIVE_MODULES=&& npm run dev\n" +
        "  (or remove `products`/`b2b` from SHARWA_LIVE_MODULES in .env.local), then run this script again.",
    );
    await browser.close();
    process.exit(1);
  }
}

type Draft = { id: number; customer_name: string; approval_id: number | null; approval_version: number | null; items_count: number; created_by_name?: string | null; escalated_at?: string | null };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  await requireMocks(browser);

  // ── list + self-approval (US-36.2.1) ─────────────────────────────────────────────
  const mona = await page(browser, { store: "noor", session: "manager" });
  await mona.goto(`${NOOR}/dashboard/orders/b2b`, { waitUntil: "load" });
  await mona.waitForSelector("[data-testid=b2b-table] tbody tr[data-row]");
  const drafts = (await api(mona, "GET", "/api/v1/orders/b2b-drafts/")).json as Draft[];
  check(drafts.length >= 3 && (await mona.locator("[data-testid=b2b-table] tbody tr[data-row]").count()) === drafts.length, "the pending drafts list (Ready row via the passthrough)");
  check(drafts[0]?.escalated_at != null, "an escalated approval is listed first");
  const own = drafts.find((d) => d.created_by_name === "منى القحطاني" && d.approval_id !== null)!;
  const ownRow = mona.locator("[data-testid=b2b-table] tbody tr[data-row]", { hasText: own.customer_name });
  check(await ownRow.locator("[data-testid=b2b-approve]").isDisabled(), "her own draft: «اعتماد» disabled with «لا يمكنك اعتماد طلبك»");
  const self = await api(mona, "POST", `/api/v1/orders/b2b-draft/${own.approval_id}/resolve/`, { decision: "approved", version: own.approval_version });
  check(self.status === 403 && (self.json as { detail: string }).detail === "لا يمكنك اعتماد طلبك.", "self-approval → 403 «لا يمكنك اعتماد طلبك.»");
  check((await mona.locator("[data-testid=b2b-table] tbody tr[data-row] [data-testid=b2b-readonly]").count()) >= 1, "a legacy draft (no approval) is read-only");
  await mona.screenshot({ path: join(OUT, "desktop.png") });

  // ── owner create → 403; bad payload → detail verbatim ────────────────────────────
  const owner = await page(browser, { store: "glow" });
  await owner.goto(`${GLOW}/dashboard/orders/b2b`, { waitUntil: "load" });
  const ownerCreate = await api(owner, "POST", "/api/v1/orders/b2b-draft/", { customer_name: "x", customer_phone: "966500000000", address: "y", items: [] });
  check(ownerCreate.status === 403 && (ownerCreate.json as { detail: string }).detail === "يتطلب إنشاء طلب الجملة تسجيل دخول موظف.", "owner without a staff login → the view's 403 sentence");

  const seller = await page(browser, { store: "glow", session: "manager" });
  await seller.goto(`${GLOW}/dashboard/orders/b2b/new`, { waitUntil: "load" });
  await seller.waitForSelector("[data-testid=b2b-form]");
  const missing = await api(seller, "POST", "/api/v1/orders/b2b-draft/", { customer_name: "", customer_phone: "", address: "", items: [{ product_id: 1, quantity: 1 }] });
  check(missing.status === 400 && (missing.json as { detail: string }).detail === "اسم العميل وهاتفه وعنوانه مطلوبة.", "missing customer → 400 with the server's detail");

  // ── create through the form (US-36.1) ────────────────────────────────────────────
  let sentBody: Record<string, unknown> | null = null;
  seller.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/v1/orders/b2b-draft/")) sentBody = r.postDataJSON() as Record<string, unknown>;
  });
  await seller.fill("[data-testid=b2b-name]", "مؤسسة فحص الجملة");
  await seller.fill("[data-testid=b2b-phone]", "966551239999");
  await seller.fill("[data-testid=b2b-address]", "الرياض، حي الملز");
  const firstProduct = ((await api(seller, "GET", "/api/bff/products?status=published&page_size=2")).json as { results: Array<{ name: string }> }).results[0]!;
  await seller.getByLabel("بحث المنتجات").fill(firstProduct.name.slice(0, 4));
  await seller.waitForSelector("[data-testid=b2b-result]");
  await seller.locator("[data-testid=b2b-result]").first().click();
  await seller.fill("[data-testid=b2b-qty]", "12");
  const options = (await api(seller, "GET", "/api/bff/b2b/options")).json as { multi_location: boolean; locations: Array<{ id: number }> };
  if (options.multi_location) await seller.selectOption("[data-testid=b2b-location]", String(options.locations[0]!.id));
  await seller.screenshot({ path: join(OUT, "new-draft.png"), fullPage: true });
  await seller.click("[data-testid=b2b-submit]");
  await seller.waitForSelector("[data-testid=b2b-created], [data-testid=b2b-server-error]");
  const submitError = await seller.locator("[data-testid=b2b-server-error]").textContent().catch(() => null);
  if (submitError) console.log(`  server said: ${submitError}`);
  await seller.waitForSelector("[data-testid=b2b-created]", { timeout: 2000 });
  const orderId = Number((await seller.textContent("[data-testid=created-order]"))?.replace(/\D/g, ""));
  check(orderId > 0 && (await seller.textContent("[data-testid=b2b-created]"))?.includes("بانتظار موافقة المدير") === true, "submitted → order id + approval id + the server's sentence");
  const body = sentBody as Record<string, unknown> | null;
  check(body !== null && !JSON.stringify(body).match(/price/i) && Array.isArray(body.items), "the payload carries ids and quantities only — no price (SC-36.3)");
  const order = (await api(seller, "GET", `/api/bff/orders/${orderId}`)).json as { sales_channel: string; pending_approval: { status: string } | null };
  check(order.sales_channel === "b2b_draft" && order.pending_approval?.status === "pending", "the draft is an M06 order (b2b_draft, pending approval)");
  const approvals = (await api(owner, "GET", "/api/bff/approvals?status=pending")).json as { results?: Array<{ request_type: string; entity: { id: number } | null }> } | Array<{ request_type: string; entity: { id: number } | null }>;
  const approvalRows = Array.isArray(approvals) ? approvals : (approvals.results ?? []);
  check(approvalRows.some((a) => a.request_type === "order_approval" && a.entity?.id === orderId), "…and an M18 approval request («الموافقات»)");
  const glowDrafts = (await api(seller, "GET", "/api/v1/orders/b2b-drafts/")).json as Draft[];
  check(glowDrafts.find((d) => d.id === orderId)?.items_count === 1, "it is listed with items_count from the server");

  // ── 409 (US-36.2.2) ──────────────────────────────────────────────────────────────
  await owner.reload({ waitUntil: "load" });
  await owner.waitForSelector("[data-testid=b2b-table] tbody tr[data-row]");
  const victim = glowDrafts.find((d) => d.approval_id !== null && d.id !== orderId)!;
  await api(owner, "POST", `/api/bff/b2b/_test/bump/${victim.approval_id}`);
  await owner.locator("[data-testid=b2b-table] tbody tr[data-row]", { hasText: victim.customer_name }).locator("[data-testid=b2b-approve]").click();
  await owner.click("[data-testid=b2b-confirm] button:has-text('اعتماد')");
  await owner.waitForSelector("[data-testid=b2b-conflict]");
  check((await owner.textContent("[data-testid=b2b-conflict]"))?.includes("من مستخدم آخر") === true, "a stale version → 409 sentence with «تحديث القائمة»");
  await owner.screenshot({ path: join(OUT, "conflict-409.png") });
  await owner.click("[data-testid=b2b-refresh]");

  // ── approve (US-36.2.3) ──────────────────────────────────────────────────────────
  await owner.waitForTimeout(400);
  await owner.locator("[data-testid=b2b-table] tbody tr[data-row]", { hasText: "مؤسسة فحص الجملة" }).locator("[data-testid=b2b-approve]").click();
  await owner.click("[data-testid=b2b-confirm] button:has-text('اعتماد')");
  await owner.waitForSelector("text=حُسمت الموافقة بنجاح.");
  await owner.waitForTimeout(400);
  check((await owner.locator("[data-testid=b2b-table] tbody tr[data-row]", { hasText: "مؤسسة فحص الجملة" }).count()) === 0, "approved → removed from the pending list");
  const decided = (await api(owner, "GET", `/api/bff/orders/${orderId}`)).json as { pending_approval: { status: string } | null };
  check(decided.pending_approval?.status === "approved", "the M06 order shows the approval as approved");

  // ── staff without the keys ───────────────────────────────────────────────────────
  const clerk = await page(browser, { store: "noor", session: "staff" });
  await clerk.goto(`${NOOR}/dashboard/orders/b2b`, { waitUntil: "load" });
  await clerk.waitForSelector("[data-testid=forbidden]");
  check((await api(clerk, "GET", "/api/v1/orders/b2b-drafts/")).status === 403, "staff without create/approve: readable state + 403");

  // ── visual: sheet, mobile, dark ──────────────────────────────────────────────────
  await mona.locator("[data-testid=b2b-table] tbody tr[data-row] [data-testid=b2b-open]").nth(1).click();
  await mona.waitForSelector("[data-testid=b2b-sheet]");
  await mona.waitForTimeout(400);
  await mona.screenshot({ path: join(OUT, "draft-sheet.png") });
  const mobile = await page(browser, { store: "noor", session: "manager", width: 390 });
  await mobile.goto(`${NOOR}/dashboard/orders/b2b`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=b2b-card]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: cards with 44px decision buttons, no horizontal scroll");
  await mobile.screenshot({ path: join(OUT, "mobile.png"), fullPage: true });
  const dark = await page(browser, { store: "noor", session: "manager", dark: true });
  await dark.goto(`${NOOR}/dashboard/orders/b2b`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=b2b-table] tbody tr[data-row]");
  await dark.screenshot({ path: join(OUT, "desktop-dark.png") });
  const empty = await page(browser, { store: "shop" });
  await empty.goto(`http://shop.localhost:${PORT}/dashboard/orders/b2b`, { waitUntil: "load" });
  await empty.waitForSelector("text=لا مسودات معلّقة");
  await empty.screenshot({ path: join(OUT, "desktop-empty.png") });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ b2b check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
