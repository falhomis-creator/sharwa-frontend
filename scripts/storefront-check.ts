/**
 * Functional check for Phase 4 (T095) — M09 · M10 · M11 · M12 · M41 · M44 on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/storefront-check.ts [port]   (default 3000)
 *
 * The buyer's journey on `noor.localhost` (luxury_boutique) with `shop.localhost`
 * (modern_trust) as the isolation control:
 *   1. home — sections sorted by `order`, the inactive one absent, `show_on_mobile=false`
 *      hidden under md; the store's tokens never leak to the other store or the dashboard;
 *      at most two store fonts are fetched (SC-09.4).
 *   2. listing — a facet writes a shareable URL that reproduces the result on reload; a page
 *      past the end redirects to the last one; an impossible search shows the empty state;
 *      header suggestions list products.
 *   3. PDP — a missing required option blocks «أضف إلى السلة» with the message; an
 *      out-of-stock option is disabled; a valid add opens the cart.
 *   4. cart — survives a reload (cookie), coupon errors are the server's text (OLD20), a
 *      valid coupon applies (WELCOME10); currency USD ↔ SAR re-prices from the server.
 *   5. checkout — COD with the OTP dialog (123456), manual transfer + receipt upload, the
 *      jeeb gateway round trip to `/checkout/result`, idempotent re-POST of a client_uuid.
 *   6. the new order is visible to the merchant (`/api/bff/orders?q=`).
 *   7. tracking — unknown uuid → 404 page; a gift order shows no amounts.
 *   8. PWA — manifest theme_color, sw.js content type, the install hint is not shown on
 *      a first visit nor on checkout, install events carry `source: nextjs_app`.
 *
 * Interaction-only states are captured on the way: docs/visual-checks/12-checkout/
 * desktop-cod-otp.png, 44-pwa/mobile-install-hint.png and mobile-ios-steps.png.
 *
 * Exit 1 on any failed assertion or console error.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const SHOP = `http://shop.localhost:${PORT}`;
const OTP = "123456";
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

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

async function context(browser: Browser, opts: { width?: number; ua?: string; session?: "merchant" } = {}): Promise<BrowserContext> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 900 },
    locale: "ar",
    isMobile: width < 768,
    hasTouch: width < 768,
    userAgent: opts.ua,
  });
  if (opts.session) await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session, domain: "noor.localhost", path: "/" }]);
  return ctx;
}

/** Statuses provoked on purpose (coupon 400s, the 404 tracking page, the idempotency replays). */
const EXPECTED = /status of (400|404|409)/;

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    if (m.type() === "error" && !EXPECTED.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

/** Browser-side fetch (Node cannot resolve `*.localhost`; Chromium can) — same cookies. */
async function api(page: Page, method: string, path: string, body?: unknown, form?: Record<string, string>) {
  return page.evaluate(
    async ({ method, path, body, form }) => {
      let init: RequestInit = { method, headers: { accept: "application/json" } };
      if (form) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(form)) fd.set(k, v);
        init = { ...init, body: fd };
      } else if (body !== undefined) {
        init = { ...init, headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) };
      }
      const r = await fetch(path, init);
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as Record<string, unknown>, type: r.headers.get("content-type") ?? "" };
    },
    { method, path, body, form },
  );
}

function shot(slug: string, name: string) {
  const dir = join(process.cwd(), "docs", "visual-checks", slug);
  mkdirSync(dir, { recursive: true });
  return join(dir, `${name}.png`);
}

const randomPhone = () => `077${String(Math.floor(1_000_000 + Math.random() * 8_999_999))}`;

async function addToCart(page: Page, productId: number, quantity = 1) {
  for (let i = 0; i < quantity; i++) {
    const r = await api(page, "POST", "/api/v1/cart/actions/", { product_id: productId, action_type: "add" });
    // A sold-out product answers 200 with `product_qty: 0` — fail loudly rather than reach an empty checkout.
    if (r.status >= 400 || !Number(r.json.product_qty)) throw new Error(`cart add ${productId} → ${r.status} ${JSON.stringify(r.json)}`);
  }
}

async function fillCheckout(page: Page, phone: string) {
  await page.fill("#field-name", "فاطمة أحمد");
  await page.fill("#field-phone", phone);
  if (await page.locator("#field-address").isVisible()) await page.fill("#field-address", "صنعاء — شارع حدة، بجوار الجامعة");
  const radio = page.locator("#field-delivery_method_id input[type=radio]").first();
  if ((await radio.count()) && !(await radio.isChecked())) await radio.check();
}

