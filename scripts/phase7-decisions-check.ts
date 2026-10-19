/**
 * Functional check for the Phase 7 owner decisions (2026-10-19) — execution_log.md
 * «Phase 7 decisions»:
 *   1. POS is subscription-gated by the `pos` feature: off → full-screen «not in your plan» and
 *      the BFF answers 403 `feature_disabled`; on → the till as before (mock 2468 / 200.00 kept);
 *   2. nav gates accept a list (any-of): a member with ONLY `suppliers.approve` sees «أوامر الشراء»;
 *   3. courier supervision opens with Sharwa Ship OR local delivery (`shipping_providers`);
 *   4. bids carry `{bidder_name, bidder_phone, amount}` — no OTP; missing name/phone → 400;
 *   5. the 20 dropshipping feed fields (required sku/name/cost/stock) are the served contract.
 *
 * Feature flips go through the console's bulk override row and are removed before exit.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/phase7-decisions-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { flatNavItems, NAVIGATION } from "../src/features/dashboard-shell/navigation";
import { hasAnyPermission, passesFeatureGate, passesGate, type AccessSubject } from "../src/lib/access";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const CONSOLE = `http://console.localhost:${PORT}`;
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

function watch(page: Page) {
  page.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)/.test(m.text())) consoleErrors.push(`[${page.url()}] ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
}

async function storePage(browser: Browser, session: "merchant" | "staff" | "manager" | null, width = 1440): Promise<Page> {
  const ctx: BrowserContext = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  if (session) await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  watch(p);
  return p;
}

async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", "x-csrftoken": "mock-csrf-token-for-local-dev", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
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
  // ── 2: any-of permission gates (pure) ─────────────────────────────────────────────
  const approver: AccessSubject = { kind: "staff", features: [], permissions: ["suppliers.approve"] };
  const nobody: AccessSubject = { kind: "staff", features: [], permissions: ["orders.view"] };
  const po = flatNavItems().find((i) => i.key === "products.purchase_orders")!;
  check(Array.isArray(po.permission), "nav: «أوامر الشراء» is gated by a list of permissions");
  check(passesGate(approver, po.permission!), "nav: a member with ONLY suppliers.approve passes the «أوامر الشراء» gate");
  check(!passesGate(nobody, po.permission!), "nav: a member with neither key does not");
  check(hasAnyPermission({ kind: "merchant", features: [] }, []), "access: the owner passes any list");
  const group = NAVIGATION.find((g) => g.key === "products")!;
  const visible = group.items.some((i) => passesGate(approver, i.permission ?? []));
  check(visible, "sidebar: the products group is visible to the approver (it has an item they may open)");

  // ── 3: courier supervision gate (pure) ────────────────────────────────────────────
  const sup = flatNavItems().find((i) => i.key === "shipping.supervisor")!;
  check(passesFeatureGate({ features: ["shipping_providers"] }, sup.feature!), "nav: supervision shows with local delivery only");
  check(passesFeatureGate({ features: ["sharwa_ship"] }, sup.feature!), "nav: supervision shows with Sharwa Ship only");
  check(!passesFeatureGate({ features: ["inventory"] }, sup.feature!), "nav: supervision hidden with neither");

  const browser = await launch();
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar" });
  await adminCtx.addCookies([{ name: "sharwa_mock_admin", value: "superuser", domain: "console.localhost", path: "/" }]);
  const admin = await adminCtx.newPage();
  watch(admin);
  await admin.goto(`${CONSOLE}/`, { waitUntil: "domcontentloaded" });
  const override = (feature_code: string, is_enabled: boolean | null) =>
    api(admin, "POST", "/api/bff/platform/feature-overrides/bulk", { feature_code, schema_names: ["noor"], is_enabled, notes: "phase7-decisions-check" });

  try {
    // ── 1: POS plan gate ────────────────────────────────────────────────────────────
    const owner = await storePage(browser, "merchant");
    await owner.goto(`${NOOR}/pos`, { waitUntil: "networkidle" });
    check((await owner.locator("[data-testid=feature-off]").count()) === 0, "POS: the till opens while `pos` is on");
    const off = await override("pos", false);
    check(off.status < 300, `console: override pos=false on noor (${off.status})`);
    await owner.goto(`${NOOR}/pos`, { waitUntil: "networkidle" });
    check(await owner.locator("[data-testid=feature-off]").isVisible(), "POS: feature off → «نقطة البيع غير متاحة في خطتك»");
    check((await owner.textContent("body"))?.includes("رقِّ خطتك") === true, "POS: the owner is pointed at the plan");
    const denied = await api(owner, "GET", "/api/bff/pos/registers");
    check(denied.status === 403 && denied.json.code === "feature_disabled", "POS BFF: 403 feature_disabled while off");
    await override("pos", null);
    const back = await api(owner, "GET", "/api/bff/pos/registers");
    check(back.status !== 403, "POS BFF: back to normal after the override is removed");

    // ── 3: supervision on a local-delivery-only store ────────────────────────────────
    await override("sharwa_ship", false);
    await owner.goto(`${NOOR}/dashboard/shipping/supervisor`, { waitUntil: "networkidle" });
    await owner.waitForSelector("[data-testid=supervisor], [data-testid=feature-off]");
    check(await owner.locator("[data-testid=supervisor]").isVisible(), "supervisor: opens with Sharwa Ship off (local delivery on)");
    check((await owner.locator("a[href='/dashboard/shipping/sharwa-ship/queue']").count()) === 0, "supervisor: no dead Sharwa Ship sub-links without the feature");
    const supApi = await api(owner, "GET", "/api/bff/shipping/supervisor");
    check(supApi.status === 200, "supervisor BFF: 200 without Sharwa Ship");
    const awb = await api(owner, "GET", "/api/bff/shipping/awb-queue");
    check(awb.status === 403, "AWB queue BFF: still Sharwa Ship's (403)");
    await override("shipping_providers", false);
    const none = await api(owner, "GET", "/api/bff/shipping/supervisor");
    check(none.status === 403, "supervisor BFF: 403 with neither feature");
    await owner.goto(`${NOOR}/dashboard/shipping/supervisor`, { waitUntil: "networkidle" });
    check(await owner.locator("[data-testid=feature-off]").isVisible(), "supervisor: feature-off state with neither feature");
    await override("shipping_providers", null);
    await override("sharwa_ship", null);

    // ── 4: bid identity = name + phone ──────────────────────────────────────────────
    const shopper = await storePage(browser, null, 390);
    await shopper.goto(`${NOOR}/`, { waitUntil: "domcontentloaded" });
    const found = await api(owner, "GET", `/api/bff/products?q=${encodeURIComponent("مسبحة كهرمان")}`);
    const auctionItem = ((found.json.results ?? []) as Array<{ id: number; name: string }>).find((p) => p.name === "مسبحة كهرمان");
    check(Boolean(auctionItem), "storefront: an auction product exists in the fixture");
    if (auctionItem) {
      const a = await api(shopper, "GET", `/api/bff/catalog/products/${auctionItem.id}/auction?currency=SAR`);
      const amount = String(a.json.next_bid_amount);
      const missing = await api(shopper, "POST", `/api/bff/catalog/products/${auctionItem.id}/auction/bids`, { amount, currency: "SAR" });
      check(missing.status === 400 && "bidder_name" in missing.json && "bidder_phone" in missing.json, "bid BFF: missing name/phone → 400 on both fields");
      const okBid = await api(shopper, "POST", `/api/bff/catalog/products/${auctionItem.id}/auction/bids`, { bidder_name: "فحص المرحلة 7", bidder_phone: "777123456", amount, currency: "SAR" });
      check(okBid.status === 200, `bid BFF: name + phone, no OTP → 200 (${okBid.status})`);
      await shopper.goto(`${NOOR}/p/${auctionItem.id}`, { waitUntil: "networkidle" });
      await shopper.waitForSelector("[data-testid=auction-panel]");
      const bidBtn = shopper.locator("[data-testid=auction-bid]");
      if (await bidBtn.count()) {
        await bidBtn.click();
        await shopper.waitForSelector("[data-testid=bid-form]");
        check(await shopper.locator("[data-testid=bid-name]").isVisible(), "PDP: the bid form asks for the name");
        check(await shopper.locator("[data-testid=bid-phone]").isVisible(), "PDP: the bid form asks for the phone");
        check((await shopper.locator("[data-testid=bid-form]").textContent())?.includes("واتساب") === false, "PDP: no WhatsApp step in the bid form");
        const box = await shopper.locator("[data-testid=bid-submit]").boundingBox();
        check((box?.height ?? 0) >= 44, "PDP: bid submit is a ≥44px tap target on mobile");
      }
    }

    // ── 5: the 20 feed fields ───────────────────────────────────────────────────────
    const meta = await api(owner, "GET", "/api/bff/dropshipping/meta");
    const fields = (meta.json.feed_fields ?? []) as Array<{ key: string; required: boolean }>;
    check(fields.length === 20, `dropshipping: 20 feed fields served (${fields.length})`);
    check(fields.filter((f) => f.required).map((f) => f.key).join(",") === "sku,name,cost,stock", "dropshipping: required = sku,name,cost,stock");
  } finally {
    for (const f of ["pos", "sharwa_ship", "shipping_providers"]) await override(f, null).catch(() => undefined);
    await browser.close();
  }

  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  if (failures.length || consoleErrors.length) {
    console.log(`\n${failures.length} failed`);
    process.exit(1);
  }
  console.log("\nall passed");
}

void main();