async function home(browser: Browser) {
  console.log("\n— 1. home");
  const ctx = await context(browser);
  const page = await ctx.newPage();
  watch(page, "home");
  const fontRequests: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "font") fontRequests.push(r.url());
  });
  await page.goto(`${NOOR}/`, { waitUntil: "networkidle" });
  const ids = await page.locator("[data-section-id]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-section-id"))));
  check(ids.length >= 6, `home renders the active sections (${ids.join(",")})`);
  check(
    ids.every((id, i) => i === 0 || id > ids[i - 1]!),
    "sections follow `order` even though the API lists them out of order",
  );
  check(!ids.includes(46), "the inactive section (46) is absent");
  check(await page.locator('[data-section-id="45"]').isVisible(), "show_on_mobile=false section is visible on desktop");
  // Store families only — Geist Mono (numbers, the platform's own face) is not the merchant's.
  const storeFonts = new Set(
    fontRequests
      .map((u) => u.split("/").pop()!.toLowerCase())
      .filter((f) => !f.includes("geist"))
      .map((f) => f.replace(/[_-](\d00|arabic|latin).*$/, "").replace(/\..*$/, "")),
  );
  check(storeFonts.size <= 2, `at most two store font families fetched (${[...storeFonts].join(", ") || "none"})`);
  const noorBrand = await page.locator("[data-store-theme]").evaluate((el) => getComputedStyle(el).getPropertyValue("--primary").trim());
  const preset = await page.locator("[data-store-theme]").getAttribute("data-preset");
  check(preset === "luxury_boutique", `noor carries its preset (${preset})`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  check(!(await page.locator('[data-section-id="45"]').isVisible()), "show_on_mobile=false section is hidden under md");
  check(await page.getByTestId("mobile-tab-bar").isVisible(), "mobile tab bar visible under md");

  const shop = await ctx.newPage();
  watch(shop, "shop");
  await shop.goto(`${SHOP}/`, { waitUntil: "networkidle" });
  const shopBrand = await shop.locator("[data-store-theme]").evaluate((el) => getComputedStyle(el).getPropertyValue("--primary").trim());
  const shopPreset = await shop.locator("[data-store-theme]").getAttribute("data-preset");
  check(shopPreset === "modern_trust" && shopBrand !== noorBrand, `shop keeps its own tokens (${shopPreset}: ${shopBrand} ≠ ${noorBrand})`);
  await ctx.close();

  const dash = await context(browser, { session: "merchant" });
  const d = await dash.newPage();
  watch(d, "dashboard");
  await d.goto(`${NOOR}/dashboard`, { waitUntil: "networkidle" });
  const themed = await d.locator("[data-store-theme]").count();
  const bodyPrimary = await d.evaluate(() => getComputedStyle(document.body).getPropertyValue("--primary").trim());
  check(themed === 0 && bodyPrimary !== noorBrand, `dashboard stays zinc (no store theme root, --primary ${bodyPrimary})`);
  await dash.close();
}

async function listing(browser: Browser) {
  console.log("\n— 2. listing & search");
  const ctx = await context(browser);
  const page = await ctx.newPage();
  watch(page, "listing");
  await page.goto(`${NOOR}/c/1`, { waitUntil: "networkidle" });
  const before = (await page.getByTestId("listing-count").textContent())?.trim();
  await page.getByTestId("filters-panel").getByText("نسيج", { exact: true }).click();
  await page.waitForURL(/brand=2/);
  await page.waitForFunction((b) => document.querySelector("[data-testid=listing-count]")?.textContent?.trim() !== b, before, { timeout: 8000 }).catch(() => undefined);
  const filtered = (await page.getByTestId("listing-count").textContent())?.trim();
  const url = page.url();
  check(url.includes("brand=2") && filtered !== before, `facet writes the URL (${url.split("?")[1]}) and narrows (${before} → ${filtered})`);
  const fresh = await ctx.newPage();
  watch(fresh, "listing-shared");
  await fresh.goto(url, { waitUntil: "networkidle" });
  check((await fresh.getByTestId("listing-count").textContent())?.trim() === filtered, "the shared URL reproduces the same result");
  check(await fresh.locator('input[name="brand"]:checked').count() === 1, "the facet is checked after reload");

  await fresh.goto(`${NOOR}/c/1?page=99`, { waitUntil: "networkidle" });
  const corrected = new URL(fresh.url()).searchParams.get("page");
  // A single-page category lands on its first page, whose canonical URL has no `page`.
  check(corrected !== "99" && (await fresh.getByTestId("product-card").count()) > 0, `page past the end redirects to the last page (page=${corrected ?? "1"})`);

  await fresh.goto(`${NOOR}/search?q=${encodeURIComponent("زززز لا يوجد")}`, { waitUntil: "networkidle" });
  check(await fresh.getByTestId("listing-empty").isVisible(), "an impossible search shows the empty state");

  await page.goto(`${NOOR}/`, { waitUntil: "networkidle" });
  await page.getByTestId("store-search").fill("عطر");
  const options = page.getByRole("listbox", { name: "اقتراحات البحث" }).getByRole("option");
  await options.first().waitFor({ timeout: 5000 }).catch(() => undefined);
  check((await options.count()) > 0, `header search suggests products (${await options.count()})`);
  await ctx.close();
}

async function pdpAndCart(browser: Browser) {
  console.log("\n— 3. PDP · 4. cart");
  const ctx = await context(browser);
  const page = await ctx.newPage();
  watch(page, "pdp");
  await page.goto(`${NOOR}/p/1007`, { waitUntil: "networkidle" });
  await page.getByTestId("add-to-cart").click();
  const message = page.getByText("اختر المقاس أولاً.");
  check(await message.isVisible(), "missing required option blocks the add with «اختر المقاس أولاً.»");
  check((await page.getByTestId("cart-count").count()) === 0 || (await page.getByTestId("cart-count").first().textContent()) === "0", "nothing reached the cart");
  const disabledM = await page.locator('select[aria-label="المقاس"] option[value="2"]').evaluate((o) => (o as HTMLOptionElement).disabled);
  check(disabledM, "the out-of-stock size (M) is disabled");
  await page.selectOption('select[aria-label="المقاس"]', "3");
  await page.getByTestId("add-to-cart").click();
  await page.getByTestId("cart-sheet").waitFor({ timeout: 5000 });
  check(await page.getByTestId("cart-line").first().isVisible(), "a valid add opens the cart with the line");
  await page.keyboard.press("Escape");

  await page.reload({ waitUntil: "networkidle" });
  await page.goto(`${NOOR}/cart`, { waitUntil: "networkidle" });
  check((await page.getByTestId("cart-line").count()) === 1, "the cart survives a reload (cookie)");

  await page.getByTestId("coupon-toggle").click();
  await page.getByTestId("coupon-input").fill("OLD20");
  await page.getByRole("button", { name: "تطبيق" }).click();
  await page.getByTestId("coupon-error").waitFor({ timeout: 5000 });
  check((await page.getByTestId("coupon-error").textContent())?.includes("انتهت صلاحية") ?? false, "OLD20 shows the server's expiry message");
  await page.getByTestId("coupon-input").fill("WELCOME10");
  await page.getByRole("button", { name: "تطبيق" }).click();
  await page.getByText("مُطبَّق").first().waitFor({ timeout: 5000 });
  check(await page.getByText("WELCOME10").first().isVisible(), "WELCOME10 applies");

  const sar = (await api(page, "GET", "/api/v1/cart/")).json;
  await page.getByTestId("currency-switcher").first().click();
  await page.getByTestId("currency-USD").click();
  await page.waitForFunction(() => document.querySelector("[data-testid=currency-switcher]")?.textContent?.includes("USD") || document.querySelector("[data-testid=currency-switcher]")?.textContent?.includes("$"), null, { timeout: 8000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  const usd = (await api(page, "GET", "/api/v1/cart/")).json;
  check(usd.currency === "USD" && usd.display_total !== sar.display_total, `currency → USD re-prices the cart (${sar.display_total} → ${usd.display_total})`);
  await page.getByTestId("currency-switcher").first().click();
  await page.getByTestId("currency-SAR").click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  const back = (await api(page, "GET", "/api/v1/cart/")).json;
  check(back.currency === "SAR" && back.display_total === sar.display_total, "and back to SAR restores the amount");
  await ctx.close();
}

async function checkout(browser: Browser): Promise<{ orderId: number; giftUuid: string }> {
  console.log("\n— 5. checkout");
  // COD with OTP.
  const ctx = await context(browser);
  const page = await ctx.newPage();
  watch(page, "checkout-cod");
  await page.goto(`${NOOR}/`, { waitUntil: "networkidle" });
  await addToCart(page, 1056);
  await page.goto(`${NOOR}/checkout`, { waitUntil: "networkidle" });
  await fillCheckout(page, randomPhone());
  await page.getByTestId("pay-cod").click();
  await page.locator("[data-testid=checkout-submit]:visible").click();
  await page.getByTestId("otp-dialog-cod").waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot("12-checkout", "desktop-cod-otp") });
  await page.locator("[data-testid=otp-dialog-cod] input").first().fill(OTP);
  await page.waitForURL(/\/checkout\/success\//, { timeout: 15000 });
  await page.getByTestId("order-number").waitFor();
  const orderNumber = Number((await page.getByTestId("order-number").textContent())?.replace(/\D/g, ""));
  check(orderNumber > 0, `COD + OTP places order #${orderNumber}`);
  const cart = (await api(page, "GET", "/api/v1/cart/")).json;
  check(cart.count === 0, "the cart is empty after the order");
  await ctx.close();

  // Manual transfer + receipt.
  const m = await context(browser);
  const mp = await m.newPage();
  watch(mp, "checkout-manual");
  await mp.goto(`${NOOR}/`, { waitUntil: "networkidle" });
  await addToCart(mp, 1043);
  await mp.goto(`${NOOR}/checkout`, { waitUntil: "networkidle" });
  await fillCheckout(mp, randomPhone());
  await mp.getByTestId("pay-manual").click();
  await mp.getByTestId("manual-transfer").waitFor();
  await mp.locator("[data-testid=checkout-submit]:visible").click();
  await mp.waitForURL(/\/checkout\/success\//, { timeout: 15000 });
  await mp.getByTestId("receipt-upload").waitFor();
  const receipt = join(tmpdir(), "sharwa-receipt.png");
  writeFileSync(receipt, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
  await mp.locator("[data-testid=receipt-upload] input[type=file]").setInputFiles(receipt);
  await mp.locator("[data-testid=receipt-upload]").getByRole("button").last().click();
  await mp.getByTestId("receipt-attached").waitFor({ timeout: 8000 }).catch(() => undefined);
  check(await mp.getByTestId("receipt-attached").isVisible(), "manual transfer → receipt uploaded on the success page");
  await m.close();

  // Jeeb gateway.
  const j = await context(browser);
  const jp = await j.newPage();
  watch(jp, "checkout-jeeb");
  await jp.goto(`${NOOR}/`, { waitUntil: "networkidle" });
  await addToCart(jp, 1040);
  await jp.goto(`${NOOR}/checkout`, { waitUntil: "networkidle" });
  await fillCheckout(jp, randomPhone());
  await jp.getByTestId("pay-jeeb").click();
  await jp.locator("[data-testid=checkout-submit]:visible").click();
  await jp.waitForURL(/\/checkout\/result\?order=/, { timeout: 15000 });
  check(true, "jeeb redirects to the gateway return URL");
  // The mock gateway confirms ~4 s after the order; the page polls until it leaves «قيد تنفيذ الدفع».
  const status = jp.getByTestId("order-status");
  await status.waitFor();
  await jp.waitForFunction(() => !/قيد تنفيذ الدفع/.test(document.querySelector("[data-testid=order-status]")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => undefined);
  const settled = (await status.textContent())?.trim() ?? "";
  check(!/قيد تنفيذ الدفع/.test(settled), `the result page reads the settled status from the server («${settled}»)`);

  // Idempotency + a gift order, through the API.
  await addToCart(jp, 1053);
  const uuid = crypto.randomUUID();
  const form = {
    client_uuid: uuid,
    checkout_mode: "cart",
    name: "سارة علي",
    phone: `967${randomPhone().slice(1)}`,
    address: "عدن — كريتر",
    delivery_method_id: "2",
    payment_method: "manual",
    is_gift: "true",
    recipient_name: "مريم",
    recipient_phone: "967771234567",
    gift_message: "كل عام وأنتِ بخير",
  };
  const a = await api(jp, "POST", "/api/bff/checkout", undefined, form);
  const b = await api(jp, "POST", "/api/bff/checkout", undefined, form);
  check(a.status < 300 && a.json.order_id === b.json.order_id, `re-POSTing client_uuid returns the same order (#${a.json.order_id} / #${b.json.order_id})`);
  await j.close();
  return { orderId: orderNumber, giftUuid: String(a.json.public_uuid) };
}

async function merchantAndTracking(browser: Browser, orderId: number, giftUuid: string) {
  console.log("\n— 6. dashboard · 7. tracking");
  const ctx = await context(browser, { session: "merchant" });
  const page = await ctx.newPage();
  watch(page, "dashboard-orders");
  await page.goto(`${NOOR}/dashboard`, { waitUntil: "domcontentloaded" });
  const list = await api(page, "GET", `/api/bff/orders?q=${orderId}`);
  const rows = (list.json.results as Array<{ id: number }> | undefined) ?? [];
  check(rows.some((r) => r.id === orderId), `order #${orderId} is visible in the merchant's orders`);
  await ctx.close();

  const t = await context(browser, { width: 390 });
  const tp = await t.newPage();
  watch(tp, "tracking");
  const res = await tp.goto(`${NOOR}/track/00000000-nope`, { waitUntil: "networkidle" });
  check(res?.status() === 404 && (await tp.getByTestId("tracking-not-found").isVisible()), "unknown tracking uuid → 404 page");
  await tp.goto(`${NOOR}/track/${giftUuid}`, { waitUntil: "networkidle" });
  const text = (await tp.getByTestId("tracking").textContent()) ?? "";
  check(await tp.getByTestId("tracking-rollup").isVisible(), "gift order tracking renders");
  check(!/ر\.س|ريال/.test(text), "the gift order shows no amounts");
  await t.close();
}

async function pwa(browser: Browser) {
  console.log("\n— 8. PWA");
  const ctx = await context(browser, { width: 390, ua: IPHONE_UA });
  const page = await ctx.newPage();
  watch(page, "pwa");
  const events: Array<Record<string, unknown>> = [];
  page.on("request", (r) => {
    if (r.url().includes("/pwa/install-event/") && r.method() === "POST") events.push(JSON.parse(r.postData() ?? "{}") as Record<string, unknown>);
  });
  await page.goto(`${NOOR}/`, { waitUntil: "networkidle" });
  const manifest = await api(page, "GET", "/manifest.webmanifest");
  check(String(manifest.json.theme_color).toUpperCase() === "#D4AF37", `manifest theme_color = ${manifest.json.theme_color}`);
  const sw = await api(page, "GET", "/sw.js");
  check(sw.status === 200 && sw.type.includes("javascript"), `sw.js served as ${sw.type}`);
  await page.waitForTimeout(600);
  check((await page.getByTestId("install-prompt").count()) === 0, "no install hint on the first visit");

  // A second visit (new tab = new session) qualifies.
  const second = await ctx.newPage();
  watch(second, "pwa-2");
  second.on("request", (r) => {
    if (r.url().includes("/pwa/install-event/") && r.method() === "POST") events.push(JSON.parse(r.postData() ?? "{}") as Record<string, unknown>);
  });
  // `load`, not `networkidle`: the service worker registered on the first tab is now in control.
  await second.goto(`${NOOR}/`, { waitUntil: "load" });
  await second.getByTestId("install-prompt").waitFor({ timeout: 5000 }).catch(() => undefined);
  check(await second.getByTestId("install-prompt").isVisible(), "the iOS hint appears on the second visit");
  await second.screenshot({ path: shot("44-pwa", "mobile-install-hint") });
  await second.getByTestId("install-prompt").getByRole("button", { name: "كيف؟" }).click();
  await second.getByTestId("ios-hint").waitFor({ timeout: 5000 }).catch(() => undefined);
  await second.waitForTimeout(400);
  await second.screenshot({ path: shot("44-pwa", "mobile-ios-steps") });
  await second.keyboard.press("Escape");
  await second.waitForTimeout(500);
  check(events.length > 0 && events.every((e) => e.source === "nextjs_app"), `install events sent with source nextjs_app (${events.map((e) => e.event_type).join(", ")})`);

  await addToCart(second, 1056);
  await second.goto(`${NOOR}/checkout`, { waitUntil: "load" });
  await second.waitForTimeout(500);
  check((await second.getByTestId("install-prompt").count()) === 0, "never on checkout");
  await ctx.close();
}

async function main() {
  const browser = await launch();
  try {
    // A cold `next dev` compiles each route on first hit, which can outlast a 30 s goto.
    const warm = await browser.newPage();
    for (const url of [`${NOOR}/`, `${SHOP}/`, `${NOOR}/c/1`, `${NOOR}/p/1001`, `${NOOR}/cart`, `${NOOR}/checkout`, `${NOOR}/track/warm-up`]) {
      await warm.goto(url, { waitUntil: "load", timeout: 180_000 }).catch(() => undefined);
    }
    await warm.close();
    await home(browser);
    await listing(browser);
    await pdpAndCart(browser);
    const { orderId, giftUuid } = await checkout(browser);
    await merchantAndTracking(browser, orderId, giftUuid);
    await pwa(browser);
  } catch (err) {
    failures.push(`crashed: ${String(err).slice(0, 400)}`);
    console.error(err);
  } finally {
    await browser.close();
  }
  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    for (const e of consoleErrors) console.log(`  ${e}`);
  }
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\nstorefront-check: all passed" : `\nstorefront-check: ${failures.length} failed, ${consoleErrors.length} console errors`);
  process.exit(ok ? 0 : 1);
}

void main();
